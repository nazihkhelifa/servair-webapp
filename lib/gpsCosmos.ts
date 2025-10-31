// Cosmos DB service for GPS tracking
import { getTrackingLatestContainer, getTrackingHistoryContainer } from './cosmosDb'

export interface GPSData {
  id: string
  userId: string
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
  speed?: number
  heading?: number
  altitude?: number
}

export interface UserLocation {
  userId: string
  latestLocation: GPSData
  totalLocations: number
  lastUpdate: number
}

// Add GPS data to Cosmos DB
export const addGPSData = async (gpsData: GPSData) => {
  try {
    const latestContainer = await getTrackingLatestContainer()
    const historyContainer = await getTrackingHistoryContainer()

    // Upsert latest location (using userId as partition key)
    const latestDoc = {
      id: `tracking-${gpsData.userId}`,
      driverId: gpsData.userId,
      ...gpsData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await latestContainer.items.upsert(latestDoc)

    // Add to history
    const historyDoc = {
      id: `history-${gpsData.userId}-${gpsData.timestamp}`,
      driverId: gpsData.userId,
      ...gpsData,
      createdAt: new Date().toISOString(),
    }

    await historyContainer.items.create(historyDoc)

    console.log('✅ GPS data saved to Cosmos DB:', gpsData.userId)
  } catch (error) {
    console.error('Error writing to Cosmos DB:', error)
    throw error
  }
}

// Get all GPS data (from history, limited)
export const getAllGPSData = async (limitCount: number = 1000): Promise<GPSData[]> => {
  try {
    const container = await getTrackingHistoryContainer()
    
    const querySpec = {
      query: 'SELECT * FROM c ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit',
      parameters: [
        { name: '@limit', value: limitCount }
      ]
    }

    const { resources } = await container.items.query(querySpec).fetchAll()
    console.log(`[GPS] Retrieved ${resources.length} GPS records from Cosmos DB`)
    
    return resources.map((item: any) => ({
      id: item.id,
      userId: item.userId || item.driverId,
      latitude: item.latitude,
      longitude: item.longitude,
      accuracy: item.accuracy,
      timestamp: item.timestamp,
      speed: item.speed,
      heading: item.heading,
      altitude: item.altitude,
    }))
  } catch (error) {
    console.error('Error reading from Cosmos DB:', error)
    return []
  }
}

// Get latest locations for all users
export const getLatestUserLocations = async (): Promise<UserLocation[]> => {
  try {
    const container = await getTrackingLatestContainer()
    
    const { resources } = await container.items.readAll().fetchAll()
    console.log(`[GPS] Retrieved ${resources.length} latest locations from Cosmos DB`)
    
    const users: UserLocation[] = resources.map((item: any) => ({
      userId: item.userId || item.driverId,
      latestLocation: {
        id: item.id,
        userId: item.userId || item.driverId,
        latitude: item.latitude,
        longitude: item.longitude,
        accuracy: item.accuracy,
        timestamp: item.timestamp,
        speed: item.speed,
        heading: item.heading,
        altitude: item.altitude,
      },
      totalLocations: item.totalLocations || 0,
      lastUpdate: item.timestamp || item.updatedAt || Date.now(),
    }))

    return users
  } catch (error) {
    console.error('Error getting user locations:', error)
    return []
  }
}

// Get GPS data for specific user
export const getUserGPSData = async (userId: string, limitCount: number = 1000): Promise<GPSData[]> => {
  try {
    const container = await getTrackingHistoryContainer()
    
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.driverId = @userId OR c.userId = @userId ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit',
      parameters: [
        { name: '@userId', value: userId },
        { name: '@limit', value: limitCount }
      ]
    }

    const { resources } = await container.items.query(querySpec).fetchAll()
    
    return resources.map((item: any) => ({
      id: item.id,
      userId: item.userId || item.driverId,
      latitude: item.latitude,
      longitude: item.longitude,
      accuracy: item.accuracy,
      timestamp: item.timestamp,
      speed: item.speed,
      heading: item.heading,
      altitude: item.altitude,
    }))
  } catch (error) {
    console.error('Error getting user GPS data:', error)
    return []
  }
}

// Get database statistics
export const getDatabaseStats = async () => {
  try {
    const latestContainer = await getTrackingLatestContainer()
    const historyContainer = await getTrackingHistoryContainer()

    const { resources: latest } = await latestContainer.items.readAll().fetchAll()
    const { resources: history } = await historyContainer.items.readAll().fetchAll()

    const uniqueUsers = latest.length
    const totalLocations = history.length
    const users: UserLocation[] = latest.map((item: any) => ({
      userId: item.userId || item.driverId,
      latestLocation: {
        id: item.id,
        userId: item.userId || item.driverId,
        latitude: item.latitude,
        longitude: item.longitude,
        accuracy: item.accuracy,
        timestamp: item.timestamp,
        speed: item.speed,
        heading: item.heading,
        altitude: item.altitude,
      },
      totalLocations: item.totalLocations || 0,
      lastUpdate: item.timestamp || item.updatedAt || Date.now(),
    }))

    return {
      uniqueUsers,
      totalLocations,
      lastUpdate: Date.now(),
      users
    }
  } catch (error) {
    console.error('Error getting database stats:', error)
    return {
      uniqueUsers: 0,
      totalLocations: 0,
      lastUpdate: Date.now(),
      users: []
    }
  }
}

// Clear all data (for testing only - be careful!)
export const clearAllData = async () => {
  try {
    console.log('⚠️ Clear all data function - not implemented for safety')
    console.log('🗑️ Use Azure Portal to delete data if needed')
    // In production, you'd want to implement proper batch deletion
  } catch (error) {
    console.error('Error clearing Cosmos DB data:', error)
  }
}

