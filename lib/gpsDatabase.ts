// Simple JSON file-based database for GPS tracking
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

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

const DATA_FILE = join(process.cwd(), 'data', 'gps-tracking.json')

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = join(process.cwd(), 'data')
  if (!existsSync(dataDir)) {
    require('fs').mkdirSync(dataDir, { recursive: true })
  }
}

// Initialize database with empty structure
const initializeDatabase = () => {
  ensureDataDirectory()
  
  if (!existsSync(DATA_FILE)) {
    const initialData = {
      gpsData: [],
      users: {},
      lastUpdate: Date.now()
    }
    writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2))
  }
}

// Read database
const readDatabase = () => {
  initializeDatabase()
  
  try {
    const data = readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading database:', error)
    return { gpsData: [], users: {}, lastUpdate: Date.now() }
  }
}

// Write database
const writeDatabase = (data: any) => {
  ensureDataDirectory()
  
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error writing database:', error)
  }
}

// Add GPS data to database
export const addGPSData = (gpsData: GPSData) => {
  const db = readDatabase()
  
  // Add GPS data
  db.gpsData.push(gpsData)
  
  // Update user info
  if (!db.users[gpsData.userId]) {
    db.users[gpsData.userId] = {
      userId: gpsData.userId,
      latestLocation: gpsData,
      totalLocations: 0,
      lastUpdate: gpsData.timestamp
    }
  }
  
  db.users[gpsData.userId].latestLocation = gpsData
  db.users[gpsData.userId].totalLocations++
  db.users[gpsData.userId].lastUpdate = gpsData.timestamp
  
  // Keep only last 1000 GPS entries to prevent file from growing too large
  if (db.gpsData.length > 1000) {
    db.gpsData = db.gpsData.slice(-1000)
  }
  
  db.lastUpdate = Date.now()
  writeDatabase(db)
  
  console.log('✅ GPS data saved to database:', gpsData.userId)
}

// Get all GPS data
export const getAllGPSData = (): GPSData[] => {
  const db = readDatabase()
  return db.gpsData.sort((a: GPSData, b: GPSData) => b.timestamp - a.timestamp)
}

// Get latest locations for all users
export const getLatestUserLocations = (): UserLocation[] => {
  const db = readDatabase()
  return Object.values(db.users) as UserLocation[]
}

// Get GPS data for specific user
export const getUserGPSData = (userId: string): GPSData[] => {
  const db = readDatabase()
  return db.gpsData
    .filter((data: GPSData) => data.userId === userId)
    .sort((a: GPSData, b: GPSData) => b.timestamp - a.timestamp)
}

// Get database statistics
export const getDatabaseStats = () => {
  const db = readDatabase()
  const uniqueUsers = Object.keys(db.users).length
  const totalLocations = db.gpsData.length
  
  return {
    uniqueUsers,
    totalLocations,
    lastUpdate: db.lastUpdate,
    users: Object.values(db.users)
  }
}

// Clear all data
export const clearAllData = () => {
  const emptyData = {
    gpsData: [],
    users: {},
    lastUpdate: Date.now()
  }
  writeDatabase(emptyData)
  console.log('🗑️ Database cleared')
}
