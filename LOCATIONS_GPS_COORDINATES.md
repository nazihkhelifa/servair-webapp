# GPS Coordinates for Locations Collection

This document provides information about the GPS coordinates (latitude and longitude) stored in the `locations` collection for all gates and start locations at CDG and ORY airports.

## Overview

Each location in the `locations` collection now includes:
- **latitude**: GPS latitude coordinate (decimal degrees)
- **longitude**: GPS longitude coordinate (decimal degrees)

These coordinates enable:
- 📍 Real-time route planning and navigation
- 🗺️ Map visualization of truck routes
- 📊 Distance calculation between locations
- ⏱️ Estimated travel time calculations
- 🎯 Geofencing and arrival detection

---

## CDG - Charles de Gaulle Airport

**Base Coordinates**: 49.009° N, 2.547° E

### Start Locations (CDG)

| Location | Type | Latitude | Longitude | Description |
|----------|------|----------|-----------|-------------|
| Parc ESR | Start | 49.008 | 2.540 | Main equipment parking area |
| Servair 1 | Start | 49.007 | 2.542 | Servair facility 1 |
| Servair 2 | Start | 49.006 | 2.543 | Servair facility 2 |
| Terminal 1 Base | Start | 49.009 | 2.547 | Truck base near Terminal 1 |
| Terminal 2 Base | Start | 49.006 | 2.550 | Truck base near Terminal 2 |
| Hangar M1 | Start | 49.011 | 2.545 | Maintenance Hangar M1 |

### Gates (CDG)

#### Terminal 1 - Gates A1-A10
- **Base Coordinates**: 49.009° N, 2.547° E
- **Range**: A1 (49.009, 2.547) → A10 (49.0108, 2.5479)
- **Total Gates**: 10
- **Spacing**: 0.0002° latitude, 0.0001° longitude per gate

#### Terminal 2B - Gates B1-B10
- **Base Coordinates**: 49.004° N, 2.545° E
- **Range**: B1 (49.004, 2.545) → B10 (49.0058, 2.5459)
- **Total Gates**: 10

#### Terminal 2C - Gates C1-C10
- **Base Coordinates**: 49.005° N, 2.546° E
- **Range**: C1 (49.005, 2.546) → C10 (49.0068, 2.5469)
- **Total Gates**: 10

#### Terminal 2D - Gates D1-D10
- **Base Coordinates**: 49.006° N, 2.548° E
- **Range**: D1 (49.006, 2.548) → D10 (49.0078, 2.5489)
- **Total Gates**: 10

#### Terminal 2E - Gates E1-E15
- **Base Coordinates**: 49.007° N, 2.550° E
- **Range**: E1 (49.007, 2.550) → E15 (49.0098, 2.5514)
- **Total Gates**: 15

#### Terminal 2F - Gates F1-F10
- **Base Coordinates**: 49.010° N, 2.551° E
- **Range**: F1 (49.010, 2.551) → F10 (49.0118, 2.5519)
- **Total Gates**: 10

#### Terminal 2G - Gates G1-G10
- **Base Coordinates**: 49.012° N, 2.553° E
- **Range**: G1 (49.012, 2.553) → G10 (49.0138, 2.5539)
- **Total Gates**: 10

#### Terminal 2K - Gates K1-K8 (Satellite)
- **Base Coordinates**: 49.005° N, 2.555° E
- **Range**: K1 (49.005, 2.555) → K8 (49.0064, 2.5557)
- **Total Gates**: 8

#### Terminal 2L - Gates L1-L8 (Satellite)
- **Base Coordinates**: 49.004° N, 2.557° E
- **Range**: L1 (49.004, 2.557) → L8 (49.0054, 2.5577)
- **Total Gates**: 8

**Total CDG Locations**: 6 start + 91 gates = **97 locations**

---

## ORY - Orly Airport

**Base Coordinates**: 48.723° N, 2.379° E

### Start Locations (ORY)

| Location | Type | Latitude | Longitude | Description |
|----------|------|----------|-----------|-------------|
| Servair Orly | Start | 48.720 | 2.375 | Main Servair facility at Orly |
| Hangar Sud | Start | 48.719 | 2.377 | South hangar |
| Orly 1 Base | Start | 48.723 | 2.378 | Truck base near Orly Terminal 1 |
| Orly 2 Base | Start | 48.724 | 2.380 | Truck base near Orly Terminal 2 |
| Orly 3 Base | Start | 48.725 | 2.382 | Truck base near Orly Terminal 3 |
| Orly 4 Base | Start | 48.726 | 2.384 | Truck base near Orly Terminal 4 |

