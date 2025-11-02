import { NextRequest, NextResponse } from 'next/server'
import { getContainer } from '../../../lib/cosmosDb'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')
    const container = await getContainer('routes')

    if (assignmentId) {
      // Query by assignmentId
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.assignmentId = @assignmentId ORDER BY c.computedAt DESC',
          parameters: [{ name: '@assignmentId', value: assignmentId }]
        })
        .fetchAll()
      return NextResponse.json(resources, { headers: corsHeaders })
    } else {
      // Get all routes, ordered by computedAt desc
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c ORDER BY c.computedAt DESC'
        })
        .fetchAll()
      return NextResponse.json(resources, { headers: corsHeaders })
    }
  } catch (e: any) {
    console.error('Error fetching routes:', e)
    return NextResponse.json({ error: 'Failed to fetch routes', details: e.message }, { status: 500, headers: corsHeaders })
  }
}


