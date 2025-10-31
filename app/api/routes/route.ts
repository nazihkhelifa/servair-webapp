import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'

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
    const routesRef = collection(db, 'routes')

    let q
    if (assignmentId) {
      q = query(routesRef, where('assignmentId', '==', assignmentId))
    } else {
      q = query(routesRef, orderBy('computedAt', 'desc'))
    }
    const snap = await getDocs(q)
    const routes = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json(routes, { headers: corsHeaders })
  } catch (e: any) {
    console.error('Error fetching routes:', e)
    return NextResponse.json({ error: 'Failed to fetch routes', details: e.message }, { status: 500, headers: corsHeaders })
  }
}