### Gates (ORY)

#### Terminal 1 - Gates 1A-1H
- **Base Coordinates**: 48.723° N, 2.378° E
- **Range**: 1A (48.723, 2.378) → 1H (48.7244, 2.3787)
- **Total Gates**: 8
- **Spacing**: 0.0002° latitude, 0.0001° longitude per gate

#### Terminal 2 - Gates 2A-2H
- **Base Coordinates**: 48.724° N, 2.380° E
- **Range**: 2A (48.724, 2.380) → 2H (48.7254, 2.3807)
- **Total Gates**: 8

#### Terminal 3 - Gates 3A-3H
- **Base Coordinates**: 48.725° N, 2.382° E
- **Range**: 3A (48.725, 2.382) → 3H (48.7264, 2.3827)
- **Total Gates**: 8

#### Terminal 4 - Gates 4A-4H
- **Base Coordinates**: 48.726° N, 2.384° E
- **Range**: 4A (48.726, 2.384) → 4H (48.7274, 2.3847)
- **Total Gates**: 8

**Total ORY Locations**: 6 start + 32 gates = **38 locations**

---

## Coordinate System

### Format
- **Latitude**: Decimal degrees, positive = North, negative = South
- **Longitude**: Decimal degrees, positive = East, negative = West

### Precision
- **6 decimal places** = ~0.11 meters accuracy
- This is sufficient for gate-level positioning

### Distance Calculation

To calculate the approximate distance between two coordinates, you can use the Haversine formula:

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}
```

### Estimated Travel Times

Based on airport truck speeds (~15-20 km/h average):
- **1 km** ≈ 3-4 minutes
- **500 m** ≈ 1.5-2 minutes
- **100 m** ≈ 20-30 seconds

---

## Use Cases

### 1. Route Planning
Use start location coordinates and destination gate coordinates to:
- Calculate optimal routes
- Estimate travel time
- Identify closest available trucks to a gate

### 2. Live Tracking
- Display truck positions on airport map
- Show distance to destination
- Track progress along route

### 3. Geofencing
- Set virtual perimeters around gates
- Trigger notifications when trucks arrive/depart
- Automatically update assignment status

### 4. Analytics
- Track average travel times between locations
- Identify bottlenecks or congestion areas
- Optimize truck allocation based on location patterns

### 5. Map Visualization
- Plot all gates and start locations on an interactive map
- Show active routes in real-time
- Display heatmaps of truck activity

---

## API Integration

### Fetching Locations with Coordinates

```javascript
// Get all CDG gates with coordinates
const response = await fetch('/api/locations?airport=CDG&type=destination');
const gates = await response.json();

gates.forEach(gate => {
  console.log(`${gate.name}: ${gate.latitude}, ${gate.longitude}`);
});
```

### Creating New Location with Coordinates

```javascript
const newLocation = {
  name: "Gate A11",
  airport: "CDG",
  type: "destination",
  description: "Terminal 1 - Hall A",
  latitude: 49.0110,
  longitude: 2.5480,
  isActive: true
};

await fetch('/api/locations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newLocation)
});
```

---

## Data Seeding

To populate the database with all locations including GPS coordinates, use the seed locations page:

1. Navigate to `/admin/seed-locations`
2. Click "🌱 Seed Locations Collection"
3. Wait for the process to complete
4. All 135 locations (97 CDG + 38 ORY) will be added with coordinates

---

## Notes

- **Coordinate Accuracy**: The provided coordinates are approximate and based on airport terminal layouts. For production use, verify exact gate positions.
- **Future Updates**: Coordinates can be refined using more precise surveying data or GPS measurements.
- **Offline Maps**: Consider caching airport maps for offline use in the mobile app.
- **Real-time Updates**: Truck GPS positions should be updated every 5-10 seconds for smooth tracking.

---

## Related Collections

- **locations**: Stores gate and start location coordinates
- **assignments**: Links trucks to destinations (gates)
- **gps**: Stores real-time truck GPS positions
- **trucks**: Fleet vehicles with tracking capability

---

**Last Updated**: October 29, 2025
**Total Locations**: 135 (97 CDG + 38 ORY)
**Coordinate System**: WGS84 (GPS standard)

