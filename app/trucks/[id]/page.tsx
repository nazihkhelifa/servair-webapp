'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  FiTruck,
  FiMapPin,
  FiClock,
  FiSettings,
  FiAlertCircle,
  FiCheckCircle,
  FiArrowLeft,
  FiEdit,
  FiMap,
  FiUsers,
  FiActivity
} from 'react-icons/fi'
import { MdLocationOn } from 'react-icons/md'
import Link from 'next/link'
import VerticalSidebar from '../../../components/VerticalSidebar'
import type { TruckRecord, TruckStatus } from '../../../lib/trucksCosmos'

interface TrackingEntry {
  driverId?: string | null
  latitude?: number
  longitude?: number
  speedKmh?: number | null
  timestamp?: number | null
  source: 'tracking' | 'gps'
}

const normalizeStatus = (status?: TruckStatus | string | null) => status?.toLowerCase() ?? 'unknown'

const formatStatusLabel = (status?: TruckStatus | string | null) => status?.toUpperCase() ?? 'UNKNOWN'

const getStatusBadge = (status?: TruckStatus | string | null) => {
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

const getStatusIcon = (status?: TruckStatus | string | null) => {
  const normalized = normalizeStatus(status)
  switch (normalized) {
    case 'available':
    case 'in use':
      return <FiCheckCircle className="h-5 w-5 text-green-600" />
    case 'in maintenance':
      return <FiAlertCircle className="h-5 w-5 text-yellow-600" />
    case 'offline':
    case 'inactive':
      return <FiTruck className="h-5 w-5 text-gray-400" />
    default:
      return <FiActivity className="h-5 w-5 text-blue-500" />
  }
}

const formatDateTime = (value?: Date | null, fallback = '—') => {
  if (!value) return fallback
  return value.toLocaleString()
}

const formatDate = (value?: Date | null, fallback = '—') => {
  if (!value) return fallback
  return value.toLocaleDateString()
}

const toTrackingEntries = (entries: any[], source: TrackingEntry['source']): TrackingEntry[] =>
  entries
    .map((entry) => ({
      driverId: entry.driverId ?? entry.userId ?? null,
      latitude: typeof entry.latitude === 'number' ? entry.latitude : undefined,
      longitude: typeof entry.longitude === 'number' ? entry.longitude : undefined,
      speedKmh: typeof entry.speedKmh === 'number' ? entry.speedKmh : entry.speed ? entry.speed * 3.6 : null,
      timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : entry.timestamp ? Number(entry.timestamp) : null,
      source
    }))
    .filter((entry) => typeof entry.latitude === 'number' && typeof entry.longitude === 'number')

export default function TruckDetailsPage() {
  const params = useParams()
  const truckParam = params?.id
  const truckId = Array.isArray(truckParam) ? truckParam[0] : truckParam

  const [truck, setTruck] = useState<TruckRecord | null>(null)
  const [trackingHistory, setTrackingHistory] = useState<TrackingEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadTrackingHistory = useCallback(async () => {
    if (!truckId) return [] as TrackingEntry[]

    try {
      const trackingResponse = await fetch(`/api/tracking?truckId=${encodeURIComponent(truckId)}`)
      if (trackingResponse.ok) {
        const trackingJson = await trackingResponse.json()
        return toTrackingEntries(trackingJson, 'tracking')
      }
    } catch (error) {
      console.warn('Tracking fetch failed, falling back to gps data:', error)
    }

    try {
      const gpsResponse = await fetch(`/api/gps?userId=${encodeURIComponent(truckId)}`)
      if (gpsResponse.ok) {
        const gpsJson = await gpsResponse.json()
        return toTrackingEntries(gpsJson, 'gps')
      }
    } catch (error) {
      console.warn('GPS fallback fetch failed:', error)
    }

    return []
  }, [truckId])

  const loadTruckDetails = useCallback(async () => {
    if (!truckId) return

    setIsLoading(true)
    setLoadError(null)

    try {
      const truckResponse = await fetch(`/api/trucks?truckId=${encodeURIComponent(truckId)}`)
      if (truckResponse.status === 404) {
        setTruck(null)
        setTrackingHistory([])
        return
      }

      if (!truckResponse.ok) {
        throw new Error(`Failed to load truck (${truckResponse.status})`)
      }

      const truckRecord: TruckRecord = await truckResponse.json()
      setTruck(truckRecord)

      const entries = await loadTrackingHistory()
      const sortedEntries = entries.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      setTrackingHistory(sortedEntries)
    } catch (error: any) {
      console.error('Error loading truck data:', error)
      setLoadError(error?.message || 'Failed to load truck data')
    } finally {
      setIsLoading(false)
    }
  }, [loadTrackingHistory, truckId])

  useEffect(() => {
    loadTruckDetails()
  }, [loadTruckDetails])

  const latestEntry = useMemo(() => trackingHistory[0], [trackingHistory])

  const locationCoords = useMemo(() => {
    const latitude = latestEntry?.latitude ?? truck?.currentLatitude ?? null
    const longitude = latestEntry?.longitude ?? truck?.currentLongitude ?? null
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      return { latitude, longitude }
    }
    return null
  }, [latestEntry, truck])

  const lastUpdate = useMemo(() => {
    if (latestEntry?.timestamp) {
      return new Date(latestEntry.timestamp)
    }
    return truck?.lastGpsUpdate ?? null
  }, [latestEntry, truck])

  const driverDisplay = latestEntry?.driverId ?? truck?.assignedDriverId ?? '—'
  const speedDisplay = latestEntry?.speedKmh ?? null

  const filteredHistory = useMemo(
    () =>
      trackingHistory.filter(
        (entry) => typeof entry.latitude === 'number' && typeof entry.longitude === 'number'
      ),
    [trackingHistory]
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
        <VerticalSidebar activePage="trucks" />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </main>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
        <VerticalSidebar activePage="trucks" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FiAlertCircle className="mx-auto h-16 w-16 text-red-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load truck</h2>
            <p className="text-gray-500 mb-4">{loadError}</p>
            <Link href="/trucks" className="text-blue-600 hover:text-blue-700">
              ← Back to Fleet
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (!truck) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
        <VerticalSidebar activePage="trucks" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FiAlertCircle className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Truck Not Found</h2>
            <p className="text-gray-500 mb-4">This truck does not exist in the system.</p>
            <Link href="/trucks" className="text-blue-600 hover:text-blue-700">
              ← Back to Fleet
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
      <VerticalSidebar activePage="trucks" />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/trucks" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <FiArrowLeft className="h-5 w-5" />
            <span>Back to Fleet</span>
          </Link>
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FiTruck className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{truck.plateNumber || truck.truckId}</h1>
                  <p className="text-gray-500">{truck.type || 'Truck'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" type="button" aria-label="Edit truck">
                  <FiEdit className="h-5 w-5 text-gray-700" />
                </button>
                <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" type="button" aria-label="Truck settings">
                  <FiSettings className="h-5 w-5 text-gray-700" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(truck.status)}`}>
                {formatStatusLabel(truck.status)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Location</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MdLocationOn className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Coordinates</p>
                    <p className="font-mono text-sm text-gray-900">
                      {locationCoords ? `${locationCoords.latitude.toFixed(6)}, ${locationCoords.longitude.toFixed(6)}` : 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FiClock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Update</p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(lastUpdate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FiMapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Speed</p>
                    <p className="text-sm font-medium text-gray-900">{speedDisplay !== null ? `${speedDisplay.toFixed(1)} km/h` : '—'}</p>
                  </div>
                </div>
              </div>
              <Link
                href={`/map?truckId=${encodeURIComponent(truck.truckId)}`}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-center text-white transition-colors hover:bg-blue-700"
              >
                <FiMap className="h-4 w-4" />
                <span>View on Map</span>
              </Link>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <span className="text-lg font-semibold text-blue-600">
                      {typeof driverDisplay === 'string' && driverDisplay.length > 0 ? driverDisplay.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{driverDisplay}</p>
                    <p className="text-sm text-gray-500">Assigned Driver</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Truck Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-semibold text-gray-900">{truck.type || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Model</p>
                  <p className="font-semibold text-gray-900">{truck.model || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Capacity</p>
                  <p className="font-semibold text-gray-900">{truck.capacity || '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Odometer</p>
                    <p className="font-semibold text-gray-900">{truck.odometerKm !== null && truck.odometerKm !== undefined ? `${truck.odometerKm.toLocaleString()} km` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fuel Level</p>
                    <p className="font-semibold text-gray-900">{truck.fuelLevelPercent !== null && truck.fuelLevelPercent !== undefined ? `${truck.fuelLevelPercent.toFixed(1)}%` : '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <FiCheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Maintenance</p>
                  <p className="font-semibold text-gray-900">{formatDate(truck.lastMaintenanceDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                  <FiClock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Next Maintenance</p>
                  <p className="font-semibold text-gray-900">{formatDate(truck.nextMaintenanceDate)}</p>
                </div>
              </div>
            </div>
            {truck.notes && (
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <p className="font-medium">Notes</p>
                <p>{truck.notes}</p>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Locations</h3>
            {filteredHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No tracking history available.</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {filteredHistory.slice(0, 20).map((entry, index) => (
                  <div key={`${entry.timestamp ?? 'unknown'}-${index}`} className="flex items-center gap-3 rounded-lg p-3 hover:bg-gray-50">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <p className="font-mono text-sm text-gray-700">
                        {entry.latitude?.toFixed(4)}, {entry.longitude?.toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown time'} · {entry.source.toUpperCase()}
                      </p>
                    </div>
                    {entry.speedKmh !== null && entry.speedKmh !== undefined && (
                      <div className="text-sm text-gray-600">{entry.speedKmh.toFixed(1)} km/h</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}



