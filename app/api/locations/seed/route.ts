import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/firebase'
import { collection, addDoc, query, where, getDocs, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore'

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

    const locationsRef = collection(db, 'locations')

    // Process sequentially to keep audit deterministic
    for (const loc of locations) {
      if (!loc?.name || !loc?.airport || !loc?.type) {
        items.push({ name: loc?.name || 'unknown', airport: loc?.airport, type: loc?.type, status: 'error', message: 'Missing required fields' })
        continue
      }

      // Find existing by unique key: airport + name
      const q = query(locationsRef, where('airport', '==', loc.airport), where('name', '==', loc.name))
      const snap = await getDocs(q)

      if (snap.empty) {
        // Create new
        const data: any = {
          name: loc.name.trim(),
          airport: loc.airport,
          type: loc.type,
          description: loc.description || null,
          latitude: typeof loc.latitude === 'number' ? loc.latitude : null,
          longitude: typeof loc.longitude === 'number' ? loc.longitude : null,
          isActive: true,
          createdAt: Timestamp.now(),
        }
        if (!dryRun) {
          const docRef = await addDoc(locationsRef, data)
          createdIds.push(docRef.id)
        }
        items.push({ name: loc.name, airport: loc.airport, type: loc.type, status: dryRun ? 'create' : 'created', message: dryRun ? 'Would create' : 'Created' })
      } else {
        // Existing found — check if update is needed
        const existingDoc = snap.docs[0]
        const before = existingDoc.data()
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
            next.updatedAt = Timestamp.now()
            await updateDoc(doc(db, 'locations', id), next)
            updatedItems.push({ id, before: { latitude: before.latitude ?? null, longitude: before.longitude ?? null, description: before.description ?? null }, after: next })
          }
          items.push({ name: loc.name, airport: loc.airport, type: loc.type, status: dryRun ? 'update' : 'updated', message: dryRun ? 'Would update' : 'Updated' })
        }
      }
    }

    let auditId: string | null = null
    if (!dryRun) {
      const auditsRef = collection(db, 'location_seeding_audits')
      const auditDoc = await addDoc(auditsRef, {
        createdIds,
        updatedItems,
        createdCount: createdIds.length,
        updatedCount: updatedItems.length,
        totalProcessed: items.length,
        createdAt: Timestamp.now(),
      })
      auditId = auditDoc.id
    }

    return NextResponse.json({ items, auditId }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed locations', details: error?.message }, { status: 500, headers: corsHeaders })
  }
}


