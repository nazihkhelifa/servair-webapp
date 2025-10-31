// Cosmos DB service for real-time tracking
import { getTrackingLatestContainer, getTrackingHistoryContainer } from './cosmosDb'
import { getDriversContainer } from './cosmosDb'

export interface TrackingData {
  trackingId: string
  driverId?: string | null
  truckId?: string | null
  latitude: number
  longitude: number
  speedKmh?: number | null
  heading?: number | null
  status?: string | null
  batteryLevel?: number | null
  timestamp: number
}

const parseTimestamp = (value: unknown): number => {
  if (!value) return Date.now()
  
  if (typeof value === 'number') return value
  
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? Date.now() : value.getTime()
  }
  
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? Date.now() : date.getTime()
  }
  
  return Date.now()
}

// Save tracking data from mobile app
export const saveTrackingData = async (payload: {
  driverId: string
  truckId?: string | null
  latitude: number
  longitude: number
  speedKmh?: number | null
  heading?: number | null
  status?: string | null
  batteryLevel?: number | null
  timestamp?: number
}): Promise<void> => {
  try {
    const latestContainer = await getTrackingLatestContainer()
    const historyContainer = await getTrackingHistoryContainer()
    
    const timestamp = payload.timestamp || Date.now()
    
    // Prepare tracking data
    const trackingDoc = {
      id: `tracking-${payload.driverId}-${timestamp}`,
      driverId: payload.driverId,
      truckId: payload.truckId ?? null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speedKmh: payload.speedKmh ?? null,
      heading: payload.heading ?? null,
      status: payload.status || 'Active',
      batteryLevel: payload.batteryLevel ?? null,
      timestamp: timestamp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Upsert latest location (one doc per driver)
    const latestDocId = `tracking-${payload.driverId}`
    const latestDoc = {
      id: latestDocId,
      driverId: payload.driverId,
      truckId: payload.truckId ?? null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speedKmh: payload.speedKmh ?? null,
      heading: payload.heading ?? null,
      status: payload.status || 'Active',
      batteryLevel: payload.batteryLevel ?? null,
      timestamp: timestamp,
      updatedAt: new Date().toISOString(),
    }

    await latestContainer.items.upsert(latestDoc)

    // Add to history
    await historyContainer.items.create(trackingDoc)

    // Update driver location in drivers container
    try {
      const driversContainer = await getDriversContainer()
      const driverDocId = payload.driverId
      
      // Try to get existing driver
      try {
        const { resource: existing } = await driversContainer.item(driverDocId, driverDocId).read()
        if (existing) {
          // Update existing driver
          await driversContainer.items.upsert({
            ...existing,
            currentLatitude: payload.latitude,
            currentLongitude: payload.longitude,
            speedKmh: payload.speedKmh ?? null,
            batteryLevel: payload.batteryLevel ?? null,
            lastGpsUpdate: new Date(timestamp).toISOString(),
            currentStatus: payload.status === 'Moving' ? 'Active' : payload.status === 'Idle' ? 'Idle' : 'Active',
            updatedAt: new Date().toISOString(),
          })
        } else {
          // Create minimal driver entry if doesn't exist
          await driversContainer.items.create({
            id: driverDocId,
            driverId: driverDocId,
            currentLatitude: payload.latitude,
            currentLongitude: payload.longitude,
            speedKmh: payload.speedKmh ?? null,
            batteryLevel: payload.batteryLevel ?? null,
            lastGpsUpdate: new Date(timestamp).toISOString(),
            currentStatus: 'Active',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          })
        }
      } catch (error: any) {
        if (error.code !== 404) {
          console.error('Error updating driver location:', error)
        }
      }
    } catch (error) {
      console.error('Error updating driver:', error)
      // Continue even if driver update fails
    }

    console.log(`✅ Tracking data saved for driver ${payload.driverId}`)
  } catch (error) {
    console.error('Error saving tracking data:', error)
    throw error
  }
}

// Get latest tracking for all drivers/trucks
export const getLatestTracking = async (): Promise<TrackingData[]> => {
  try {
    const container = await getTrackingLatestContainer()
    const { resources } = await container.items.readAll().fetchAll()
    
    // Group by driverId or truckId and get latest for each
    const latestMap = new Map<string, TrackingData>()
    
    resources.forEach((item: any) => {
      const key = item.truckId || item.driverId || item.id
      if (!key) return
      
      const timestamp = parseTimestamp(item.timestamp || item.updatedAt || item.createdAt)
      const existing = latestMap.get(key)
      
      if (!existing || timestamp > existing.timestamp) {
        latestMap.set(key, {
          trackingId: item.id,
          driverId: item.driverId ?? null,
          truckId: item.truckId ?? null,
          latitude: typeof item.latitude === 'number' ? item.latitude : 0,
          longitude: typeof item.longitude === 'number' ? item.longitude : 0,
          speedKmh: typeof item.speedKmh === 'number' ? item.speedKmh : null,
          heading: typeof item.heading === 'number' ? item.heading : null,
          status: item.status ?? null,
          batteryLevel: typeof item.batteryLevel === 'number' ? item.batteryLevel : null,
          timestamp,
        })
      }
    })
    
    return Array.from(latestMap.values())
  } catch (error) {
    console.error('Error getting latest tracking:', error)
    return []
  }
}

// Get tracking history for a specific driver
export const getDriverTracking = async (driverId: string, limitCount: number = 1000): Promise<TrackingData[]> => {
  try {
    const container = await getTrackingLatestContainer()
    
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.driverId = @driverId ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit',
      parameters: [
        { name: '@driverId', value: driverId },
        { name: '@limit', value: limitCount }
      ]
    }

    const { resources } = await container.items.query(querySpec).fetchAll()
    
    return resources.map((item: any) => ({
      trackingId: item.id,
      driverId: item.driverId ?? null,
      truckId: item.truckId ?? null,
      latitude: typeof item.latitude === 'number' ? item.latitude : 0,
      longitude: typeof item.longitude === 'number' ? item.longitude : 0,
      speedKmh: typeof item.speedKmh === 'number' ? item.speedKmh : null,
      heading: typeof item.heading === 'number' ? item.heading : null,
      status: item.status ?? null,
      batteryLevel: typeof item.batteryLevel === 'number' ? item.batteryLevel : null,
      timestamp: parseTimestamp(item.timestamp || item.updatedAt || item.createdAt),
    }))
  } catch (error) {
    console.error('Error getting driver tracking:', error)
    return []
  }
}

// Get tracking history for a specific truck
export const getTruckTracking = async (truckId: string, limitCount: number = 1000): Promise<TrackingData[]> => {
  try {
    const container = await getTrackingLatestContainer()
    
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.truckId = @truckId ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit',
      parameters: [
        { name: '@truckId', value: truckId },
        { name: '@limit', value: limitCount }
      ]
    }

    const { resources } = await container.items.query(querySpec).fetchAll()
    
    return resources.map((item: any) => ({
      trackingId: item.id,
      driverId: item.driverId ?? null,
      truckId: item.truckId ?? null,
      latitude: typeof item.latitude === 'number' ? item.latitude : 0,
      longitude: typeof item.longitude === 'number' ? item.longitude : 0,
      speedKmh: typeof item.speedKmh === 'number' ? item.speedKmh : null,
      heading: typeof item.heading === 'number' ? item.heading : null,
      status: item.status ?? null,
      batteryLevel: typeof item.batteryLevel === 'number' ? item.batteryLevel : null,
      timestamp: parseTimestamp(item.timestamp || item.updatedAt || item.createdAt),
    }))
  } catch (error) {
    console.error('Error getting truck tracking:', error)
    return []
  }
}

