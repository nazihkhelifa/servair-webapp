'use client'

import { useState, useEffect } from 'react'
import { 
  FiPlus,
  FiFilter,
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiUsers,
  FiMapPin,
  FiArrowRight,
  FiAlertCircle,
  FiEdit,
  FiList,
  FiCalendar,
  FiActivity,
  FiHelpCircle,
  FiEye,
  FiRotateCw
} from 'react-icons/fi'
import { MdFlight } from 'react-icons/md'
import { MdLocationOn } from 'react-icons/md'
import Link from 'next/link'
import VerticalSidebar from '../../components/VerticalSidebar'
import AssignmentDetailDrawer from '../../components/AssignmentDetailDrawer'

interface Task {
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
  // Flight information
  flightId?: string
  flightCode?: string
  flightOrigin?: string
  flightDestination?: string
  theoreticalHour?: string
  planeType?: string
  gate?: string
  // Route summary
  routeId?: string | null
  routeStatus?: 'pending' | 'ready' | 'error' | null
  etaMinutes?: number | null
  totalDistanceMeters?: number | null
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [routeByAssignmentId, setRouteByAssignmentId] = useState<Record<string, { totalDistanceMeters?: number | null; eta?: { totalMinutes?: number | null } | null }>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Task['status']>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [allUsers, setAllUsers] = useState<string[]>([])
  const [availableTrucks, setAvailableTrucks] = useState<any[]>([])
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')
  const [availableFlights, setAvailableFlights] = useState<any[]>([])
  const [selectedFlight, setSelectedFlight] = useState<any | null>(null)
  const [selectedAirport, setSelectedAirport] = useState<'CDG' | 'ORY'>('CDG')
  const [startLocations, setStartLocations] = useState<any[]>([])
  const [destinationLocations, setDestinationLocations] = useState<any[]>([])
  
