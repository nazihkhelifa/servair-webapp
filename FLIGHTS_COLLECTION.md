# Flights Collection Documentation

## Overview

The `flights` collection stores comprehensive information about all scheduled flights. This serves as the master reference for flight data that assignments can be linked to.

## Purpose

- **Centralized flight data**: Single source of truth for all flight information
- **Easy assignment creation**: Select flight from dropdown to auto-populate details
- **Flight tracking**: Monitor all scheduled flights and their associated truck assignments
- **Schedule management**: View upcoming flights and plan ground service operations

---

## Collection Schema

### Firestore Collection: `flights`

**Collection Path**: `/flights/{flightId}`

### Document Structure

```typescript
{
  id: string                          // Firestore document ID (auto-generated)
  
  // Core Flight Information
  flightCode: string                  // Flight number (e.g., "AF1234", "BA456") - Required
  flightOrigin: string | null         // Origin airport code (e.g., "CDG", "JFK", "LHR")
  flightDestination: string | null    // Destination airport code (e.g., "LAX", "DXB", "SIN")
  theoreticalHour: string             // Scheduled time in HH:mm format (24-hour) - Required
  theoreticalDateTime: Timestamp      // Combined date/time for scheduling
  
  // Aircraft & Gate Information
  planeType: string | null            // Aircraft model (e.g., "A380", "B777", "A320")
  gate: string | null                 // Gate number (e.g., "A12", "B5", "T2-C3")
  terminal: string | null             // Terminal designation (e.g., "Terminal 2", "T1")
  
  // Flight Details
  status: string                      // Flight status (default: "scheduled")
                                      // Values: scheduled, boarding, departed, arrived, cancelled, delayed
  flightType: string                  // Type of flight (default: "departure")
                                      // Values: arrival, departure
  airline: string | null              // Airline name (e.g., "Air France", "British Airways")
  
  // Operational Details
  passengerCount: number | null       // Expected number of passengers
  cargoWeight: number | null          // Cargo weight in kg
  notes: string                       // Additional notes or special requirements
  
  // Metadata
  createdAt: Timestamp                // When the flight record was created
  updatedAt: Timestamp                // Last update timestamp
}
```

---

## Example Flight Document

```json
{
  "id": "flight_abc123",
  "flightCode": "AF1234",
  "flightOrigin": "CDG",
  "flightDestination": "JFK",
  "theoreticalHour": "14:30",
  "theoreticalDateTime": "2025-10-29T14:30:00.000Z",
  "planeType": "A380",
  "gate": "A12",
  "terminal": "Terminal 2",
  "status": "scheduled",
  "flightType": "departure",
  "airline": "Air France",
  "passengerCount": 380,
  "cargoWeight": 5000,
  "notes": "Special catering requirements",
  "createdAt": "2025-10-20T10:00:00.000Z",
  "updatedAt": "2025-10-20T10:00:00.000Z"
}
```

---

## API Endpoints

### Base URL: `/api/flights`

### 1. GET - Fetch All Flights

**Endpoint**: `GET /api/flights`

**Query Parameters** (optional):
- `date` - Filter by specific date (yyyy-mm-dd format)
- `status` - Filter by flight status (scheduled, boarding, etc.)

**Response**:
```json
[
  {
    "id": "flight_abc123",
    "flightCode": "AF1234",
    "flightOrigin": "CDG",
    "flightDestination": "JFK",
    "theoreticalHour": "14:30",
    "theoreticalDateTime": "2025-10-29T14:30:00.000Z",
    "planeType": "A380",
    "gate": "A12",
    "status": "scheduled",
    ...
  }
]
```

**Example Usage**:
```javascript
// Fetch all flights
const response = await fetch('/api/flights')
const flights = await response.json()

// Fetch flights for specific date
const response = await fetch('/api/flights?date=2025-10-29')
const todayFlights = await response.json()

// Fetch only scheduled flights
const response = await fetch('/api/flights?status=scheduled')
const scheduledFlights = await response.json()
```

---

### 2. POST - Create New Flight

**Endpoint**: `POST /api/flights`

**Required Fields**:
- `flightCode` (string)
- `theoreticalHour` (string, HH:mm format)

