import { NextRequest, NextResponse } from 'next/server'
import { listFlights, getFlightById, createFlight, updateFlight, deleteFlight } from '../../../lib/flightsCosmos'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/flights - Fetch all flights
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    const flights = await listFlights(date || undefined, status || undefined)
    return NextResponse.json(flights, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Error fetching flights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flights', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST /api/flights - Create new flight
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.flightCode || !body.theoreticalHour) {
      return NextResponse.json(
        { error: 'Missing required fields: flightCode, theoreticalHour' },
        { status: 400, headers: corsHeaders }
      )
    }

    const flight = await createFlight(body)
    return NextResponse.json(
      { 
        id: flight.id, 
        message: 'Flight created successfully',
        flight
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error creating flight:', error)
    return NextResponse.json(
      { error: 'Failed to create flight', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// PUT /api/flights - Update flight
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing flight ID' },
        { status: 400, headers: corsHeaders }
      )
    }

    const { id, ...updateData } = body
    const flight = await updateFlight(id, updateData)
    return NextResponse.json(
      { message: 'Flight updated successfully', id, flight },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error updating flight:', error)
    return NextResponse.json(
      { error: 'Failed to update flight', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE /api/flights - Delete flight
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing flight ID' },
        { status: 400, headers: corsHeaders }
      )
    }

    await deleteFlight(id)
    return NextResponse.json(
      { message: 'Flight deleted successfully', id },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error deleting flight:', error)
    return NextResponse.json(
      { error: 'Failed to delete flight', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
