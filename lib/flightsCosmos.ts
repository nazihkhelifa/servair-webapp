// Cosmos DB service for flights
import { getFlightsContainer } from './cosmosDb'

export interface FlightRecord {
  id: string
  flightId: string
  flightCode: string
  flightOrigin: string | null
  flightDestination: string | null
  theoreticalHour: string
  theoreticalDateTime: string | null
  planeType: string | null
  gate: string | null
  status: string
  terminal: string | null
  airline: string | null
  flightType: string
  passengerCount: number | null
  cargoWeight: number | null
  notes: string
  createdAt: string | null
  updatedAt: string | null
}

export interface FlightPayload {
  flightCode: string
  flightOrigin?: string
  flightDestination?: string
  theoreticalHour: string
  theoreticalDate?: string
  theoreticalDateTime?: string
  planeType?: string
  gate?: string
  status?: string
  terminal?: string
  airline?: string
  flightType?: string
  passengerCount?: number
  cargoWeight?: number
  notes?: string
}

const parseDate = (value: unknown): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return null
}

const toFlightRecord = (item: any): FlightRecord => {
  return {
    id: item.id || item.flightId,
    flightId: item.flightId || item.id,
    flightCode: item.flightCode || '',
    flightOrigin: item.flightOrigin || null,
    flightDestination: item.flightDestination || null,
    theoreticalHour: item.theoreticalHour || '',
    theoreticalDateTime: parseDate(item.theoreticalDateTime),
    planeType: item.planeType || null,
    gate: item.gate || null,
    status: item.status || 'scheduled',
    terminal: item.terminal || null,
    airline: item.airline || null,
    flightType: item.flightType || 'departure',
    passengerCount: typeof item.passengerCount === 'number' ? item.passengerCount : null,
    cargoWeight: typeof item.cargoWeight === 'number' ? item.cargoWeight : null,
    notes: item.notes || '',
    createdAt: parseDate(item.createdAt),
    updatedAt: parseDate(item.updatedAt),
  }
}

export const listFlights = async (date?: string, status?: string): Promise<FlightRecord[]> => {
  try {
    const container = await getFlightsContainer()
    
    let querySpec: any
    if (status) {
      querySpec = {
        query: 'SELECT * FROM c WHERE c.status = @status ORDER BY c.theoreticalDateTime ASC',
        parameters: [{ name: '@status', value: status }],
      }
    } else {
      querySpec = {
        query: 'SELECT * FROM c ORDER BY c.theoreticalDateTime ASC',
      }
    }

    const { resources } = await container.items.query(querySpec).fetchAll()
    console.log(`[Flights] Retrieved ${resources.length} flights from Cosmos DB`)
    let flights = resources.map(toFlightRecord)

    // Filter by date on client side (since Cosmos DB doesn't support date-only queries)
    if (date) {
      flights = flights.filter(flight => {
        if (!flight.theoreticalDateTime) return false
        const flightDate = new Date(flight.theoreticalDateTime).toISOString().split('T')[0]
        return flightDate === date
      })
    }

    return flights
  } catch (error) {
    console.error('Error listing flights:', error)
    throw error
  }
}

export const getFlightById = async (flightId: string): Promise<FlightRecord | null> => {
  try {
    const container = await getFlightsContainer()
    const { resource } = await container.item(flightId, flightId).read()
    if (!resource) return null
    return toFlightRecord(resource)
  } catch (error: any) {
    if (error.code === 404) return null
    console.error('Error getting flight:', error)
    throw error
  }
}

export const createFlight = async (payload: FlightPayload): Promise<FlightRecord> => {
  const container = await getFlightsContainer()
  
  let theoreticalDateTime: Date
  if (payload.theoreticalDateTime) {
    theoreticalDateTime = new Date(payload.theoreticalDateTime)
  } else if (payload.theoreticalDate && payload.theoreticalHour) {
    theoreticalDateTime = new Date(`${payload.theoreticalDate}T${payload.theoreticalHour}`)
  } else {
    const today = new Date().toISOString().split('T')[0]
    theoreticalDateTime = new Date(`${today}T${payload.theoreticalHour}`)
  }

  // Generate unique flight ID: flightCode + date + timestamp to ensure uniqueness
  // This allows same flight code on different dates/times to be separate entries
  const flightCodeUpper = payload.flightCode.toUpperCase()
  const dateStr = payload.theoreticalDate || theoreticalDateTime.toISOString().split('T')[0]
  const timestamp = Date.now()
  const uniqueSuffix = Math.random().toString(36).substr(2, 9)
  const flightId = `${flightCodeUpper}-${dateStr}-${timestamp}-${uniqueSuffix}`
  
  const now = new Date().toISOString()
  
  const data: any = {
    id: flightId,
    flightId,
    flightCode: payload.flightCode.toUpperCase(),
    flightOrigin: payload.flightOrigin?.toUpperCase() || null,
    flightDestination: payload.flightDestination?.toUpperCase() || null,
    theoreticalHour: payload.theoreticalHour,
    theoreticalDateTime: theoreticalDateTime.toISOString(),
    planeType: payload.planeType?.toUpperCase() || null,
    gate: payload.gate?.toUpperCase() || null,
    status: payload.status || 'scheduled',
    terminal: payload.terminal || null,
    airline: payload.airline || null,
    flightType: payload.flightType || 'departure',
    passengerCount: payload.passengerCount || null,
    cargoWeight: payload.cargoWeight || null,
    notes: payload.notes || '',
    createdAt: now,
    updatedAt: now,
  }

  // Use create instead of upsert to ensure we create a new flight
  // (upsert would update if ID exists)
  await container.items.create(data)
  
  const { resource } = await container.item(flightId, flightId).read()
  if (!resource) {
    throw new Error('Failed to create flight')
  }

  return toFlightRecord(resource)
}

export const updateFlight = async (flightId: string, payload: Partial<FlightPayload>): Promise<FlightRecord> => {
  const container = await getFlightsContainer()
  
  const { resource: existing } = await container.item(flightId, flightId).read()
  if (!existing) {
    throw new Error('Flight not found')
  }

  const updates: any = {
    ...existing,
    updatedAt: new Date().toISOString(),
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      if (key === 'flightCode' || key === 'flightOrigin' || key === 'flightDestination' || 
          key === 'planeType' || key === 'gate') {
        updates[key] = typeof value === 'string' ? value.toUpperCase() : value
      } else {
        updates[key] = value ?? null
      }
    }
  })

  // Update theoreticalDateTime if date or hour changed
  if (payload.theoreticalDate || payload.theoreticalHour || payload.theoreticalDateTime) {
    if (payload.theoreticalDateTime) {
      updates.theoreticalDateTime = new Date(payload.theoreticalDateTime).toISOString()
    } else {
      const date = payload.theoreticalDate || new Date().toISOString().split('T')[0]
      const hour = payload.theoreticalHour || updates.theoreticalHour || '12:00'
      updates.theoreticalDateTime = new Date(`${date}T${hour}`).toISOString()
      updates.theoreticalHour = hour
    }
  }

  await container.items.upsert(updates)
  
  const { resource } = await container.item(flightId, flightId).read()
  if (!resource) {
    throw new Error('Flight not found after update')
  }

  return toFlightRecord(resource)
}

export const deleteFlight = async (flightId: string): Promise<void> => {
  const container = await getFlightsContainer()
  await container.item(flightId, flightId).delete()
}

