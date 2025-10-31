// Azure Cosmos DB configuration and client
import { CosmosClient, Database, Container } from '@azure/cosmos'

// Lazy initialization - only create client when first accessed
let cosmosClientInstance: CosmosClient | null = null

const getCosmosClient = (): CosmosClient => {
  if (!cosmosClientInstance) {
    const endpoint = process.env.COSMOS_ENDPOINT
    const key = process.env.COSMOS_KEY

    if (!endpoint || !key) {
      throw new Error(
        'Cosmos DB credentials missing. Set COSMOS_ENDPOINT and COSMOS_KEY in environment variables.'
      )
    }

    cosmosClientInstance = new CosmosClient({
      endpoint,
      key,
    })
  }
  return cosmosClientInstance
}

// Export lazy-loaded client
export const cosmosClient = new Proxy({} as CosmosClient, {
  get(_target, prop) {
    return getCosmosClient()[prop as keyof CosmosClient]
  }
})

// Database name
const DATABASE_NAME = 'fleet'

// Container references (lazy-loaded for better performance)
let database: Database | null = null

export const getDatabase = async (): Promise<Database> => {
  if (!database) {
    const { database: db } = await cosmosClient.databases.createIfNotExists({
      id: DATABASE_NAME,
    })
    database = db
  }
  return database
}

// Helper function to get a container
export const getContainer = async (containerName: string): Promise<Container> => {
  const db = await getDatabase()
  const { container } = await db.containers.createIfNotExists({
    id: containerName,
    partitionKey: '/id', // Default partition key, can be overridden
  })
  return container
}

// Specific container getters for type safety
export const getDriversContainer = async () => {
  const db = await getDatabase()
  const { container } = await db.containers.createIfNotExists({
    id: 'drivers',
    partitionKey: { paths: ['/driverId'] },
  })
  return container
}

export const getTrucksContainer = async () => {
  const db = await getDatabase()
  const { container } = await db.containers.createIfNotExists({
    id: 'trucks',
    partitionKey: { paths: ['/truckId'] },
  })
  return container
}

export const getTrackingLatestContainer = async () => {
  const db = await getDatabase()
  const { container } = await db.containers.createIfNotExists({
    id: 'tracking_latest',
    partitionKey: { paths: ['/driverId'] },
  })
  return container
}

export const getTrackingHistoryContainer = async () => {
  const db = await getDatabase()
  const { container } = await db.containers.createIfNotExists({
    id: 'tracking_history',
    partitionKey: { paths: ['/driverId'] },
    defaultTtl: 604800, // 7 days in seconds
  })
  return container
}

export const getAssignmentsContainer = async () => {
  const db = await getDatabase()
  const { container } = await db.containers.createIfNotExists({
    id: 'assignments',
    partitionKey: { paths: ['/assignmentId'] },
  })
  return container
}

export const getFlightsContainer = async () => {
  const db = await getDatabase()
  const { container } = await db.containers.createIfNotExists({
    id: 'flights',
    partitionKey: { paths: ['/flightId'] },
  })
  return container
}

export const getLocationsContainer = async () => {
  const db = await getDatabase()
  const { container } = await db.containers.createIfNotExists({
    id: 'locations',
    partitionKey: { paths: ['/locationId'] },
  })
  return container
}

export default cosmosClient

