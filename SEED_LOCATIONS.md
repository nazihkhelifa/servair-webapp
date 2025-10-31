# Seed Locations Data

## How to Add Initial Locations

**📍 NEW: All locations now include GPS coordinates (latitude/longitude) for route planning and map visualization!**

### Recommended Method: Use the Seed Locations Page

The easiest way to populate all locations with GPS coordinates is:

1. Navigate to `/admin/seed-locations` in your browser
2. Click the "🌱 Seed Locations Collection" button
3. Wait for all 135 locations (97 CDG + 38 ORY) to be added

This will automatically add all start locations and gates with their GPS coordinates.

### Alternative: Using POST requests to `/api/locations`

You can also add locations manually through the API:

## CDG Airport - Start Locations
```json
POST /api/locations
{
  "name": "Parc ESR",
  "airport": "CDG",
  "type": "start",
  "description": "Main equipment parking area",
  "latitude": 49.008,
  "longitude": 2.540
}

{
  "name": "Servair 1",
  "airport": "CDG",
  "type": "start",
  "description": "Servair facility 1"
}

{
  "name": "Servair 2",
  "airport": "CDG",
  "type": "start",
  "description": "Servair facility 2"
}

{
  "name": "Terminal 1 Base",
  "airport": "CDG",
  "type": "start"
}

{
  "name": "Terminal 2 Base",
  "airport": "CDG",
  "type": "start"
}

{
  "name": "Hangar M1",
  "airport": "CDG",
  "type": "start"
}
```

## CDG Airport - Destinations (Gates)
```json
{
  "name": "A1",
  "airport": "CDG",
  "type": "destination",
  "description": "Terminal 1 - Hall A"
}

{
  "name": "A2",
  "airport": "CDG",
  "type": "destination"
}
... (Continue for A3-A10)

{
  "name": "B1",
  "airport": "CDG",
  "type": "destination",
  "description": "Terminal 2B"
}
... (Continue for B2-B10)

{
  "name": "C1",
  "airport": "CDG",
  "type": "destination",
  "description": "Terminal 2C"
}
... (Continue for C2-C10)

{
  "name": "D1",
  "airport": "CDG",
  "type": "destination",
  "description": "Terminal 2D"
}

{
  "name": "E1",
  "airport": "CDG",
  "type": "destination",
  "description": "Terminal 2E"
}

{
  "name": "F1",
  "airport": "CDG",
  "type": "destination",
  "description": "Terminal 2F"
}

{
  "name": "G1",
  "airport": "CDG",
  "type": "destination",
  "description": "Terminal 2G"
}

{
  "name": "K1",
  "airport": "CDG",
  "type": "destination",
  "description": "Terminal 2K - Satellite"
}

{
  "name": "L1",
  "airport": "CDG",
  "type": "destination",
  "description": "Terminal 2L - Satellite"
}
```

## ORY Airport - Start Locations
```json
{
  "name": "Servair Orly",
  "airport": "ORY",
  "type": "start"
}

{
  "name": "Hangar Sud",
  "airport": "ORY",
  "type": "start"
}

{
  "name": "Orly 1 Base",
  "airport": "ORY",
  "type": "start"
}

{
  "name": "Orly 2 Base",
  "airport": "ORY",
  "type": "start"
}

{
  "name": "Orly 3 Base",
  "airport": "ORY",
  "type": "start"
}

{
  "name": "Orly 4 Base",
  "airport": "ORY",
  "type": "start"
}
```

## ORY Airport - Destinations (Gates)
```json
{
  "name": "10A",
  "airport": "ORY",
  "type": "destination",
  "description": "Terminal 1"
}

{
  "name": "10B",
  "airport": "ORY",
  "type": "destination",
  "description": "Terminal 1"
}
... (Continue for 11A-11H, 12A-12H, etc.)

{
  "name": "20A",
  "airport": "ORY",
  "type": "destination",
  "description": "Terminal 2"
}

{
  "name": "20B",
  "airport": "ORY",
  "type": "destination",
  "description": "Terminal 2"
}
... (Continue for 21A-21H, 22A-22H, etc.)

{
  "name": "30A",
  "airport": "ORY",
  "type": "destination",
  "description": "Terminal 3"
}

{
  "name": "30B",
  "airport": "ORY",
  "type": "destination",
  "description": "Terminal 3"
}
... (Continue for 31A-31H, 32A-32H, etc.)

{
  "name": "40A",
  "airport": "ORY",
  "type": "destination",
  "description": "Terminal 4"
}

{
  "name": "40B",
  "airport": "ORY",
  "type": "destination",
  "description": "Terminal 4"
}
... (Continue for 41A-41H, 42A-42H, etc.)
```

