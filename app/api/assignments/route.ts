import { NextRequest, NextResponse } from 'next/server'
import { listAssignments, getAssignmentById, createAssignment, updateAssignment, deleteAssignment } from '../../../lib/assignmentsCosmos'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET - Fetch all assignments or specific assignment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('id')

    if (assignmentId) {
      const assignment = await getAssignmentById(assignmentId)
      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404, headers: corsHeaders })
      }
      return NextResponse.json(assignment, { headers: corsHeaders })
    }

    const assignments = await listAssignments()
    return NextResponse.json(assignments, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST - Create new assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.title || !body.truck || !body.destination) {
      return NextResponse.json(
        { error: 'Missing required fields: title, truck, destination' },
        { status: 400, headers: corsHeaders }
      )
    }

    const assignment = await createAssignment(body)
    return NextResponse.json(
      { 
        id: assignment.id, 
        message: 'Assignment created successfully',
        assignment
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error creating assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create assignment', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// PUT - Update assignment
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const assignment = await updateAssignment(id, updateData)
    return NextResponse.json(
      { message: 'Assignment updated successfully', id, assignment },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error updating assignment:', error)
    return NextResponse.json(
      { error: 'Failed to update assignment', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE - Delete assignment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    await deleteAssignment(id)
    return NextResponse.json(
      { message: 'Assignment deleted successfully', id },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error deleting assignment:', error)
    return NextResponse.json(
      { error: 'Failed to delete assignment', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
