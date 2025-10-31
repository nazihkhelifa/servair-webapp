'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { FiClock, FiMapPin, FiGlobe, FiMaximize2, FiTruck, FiNavigation, FiArrowLeft } from 'react-icons/fi'
import { MdLocationOn, MdSpeed } from 'react-icons/md'
import Link from 'next/link'
import VerticalSidebar from '../../components/VerticalSidebar'

type TrackingPoint = {
  trackingId?: string
  driverId?: string
  truckId?: string
  latitude: number
  longitude: number
  speedKmh?: number | null
  heading?: number | null
  timestamp: number
  accuracy?: number
}

interface Assignment {
  id: string
  title: string
  truck: string
  driver: string
  startLocation: string
  destination: string
  airport: string
  // Optional scheduling fields returned by /api/assignments
  startDate?: string
  startTime?: string
  dueDateOnly?: string
  dueTime?: string
}

interface Location {
  id: string
  name: string
  latitude: number | null
  longitude: number | null
  geofence?: Array<{ lat: number, lng: number }> | null
}

interface DriverPosition {
  latitude: number
  longitude: number
  timestamp: number
  speedKmh?: number
  accuracy?: number // GPS accuracy in meters
}

function MapContent() {
  const searchParams = useSearchParams()
  const assignmentId = searchParams.get('assignmentId')
  
  const [allUsers, setAllUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [userTrackingData, setUserTrackingData] = useState<TrackingPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard')
  
  // Assignment route states
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [startLocation, setStartLocation] = useState<Location | null>(null)
  const [destLocation, setDestLocation] = useState<Location | null>(null)
  const [driverPosition, setDriverPosition] = useState<DriverPosition | null>(null)
  const [driverHistory, setDriverHistory] = useState<DriverPosition[]>([])
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ lat: number, lng: number }>>([])
  const [routeInfo, setRouteInfo] = useState<{ totalDistanceMeters?: number | null; etaMinutes?: number | null } | null>(null)
  
  const mapRef = useRef<any>(null)
  const standardLayerRef = useRef<any>(null)
  const satelliteLayerRef = useRef<any>(null)
  const mapInitializedRef = useRef(false)
  const driverMarkerRef = useRef<any>(null)
  const accuracyCircleRef = useRef<any>(null)
  const historyPathRef = useRef<any>(null)
  const historyMarkersRef = useRef<any[]>([])

  // Load assignment data if assignmentId is provided
  useEffect(() => {
    if (!assignmentId) return

    const loadAssignmentData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch assignment
        const assignmentResponse = await fetch('/api/assignments')
        if (assignmentResponse.ok) {
          const assignments = await assignmentResponse.json()
          console.log('All assignments:', assignments.length, 'Looking for:', assignmentId)
          const foundAssignment = assignments.find((a: any) => a.id === assignmentId)
          
          if (foundAssignment) {
            console.log('✅ Assignment loaded:', foundAssignment)
            setAssignment(foundAssignment)
            
            // Fetch locations for this airport
            const locationsResponse = await fetch(`/api/locations?airport=${foundAssignment.airport}`)
            if (locationsResponse.ok) {
              const locations = await locationsResponse.json()
              
              const start = locations.find((l: any) => l.name === foundAssignment.startLocation)
              const dest = locations.find((l: any) => l.name === foundAssignment.destination)
              
              console.log('Start location:', start)
              console.log('Destination location:', dest)
              
              setStartLocation(start || null)
              setDestLocation(dest || null)
            }
            // Fetch computed route for this assignment
            try {
              const routeRes = await fetch(`/api/routes?assignmentId=${encodeURIComponent(assignmentId)}`)
              if (routeRes.ok) {
                const routes = await routeRes.json()
                if (Array.isArray(routes) && routes.length > 0) {
                  // pick the most recent route (computedAt desc)
                  routes.sort((a: any, b: any) => (new Date(b.computedAt || 0).getTime()) - (new Date(a.computedAt || 0).getTime()))
                  const chosen = routes[0]
                  if (Array.isArray(chosen.pathCoordinates) && chosen.pathCoordinates.length > 1) {
                    setRouteCoordinates(chosen.pathCoordinates)
                    console.log('✅ Loaded route with', chosen.pathCoordinates.length, 'points')
                  } else {
                    setRouteCoordinates([])
                  }
                  setRouteInfo({ totalDistanceMeters: chosen.totalDistanceMeters ?? null, etaMinutes: chosen.eta?.totalMinutes ?? null })
                } else {
                  setRouteCoordinates([])
                  setRouteInfo(null)
                }
              }
            } catch (e) {
              console.warn('Failed to load route for assignment:', e)
              setRouteInfo(null)
            }
            
            // Fetch driver position and history if available
            if (foundAssignment.driver) {
              console.log('Fetching GPS for driver:', foundAssignment.driver)
              const gpsResponse = await fetch(`/api/tracking?driverId=${encodeURIComponent(foundAssignment.driver)}`)
              if (gpsResponse.ok) {
                const gpsData = await gpsResponse.json()
                console.log('GPS data received:', gpsData.length, 'points')
                if (gpsData.length > 0) {
                  // Get the latest position
                  const latest = gpsData[0]
                  const position = {
                    latitude: latest.latitude,
                    longitude: latest.longitude,
                    timestamp: latest.timestamp || Date.now(),
                    speedKmh: latest.speedKmh,
                    accuracy: latest.accuracy // GPS accuracy in meters
                  }
                  console.log('Setting driver position:', position)
                  setDriverPosition(position)
                  
                  // Get the last 5 positions for historical path
                  const last5 = gpsData.slice(0, 5).map((point: any) => ({
                    latitude: point.latitude,
                    longitude: point.longitude,
                    timestamp: point.timestamp || Date.now(),
                    speedKmh: point.speedKmh,
                    accuracy: point.accuracy
                  }))
                  console.log('Setting driver history:', last5.length, 'points')
                  setDriverHistory(last5)
                } else {
                  console.log('No GPS data found for driver')
                }
              } else {
                console.error('Failed to fetch GPS data:', gpsResponse.status)
              }
            } else {
              console.log('No driver assigned to this assignment')
            }
          } else {
            console.error('❌ Assignment not found with ID:', assignmentId)
          }
        } else {
          console.error('❌ Failed to fetch assignments:', assignmentResponse.status)
        }
      } catch (error) {
        console.error('❌ Error loading assignment data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAssignmentData()
    
    // Refresh driver position and history every 30 seconds
    const interval = setInterval(async () => {
      if (assignment?.driver) {
        try {
          const gpsResponse = await fetch(`/api/tracking?driverId=${encodeURIComponent(assignment.driver)}`)
          if (gpsResponse.ok) {
            const gpsData = await gpsResponse.json()
            if (gpsData.length > 0) {
              const latest = gpsData[0]
              console.log('Refreshed driver position:', latest)
              setDriverPosition({
                latitude: latest.latitude,
                longitude: latest.longitude,
                timestamp: latest.timestamp || Date.now(),
                speedKmh: latest.speedKmh,
                accuracy: latest.accuracy
              })
              
              // Update history with last 5 points
              const last5 = gpsData.slice(0, 5).map((point: any) => ({
                latitude: point.latitude,
                longitude: point.longitude,
                timestamp: point.timestamp || Date.now(),
                speedKmh: point.speedKmh,
                accuracy: point.accuracy
              }))
              setDriverHistory(last5)
            }
          }
        } catch (error) {
          console.error('Error refreshing driver position:', error)
        }
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [assignmentId, assignment?.driver])

  useEffect(() => {
    if (assignmentId) return // Skip user tracking mode if viewing an assignment
    
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/tracking?type=latest')
        if (!response.ok) throw new Error('Failed to load users')
        const latestTracking = await response.json()
        const users = latestTracking
          .map((item: any) => item.driverId || item.truckId || item.trackingId)
          .filter((id: string | undefined) => Boolean(id))
        const uniqueUsers = Array.from(new Set(users)) as string[]
        setAllUsers(uniqueUsers)
        if (uniqueUsers.length > 0 && !selectedUser) {
          setSelectedUser(uniqueUsers[0])
        }
      } catch (error) {
        console.error('Error loading users:', error)
      }
    }
    loadUsers()
  }, [selectedUser, assignmentId])

  useEffect(() => {
    if (!selectedUser) return

    const loadTrackingData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/tracking?driverId=${encodeURIComponent(selectedUser)}`)
        if (!response.ok) throw new Error('Failed to load tracking data')
        const data = await response.json()
        const normalized: TrackingPoint[] = data
          .map((point: any) => ({
            trackingId: point.trackingId,
            driverId: point.driverId,
            truckId: point.truckId,
            latitude: point.latitude,
            longitude: point.longitude,
            speedKmh: typeof point.speedKmh === 'number' ? point.speedKmh : null,
            heading: typeof point.heading === 'number' ? point.heading : null,
            timestamp: typeof point.timestamp === 'number' ? point.timestamp : Date.now(),
            accuracy: typeof point.accuracy === 'number' ? point.accuracy : undefined
          }))
          .filter((point: TrackingPoint) =>
            typeof point.latitude === 'number' && typeof point.longitude === 'number'
          )
        setUserTrackingData(normalized.sort((a, b) => b.timestamp - a.timestamp))
      } catch (error) {
        console.error('Error loading tracking data:', error)
        setUserTrackingData([])
      } finally {
        setIsLoading(false)
      }
    }

    loadTrackingData()
  }, [selectedUser])

  useEffect(() => {
    if (!mapInitializedRef.current || !mapRef.current) return

    const L = (window as any).L
    if (!L) return

    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current.removeLayer(layer)
      }
    })

    if (mapType === 'standard') {
      standardLayerRef.current?.addTo(mapRef.current)
    } else {
      satelliteLayerRef.current?.addTo(mapRef.current)
    }
  }, [mapType])

  // Initialize map for assignment route mode
  useEffect(() => {
    if (!assignmentId || !startLocation || !destLocation) return
    if (!startLocation.latitude || !destLocation.latitude) return

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const initAssignmentMap = () => {
      const L = (window as any).L
      if (!L) return

      const mapElement = document.getElementById('map')
      if (!mapElement) return

      // Clean up existing map
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        mapInitializedRef.current = false
        standardLayerRef.current = null
        satelliteLayerRef.current = null
      }

      mapElement.innerHTML = ''

      // Calculate center point
      const centerLat = (startLocation.latitude! + destLocation.latitude!) / 2
      const centerLng = (startLocation.longitude! + destLocation.longitude!) / 2

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

      // Draw route polyline (prefer computed route; fallback to straight line)
      let routeLine: any
      if (Array.isArray(routeCoordinates) && routeCoordinates.length > 1) {
        const coords = routeCoordinates.map(p => [p.lat, p.lng]) as [number, number][]
        routeLine = L.polyline(coords, { color: '#3b82f6', weight: 4, opacity: 0.85 }).addTo(map)
      } else {
        routeLine = L.polyline(
          [[startLocation.latitude!, startLocation.longitude!], [destLocation.latitude!, destLocation.longitude!]],
          { color: '#3b82f6', weight: 4, opacity: 0.7, dashArray: '10, 5' }
        ).addTo(map)
      }

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
      L.marker([startLocation.latitude!, startLocation.longitude!], { icon: startIcon })
        .addTo(map)
        .bindPopup(`
          <div class="text-center">
            <strong class="text-green-700">Start Location</strong><br/>
            <span class="text-sm">${startLocation.name}</span><br/>
            <span class="text-xs text-gray-500">${startLocation.latitude!.toFixed(4)}, ${startLocation.longitude!.toFixed(4)}</span>
          </div>
        `)

      L.marker([destLocation.latitude!, destLocation.longitude!], { icon: destIcon })
        .addTo(map)
        .bindPopup(`
          <div class="text-center">
            <strong class="text-red-700">Destination</strong><br/>
            <span class="text-sm">${destLocation.name}</span><br/>
            <span class="text-xs text-gray-500">${destLocation.latitude!.toFixed(4)}, ${destLocation.longitude!.toFixed(4)}</span>
          </div>
        `)

      // Draw geofences if available
      const bounds = routeLine.getBounds()
      if (Array.isArray(startLocation.geofence) && startLocation.geofence.length > 2) {
        const startPoly = L.polygon(startLocation.geofence.map(p => [p.lat, p.lng]), {
          color: '#10b981', weight: 2, fillOpacity: 0.15
        }).addTo(map)
        bounds.extend(startPoly.getBounds())
      }
      if (Array.isArray(destLocation.geofence) && destLocation.geofence.length > 2) {
        const destPoly = L.polygon(destLocation.geofence.map(p => [p.lat, p.lng]), {
          color: '#ef4444', weight: 2, fillOpacity: 0.15
        }).addTo(map)
        bounds.extend(destPoly.getBounds())
      }

      // Fit map to include route and geofences (driver marker added separately)
      map.fitBounds(bounds, { padding: [50, 50] })

      mapInitializedRef.current = true
      setIsLoading(false)
    }

    // Load Leaflet JS
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = initAssignmentMap
      document.body.appendChild(script)
    } else if ((window as any).L) {
      initAssignmentMap()
    }
  }, [assignmentId, startLocation, destLocation, mapType, assignment?.driver, routeCoordinates])

  // Update driver marker when position changes
  useEffect(() => {
    if (!assignmentId) return
    if (!mapInitializedRef.current || !mapRef.current || !driverPosition) {
      console.log('Driver marker update skipped:', {
        assignmentId: !!assignmentId,
        mapInitialized: mapInitializedRef.current,
        mapRef: !!mapRef.current,
        driverPosition: !!driverPosition
      })
      return
    }

    console.log('Updating driver marker at position:', driverPosition)

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

    const timeAgo = Math.round((Date.now() - driverPosition.timestamp) / 1000)
    const timeDisplay = timeAgo < 60 
      ? `${timeAgo} seconds ago` 
      : `${Math.round(timeAgo / 60)} minutes ago`

    // Add driver marker
    const driverMarker = L.marker(
      [driverPosition.latitude, driverPosition.longitude],
      { icon: truckIcon }
    ).addTo(mapRef.current)

    driverMarker.bindPopup(`
      <div class="text-center">
        <strong class="text-blue-700">🚛 Current Position</strong><br/>
        <span class="text-sm">${assignment?.driver || 'Driver'}</span><br/>
        ${driverPosition.speedKmh ? `<span class="text-xs">Speed: ${driverPosition.speedKmh.toFixed(1)} km/h</span><br/>` : ''}
        ${driverPosition.accuracy ? `<span class="text-xs text-blue-600">Accuracy: ±${driverPosition.accuracy.toFixed(1)}m</span><br/>` : ''}
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
  }, [driverPosition, assignment?.driver, assignmentId])

  // Draw accuracy circle around current driver position
  useEffect(() => {
    if (!assignmentId) return
    if (!mapInitializedRef.current || !mapRef.current) return
    if (!driverPosition) return

    const L = (window as any).L
    if (!L) return

    // Remove existing accuracy circle
    if (accuracyCircleRef.current) {
      mapRef.current.removeLayer(accuracyCircleRef.current)
      accuracyCircleRef.current = null
    }

    // Draw accuracy circle if accuracy is available
    if (driverPosition.accuracy && driverPosition.accuracy > 0) {
      console.log(`Drawing accuracy circle with radius ${driverPosition.accuracy}m`)
      
      const accuracyCircle = L.circle(
        [driverPosition.latitude, driverPosition.longitude],
        {
          radius: driverPosition.accuracy, // radius in meters
          color: '#3b82f6',
          fillColor: '#60a5fa',
          fillOpacity: 0.1,
          weight: 2,
          opacity: 0.4,
          dashArray: '5, 5'
        }
      ).addTo(mapRef.current)

      accuracyCircle.bindPopup(`
        <div class="text-center">
          <strong class="text-blue-700">GPS Accuracy</strong><br/>
          <span class="text-sm">±${driverPosition.accuracy.toFixed(1)} meters</span><br/>
          <span class="text-xs text-gray-500">The driver's actual position is within this circle</span>
        </div>
      `)

      accuracyCircleRef.current = accuracyCircle
    }
  }, [driverPosition, assignmentId])

  // Draw historical path for driver's last 5 positions
  useEffect(() => {
    if (!assignmentId) return
    if (!mapInitializedRef.current || !mapRef.current) return
    if (driverHistory.length < 2) return // Need at least 2 points for a path

    const L = (window as any).L
    if (!L) return

    console.log('Drawing historical path with', driverHistory.length, 'points')

    // Remove existing path and markers
    if (historyPathRef.current) {
      mapRef.current.removeLayer(historyPathRef.current)
      historyPathRef.current = null
    }
    historyMarkersRef.current.forEach(marker => {
      if (marker) mapRef.current.removeLayer(marker)
    })
    historyMarkersRef.current = []

    // Draw path connecting historical points
    const pathCoordinates = driverHistory.map(point => [point.latitude, point.longitude])
    const historyPath = L.polyline(pathCoordinates as [number, number][], {
      color: '#22c55e',
      weight: 3,
      opacity: 0.7,
      dashArray: '5, 10'
    }).addTo(mapRef.current)
    
    historyPathRef.current = historyPath

    // Add small markers for historical points (except the latest which has the truck marker)
    driverHistory.slice(1).forEach((point, index) => {
      const pointNumber = index + 2 // Start from 2 since index 0 is the current position
      const opacity = 1 - (pointNumber * 0.15) // Fade older points
      
      const historyIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="position: relative;">
            <div style="
              background: rgba(34, 197, 94, ${opacity});
              border: 2px solid white;
              border-radius: 50%;
              width: 12px;
              height: 12px;
              box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
            "></div>
          </div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -6]
      })

      const timeAgo = Math.round((Date.now() - point.timestamp) / 1000)
      const timeDisplay = timeAgo < 60 
        ? `${timeAgo} seconds ago` 
        : `${Math.round(timeAgo / 60)} minutes ago`

      const marker = L.marker([point.latitude, point.longitude], { icon: historyIcon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div class="text-center">
            <strong class="text-green-700">Historical Position #${pointNumber}</strong><br/>
            ${point.speedKmh ? `<span class="text-xs">Speed: ${point.speedKmh.toFixed(1)} km/h</span><br/>` : ''}
            <span class="text-xs text-gray-500">${timeDisplay}</span>
          </div>
        `)
      
      historyMarkersRef.current.push(marker)
    })
  }, [driverHistory, assignmentId])

  useEffect(() => {
    if (assignmentId) return // Skip if in assignment mode
    if (userTrackingData.length === 0) return

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const initMap = () => {
      const L = (window as any).L
      if (!L) return

      const mapElement = document.getElementById('map')
      if (!mapElement) return

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        mapInitializedRef.current = false
        standardLayerRef.current = null
        satelliteLayerRef.current = null
      }

      mapElement.innerHTML = ''

      const startingPoint = userTrackingData[0]
      const map = L.map('map').setView([startingPoint.latitude, startingPoint.longitude], 13)
      mapRef.current = map

      const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      })
      standardLayerRef.current = standardLayer

      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
      })
      satelliteLayerRef.current = satelliteLayer

      if (mapType === 'standard') {
        standardLayer.addTo(map)
      } else {
        satelliteLayer.addTo(map)
      }

      const pathCoordinates = userTrackingData.map((point) => [point.latitude, point.longitude])
      const polyline = L.polyline(pathCoordinates as [number, number][], {
        color: '#007AFF',
        weight: 3,
        opacity: 0.7
      }).addTo(map)

      const startPoint = userTrackingData[userTrackingData.length - 1]
      const endPoint = userTrackingData[0]

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div style="background: #007AFF; border: 3px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })

      L.marker([startPoint.latitude, startPoint.longitude], {
        icon: customIcon
      }).addTo(map).bindPopup('📍 Start')

      L.marker([endPoint.latitude, endPoint.longitude], {
        icon: customIcon
      }).addTo(map).bindPopup(`📍 Current Position<br>Updated: ${new Date(endPoint.timestamp).toLocaleString()}`)

      map.fitBounds(polyline.getBounds())

      mapInitializedRef.current = true

      // Draw accuracy circle for current position if available
      if (typeof endPoint.accuracy === 'number' && endPoint.accuracy > 0) {
        const accuracyCircle = L.circle(
          [endPoint.latitude, endPoint.longitude],
          {
            radius: endPoint.accuracy,
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.1,
            weight: 2,
            opacity: 0.4,
            dashArray: '5, 5'
          }
        ).addTo(map)
        accuracyCircle.bindPopup(`±${endPoint.accuracy.toFixed(1)} meters`)
      }
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = initMap
      document.body.appendChild(script)
    } else if ((window as any).L) {
      initMap()
    }
  }, [mapType, userTrackingData])

  const latestLocation = useMemo(() => userTrackingData[0] ?? null, [userTrackingData])

  const displaySpeed = (point?: TrackingPoint | null) => {
    if (!point) return 'N/A'
    if (typeof point.speedKmh === 'number') return `${point.speedKmh.toFixed(1)} km/h`
    return 'N/A'
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F5' }}>
      <VerticalSidebar activePage="map" />
      <main className="flex-1 relative p-4">
        {/* Header for Assignment Mode */}
        {assignmentId && assignment && (
          <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
            <div className="flex items-center justify-between pointer-events-auto">
              <Link
                href="/tasks"
                className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <FiArrowLeft className="h-5 w-5 text-gray-700" />
                <span className="text-sm font-medium text-gray-700">Back to Tasks</span>
              </Link>

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
        )}

        <div className="bg-white rounded-2xl shadow-sm absolute inset-4 z-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          ) : assignmentId ? (
            // Assignment Mode - Always show map
          <div
            id="map"
            style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}
          >
            {/* Floating Route Info Panel */}
            <div className="absolute bottom-4 right-4 z-[1000]">
              <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 px-4 py-3 min-w-[260px]">
                <div className="text-xs text-gray-500 mb-2">Assignment</div>
                <div className="text-sm font-semibold text-gray-900 mb-1 truncate">{assignment?.title || 'Assignment'}</div>
                <div className="text-xs text-gray-600 mb-3">
                  <div>Airport: <span className="font-medium">{assignment?.airport}</span></div>
                  <div>From: <span className="font-medium">{startLocation?.name || '-'}</span></div>
                  <div>To: <span className="font-medium">{destLocation?.name || '-'}</span></div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                    ETA: {routeInfo?.etaMinutes != null ? Math.round(routeInfo.etaMinutes) + 'm' : '—'}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                    {(routeInfo?.totalDistanceMeters != null ? (routeInfo.totalDistanceMeters/1000).toFixed(1) : '—')} km
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-2">
                  <div>Start: {assignment?.startDate} {assignment?.startTime}</div>
                  <div>Due: {assignment?.dueDateOnly} {assignment?.dueTime}</div>
                </div>
              </div>
            </div>
          </div>
          ) : selectedUser && userTrackingData.length > 0 ? (
            // Tracking Mode - Show map with user tracking
            <div
              id="map"
              style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}
            >
              <div className="absolute bottom-4 left-4 z-[1000]">
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
          ) : (
            // No data mode
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FiMapPin className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-sm font-medium text-gray-900">
                  {selectedUser ? 'No tracking data available' : 'Please select a user'}
                </h3>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Right Sidebar - Only show in tracking mode */}
      {!assignmentId && (
        <div className="absolute top-8 right-8 bottom-8 w-80 pointer-events-none" style={{ zIndex: 1000 }}>
          <div className="h-full flex flex-col justify-between pointer-events-auto gap-4">
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Select User to Track</label>
                <select
                  value={selectedUser}
                  onChange={(event) => setSelectedUser(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Select User --</option>
                  {allUsers.map((userId) => (
                    <option key={userId} value={userId}>
                      {userId}
                    </option>
                  ))}
                </select>
              </div>
              {latestLocation && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Latest Location</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MdLocationOn className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Coordinates</p>
                      <p className="text-xs font-medium text-gray-900 font-mono">
                        {latestLocation.latitude.toFixed(6)}, {latestLocation.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <FiClock className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Last Update</p>
                      <p className="text-xs font-medium text-gray-900">
                        {new Date(latestLocation.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <MdSpeed className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Speed</p>
                      <p className="text-xs font-medium text-gray-900">{displaySpeed(latestLocation)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {!isLoading && selectedUser && userTrackingData.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-h-96 flex flex-col">
              <div className="p-4 border-b">
                <h3 className="text-sm font-semibold text-gray-900">Tracking History ({userTrackingData.length})</h3>
              </div>
              <div className="overflow-y-auto flex-1">
                <div className="divide-y divide-gray-100">
                  {userTrackingData.slice(0, 10).map((point) => (
                    <div key={`${point.trackingId || point.timestamp}`} className="p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="text-xs text-gray-900 font-medium">
                            {new Date(point.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {typeof point.speedKmh === 'number' && (
                          <span className="text-xs text-gray-500">{point.speedKmh.toFixed(1)} km/h</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono">
                        {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <MapContent />
    </Suspense>
  )
}
