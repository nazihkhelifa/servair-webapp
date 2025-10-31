import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  DocumentData
} from 'firebase/firestore'
import { db } from './firebase'

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

const trucksCollection = collection(db, 'trucks')

const truckDocRef = (truckId: string) => doc(db, 'trucks', truckId)

type TruckSnapshot = QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>

const toDate = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

const toTruckRecord = (snapshot: TruckSnapshot): TruckRecord | null => {
  const data = snapshot.data()
  if (!data) return null

  return {
    truckId: typeof data.truckId === 'string' ? data.truckId : snapshot.id,
    plateNumber: data.plateNumber ?? '',
    type: data.type ?? '',
    model: data.model ?? null,
    capacity: data.capacity ?? null,
    status: (data.status as TruckStatus) ?? 'Available',
    assignedDriverId: data.assignedDriverId ?? null,
    currentAssignmentId: data.currentAssignmentId ?? null,
    lastGpsUpdate: toDate(data.lastGpsUpdate),
    currentLatitude: typeof data.currentLatitude === 'number' ? data.currentLatitude : null,
    currentLongitude: typeof data.currentLongitude === 'number' ? data.currentLongitude : null,
    odometerKm: typeof data.odometerKm === 'number' ? data.odometerKm : null,
    fuelLevelPercent: typeof data.fuelLevelPercent === 'number' ? data.fuelLevelPercent : null,
    lastMaintenanceDate: toDate(data.lastMaintenanceDate),
    nextMaintenanceDate: toDate(data.nextMaintenanceDate),
    notes: data.notes ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt)
  }
}

const toTimestamp = (value: string | Date | null | undefined) => {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  return Timestamp.fromDate(date)
}

const normalizePayload = (payload: TruckPayload) => {
  return {
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
    lastMaintenanceDate: toTimestamp(payload.lastMaintenanceDate),
    nextMaintenanceDate: toTimestamp(payload.nextMaintenanceDate),
    notes: payload.notes ?? null
  }
}

export const listTrucks = async (): Promise<TruckRecord[]> => {
  const snapshot = await getDocs(trucksCollection)
  const results: TruckRecord[] = []
  snapshot.forEach(docSnap => {
    const record = toTruckRecord(docSnap)
    if (record) {
      results.push(record)
    }
  })
  return results
}

export const getTruckById = async (truckId: string): Promise<TruckRecord | null> => {
  const docSnap = await getDoc(truckDocRef(truckId))
  if (!docSnap.exists()) return null
  return toTruckRecord(docSnap)
}

export const createTruck = async (payload: TruckPayload): Promise<TruckRecord> => {
  const docRef = truckDocRef(payload.truckId)
  const data = {
    ...normalizePayload(payload),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  await setDoc(docRef, data)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    throw new Error('Failed to create truck record')
  }
  const record = toTruckRecord(docSnap)
  if (!record) {
    throw new Error('Truck data is malformed after creation')
  }
  return record
}

export const updateTruck = async (truckId: string, payload: Partial<TruckPayload>): Promise<TruckRecord> => {
  const docRef = truckDocRef(truckId)
  const updates: Record<string, unknown> = {}

  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value === 'undefined') return
    if (key === 'lastMaintenanceDate' || key === 'nextMaintenanceDate') {
      updates[key] = toTimestamp(value as string | Date | null)
      return
    }
    updates[key] = value ?? null
  })

  updates.updatedAt = serverTimestamp()
  await updateDoc(docRef, updates)

  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    throw new Error('Truck record not found after update')
  }
  const record = toTruckRecord(docSnap)
  if (!record) {
    throw new Error('Truck data is malformed after update')
  }
  return record
}

export const removeTruck = async (truckId: string): Promise<void> => {
  await deleteDoc(truckDocRef(truckId))
}
