'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import { FiSearch } from 'react-icons/fi'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false }) as any
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false }) as any
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false }) as any
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false }) as any
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false }) as any
const FeatureGroup = dynamic(() => import('react-leaflet').then(m => m.FeatureGroup), { ssr: false }) as any
const EditControl = dynamic(() => import('react-leaflet-draw').then(m => m.EditControl), { ssr: false }) as any
const GeoJSON = dynamic(() => import('react-leaflet').then(m => m.GeoJSON), { ssr: false }) as any

type LocationDoc = {
  id: string
  name: string
  airport: string
  type: string
  description?: string | null
  latitude: number | null
  longitude: number | null
  geofence?: Array<{ lat: number, lng: number }>
}

export default function AdminLocationsPage() {
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<LocationDoc[]>([])
  const [airport, setAirport] = useState<'ALL' | 'CDG' | 'ORY'>('ALL')
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<Record<string, { lat?: number, lng?: number, geofence?: Array<{ lat: number, lng: number }> }>>({})
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [baseLayer, setBaseLayer] = useState<'street' | 'sat'>('street')
  const [showRoads, setShowRoads] = useState(false)
  const [roadsData, setRoadsData] = useState<any | null>(null)
  const [roadsLoading, setRoadsLoading] = useState(false)
  const [roadsError, setRoadsError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<{ name: string, airport: 'CDG' | 'ORY', type: 'start' | 'destination', description?: string }>(
    { name: '', airport: 'CDG', type: 'destination', description: '' }
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/locations')
        const data = await res.json()
        if (res.ok) {
          setLocations(data)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let list = locations
    if (airport !== 'ALL') list = list.filter(l => l.airport === airport)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(l => l.name?.toLowerCase().includes(q))
    }
    return list
  }, [locations, airport, query])

  // Load private roads GeoJSON when toggled on and airport selected
  useEffect(() => {
    const loadRoads = async () => {
      setRoadsError(null)
      setRoadsData(null)
      if (!showRoads) return
      if (airport === 'ALL') { setRoadsError('Select an airport to view private roads'); return }
      setRoadsLoading(true)
      try {
        const cdgUrl = process.env.NEXT_PUBLIC_PRIVATE_ROADS_CDG_URL || '/private_roads/cdg.geojson'
        const oryUrl = process.env.NEXT_PUBLIC_PRIVATE_ROADS_ORY_URL || '/private_roads/ory.geojson'
        const url = airport === 'CDG' ? cdgUrl : oryUrl
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to load roads (${res.status})`)
        const gj = await res.json()
        setRoadsData(gj)
      } catch (e: any) {
        setRoadsError(e?.message || 'Failed to load private roads')
      } finally {
        setRoadsLoading(false)
      }
    }
    loadRoads()
  }, [showRoads, airport])

  const updatePosition = (id: string, lat: number, lng: number) => {
    // local update and mark as pending
    setLocations(prev => prev.map(l => l.id === id ? { ...l, latitude: lat, longitude: lng } : l))
    setPending(prev => ({ ...prev, [id]: { lat, lng } }))
  }

  const saveUpdates = async () => {
    const entries = Object.entries(pending)
    if (entries.length === 0) return
    setSaving(true)
    try {
      await Promise.all(entries.map(([id, change]) => fetch(`/api/locations?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(typeof change.lat === 'number' ? { latitude: change.lat } : {}),
          ...(typeof change.lng === 'number' ? { longitude: change.lng } : {}),
          ...(change.geofence ? { geofence: change.geofence } : {})
        })
      })))
      setPending({})
    } finally {
      setSaving(false)
    }
  }

  const renameLocation = async (id: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    await fetch(`/api/locations?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: trimmed }) })
    setLocations(prev => prev.map(l => l.id === id ? { ...l, name: trimmed } : l))
  }

  const deleteLocation = async (id: string) => {
    await fetch(`/api/locations?id=${id}`, { method: 'DELETE' })
    setLocations(prev => prev.filter(l => l.id !== id))
    setPending(prev => { const cp = { ...prev }; delete cp[id]; return cp })
    if (selectedId === id) setSelectedId(null)
  }

  const createLocation = async () => {
    const body = { ...createForm, name: createForm.name.trim(), description: createForm.description?.trim() || null }
    if (!body.name) return
    const res = await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const json = await res.json()
      const newLoc: LocationDoc = {
        id: json.id,
        name: body.name,
        airport: body.airport,
        type: body.type,
        description: body.description || null,
        latitude: null,
        longitude: null,
        geofence: []
      }
      setLocations(prev => [newLoc, ...prev])
      setShowCreate(false)
      setCreateForm({ name: '', airport: createForm.airport, type: createForm.type, description: '' })
    }
  }

  const center = airport === 'CDG' ? [49.009, 2.547] : airport === 'ORY' ? [48.724, 2.38] : [48.9, 2.48]

  const pendingCount = Object.keys(pending).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Airport</label>
            <select value={airport} onChange={(e) => setAirport(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="ALL">All</option>
              <option value="CDG">CDG</option>
              <option value="ORY">ORY</option>
            </select>
          </div>
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by gate/name..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setBaseLayer('street')} className={`px-3 py-2 text-sm rounded-l-lg border ${baseLayer==='street'?'bg-gray-800 text-white border-gray-800':'bg-white text-gray-700 border-gray-300'}`}>Street</button>
            <button onClick={() => setBaseLayer('sat')} className={`px-3 py-2 text-sm rounded-r-lg border ${baseLayer==='sat'?'bg-gray-800 text-white border-gray-800':'bg-white text-gray-700 border-gray-300'}`}>Satellite</button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRoads(v => !v)}
              className={`px-3 py-2 text-sm rounded-lg border ${showRoads ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300'}`}
              title="Toggle private service roads overlay"
            >
              {showRoads ? 'Hide Private Roads' : 'Show Private Roads'}{airport==='ALL' && ' (select airport)'}
            </button>
            {roadsLoading && <span className="text-xs text-gray-500">Loading roads…</span>}
            {roadsError && <span className="text-xs text-red-600">{roadsError}</span>}
          </div>
          {loading && <span className="text-sm text-gray-500">Loading...</span>}
          <span className={`px-2 py-1 rounded text-xs ${pendingCount > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
            Pending: {pendingCount}
          </span>
          <button
            onClick={saveUpdates}
            disabled={pendingCount === 0 || saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${pendingCount === 0 || saving ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            title="Save pending location changes"
          >
            {saving ? 'Saving…' : `Save updates (${pendingCount})`}
          </button>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700"
            title="Add a new location"
          >
            {showCreate ? 'Close' : 'Add location'}
          </button>
        </div>

        {showCreate && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Name</label>
                <input value={createForm.name} onChange={e=>setCreateForm(s=>({ ...s, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Gate K21" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Airport</label>
                <select value={createForm.airport} onChange={e=>setCreateForm(s=>({ ...s, airport: e.target.value as 'CDG'|'ORY' }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="CDG">CDG</option>
                  <option value="ORY">ORY</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Type</label>
                <select value={createForm.type} onChange={e=>setCreateForm(s=>({ ...s, type: e.target.value as 'start'|'destination' }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="start">Start</option>
                  <option value="destination">Destination</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Description</label>
                <input value={createForm.description} onChange={e=>setCreateForm(s=>({ ...s, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="optional" />
              </div>
              <div className="flex gap-2">
                <button onClick={createLocation} className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700">Create</button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Tip: Drag the marker later to set exact coordinates and draw a geofence.</p>
          </div>
        )}

        <div className="h-[70vh] w-full rounded-xl overflow-hidden border">
          <MapContainer center={center as any} zoom={12} style={{ height: '100%', width: '100%' }}>
            {baseLayer === 'street' ? (
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            ) : (
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
            )}
            <FeatureGroup>
              <EditControl
                position="topright"
                draw={{ marker: false, circle: false, circlemarker: false, rectangle: false, polyline: false, polygon: { allowIntersection: false, showArea: true } }}
                edit={{ remove: true }}
                onCreated={(e: any) => {
                  if (!selectedId) return
                  const layer = e.layer
                  const latlngs = layer.getLatLngs()?.[0] || []
                  const polygon = latlngs.map((p: any) => ({ lat: p.lat, lng: p.lng }))
                  setPending(prev => ({ ...prev, [selectedId]: { ...(prev[selectedId] || {}), geofence: polygon } }))
                }}
                onEdited={(e: any) => {
                  if (!selectedId) return
                  const layers = e.layers
                  layers.eachLayer((layer: any) => {
                    const latlngs = layer.getLatLngs()?.[0] || []
                    const polygon = latlngs.map((p: any) => ({ lat: p.lat, lng: p.lng }))
                    setPending(prev => ({ ...prev, [selectedId]: { ...(prev[selectedId] || {}), geofence: polygon } }))
                  })
                }}
                onDeleted={() => {
                  if (!selectedId) return
                  setPending(prev => ({ ...prev, [selectedId]: { ...(prev[selectedId] || {}), geofence: [] } }))
                }}
              />
            </FeatureGroup>
            {showRoads && roadsData && (
              <GeoJSON data={roadsData} style={() => ({ color: '#8b5cf6', weight: 2, opacity: 0.7 })} />
            )}
            {filtered.map((l) => (
              <DraggableMarker
                key={l.id}
                id={l.id}
                name={l.name}
                airport={l.airport}
                type={l.type}
                lat={typeof l.latitude === 'number' ? l.latitude : center[0]}
                lng={typeof l.longitude === 'number' ? l.longitude : center[1]}
                onDragEnd={updatePosition}
                isPending={!!pending[l.id]}
                onSelect={() => setSelectedId(l.id)}
                onRename={renameLocation}
                onDelete={deleteLocation}
              />
            ))}
            {filtered.map(l => (
              Array.isArray(l.geofence) && l.geofence.length > 2 ? (
                <Polygon
                  key={`poly-${l.id}`}
                  positions={l.geofence.map(p => [p.lat, p.lng])}
                  pathOptions={{ color: selectedId === l.id ? '#2563eb' : '#10b981', weight: selectedId === l.id ? 4 : 2, fillOpacity: 0.2 }}
                />
              ) : null
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}

function DraggableMarker({ id, name, airport, type, lat, lng, onDragEnd, isPending, onSelect, onRename, onDelete }: { id: string, name: string, airport: string, type: string, lat: number, lng: number, onDragEnd: (id: string, lat: number, lng: number) => void, isPending: boolean, onSelect: () => void, onRename: (id: string, newName: string) => void, onDelete: (id: string) => void }) {
  const [leaflet, setLeaflet] = useState<any>(null)
  const markerRef = useRef<any>(null)
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState(name)
  useEffect(() => { (async () => { const L = await import('leaflet'); setLeaflet(L) })() }, [])
  if (!leaflet) return null
  const icon = leaflet.icon({ iconUrl: isPending ? 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x-green.png' : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41,41] })
  return (
    <Marker position={[lat, lng]} draggable={true} ref={markerRef} icon={icon} eventHandlers={{ dragend: (e: any) => { const p = e.target.getLatLng(); onDragEnd(id, p.lat, p.lng) }, click: onSelect }}>
      <Popup>
        <div className="text-sm">
          {!editing ? (
            <div className="font-semibold flex items-center gap-2">
              <span className="truncate max-w-[180px]" title={name}>{name}</span>
              <button className="px-2 py-0.5 text-xs rounded bg-gray-100 hover:bg-gray-200" onClick={() => setEditing(true)}>Edit</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input value={newName} onChange={e=>setNewName(e.target.value)} className="px-2 py-1 border rounded w-40 text-xs" />
              <button className="px-2 py-0.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700" onClick={async()=>{ await onRename(id, newName); setEditing(false) }}>Save</button>
              <button className="px-2 py-0.5 text-xs rounded bg-gray-100 hover:bg-gray-200" onClick={()=>{ setNewName(name); setEditing(false) }}>Cancel</button>
            </div>
          )}
          <div className="text-gray-600">{airport} • {type}</div>
          <div className="text-xs text-gray-500 mt-1">{lat.toFixed(6)}, {lng.toFixed(6)}</div>
          {isPending && <div className="mt-2 text-xs text-green-700">Pending update</div>}
          <div className="mt-2">
            <button className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700" onClick={async()=>{ if (confirm('Delete this location?')) await onDelete(id) }}>Delete</button>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}


