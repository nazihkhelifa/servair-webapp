import { NextRequest, NextResponse } from 'next/server'
import { listLocations, getLocationById, createLocation, updateLocation, deleteLocation } from '../../../lib/locationsCosmos'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET - Fetch all locations or filter by airport/type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const airport = searchParams.get('airport')
    const type = searchParams.get('type')

    const locations = await listLocations(airport || undefined, type || undefined)
    return NextResponse.json(locations, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST - Create new location
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.airport || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, airport, type' },
        { status: 400, headers: corsHeaders }
      )
    }

    const location = await createLocation(body)
    return NextResponse.json(
      { 
        success: true, 
        id: location.id,
        message: 'Location created successfully',
        location
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Failed to create location', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// PUT - Update location
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('id')

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const location = await updateLocation(locationId, body)
    return NextResponse.json(
      { success: true, message: 'Location updated successfully', location },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Failed to update location', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE - Delete location
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('id')

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    await deleteLocation(locationId)
    return NextResponse.json(
      { success: true, message: 'Location deleted successfully' },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Failed to delete location', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
