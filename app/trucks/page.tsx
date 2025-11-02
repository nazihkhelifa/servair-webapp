'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FiTruck,
  FiSearch,
  FiFilter,
  FiPlus,
  FiMap,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiWifi,
  FiUsers,
  FiWifiOff,
  FiEdit2,
  FiTrash2
} from 'react-icons/fi'
import { MdLocationOn } from 'react-icons/md'
import VerticalSidebar from '../../components/VerticalSidebar'
import TruckDetailDrawer from '../../components/TruckDetailDrawer'
import type { TruckRecord, TruckStatus } from '../../lib/trucksCosmos'

interface TrackingSnapshot {
  driverId?: string | null
  latitude?: number
  longitude?: number
  speedKmh?: number | null
  timestamp?: number | null
}

const statusChoices: TruckStatus[] = ['Available', 'In Use', 'In Maintenance', 'Offline', 'Inactive']

const truckTypes = [
  'Catering Truck',
  'Cargo Loader',
  'Baggage Tractor',
  'Fuel Truck',
  'Water Service',
  'Lavatory Service',
  'Ground Power Unit',
  'Air Starter Unit',
  'Pushback Tractor',
  'Passenger Stairs',
  'Belt Loader',
  'Container Loader',
  'De-icing Truck',
  'Toilet Service',
  'Waste Removal',
  'Other'
]

const normalizeStatus = (status: string | undefined | null) => status?.toLowerCase() ?? 'unknown'

