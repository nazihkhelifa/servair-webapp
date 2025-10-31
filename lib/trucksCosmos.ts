// Cosmos DB service for trucks
import { getTrucksContainer } from './cosmosDb'

export type TruckStatus = 'Available' | 'In Use' | 'In Maintenance' | 'Offline' | 'Inactive'

export interface TruckRecord {
  truckId: string
  plateNumber: string
  type: string
  model?: string | null
  capacity?: string | null
  status: TruckStatus
  assignedDriverId?: string | null
  currentAssignmentId?: string | null
  lastGpsUpdate?: Date | null
  currentLatitude?: number | null
  currentLongitude?: number | null
  odometerKm?: number | null
  fuelLevelPercent?: number | null
  lastMaintenanceDate?: Date | null
  nextMaintenanceDate?: Date | null
  notes?: string | null
  createdAt?: Date | null
  updatedAt?: Date | null
}

export interface TruckPayload {
  truckId: string
  plateNumber: string
  type: string
  model?: string | null
  capacity?: string | null
  status: TruckStatus
  assignedDriverId?: string | null
  currentAssignmentId?: string | null
  currentLatitude?: number | null
  currentLongitude?: number | null
  odometerKm?: number | null
  fuelLevelPercent?: number | null
  lastMaintenanceDate?: string | Date | null
  nextMaintenanceDate?: string | Date | null
  notes?: string | null
}

const parseDate = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

const toTruckRecord = (item: any): TruckRecord => {
  return {
    truckId: item.truckId || item.id,
    plateNumber: item.plateNumber || '',
    type: item.type || '',
    model: item.model ?? null,
    capacity: item.capacity ?? null,
    status: (item.status as TruckStatus) || 'Available',
    assignedDriverId: item.assignedDriverId ?? null,
    currentAssignmentId: item.currentAssignmentId ?? null,
    lastGpsUpdate: parseDate(item.lastGpsUpdate),
    currentLatitude: typeof item.currentLatitude === 'number' ? item.currentLatitude : null,
    currentLongitude: typeof item.currentLongitude === 'number' ? item.currentLongitude : null,
    odometerKm: typeof item.odometerKm === 'number' ? item.odometerKm : null,
    fuelLevelPercent: typeof item.fuelLevelPercent === 'number' ? item.fuelLevelPercent : null,
    lastMaintenanceDate: parseDate(item.lastMaintenanceDate),
    nextMaintenanceDate: parseDate(item.nextMaintenanceDate),
    notes: item.notes ?? null,
    createdAt: parseDate(item.createdAt),
    updatedAt: parseDate(item.updatedAt),
  }
}

const normalizePayload = (payload: TruckPayload) => {
  const normalized: any = {
    id: payload.truckId,
    truckId: payload.truckId,
    plateNumber: payload.plateNumber,
    type: payload.type,
    model: payload.model ?? null,
    capacity: payload.capacity ?? null,
    status: payload.status,
    assignedDriverId: payload.assignedDriverId ?? null,
    currentAssignmentId: payload.currentAssignmentId ?? null,
    currentLatitude: payload.currentLatitude ?? null,
    currentLongitude: payload.currentLongitude ?? null,
    odometerKm: payload.odometerKm ?? null,
    fuelLevelPercent: payload.fuelLevelPercent ?? null,
    notes: payload.notes ?? null,
  }

  if (payload.lastMaintenanceDate) {
    normalized.lastMaintenanceDate = typeof payload.lastMaintenanceDate === 'string'
      ? payload.lastMaintenanceDate
      : payload.lastMaintenanceDate.toISOString()
  } else {
    normalized.lastMaintenanceDate = null
  }

  if (payload.nextMaintenanceDate) {
    normalized.nextMaintenanceDate = typeof payload.nextMaintenanceDate === 'string'
      ? payload.nextMaintenanceDate
      : payload.nextMaintenanceDate.toISOString()
  } else {
    normalized.nextMaintenanceDate = null
  }

  return normalized
}

export const listTrucks = async (): Promise<TruckRecord[]> => {
  try {
    const container = await getTrucksContainer()
    const { resources } = await container.items.readAll().fetchAll()
    console.log(`[Trucks] Retrieved ${resources.length} trucks from Cosmos DB`)
    return resources.map(toTruckRecord)
  } catch (error) {
    console.error('Error listing trucks:', error)
    return []
  }
}

export const getTruckById = async (truckId: string): Promise<TruckRecord | null> => {
  try {
    const container = await getTrucksContainer()
    const { resource } = await container.item(truckId, truckId).read()
    if (!resource) return null
    return toTruckRecord(resource)
  } catch (error: any) {
    if (error.code === 404) return null
    console.error('Error getting truck:', error)
    return null
  }
}

export const createTruck = async (payload: TruckPayload): Promise<TruckRecord> => {
  const container = await getTrucksContainer()
  
  const now = new Date().toISOString()
  const data = {
    ...normalizePayload(payload),
    createdAt: now,
    updatedAt: now,
  }

  await container.items.create(data)
  
  const { resource } = await container.item(payload.truckId, payload.truckId).read()
  if (!resource) {
    throw new Error('Failed to create truck record')
  }

  return toTruckRecord(resource)
}

export const updateTruck = async (truckId: string, payload: Partial<TruckPayload>): Promise<TruckRecord> => {
  const container = await getTrucksContainer()
  
  const { resource: existing } = await container.item(truckId, truckId).read()
  if (!existing) {
    throw new Error('Truck not found')
  }

  const updates: any = {
    ...existing,
    updatedAt: new Date().toISOString(),
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value === 'undefined') return
    
    if ((key === 'lastMaintenanceDate' || key === 'nextMaintenanceDate') && value) {
      updates[key] = typeof value === 'string' ? value : value.toISOString()
    } else {
      updates[key] = value ?? null
    }
  })

  await container.items.upsert(updates)
  
  const { resource } = await container.item(truckId, truckId).read()
  if (!resource) {
    throw new Error('Truck record not found after update')
  }

  return toTruckRecord(resource)
}

export const removeTruck = async (truckId: string): Promise<void> => {
  const container = await getTrucksContainer()
  await container.item(truckId, truckId).delete()
}

