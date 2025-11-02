import { NextRequest, NextResponse } from 'next/server'
import { getLocationsContainer, getContainer } from '../../../../../../lib/cosmosDb'

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

    const auditsContainer = await getContainer('location_seeding_audits')
    const locationsContainer = await getLocationsContainer()
    
    const { resource: audit } = await auditsContainer.item(auditId, auditId).read()
    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404, headers: corsHeaders })
    }

    const results: any[] = []

    // Delete created docs
    const createdIds: string[] = audit?.createdIds || []
    for (const id of createdIds) {
      try {
        await locationsContainer.item(id, id).delete()
        results.push({ id, status: 'deleted', message: 'Created doc deleted' })
      } catch (e: any) {
        results.push({ id, status: 'error', message: e?.message || 'Failed to delete created doc' })
      }
    }

    // Revert updated docs
    const updatedItems: Array<{ id: string, before: any }> = audit?.updatedItems || []
    for (const u of updatedItems) {
      try {
        const { resource: existing } = await locationsContainer.item(u.id, u.id).read()
        if (existing) {
          const reverted = { ...existing }
          if ('latitude' in u.before) reverted.latitude = u.before.latitude ?? null
          if ('longitude' in u.before) reverted.longitude = u.before.longitude ?? null
          if ('description' in u.before) reverted.description = u.before.description ?? null
          reverted.updatedAt = new Date().toISOString()
          await locationsContainer.items.upsert(reverted)
          results.push({ id: u.id, status: 'reverted', message: 'Updated doc reverted' })
        }
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
