'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FiUsers,
  FiMapPin,
  FiActivity,
  FiClock,
  FiTruck,
  FiUser,
  FiMap,
  FiAlertTriangle
} from 'react-icons/fi'
import Link from 'next/link'
import VerticalSidebar from '../components/VerticalSidebar'

interface TrackingSummary {
  id: string
  name: string
  latitude: number
  longitude: number
  speedKmh: number | null
  timestamp: number
}

interface DriverSummary {
  driverId: string
  fullName: string
  currentStatus: string
  assignedTruckId?: string | null
}

interface TruckSummary {
  truckId: string
  plateNumber: string
  status: string
  assignedDriverId?: string | null
}

const formatNumber = (value: number, minimumFractionDigits = 0, maximumFractionDigits = 1) =>
  value.toLocaleString(undefined, { minimumFractionDigits, maximumFractionDigits })

const formatTime = (value: number | Date) => {
  const date = typeof value === 'number' ? new Date(value) : value
  return date.toLocaleTimeString()
}

const normalizeStatus = (status: string | undefined | null) => status?.toLowerCase() ?? 'unknown'

export default function Dashboard() {
  const [tracking, setTracking] = useState<TrackingSummary[]>([])
  const [drivers, setDrivers] = useState<DriverSummary[]>([])
  const [trucks, setTrucks] = useState<TruckSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)

        const [trackingResponse, driversResponse, trucksResponse] = await Promise.all([
          fetch('/api/tracking?type=latest'),
          fetch('/api/drivers'),
          fetch('/api/trucks?expand=driver')
        ])

        if (!trackingResponse.ok) throw new Error('Failed to load tracking data')
        if (!driversResponse.ok) throw new Error('Failed to load drivers data')
        if (!trucksResponse.ok) throw new Error('Failed to load trucks data')

        const trackingJson = await trackingResponse.json()
        const driversJson = await driversResponse.json()
        const trucksJson = await trucksResponse.json()

        const trackingSummaries: TrackingSummary[] = trackingJson
          .filter((item: any) => typeof item.latitude === 'number' && typeof item.longitude === 'number')
          .map((item: any) => ({
            id: item.driverId || item.truckId || item.trackingId,
            name: item.driverId || item.truckId || 'Unknown',
            latitude: item.latitude,
            longitude: item.longitude,
            speedKmh: typeof item.speedKmh === 'number' ? item.speedKmh : null,
            timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now()
          }))

        const driverSummaries: DriverSummary[] = driversJson.map((driver: any) => ({
          driverId: driver.driverId,
          fullName: driver.fullName,
          currentStatus: driver.currentStatus,
          assignedTruckId: driver.assignedTruckId ?? null
        }))

        const truckSummaries: TruckSummary[] = trucksJson.map((truck: any) => ({
          truckId: truck.truckId,
          plateNumber: truck.plateNumber,
          status: truck.status,
          assignedDriverId: truck.assignedDriverId ?? null
        }))

        setTracking(trackingSummaries)
        setDrivers(driverSummaries)
        setTrucks(truckSummaries)
      } catch (error: any) {
        console.error('Dashboard load error:', error)
        setLoadError(error?.message || 'Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 10_000)
    return () => clearInterval(interval)
  }, [])

  const activeDriversCount = useMemo(() => drivers.filter((driver) => driver.currentStatus === 'Active').length, [drivers])
  const availableTrucksCount = useMemo(() => trucks.filter((truck) => truck.status === 'Available').length, [trucks])
  const inUseTrucksCount = useMemo(() => trucks.filter((truck) => truck.status === 'In Use').length, [trucks])
  const maintenanceTrucksCount = useMemo(() => trucks.filter((truck) => normalizeStatus(truck.status) === 'in maintenance').length, [trucks])

  const latestUpdate = useMemo(() => (
    tracking.length > 0 ? new Date(Math.max(...tracking.map((entry) => entry.timestamp))) : null
  ), [tracking])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading fleet data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
      <VerticalSidebar activePage="home" />
      <main className="flex-1 flex justify-center p-4">
        <div className="w-full max-w-6xl">
          <div className="bg-white rounded-2xl shadow-sm" style={{ minHeight: 'calc(100vh - 2rem)' }}>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Servair Fleet Overview</h1>
                  <p className="text-sm text-gray-500 mt-1">Real-time insights for drivers, trucks, and live tracking</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Last updated</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {latestUpdate ? formatTime(latestUpdate) : 'Never'}
                  </p>
                  <div className="flex items-center justify-end mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                    <span className="text-xs text-green-600 font-medium">Live</span>
                  </div>
                </div>
              </div>
              {loadError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {loadError}
                </div>
              )}
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <DashboardCard
                icon={<FiUsers className="h-6 w-6 text-blue-600" />}
                title="Drivers"
                value={drivers.length}
                subtitle={`${activeDriversCount} active`}
                href="/drivers"
              />
              <DashboardCard
                icon={<FiTruck className="h-6 w-6 text-green-600" />}
                title="Trucks"
                value={trucks.length}
                subtitle={`${availableTrucksCount} available, ${inUseTrucksCount} in use`}
                href="/trucks"
              />
              <DashboardCard
                icon={<FiMapPin className="h-6 w-6 text-purple-600" />}
                title="Live Tracking"
                value={tracking.length}
                subtitle="Active devices"
                href="/map"
              />
              <DashboardCard
                icon={<FiAlertTriangle className="h-6 w-6 text-yellow-600" />}
                title="Maintenance"
                value={maintenanceTrucksCount}
                subtitle="Trucks requiring attention"
                href="/trucks"
              />
            </div>

            <div className="px-6 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Latest Tracking</h2>
                  <Link href="/map" className="text-sm text-blue-600 hover:text-blue-700">View Map →</Link>
                </div>
                {tracking.length === 0 ? (
                  <EmptyState message="No live tracking data yet." />
                ) : (
                  <div className="divide-y divide-gray-100">
                    {tracking.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{entry.name}</p>
                          <p className="text-xs text-gray-500 font-mono">
                            {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{formatTime(entry.timestamp)}</p>
                          <p className="text-xs text-gray-500">
                            {entry.speedKmh !== null ? `${entry.speedKmh.toFixed(1)} km/h` : '—'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Driver Status</h2>
                  <Link href="/drivers" className="text-sm text-blue-600 hover:text-blue-700">Manage Drivers →</Link>
                </div>
                {drivers.length === 0 ? (
                  <EmptyState message="No drivers registered yet." />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {['Active', 'Idle', 'On Break', 'Offline'].map((status) => {
                      const count = drivers.filter((driver) => driver.currentStatus === status).length
                      return (
                        <div key={status} className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500">{status}</p>
                          <p className="text-lg font-semibold text-gray-900">{count}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="bg-white border border-gray-200 rounded-xl shadow-inner">
                <div className="flex items-center justify-between p-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Fleet Assignments</h2>
                    <p className="text-sm text-gray-500">Drivers and trucks currently paired</p>
                  </div>
                  <Link href="/trucks" className="text-sm text-blue-600 hover:text-blue-700">Manage Fleet →</Link>
                </div>
                <div className="px-6 pb-6">
                  {drivers.length === 0 || trucks.length === 0 ? (
                    <EmptyState message="No assignments available." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Driver</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Truck</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {drivers.slice(0, 10).map((driver) => {
                            const truck = trucks.find((item) => item.truckId === driver.assignedTruckId)
                            return (
                              <tr key={driver.driverId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-900">{driver.fullName}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(driver.currentStatus)}`}>
                                    {driver.currentStatus}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">{truck ? truck.plateNumber : '—'}</td>
                                <td className="px-4 py-3 text-right text-sm">
                                  <Link href={`/drivers?driverId=${driver.driverId}`} className="text-blue-600 hover:text-blue-700">
                                    Manage
                                  </Link>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const getStatusBadge = (status?: string | null) => {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-700'
    case 'Idle':
      return 'bg-yellow-100 text-yellow-700'
    case 'On Break':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

const DashboardCard = ({
  icon,
  title,
  value,
  subtitle,
  href
}: {
  icon: React.ReactNode
  title: string
  value: number
  subtitle: string
  href: string
}) => (
  <Link
    href={href}
    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex items-center gap-4"
  >
    <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  </Link>
)

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
    {message}
  </div>
)