## Quick Add via Browser Console

You can also use this script in your browser console while on your app:

```javascript
const locations = [
  // CDG Start Locations
  { name: "Parc ESR", airport: "CDG", type: "start", description: "Main equipment parking area" },
  { name: "Servair 1", airport: "CDG", type: "start", description: "Servair facility 1" },
  { name: "Servair 2", airport: "CDG", type: "start", description: "Servair facility 2" },
  { name: "Terminal 1 Base", airport: "CDG", type: "start" },
  { name: "Terminal 2 Base", airport: "CDG", type: "start" },
  { name: "Hangar M1", airport: "CDG", type: "start" },
  
  // CDG Gates (A-K)
  ...Array.from({length: 10}, (_, i) => ({ name: `A${i+1}`, airport: "CDG", type: "destination", description: "Terminal 1 - Hall A" })),
  ...Array.from({length: 10}, (_, i) => ({ name: `B${i+1}`, airport: "CDG", type: "destination", description: "Terminal 2B" })),
  ...Array.from({length: 10}, (_, i) => ({ name: `C${i+1}`, airport: "CDG", type: "destination", description: "Terminal 2C" })),
  ...Array.from({length: 10}, (_, i) => ({ name: `D${i+1}`, airport: "CDG", type: "destination", description: "Terminal 2D" })),
  ...Array.from({length: 10}, (_, i) => ({ name: `E${i+1}`, airport: "CDG", type: "destination", description: "Terminal 2E" })),
  ...Array.from({length: 10}, (_, i) => ({ name: `F${i+1}`, airport: "CDG", type: "destination", description: "Terminal 2F" })),
  ...Array.from({length: 10}, (_, i) => ({ name: `G${i+1}`, airport: "CDG", type: "destination", description: "Terminal 2G" })),
  ...Array.from({length: 5}, (_, i) => ({ name: `K${i+1}`, airport: "CDG", type: "destination", description: "Terminal 2K - Satellite" })),
  ...Array.from({length: 5}, (_, i) => ({ name: `L${i+1}`, airport: "CDG", type: "destination", description: "Terminal 2L - Satellite" })),
  
  // ORY Start Locations
  { name: "Servair Orly", airport: "ORY", type: "start" },
  { name: "Hangar Sud", airport: "ORY", type: "start" },
  { name: "Orly 1 Base", airport: "ORY", type: "start" },
  { name: "Orly 2 Base", airport: "ORY", type: "start" },
  { name: "Orly 3 Base", airport: "ORY", type: "start" },
  { name: "Orly 4 Base", airport: "ORY", type: "start" },
  
  // ORY Gates (Terminals 1-4)
  ...Array.from({length: 8}, (_, i) => ({ name: `1${i+10}`, airport: "ORY", type: "destination", description: "Terminal 1" })),
  ...Array.from({length: 8}, (_, i) => ({ name: `2${i+10}`, airport: "ORY", type: "destination", description: "Terminal 2" })),
  ...Array.from({length: 8}, (_, i) => ({ name: `3${i+10}`, airport: "ORY", type: "destination", description: "Terminal 3" })),
  ...Array.from({length: 8}, (_, i) => ({ name: `4${i+10}`, airport: "ORY", type: "destination", description: "Terminal 4" })),
];

// Add all locations
async function seedLocations() {
  for (const location of locations) {
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location)
      });
      const result = await response.json();
      console.log(`Added: ${location.name}`, result);
    } catch (error) {
      console.error(`Failed to add ${location.name}:`, error);
    }
  }
  console.log('✅ Seeding complete!');
}

// Run the seeding
seedLocations();
```

## Manual Entry via Firestore Console

1. Go to Firebase Console → Firestore Database
2. Create a new collection called `locations`
3. Add documents with the following structure:

```
{
  name: "Parc ESR",
  airport: "CDG",
  type: "start",
  description: "Main equipment parking area",
  latitude: 49.008,
  longitude: 2.540,
  isActive: true,
  createdAt: [timestamp]
}
```

---

## 📚 Additional Resources

For complete GPS coordinate information, see:
- **[LOCATIONS_GPS_COORDINATES.md](./LOCATIONS_GPS_COORDINATES.md)** - Comprehensive guide to all GPS coordinates, use cases, and API integration examples

This document includes:
- Complete coordinate listings for all 135 locations
- Distance calculation formulas
- Route planning examples
- Map visualization guidelines
- Use cases for GPS coordinates

