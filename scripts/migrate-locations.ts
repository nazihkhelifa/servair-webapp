/**
 * Migration script: Move locations from Firestore to Cosmos DB
 * 
 * Usage: npx tsx scripts/migrate-locations.ts
 * Or: npm run migrate:locations
 * 
 * Make sure to set environment variables in .env.local:
 * - COSMOS_ENDPOINT
 * - COSMOS_KEY
 * - FIREBASE_PROJECT_ID (or use existing Firebase config)
 */

// IMPORTANT: Load environment variables FIRST before any other imports
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
const envPath = resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })
console.log(`📄 Loading environment from: ${envPath}`)
console.log(`✅ COSMOS_ENDPOINT: ${process.env.COSMOS_ENDPOINT ? 'Set' : 'Missing'}`)
console.log(`✅ COSMOS_KEY: ${process.env.COSMOS_KEY ? 'Set' : 'Missing'}\n`)

// Now import modules that need environment variables
import { getLocationsContainer, getDatabase } from '../lib/cosmosDb'
import { adminDb } from '../lib/firebaseAdmin'

interface FirestoreLocation {
  id: string
  name: string
  airport: string
  type: string
  description?: string
  latitude?: number
  longitude?: number
  geofence?: any
  isActive?: boolean
  createdAt?: any
}

async function migrateLocations() {
  try {
    console.log('🚀 Starting locations migration from Firestore to Cosmos DB...\n')

    // Step 1: Get all locations from Firestore
    console.log('📥 Fetching locations from Firestore...')
    const firestoreSnapshot = await adminDb.collection('locations').get()
    const firestoreLocations: FirestoreLocation[] = []

    firestoreSnapshot.forEach((doc) => {
      const data = doc.data()
      firestoreLocations.push({
        id: doc.id,
        ...data,
      } as FirestoreLocation)
    })

    console.log(`✅ Found ${firestoreLocations.length} locations in Firestore\n`)

    if (firestoreLocations.length === 0) {
      console.log('⚠️  No locations to migrate. Exiting.')
      return
    }

    // Step 2: Get Cosmos DB container
    console.log('🔗 Connecting to Cosmos DB...')
    const container = await getLocationsContainer()
    console.log('✅ Connected to Cosmos DB\n')

    // Step 3: Check existing locations in Cosmos DB
    const { resources: existing } = await container.items.readAll().fetchAll()
    console.log(`📊 Found ${existing.length} existing locations in Cosmos DB\n`)

    // Step 4: Transform and migrate each location
    console.log('📤 Migrating locations...\n')
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0

    for (const firestoreLocation of firestoreLocations) {
      try {
        // Check if location already exists in Cosmos DB
        const exists = existing.some((item: any) => 
          item.id === firestoreLocation.id || 
          item.locationId === firestoreLocation.id ||
          (item.name === firestoreLocation.name && item.airport === firestoreLocation.airport && item.type === firestoreLocation.type)
        )

        if (exists) {
          console.log(`⏭️  Skipping ${firestoreLocation.name} (already exists)`)
          skippedCount++
          continue
        }

        // Transform Firestore data to Cosmos DB format
        // Use Firestore document ID as both id and locationId
        const locationId = firestoreLocation.id
        const cosmosLocation: any = {
          id: locationId,
          locationId: locationId,
          name: firestoreLocation.name || '',
          airport: firestoreLocation.airport || 'CDG',
          type: firestoreLocation.type || 'destination',
          description: firestoreLocation.description || null,
          latitude: typeof firestoreLocation.latitude === 'number' ? firestoreLocation.latitude : null,
          longitude: typeof firestoreLocation.longitude === 'number' ? firestoreLocation.longitude : null,
          geofence: firestoreLocation.geofence || null,
          isActive: firestoreLocation.isActive !== false,
          createdAt: firestoreLocation.createdAt 
            ? (firestoreLocation.createdAt.toDate ? firestoreLocation.createdAt.toDate().toISOString() : firestoreLocation.createdAt)
            : new Date().toISOString(),
        }

        // Write to Cosmos DB
        await container.items.create(cosmosLocation)
        console.log(`✅ Migrated: ${firestoreLocation.name} (${firestoreLocation.airport})`)
        successCount++
      } catch (error: any) {
        console.error(`❌ Error migrating ${firestoreLocation.name}:`, error.message)
        errorCount++
      }
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Migration Summary:')
    console.log('='.repeat(50))
    console.log(`✅ Successfully migrated: ${successCount}`)
    console.log(`⏭️  Skipped (already exists): ${skippedCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    console.log(`📦 Total in Firestore: ${firestoreLocations.length}`)
    console.log('='.repeat(50) + '\n')

    // Verify final count
    const { resources: final } = await container.items.readAll().fetchAll()
    console.log(`🎉 Total locations in Cosmos DB: ${final.length}\n`)

    console.log('✨ Migration completed!')

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error)
    console.error('Error details:', error.message)
    process.exit(1)
  }
}

// Run migration
if (require.main === module) {
  migrateLocations()
    .then(() => {
      console.log('\n✅ Migration script finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error)
      process.exit(1)
    })
}

export { migrateLocations }

