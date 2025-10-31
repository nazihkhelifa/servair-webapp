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
  FiTrash2
} from 'react-icons/fi'
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

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DriverStatus>('all')
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

  useEffect(() => {
    fetchDrivers()
  }, [fetchDrivers])

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

