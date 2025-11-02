import { NextRequest, NextResponse } from 'next/server'
import { getLocationsContainer, getContainer } from '../../../../lib/cosmosDb'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

type LocationItem = {
  name: string
  airport: 'CDG' | 'ORY'
  type: 'start' | 'destination'
  description?: string | null
  latitude?: number | null
  longitude?: number | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const locations: LocationItem[] = body?.locations || []
    const options: { dryRun?: boolean } = body?.options || {}
    const dryRun = options?.dryRun !== false ? true : false

    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json({ error: 'No locations provided' }, { status: 400, headers: corsHeaders })
    }

    const items: any[] = []
    const createdIds: string[] = []
    const updatedItems: Array<{ id: string, before: any, after: any }> = []

    const container = await getLocationsContainer()

    // Process sequentially to keep audit deterministic
    for (const loc of locations) {
      if (!loc?.name || !loc?.airport || !loc?.type) {
        items.push({ name: loc?.name || 'unknown', airport: loc?.airport, type: loc?.type, status: 'error', message: 'Missing required fields' })
        continue
      }

      // Find existing by unique key: airport + name
      const { resources: existing } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.airport = @airport AND c.name = @name',
          parameters: [
            { name: '@airport', value: loc.airport },
            { name: '@name', value: loc.name }
          ]
        })
        .fetchAll()

      if (existing.length === 0) {
        // Create new
        const locationId = `location-${loc.airport}-${loc.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`
        const now = new Date().toISOString()
        const data: any = {
          id: locationId,
          locationId,
          name: loc.name.trim(),
          airport: loc.airport,
          type: loc.type,
          description: loc.description || null,
          latitude: typeof loc.latitude === 'number' ? loc.latitude : null,
          longitude: typeof loc.longitude === 'number' ? loc.longitude : null,
          isActive: true,
          createdAt: now,
        }
        if (!dryRun) {
          await container.items.create(data)
          createdIds.push(locationId)
        }
        items.push({ name: loc.name, airport: loc.airport, type: loc.type, status: dryRun ? 'create' : 'created', message: dryRun ? 'Would create' : 'Created' })
      } else {
        // Existing found — check if update is needed
        const existingDoc = existing[0]
        const before = {
          latitude: existingDoc.latitude ?? null,
          longitude: existingDoc.longitude ?? null,
          description: existingDoc.description ?? null,
        }
        const id = existingDoc.id

        const next: any = {}
        let changed = false
        if (typeof loc.latitude === 'number' && loc.latitude !== before.latitude) { next.latitude = loc.latitude; changed = true }
        if (typeof loc.longitude === 'number' && loc.longitude !== before.longitude) { next.longitude = loc.longitude; changed = true }
        if (loc.description !== undefined && (loc.description || null) !== (before.description || null)) { next.description = loc.description || null; changed = true }

        if (!changed) {
          items.push({ name: loc.name, airport: loc.airport, type: loc.type, status: 'noop', message: 'No changes' })
        } else {
          if (!dryRun) {
            next.updatedAt = new Date().toISOString()
            const updatedDoc = { ...existingDoc, ...next }
            await container.items.upsert(updatedDoc)
            updatedItems.push({ id, before, after: next })
          }
          items.push({ name: loc.name, airport: loc.airport, type: loc.type, status: dryRun ? 'update' : 'updated', message: dryRun ? 'Would update' : 'Updated' })
        }
      }
    }

    let auditId: string | null = null
    if (!dryRun) {
      // Store audit in Cosmos DB
      const auditsContainer = await getContainer('location_seeding_audits')
      const auditDoc = {
        id: `audit-${Date.now()}`,
        createdIds,
        updatedItems,
        createdCount: createdIds.length,
        updatedCount: updatedItems.length,
        totalProcessed: items.length,
        createdAt: new Date().toISOString(),
      }
      await auditsContainer.items.create(auditDoc)
      auditId = auditDoc.id
    }

    return NextResponse.json({ items, auditId }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed locations', details: error?.message }, { status: 500, headers: corsHeaders })
  }
}
