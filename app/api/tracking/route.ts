import { NextRequest, NextResponse } from 'next/server'
import { getLatestTracking, getDriverTracking, getTruckTracking, saveTrackingData } from '../../../lib/trackingCosmos'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Driver-ID'
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  })
}

// POST - Save tracking data from mobile app
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.driverId || typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: driverId, latitude, longitude' },
        { status: 400, headers: corsHeaders }
      )
    }

    await saveTrackingData({
      driverId: body.driverId,
      truckId: body.truckId || null,
      latitude: body.latitude,
      longitude: body.longitude,
      speedKmh: body.speedKmh || null,
      heading: body.heading || null,
      status: body.status || 'Active',
      batteryLevel: body.batteryLevel || null,
      timestamp: body.timestamp || Date.now(),
    })

    return NextResponse.json(
      { success: true, message: 'Tracking data saved successfully' },
      { status: 200, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error saving tracking data:', error)
    return NextResponse.json(
      { error: 'Failed to save tracking data', details: error?.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const driverId = searchParams.get('driverId')
    const truckId = searchParams.get('truckId')

    // Get latest tracking for all drivers/trucks
    if (type === 'latest') {
      const data = await getLatestTracking()
      return NextResponse.json(data, {
        status: 200,
        headers: corsHeaders
      })
    }

    // Get tracking for specific driver
    if (driverId) {
      const data = await getDriverTracking(driverId)
      return NextResponse.json(data, {
        status: 200,
        headers: corsHeaders
      })
    }

    // Get tracking for specific truck
    if (truckId) {
      const data = await getTruckTracking(truckId)
      return NextResponse.json(data, {
        status: 200,
        headers: corsHeaders
      })
    }

    // Default: return latest tracking
    const data = await getLatestTracking()
    return NextResponse.json(data.slice(0, 100), {
      status: 200,
      headers: corsHeaders
    })
  } catch (error: any) {
    console.error('Error fetching tracking data:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch tracking data', details: error?.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