**Optional Fields**:
- `flightOrigin` (string)
- `flightDestination` (string)
- `theoreticalDate` (string, yyyy-mm-dd) - defaults to today
- `planeType` (string)
- `gate` (string)
- `terminal` (string)
- `status` (string) - defaults to "scheduled"
- `flightType` (string) - defaults to "departure"
- `airline` (string)
- `passengerCount` (number)
- `cargoWeight` (number)
- `notes` (string)

**Request Body**:
```json
{
  "flightCode": "AF1234",
  "flightOrigin": "CDG",
  "flightDestination": "JFK",
  "theoreticalDate": "2025-10-29",
  "theoreticalHour": "14:30",
  "planeType": "A380",
  "gate": "A12",
  "terminal": "Terminal 2",
  "status": "scheduled",
  "flightType": "departure",
  "airline": "Air France",
  "passengerCount": 380,
  "cargoWeight": 5000,
  "notes": "Special catering requirements"
}
```

**Response**:
```json
{
  "id": "flight_abc123",
  "message": "Flight created successfully",
  "flight": {
    "id": "flight_abc123",
    "flightCode": "AF1234",
    ...
  }
}
```

---

### 3. PUT - Update Flight

**Endpoint**: `PUT /api/flights`

**Required Fields**:
- `id` (string) - Flight document ID

**Optional Fields**: Any flight fields to update

**Request Body**:
```json
{
  "id": "flight_abc123",
  "status": "boarding",
  "gate": "A15",
  "notes": "Gate changed"
}
```

**Response**:
```json
{
  "message": "Flight updated successfully",
  "id": "flight_abc123"
}
```

---

### 4. DELETE - Delete Flight

**Endpoint**: `DELETE /api/flights?id={flightId}`

**Query Parameters**:
- `id` (required) - Flight document ID

**Response**:
```json
{
  "message": "Flight deleted successfully",
  "id": "flight_abc123"
}
```

---

## Integration with Assignments

### Linking Flights to Assignments

When creating an assignment, you can link it to a flight by:

1. **Flight Selection**: User selects a flight from dropdown
2. **Auto-Population**: Flight details automatically fill the form
3. **flightId Reference**: Assignment stores `flightId` linking to the flights collection

**Assignment Data Structure**:
```typescript
{
  // ... assignment fields
  flightId: string | null,            // Reference to flights collection
  flightCode: string | null,          // Cached for quick display
  flightOrigin: string | null,        // Cached data
  flightDestination: string | null,   // Cached data
  theoreticalHour: string | null,     // Cached data
  planeType: string | null,           // Cached data
  gate: string | null,                // Cached data
}
```

**Why Cache Flight Data?**
- **Performance**: Don't need to join collections for every query
- **Historical record**: Preserves flight details even if flight is updated/deleted
- **Offline capability**: Assignment has all needed data without lookup

### Workflow

```mermaid
graph LR
    A[Create Assignment] --> B[Select Flight]
    B --> C[Flight Data Auto-Fills]
    C --> D[Assign Truck & Driver]
    D --> E[Set Times & Details]
    E --> F[Save Assignment]
    F --> G[Assignment Linked to Flight]
```

---

## Use Cases

### 1. Daily Flight Schedule Management

**Scenario**: View all flights for a specific day

```javascript
const date = '2025-10-29'
const response = await fetch(`/api/flights?date=${date}`)
const flights = await response.json()

// Display in schedule view
flights.forEach(flight => {
  console.log(`${flight.flightCode} at ${flight.theoreticalHour} - Gate ${flight.gate}`)
})
```

### 2. Create Truck Assignment for Flight

**Scenario**: Assign a truck to service a specific flight

1. User opens "Create Assignment" form
2. Selects flight "AF1234" from dropdown
3. Form auto-fills:
   - Flight Code: AF1234
   - Origin: CDG
   - Destination: JFK
   - Time: 14:30
   - Aircraft: A380
   - Gate: A12
   - Suggested location: "Gate A12"
   - Suggested title: "Service AF1234"
4. User selects truck and driver
5. System saves assignment with `flightId` reference

### 3. Track Flight Status Updates

**Scenario**: Update flight status from scheduled to boarding

```javascript
await fetch('/api/flights', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'flight_abc123',
    status: 'boarding'
  })
})
```

