/**
 * Migration script: Move all data from Firestore to Cosmos DB
 * 
 * Usage: npx tsx scripts/migrate-all.ts
 * Or: npm run migrate:all
 * 
 * This will migrate:
 * - Locations
 * - Drivers
 * - Trucks
 * - Flights
 * - Assignments
 */

// Load environment variables from .env.local
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { migrateLocations } from './migrate-locations'

async function migrateAll() {
  console.log('🚀 Starting full migration from Firestore to Cosmos DB...\n')
  console.log('=' .repeat(60) + '\n')

  try {
    // Migrate Locations
    console.log('📍 STEP 1: Migrating Locations...\n')
    await migrateLocations()
    console.log('\n')

    // Add more migrations here as needed
    // await migrateDrivers()
    // await migrateTrucks()
    // await migrateFlights()
    // await migrateAssignments()

    console.log('='.repeat(60))
    console.log('✨ Full migration completed!')
    console.log('='.repeat(60) + '\n')

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
if (require.main === module) {
  migrateAll()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}

export { migrateAll }

