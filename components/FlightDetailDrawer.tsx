'use client'

import { useEffect, useState } from 'react'
import {
  FiX,
  FiClock,
  FiMapPin,
  FiTruck,
  FiUser,
  FiCalendar,
  FiCheckCircle,
  FiAlertCircle,
  FiActivity
} from 'react-icons/fi'
import { MdFlight, MdFlightTakeoff, MdFlightLand } from 'react-icons/md'

interface Flight {
  id?: string
  flightCode: string
  flightOrigin: string | null
  flightDestination: string | null
  theoreticalHour: string
  theoreticalDateTime: string
  planeType: string | null
  gate: string | null
  terminal: string | null
  status: string
  flightType: string
  airline: string | null
  passengerCount: number | null
  cargoWeight: number | null
  notes: string
  createdAt?: string
  updatedAt?: string
}

interface Assignment {
  id: string
  title: string
  truck: string
  driver: string
  flightCode?: string
  status: string
  createdAt: string
  dueDate: string
}

interface FlightDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  flight: Flight | null
}

export default function FlightDetailDrawer({ isOpen, onClose, flight }: FlightDetailDrawerProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)

  useEffect(() => {
    if (isOpen && flight) {
      loadAssignments()
    }
  }, [isOpen, flight])

  const loadAssignments = async () => {
    if (!flight) return
    
    try {
      setIsLoadingAssignments(true)
      const response = await fetch('/api/assignments')
      if (response.ok) {
        const allAssignments = await response.json()
        // Filter assignments for this flight
        const flightAssignments = allAssignments
          .filter((a: any) => a.flightCode === flight.flightCode)
          .map((a: any) => ({
            id: a.id,
            title: a.title,
            truck: a.truck,
            driver: a.driver,
            flightCode: a.flightCode,
            status: a.status,
            createdAt: a.createdAt,
            dueDate: a.dueDate
          }))
          .sort((a: Assignment, b: Assignment) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        setAssignments(flightAssignments)
      }
    } catch (error) {
      console.error('Failed to load assignments:', error)
    } finally {
      setIsLoadingAssignments(false)
    }
  }

  if (!isOpen || !flight) return null

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    landed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
    delayed: 'bg-yellow-100 text-yellow-700'
  }

  const getStatusIcon = (status: string) => {
    const normalized = status.toLowerCase()
    switch (normalized) {
      case 'scheduled':
        return <FiClock className="h-5 w-5 text-blue-600" />
      case 'active':
        return <FiActivity className="h-5 w-5 text-green-600" />
      case 'landed':
        return <FiCheckCircle className="h-5 w-5 text-gray-600" />
      case 'cancelled':
        return <FiAlertCircle className="h-5 w-5 text-red-600" />
      case 'delayed':
        return <FiAlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <MdFlight className="h-5 w-5 text-gray-600" />
    }
  }

  const completedServices = assignments.filter(a => a.status === 'completed').length
  const totalServices = assignments.length
  const progressPercentage = totalServices > 0 ? (completedServices / totalServices) * 100 : 0

  // Get unique trucks and drivers
  const uniqueTrucks = [...new Set(assignments.map(a => a.truck))]
  const uniqueDrivers = [...new Set(assignments.map(a => a.driver))]

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-md z-40 transition-all duration-300 ease-out"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[700px] bg-gradient-to-b from-white via-white to-[#F9FAFB] apple-shadow-lg z-50 overflow-y-auto transform transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
        {/* Header */}
        <div className="sticky top-0 z-10 glass-effect border-b border-gray-200/50 px-8 py-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200/50 rounded-2xl flex items-center justify-center shadow-sm">
                <MdFlight className="h-7 w-7 text-gray-700" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">{flight.flightCode}</h2>
                <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                  <MdFlightTakeoff className="h-4 w-4" />
                  {flight.flightOrigin || 'Unknown'} 
                  <span className="mx-1">→</span> 
                  <MdFlightLand className="h-4 w-4" />
                  {flight.flightDestination || 'Unknown'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100/80 active:bg-gray-200/80 rounded-xl apple-transition text-gray-500 hover:text-gray-900 active:scale-95"
              aria-label="Close drawer"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className={`px-4 py-2 rounded-2xl ${statusColors[flight.status.toLowerCase()] || 'bg-gray-100 text-gray-700'} flex items-center gap-2 shadow-sm`}>
              {getStatusIcon(flight.status)}
              <span className="font-semibold text-sm capitalize">{flight.status}</span>
            </div>
            {flight.gate && (
              <div className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-700 flex items-center gap-2 shadow-sm">
                <FiMapPin className="h-4 w-4" />
                <span className="text-sm font-semibold">Gate {flight.gate}</span>
              </div>
            )}
            {flight.airline && (
              <div className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-700 flex items-center gap-2 shadow-sm">
                <MdFlight className="h-4 w-4" />
                <span className="text-sm font-semibold">{flight.airline}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-5">
          {/* Flight Information */}
          <div className="glass-card rounded-3xl apple-shadow overflow-hidden apple-hover">
            <div className="px-6 py-5 border-b border-gray-100/50 bg-white/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gray-100/80 rounded-xl">
                  <MdFlight className="h-5 w-5 text-gray-700" />
                </div>
                Flight Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Flight Type</p>
                  <p className="font-medium text-sm text-gray-900 capitalize">{flight.flightType}</p>
                </div>
                {flight.planeType && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Aircraft Type</p>
                    <p className="font-medium text-sm text-gray-900">{flight.planeType}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Scheduled Time</p>
                  <p className="font-medium text-sm text-gray-900">{flight.theoreticalHour}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Date</p>
                  <p className="font-medium text-sm text-gray-900">
                    {new Date(flight.theoreticalDateTime).toLocaleDateString()}
                  </p>
                </div>
                {flight.terminal && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Terminal</p>
                    <p className="font-medium text-sm text-gray-900">{flight.terminal}</p>
                  </div>
                )}
                {flight.passengerCount && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Passengers</p>
                    <p className="font-medium text-sm text-gray-900">{flight.passengerCount}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Service Timeline Progress */}
          <div className="glass-card rounded-3xl apple-shadow overflow-hidden apple-hover">
            <div className="px-6 py-5 border-b border-gray-100/50 bg-white/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gray-100/80 rounded-xl">
                  <FiActivity className="h-5 w-5 text-gray-700" />
                </div>
                Service Progress
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-600">Services Completed</span>
                  <span className="font-bold text-gray-900 text-base">{completedServices} / {totalServices}</span>
                </div>
                <div className="w-full bg-gray-200/80 rounded-full h-3 overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-gray-700 to-gray-800 h-full transition-all duration-700 ease-out rounded-full shadow-sm"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs font-medium text-gray-500">
                  {progressPercentage === 100 ? '✓ All services completed' : `${Math.round(progressPercentage)}% complete`}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Trucks & Drivers */}
          <div className="glass-card rounded-3xl apple-shadow overflow-hidden apple-hover">
            <div className="px-6 py-5 border-b border-gray-100/50 bg-white/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gray-100/80 rounded-xl">
                  <FiTruck className="h-5 w-5 text-gray-700" />
                </div>
                Assigned Resources
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-gray-50/80 to-gray-100/50 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <FiTruck className="h-5 w-5 text-gray-600" />
                    <p className="font-medium text-sm text-gray-900">Trucks</p>
                  </div>
                  {uniqueTrucks.length > 0 ? (
                    <div className="space-y-1">
                      {uniqueTrucks.map((truck, index) => (
                        <p key={index} className="text-sm text-gray-700 font-medium">{truck}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No trucks assigned</p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-gray-50/80 to-gray-100/50 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FiUser className="h-5 w-5 text-gray-600" />
                    <p className="font-semibold text-sm text-gray-900">Drivers</p>
                  </div>
                  {uniqueDrivers.length > 0 ? (
                    <div className="space-y-1">
                      {uniqueDrivers.map((driver, index) => (
                        <p key={index} className="text-sm text-gray-700 font-medium">{driver}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No drivers assigned</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Service Timeline */}
          <div className="glass-card rounded-3xl apple-shadow overflow-hidden apple-hover">
            <div className="px-6 py-5 border-b border-gray-100/50 bg-white/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gray-100/80 rounded-xl">
                  <FiCalendar className="h-5 w-5 text-gray-700" />
                </div>
                Service Timeline
              </h3>
            </div>
            <div className="p-6">
              {isLoadingAssignments ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto" />
                  <p className="text-gray-500 mt-2 text-sm">Loading services...</p>
                </div>
              ) : assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments.map((assignment, index) => (
                  <div
                    key={assignment.id}
                    className="relative pl-8 pb-4 border-l-2 border-gray-200 last:border-l-0 last:pb-0"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-0 top-0 w-4 h-4 rounded-full -translate-x-[9px] ${
                      assignment.status === 'completed' 
                        ? 'bg-green-500' 
                        : assignment.status === 'in-progress'
                        ? 'bg-blue-500 animate-pulse'
                        : assignment.status === 'cancelled'
                        ? 'bg-red-500'
                        : 'bg-gray-300'
                    }`} />
                    
                    <div className="bg-gradient-to-br from-gray-50/80 to-white rounded-2xl p-5 shadow-sm apple-hover border border-gray-100/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{assignment.title}</h4>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <FiTruck className="h-3 w-3" />
                              <span>{assignment.truck}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FiUser className="h-3 w-3" />
                              <span>{assignment.driver}</span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            assignment.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : assignment.status === 'in-progress'
                              ? 'bg-blue-100 text-blue-700'
                              : assignment.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {assignment.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <FiClock className="h-3 w-3" />
                          <span>Start: {new Date(assignment.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FiCheckCircle className="h-3 w-3" />
                          <span>Due: {new Date(assignment.dueDate).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiCalendar className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>No services scheduled for this flight</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {flight.notes && (
            <div className="glass-card rounded-3xl apple-shadow overflow-hidden apple-hover">
              <div className="px-6 py-5 border-b border-gray-100/50 bg-white/50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-gray-100/80 rounded-xl">
                    <FiCalendar className="h-5 w-5 text-gray-700" />
                  </div>
                  Notes
                </h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{flight.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

