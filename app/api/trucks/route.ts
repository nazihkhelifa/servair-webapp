import { NextRequest, NextResponse } from 'next/server'
import {
  listTrucks,
  getTruckById,
  createTruck,
  updateTruck,
  removeTruck,
  TruckPayload
} from '../../../lib/trucksCosmos'
import { getDriverById } from '../../../lib/driversCosmos'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

const buildDriverSummary = async (driverId?: string | null) => {
  if (!driverId) return null
  try {
    const driver = await getDriverById(driverId)
    if (!driver) return null
    const { driverId: id, fullName, phoneNumber, email, currentStatus } = driver
    return { driverId: id, fullName, phoneNumber, email, currentStatus }
  } catch (error) {
    console.warn('Unable to enrich truck with driver', error)
    return null
  }
}

const attachDriverSummary = async (truck: any) => {
  const driver = await buildDriverSummary(truck.assignedDriverId)
  return { ...truck, driver }
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
    const truckId = searchParams.get('truckId')
    const includeDriver = searchParams.get('expand') === 'driver'

    if (truckId) {
      const truck = await getTruckById(truckId)
      if (!truck) {
        return NextResponse.json({ error: 'Truck not found' }, { status: 404 })
      }
      const enriched = includeDriver ? await attachDriverSummary(truck) : truck
      return NextResponse.json(enriched, { status: 200, headers: corsHeaders })
    }

    const trucks = await listTrucks()
    if (includeDriver) {
      const enriched = await Promise.all(trucks.map((truck) => attachDriverSummary(truck)))
      return NextResponse.json(enriched, { status: 200, headers: corsHeaders })
    }

    return NextResponse.json(trucks, { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching trucks:', error)
    return NextResponse.json({ error: 'Failed to fetch trucks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const truckId = body.truckId ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `truck_${Date.now()}`)

    const payload: TruckPayload = {
      truckId,
      plateNumber: body.plateNumber,
      type: body.type,
      model: body.model ?? null,
      capacity: body.capacity ?? null,
      status: body.status ?? 'Available',
      assignedDriverId: body.assignedDriverId ?? null,
      currentAssignmentId: body.currentAssignmentId ?? null,
      currentLatitude: body.currentLatitude ?? null,
      currentLongitude: body.currentLongitude ?? null,
      odometerKm: body.odometerKm ?? null,
      fuelLevelPercent: body.fuelLevelPercent ?? null,
      lastMaintenanceDate: body.lastMaintenanceDate ?? null,
      nextMaintenanceDate: body.nextMaintenanceDate ?? null,
      notes: body.notes ?? null
    }

    if (!payload.plateNumber || !payload.type) {
      return NextResponse.json({ error: 'Plate number and type are required' }, { status: 400 })
    }

    const truck = await createTruck(payload)
    const enriched = await attachDriverSummary(truck)
    return NextResponse.json(enriched, { status: 201, headers: corsHeaders })
  } catch (error) {
    console.error('Error creating truck:', error)
    return NextResponse.json({ error: 'Failed to create truck' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const truckId = body.truckId

    if (!truckId) {
      return NextResponse.json({ error: 'truckId is required' }, { status: 400 })
    }

    const truck = await updateTruck(truckId, body)
    const enriched = await attachDriverSummary(truck)
    return NextResponse.json(enriched, { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Error updating truck:', error)
    return NextResponse.json({ error: 'Failed to update truck' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const truckId = searchParams.get('truckId')

    if (!truckId) {
      return NextResponse.json({ error: 'truckId query param is required' }, { status: 400 })
    }

    await removeTruck(truckId)
    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Error deleting truck:', error)
    return NextResponse.json({ error: 'Failed to delete truck' }, { status: 500 })
  }
}