  // Assignment Detail Drawer state
  const [selectedAssignment, setSelectedAssignment] = useState<Task | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  
  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    truck: '',
    driver: '',
    airport: 'CDG' as 'CDG' | 'ORY',
    startLocation: '',
    destination: '',
    description: '',
    priority: 'medium' as Task['priority'],
    status: 'pending' as Task['status'],
    startDate: '',
    startTime: '',
    dueDate: '',
    dueTime: '',
    // Flight information
    flightCode: '',
    flightOrigin: '',
    flightDestination: '',
    theoreticalHour: '',
    planeType: '',
    gate: ''
  })
  
  // Load users, trucks, drivers, flights, and assignments from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load trucks for dropdown
        const trucksResponse = await fetch('/api/trucks')
        if (trucksResponse.ok) {
          const trucks = await trucksResponse.json()
          setAvailableTrucks(trucks)
          
          // Set first truck as default for form
          if (trucks.length > 0) {
            setNewTask(prev => ({ ...prev, truck: trucks[0].truckId }))
          }
        }

        // Load drivers for dropdown
        const driversResponse = await fetch('/api/drivers')
        if (driversResponse.ok) {
          const drivers = await driversResponse.json()
          setAvailableDrivers(drivers)
        }

        // Load GPS users (for backward compatibility)
        const usersResponse = await fetch('/api/gps?type=latest')
        if (usersResponse.ok) {
          const latestLocations = await usersResponse.json()
          const users = latestLocations.map((user: any) => user.userId)
          setAllUsers(users)
        }

        // Load flights from Firestore
        const flightsResponse = await fetch('/api/flights')
        if (flightsResponse.ok) {
          const flights = await flightsResponse.json()
          setAvailableFlights(flights)
        } else {
          console.error('Failed to load flights from Firestore')
        }

        // Load assignments from Firestore
        const assignmentsResponse = await fetch('/api/assignments')
        if (assignmentsResponse.ok) {
          const assignments = await assignmentsResponse.json()
          const loadedTasks: Task[] = assignments.map((assignment: any) => ({
            id: assignment.id,
            title: assignment.title,
            truck: assignment.truck,
            driver: assignment.driver,
            startLocation: assignment.startLocation || '',
            destination: assignment.destination,
            airport: assignment.airport || 'CDG',
            status: assignment.status as Task['status'],
            priority: assignment.priority as Task['priority'],
            createdAt: new Date(assignment.createdAt),
            dueDate: new Date(assignment.dueDate),
            description: assignment.description,
            startDate: assignment.startDate,
            startTime: assignment.startTime,
            dueDateOnly: assignment.dueDateOnly,
            dueTime: assignment.dueTime,
            // Flight information
            flightId: assignment.flightId || undefined,
            flightCode: assignment.flightCode || undefined,
            flightOrigin: assignment.flightOrigin || undefined,
            flightDestination: assignment.flightDestination || undefined,
            theoreticalHour: assignment.theoreticalHour || undefined,
            planeType: assignment.planeType || undefined,
            gate: assignment.gate || undefined,
            routeId: assignment.routeId || null,
            routeStatus: assignment.routeStatus || null,
            etaMinutes: assignment.etaMinutes ?? null,
            totalDistanceMeters: assignment.totalDistanceMeters ?? null
          }))
          setTasks(loadedTasks)
        } else {
          console.error('Failed to load assignments from Firestore')
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    
    loadData()
  }, [])

  // After tasks are loaded, pull precise route metrics from routes collection
  useEffect(() => {
    const loadRoutes = async () => {
      const assignmentsNeedingRoutes = tasks.filter(t => t.routeStatus === 'ready')
      if (assignmentsNeedingRoutes.length === 0) return

      const entries = await Promise.all(assignmentsNeedingRoutes.map(async (t) => {
        try {
          const res = await fetch(`/api/routes?assignmentId=${encodeURIComponent(t.id)}`)
          if (!res.ok) return [t.id, null] as const
          const routes = await res.json()
          if (Array.isArray(routes) && routes.length > 0) {
            routes.sort((a: any, b: any) => (new Date(b.computedAt || 0).getTime()) - (new Date(a.computedAt || 0).getTime()))
            const chosen = routes[0]
            return [t.id, { totalDistanceMeters: chosen.totalDistanceMeters ?? null, eta: chosen.eta ?? null }] as const
          }
          return [t.id, null] as const
        } catch {
          return [t.id, null] as const
        }
      }))

      const next: Record<string, { totalDistanceMeters?: number | null; eta?: { totalMinutes?: number | null } | null }> = {}
      entries.forEach(([id, val]) => { if (val) next[id] = val })
      if (Object.keys(next).length > 0) setRouteByAssignmentId(prev => ({ ...prev, ...next }))
    }

    if (tasks.length > 0) loadRoutes()
  }, [tasks])
  
  // Load locations when airport changes
  useEffect(() => {
    const loadLocations = async () => {
      try {
        // Load start locations for selected airport
        const startResponse = await fetch(`/api/locations?airport=${selectedAirport}&type=start`)
        if (startResponse.ok) {
          const starts = await startResponse.json()
          setStartLocations(starts)
        }

        // Load destination locations for selected airport
        const destResponse = await fetch(`/api/locations?airport=${selectedAirport}&type=destination`)
        if (destResponse.ok) {
          const dests = await destResponse.json()
          setDestinationLocations(dests)
        }
      } catch (error) {
        console.error('Failed to load locations:', error)
      }
    }

    loadLocations()
  }, [selectedAirport])
  
  // Handle flight selection
  const handleFlightSelect = (flightId: string) => {
    if (flightId === '') {
      // Clear flight selection
      setSelectedFlight(null)
      setNewTask(prev => ({
        ...prev,
        flightCode: '',
        flightOrigin: '',
        flightDestination: '',
        theoreticalHour: '',
        planeType: '',
        gate: ''
      }))
      return
    }

    const flight = availableFlights.find(f => f.id === flightId)
    if (flight) {
      setSelectedFlight(flight)
      // Auto-populate flight information
      setNewTask(prev => ({
        ...prev,
        flightCode: flight.flightCode || '',
        flightOrigin: flight.flightOrigin || '',
        flightDestination: flight.flightDestination || '',
        theoreticalHour: flight.theoreticalHour || '',
        planeType: flight.planeType || '',
        gate: flight.gate || '',
        title: `Service ${flight.flightCode}`, // Auto-generate title
        destination: flight.gate ? `Gate ${flight.gate}` : 'Apron', // Auto-suggest location
      }))
    }
  }

  // Handle form submission for new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!newTask.title || !newTask.truck || !newTask.destination || !newTask.startDate || !newTask.dueDate) {
      alert('Please fill in all required fields')
      return
    }
    
    try {
      // Parse dates and times
      const startDateTime = new Date(`${newTask.startDate}T${newTask.startTime || '09:00'}`)
      const dueDateTime = new Date(`${newTask.dueDate}T${newTask.dueTime || '17:00'}`)
      
      // Prepare assignment data for Firestore
      const assignmentData = {
        title: newTask.title,
        truck: newTask.truck,
        driver: newTask.driver || 'Unassigned',
        startLocation: newTask.startLocation || 'Base',
        destination: newTask.destination,
        description: newTask.description || 'No description provided',
        priority: newTask.priority,
        status: newTask.status,
        // Combined datetime fields
        createdAt: startDateTime.toISOString(),
        dueDate: dueDateTime.toISOString(),
        // Separate date and time fields for easier querying
        startDate: newTask.startDate, // yyyy-mm-dd format
        startTime: newTask.startTime || '09:00', // HH:mm format
        dueDateOnly: newTask.dueDate, // yyyy-mm-dd format
        dueTime: newTask.dueTime || '17:00', // HH:mm format
        // Flight information (linked to flights collection)
        flightId: selectedFlight?.id || null, // Link to flights collection
        flightCode: newTask.flightCode || null,
        flightOrigin: newTask.flightOrigin || null,
        flightDestination: newTask.flightDestination || null,
        theoreticalHour: newTask.theoreticalHour || null,
        planeType: newTask.planeType || null,
        gate: newTask.gate || null
      }
      
      // Save to Firestore
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save assignment to Firestore')
      }
      
      const result = await response.json()
      
      // Create task object with Firestore ID
      const task: Task = {
        id: result.id,
        title: newTask.title,
        truck: newTask.truck,
        driver: newTask.driver || 'Unassigned',
        startLocation: newTask.startLocation || 'Base',
        destination: newTask.destination,
        airport: newTask.airport,
        description: newTask.description || 'No description provided',
        priority: newTask.priority,
        status: newTask.status,
        createdAt: startDateTime,
        dueDate: dueDateTime,
        startDate: newTask.startDate,
        startTime: newTask.startTime,
        dueDateOnly: newTask.dueDate,
        dueTime: newTask.dueTime,
        // Flight information
        flightCode: newTask.flightCode || undefined,
        flightOrigin: newTask.flightOrigin || undefined,
        flightDestination: newTask.flightDestination || undefined,
        theoreticalHour: newTask.theoreticalHour || undefined,
        planeType: newTask.planeType || undefined,
        gate: newTask.gate || undefined
      }
      
      // Add task to list
      setTasks(prev => [...prev, task])
      
      // Reset form and close
      setNewTask({
        title: '',
        truck: availableTrucks.length > 0 ? availableTrucks[0].truckId : '',
        driver: '',
        airport: 'CDG',
        startLocation: '',
        destination: '',
        description: '',
        priority: 'medium',
        status: 'pending',
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
      setShowTaskForm(false)
      
      // Show success message
      alert('Task created successfully!')
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task. Please try again.')
    }
  }
  
  // Handle cancel button
  const handleCancelTask = () => {
    setNewTask({
      title: '',
      truck: availableTrucks.length > 0 ? availableTrucks[0].truckId : '',
      driver: '',
      airport: 'CDG',
      startLocation: '',
      destination: '',
      description: '',
      priority: 'medium',
      status: 'pending',
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
    setSelectedFlight(null)
    setShowTaskForm(false)
  }
  
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.destination.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })
  
  const getStatusIcon = (status: Task['status']) => {
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
  
  const getStatusBadge = (status: Task['status']) => {
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
  
  const getPriorityBadge = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      case 'low':
        return 'bg-green-100 text-green-700'
    }
  }
  
  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
      <VerticalSidebar activePage="tasks" />
      
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tasks & Assignments</h1>
              <p className="text-gray-500">Manage your fleet operations</p>
            </div>
            <button 
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <FiPlus className="h-5 w-5" />
              <span>New Task</span>
            </button>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiCheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FiClock className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingTasks}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiClock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{inProgressTasks}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiCheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* View Toggle & Filters */}
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
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Task Form */}
          {showTaskForm && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-blue-600">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Assignment</h3>
              <form onSubmit={handleCreateTask} className="space-y-6">
                {/* Flight Selection Section */}
                <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    ✈️ Select Flight
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Flight *</label>
                      <select
                        value={selectedFlight?.id || ''}
                        onChange={(e) => handleFlightSelect(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        required
                      >
                        <option value="">Select a flight</option>
                        {availableFlights.map((flight) => (
                          <option key={flight.id} value={flight.id}>
                            {flight.flightCode} - {flight.flightOrigin || '???'} → {flight.flightDestination || '???'} 
                            {flight.theoreticalHour && ` at ${flight.theoreticalHour}`}
                            {flight.gate && ` | Gate ${flight.gate}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Display selected flight details */}
                    {selectedFlight && (
                      <div className="bg-white border border-blue-200 rounded-lg p-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Flight:</span>
                            <span className="ml-2 font-semibold text-blue-600">{selectedFlight.flightCode}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Route:</span>
                            <span className="ml-2 font-semibold">{selectedFlight.flightOrigin || '???'} → {selectedFlight.flightDestination || '???'}</span>
                          </div>
                          {selectedFlight.theoreticalHour && (
                            <div>
                              <span className="text-gray-600">Time:</span>
                              <span className="ml-2 font-semibold">{selectedFlight.theoreticalHour}</span>
                            </div>
                          )}
                          {selectedFlight.planeType && (
                            <div>
                              <span className="text-gray-600">Aircraft:</span>
                              <span className="ml-2 font-semibold">{selectedFlight.planeType}</span>
                            </div>
                          )}
                          {selectedFlight.gate && (
                            <div>
                              <span className="text-gray-600">Gate:</span>
                              <span className="ml-2 font-semibold">{selectedFlight.gate}</span>
                            </div>
                          )}
                          {selectedFlight.status && (
                            <div>
                              <span className="text-gray-600">Status:</span>
                              <span className="ml-2 font-semibold capitalize">{selectedFlight.status}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Details Section */}
                <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded-r-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    🚛 Assignment Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                      <input 
                        type="text" 
                        value={newTask.title}
                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter task title"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Truck *</label>
                      <select 
                        value={newTask.truck}
                        onChange={(e) => setNewTask(prev => ({ ...prev, truck: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        required
                      >
                        <option value="">Select a truck</option>
                        {availableTrucks.map(truck => (
                          <option key={truck.truckId} value={truck.truckId}>
                            {truck.plateNumber} - {truck.type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Driver *</label>
                      <select 
                        value={newTask.driver}
                        onChange={(e) => setNewTask(prev => ({ ...prev, driver: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        required
                      >
                        <option value="">Select a driver</option>
                        {availableDrivers.map(driver => (
                          <option key={driver.driverId} value={driver.driverId}>
                            {driver.fullName} - {driver.currentStatus}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Airport *</label>
                      <select 
                        value={newTask.airport}
                        onChange={(e) => {
                          const airport = e.target.value as 'CDG' | 'ORY'
                          setNewTask(prev => ({ ...prev, airport, startLocation: '', destination: '' }))
                          setSelectedAirport(airport)
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        required
                      >
                        <option value="CDG">CDG - Charles de Gaulle</option>
                        <option value="ORY">ORY - Orly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Location *</label>
                      <select 
                        value={newTask.startLocation}
                        onChange={(e) => setNewTask(prev => ({ ...prev, startLocation: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                        required
                      >
                        <option value="">Select start location</option>
                        {startLocations.map((location) => (
                          <option key={location.id} value={location.name}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Destination (Gate) *</label>
                      <select 
                        value={newTask.destination}
                        onChange={(e) => setNewTask(prev => ({ ...prev, destination: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                        required
                      >
                        <option value="">Select destination</option>
                        {destinationLocations.map((location) => (
                          <option key={location.id} value={location.name}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <select 
                        value={newTask.priority}
                        onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select 
                        value={newTask.status}
                        onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value as Task['status'] }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                      <input 
                        type="date" 
                        value={newTask.startDate}
                        onChange={(e) => setNewTask(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input 
                        type="time" 
                        value={newTask.startTime}
                        onChange={(e) => setNewTask(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                      <input 
                        type="date" 
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Due Time</label>
                      <input 
                        type="time" 
                        value={newTask.dueTime}
                        onChange={(e) => setNewTask(prev => ({ ...prev, dueTime: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                      />
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea 
                    value={newTask.description}
                    onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter task description"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={handleCancelTask}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Tasks List or Timeline */}
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FiCheckCircle className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tasks Found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try adjusting your filters' : 'Create your first task to get started'}
              </p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="grid gap-5 grid-cols-1 w-full">
              {filteredTasks.map((task) => {
                // Format date like "30 Sep • 9:57"
                const formatDate = (date: Date) => {
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                  const day = date.getDate()
                  const month = months[date.getMonth()]
                  const hours = date.getHours().toString().padStart(2, '0')
                  const minutes = date.getMinutes().toString().padStart(2, '0')
                  return `${day} ${month} • ${hours}:${minutes}`
                }

                // Calculate duration or show status
                const duration = ((task.dueDate.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60)).toFixed(1)
                const statusText = task.status === 'completed' ? 'Completed' : 
                                 task.status === 'in-progress' ? 'In Progress' :
                                 task.status === 'cancelled' ? 'Cancelled' : 'Pending'
                
                return (
                  <div 
                    key={task.id} 
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100"
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Plane Icon */}
                      <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-gray-50 rounded-xl">
                        <MdFlight className="w-8 h-8 text-blue-600" />
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 mb-2 truncate">
                              {task.destination || task.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <FiClock className="w-3.5 h-3.5" />
                                <span>{formatDate(task.createdAt)}</span>
                              </div>
                              <div className={`text-sm font-medium ${
                                task.status === 'completed' ? 'text-green-600' :
                                task.status === 'in-progress' ? 'text-blue-600' :
                                task.status === 'cancelled' ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {statusText}
                              </div>
                            </div>
                            {task.flightCode && (
                              <div className="mt-1.5 text-xs text-gray-500">
                                Flight: {task.flightCode}
                                {task.gate && ` • Gate ${task.gate}`}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAssignment(task)
                                setIsDetailDrawerOpen(true)
                              }}
                              className="px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                              title="View details"
                            >
                              <FiEye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info Row - Hidden by default, can expand */}
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 hidden">
                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <FiTruck className="w-3.5 h-3.5" />
                          <span>{task.truck}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FiUsers className="w-3.5 h-3.5" />
                          <span>{task.driver || 'Unassigned'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FiMapPin className="w-3.5 h-3.5" />
                          <span>{task.startLocation} → {task.destination}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FiActivity className="w-3.5 h-3.5" />
                          <span>Duration: {duration}h</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <TruckTimeline tasks={filteredTasks} getStatusBadge={getStatusBadge} getPriorityBadge={getPriorityBadge} getStatusIcon={getStatusIcon} />
          )}
        </div>
      </main>

      {/* Assignment Detail Drawer */}
      <AssignmentDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false)
          setSelectedAssignment(null)
        }}
        assignment={selectedAssignment}
        onUpdate={(updatedAssignment) => {
          // Update the task in the local state
          setTasks(tasks.map(task => 
            task.id === updatedAssignment.id 
              ? {
                  ...task,
                  ...updatedAssignment,
                  createdAt: updatedAssignment.createdAt instanceof Date 
                    ? updatedAssignment.createdAt 
                    : new Date(updatedAssignment.createdAt),
                  dueDate: updatedAssignment.dueDate instanceof Date 
                    ? updatedAssignment.dueDate 
                    : new Date(updatedAssignment.dueDate)
                }
              : task
          ))
          // Update selected assignment if it's the same one
          if (selectedAssignment && selectedAssignment.id === updatedAssignment.id) {
            setSelectedAssignment({
              ...selectedAssignment,
              ...updatedAssignment,
              createdAt: updatedAssignment.createdAt instanceof Date 
                ? updatedAssignment.createdAt 
                : new Date(updatedAssignment.createdAt),
              dueDate: updatedAssignment.dueDate instanceof Date 
                ? updatedAssignment.dueDate 
                : new Date(updatedAssignment.dueDate)
            })
          }
        }}
        availableTrucks={availableTrucks}
        availableDrivers={availableDrivers}
        availableFlights={availableFlights}
        startLocations={startLocations}
        destinationLocations={destinationLocations}
      />
    </div>
  )
}

// Truck Timeline Component
interface TruckTimelineProps {
  tasks: Task[]
  getStatusBadge: (status: Task['status']) => string
  getPriorityBadge: (priority: Task['priority']) => string
  getStatusIcon: (status: Task['status']) => React.ReactNode
}

function TruckTimeline({ tasks, getStatusBadge, getPriorityBadge, getStatusIcon }: TruckTimelineProps) {
  // Date range filter state
  const [dateRangeMode, setDateRangeMode] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Calculate date range first (needed for filtering)
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
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday as start
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

  // Filter tasks that overlap with the visible date range
  const visibleTasks = dateRangeFilter 
    ? tasks.filter(task => {
        // Task is visible if it overlaps with the date range
        return task.dueDate >= dateRangeFilter.start && task.createdAt <= dateRangeFilter.end
      })
    : tasks

  // Group tasks by truck (one row per truck)
  const tasksByTruck = visibleTasks.reduce((acc, task) => {
    if (!acc[task.truck]) {
      acc[task.truck] = []
    }
    acc[task.truck].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  // Create gantt rows - one per truck
  const ganttRows: Array<{ truckId: string; tasks: Task[] }> = Object.entries(tasksByTruck).map(([truckId, truckTasks]) => ({
    truckId,
    tasks: truckTasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }))
  
  // Sort rows by truck ID
  ganttRows.sort((a, b) => a.truckId.localeCompare(b.truckId))
  
  // Get date range for timeline
  const allDates = visibleTasks.flatMap(task => [task.createdAt, task.dueDate])
  
  if (allDates.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <FiTruck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500">No tasks to display in Gantt chart</p>
      </div>
    )
  }

  // Determine min and max dates based on filter
  let minDate: Date
  let maxDate: Date

  if (dateRangeFilter) {
    // Use filtered date range
    minDate = dateRangeFilter.start
    maxDate = dateRangeFilter.end
  } else {
    // Use auto-calculated range from tasks
    const rawMinDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const rawMaxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
    
    minDate = new Date(rawMinDate)
    minDate.setHours(0, 0, 0, 0)
    
    maxDate = new Date(rawMaxDate)
    maxDate.setHours(23, 59, 59, 999)
    
    // Ensure at least 30 days displayed for 'all' mode
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

  // Generate 30-minute interval markers for detailed timeline
  const thirtyMinIntervalWidth = 60 // Width in pixels for each 30-min interval
  const totalIntervals = daysRange * 24 * 2 // 2 intervals per hour, 24 hours per day
  
  // Generate date groups (days) - each starting at midnight
  const dateGroups: Array<{ date: Date; intervalCount: number }> = []
  for (let i = 0; i < daysRange; i++) {
    const date = new Date(minDate)
    date.setDate(date.getDate() + i)
    date.setHours(0, 0, 0, 0) // Ensure midnight alignment
    dateGroups.push({ date, intervalCount: 48 }) // 48 half-hour intervals per day
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
    const intervalsPassed = timeDiff / (30 * 60 * 1000) // 30 minutes in milliseconds
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
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Gantt Chart View</h2>
            <p className="text-sm text-gray-500">Visual timeline of tasks scheduled for each truck</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs">
            <div className="font-semibold text-blue-900 mb-1">Timeline Info</div>
            <div className="text-blue-700 space-y-0.5">
              <div>Period: {minDate.toLocaleDateString()} - {effectiveMaxDate.toLocaleDateString()}</div>
              <div>Days: {daysRange} | Intervals: {intervalMarkers.length} (30min each)</div>
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

          {/* Custom Date Range Inputs */}
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

        {/* Filter Info */}
        {dateRangeMode !== 'all' && visibleTasks.length < tasks.length && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
            <span className="font-medium">Showing {visibleTasks.length} of {tasks.length} tasks</span> that overlap with the selected date range. 
            {tasks.length - visibleTasks.length} task(s) are outside this range.
          </div>
        )}

        {dateRangeMode !== 'all' && visibleTasks.length === 0 && tasks.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-sm text-orange-800">
            <span className="font-medium">No tasks found</span> in the selected date range. Try selecting a different range or click "Show All".
          </div>
        )}
      </div>

      {/* Gantt Chart Container */}
      <div className="flex" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 420px)' }}>
        {/* Fixed Left Sidebar */}
        <div className="flex-shrink-0 border-r border-gray-200 bg-gray-50" style={{ width: `${sidebarWidth}px` }}>
          {/* Sidebar Header */}
          <div className="sticky top-0 z-20 bg-gray-100 border-b border-gray-300 px-4 py-4">
            <div className="text-sm font-semibold text-gray-700">
              Trucks ({ganttRows.length})
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              {visibleTasks.length} task{visibleTasks.length !== 1 ? 's' : ''} total
            </div>
          </div>

          {/* Truck List */}
          <div className="overflow-y-auto" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 420px)' }}>
            {ganttRows.map((row) => {
              const { truckId, tasks: truckTasks } = row
              const pendingCount = truckTasks.filter(t => t.status === 'pending').length
              const inProgressCount = truckTasks.filter(t => t.status === 'in-progress').length
              const completedCount = truckTasks.filter(t => t.status === 'completed').length
              
              return (
                <div
                  key={truckId}
                  className="border-b border-gray-200 px-4 py-4 hover:bg-gray-100 transition-colors"
                  style={{ height: `${rowHeight}px` }}
                >
                  <div className="flex items-start gap-3 h-full">
                    <FiTruck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 truncate mb-1">
                        {truckId}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {truckTasks.length} {truckTasks.length === 1 ? 'task' : 'tasks'}
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
            <div className="flex" style={{ minWidth: `${intervalMarkers.length * thirtyMinIntervalWidth}px` }}>
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
            </div>

            {/* Current Time Indicator Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none"
              style={{ left: `${getDatePosition(new Date())}%` }}
            >
              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-blue-500 rounded-full shadow" />
            </div>
          </div>

          {/* Task Rows with Gantt Bars */}
          <div className="relative bg-white" style={{ minWidth: `${intervalMarkers.length * thirtyMinIntervalWidth}px` }}>
            {/* Vertical Grid Lines - Hour markers (darker) */}
            <div className="absolute inset-0 flex pointer-events-none">
              {hourMarkers.map((_, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 border-r border-gray-200"
                  style={{ width: `${thirtyMinIntervalWidth * 2}px` }}
                />
              ))}
            </div>

            {/* Vertical Grid Lines - 30-min markers (lighter) */}
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

            {/* Task Bars - Grouped by Truck */}
            {ganttRows.map((row) => {
              const { truckId, tasks: truckTasks } = row
              
              return (
                <div
                  key={truckId}
                  className="relative border-b border-gray-200"
                  style={{ height: `${rowHeight}px` }}
                >
                  {/* All tasks for this truck on the same row */}
                  <div className="absolute inset-0 px-1">
                    {truckTasks.map((task) => {
                      const startPos = getDatePosition(task.createdAt)
                      const endPos = getDatePosition(task.dueDate)
                      const width = Math.max(0.1, endPos - startPos)
                      const colors = statusColors[task.status]
                      
                      // Calculate exact pixel positions
                      const totalWidth = intervalMarkers.length * thirtyMinIntervalWidth
                      const startPx = (startPos / 100) * totalWidth
                      const widthPx = (width / 100) * totalWidth

                      return (
                        <div
                          key={task.id}
                          className={`absolute group cursor-pointer ${colors.bg} ${colors.border} rounded-md h-10 shadow-sm hover:shadow-lg transition-all border-2 flex items-center px-3`}
                          style={{
                            left: `${startPos}%`,
                            width: `${width}%`,
                            minWidth: '120px',
                            top: '50%',
                            transform: 'translateY(-50%)'
                          }}
                          title={`${task.title} | ${task.createdAt.toLocaleString()} → ${task.dueDate.toLocaleString()}`}
                        >
                          {/* Task Title - Centered */}
                          <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-medium text-white truncate text-center">
                              {task.title}
                            </span>
                            {task.priority === 'high' && (
                              <span className="flex-shrink-0 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse" />
                            )}
                          </div>

                          {/* Tooltip on Hover */}
                          <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-gray-900 text-white text-xs rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                            <div className="space-y-2">
                              {task.flightCode && (
                                <div className="border-b border-gray-700 pb-2 mb-2">
                                  <p className="font-bold text-sm text-blue-300">✈️ {task.flightCode}</p>
                                  {(task.flightOrigin || task.flightDestination) && (
                                    <p className="text-gray-400 text-[10px]">
                                      {task.flightOrigin || '???'} → {task.flightDestination || '???'}
                                      {task.planeType && ` | ${task.planeType}`}
                                      {task.gate && ` | Gate ${task.gate}`}
                                    </p>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-white">{task.title}</p>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  task.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                  task.status === 'in-progress' ? 'bg-blue-500/20 text-blue-300' :
                                  task.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
                                  'bg-gray-500/20 text-gray-300'
                                }`}>
                                  {task.status}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  task.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                                  task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-gray-500/20 text-gray-300'
                                }`}>
                                  {task.priority}
                                </span>
                              </div>
                              {task.description && <p className="text-gray-300 text-xs">{task.description}</p>}
                            </div>
                            <div className="space-y-2 text-gray-400 mt-3">
                              <div className="flex items-center gap-2">
                                <FiTruck className="h-3 w-3" />
                                <span>Truck: {truckId}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FiUsers className="h-3 w-3" />
                                <span>Driver: {task.driver}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FiMapPin className="h-3 w-3" />
                                <span>From: {task.startLocation}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MdLocationOn className="h-3 w-3" />
                                <span>To: {task.destination}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FiClock className="h-3 w-3" />
                                <span>Start: {task.createdAt.toLocaleDateString()} {task.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FiClock className="h-3 w-3" />
                                <span>Due: {task.dueDate.toLocaleDateString()} {task.dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-500">
                                <div className="flex items-center gap-2">
                                  <FiActivity className="h-3 w-3" />
                                  <span>Duration: {((task.dueDate.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60)).toFixed(1)} hours</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {ganttRows.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FiTruck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p>No trucks with tasks to display</p>
          <p className="text-sm mt-2">Create an assignment to get started</p>
        </div>
      )}
    </div>
  )
}

