'use client'

import { useState, useEffect } from 'react'
import DetailDrawer from './DetailDrawer'
import {
  FiTruck,
  FiUser,
  FiMapPin,
  FiClock,
  FiWifi,
  FiTool,
  FiList,
  FiCalendar,
  FiActivity
} from 'react-icons/fi'
import { MdLocationOn, MdAirplanemodeActive } from 'react-icons/md'
import type { TruckRecord } from '../lib/trucksCosmos'

interface TruckDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  truck: TruckRecord | null
}

interface Assignment {
  id: string
  title: string
  flightCode: string | null
  driver: string
  status: string
  priority: string
  createdAt: string
  dueDate: string
  destination: string
}

interface TrackingData {
  latitude: number
  longitude: number
  timestamp: number
  speedKmh?: number
  driverId?: string
}

export default function TruckDetailDrawer({ isOpen, onClose, truck }: TruckDetailDrawerProps) {
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null)
  const [assignmentHistory, setAssignmentHistory] = useState<Assignment[]>([])
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && truck) {
      loadTruckDetails()
    }
  }, [isOpen, truck])

  const loadTruckDetails = async () => {
    if (!truck) return
    
    setLoading(true)
    try {
      // Load assignments for this truck
      const assignmentsResponse = await fetch('/api/assignments')
      if (assignmentsResponse.ok) {
        const allAssignments = await assignmentsResponse.json()
        
        // Filter assignments for this truck
        const truckAssignments = allAssignments.filter((a: any) => a.truck === truck.truckId)
        
        // Find current assignment (in-progress or pending)
        const current = truckAssignments.find((a: any) => 
          a.status === 'in-progress' || a.status === 'pending'
        )
        setCurrentAssignment(current || null)
        
        // Get completed assignments (history)
        const history = truckAssignments
          .filter((a: any) => a.status === 'completed')
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5) // Last 5 completed
        setAssignmentHistory(history)
      }

      // Load latest tracking data
      const trackingResponse = await fetch(`/api/tracking?truckId=${truck.truckId}`)
      if (trackingResponse.ok) {
        const trackingData = await trackingResponse.json()
        if (trackingData && trackingData.length > 0) {
          const latest = trackingData[0]
          setTrackingData({
            latitude: latest.latitude,
            longitude: latest.longitude,
            timestamp: latest.timestamp,
            speedKmh: latest.speedKmh,
            driverId: latest.driverId
          })
        }
      }
    } catch (error) {
      console.error('Error loading truck details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!truck) return null

  const getStatusColor = (status: string) => {
    const normalized = status.toLowerCase()
    if (normalized.includes('available')) return 'bg-green-100 text-green-700'
    if (normalized.includes('use') || normalized.includes('active')) return 'bg-blue-100 text-blue-700'
    if (normalized.includes('maintenance')) return 'bg-yellow-100 text-yellow-700'
    if (normalized.includes('offline')) return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  const getAssignmentStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'in-progress': return 'bg-blue-100 text-blue-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      case 'pending': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Truck ${truck.truckId}`}
      width="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Basic Info */}
          <div className="glass-card rounded-3xl apple-shadow overflow-hidden apple-hover">
            <div className="px-6 py-5 border-b border-gray-100/50 bg-white/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gray-100/80 rounded-xl">
                  <FiTruck className="h-5 w-5 text-gray-700" />
                </div>
                Basic Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Plate Number</p>
                  <p className="text-sm font-medium text-gray-900">{truck.plateNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Type</p>
                  <p className="text-sm font-medium text-gray-900">{truck.type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Model</p>
                  <p className="text-sm font-medium text-gray-900">{truck.model || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Capacity</p>
                  <p className="text-sm font-medium text-gray-900">{truck.capacity || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(truck.status)}`}>
                    {truck.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Assigned Driver</p>
                  <p className="text-sm font-medium text-gray-900">{truck.assignedDriverId || 'None'}</p>
                </div>
              </div>
              {truck.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{truck.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Current Assignment */}
          <div className="glass-card rounded-3xl apple-shadow overflow-hidden apple-hover">
            <div className="px-6 py-5 border-b border-gray-100/50 bg-white/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gray-100/80 rounded-xl">
                  <MdAirplanemodeActive className="h-5 w-5 text-gray-700" />
                </div>
                Current Assignment
              </h3>
            </div>
            <div className="p-6">
              {currentAssignment ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{currentAssignment.title}</h4>
                      {currentAssignment.flightCode && (
                        <p className="text-xs text-gray-600 font-medium mt-1">Flight: {currentAssignment.flightCode}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getAssignmentStatusColor(currentAssignment.status)}`}>
                      {currentAssignment.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Driver</p>
                      <p className="font-medium text-gray-900">{currentAssignment.driver}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Destination</p>
                      <p className="font-medium text-gray-900">{currentAssignment.destination}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Started</p>
                      <p className="font-medium text-gray-900 text-xs">{formatDate(currentAssignment.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Due</p>
                      <p className="font-medium text-gray-900 text-xs">{formatDate(currentAssignment.dueDate)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FiClock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No active assignment</p>
                  <p className="text-xs text-gray-400 mt-1">Truck is available for new tasks</p>
                </div>
              )}
            </div>
          </div>

          {/* Live Location */}
          <div className="glass-card rounded-3xl apple-shadow overflow-hidden apple-hover">
            <div className="px-6 py-5 border-b border-gray-100/50 bg-white/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gray-100/80 rounded-xl">
                  <FiMapPin className="h-5 w-5 text-gray-700" />
                </div>
                Live GPS Location
              </h3>
            </div>
            <div className="p-6">
              {trackingData ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <FiWifi className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Last Position</p>
                      <p className="font-mono text-sm text-gray-900">
                        {trackingData.latitude.toFixed(6)}, {trackingData.longitude.toFixed(6)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Updated {formatTimestamp(trackingData.timestamp)}
                      </p>
                    </div>
                  </div>
                  {trackingData.speedKmh !== undefined && trackingData.speedKmh !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiActivity className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500">Speed:</span>
                      <span className="font-medium text-gray-900">{trackingData.speedKmh.toFixed(1)} km/h</span>
                    </div>
                  )}
                  {trackingData.driverId && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiUser className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500">Driver ID:</span>
                      <span className="font-medium text-gray-900">{trackingData.driverId}</span>
                    </div>
                  )}
                  <a
                    href={`https://www.google.com/maps?q=${trackingData.latitude},${trackingData.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-5 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 active:scale-[0.98] apple-transition text-sm font-semibold shadow-lg hover:shadow-xl"
                  >
                    <MdLocationOn className="h-4 w-4" />
                    View on Google Maps
                  </a>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FiMapPin className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No location data available</p>
                  <p className="text-xs text-gray-400 mt-1">Truck hasn't reported position yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Maintenance Info */}
          <div className="glass-card rounded-3xl apple-shadow overflow-hidden apple-hover">
            <div className="px-6 py-5 border-b border-gray-100/50 bg-white/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gray-100/80 rounded-xl">
                  <FiTool className="h-5 w-5 text-gray-700" />
                </div>
                Maintenance Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Last Maintenance</p>
                  <p className="text-sm font-medium text-gray-900">
                    {truck.lastMaintenanceDate 
                      ? new Date(truck.lastMaintenanceDate).toLocaleDateString()
                      : 'Not recorded'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Next Maintenance</p>
                  <p className="text-sm font-medium text-gray-900">
                    {truck.nextMaintenanceDate 
                      ? new Date(truck.nextMaintenanceDate).toLocaleDateString()
                      : 'Not scheduled'}
                  </p>
                </div>
              </div>
              {truck.nextMaintenanceDate && new Date(truck.nextMaintenanceDate) < new Date() && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">⚠️ Maintenance overdue!</p>
                </div>
              )}
            </div>
          </div>

          {/* Assignment History */}
          <div className="glass-card rounded-3xl apple-shadow overflow-hidden apple-hover">
            <div className="px-6 py-5 border-b border-gray-100/50 bg-white/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gray-100/80 rounded-xl">
                  <FiList className="h-5 w-5 text-gray-700" />
                </div>
                Recent Assignment History
              </h3>
            </div>
            <div className="p-6">
              {assignmentHistory.length > 0 ? (
                <div className="space-y-3">
                  {assignmentHistory.map((assignment) => (
                    <div key={assignment.id} className="p-4 bg-gradient-to-br from-gray-50/80 to-white rounded-2xl border border-gray-200/50 shadow-sm apple-hover">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{assignment.title}</h4>
                          {assignment.flightCode && (
                            <p className="text-xs text-gray-500 mt-1">Flight: {assignment.flightCode}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getAssignmentStatusColor(assignment.status)}`}>
                          {assignment.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiUser className="h-3 w-3" />
                          {assignment.driver}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiCalendar className="h-3 w-3" />
                          {formatDate(assignment.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FiList className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No assignment history</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DetailDrawer>
  )
}

