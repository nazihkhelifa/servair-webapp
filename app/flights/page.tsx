'use client'

import { useState, useEffect } from 'react'
import { 
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiEdit,
  FiTrash2,
  FiDownload,
  FiAirplay
} from 'react-icons/fi'
import VerticalSidebar from '../../components/VerticalSidebar'
import FlightDetailDrawer from '../../components/FlightDetailDrawer'

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

interface APIFlight {
  flight_date: string
  flight_status: string
  departure: {
    airport: string
    timezone: string
    iata: string
    icao: string
    terminal: string
    gate: string
    delay: number | null
    scheduled: string
    estimated: string
    actual: string | null
  }
  arrival: {
    airport: string
    timezone: string
    iata: string
    icao: string
    terminal: string
    gate: string
    baggage: string | null
    delay: number | null
    scheduled: string
    estimated: string
    actual: string | null
  }
  airline: {
    name: string
    iata: string
    icao: string
  }
  flight: {
    number: string
    iata: string
    icao: string
    codeshared: any | null
  }
  aircraft: {
    registration: string | null
    iata: string | null
    icao: string | null
    icao24: string | null
  }
}

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [apiSearchQuery, setApiSearchQuery] = useState('')
  const [apiFlights, setApiFlights] = useState<APIFlight[]>([])
  const [loading, setLoading] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)
  const [showApiSearch, setShowApiSearch] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)

  // Load flights from Firestore
  useEffect(() => {
    loadFlights()
  }, [])

  const loadFlights = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/flights')
      if (response.ok) {
        const data = await response.json()
        setFlights(data)
      } else {
        console.error('Failed to load flights')
      }
    } catch (error) {
      console.error('Error loading flights:', error)
    } finally {
      setLoading(false)
    }
  }

  // Search flights using AviationStack API
  const searchFlightsAPI = async () => {
    if (!apiKey || !apiSearchQuery) {
      alert('Please enter both API key and flight code')
      return
    }

    try {
      setApiLoading(true)
      setApiFlights([])

      // AviationStack API endpoint
      const endpoint = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${apiSearchQuery}`
      
      const response = await fetch(endpoint)
      const data = await response.json()

      if (data.error) {
        alert(`API Error: ${data.error.message || 'Failed to fetch flights'}`)
        return
      }

      if (data.data && data.data.length > 0) {
        setApiFlights(data.data)
      } else {
        alert('No flights found for this code')
      }
    } catch (error) {
      console.error('Error searching flights:', error)
      alert('Failed to search flights. Please check your API key and try again.')
    } finally {
      setApiLoading(false)
    }
  }

  // Add flight from API to Firestore
  const addFlightFromAPI = async (apiFlight: APIFlight) => {
    try {
      // Determine if this is arrival or departure based on our airport
      const isArrival = apiFlight.arrival.iata === 'CDG' || apiFlight.arrival.iata === 'ORY' // Example: Paris airports
      
      const scheduledTime = isArrival 
        ? apiFlight.arrival.scheduled 
        : apiFlight.departure.scheduled
      
      const flightDate = new Date(scheduledTime)
      const theoreticalHour = flightDate.toTimeString().slice(0, 5) // HH:mm format
      
      const flightData = {
        flightCode: apiFlight.flight.iata,
        flightOrigin: apiFlight.departure.iata,
        flightDestination: apiFlight.arrival.iata,
        theoreticalDate: flightDate.toISOString().split('T')[0],
        theoreticalHour: theoreticalHour,
        planeType: apiFlight.aircraft?.iata || null,
        gate: isArrival ? apiFlight.arrival.gate : apiFlight.departure.gate,
        terminal: isArrival ? apiFlight.arrival.terminal : apiFlight.departure.terminal,
        status: mapAPIStatus(apiFlight.flight_status),
        flightType: isArrival ? 'arrival' : 'departure',
        airline: apiFlight.airline.name,
        notes: `Imported from API on ${new Date().toLocaleDateString()}`
      }

      const response = await fetch('/api/flights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flightData)
      })

      if (response.ok) {
        alert('Flight added successfully!')
        loadFlights() // Reload the list
        setShowApiSearch(false) // Close the search panel
      } else {
        const error = await response.json()
        alert(`Failed to add flight: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error adding flight:', error)
      alert('Failed to add flight')
    }
  }

  // Map API status to our status
  const mapAPIStatus = (apiStatus: string): string => {
    const statusMap: Record<string, string> = {
      'scheduled': 'scheduled',
      'active': 'boarding',
      'landed': 'arrived',
      'cancelled': 'cancelled',
      'incident': 'delayed',
      'diverted': 'delayed'
    }
    return statusMap[apiStatus] || 'scheduled'
  }

  // Delete flight
  const deleteFlight = async (flightId: string) => {
    if (!confirm('Are you sure you want to delete this flight?')) return

    try {
      const response = await fetch(`/api/flights?id=${flightId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Flight deleted successfully')
        loadFlights()
      } else {
        alert('Failed to delete flight')
      }
    } catch (error) {
      console.error('Error deleting flight:', error)
      alert('Failed to delete flight')
    }
  }

  const filteredFlights = flights.filter(flight => {
    const matchesSearch = flight.flightCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         flight.flightOrigin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         flight.flightDestination?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'scheduled': 'bg-blue-100 text-blue-700',
      'boarding': 'bg-yellow-100 text-yellow-700',
      'departed': 'bg-green-100 text-green-700',
      'arrived': 'bg-green-100 text-green-700',
      'cancelled': 'bg-red-100 text-red-700',
      'delayed': 'bg-orange-100 text-orange-700'
    }
    return badges[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
      <VerticalSidebar activePage="flights" />
      
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Flight Management</h1>
              <p className="text-gray-500">Import and manage flight information</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApiSearch(!showApiSearch)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <FiDownload className="h-5 w-5" />
                <span>Import from API</span>
              </button>
              <button
                onClick={loadFlights}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl flex items-center gap-2 hover:bg-gray-700 transition-colors"
              >
                <FiRefreshCw className="h-5 w-5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiAirplay className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Flights</p>
                  <p className="text-2xl font-bold text-gray-900">{flights.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FiClock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {flights.filter(f => f.status === 'scheduled').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiMapPin className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {flights.filter(f => f.status === 'boarding' || f.status === 'departed').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <FiCalendar className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Issues</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {flights.filter(f => f.status === 'delayed' || f.status === 'cancelled').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* API Search Panel */}
          {showApiSearch && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-blue-600">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Import Flight from API</h3>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 mb-2">
                    <strong>Using AviationStack API</strong>
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    Get your free API key at: <a href="https://aviationstack.com" target="_blank" rel="noopener noreferrer" className="underline">aviationstack.com</a>
                  </p>
                  <p className="text-xs text-blue-600">
                    Free tier: 100 requests/month • Search by flight IATA code (e.g., AA100, BA456)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your AviationStack API key"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Flight Code (IATA)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={apiSearchQuery}
                      onChange={(e) => setApiSearchQuery(e.target.value.toUpperCase())}
                      placeholder="e.g., AA100, BA456, AF1234"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && searchFlightsAPI()}
                    />
                    <button
                      onClick={searchFlightsAPI}
                      disabled={apiLoading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
                    >
                      <FiSearch className="h-4 w-4" />
                      {apiLoading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {/* API Search Results */}
                {apiFlights.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Search Results ({apiFlights.length})</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {apiFlights.map((apiFlight, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-lg font-bold text-blue-600">{apiFlight.flight.iata}</span>
                                <span className="text-sm text-gray-600">{apiFlight.airline.name}</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(mapAPIStatus(apiFlight.flight_status))}`}>
                                  {apiFlight.flight_status}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Departure</p>
                                  <p className="font-semibold">{apiFlight.departure.airport} ({apiFlight.departure.iata})</p>
                                  <p className="text-xs text-gray-600">
                                    {new Date(apiFlight.departure.scheduled).toLocaleString()}
                                  </p>
                                  {apiFlight.departure.gate && (
                                    <p className="text-xs text-gray-500">Gate: {apiFlight.departure.gate}</p>
                                  )}
                                </div>
                                
                                <div>
                                  <p className="text-gray-500">Arrival</p>
                                  <p className="font-semibold">{apiFlight.arrival.airport} ({apiFlight.arrival.iata})</p>
                                  <p className="text-xs text-gray-600">
                                    {new Date(apiFlight.arrival.scheduled).toLocaleString()}
                                  </p>
                                  {apiFlight.arrival.gate && (
                                    <p className="text-xs text-gray-500">Gate: {apiFlight.arrival.gate}</p>
                                  )}
                                </div>
                              </div>

                              {apiFlight.aircraft?.iata && (
                                <p className="text-xs text-gray-500 mt-2">Aircraft: {apiFlight.aircraft.iata}</p>
                              )}
                            </div>
                            
                            <button
                              onClick={() => addFlightFromAPI(apiFlight)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                            >
                              <FiPlus className="h-4 w-4" />
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <button
                  onClick={() => {
                    setShowApiSearch(false)
                    setApiFlights([])
                    setApiSearchQuery('')
                  }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search flights by code, origin, or destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Flights List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FiRefreshCw className="animate-spin mx-auto h-12 w-12 text-blue-600 mb-4" />
              <p className="text-gray-500">Loading flights...</p>
            </div>
          ) : filteredFlights.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FiAirplay className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Flights Found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'Try adjusting your search' : 'Import flights from API to get started'}
              </p>
              <button
                onClick={() => setShowApiSearch(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <FiDownload className="h-4 w-4" />
                Import Flights
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Flight Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Route
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Schedule
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aircraft
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredFlights.map((flight) => (
                      <tr 
                        key={flight.id} 
                        onClick={() => {
                          setSelectedFlight(flight)
                          setIsDetailDrawerOpen(true)
                        }}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-bold text-gray-900">{flight.flightCode}</div>
                              <div className="text-xs text-gray-500">{flight.airline || 'Unknown Airline'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {flight.flightOrigin || '???'} → {flight.flightDestination || '???'}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">{flight.flightType}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(flight.theoreticalDateTime).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">{flight.theoreticalHour}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {flight.planeType || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{flight.gate || 'TBA'}</div>
                          {flight.terminal && (
                            <div className="text-xs text-gray-500">{flight.terminal}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(flight.status)}`}>
                            {flight.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteFlight(flight.id!)
                              }}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Flight Detail Drawer */}
      <FlightDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false)
          setSelectedFlight(null)
        }}
        flight={selectedFlight}
      />
    </div>
  )
}

