// Cosmos DB service for drivers
import { getDriversContainer } from './cosmosDb'

export type DriverStatus = 'Active' | 'Idle' | 'On Break' | 'Offline'

export interface DriverRecord {
  driverId: string
  fullName: string
  phoneNumber: string
  email: string
  licenseNumber: string
  assignedTruckId?: string | null
  currentStatus: DriverStatus
  lastGpsUpdate?: Date | null
  currentLatitude?: number | null
  currentLongitude?: number | null
  speedKmh?: number | null
  batteryLevel?: number | null
  lastAssignmentId?: string | null
  notes?: string | null
  createdAt?: Date | null
  updatedAt?: Date | null
}

export interface DriverPayload {
  driverId: string
  fullName: string
  phoneNumber: string
  email: string
  licenseNumber: string
  assignedTruckId?: string | null
  currentStatus: DriverStatus
  lastGpsUpdate?: string | Date | null
  currentLatitude?: number | null
  currentLongitude?: number | null
  speedKmh?: number | null
  batteryLevel?: number | null
  lastAssignmentId?: string | null
  notes?: string | null
}

const parseDate = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

const toDriverRecord = (item: any): DriverRecord => {
  return {
    driverId: item.driverId || item.id,
    fullName: item.fullName || '',
    phoneNumber: item.phoneNumber || '',
    email: item.email || '',
    licenseNumber: item.licenseNumber || '',
    assignedTruckId: item.assignedTruckId ?? null,
    currentStatus: (item.currentStatus as DriverStatus) || 'Offline',
    lastGpsUpdate: parseDate(item.lastGpsUpdate),
    currentLatitude: typeof item.currentLatitude === 'number' ? item.currentLatitude : null,
    currentLongitude: typeof item.currentLongitude === 'number' ? item.currentLongitude : null,
    speedKmh: typeof item.speedKmh === 'number' ? item.speedKmh : null,
    batteryLevel: typeof item.batteryLevel === 'number' ? item.batteryLevel : null,
    lastAssignmentId: item.lastAssignmentId ?? null,
    notes: item.notes ?? null,
    createdAt: parseDate(item.createdAt),
    updatedAt: parseDate(item.updatedAt),
  }
}

const normalizePayload = (payload: DriverPayload) => {
  const normalized: any = {
    id: payload.driverId,
    driverId: payload.driverId,
    fullName: payload.fullName,
    phoneNumber: payload.phoneNumber,
    email: payload.email,
    licenseNumber: payload.licenseNumber,
    assignedTruckId: payload.assignedTruckId ?? null,
    currentStatus: payload.currentStatus,
    currentLatitude: payload.currentLatitude ?? null,
    currentLongitude: payload.currentLongitude ?? null,
    speedKmh: payload.speedKmh ?? null,
    batteryLevel: payload.batteryLevel ?? null,
    lastAssignmentId: payload.lastAssignmentId ?? null,
    notes: payload.notes ?? null,
  }

  if (payload.lastGpsUpdate) {
    normalized.lastGpsUpdate = typeof payload.lastGpsUpdate === 'string' 
      ? payload.lastGpsUpdate 
      : payload.lastGpsUpdate.toISOString()
  } else {
    normalized.lastGpsUpdate = null
  }

  return normalized
}

export const listDrivers = async (): Promise<DriverRecord[]> => {
  try {
    const container = await getDriversContainer()
    const { resources } = await container.items.readAll().fetchAll()
    console.log(`[Drivers] Retrieved ${resources.length} drivers from Cosmos DB`)
    return resources.map(toDriverRecord)
  } catch (error) {
    console.error('Error listing drivers:', error)
    return []
  }
}

export const getDriverById = async (driverId: string): Promise<DriverRecord | null> => {
  try {
    const container = await getDriversContainer()
    const { resource } = await container.item(driverId, driverId).read()
    if (!resource) return null
    return toDriverRecord(resource)
  } catch (error: any) {
    if (error.code === 404) return null
    console.error('Error getting driver:', error)
    return null
  }
}

export const createDriver = async (payload: DriverPayload): Promise<DriverRecord> => {
  const container = await getDriversContainer()
  
  const now = new Date().toISOString()
  const data = {
    ...normalizePayload(payload),
    createdAt: now,
    updatedAt: now,
  }

  await container.items.create(data)
  
  const { resource } = await container.item(payload.driverId, payload.driverId).read()
  if (!resource) {
    throw new Error('Failed to create driver record')
  }

  return toDriverRecord(resource)
}

export const updateDriver = async (driverId: string, payload: Partial<DriverPayload>): Promise<DriverRecord> => {
  const container = await getDriversContainer()
  
  // Get existing driver (or create if doesn't exist for location-only updates)
  let existing: any = null
  try {
    const { resource } = await container.item(driverId, driverId).read()
    existing = resource
  } catch (error: any) {
    if (error.code === 404) {
      // Driver doesn't exist - we'll create minimal driver if only location fields are provided
      existing = null
    } else {
      throw error
    }
  }

  // Prepare updates
  const updates: any = existing ? {
    ...existing,
    updatedAt: new Date().toISOString(),
  } : {
    id: driverId,
    driverId: driverId,
    fullName: '',
    phoneNumber: '',
    email: '',
    licenseNumber: '',
    currentStatus: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Apply payload updates
  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value === 'undefined') return
    
    if (key === 'lastGpsUpdate' && value) {
      updates.lastGpsUpdate = typeof value === 'string' ? value : value.toISOString()
    } else {
      updates[key] = value ?? null
    }
  })

  // Upsert updated document (will create if doesn't exist)
  await container.items.upsert(updates)
  
  const { resource } = await container.item(driverId, driverId).read()
  if (!resource) {
    throw new Error('Driver record not found after update')
  }

  return toDriverRecord(resource)
}

export const removeDriver = async (driverId: string): Promise<void> => {
  const container = await getDriversContainer()
  await container.item(driverId, driverId).delete()
}

