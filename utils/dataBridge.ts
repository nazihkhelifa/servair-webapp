// Data bridge utility for sharing GPS data between mobile app and web dashboard
// Now uses API endpoints for real data sharing

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

// API-based data sharing using Next.js API routes
export class DataBridge {
  private static readonly API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com/api' 
    : 'http://localhost:3000/api'

  // Get all GPS data from API
  static async getGPSData(): Promise<GPSData[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/gps`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error loading GPS data:', error)
      return []
    }
  }

  // Save GPS data to API
  static async saveGPSData(data: GPSData): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/gps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      await response.json()
    } catch (error) {
      console.error('Error saving GPS data:', error)
    }
  }

  // Clear all GPS data via API
  static async clearGPSData(): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/gps`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      await response.json()
    } catch (error) {
      console.error('Error clearing GPS data:', error)
    }
  }

  // Get data for a specific user
  static async getUserData(userId: string): Promise<GPSData[]> {
    const allData = await this.getGPSData()
    return allData.filter(data => data.userId === userId)
  }

  // Get latest data for each user
  static async getLatestUserData(): Promise<GPSData[]> {
    const allData = await this.getGPSData()
    const userMap = new Map<string, GPSData>()
    
    allData.forEach(data => {
      const existing = userMap.get(data.userId)
      if (!existing || data.timestamp > existing.timestamp) {
        userMap.set(data.userId, data)
      }
    })
    
    return Array.from(userMap.values())
  }

  // Calculate total distance for a user
  static calculateUserDistance(userId: string, data: GPSData[]): number {
    const userData = data.filter(d => d.userId === userId)
    if (userData.length < 2) return 0
    
    let totalDistance = 0
    for (let i = 1; i < userData.length; i++) {
      const prev = userData[i - 1]
      const curr = userData[i]
      
      totalDistance += this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      )
    }
    
    return totalDistance
  }

  // Calculate distance between two coordinates (Haversine formula)
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c / 1000 // Return distance in kilometers
  }
}
