'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiUser,
  FiPhone,
  FiMail,
  FiFileText,
  FiMapPin,
  FiBattery,
  FiSearch,
  FiFilter,
  FiRefreshCcw,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiList,
  FiCalendar,
  FiTruck,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiActivity
} from 'react-icons/fi'
import { MdLocationOn } from 'react-icons/md'
import Link from 'next/link'
import VerticalSidebar from '../../components/VerticalSidebar'
import DriverDetailDrawer from '../../components/DriverDetailDrawer'

type DriverStatus = 'Active' | 'Idle' | 'On Break' | 'Offline'

interface DriverRecord {
  driverId: string
  fullName: string
  phoneNumber: string
  email: string
  licenseNumber: string
  assignedTruckId?: string | null
  currentStatus: DriverStatus
  lastGpsUpdate?: string | null
  currentLatitude?: number | null
  currentLongitude?: number | null
  speedKmh?: number | null
  batteryLevel?: number | null
  lastAssignmentId?: string | null
  notes?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

const statusColors: Record<DriverStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  Idle: 'bg-yellow-100 text-yellow-700',
  'On Break': 'bg-blue-100 text-blue-700',
  Offline: 'bg-gray-100 text-gray-600'
}

interface Assignment {
  id: string
  title: string
  truck: string
  driver: string
  startLocation: string
  destination: string
  airport: string
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  dueDate: Date
  description: string
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
  routeId?: string | null
  routeStatus?: 'pending' | 'ready' | 'error' | null
  etaMinutes?: number | null
  totalDistanceMeters?: number | null
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverRecord[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DriverStatus>('all')
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DriverRecord | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [newDriver, setNewDriver] = useState({
    driverId: '',
    fullName: '',
    phoneNumber: '',
    email: '',
    licenseNumber: '',
    currentStatus: 'Active' as DriverStatus,
    assignedTruckId: '',
    notes: ''
  })
  const [editDriver, setEditDriver] = useState({
    driverId: '',
    fullName: '',
    phoneNumber: '',
    email: '',
    licenseNumber: '',
    currentStatus: 'Active' as DriverStatus,
    assignedTruckId: '',
    notes: ''
  })
  const [selectedDriver, setSelectedDriver] = useState<DriverRecord | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)

