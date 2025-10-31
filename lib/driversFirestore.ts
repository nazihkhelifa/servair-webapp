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

const driversCollection = collection(db, 'drivers')

const driverDocRef = (driverId: string) => doc(db, 'drivers', driverId)

const parseTimestamp = (value: unknown): Date | null => {
  if (!value) {
    return null
  }

  if (value instanceof Timestamp) {
    return value.toDate()
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

type DriverSnapshot = QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>

const toDriverRecord = (docSnap: DriverSnapshot): DriverRecord | null => {
  const data = docSnap.data()
  if (!data) {
    return null
  }

  const driverId = typeof data.driverId === 'string' ? data.driverId : docSnap.id

  const driver: DriverRecord = {
    driverId,
    fullName: typeof data.fullName === 'string' ? data.fullName : '',
    phoneNumber: typeof data.phoneNumber === 'string' ? data.phoneNumber : '',
    email: typeof data.email === 'string' ? data.email : '',
    licenseNumber: typeof data.licenseNumber === 'string' ? data.licenseNumber : '',
    assignedTruckId: data.assignedTruckId ?? null,
    currentStatus: (data.currentStatus as DriverStatus) ?? 'Offline',
    lastGpsUpdate: parseTimestamp(data.lastGpsUpdate),
    currentLatitude: typeof data.currentLatitude === 'number' ? data.currentLatitude : null,
    currentLongitude: typeof data.currentLongitude === 'number' ? data.currentLongitude : null,
    speedKmh: typeof data.speedKmh === 'number' ? data.speedKmh : null,
    batteryLevel: typeof data.batteryLevel === 'number' ? data.batteryLevel : null,
    lastAssignmentId: typeof data.lastAssignmentId === 'string' ? data.lastAssignmentId : null,
    notes: typeof data.notes === 'string' ? data.notes : null,
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt)
  }

  return driver
}

const isValidDate = (date: Date) => !Number.isNaN(date.getTime())

const toFirestoreTimestamp = (value: string | Date | null | undefined) => {
  if (!value) {
    return null
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (!(date instanceof Date) || !isValidDate(date)) {
    return null
  }

  return Timestamp.fromDate(date)
}

const normalizePayload = (payload: DriverPayload) => {
  const normalized: Record<string, unknown> = {
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
    notes: payload.notes ?? null
  }

  normalized.lastGpsUpdate = toFirestoreTimestamp(payload.lastGpsUpdate)

  return normalized
}

export const listDrivers = async (): Promise<DriverRecord[]> => {
  const snapshot = await getDocs(driversCollection)
  const drivers: DriverRecord[] = []

  snapshot.forEach((docSnap) => {
    const driver = toDriverRecord(docSnap)
    if (driver) {
      drivers.push(driver)
    }
  })

  return drivers
}

export const getDriverById = async (driverId: string): Promise<DriverRecord | null> => {
  const docSnap = await getDoc(driverDocRef(driverId))
  if (!docSnap.exists()) return null
  return toDriverRecord(docSnap)
}

export const createDriver = async (payload: DriverPayload): Promise<DriverRecord> => {
  const docRef = driverDocRef(payload.driverId)
  const data = {
    ...normalizePayload(payload),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  await setDoc(docRef, data)

  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    throw new Error('Failed to create driver record')
  }

  const driver = toDriverRecord(docSnap)
  if (!driver) {
    throw new Error('Driver data is malformed after creation')
  }

  return driver
}

export const updateDriver = async (driverId: string, payload: Partial<DriverPayload>): Promise<DriverRecord> => {
  const docRef = driverDocRef(driverId)

  const updates: Record<string, unknown> = {}

  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value === 'undefined') return

    if (key === 'lastGpsUpdate') {
      updates.lastGpsUpdate = toFirestoreTimestamp(value as string | Date | null | undefined)
      return
    }

    updates[key] = value ?? null
  })

  updates.updatedAt = serverTimestamp()

  await updateDoc(docRef, updates)

  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) {
    throw new Error('Driver record not found after update')
  }

  const driver = toDriverRecord(docSnap)
  if (!driver) {
    throw new Error('Driver data is malformed after update')
  }

  return driver
}

export const removeDriver = async (driverId: string): Promise<void> => {
  await deleteDoc(driverDocRef(driverId))
}

