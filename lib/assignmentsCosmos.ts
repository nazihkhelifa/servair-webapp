// Cosmos DB service for assignments
import { getAssignmentsContainer } from './cosmosDb'

export interface AssignmentRecord {
  id: string
  assignmentId: string
  title: string
  truck: string
  driver: string
  startLocation: string | null
  destination: string
  airport: string
  description: string
  status: string
  priority: string
  createdAt: string | null
  dueDate: string | null
  updatedAt: string | null
  startDate: string | null
  startTime: string | null
  dueDateOnly: string | null
  dueTime: string | null
  routeId: string | null
  routeStatus: string | null
  etaMinutes: number | null
  totalDistanceMeters: number | null
  computedAt: string | null
  flightId: string | null
  flightCode: string | null
  flightOrigin: string | null
  flightDestination: string | null
  theoreticalHour: string | null
  planeType: string | null
  gate: string | null
}

export interface AssignmentPayload {
  title: string
  truck: string
  driver?: string
  startLocation?: string
  destination: string
  airport?: string
  description?: string
  status?: string
  priority?: string
  createdAt?: string
  dueDate?: string
  startDate?: string
  startTime?: string
  dueDateOnly?: string
  dueTime?: string
  flightId?: string
  flightCode?: string
  flightOrigin?: string
  flightDestination?: string
  theoreticalHour?: string
  planeType?: string
  gate?: string
}

const parseDate = (value: unknown): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return null
}

const toAssignmentRecord = (item: any): AssignmentRecord => {
  return {
    id: item.id || item.assignmentId,
    assignmentId: item.assignmentId || item.id,
    title: item.title || '',
    truck: item.truck || '',
    driver: item.driver || 'Unassigned',
    startLocation: item.startLocation || null,
    destination: item.destination || '',
    airport: item.airport || 'CDG',
    description: item.description || '',
    status: item.status || 'pending',
    priority: item.priority || 'medium',
    createdAt: parseDate(item.createdAt),
    dueDate: parseDate(item.dueDate),
    updatedAt: parseDate(item.updatedAt),
    startDate: item.startDate || null,
    startTime: item.startTime || null,
    dueDateOnly: item.dueDateOnly || null,
    dueTime: item.dueTime || null,
    routeId: item.routeId || null,
    routeStatus: item.routeStatus || null,
    etaMinutes: typeof item.etaMinutes === 'number' ? item.etaMinutes : null,
    totalDistanceMeters: typeof item.totalDistanceMeters === 'number' ? item.totalDistanceMeters : null,
    computedAt: parseDate(item.computedAt),
    flightId: item.flightId || null,
    flightCode: item.flightCode || null,
    flightOrigin: item.flightOrigin || null,
    flightDestination: item.flightDestination || null,
    theoreticalHour: item.theoreticalHour || null,
    planeType: item.planeType || null,
    gate: item.gate || null,
  }
}

export const listAssignments = async (): Promise<AssignmentRecord[]> => {
  try {
    const container = await getAssignmentsContainer()
    const querySpec = {
      query: 'SELECT * FROM c ORDER BY c.createdAt DESC',
    }
    const { resources } = await container.items.query(querySpec).fetchAll()
    console.log(`[Assignments] Retrieved ${resources.length} assignments from Cosmos DB`)
    return resources.map(toAssignmentRecord)
  } catch (error) {
    console.error('Error listing assignments:', error)
    throw error
  }
}

export const getAssignmentById = async (assignmentId: string): Promise<AssignmentRecord | null> => {
  try {
    const container = await getAssignmentsContainer()
    const { resource } = await container.item(assignmentId, assignmentId).read()
    if (!resource) return null
    return toAssignmentRecord(resource)
  } catch (error: any) {
    if (error.code === 404) return null
    console.error('Error getting assignment:', error)
    throw error
  }
}

export const createAssignment = async (payload: AssignmentPayload): Promise<AssignmentRecord> => {
  const container = await getAssignmentsContainer()
  const assignmentId = `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const now = new Date().toISOString()
  const data: any = {
    id: assignmentId,
    assignmentId,
    title: payload.title,
    truck: payload.truck,
    driver: payload.driver || 'Unassigned',
    startLocation: payload.startLocation || 'Base',
    destination: payload.destination,
    airport: payload.airport || 'CDG',
    description: payload.description || '',
    status: payload.status || 'pending',
    priority: payload.priority || 'medium',
    createdAt: payload.createdAt || now,
    dueDate: payload.dueDate || now,
    updatedAt: now,
    startDate: payload.startDate || null,
    startTime: payload.startTime || null,
    dueDateOnly: payload.dueDateOnly || null,
    dueTime: payload.dueTime || null,
    routeId: null,
    routeStatus: null,
    etaMinutes: null,
    totalDistanceMeters: null,
    computedAt: null,
    flightId: payload.flightId || null,
    flightCode: payload.flightCode || null,
    flightOrigin: payload.flightOrigin || null,
    flightDestination: payload.flightDestination || null,
    theoreticalHour: payload.theoreticalHour || null,
    planeType: payload.planeType || null,
    gate: payload.gate || null,
  }

  await container.items.create(data)
  
  const { resource } = await container.item(assignmentId, assignmentId).read()
  if (!resource) {
    throw new Error('Failed to create assignment')
  }

  return toAssignmentRecord(resource)
}

export const updateAssignment = async (assignmentId: string, payload: Partial<AssignmentPayload>): Promise<AssignmentRecord> => {
  const container = await getAssignmentsContainer()
  
  const { resource: existing } = await container.item(assignmentId, assignmentId).read()
  if (!existing) {
    throw new Error('Assignment not found')
  }

  const updates: any = {
    ...existing,
    updatedAt: new Date().toISOString(),
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      updates[key] = value ?? null
    }
  })

  await container.items.upsert(updates)
  
  const { resource } = await container.item(assignmentId, assignmentId).read()
  if (!resource) {
    throw new Error('Assignment not found after update')
  }

  return toAssignmentRecord(resource)
}

export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  const container = await getAssignmentsContainer()
  await container.item(assignmentId, assignmentId).delete()
}

