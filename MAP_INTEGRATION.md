# Map Integration - Simplified Assignment Route Viewing

## Overview

The map page has been updated to support viewing assignment routes with a simple URL parameter instead of passing all coordinates via query parameters.

## Usage

### Simple URL Format

Instead of:
```
/tracking?assignmentId=xxx&startLat=49.007&startLng=2.542&destLat=49.01&destLng=2.55&startName=Servair+1&destName=F2&truck=truck_id&driver=driver_id
```

Now use:
```
/map?assignmentId=xxx
```

## How It Works

### 1. **Click "View Route on Map"** in Assignment Detail Drawer
- The button now navigates to `/map?assignmentId={id}`
- No need to pass coordinates, location names, truck, or driver info

### 2. **Map Page Automatically Fetches**
- Assignment details from `/api/assignments`
- Start and destination locations from `/api/locations`
- Driver's live GPS position from `/api/tracking`
- Driver's last 5 GPS positions for historical trail
- Real-time position updates every 30 seconds

### 3. **Map Display Shows**
- 🟢 **Green "S" Marker** - Start Location
- 🚛 **Blue Truck Marker** - Driver's Current Position (Live, pulsing)
- 🔵 **Blue Circle** - GPS Accuracy Radius (shows position uncertainty in meters)
- 🟢 **Green Trail** - Driver's Last 5 GPS Positions (historical path)
- ● **Green Dots** - Historical position markers with timestamps
- 🔴 **Red "D" Marker** - Destination
- Dashed route lines:
  - Blue: Planned route from start to destination
  - Green: Driver's historical movement trail
- All markers are clickable for details

## Features

### Dual Mode Support

The map page supports two modes:

1. **Assignment Route Mode** (`?assignmentId=xxx`)
   - Shows assignment start → current position → destination
   - Live driver tracking with auto-refresh
   - Route information panel

2. **Tracking History Mode** (no parameters)
   - Shows historical GPS tracking for selected users
   - Path visualization with timestamps
   - User selector dropdown

### Real-Time Updates

- Driver position refreshes every 30 seconds
- Live position marker pulses to indicate it's active
- Shows driver speed and last update time
- Automatically calculates remaining distance

### GPS Accuracy Visualization

- **Accuracy Circle**: A blue circle is drawn around the driver's current position
  - Radius represents GPS accuracy in meters (from device/API)
  - Indicates the uncertainty area where the driver's actual position lies
  - Shows as semi-transparent with dashed border
  - Click the circle for exact accuracy value
  - Auto-updates with each position refresh

### Historical Path Tracking

- **Last 5 GPS Points**: Shows driver's recent movement history
  - Green dashed line connecting last 5 positions
  - Small green dot markers for each historical point
  - Fading opacity for older points (newest = darker, oldest = lighter)
  - Click any dot to see:
    - Position number (1-5, newest to oldest)
    - Speed at that moment
    - How long ago that position was recorded
  - Auto-updates every 30 seconds with new data

### Benefits

✅ **Simpler URLs** - Just need the assignment ID  
✅ **Less Data Transfer** - No need to pass coordinates in URL  
✅ **Auto-Refresh** - Fetches latest data on load  
✅ **Live Tracking** - Real-time driver position updates every 30 seconds  
✅ **GPS Accuracy** - Visual representation of position uncertainty  
✅ **Historical Trail** - See where the driver has been (last 5 points)  
✅ **Dual Purpose** - One page for both tracking and route viewing  
✅ **Error Handling** - Gracefully handles missing data  

## Code Changes

### Files Modified

1. **`servair-webapp/components/AssignmentDetailDrawer.tsx`**
   - Simplified `handleViewOnMap()` to just pass assignmentId
   - Removed coordinate validation requirements

2. **`servair-webapp/app/map/page.tsx`**
   - Added assignment route mode support
   - Fetches assignment, locations, and GPS data
   - Displays route with live driver tracking
   - **GPS Accuracy Circle**: Visualizes position uncertainty radius
   - **Historical Path**: Shows last 5 GPS positions with trail
   - Auto-refresh every 30 seconds for live updates
   - Wrapped in Suspense for better loading states

## API Endpoints Used

- `GET /api/assignments` - Fetch assignment details
- `GET /api/locations?airport={CDG|ORY}&type={start|destination}` - Get location coordinates
- `GET /api/tracking?driverId={id}` - Get driver's live GPS position and history (includes accuracy data)

## Example

```javascript
// Navigate to map with assignment
router.push(`/map?assignmentId=${assignmentId}`)

// The map page will automatically:
// 1. Fetch assignment data
// 2. Load start/destination coordinates
// 3. Show driver's current position
// 4. Update position every 10 seconds
```

## Future Enhancements

- [ ] Add estimated arrival time (ETA) calculation
- [ ] Show route progress percentage
- [ ] Display route polyline from current position to destination
- [ ] Add traffic/delay indicators
- [ ] Historical route replay
- [ ] Multiple assignments on one map

---

**Last Updated**: October 29, 2025  
**Status**: ✅ Production Ready