### 4. Monitor Upcoming Flights

**Scenario**: Get all scheduled flights for operations planning

```javascript
const response = await fetch('/api/flights?status=scheduled')
const upcomingFlights = await response.json()

// Plan ground service operations
const needsService = upcomingFlights.filter(flight => {
  const flightTime = new Date(flight.theoreticalDateTime)
  const hoursUntil = (flightTime - Date.now()) / (1000 * 60 * 60)
  return hoursUntil <= 4 && hoursUntil > 0 // Next 4 hours
})
```

---

## Flight Status Types

| Status | Description | Typical Timeline |
|--------|-------------|-----------------|
| `scheduled` | Flight is planned and confirmed | Days/weeks before |
| `boarding` | Passengers are boarding | 30-60 mins before |
| `departed` | Flight has taken off (for departures) | After takeoff |
| `arrived` | Flight has landed (for arrivals) | After landing |
| `delayed` | Flight is delayed from scheduled time | Variable |
| `cancelled` | Flight is cancelled | Variable |

---

## Best Practices

### 1. Flight Code Format
- Use **UPPERCASE** (e.g., "AF1234", not "af1234")
- Include airline code and number
- Be consistent with format

### 2. Date/Time Management
- Always use **24-hour format** for `theoreticalHour` (e.g., "14:30", not "2:30 PM")
- Store times in **UTC** or **local airport time** consistently
- Use `theoreticalDateTime` for time-based queries

### 3. Gate Assignment
- Update gate information when it changes
- Notify affected truck assignments of gate changes
- Use clear gate formats (e.g., "A12", "T2-C3")

### 4. Data Validation
- Validate flight codes against expected patterns
- Ensure `theoreticalHour` is in HH:mm format
- Check airport codes are valid IATA codes

### 5. Assignment Linking
- Always set `flightId` when creating flight-related assignments
- Cache flight details in assignment for historical accuracy
- Don't delete flights that have active assignments

---

## Firestore Indexes

Recommended composite indexes for optimal query performance:

```
Collection: flights
- theoreticalDateTime (Ascending), status (Ascending)
- status (Ascending), theoreticalDateTime (Ascending)
- flightCode (Ascending), theoreticalDateTime (Ascending)
```

---

## Future Enhancements

### Planned Features
1. **Real-time Flight Updates**: Integration with flight tracking APIs
2. **Automatic Status Updates**: Sync with airport systems
3. **Weather Integration**: Alert for weather-related delays
4. **Capacity Planning**: Analyze ground service requirements by aircraft type
5. **Historical Analytics**: Track on-time performance
6. **Crew Management**: Link cabin crew and pilot assignments
7. **Passenger Services**: Track special assistance requests
8. **Notifications**: Alert truck drivers when flight status changes

### API Integrations
- FlightAware API for real-time tracking
- Airport FIDS (Flight Information Display System)
- Weather services for delay predictions
- Airline APIs for passenger/cargo manifests

---

## Troubleshooting

### Common Issues

**Issue**: Flight not appearing in assignment dropdown
- **Cause**: Flight might be in the past or filtered out
- **Solution**: Check `theoreticalDateTime` and status filters

**Issue**: Duplicate flight codes
- **Cause**: Same flight code used for multiple days
- **Solution**: This is expected; use `theoreticalDateTime` to differentiate

**Issue**: Assignment not linking to flight
- **Cause**: `flightId` not being set correctly
- **Solution**: Ensure `selectedFlight?.id` is passed when creating assignment

---

## Summary

The **flights collection** is the backbone of Servair's airport operations:

✅ **Centralized Data**: Single source of truth for all flight information
✅ **Easy Integration**: Dropdown selection makes assignment creation simple
✅ **Auto-Population**: Reduces data entry errors
✅ **Historical Record**: Cached data preserves flight details
✅ **Scalable Design**: Supports future enhancements
✅ **Performance**: Cached data in assignments avoids frequent lookups

**Key Workflow**:
1. Add flights to `flights` collection
2. When creating assignment, select flight from dropdown
3. Flight details auto-populate
4. Assignment stores `flightId` reference
5. Truck services the flight at specified time/gate
6. Track completion in assignments, update flight status as needed

