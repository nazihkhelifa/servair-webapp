// Cosmos DB service for locations
import { getLocationsContainer } from './cosmosDb'

export interface LocationRecord {
  id: string
  locationId: string
  name: string
  airport: string
  type: string
  description: string | null
  latitude: number | null
  longitude: number | null
  geofence: any | null
  isActive: boolean
  createdAt: string | null
}

export interface LocationPayload {
  name: string
  airport: string
  type: string
  description?: string
  latitude?: number
  longitude?: number
  geofence?: any
  isActive?: boolean
}

const parseDate = (value: unknown): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return null
}

const toLocationRecord = (item: any): LocationRecord => {
  return {
    id: item.id || item.locationId,
    locationId: item.locationId || item.id,
    name: item.name || '',
    airport: item.airport || '',
    type: item.type || '',
    description: item.description || null,
    latitude: typeof item.latitude === 'number' ? item.latitude : null,
    longitude: typeof item.longitude === 'number' ? item.longitude : null,
    geofence: item.geofence || null,
    isActive: item.isActive !== false,
    createdAt: parseDate(item.createdAt),
  }
}

export const listLocations = async (airport?: string, type?: string): Promise<LocationRecord[]> => {
  try {
    const container = await getLocationsContainer()
    
    let querySpec: any
    if (airport && type) {
      querySpec = {
        query: 'SELECT * FROM c WHERE c.airport = @airport AND c.type = @type ORDER BY c.name ASC',
        parameters: [
          { name: '@airport', value: airport },
          { name: '@type', value: type }
        ],
      }
    } else if (airport) {
      querySpec = {
        query: 'SELECT * FROM c WHERE c.airport = @airport ORDER BY c.name ASC',
        parameters: [{ name: '@airport', value: airport }],
      }
    } else if (type) {
      querySpec = {
        query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.name ASC',
        parameters: [{ name: '@type', value: type }],
      }
    } else {
      querySpec = {
        query: 'SELECT * FROM c ORDER BY c.name ASC',
      }
    }

    const { resources } = await container.items.query(querySpec).fetchAll()
    console.log(`[Locations] Retrieved ${resources.length} locations from Cosmos DB`)
    return resources.map(toLocationRecord)
  } catch (error) {
    console.error('Error listing locations:', error)
    throw error
  }
}

export const getLocationById = async (locationId: string): Promise<LocationRecord | null> => {
  try {
    const container = await getLocationsContainer()
    const { resource } = await container.item(locationId, locationId).read()
    if (!resource) return null
    return toLocationRecord(resource)
  } catch (error: any) {
    if (error.code === 404) return null
    console.error('Error getting location:', error)
    throw error
  }
}

export const createLocation = async (payload: LocationPayload): Promise<LocationRecord> => {
  const container = await getLocationsContainer()
  
  if (!['CDG', 'ORY'].includes(payload.airport)) {
    throw new Error('Invalid airport. Must be CDG or ORY')
  }
  
  if (!['start', 'destination'].includes(payload.type)) {
    throw new Error('Invalid type. Must be "start" or "destination"')
  }

  const locationId = `location-${payload.airport}-${payload.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`
  const now = new Date().toISOString()
  
  const data: any = {
    id: locationId,
    locationId,
    name: payload.name.trim(),
    airport: payload.airport,
    type: payload.type,
    description: payload.description?.trim() || null,
    latitude: typeof payload.latitude === 'number' ? payload.latitude : null,
    longitude: typeof payload.longitude === 'number' ? payload.longitude : null,
    geofence: payload.geofence || null,
    isActive: payload.isActive !== false,
    createdAt: now,
  }

  await container.items.create(data)
  
  const { resource } = await container.item(locationId, locationId).read()
  if (!resource) {
    throw new Error('Failed to create location')
  }

  return toLocationRecord(resource)
}

export const updateLocation = async (locationId: string, payload: Partial<LocationPayload>): Promise<LocationRecord> => {
  const container = await getLocationsContainer()
  
  const { resource: existing } = await container.item(locationId, locationId).read()
  if (!existing) {
    throw new Error('Location not found')
  }

  const updates: any = {
    ...existing,
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      if (key === 'name' || key === 'description') {
        updates[key] = typeof value === 'string' ? value.trim() : value
      } else if (key === 'latitude' || key === 'longitude') {
        updates[key] = typeof value === 'number' ? value : null
      } else {
        updates[key] = value ?? null
      }
    }
  })

  updates.updatedAt = new Date().toISOString()

  await container.items.upsert(updates)
  
  const { resource } = await container.item(locationId, locationId).read()
  if (!resource) {
    throw new Error('Location not found after update')
  }

  return toLocationRecord(resource)
}

export const deleteLocation = async (locationId: string): Promise<void> => {
  const container = await getLocationsContainer()
  await container.item(locationId, locationId).delete()
}

