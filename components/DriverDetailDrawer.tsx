'use client'

import { useEffect, useState } from 'react'
import {
  FiX,
  FiUser,
  FiPhone,
  FiMail,
  FiFileText,
  FiTruck,
  FiMapPin,
  FiClock,
  FiBattery,
  FiActivity,
  FiCalendar,
  FiAward,
  FiAlertCircle
} from 'react-icons/fi'
import { MdFlight } from 'react-icons/md'

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

interface DriverDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  driver: DriverRecord | null
}

export default function DriverDetailDrawer({ isOpen, onClose, driver }: DriverDetailDrawerProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)

  useEffect(() => {
    if (isOpen && driver) {
      loadAssignments()
    }
  }, [isOpen, driver])

  const loadAssignments = async () => {
    if (!driver) return
    
    try {
      setIsLoadingAssignments(true)
      const response = await fetch('/api/assignments')
      if (response.ok) {
        const allAssignments = await response.json()
        // Filter assignments for this driver
        const driverAssignments = allAssignments
          .filter((a: any) => a.driver === driver.driverId)
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
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        setAssignments(driverAssignments)
      }
    } catch (error) {
      console.error('Failed to load assignments:', error)
    } finally {
      setIsLoadingAssignments(false)
    }
  }

  if (!isOpen || !driver) return null

  const statusColors: Record<DriverStatus, string> = {
    Active: 'bg-green-100 text-green-700',
    Idle: 'bg-yellow-100 text-yellow-700',
    'On Break': 'bg-blue-100 text-blue-700',
    Offline: 'bg-gray-100 text-gray-600'
  }

  const getStatusIcon = (status: DriverStatus) => {
    switch (status) {
      case 'Active':
        return <FiActivity className="h-5 w-5 text-green-600" />
      case 'Idle':
        return <FiClock className="h-5 w-5 text-yellow-600" />
      case 'On Break':
        return <FiClock className="h-5 w-5 text-blue-600" />
      case 'Offline':
        return <FiAlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const todayAssignments = assignments.filter(a => {
    const date = new Date(a.createdAt)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  })

  const completedAssignments = assignments.filter(a => a.status === 'completed')
  const completionRate = assignments.length > 0 
    ? Math.round((completedAssignments.length / assignments.length) * 100)
    : 0

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-[#F5F5F5] shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-5 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <FiUser className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{driver.fullName}</h2>
                <p className="text-gray-500 text-sm">Driver ID: {driver.driverId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900"
              aria-label="Close drawer"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-lg ${statusColors[driver.currentStatus]} flex items-center gap-2`}>
              {getStatusIcon(driver.currentStatus)}
              <span className="font-medium text-sm">{driver.currentStatus}</span>
            </div>
            {driver.assignedTruckId && (
              <div className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 flex items-center gap-2">
                <FiTruck className="h-4 w-4" />
                <span className="text-sm font-medium">{driver.assignedTruckId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Contact Information */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FiUser className="h-5 w-5 text-gray-600" />
                Contact Information
              </h3>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-700">
                  <FiPhone className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium text-sm">{driver.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <FiMail className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-sm">{driver.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <FiFileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">License Number</p>
                    <p className="font-medium text-sm">{driver.licenseNumber}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live GPS Location */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FiMapPin className="h-5 w-5 text-gray-600" />
                Live GPS Location
              </h3>
            </div>
            <div className="p-5">
              {driver.currentLatitude && driver.currentLongitude ? (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Latitude</p>
                        <p className="font-mono text-sm font-semibold text-gray-900">
                          {driver.currentLatitude.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Longitude</p>
                        <p className="font-mono text-sm font-semibold text-gray-900">
                          {driver.currentLongitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {driver.speedKmh !== null && driver.speedKmh !== undefined && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <FiActivity className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Current Speed</p>
                        <p className="font-medium text-sm">{driver.speedKmh.toFixed(1)} km/h</p>
                      </div>
                    </div>
                  )}
                  {driver.batteryLevel !== null && driver.batteryLevel !== undefined && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <FiBattery className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Device Battery</p>
                        <p className="font-medium text-sm">{driver.batteryLevel}%</p>
                      </div>
                    </div>
                  )}
                  {driver.lastGpsUpdate && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <FiClock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Last Update</p>
                        <p className="font-medium text-sm">
                          {new Date(driver.lastGpsUpdate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiMapPin className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>No GPS data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FiAward className="h-5 w-5 text-gray-600" />
                Performance Summary
              </h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-semibold text-gray-900">{todayAssignments.length}</p>
                  <p className="text-xs text-gray-600 mt-1">Today's Tasks</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-semibold text-gray-900">{completedAssignments.length}</p>
                  <p className="text-xs text-gray-600 mt-1">Completed</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-semibold text-gray-900">{completionRate}%</p>
                  <p className="text-xs text-gray-600 mt-1">Success Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment History */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FiCalendar className="h-5 w-5 text-gray-600" />
                Recent Assignments
              </h3>
            </div>
            <div className="p-5">
              {isLoadingAssignments ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto" />
                  <p className="text-gray-500 mt-2 text-sm">Loading assignments...</p>
                </div>
              ) : assignments.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {assignments.slice(0, 10).map((assignment) => (
                    <div
                      key={assignment.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900">{assignment.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {assignment.flightCode && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                <MdFlight className="h-3 w-3" />
                                {assignment.flightCode}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                              <FiTruck className="h-3 w-3" />
                              {assignment.truck}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-medium ${
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
                          <span>{new Date(assignment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiCalendar className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>No assignments found</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {driver.notes && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FiFileText className="h-5 w-5 text-gray-600" />
                  Notes
                </h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{driver.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

