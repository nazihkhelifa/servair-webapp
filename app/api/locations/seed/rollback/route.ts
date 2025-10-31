import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/firebase'
import { collection, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const auditId: string | undefined = body?.auditId
    if (!auditId) {
      return NextResponse.json({ error: 'auditId is required' }, { status: 400, headers: corsHeaders })
    }

    const auditRef = doc(db, 'location_seeding_audits', auditId)
    const auditSnap = await getDoc(auditRef)
    if (!auditSnap.exists()) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404, headers: corsHeaders })
    }

    const audit = auditSnap.data() as any
    const results: any[] = []

    // Delete created docs
    const createdIds: string[] = audit?.createdIds || []
    for (const id of createdIds) {
      try {
        await deleteDoc(doc(db, 'locations', id))
        results.push({ id, status: 'deleted', message: 'Created doc deleted' })
      } catch (e: any) {
        results.push({ id, status: 'error', message: e?.message || 'Failed to delete created doc' })
      }
    }

    // Revert updated docs
    const updatedItems: Array<{ id: string, before: any }> = audit?.updatedItems || []
    for (const u of updatedItems) {
      try {
        const upd: any = {}
        if ('latitude' in u.before) upd.latitude = u.before.latitude ?? null
        if ('longitude' in u.before) upd.longitude = u.before.longitude ?? null
        if ('description' in u.before) upd.description = u.before.description ?? null
        await updateDoc(doc(db, 'locations', u.id), upd)
        results.push({ id: u.id, status: 'reverted', message: 'Updated doc reverted' })
      } catch (e: any) {
        results.push({ id: u.id, status: 'error', message: e?.message || 'Failed to revert updated doc' })
      }
    }

    return NextResponse.json({ items: results }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Rollback error:', error)
    return NextResponse.json({ error: 'Failed to rollback', details: error?.message }, { status: 500, headers: corsHeaders })
  }
}