const formatStatusLabel = (status: string | undefined | null) => status?.toUpperCase() ?? 'UNKNOWN'

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<TruckRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TruckStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all')
  const [latestTracking, setLatestTracking] = useState<Record<string, TrackingSnapshot>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSavePending, setIsSavePending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TruckRecord | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedTruck, setSelectedTruck] = useState<TruckRecord | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  const [formTruck, setFormTruck] = useState({
    truckId: '',
    plateNumber: '',
    type: '',
    model: '',
    capacity: '',
    status: 'Available' as TruckStatus,
    assignedDriverId: '',
    notes: '',
    lastMaintenanceDate: '',
    nextMaintenanceDate: ''
  })

  const loadTracking = useCallback(async () => {
    try {
      const response = await fetch('/api/tracking?type=latest')
      if (!response.ok) return
      const data = await response.json()
      const map: Record<string, TrackingSnapshot> = {}
      data.forEach((entry: any) => {
        const key = entry.truckId || entry.driverId || entry.trackingId
        if (!key) return
        map[key] = {
          driverId: entry.driverId ?? null,
          latitude: typeof entry.latitude === 'number' ? entry.latitude : undefined,
          longitude: typeof entry.longitude === 'number' ? entry.longitude : undefined,
          speedKmh: typeof entry.speedKmh === 'number' ? entry.speedKmh : null,
          timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : null
        }
      })
      setLatestTracking(map)
    } catch (error) {
      console.error('Error loading tracking snapshot:', error)
    }
  }, [])

  const loadTrucks = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/trucks')
      if (!response.ok) {
        throw new Error('Failed to load trucks')
      }
      const payload = await response.json()
      setTrucks(payload)
    } catch (error) {
      console.error('Error loading trucks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrucks()
    loadTracking()
    const interval = setInterval(() => {
      loadTrucks()
      loadTracking()
    }, 5000)
    return () => clearInterval(interval)
  }, [loadTrucks, loadTracking])

  const lowerSearchQuery = searchQuery.trim().toLowerCase()

  const filteredTrucks = trucks.filter((truck) => {
    const plateMatch = truck.plateNumber?.toLowerCase().includes(lowerSearchQuery)
    const driverMatch = truck.assignedDriverId
      ? truck.assignedDriverId.toLowerCase().includes(lowerSearchQuery)
      : false
    const matchesSearch = lowerSearchQuery === '' ? true : Boolean(plateMatch || driverMatch)

    const matchesStatus =
      statusFilter === 'all' || normalizeStatus(truck.status) === normalizeStatus(statusFilter)

    const matchesType =
      typeFilter === 'all' || truck.type.toLowerCase() === typeFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesType
  })

  const countStatus = (status: string) =>
    trucks.filter((truck) => normalizeStatus(truck.status) === status.toLowerCase()).length

  const availableTrucks = countStatus('available')
  const inUseTrucks = countStatus('in use')
  const maintenanceTrucks = countStatus('in maintenance')
  const offlineTrucks = countStatus('offline')

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>()
    trucks.forEach((truck) => {
      if (truck.type) {
        types.add(truck.type)
      }
    })
    return Array.from(types).sort()
  }, [trucks])

  const getStatusIcon = (status: string | undefined | null) => {
    const normalized = normalizeStatus(status)
    switch (normalized) {
      case 'available':
      case 'in use':
        return <FiCheckCircle className="h-5 w-5 text-green-600" />
      case 'in maintenance':
        return <FiAlertCircle className="h-5 w-5 text-yellow-600" />
      case 'offline':
      case 'inactive':
        return <FiWifiOff className="h-5 w-5 text-gray-400" />
      default:
        return <FiTruck className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string | undefined | null) => {
    const normalized = normalizeStatus(status)
    switch (normalized) {
      case 'available':
      case 'in use':
        return 'bg-green-100 text-green-700'
      case 'in maintenance':
        return 'bg-yellow-100 text-yellow-700'
      case 'offline':
      case 'inactive':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-blue-100 text-blue-700'
    }
  }

  const resetForm = useCallback(() => {
    setFormTruck({
      truckId: '',
      plateNumber: '',
      type: '',
      model: '',
      capacity: '',
      status: 'Available',
      assignedDriverId: '',
      notes: '',
      lastMaintenanceDate: '',
      nextMaintenanceDate: ''
    })
    setFormError(null)
  }, [])

  const handleFormChange = (field: string, value: string | TruckStatus) => {
    setFormTruck((prev) => ({ ...prev, [field]: value }))
  }

  const openCreateModal = () => {
    resetForm()
    setModalMode('create')
    setIsCreating(true)
  }

  const openEditModal = (truck: TruckRecord) => {
    setFormTruck({
      truckId: truck.truckId,
      plateNumber: truck.plateNumber,
      type: truck.type,
      model: truck.model ?? '',
      capacity: truck.capacity ?? '',
      status: (truck.status as TruckStatus) ?? 'Available',
      assignedDriverId: truck.assignedDriverId ?? '',
      notes: truck.notes ?? '',
      lastMaintenanceDate: truck.lastMaintenanceDate
        ? new Date(truck.lastMaintenanceDate).toISOString().split('T')[0]
        : '',
      nextMaintenanceDate: truck.nextMaintenanceDate
        ? new Date(truck.nextMaintenanceDate).toISOString().split('T')[0]
        : ''
    })
    setFormError(null)
    setModalMode('edit')
    setIsCreating(true)
  }

  const handleSubmitTruck = async () => {
    if (!formTruck.plateNumber.trim() || !formTruck.type.trim()) {
      setFormError('Plate number and type are required.')
      return
    }

    try {
      setIsSavePending(true)
      setFormError(null)

      const truckId =
        formTruck.truckId.trim() ||
        (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `truck_${Date.now()}`)

      const response = await fetch('/api/trucks', {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckId,
          plateNumber: formTruck.plateNumber.trim(),
          type: formTruck.type.trim(),
          model: formTruck.model.trim() || null,
          capacity: formTruck.capacity.trim() || null,
          status: formTruck.status,
          assignedDriverId: formTruck.assignedDriverId.trim() || null,
          notes: formTruck.notes.trim() || null,
          lastMaintenanceDate: formTruck.lastMaintenanceDate || null,
          nextMaintenanceDate: formTruck.nextMaintenanceDate || null
        })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to save truck' }))
        throw new Error(payload.error || 'Failed to save truck')
      }

      await loadTrucks()
      setIsCreating(false)
      resetForm()
    } catch (error: any) {
      console.error('Failed to save truck:', error)
      setFormError(error?.message || 'Failed to save truck. Please try again.')
    } finally {
      setIsSavePending(false)
    }
  }

  const handleDeleteTruck = async () => {
    if (!deleteTarget) return

    try {
      setIsSavePending(true)
      const response = await fetch(`/api/trucks?truckId=${encodeURIComponent(deleteTarget.truckId)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to delete truck' }))
        throw new Error(payload.error || 'Failed to delete truck')
      }

      await loadTrucks()
      setIsDeleteConfirmOpen(false)
      setDeleteTarget(null)
    } catch (error: any) {
      console.error('Failed to delete truck:', error)
      setFormError(error?.message || 'Failed to delete truck. Please try again.')
    } finally {
      setIsSavePending(false)
    }
  }

  return (
    <>
      <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
        <VerticalSidebar activePage="trucks" />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Truck Fleet</h1>
              <p className="text-gray-500">Manage and monitor your entire fleet</p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <FiPlus className="h-5 w-5" />
              <span>Add Truck</span>
            </button>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiTruck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Trucks</p>
                  <p className="text-2xl font-bold text-gray-900">{trucks.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiCheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available</p>
                  <p className="text-2xl font-bold text-gray-900">{availableTrucks}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiWifi className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">In Use</p>
                  <p className="text-2xl font-bold text-gray-900">{inUseTrucks}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FiAlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Maintenance</p>
                  <p className="text-2xl font-bold text-gray-900">{maintenanceTrucks}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by plate number or driver..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Search trucks by plate number or driver"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as TruckStatus | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Status</option>
                {statusChoices.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as string | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Trucks Grid */}
          {isLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading truck fleet...</p>
            </div>
          ) : filteredTrucks.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FiTruck className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trucks Found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try adjusting your search or filters' : 'Add your first truck to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrucks.map((truck) => {
                const tracking = latestTracking[truck.truckId]
                const latitude = tracking?.latitude ?? truck.currentLatitude ?? undefined
                const longitude = tracking?.longitude ?? truck.currentLongitude ?? undefined
                const timestamp = tracking?.timestamp ?? (truck.lastGpsUpdate ? new Date(truck.lastGpsUpdate).getTime() : undefined)
                const speedKmh = tracking?.speedKmh ?? null

                return (
                  <div 
                    key={truck.truckId}
                    onClick={() => {
                      setSelectedTruck(truck)
                      setIsDetailDrawerOpen(true)
                    }}
                    className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FiTruck className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{truck.plateNumber}</h3>
                            <p className="text-sm text-gray-500">{truck.type}</p>
                          </div>
                        </div>
                        {getStatusIcon(truck.status)}
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(truck.status)}`}>
                          {formatStatusLabel(truck.status)}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {(tracking?.driverId || truck.assignedDriverId) && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiUsers className="h-4 w-4" />
                            <span>{tracking?.driverId || truck.assignedDriverId}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MdLocationOn className="h-4 w-4" />
                          {latitude !== undefined && longitude !== undefined ? (
                            <span className="truncate">{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
                          ) : (
                            <span className="truncate">Unknown</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiClock className="h-4 w-4" />
                          <span>{timestamp ? new Date(timestamp).toLocaleTimeString() : '—'}</span>
                        </div>
                        {speedKmh !== null && speedKmh > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FiMap className="h-4 w-4" />
                            <span>{speedKmh.toFixed(1)} km/h</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                        <div className="text-blue-600 font-medium flex items-center gap-1">
                          <span>View Details</span>
                          <span>→</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-500">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              openEditModal(truck)
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
                              setDeleteTarget(truck)
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
                )
              })}
            </div>
          )}
          </div>
        </main>
      </div>
      
      {/* Truck Detail Drawer */}
      <TruckDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false)
          setSelectedTruck(null)
        }}
        truck={selectedTruck}
      />
      
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{modalMode === 'create' ? 'Add Truck' : 'Edit Truck'}</h2>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close truck form"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Truck ID (optional)</label>
                <input
                  type="text"
                  value={formTruck.truckId}
                  onChange={(event) => handleFormChange('truckId', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave blank to auto-generate"
                  disabled={modalMode === 'edit'}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Plate Number *</label>
                <input
                  type="text"
                  value={formTruck.plateNumber}
                  onChange={(event) => handleFormChange('plateNumber', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Type *</label>
                <select
                  value={formTruck.type}
                  onChange={(event) => handleFormChange('type', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">Select a truck type</option>
                  {truckTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Model</label>
                <input
                  type="text"
                  value={formTruck.model}
                  onChange={(event) => handleFormChange('model', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Capacity</label>
                <input
                  type="text"
                  value={formTruck.capacity}
                  onChange={(event) => handleFormChange('capacity', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 2 tons"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formTruck.status}
                  onChange={(event) => handleFormChange('status', event.target.value as TruckStatus)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statusChoices.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Assigned Driver ID</label>
                <input
                  type="text"
                  value={formTruck.assignedDriverId}
                  onChange={(event) => handleFormChange('assignedDriverId', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Last Maintenance Date</label>
                <input
                  type="date"
                  value={formTruck.lastMaintenanceDate}
                  onChange={(event) => handleFormChange('lastMaintenanceDate', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Next Maintenance Date</label>
                <input
                  type="date"
                  value={formTruck.nextMaintenanceDate}
                  onChange={(event) => handleFormChange('nextMaintenanceDate', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formTruck.notes}
                  onChange={(event) => handleFormChange('notes', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>

            {formError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false)
                  resetForm()
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-100"
                disabled={isSavePending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitTruck}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                disabled={isSavePending}
              >
                {isSavePending ? 'Saving…' : modalMode === 'create' ? 'Create Truck' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Delete Truck</h2>
              <p className="text-sm text-gray-600 mt-2">
                Are you sure you want to delete <span className="font-medium">{deleteTarget.plateNumber}</span>? This action cannot be undone.
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
                disabled={isSavePending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                onClick={handleDeleteTruck}
                disabled={isSavePending}
              >
                {isSavePending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

