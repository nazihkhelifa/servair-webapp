// Firestore database service for GPS tracking
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  where,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

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

// Initialize database - ensure data directory exists (for compatibility)
const ensureDataDirectory = () => {
  // This function is kept for compatibility but Firestore handles storage
  console.log('Using Firestore for data storage')
}

// Initialize database structure
const initializeDatabase = () => {
  ensureDataDirectory()
  console.log('Firestore database initialized')
}

// Add GPS data to Firestore
export const addGPSData = async (gpsData: GPSData) => {
  try {
    initializeDatabase()
    
    // Add GPS data to collection
    await addDoc(collection(db, 'gpsData'), {
      ...gpsData,
      createdAt: serverTimestamp()
    })
    
    // Update or create user's latest location
    const userRef = doc(db, 'users', gpsData.userId)
    const userDoc = await getDocs(query(collection(db, 'users'), where('userId', '==', gpsData.userId)))
    
    let currentCount = 0
    userDoc.forEach((docSnap) => {
      currentCount = docSnap.data().totalLocations || 0
    })
    
    await setDoc(userRef, {
      userId: gpsData.userId,
      latestLocation: gpsData,
      totalLocations: currentCount + 1,
      lastUpdate: gpsData.timestamp,
      updatedAt: serverTimestamp()
    }, { merge: true })
    
    console.log('✅ GPS data saved to Firestore:', gpsData.userId)
  } catch (error) {
    console.error('Error writing to Firestore:', error)
    throw error
  }
}

// Get all GPS data
export const getAllGPSData = async (): Promise<GPSData[]> => {
  try {
    initializeDatabase()
    
    const q = query(
      collection(db, 'gpsData'),
      orderBy('timestamp', 'desc'),
      limit(1000)
    )
    
    const snapshot = await getDocs(q)
    const data: GPSData[] = []
    snapshot.forEach((doc) => {
      data.push(doc.data() as GPSData)
    })
    
    return data.sort((a: GPSData, b: GPSData) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('Error reading from Firestore:', error)
    return []
  }
}

// Get latest locations for all users
export const getLatestUserLocations = async (): Promise<UserLocation[]> => {
  try {
    initializeDatabase()
    
    const snapshot = await getDocs(collection(db, 'users'))
    const users: UserLocation[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      if (data.latestLocation) {
        users.push({
          userId: data.userId,
          latestLocation: data.latestLocation,
          totalLocations: data.totalLocations || 0,
          lastUpdate: data.lastUpdate
        })
      }
    })
    
    return users
  } catch (error) {
    console.error('Error getting user locations:', error)
    return []
  }
}

// Get GPS data for specific user
export const getUserGPSData = async (userId: string): Promise<GPSData[]> => {
  try {
    initializeDatabase()
    
    const q = query(
      collection(db, 'gpsData'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    )
    
    const snapshot = await getDocs(q)
    const data: GPSData[] = []
    
    snapshot.forEach((doc) => {
      data.push(doc.data() as GPSData)
    })
    
    return data.sort((a: GPSData, b: GPSData) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('Error getting user GPS data:', error)
    return []
  }
}

// Get database statistics
export const getDatabaseStats = async () => {
  try {
    initializeDatabase()
    
    const usersSnapshot = await getDocs(collection(db, 'users'))
    const gpsSnapshot = await getDocs(collection(db, 'gpsData'))
    
    const uniqueUsers = usersSnapshot.size
    const totalLocations = gpsSnapshot.size
    const users: UserLocation[] = []
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.latestLocation) {
        users.push(data as UserLocation)
      }
    })
    
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

// Clear all data - deletes documents from Firestore
export const clearAllData = async () => {
  try {
    initializeDatabase()
    
    // Note: In production, you'd want to delete documents properly
    // This is a simplified version that would need to be implemented with proper batch deletes
    console.log('⚠️ Clear all data function for Firestore needs proper implementation')
    console.log('🗑️ Firestore database clear - use Firebase Console or implement batch delete')
    
    // For now, we'll just log - proper implementation would require deleting all documents
    // which is not recommended for production without careful consideration
  } catch (error) {
    console.error('Error clearing Firestore data:', error)
  }
}
