import { NextRequest, NextResponse } from 'next/server'
import { addGPSData, getAllGPSData, getLatestUserLocations, getUserGPSData, getDatabaseStats, clearAllData, GPSData } from '../../../lib/gpsCosmos'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET - Retrieve GPS data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    
    let data
    
    if (type === 'latest') {
      // Get latest locations for all users
      data = await getLatestUserLocations()
    } else if (type === 'stats') {
      // Get database statistics
      data = await getDatabaseStats()
    } else if (userId) {
      // Get GPS data for specific user
      data = await getUserGPSData(userId)
    } else {
      // Get all GPS data
      data = await getAllGPSData()
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error reading GPS data:', error)
    return NextResponse.json({ error: 'Failed to read GPS data' }, { status: 500 })
  }
}

// POST - Save GPS data
export async function POST(request: NextRequest) {
  try {
    const gpsData: GPSData = await request.json()
    
    // Validate required fields
    if (!gpsData.id || !gpsData.userId || !gpsData.latitude || !gpsData.longitude) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Add to database (Firestore)
    await addGPSData(gpsData)
    
    return NextResponse.json({ success: true, id: gpsData.id })
  } catch (error) {
    console.error('Error saving GPS data:', error)
    return NextResponse.json({ error: 'Failed to save GPS data' }, { status: 500 })
  }
}

// DELETE - Clear all GPS data
export async function DELETE() {
  try {
    await clearAllData()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing GPS data:', error)
    return NextResponse.json({ error: 'Failed to clear GPS data' }, { status: 500 })
  }
}