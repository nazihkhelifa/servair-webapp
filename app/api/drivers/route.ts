import { NextRequest, NextResponse } from 'next/server'
import {
  listDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  removeDriver,
  DriverPayload
} from '../../../lib/driversCosmos'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId')

    if (driverId) {
      const driver = await getDriverById(driverId)
      if (!driver) {
        return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
      }
      return NextResponse.json(driver, { status: 200, headers: corsHeaders })
    }

    const drivers = await listDrivers()
    return NextResponse.json(drivers, { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching drivers:', error)
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const driverId = body.driverId ?? crypto.randomUUID()

    const payload: DriverPayload = {
      driverId,
      fullName: body.fullName,
      phoneNumber: body.phoneNumber,
      email: body.email,
      licenseNumber: body.licenseNumber,
      assignedTruckId: body.assignedTruckId ?? null,
      currentStatus: body.currentStatus,
      lastGpsUpdate: body.lastGpsUpdate ?? null,
      currentLatitude: body.currentLatitude ?? null,
      currentLongitude: body.currentLongitude ?? null,
      speedKmh: body.speedKmh ?? null,
      batteryLevel: body.batteryLevel ?? null,
      lastAssignmentId: body.lastAssignmentId ?? null,
      notes: body.notes ?? null
    }

    if (!payload.fullName || !payload.phoneNumber || !payload.licenseNumber || !payload.currentStatus) {
      return NextResponse.json({ error: 'Missing required driver fields' }, { status: 400 })
    }

    const driver = await createDriver(payload)
    return NextResponse.json(driver, { status: 201, headers: corsHeaders })
  } catch (error) {
    console.error('Error creating driver:', error)
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const driverId = body.driverId

    if (!driverId) {
      return NextResponse.json({ error: 'driverId is required' }, { status: 400 })
    }

    const existingDriver = await getDriverById(driverId)
    if (!existingDriver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    const driver = await updateDriver(driverId, body as Partial<DriverPayload>)
    return NextResponse.json(driver, { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Error updating driver:', error)
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId')

    if (!driverId) {
      return NextResponse.json({ error: 'driverId query param is required' }, { status: 400 })
    }

    const existingDriver = await getDriverById(driverId)
    if (!existingDriver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    await removeDriver(driverId)
    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Error deleting driver:', error)
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 })
  }
}

