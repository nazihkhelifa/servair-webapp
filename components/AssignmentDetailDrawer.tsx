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
  FiFlag,
  FiEdit2,
  FiSave,
  FiXCircle,
  FiArrowRight
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
  onUpdate?: (updatedAssignment: Assignment) => void
  availableTrucks?: any[]
  availableDrivers?: any[]
  availableFlights?: any[]
  startLocations?: any[]
  destinationLocations?: any[]
}

export default function AssignmentDetailDrawer({ 
  isOpen, 
  onClose, 
  assignment,
  onUpdate,
  availableTrucks = [],
  availableDrivers = [],
  availableFlights = [],
  startLocations = [],
  destinationLocations = []
}: AssignmentDetailDrawerProps) {
  const router = useRouter()
  const [startLocationData, setStartLocationData] = useState<Location | null>(null)
  const [destinationData, setDestinationData] = useState<Location | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [eta, setEta] = useState<string | null>(null)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    truck: '',
    driver: '',
    airport: 'CDG' as 'CDG' | 'ORY',
    startLocation: '',
    destination: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending' as 'pending' | 'in-progress' | 'completed' | 'cancelled',
    startDate: '',
    startTime: '',
    dueDate: '',
    dueTime: '',
    flightCode: '',
    flightOrigin: '',
    flightDestination: '',
    theoreticalHour: '',
    planeType: '',
    gate: ''
  })

  useEffect(() => {
    if (isOpen && assignment) {
      loadLocationData()
      // Initialize edit form with assignment data
      const startDate = assignment.startDate || assignment.createdAt.toISOString().split('T')[0]
      const startTime = assignment.startTime || assignment.createdAt.toTimeString().slice(0, 5)
      const dueDate = assignment.dueDateOnly || assignment.dueDate.toISOString().split('T')[0]
      const dueTime = assignment.dueTime || assignment.dueDate.toTimeString().slice(0, 5)
      
      setEditForm({
        title: assignment.title,
        truck: assignment.truck,
        driver: assignment.driver,
        airport: assignment.airport as 'CDG' | 'ORY',
        startLocation: assignment.startLocation,
        destination: assignment.destination,
        description: assignment.description || '',
        priority: assignment.priority,
        status: assignment.status,
        startDate,
        startTime,
        dueDate,
        dueTime,
        flightCode: assignment.flightCode || '',
        flightOrigin: assignment.flightOrigin || '',
        flightDestination: assignment.flightDestination || '',
        theoreticalHour: assignment.theoreticalHour || '',
        planeType: assignment.planeType || '',
        gate: assignment.gate || ''
      })
      setIsEditMode(false)
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

  // Format time only
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const handleViewOnMap = () => {
    if (!assignment) return
    
    // Navigate to map page with just the assignmentId
    router.push(`/map?assignmentId=${assignment.id}`)
  }

  const handleSave = async () => {
    if (!assignment || !onUpdate) return
    
    // Validate required fields
    if (!editForm.title || !editForm.truck || !editForm.destination || !editForm.startDate || !editForm.dueDate) {
      alert('Please fill in all required fields')
      return
    }
    
    setIsSaving(true)
    try {
      // Parse dates and times
      const startDateTime = new Date(`${editForm.startDate}T${editForm.startTime || '09:00'}`)
      const dueDateTime = new Date(`${editForm.dueDate}T${editForm.dueTime || '17:00'}`)
      
      // Prepare update data
      const updateData = {
        id: assignment.id,
        title: editForm.title,
        truck: editForm.truck,
        driver: editForm.driver || 'Unassigned',
        startLocation: editForm.startLocation || 'Base',
        destination: editForm.destination,
        description: editForm.description || 'No description provided',
        priority: editForm.priority,
        status: editForm.status,
        airport: editForm.airport,
        // Combined datetime fields
        createdAt: startDateTime.toISOString(),
        dueDate: dueDateTime.toISOString(),
        // Separate date and time fields
        startDate: editForm.startDate,
        startTime: editForm.startTime || '09:00',
        dueDateOnly: editForm.dueDate,
        dueTime: editForm.dueTime || '17:00',
        // Flight information
        flightCode: editForm.flightCode || null,
        flightOrigin: editForm.flightOrigin || null,
        flightDestination: editForm.flightDestination || null,
        theoreticalHour: editForm.theoreticalHour || null,
        planeType: editForm.planeType || null,
        gate: editForm.gate || null
      }
      
      const response = await fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update assignment')
      }
      
      const result = await response.json()
      
      // Convert to Assignment format and call onUpdate
      const updatedAssignment: Assignment = {
        ...assignment,
        ...updateData,
        createdAt: startDateTime,
        dueDate: dueDateTime,
        flightCode: updateData.flightCode || undefined,
        flightOrigin: updateData.flightOrigin || undefined,
        flightDestination: updateData.flightDestination || undefined,
        theoreticalHour: updateData.theoreticalHour || undefined,
        planeType: updateData.planeType || undefined,
        gate: updateData.gate || undefined
      }
      
      onUpdate(updatedAssignment)
      setIsEditMode(false)
    } catch (error: any) {
      console.error('Error updating assignment:', error)
      alert(`Error updating assignment: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'in-progress':
        return 'bg-gray-100 text-gray-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="h-5 w-5 text-green-600" />
      case 'in-progress':
        return <FiActivity className="h-5 w-5 text-gray-900" />
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
        className="fixed inset-0 bg-black/20 backdrop-blur-md z-40 transition-all duration-300 ease-out"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white z-50 overflow-y-auto transform transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              {/* Truck Image */}
              <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-white rounded-xl overflow-hidden border border-gray-200">
                <img 
                  src="/truck.png" 
                  alt="Truck" 
                  className="w-full h-full object-contain p-2"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-1 truncate">
                  {assignment.destination || assignment.title}
                  {assignment.flightCode && ` • ${assignment.flightCode}`}
                </h2>
                <p className="text-xs text-gray-500">Assignment #{assignment.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="p-2.5 hover:bg-gray-100/80 active:bg-gray-200/80 rounded-xl apple-transition text-gray-500 hover:text-black active:scale-95"
                  title="Edit assignment"
                >
                  <FiEdit2 className="h-5 w-5" />
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-2.5 hover:bg-gray-100/80 active:bg-gray-200/80 rounded-xl apple-transition text-black hover:text-gray-900 active:scale-95 disabled:opacity-50"
                    title="Save changes"
                  >
                    <FiSave className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setIsEditMode(false)}
                    disabled={isSaving}
                    className="p-2.5 hover:bg-gray-100/80 active:bg-gray-200/80 rounded-xl apple-transition text-gray-500 hover:text-gray-900 active:scale-95 disabled:opacity-50"
                    title="Cancel editing"
                  >
                    <FiXCircle className="h-5 w-5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-gray-100/80 active:bg-gray-200/80 rounded-xl apple-transition text-gray-500 hover:text-gray-900 active:scale-95"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Status and Priority Badges */}
          {!isEditMode ? (
            <div className="flex gap-2.5">
              <span className={`px-4 py-2 rounded-2xl text-xs font-semibold tracking-wide ${getStatusBadge(assignment.status)} shadow-sm`}>
                {assignment.status.toUpperCase()}
              </span>
              <span className={`px-4 py-2 rounded-2xl text-xs font-semibold tracking-wide ${getPriorityBadge(assignment.priority)} shadow-sm`}>
                {assignment.priority.toUpperCase()} PRIORITY
              </span>
            </div>
          ) : (
            <div className="flex gap-2.5">
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({...editForm, status: e.target.value as any})}
                className="px-4 py-2 rounded-2xl text-xs font-semibold tracking-wide border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="pending">PENDING</option>
                <option value="in-progress">IN PROGRESS</option>
                <option value="completed">COMPLETED</option>
                <option value="cancelled">CANCELLED</option>
              </select>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm({...editForm, priority: e.target.value as any})}
                className="px-4 py-2 rounded-2xl text-xs font-semibold tracking-wide border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="low">LOW PRIORITY</option>
                <option value="medium">MEDIUM PRIORITY</option>
                <option value="high">HIGH PRIORITY</option>
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isEditMode ? (
            /* Edit Form */
            <div className="space-y-5">
              {/* Basic Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Truck *</label>
                      <select
                        value={editForm.truck}
                        onChange={(e) => setEditForm({...editForm, truck: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      >
                        <option value="">Select truck</option>
                        {availableTrucks.map((truck) => (
                          <option key={truck.truckId || truck.id} value={truck.truckId || truck.id}>
                            {truck.truckId || truck.name || truck.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Driver</label>
                      <select
                        value={editForm.driver}
                        onChange={(e) => setEditForm({...editForm, driver: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="">Unassigned</option>
                        {availableDrivers.map((driver) => (
                          <option key={driver.driverId || driver.id} value={driver.driverId || driver.fullName || driver.id}>
                            {driver.fullName || driver.name || driver.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Airport</label>
                    <select
                      value={editForm.airport}
                      onChange={(e) => setEditForm({...editForm, airport: e.target.value as 'CDG' | 'ORY'})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="CDG">CDG - Charles de Gaulle</option>
                      <option value="ORY">ORY - Orly</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Route Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <FiNavigation className="h-5 w-5" />
                    Route Details
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Location</label>
                    <select
                      value={editForm.startLocation}
                      onChange={(e) => setEditForm({...editForm, startLocation: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="">Select location</option>
                      {startLocations.map((loc) => (
                        <option key={loc.id || loc.locationId} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destination *</label>
                    <select
                      value={editForm.destination}
                      onChange={(e) => setEditForm({...editForm, destination: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    >
                      <option value="">Select destination</option>
                      {destinationLocations.map((loc) => (
                        <option key={loc.id || loc.locationId} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Time Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <FiCalendar className="h-5 w-5" />
                    Schedule
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                      <input
                        type="date"
                        value={editForm.startDate}
                        onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={editForm.startTime}
                        onChange={(e) => setEditForm({...editForm, startTime: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                      <input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) => setEditForm({...editForm, dueDate: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Due Time</label>
                      <input
                        type="time"
                        value={editForm.dueTime}
                        onChange={(e) => setEditForm({...editForm, dueTime: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Flight Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <MdFlight className="h-5 w-5" />
                    Flight Information (Optional)
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Flight Code</label>
                      <input
                        type="text"
                        value={editForm.flightCode}
                        onChange={(e) => setEditForm({...editForm, flightCode: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gate</label>
                      <input
                        type="text"
                        value={editForm.gate}
                        onChange={(e) => setEditForm({...editForm, gate: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Origin</label>
                      <input
                        type="text"
                        value={editForm.flightOrigin}
                        onChange={(e) => setEditForm({...editForm, flightOrigin: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                      <input
                        type="text"
                        value={editForm.flightDestination}
                        onChange={(e) => setEditForm({...editForm, flightDestination: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Time</label>
                      <input
                        type="text"
                        value={editForm.theoreticalHour}
                        onChange={(e) => setEditForm({...editForm, theoreticalHour: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="HH:MM"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Aircraft Type</label>
                      <input
                        type="text"
                        value={editForm.planeType}
                        onChange={(e) => setEditForm({...editForm, planeType: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FiSave className="h-5 w-5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsEditMode(false)}
                  disabled={isSaving}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* View Mode - Original Content */
            <>
          {/* Route Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FiNavigation className="h-5 w-5 text-gray-700" />
                Route Details
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Start and Destination Route - Horizontal Layout */}
              <div className="py-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Start Location */}
                  <div className="flex items-center gap-2">
                    <img 
                      src="/source-marker-icon.png" 
                      alt="Start" 
                      className="w-4 h-4 object-contain flex-shrink-0"
                    />
                    <span className="text-sm text-gray-900 font-medium">
                      {assignment.startLocation || 'Base'}
                    </span>
                    <span className="text-xs text-gray-600">
                      {assignment.startTime || formatTime(assignment.createdAt)}
                    </span>
                    {startLocationData?.description && (
                      <span className="text-xs text-gray-500">({startLocationData.description})</span>
                    )}
                  </div>
                  
                  {/* Line Separator */}
                  <div className="flex-shrink-0 w-8 h-0.5 bg-gray-300"></div>
                  
                  {/* Destination */}
                  <div className="flex items-center gap-2">
                    <img 
                      src="/destination-marker-icon.png" 
                      alt="Destination" 
                      className="w-4 h-4 object-contain flex-shrink-0"
                    />
                    <span className="text-sm text-gray-900 font-medium">
                      {assignment.destination}
                    </span>
                    <span className="text-xs text-gray-600">
                      {assignment.dueTime || formatTime(assignment.dueDate)}
                    </span>
                    {destinationData?.description && (
                      <span className="text-xs text-gray-500">({destinationData.description})</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Distance & ETA */}
              {distance && (
                <div className="flex items-center justify-center gap-8 py-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-500 mb-1">Distance</p>
                    <p className="text-lg font-bold text-gray-900">
                      {distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(2)} km`}
                    </p>
                  </div>
                  {eta && (
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 mb-1">Est. Arrival</p>
                      <p className="text-lg font-bold text-gray-900">{eta}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Action */}
              <button
                onClick={handleViewOnMap}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium bg-black hover:bg-gray-900 active:scale-[0.98] text-white transition-all"
              >
                <FiMap className="h-4 w-4" />
                View Route on Map
              </button>
            </div>
          </div>

          {/* Flight Information */}
          {assignment.flightCode && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <MdFlight className="h-5 w-5 text-gray-700" />
                  Flight Information
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Flight Code</p>
                    <p className="text-base font-medium text-gray-900">{assignment.flightCode}</p>
                  </div>
                  {assignment.gate && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Gate</p>
                      <p className="text-base font-medium text-gray-900">{assignment.gate}</p>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-base font-semibold text-gray-900">Assignment Details</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Truck & Driver */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <FiTruck className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Truck</p>
                    <p className="text-sm font-medium text-gray-900">{assignment.truck}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FiUser className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Driver</p>
                    <p className="text-sm font-medium text-gray-900">{assignment.driver}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700">{assignment.description}</p>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <FiCalendar className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Start Time</p>
                    <p className="text-sm font-medium text-gray-900">
                      {assignment.createdAt.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {assignment.createdAt.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FiClock className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Due Time</p>
                    <p className="text-sm font-medium text-gray-900">
                      {assignment.dueDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {assignment.dueDate.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Airport */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Airport</p>
                <p className="text-sm font-medium text-gray-900">
                  {assignment.airport === 'CDG' ? 'Charles de Gaulle (CDG)' : 'Orly (ORY)'}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500">
              Created: {assignment.createdAt.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

