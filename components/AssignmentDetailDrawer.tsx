'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiX,
  FiClock,
  FiMapPin,
  FiTruck,
  FiUser,
  FiCalendar,
  FiCheckCircle,
  FiAlertCircle,
  FiActivity,
  FiMap,
  FiNavigation,
  FiFlag
} from 'react-icons/fi'
import { MdLocationOn, MdFlight } from 'react-icons/md'

interface Assignment {
  id: string
  title: string
  description: string
  truck: string
  driver: string
  destination: string
  startLocation: string
  airport: string
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  dueDate: Date
  startDate?: string
  startTime?: string
  dueDateOnly?: string
  dueTime?: string
  flightCode?: string
  flightOrigin?: string
  flightDestination?: string
  theoreticalHour?: string
  planeType?: string
  gate?: string
}

interface Location {
  id: string
  name: string
  airport: string
  type: string
  latitude: number | null
  longitude: number | null
  description?: string
}

interface AssignmentDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  assignment: Assignment | null
}

export default function AssignmentDetailDrawer({ isOpen, onClose, assignment }: AssignmentDetailDrawerProps) {
  const router = useRouter()
  const [startLocationData, setStartLocationData] = useState<Location | null>(null)
  const [destinationData, setDestinationData] = useState<Location | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [eta, setEta] = useState<string | null>(null)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)

  useEffect(() => {
    if (isOpen && assignment) {
      loadLocationData()
    }
  }, [isOpen, assignment])

  const loadLocationData = async () => {
    if (!assignment) return
    
    try {
      setIsLoadingLocations(true)
      const response = await fetch(`/api/locations?airport=${assignment.airport}`)
      if (response.ok) {
        const locations: Location[] = await response.json()
        
        // Find start location
        const startLoc = locations.find(loc => loc.name === assignment.startLocation)
        setStartLocationData(startLoc || null)
        
        // Find destination
        const destLoc = locations.find(loc => loc.name === assignment.destination)
        setDestinationData(destLoc || null)
        
        // Calculate distance and ETA if both locations have coordinates
        if (startLoc?.latitude && startLoc?.longitude && destLoc?.latitude && destLoc?.longitude) {
          const dist = calculateDistance(
            startLoc.latitude,
            startLoc.longitude,
            destLoc.latitude,
            destLoc.longitude
          )
          setDistance(dist)
          
          // Calculate ETA (assuming average speed of 20 km/h)
          const avgSpeedKmh = 20
          const travelTimeMinutes = (dist / 1000) * (60 / avgSpeedKmh)
          
          // Add travel time to start time
          const startDateTime = new Date(assignment.createdAt)
          const etaDateTime = new Date(startDateTime.getTime() + travelTimeMinutes * 60000)
          
          setEta(etaDateTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }))
        }
      }
    } catch (error) {
      console.error('Error loading location data:', error)
    } finally {
      setIsLoadingLocations(false)
    }
  }

  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c // Distance in meters
  }

  const handleViewOnMap = () => {
    if (!assignment) return
    
    // Navigate to map page with just the assignmentId
    router.push(`/map?assignmentId=${assignment.id}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'in-progress':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="h-5 w-5 text-green-600" />
      case 'in-progress':
        return <FiActivity className="h-5 w-5 text-blue-600" />
      case 'cancelled':
        return <FiAlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <FiClock className="h-5 w-5 text-gray-600" />
    }
  }

  if (!isOpen || !assignment) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-md z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(assignment.status)}
                <h2 className="text-2xl font-bold">{assignment.title}</h2>
              </div>
              <p className="text-blue-100 text-sm">Assignment #{assignment.id.slice(0, 8)}</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>

          {/* Status and Priority Badges */}
          <div className="flex gap-2 mt-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(assignment.status)} bg-white`}>
              {assignment.status.toUpperCase()}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityBadge(assignment.priority)} bg-white`}>
              {assignment.priority.toUpperCase()} PRIORITY
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <button
              onClick={handleViewOnMap}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FiMap className="h-5 w-5" />
              View Route on Map
            </button>
          </div>

          {/* Route Information */}
          <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiNavigation className="h-5 w-5 text-blue-600" />
                Route Details
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Start Location */}
              <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiFlag className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Start Location</p>
                  <p className="text-base font-semibold text-gray-900">{assignment.startLocation}</p>
                  {startLocationData?.description && (
                    <p className="text-xs text-gray-500 mt-1">{startLocationData.description}</p>
                  )}
                  {startLocationData?.latitude && startLocationData?.longitude && (
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      📍 {startLocationData.latitude.toFixed(4)}, {startLocationData.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>

              {/* Distance & ETA */}
              {distance && (
                <div className="flex items-center justify-center gap-6 py-3 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Distance</p>
                    <p className="text-lg font-bold text-blue-600">
                      {distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(2)} km`}
                    </p>
                  </div>
                  {eta && (
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Est. Arrival</p>
                      <p className="text-lg font-bold text-blue-600">{eta}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Destination */}
              <div className="flex items-start gap-3 pt-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <MdLocationOn className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Destination</p>
                  <p className="text-base font-semibold text-gray-900">{assignment.destination}</p>
                  {destinationData?.description && (
                    <p className="text-xs text-gray-500 mt-1">{destinationData.description}</p>
                  )}
                  {destinationData?.latitude && destinationData?.longitude && (
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      📍 {destinationData.latitude.toFixed(4)}, {destinationData.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Flight Information */}
          {assignment.flightCode && (
            <div className="bg-white rounded-xl border-2 border-indigo-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-4 py-3 border-b border-indigo-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MdFlight className="h-5 w-5 text-indigo-600" />
                  Flight Information
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Flight Code</p>
                    <p className="text-base font-semibold text-gray-900">{assignment.flightCode}</p>
                  </div>
                  {assignment.gate && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Gate</p>
                      <p className="text-base font-semibold text-gray-900">{assignment.gate}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {assignment.flightOrigin && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Origin</p>
                      <p className="text-sm text-gray-900">{assignment.flightOrigin}</p>
                    </div>
                  )}
                  {assignment.flightDestination && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Destination</p>
                      <p className="text-sm text-gray-900">{assignment.flightDestination}</p>
                    </div>
                  )}
                </div>
                {assignment.theoreticalHour && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Scheduled Time</p>
                    <p className="text-sm text-gray-900">{assignment.theoreticalHour}</p>
                  </div>
                )}
                {assignment.planeType && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Aircraft Type</p>
                    <p className="text-sm text-gray-900">{assignment.planeType}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignment Details */}
          <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assignment Details</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Truck & Driver */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <FiTruck className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Truck</p>
                    <p className="text-sm font-semibold text-gray-900">{assignment.truck}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FiUser className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Driver</p>
                    <p className="text-sm font-semibold text-gray-900">{assignment.driver}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700">{assignment.description}</p>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <FiCalendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Start Time</p>
                    <p className="text-sm font-medium text-gray-900">
                      {assignment.createdAt.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-600">
                      {assignment.createdAt.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FiClock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Due Time</p>
                    <p className="text-sm font-medium text-gray-900">
                      {assignment.dueDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-600">
                      {assignment.dueDate.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Airport */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Airport</p>
                <p className="text-sm font-semibold text-gray-900">
                  {assignment.airport === 'CDG' ? 'Charles de Gaulle (CDG)' : 'Orly (ORY)'}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-500">
              Created: {assignment.createdAt.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

