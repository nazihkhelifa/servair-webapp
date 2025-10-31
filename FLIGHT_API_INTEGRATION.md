# Flight API Integration Guide

## Overview

The Flight Management page allows you to import real flight data from external APIs and add them to your Firestore database. This eliminates manual data entry and ensures accurate, up-to-date flight information.

---

## Supported APIs

### 1. **AviationStack** (Currently Integrated)

**Website**: [https://aviationstack.com](https://aviationstack.com)

**Free Tier**:
- ✅ 100 API requests per month
- ✅ Real-time flight status
- ✅ Historical flight data
- ✅ Flight schedules
- ✅ Worldwide coverage

**Paid Tiers** (for production):
- Basic: $49.99/mo (10,000 requests)
- Professional: $149.99/mo (100,000 requests)
- Business: $399.99/mo (500,000 requests)

---

## Setup Guide

### Step 1: Get Your API Key

1. Visit [https://aviationstack.com](https://aviationstack.com)
2. Click "Get Free API Key" or "Sign Up"
3. Create a free account
4. Navigate to your Dashboard
5. Copy your API Access Key

**Example API Key**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

---

### Step 2: Access Flight Management Page

1. Open your Servair web application
2. Click the **Flights** icon (✈️) in the sidebar
3. You'll see the Flight Management page

---

### Step 3: Import Flight Data

1. Click **"Import from API"** button (top right)
2. Enter your API key in the "API Key" field
3. Enter a flight code (IATA format) in the "Flight Code" field
   - Examples: `AA100`, `BA456`, `AF1234`, `LH400`
4. Click **"Search"**
5. Review the search results
6. Click **"Add"** button next to the flight you want to import

---

## Flight Code Formats

### IATA Codes (2-letter airline + flight number)
Most commonly used format:

| Airline | IATA Code | Example Flight |
|---------|-----------|----------------|
| Air France | AF | AF1234 |
| British Airways | BA | BA456 |
| American Airlines | AA | AA100 |
| Lufthansa | LH | LH400 |
| Emirates | EK | EK201 |
| Qatar Airways | QR | QR500 |

### How to Find Flight Codes

1. **From Airline Websites**: Look at flight schedules
2. **From Booking Confirmations**: Check passenger tickets
3. **From Airport Displays**: FIDS (Flight Information Display Systems)
4. **From FlightRadar24**: Search for flights in real-time

---

## API Response Data

### What Data Gets Imported

When you import a flight, the following information is automatically extracted:

| Field | Description | Example |
|-------|-------------|---------|
| **Flight Code** | IATA flight number | AF1234 |
| **Origin** | Departure airport (IATA code) | CDG |
| **Destination** | Arrival airport (IATA code) | JFK |
| **Scheduled Time** | Departure/arrival time | 14:30 |
| **Aircraft Type** | Plane model | A380 |
| **Gate** | Gate number | A12 |
| **Terminal** | Terminal designation | Terminal 2 |
| **Status** | Current flight status | scheduled |
| **Airline** | Airline name | Air France |

### Arrival vs Departure Detection

The system automatically determines if the flight should be tracked as:
- **Arrival**: If destination airport is CDG or ORY (configurable)
- **Departure**: If origin airport is CDG or ORY

---

## Status Mapping

API statuses are automatically converted to Servair statuses:

| API Status | Servair Status | Description |
|------------|----------------|-------------|
| `scheduled` | scheduled | Flight is confirmed and scheduled |
| `active` | boarding | Flight is boarding or en route |
| `landed` | arrived | Flight has landed (arrivals) |
| `cancelled` | cancelled | Flight is cancelled |
| `incident` | delayed | Flight has an incident/delay |
| `diverted` | delayed | Flight is diverted |

---

## Usage Examples

### Example 1: Import Single Flight

```
1. API Key: your_api_key_here
2. Flight Code: AF1234
3. Click "Search"
4. Review result (Air France from CDG to JFK)
5. Click "Add"
6. Flight is now in your database!
```

### Example 2: Import Multiple Flights

```
Search for: BA456 → Add
Search for: LH400 → Add
Search for: EK201 → Add

Result: 3 flights added to database
```

### Example 3: Search Today's Flights

Most APIs support searching by:
- Flight code (e.g., AF1234)
- Route (e.g., CDG-JFK)
- Airline (e.g., all Air France flights)
- Date (e.g., today's flights)

**Note**: Current implementation searches by flight code. Route/date search can be added in future updates.

---

## Troubleshooting

### Issue: "API Error: Invalid API key"

**Solution**:
- Double-check your API key
- Ensure no extra spaces
- Try generating a new API key
- Check if your free tier limit (100 requests) is exhausted

### Issue: "No flights found for this code"

**Possible Causes**:
1. Flight code doesn't exist
2. Flight is not scheduled for today
3. Typo in flight code
4. Flight is from a regional airline not in the database

**Solutions**:
- Verify flight code spelling
- Check airline website for correct code
- Try with different date range
- Use IATA code (not ICAO)

### Issue: "Failed to search flights"

**Possible Causes**:
- Network connectivity issue
- API service down
- CORS policy blocking request
- Invalid API endpoint

**Solutions**:
- Check your internet connection
- Try again in a few minutes
- Check AviationStack status page
- Contact support if issue persists

### Issue: "Failed to add flight"

**Possible Causes**:
- Duplicate flight already in database
- Missing required fields
- Firestore permission error

**Solutions**:
- Check if flight already exists
- Ensure flight code is unique
- Verify Firestore connection

---

## Alternative APIs

### 2. **OpenSky Network** (Free, Open Source)

**Website**: [https://opensky-network.org](https://opensky-network.org)

**Features**:
- ✅ Completely free
- ✅ Real-time flight tracking
- ✅ No API key required
- ✅ Open data

**Limitations**:
- Limited to en-route flights
- No schedule data
- More technical to use

### 3. **FlightAware AeroAPI**

**Website**: [https://flightaware.com/aeroapi](https://flightaware.com/aeroapi)

**Features**:
- Most comprehensive data
- Historical archives
- Predictive ETAs
- Weather integration

**Pricing**:
- Starts at $250/month
- Best for enterprise use

### 4. **FlightLabs**

**Website**: [https://flightlabs.io](https://flightlabs.io)

**Features**:
- Real-time flight status
- Airport schedules
- Airlines database

**Pricing**:
- Free tier: 100 requests/month
- Similar to AviationStack

---

## Best Practices

### 1. **API Key Security**
- ❌ **Never commit API keys to Git**
- ✅ Store in environment variables
- ✅ Use different keys for dev/production
- ✅ Rotate keys periodically

### 2. **Request Management**
- ⏰ Free tier = 100 requests/month ≈ 3 requests/day
- 📊 Plan your imports accordingly
- 🔄 Cache results to avoid duplicate requests
- 📅 Import flights once per day or week

### 3. **Data Validation**
- ✓ Always review imported data before adding
- ✓ Check if flight already exists
- ✓ Verify gate and terminal information
- ✓ Confirm arrival vs departure type

### 4. **Bulk Import**
For importing many flights:
1. Prepare a list of flight codes
2. Import during off-peak hours
3. Monitor API quota
4. Consider upgrading to paid tier

---

## Future Enhancements

### Planned Features

1. **Automated Daily Import**
   - Schedule automatic imports
   - Import tomorrow's flights every evening
   - Email notifications

2. **Bulk Import Tool**
   - Upload CSV file with flight codes
   - Batch processing
   - Progress tracking

3. **Real-time Updates**
   - WebSocket connections for live updates
   - Automatic status synchronization
   - Push notifications for delays

4. **Multiple API Support**
   - Switch between APIs
   - Fallback to secondary API
   - Compare data from multiple sources

5. **Advanced Filtering**
   - Search by route
   - Search by airline
   - Search by date range
   - Search by aircraft type

---

## API Request Examples

### AviationStack API

**Endpoint**: `http://api.aviationstack.com/v1/flights`

**Example Request**:
```bash
GET http://api.aviationstack.com/v1/flights?access_key=YOUR_API_KEY&flight_iata=AF1234
```

**Example Response**:
```json
{
  "pagination": {
    "limit": 100,
    "offset": 0,
    "count": 1,
    "total": 1
  },
  "data": [
    {
      "flight_date": "2025-10-29",
      "flight_status": "scheduled",
      "departure": {
        "airport": "Charles de Gaulle",
        "timezone": "Europe/Paris",
        "iata": "CDG",
        "icao": "LFPG",
        "terminal": "2",
        "gate": "A12",
        "scheduled": "2025-10-29T14:30:00+00:00"
      },
      "arrival": {
        "airport": "John F Kennedy International",
        "timezone": "America/New_York",
        "iata": "JFK",
        "icao": "KJFK",
        "terminal": "1",
        "gate": "B20",
        "scheduled": "2025-10-29T18:45:00+00:00"
      },
      "airline": {
        "name": "Air France",
        "iata": "AF",
        "icao": "AFR"
      },
      "flight": {
        "number": "1234",
        "iata": "AF1234",
        "icao": "AFR1234"
      },
      "aircraft": {
        "iata": "A380"
      }
    }
  ]
}
```

---

## Cost Optimization Tips

### Maximizing Free Tier (100 requests/month)

1. **Strategic Timing**
   - Import flights once per week
   - Focus on upcoming flights only
   - Archive old flights

2. **Smart Caching**
   - Store API responses
   - Reuse data for 24 hours
   - Only refresh when needed

3. **Targeted Searches**
   - Only import flights you'll service
   - Filter by your airport codes
   - Skip low-priority flights

4. **Manual Entry for Rare Cases**
   - Use API for frequent routes
   - Manual entry for one-off flights
   - Balance automation with manual work

### When to Upgrade

Consider paid tier if:
- ✈️ Handling 50+ flights per day
- 🔄 Need real-time updates
- 📊 Require historical data
- 🌍 Multi-airport operations
- 🚀 Production environment

---

## Summary

The Flight API Integration:

✅ **Saves Time**: Import flights in seconds
✅ **Reduces Errors**: Accurate data from source
✅ **Auto-Updates**: Real-time status information
✅ **Easy to Use**: Simple search and add interface
✅ **Free to Start**: 100 requests per month
✅ **Scalable**: Upgrade as you grow

**Typical Workflow**:
1. Get API key from AviationStack
2. Search for flight by code
3. Review flight details
4. Add to your database
5. Create truck assignments from flight data
6. Track service completion

**Perfect for**: Airport ground service operations, fleet management, and truck assignment planning!