  const fetchDrivers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/drivers')
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }
      const data = await response.json()

      const normalized: DriverRecord[] = data.map((driver: DriverRecord) => ({
        ...driver,
        lastGpsUpdate: driver.lastGpsUpdate ?? null,
        createdAt: driver.createdAt ?? null,
        updatedAt: driver.updatedAt ?? null
      }))

      setDrivers(normalized)
    } catch (err) {
      console.error('Failed to load drivers:', err)
      setError('Unable to load drivers from Firestore. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchAssignments = useCallback(async () => {
    try {
      setIsLoadingAssignments(true)
      const response = await fetch('/api/assignments')
      if (!response.ok) {
        throw new Error('Failed to load assignments')
      }
      const data = await response.json()
      
      // Transform assignments to match Task interface
      const transformed: Assignment[] = data.map((assignment: any) => {
        // Parse dates
        const createdAt = assignment.createdAt 
          ? new Date(assignment.createdAt)
          : assignment.startDate && assignment.startTime
          ? new Date(`${assignment.startDate}T${assignment.startTime || '00:00'}`)
          : new Date()
        
        const dueDate = assignment.dueDate
          ? new Date(assignment.dueDate)
          : assignment.dueDateOnly && assignment.dueTime
          ? new Date(`${assignment.dueDateOnly}T${assignment.dueTime || '23:59'}`)
          : new Date(createdAt.getTime() + 3600000) // Default 1 hour later
        
        return {
          id: assignment.id || assignment.assignmentId,
          title: assignment.title || 'Untitled Assignment',
          truck: assignment.truck || 'Unknown',
          driver: assignment.driver || 'Unassigned',
          startLocation: assignment.startLocation || 'Unknown',
          destination: assignment.destination || 'Unknown',
          airport: assignment.airport || 'CDG',
          status: (assignment.status as Assignment['status']) || 'pending',
          priority: (assignment.priority as Assignment['priority']) || 'medium',
          createdAt,
          dueDate,
          description: assignment.description || '',
          startDate: assignment.startDate || null,
          startTime: assignment.startTime || null,
          dueDateOnly: assignment.dueDateOnly || null,
          dueTime: assignment.dueTime || null,
          flightId: assignment.flightId || null,
          flightCode: assignment.flightCode || null,
          flightOrigin: assignment.flightOrigin || null,
          flightDestination: assignment.flightDestination || null,
          theoreticalHour: assignment.theoreticalHour || null,
          planeType: assignment.planeType || null,
          gate: assignment.gate || null,
          routeId: assignment.routeId || null,
          routeStatus: assignment.routeStatus || null,
          etaMinutes: assignment.etaMinutes || null,
          totalDistanceMeters: assignment.totalDistanceMeters || null
        }
      })
      
      setAssignments(transformed)
    } catch (err) {
      console.error('Failed to load assignments:', err)
    } finally {
      setIsLoadingAssignments(false)
    }
  }, [])

  useEffect(() => {
    fetchDrivers()
  }, [fetchDrivers])

  useEffect(() => {
    if (viewMode === 'timeline') {
      fetchAssignments()
    }
  }, [viewMode, fetchAssignments])

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || driver.currentStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  const activeDrivers = drivers.filter((driver) => driver.currentStatus === 'Active').length
  const idleDrivers = drivers.filter((driver) => driver.currentStatus === 'Idle').length
  const onBreakDrivers = drivers.filter((driver) => driver.currentStatus === 'On Break').length
  const offlineDrivers = drivers.filter((driver) => driver.currentStatus === 'Offline').length

  const statusOptions = useMemo<DriverStatus[]>(() => ['Active', 'Idle', 'On Break', 'Offline'], [])

  const handleFormChange = (field: string, value: string, mode: 'create' | 'edit') => {
    if (mode === 'create') {
      setNewDriver((prev) => ({ ...prev, [field]: value }))
    } else {
      setEditDriver((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmitDriver = async (mode: 'create' | 'edit') => {
    const payload = mode === 'create' ? newDriver : editDriver

    if (!payload.fullName.trim() || !payload.phoneNumber.trim() || !payload.licenseNumber.trim()) {
      setFormError('Full name, phone number, and license number are required.')
      return
    }

    try {
      setIsSaving(true)
      setFormError(null)

      const driverId =
        payload.driverId.trim() ||
        (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `drv_${Date.now()}`)

      const response = await fetch('/api/drivers', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          fullName: payload.fullName.trim(),
          phoneNumber: payload.phoneNumber.trim(),
          email: payload.email.trim() || null,
          licenseNumber: payload.licenseNumber.trim(),
          currentStatus: payload.currentStatus,
          assignedTruckId: payload.assignedTruckId.trim() || null,
          notes: payload.notes.trim() || null
        })
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: 'Failed to save driver' }))
        throw new Error(errorPayload.error || 'Failed to save driver')
      }

      await fetchDrivers()
      if (mode === 'create') {
        setIsCreateModalOpen(false)
        setNewDriver({
          driverId: '',
          fullName: '',
          phoneNumber: '',
          email: '',
          licenseNumber: '',
          currentStatus: 'Active',
          assignedTruckId: '',
          notes: ''
        })
      } else {
        setIsEditModalOpen(false)
        setEditDriver({
          driverId: '',
          fullName: '',
          phoneNumber: '',
          email: '',
          licenseNumber: '',
          currentStatus: 'Active',
          assignedTruckId: '',
          notes: ''
        })
      }
    } catch (err: any) {
      console.error('Failed to save driver:', err)
      setFormError(err?.message || 'Failed to save driver. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDriver = async () => {
    if (!deleteTarget) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/drivers?driverId=${encodeURIComponent(deleteTarget.driverId)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: 'Failed to delete driver' }))
        throw new Error(errorPayload.error || 'Failed to delete driver')
      }

      await fetchDrivers()
      setIsDeleteConfirmOpen(false)
      setDeleteTarget(null)
    } catch (error: any) {
      console.error('Failed to delete driver:', error)
      setFormError(error?.message || 'Failed to delete driver. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
      <VerticalSidebar activePage="drivers" />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Drivers</h1>
              <p className="text-gray-500">Manage your fleet drivers and real-time assignments</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDrivers}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl flex items-center gap-2 hover:bg-gray-200 transition-colors"
              >
                <FiRefreshCcw className="h-5 w-5" />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormError(null)
                  setNewDriver({
                    driverId: '',
                    fullName: '',
                    phoneNumber: '',
                    email: '',
                    licenseNumber: '',
                    currentStatus: 'Active',
                    assignedTruckId: '',
                    notes: ''
                  })
                  setIsCreateModalOpen(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <FiPlus className="h-5 w-5" />
                <span>Add Driver</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" role="list" aria-label="Driver status summary">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiUser className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500" id="total-drivers-label">Total Drivers</p>
                  <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiUser className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500" aria-describedby="total-drivers-label">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{activeDrivers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FiUser className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Idle</p>
                  <p className="text-2xl font-bold text-gray-900">{idleDrivers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FiUser className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Offline</p>
                  <p className="text-2xl font-bold text-gray-900">{offlineDrivers}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FiList className="h-4 w-4" />
                    <span>List View</span>
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      viewMode === 'timeline' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FiCalendar className="h-4 w-4" />
                    <span>Timeline View</span>
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by name, license, or phone..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Search drivers by keyword"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <FiFilter className="text-gray-400 h-5 w-5" />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as DriverStatus | 'all')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    aria-label="Filter drivers by status"
                  >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Idle">Idle</option>
                    <option value="On Break">On Break</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading drivers...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FiUser className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Drivers Found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try adjusting your search or filters' : 'Add your first driver to get started'}
              </p>
            </div>
          ) : viewMode === 'timeline' ? (
            <DriverTimeline 
              drivers={filteredDrivers} 
              assignments={assignments}
              isLoading={isLoadingAssignments}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDrivers.map((driver) => (
                <div 
                  key={driver.driverId} 
                  onClick={() => {
                    setSelectedDriver(driver)
                    setIsDetailDrawerOpen(true)
                  }}
                  className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-semibold text-blue-600">
                          {driver.fullName ? driver.fullName.charAt(0) : '?'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{driver.fullName}</h3>
                        <p className="text-sm text-gray-500">License: {driver.licenseNumber}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[driver.currentStatus]}`}>
                      {driver.currentStatus}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiPhone className="h-4 w-4" />
                      <span>{driver.phoneNumber || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiMail className="h-4 w-4" />
                      <span className="truncate">{driver.email || '—'}</span>
                    </div>
                    {driver.assignedTruckId && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FiFileText className="h-4 w-4" />
                        <span>Truck: {driver.assignedTruckId}</span>
                      </div>
                    )}
                    {(driver.currentLatitude != null && driver.currentLongitude != null) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FiMapPin className="h-4 w-4" />
                        <span>
                          {driver.currentLatitude.toFixed(4)}, {driver.currentLongitude.toFixed(4)}
                        </span>
                      </div>
                    )}
                    {driver.batteryLevel != null && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FiBattery className="h-4 w-4" />
                        <span>{driver.batteryLevel.toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
                    <p>Last update: {driver.lastGpsUpdate ? new Date(driver.lastGpsUpdate).toLocaleString() : 'Unknown'}</p>
                    <div className="flex items-center gap-3 text-sm">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setFormError(null)
                          setEditDriver({
                            driverId: driver.driverId,
                            fullName: driver.fullName,
                            phoneNumber: driver.phoneNumber,
                            email: driver.email ?? '',
                            licenseNumber: driver.licenseNumber,
                            currentStatus: driver.currentStatus,
                            assignedTruckId: driver.assignedTruckId ?? '',
                            notes: driver.notes ?? ''
                          })
                          setIsEditModalOpen(true)
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <FiEdit2 className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setFormError(null)
                          setDeleteTarget(driver)
                          setIsDeleteConfirmOpen(true)
                        }}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <FiTrash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {isCreateModalOpen ? 'Create Driver' : 'Edit Driver'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (isCreateModalOpen) {
                    setIsCreateModalOpen(false)
                  } else {
                    setIsEditModalOpen(false)
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <label className="text-sm font-medium text-gray-700">Driver ID (optional)</label>
                <input
                  type="text"
                  value={isCreateModalOpen ? newDriver.driverId : editDriver.driverId}
                  onChange={(event) => handleFormChange('driverId', event.target.value, isCreateModalOpen ? 'create' : 'edit')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave blank to auto-generate"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <label className="text-sm font-medium text-gray-700">Full Name *</label>
                <input
                  type="text"
                  value={isCreateModalOpen ? newDriver.fullName : editDriver.fullName}
                  onChange={(event) => handleFormChange('fullName', event.target.value, isCreateModalOpen ? 'create' : 'edit')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                <input
                  type="tel"
                  value={isCreateModalOpen ? newDriver.phoneNumber : editDriver.phoneNumber}
                  onChange={(event) => handleFormChange('phoneNumber', event.target.value, isCreateModalOpen ? 'create' : 'edit')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={isCreateModalOpen ? newDriver.email : editDriver.email}
                  onChange={(event) => handleFormChange('email', event.target.value, isCreateModalOpen ? 'create' : 'edit')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <label className="text-sm font-medium text-gray-700">License Number *</label>
                <input
                  type="text"
                  value={isCreateModalOpen ? newDriver.licenseNumber : editDriver.licenseNumber}
                  onChange={(event) => handleFormChange('licenseNumber', event.target.value, isCreateModalOpen ? 'create' : 'edit')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  value={isCreateModalOpen ? newDriver.currentStatus : editDriver.currentStatus}
                  onChange={(event) => handleFormChange('currentStatus', event.target.value, isCreateModalOpen ? 'create' : 'edit')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <label className="text-sm font-medium text-gray-700">Assigned Truck ID</label>
                <input
                  type="text"
                  value={isCreateModalOpen ? newDriver.assignedTruckId : editDriver.assignedTruckId}
                  onChange={(event) => handleFormChange('assignedTruckId', event.target.value, isCreateModalOpen ? 'create' : 'edit')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={isCreateModalOpen ? newDriver.notes : editDriver.notes}
                  onChange={(event) => handleFormChange('notes', event.target.value, isCreateModalOpen ? 'create' : 'edit')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                  onClick={() => {
                    if (isCreateModalOpen) {
                      setIsCreateModalOpen(false)
                    } else {
                      setIsEditModalOpen(false)
                    }
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  onClick={() => handleSubmitDriver(isCreateModalOpen ? 'create' : 'edit')}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving…' : isCreateModalOpen ? 'Create Driver' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Delete Driver</h2>
              <p className="text-sm text-gray-600 mt-2">
                Are you sure you want to delete <span className="font-medium">{deleteTarget.fullName}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-100"
                onClick={() => {
                  setIsDeleteConfirmOpen(false)
                  setDeleteTarget(null)
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                onClick={handleDeleteDriver}
                disabled={isSaving}
              >
                {isSaving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Detail Drawer */}
      <DriverDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false)
          setSelectedDriver(null)
        }}
        driver={selectedDriver}
      />
    </div>
  )
}

// Driver Timeline Component
interface DriverTimelineProps {
  drivers: DriverRecord[]
  assignments: Assignment[]
  isLoading: boolean
}

function DriverTimeline({ drivers, assignments, isLoading }: DriverTimelineProps) {
  const [dateRangeMode, setDateRangeMode] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Helper functions for status and priority badges
  const getStatusBadge = (status: Assignment['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'in-progress':
        return 'bg-blue-100 text-blue-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      case 'pending':
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getPriorityBadge = (priority: Assignment['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      case 'low':
        return 'bg-green-100 text-green-700'
    }
  }

  const getStatusIcon = (status: Assignment['status']) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="h-5 w-5 text-green-600" />
      case 'in-progress':
        return <FiClock className="h-5 w-5 text-blue-600" />
      case 'cancelled':
        return <FiAlertCircle className="h-5 w-5 text-red-600" />
      case 'pending':
        return <FiClock className="h-5 w-5 text-gray-400" />
    }
  }

  // Calculate date range
  const getDateRange = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (dateRangeMode) {
      case 'today':
        const endOfToday = new Date(today)
        endOfToday.setHours(23, 59, 59, 999)
        return { start: today, end: endOfToday }

      case 'week':
        const weekStart = new Date(today)
        const dayOfWeek = weekStart.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        weekStart.setDate(weekStart.getDate() + diff)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        return { start: weekStart, end: weekEnd }

      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)
        return { start: monthStart, end: monthEnd }

      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate)
          start.setHours(0, 0, 0, 0)
          const end = new Date(customEndDate)
          end.setHours(23, 59, 59, 999)
          return { start, end }
        }
        return null

      case 'all':
      default:
        return null
    }
  }

  const dateRangeFilter = getDateRange()

  // Filter assignments that overlap with the visible date range
  const visibleAssignments = dateRangeFilter 
    ? assignments.filter(assignment => {
        return assignment.dueDate >= dateRangeFilter.start && assignment.createdAt <= dateRangeFilter.end
      })
    : assignments

  // Group assignments by driver (one row per driver)
  const assignmentsByDriver = visibleAssignments.reduce((acc, assignment) => {
    if (!assignment.driver || assignment.driver === 'Unassigned') return acc
    if (!acc[assignment.driver]) {
      acc[assignment.driver] = []
    }
    acc[assignment.driver].push(assignment)
    return acc
  }, {} as Record<string, Assignment[]>)

  // Create gantt rows - one per driver, but only for drivers that exist
  const ganttRows: Array<{ driverId: string; driverName: string; assignments: Assignment[] }> = drivers
    .filter(driver => assignmentsByDriver[driver.driverId] || assignmentsByDriver[driver.fullName])
    .map(driver => {
      const driverAssignments = assignmentsByDriver[driver.driverId] || assignmentsByDriver[driver.fullName] || []
      return {
        driverId: driver.driverId,
        driverName: driver.fullName,
        assignments: driverAssignments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      }
    })
    .filter(row => row.assignments.length > 0)
    .sort((a, b) => a.driverName.localeCompare(b.driverName))

  // Get date range for timeline
  const allDates = visibleAssignments.flatMap(assignment => [assignment.createdAt, assignment.dueDate])
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading assignments...</p>
      </div>
    )
  }

  if (allDates.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiCalendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500">No assignments to display in timeline</p>
        <p className="text-sm text-gray-400 mt-2">Create assignments in the Tasks page to see them here</p>
      </div>
    )
  }

  // Determine min and max dates
  let minDate: Date
  let maxDate: Date

  if (dateRangeFilter) {
    minDate = dateRangeFilter.start
    maxDate = dateRangeFilter.end
  } else {
    const rawMinDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const rawMaxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
    
    minDate = new Date(rawMinDate)
    minDate.setHours(0, 0, 0, 0)
    
    maxDate = new Date(rawMaxDate)
    maxDate.setHours(23, 59, 59, 999)
    
    const thirtyDaysLater = new Date(minDate)
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
    thirtyDaysLater.setHours(23, 59, 59, 999)
    if (maxDate < thirtyDaysLater) {
      maxDate = thirtyDaysLater
    }
  }

  const effectiveMaxDate = maxDate
  const dateRange = effectiveMaxDate.getTime() - minDate.getTime()
  const daysRange = Math.ceil(dateRange / (1000 * 60 * 60 * 24))

  // Generate 30-minute interval markers
  const thirtyMinIntervalWidth = 60
  const totalIntervals = daysRange * 24 * 2

  // Generate date groups (days)
  const dateGroups: Array<{ date: Date; intervalCount: number }> = []
  for (let i = 0; i < daysRange; i++) {
    const date = new Date(minDate)
    date.setDate(date.getDate() + i)
    date.setHours(0, 0, 0, 0)
    dateGroups.push({ date, intervalCount: 48 })
  }

  // Generate hour markers
  const hourMarkers: Array<{ date: Date; hour: number }> = []
  for (let day = 0; day < daysRange; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const date = new Date(minDate)
      date.setDate(date.getDate() + day)
      date.setHours(hour, 0, 0, 0)
      hourMarkers.push({ date, hour })
    }
  }

  // Generate 30-minute interval markers
  const intervalMarkers: Date[] = []
  for (let day = 0; day < daysRange; day++) {
    for (let hour = 0; hour < 24; hour++) {
      for (let halfHour = 0; halfHour < 2; halfHour++) {
        const date = new Date(minDate)
        date.setDate(date.getDate() + day)
        date.setHours(hour, halfHour * 30, 0, 0)
        intervalMarkers.push(date)
      }
    }
  }

  // Calculate position based on time intervals
  const getDatePosition = (date: Date) => {
    const timeDiff = date.getTime() - minDate.getTime()
    const intervalsPassed = timeDiff / (30 * 60 * 1000)
    return (intervalsPassed / totalIntervals) * 100
  }

  const formatDateLabel = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    
    if (compareDate.getTime() === today.getTime()) {
      return { 
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.getDate().toString(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        isToday: true 
      }
    }
    
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate().toString(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      isToday: false
    }
  }

  const rowHeight = 72
  const sidebarWidth = 320
  
  const statusColors = {
    'completed': { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-700' },
    'in-progress': { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-700' },
    'cancelled': { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-700' },
    'pending': { bg: 'bg-gray-400', border: 'border-gray-500', text: 'text-gray-700' }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Driver Timeline View</h2>
            <p className="text-sm text-gray-500">Visual timeline of assignments for each driver</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs">
            <div className="font-semibold text-blue-900 mb-1">Timeline Info</div>
            <div className="text-blue-700 space-y-0.5">
              <div>Period: {minDate.toLocaleDateString()} - {effectiveMaxDate.toLocaleDateString()}</div>
              <div>Days: {daysRange} | Drivers: {ganttRows.length}</div>
              <div>Scale: Each column = 30 minutes</div>
            </div>
          </div>
        </div>

        {/* Date Range Filter Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setDateRangeMode('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  dateRangeMode === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Show All
              </button>
              <button
                onClick={() => setDateRangeMode('today')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  dateRangeMode === 'today'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateRangeMode('week')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  dateRangeMode === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setDateRangeMode('month')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  dateRangeMode === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateRangeMode('custom')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  dateRangeMode === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {dateRangeMode === 'custom' && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300">
              <label className="text-sm text-gray-600">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-sm text-gray-600">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {dateRangeMode !== 'all' && visibleAssignments.length < assignments.length && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
            <span className="font-medium">Showing {visibleAssignments.length} of {assignments.length} assignments</span> that overlap with the selected date range.
          </div>
        )}

        {dateRangeMode !== 'all' && visibleAssignments.length === 0 && assignments.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-sm text-orange-800">
            <span className="font-medium">No assignments found</span> in the selected date range. Try selecting a different range or click "Show All".
          </div>
        )}
      </div>

      {/* Gantt Chart Container */}
      <div className="flex" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 420px)' }}>
        {/* Fixed Left Sidebar */}
        <div className="flex-shrink-0 border-r border-gray-200 bg-gray-50" style={{ width: `${sidebarWidth}px` }}>
          <div className="sticky top-0 z-20 bg-gray-100 border-b border-gray-300 px-4 py-4">
            <div className="text-sm font-semibold text-gray-700">
              Drivers ({ganttRows.length})
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              {visibleAssignments.length} assignment{visibleAssignments.length !== 1 ? 's' : ''} total
            </div>
          </div>

          <div className="overflow-y-auto" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 420px)' }}>
            {ganttRows.map((row) => {
              const { driverId, driverName, assignments: driverAssignments } = row
              const pendingCount = driverAssignments.filter(a => a.status === 'pending').length
              const inProgressCount = driverAssignments.filter(a => a.status === 'in-progress').length
              const completedCount = driverAssignments.filter(a => a.status === 'completed').length
              
              return (
                <div
                  key={driverId}
                  className="border-b border-gray-200 px-4 py-4 hover:bg-gray-100 transition-colors"
                  style={{ height: `${rowHeight}px` }}
                >
                  <div className="flex items-start gap-3 h-full">
                    <FiUser className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 truncate mb-1">
                        {driverName}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {driverAssignments.length} {driverAssignments.length === 1 ? 'assignment' : 'assignments'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-[10px]">
                        {pendingCount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                            {pendingCount} pending
                          </span>
                        )}
                        {inProgressCount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            {inProgressCount} in progress
                          </span>
                        )}
                        {completedCount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                            {completedCount} done
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Scrollable Timeline Grid */}
        <div className="flex-1 overflow-x-auto overflow-y-auto" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 420px)' }}>
          {/* Three-Tier Timeline Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-300">
            {/* Tier 1: Dates (Days) */}
            <div className="flex border-b border-gray-300" style={{ minWidth: `${intervalMarkers.length * thirtyMinIntervalWidth}px` }}>
              {dateGroups.map((group, index) => {
                const label = formatDateLabel(group.date)
                return (
                  <div
                    key={index}
                    className="flex-shrink-0 border-r border-gray-300 px-2 py-2 flex flex-col items-center justify-center"
                    style={{ 
                      width: `${group.intervalCount * thirtyMinIntervalWidth}px`,
                      backgroundColor: label.isToday ? '#EBF4FF' : '#F9FAFB'
                    }}
                  >
                    <div className={`text-xs font-semibold ${label.isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                      {label.day}, {label.month} {label.date}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tier 2: Hours */}
            <div className="flex border-b border-gray-200" style={{ minWidth: `${intervalMarkers.length * thirtyMinIntervalWidth}px` }}>
              {hourMarkers.map((marker, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 border-r border-gray-200 px-1 py-1 flex items-center justify-center bg-gray-50"
                  style={{ width: `${thirtyMinIntervalWidth * 2}px` }}
                >
                  <div className="text-[11px] font-medium text-gray-600">
                    {marker.hour.toString().padStart(2, '0')}:00
                  </div>
                </div>
              ))}
            </div>

            {/* Tier 3: 30-Minute Intervals */}
            <div className="flex relative" style={{ minWidth: `${intervalMarkers.length * thirtyMinIntervalWidth}px` }}>
              {intervalMarkers.map((interval, index) => {
                const minutes = interval.getMinutes()
                const isCurrentTime = new Date().getHours() === interval.getHours() && 
                                     new Date().getMinutes() >= minutes && 
                                     new Date().getMinutes() < minutes + 30 &&
                                     new Date().toDateString() === interval.toDateString()
                
                return (
                  <div
                    key={index}
                    className={`flex-shrink-0 border-r border-gray-100 px-1 py-1.5 flex items-center justify-center ${
                      isCurrentTime ? 'bg-blue-50' : 'bg-white'
                    }`}
                    style={{ width: `${thirtyMinIntervalWidth}px` }}
                  >
                    <div className={`text-[10px] ${isCurrentTime ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                      {minutes === 0 ? '00' : '30'}
                    </div>
                  </div>
                )
              })}

              {/* Current Time Indicator Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none"
                style={{ left: `${getDatePosition(new Date())}%` }}
              >
                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-blue-500 rounded-full shadow" />
              </div>
            </div>
          </div>

          {/* Assignment Rows with Gantt Bars */}
          <div className="relative bg-white" style={{ minWidth: `${intervalMarkers.length * thirtyMinIntervalWidth}px` }}>
            {/* Vertical Grid Lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {hourMarkers.map((_, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 border-r border-gray-200"
                  style={{ width: `${thirtyMinIntervalWidth * 2}px` }}
                />
              ))}
            </div>

            <div className="absolute inset-0 flex pointer-events-none">
              {intervalMarkers.map((_, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 border-r border-gray-50"
                  style={{ width: `${thirtyMinIntervalWidth}px` }}
                />
              ))}
            </div>

            {/* Current Day Vertical Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500/20 z-0 pointer-events-none"
              style={{ left: `${getDatePosition(new Date())}%` }}
            />

            {/* Assignment Bars - Grouped by Driver */}
            {ganttRows.map((row) => {
              const { driverId, driverName, assignments: driverAssignments } = row
              
              return (
                <div
                  key={driverId}
                  className="relative border-b border-gray-200"
                  style={{ height: `${rowHeight}px` }}
                >
                  <div className="absolute inset-0 px-1">
                    {driverAssignments.map((assignment) => {
                      const startPos = getDatePosition(assignment.createdAt)
                      const endPos = getDatePosition(assignment.dueDate)
                      const width = Math.max(0.1, endPos - startPos)
                      const colors = statusColors[assignment.status]
                      
                      return (
                        <Link
                          key={assignment.id}
                          href={`/tasks?assignmentId=${assignment.id}`}
                          className={`absolute group cursor-pointer ${colors.bg} ${colors.border} rounded-md h-10 shadow-sm hover:shadow-lg transition-all border-2 flex items-center px-3`}
                          style={{
                            left: `${startPos}%`,
                            width: `${width}%`,
                            minWidth: '120px',
                            top: '50%',
                            transform: 'translateY(-50%)'
                          }}
                          title={`${assignment.title} | ${assignment.createdAt.toLocaleString()} → ${assignment.dueDate.toLocaleString()}`}
                        >
                          <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-medium text-white truncate text-center">
                              {assignment.title}
                            </span>
                            {assignment.priority === 'high' && (
                              <span className="flex-shrink-0 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse" />
                            )}
                          </div>

                          {/* Tooltip on Hover */}
                          <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-gray-900 text-white text-xs rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                            <div className="space-y-2">
                              {assignment.flightCode && (
                                <div className="border-b border-gray-700 pb-2 mb-2">
                                  <p className="font-bold text-sm text-blue-300">✈️ {assignment.flightCode}</p>
                                  {(assignment.flightOrigin || assignment.flightDestination) && (
                                    <p className="text-gray-400 text-[10px]">
                                      {assignment.flightOrigin || '???'} → {assignment.flightDestination || '???'}
                                      {assignment.planeType && ` | ${assignment.planeType}`}
                                      {assignment.gate && ` | Gate ${assignment.gate}`}
                                    </p>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-white">{assignment.title}</p>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  assignment.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                  assignment.status === 'in-progress' ? 'bg-blue-500/20 text-blue-300' :
                                  assignment.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
                                  'bg-gray-500/20 text-gray-300'
                                }`}>
                                  {assignment.status}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  assignment.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                                  assignment.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-gray-500/20 text-gray-300'
                                }`}>
                                  {assignment.priority}
                                </span>
                              </div>
                              {assignment.description && <p className="text-gray-300 text-xs">{assignment.description}</p>}
                            </div>
                            <div className="space-y-2 text-gray-400 mt-3">
                              <div className="flex items-center gap-2">
                                <FiTruck className="h-3 w-3" />
                                <span>Truck: {assignment.truck}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FiMapPin className="h-3 w-3" />
                                <span>From: {assignment.startLocation}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MdLocationOn className="h-3 w-3" />
                                <span>To: {assignment.destination}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FiClock className="h-3 w-3" />
                                <span>Start: {assignment.createdAt.toLocaleDateString()} {assignment.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FiClock className="h-3 w-3" />
                                <span>Due: {assignment.dueDate.toLocaleDateString()} {assignment.dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-500">
                                <div className="flex items-center gap-2">
                                  <FiActivity className="h-3 w-3" />
                                  <span>Duration: {((assignment.dueDate.getTime() - assignment.createdAt.getTime()) / (1000 * 60 * 60)).toFixed(1)} hours</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {ganttRows.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FiUser className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p>No drivers with assignments to display</p>
          <p className="text-sm mt-2">Create assignments in the Tasks page to see them here</p>
        </div>
      )}
    </div>
  )
}

