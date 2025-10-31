'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { FiArrowLeft, FiMapPin, FiTruck, FiNavigation, FiGlobe, FiMaximize2 } from 'react-icons/fi'
import { MdFlight, MdLocationOn } from 'react-icons/md'
import Link from 'next/link'
import VerticalSidebar from '../../components/VerticalSidebar'

interface DriverPosition {
  latitude: number
  longitude: number
  timestamp: number
  speedKmh?: number
}

function TrackingContent() {
  const searchParams = useSearchParams()
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [driverPosition, setDriverPosition] = useState<DriverPosition | null>(null)
  const [isLoadingPosition, setIsLoadingPosition] = useState(false)
  const mapRef = useRef<any>(null)
  const standardLayerRef = useRef<any>(null)
  const satelliteLayerRef = useRef<any>(null)
  const mapInitializedRef = useRef(false)
  const driverMarkerRef = useRef<any>(null)

  // Get parameters from URL
  const assignmentId = searchParams.get('assignmentId')
  const startLat = parseFloat(searchParams.get('startLat') || 'NaN')
  const startLng = parseFloat(searchParams.get('startLng') || 'NaN')
  const destLat = parseFloat(searchParams.get('destLat') || 'NaN')
  const destLng = parseFloat(searchParams.get('destLng') || 'NaN')
  const startName = searchParams.get('startName') || 'Start Location'
  const destName = searchParams.get('destName') || 'Destination'
  const truck = searchParams.get('truck') || 'Unknown Truck'
  const driver = searchParams.get('driver') || ''

  // Validate coordinates
  const hasValidCoordinates = !isNaN(startLat) && !isNaN(startLng) && !isNaN(destLat) && !isNaN(destLng)

  // Calculate distance between two points (Haversine formula)
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

  const distance = calculateDistance(startLat, startLng, destLat, destLng)

  // Fetch driver's current GPS position
  useEffect(() => {
    if (!driver) return

    const fetchDriverPosition = async () => {
      try {
        setIsLoadingPosition(true)
        const response = await fetch(`/api/gps?driverId=${encodeURIComponent(driver)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.length > 0) {
            const latestPosition = data[0]
            setDriverPosition({
              latitude: latestPosition.latitude,
              longitude: latestPosition.longitude,
              timestamp: latestPosition.timestamp || Date.now(),
              speedKmh: latestPosition.speedKmh
            })
          }
        }
      } catch (err) {
        console.error('Error fetching driver position:', err)
      } finally {
        setIsLoadingPosition(false)
      }
    }

    fetchDriverPosition()
    
    // Refresh driver position every 30 seconds
    const interval = setInterval(fetchDriverPosition, 30000)
    
    return () => clearInterval(interval)
  }, [driver])

  // Update driver marker on map when position changes
  useEffect(() => {
    if (!mapInitializedRef.current || !mapRef.current || !driverPosition) return

    const L = (window as any).L
    if (!L) return

    // Remove existing driver marker
    if (driverMarkerRef.current) {
      mapRef.current.removeLayer(driverMarkerRef.current)
      driverMarkerRef.current = null
    }

    // Create truck icon for driver's current position
    const truckIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="position: relative;">
          <div style="
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 8px;
            width: 32px;
            height: 32px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 2s infinite;
          ">
            <span style="color: white; font-size: 18px;">🚛</span>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    })

    // Add driver marker
    const driverMarker = L.marker(
      [driverPosition.latitude, driverPosition.longitude],
      { icon: truckIcon }
    ).addTo(mapRef.current)

    const timeAgo = Math.round((Date.now() - driverPosition.timestamp) / 1000)
    const timeDisplay = timeAgo < 60 
      ? `${timeAgo} seconds ago` 
      : `${Math.round(timeAgo / 60)} minutes ago`

    driverMarker.bindPopup(`
      <div class="text-center">
        <strong class="text-blue-700">🚛 Current Position</strong><br/>
        <span class="text-sm">${driver}</span><br/>
        ${driverPosition.speedKmh ? `<span class="text-xs">Speed: ${driverPosition.speedKmh.toFixed(1)} km/h</span><br/>` : ''}
        <span class="text-xs text-gray-500">Updated: ${timeDisplay}</span>
      </div>
    `)

    driverMarkerRef.current = driverMarker

    // Add pulse animation style if not exists
    if (!document.getElementById('pulse-animation')) {
      const style = document.createElement('style')
      style.id = 'pulse-animation'
      style.textContent = `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `
      document.head.appendChild(style)
    }
  }, [driverPosition, driver])

  useEffect(() => {
    if (!mapInitializedRef.current || !mapRef.current) return

    const L = (window as any).L
    if (!L) return

    // Remove all tile layers
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current.removeLayer(layer)
      }
    })

    // Add the selected layer
    if (mapType === 'standard') {
      standardLayerRef.current?.addTo(mapRef.current)
    } else {
      satelliteLayerRef.current?.addTo(mapRef.current)
    }
  }, [mapType])

  useEffect(() => {
    // Check if coordinates are valid
    if (!hasValidCoordinates) {
      setError('Invalid GPS coordinates. Please ensure the locations have valid latitude and longitude values.')
      setIsLoading(false)
      return
    }

    // Small delay to ensure DOM is ready
    const initDelay = setTimeout(() => {
      // Load Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const initMap = () => {
        try {
          const L = (window as any).L
          if (!L) {
            setError('Map library failed to load. Please refresh the page.')
            setIsLoading(false)
            return
          }

          const mapElement = document.getElementById('map')
          if (!mapElement) {
            console.error('Map element not found in DOM')
            setError('Map container not found. Please refresh the page.')
            setIsLoading(false)
            return
          }

        // Clean up existing map
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
          mapInitializedRef.current = false
          standardLayerRef.current = null
          satelliteLayerRef.current = null
        }

        mapElement.innerHTML = ''

        // Calculate center point between start and destination
        const centerLat = (startLat + destLat) / 2
        const centerLng = (startLng + destLng) / 2

        // Create map
        const map = L.map('map').setView([centerLat, centerLng], 13)
        mapRef.current = map

      // Create tile layers
      const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      })
      standardLayerRef.current = standardLayer

      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
      })
      satelliteLayerRef.current = satelliteLayer

      // Add the selected layer
      if (mapType === 'standard') {
        standardLayer.addTo(map)
      } else {
        satelliteLayer.addTo(map)
      }

      // Draw route line
      const routeLine = L.polyline(
        [[startLat, startLng], [destLat, destLng]],
        {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 5'
        }
      ).addTo(map)

      // Create custom icons
      const startIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="position: relative;">
            <div style="
              background: #10b981;
              border: 3px solid white;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="color: white; font-size: 14px; font-weight: bold;">S</span>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
      })

      const destIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="position: relative;">
            <div style="
              background: #ef4444;
              border: 3px solid white;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="color: white; font-size: 14px; font-weight: bold;">D</span>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
      })

      // Add markers
      L.marker([startLat, startLng], { icon: startIcon })
        .addTo(map)
        .bindPopup(`
          <div class="text-center">
            <strong class="text-green-700">Start Location</strong><br/>
            <span class="text-sm">${startName}</span><br/>
            <span class="text-xs text-gray-500">${startLat.toFixed(4)}, ${startLng.toFixed(4)}</span>
          </div>
        `)

      L.marker([destLat, destLng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`
          <div class="text-center">
            <strong class="text-red-700">Destination</strong><br/>
            <span class="text-sm">${destName}</span><br/>
            <span class="text-xs text-gray-500">${destLat.toFixed(4)}, ${destLng.toFixed(4)}</span>
          </div>
        `)

      // Fit map to show both markers
      map.fitBounds(routeLine.getBounds(), { padding: [50, 50] })

        mapInitializedRef.current = true
        setIsLoading(false)
      } catch (err: any) {
        console.error('Error initializing map:', err)
        setError(`Failed to load map: ${err.message || 'Unknown error'}`)
        setIsLoading(false)
      }
    }

      // Load Leaflet JS
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script')
        script.id = 'leaflet-js'
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = initMap
        script.onerror = () => {
          setError('Failed to load map library. Please check your internet connection.')
          setIsLoading(false)
        }
        document.body.appendChild(script)
      } else if ((window as any).L) {
        initMap()
      }
    }, 100) // Wait 100ms for DOM to be ready

    return () => {
      clearTimeout(initDelay)
    }
  }, [startLat, startLng, destLat, destLng, startName, destName, mapType, hasValidCoordinates])

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
      <VerticalSidebar activePage="tasks" />
      <main className="flex-1 relative p-4">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
          <div className="flex items-center justify-between pointer-events-auto">
            <Link
              href="/tasks"
              className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <FiArrowLeft className="h-5 w-5 text-gray-700" />
              <span className="text-sm font-medium text-gray-700">Back to Tasks</span>
            </Link>

            {/* Map Type Toggle */}
            <button
              onClick={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
              className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
              title={mapType === 'standard' ? 'Switch to Satellite View' : 'Switch to Standard View'}
            >
              {mapType === 'standard' ? (
                <>
                  <FiGlobe className="h-5 w-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-700">Satellite</span>
                </>
              ) : (
                <>
                  <FiMaximize2 className="h-5 w-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-700">Standard</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white rounded-2xl shadow-sm absolute inset-4 z-0 overflow-hidden">
          {/* Always render the map div but hide it when loading/error */}
          <div
            id="map"
            style={{ 
              height: '100%', 
              width: '100%',
              display: isLoading || error ? 'none' : 'block'
            }}
          />
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading route map...</p>
              </div>
            </div>
          )}
          
          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center max-w-md p-6">
                <FiMapPin className="mx-auto h-12 w-12 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Map</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Link
                  href="/tasks"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiArrowLeft className="h-4 w-4" />
                  Back to Tasks
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Route Info Panel */}
        {!isLoading && !error && hasValidCoordinates && (
          <div className="absolute bottom-4 right-4 z-10 w-96 pointer-events-none">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 pointer-events-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiNavigation className="h-5 w-5 text-blue-600" />
              Route Information
            </h3>

            {/* Truck & Driver Info */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <FiTruck className="h-4 w-4" />
                <span className="font-medium">Assigned Truck</span>
              </div>
              <p className="text-base font-semibold text-gray-900">{truck}</p>
              {driver && (
                <>
                  <p className="text-xs text-gray-500 mt-1">Driver: {driver}</p>
                  {isLoadingPosition && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                      Fetching live position...
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Current Position (if available) */}
            {driverPosition && (
              <div className="mb-4 pb-4 border-b border-gray-200 bg-blue-50 -mx-4 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
                  <span className="text-lg">🚛</span>
                  <span className="font-semibold">Live Position</span>
                  <span className="ml-auto text-xs bg-blue-200 px-2 py-0.5 rounded-full">LIVE</span>
                </div>
                <p className="text-xs text-gray-600 font-mono ml-7">
                  {driverPosition.latitude.toFixed(4)}, {driverPosition.longitude.toFixed(4)}
                </p>
                {driverPosition.speedKmh !== undefined && (
                  <p className="text-xs text-gray-600 ml-7 mt-1">
                    Speed: <span className="font-semibold">{driverPosition.speedKmh.toFixed(1)} km/h</span>
                  </p>
                )}
                <p className="text-xs text-gray-500 ml-7 mt-1">
                  Remaining: <span className="font-semibold">
                    {(() => {
                      const remaining = calculateDistance(
                        driverPosition.latitude,
                        driverPosition.longitude,
                        destLat,
                        destLng
                      )
                      return remaining < 1000 
                        ? `${Math.round(remaining)} m` 
                        : `${(remaining / 1000).toFixed(2)} km`
                    })()}
                  </span>
                </p>
              </div>
            )}

            {/* Total Route Distance */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <FiMapPin className="h-4 w-4" />
                <span className="font-medium">Total Route Distance</span>
              </div>
              <p className="text-base font-semibold text-gray-900">
                {distance < 1000 
                  ? `${Math.round(distance)} m` 
                  : `${(distance / 1000).toFixed(2)} km`}
              </p>
            </div>

            {/* Start Location */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Start Location</span>
              </div>
              <p className="text-sm text-gray-900 ml-5">{startName}</p>
              <p className="text-xs text-gray-500 font-mono ml-5">
                {startLat.toFixed(4)}, {startLng.toFixed(4)}
              </p>
            </div>

            {/* Destination */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Destination</span>
              </div>
              <p className="text-sm text-gray-900 ml-5">{destName}</p>
              <p className="text-xs text-gray-500 font-mono ml-5">
                {destLat.toFixed(4)}, {destLng.toFixed(4)}
              </p>
            </div>
          </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function TrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <TrackingContent />
    </Suspense>
  )
}

