# Assignments Collection - Data Structure

## Firestore Document Structure

When you create a new task through the Tasks & Assignments page, the following data is saved to Firestore in the `assignments` collection:

### Example Document

```json
{
  "id": "auto-generated-by-firestore",
  "title": "Service AF1234 Flight",
  "truck": "driver_123",
  "driver": "John Smith",
  "destination": "Apron 3 - Terminal 2",
  "description": "Catering and refueling service",
  "status": "pending",
  "priority": "high",
  
  // Combined datetime fields (Firestore Timestamps)
  "createdAt": "2024-10-29T09:30:00.000Z",
  "dueDate": "2024-10-29T17:00:00.000Z",
  "updatedAt": "2024-10-29T08:00:00.000Z",
  
  // Separate date and time fields
  "startDate": "2024-10-29",
  "startTime": "09:30",
  "dueDateOnly": "2024-10-29",
  "dueTime": "17:00",
  
  // Flight information
  "flightCode": "AF1234",
  "flightOrigin": "CDG",
  "flightDestination": "JFK",
  "theoreticalHour": "14:30",
  "planeType": "A380",
  "gate": "A12"
}
```

## Field Descriptions

### Required Fields
- **flightCode** (string): Flight number (e.g., "AF1234", "BA456")
- **title** (string): The task title
- **truck** (string): Truck ID or driver userId
- **destination** (string): Service location (apron, terminal, gate area)
- **startDate** (string): Start date in yyyy-mm-dd format
- **dueDate** (string): Due date in yyyy-mm-dd format

### Optional Fields - Assignment Details
- **driver** (string): Driver name (defaults to "Unassigned")
- **description** (string): Detailed task description (defaults to "No description provided")
- **priority** (string): "low" | "medium" | "high" (defaults to "medium")
- **status** (string): "pending" | "in-progress" | "completed" | "cancelled" (defaults to "pending")
- **startTime** (string): Start time in HH:mm format (defaults to "09:00")
- **dueTime** (string): Due time in HH:mm format (defaults to "17:00")

### Optional Fields - Flight Information
- **flightOrigin** (string): Origin airport code (e.g., "CDG", "JFK", "LHR")
- **flightDestination** (string): Destination airport code (e.g., "LAX", "DXB", "SIN")
- **theoreticalHour** (string): Scheduled flight time in HH:mm format
- **planeType** (string): Aircraft type (e.g., "A380", "B777", "A320")
- **gate** (string): Gate number (e.g., "A12", "B5", "T2-C3")

### Auto-Generated Fields
- **id** (string): Firestore document ID (auto-generated)
- **flightId** (string): Generated from flight code for easy linking
- **createdAt** (Timestamp): Combined start date + time as Firestore Timestamp
- **dueDate** (Timestamp): Combined due date + time as Firestore Timestamp
- **updatedAt** (Timestamp): Last modification timestamp

## Why Two Date/Time Formats?

### Combined Fields (createdAt, dueDate)
✅ **Used for**:
- Accurate datetime calculations
- Gantt chart bar positioning
- Sorting tasks chronologically
- Filtering by datetime ranges

### Separate Fields (startDate, startTime, dueDateOnly, dueTime)
✅ **Used for**:
- Easy filtering by date only (all tasks on a specific date)
- Displaying in form inputs
- Querying by time ranges
- User-friendly display formats
- Converting to different locales/formats

## Date/Time Format Reference

| Field | Format | Example | Description |
|-------|--------|---------|-------------|
| startDate | yyyy-mm-dd | "2024-10-29" | ISO 8601 date format |
| startTime | HH:mm | "09:30" | 24-hour time format |
| dueDateOnly | yyyy-mm-dd | "2024-10-29" | ISO 8601 date format |
| dueTime | HH:mm | "17:00" | 24-hour time format |
| createdAt | ISO 8601 | "2024-10-29T09:30:00.000Z" | Full datetime with timezone |
| dueDate | ISO 8601 | "2024-10-29T17:00:00.000Z" | Full datetime with timezone |

## Form to Firestore Flow

```
User fills form:
├─ Task Title: "Deliver cargo"
├─ Start Date: 2024-10-29
├─ Start Time: 09:30
├─ Due Date: 2024-10-29
└─ Due Time: 17:00

      ↓

JavaScript combines date + time:
├─ startDateTime = new Date("2024-10-29T09:30")
└─ dueDateTime = new Date("2024-10-29T17:00")

      ↓

API receives data:
{
  title: "Deliver cargo",
  startDate: "2024-10-29",
  startTime: "09:30",
  dueDateOnly: "2024-10-29",
  dueTime: "17:00",
  createdAt: "2024-10-29T09:30:00.000Z",
  dueDate: "2024-10-29T17:00:00.000Z"
}

      ↓

Firestore saves as:
{
  title: "Deliver cargo",
  startDate: "2024-10-29",
  startTime: "09:30",
  dueDateOnly: "2024-10-29",
  dueTime: "17:00",
  createdAt: Timestamp(seconds: 1698573000, nanoseconds: 0),
  dueDate: Timestamp(seconds: 1698600000, nanoseconds: 0),
  updatedAt: Timestamp.now()
}
```

## API Endpoints

### Create Assignment
```javascript
POST /api/assignments

Body:
{
  "title": "Task title",
  "truck": "driver_123",
  "driver": "John Smith",
  "destination": "Terminal A",
  "description": "Task description",
  "priority": "high",
  "status": "pending",
  "startDate": "2024-10-29",
  "startTime": "09:30",
  "dueDateOnly": "2024-10-29",
  "dueTime": "17:00",
  "createdAt": "2024-10-29T09:30:00.000Z",
  "dueDate": "2024-10-29T17:00:00.000Z"
}

Response:
{
  "id": "firestore-document-id",
  "message": "Assignment created successfully",
  "assignment": { ...all fields including id }
}
```

### Get All Assignments
```javascript
GET /api/assignments

Response: Array of assignment objects with all fields
```

## Querying Examples

### Filter by Date Only
```javascript
// Get all tasks on October 29, 2024
db.collection('assignments')
  .where('startDate', '==', '2024-10-29')
  .get()
```

### Filter by Time Range
```javascript
// Get all morning tasks (before 12:00)
db.collection('assignments')
  .where('startTime', '<', '12:00')
  .get()
```

### Filter by DateTime
```javascript
// Get all tasks due today
const today = new Date()
today.setHours(0, 0, 0, 0)
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)

db.collection('assignments')
  .where('dueDate', '>=', Timestamp.fromDate(today))
  .where('dueDate', '<', Timestamp.fromDate(tomorrow))
  .get()
```

## Notes

- All dates are stored in UTC timezone in Firestore
- HTML5 date inputs use yyyy-mm-dd format natively
- HTML5 time inputs use HH:mm format natively
- The webapp automatically converts between formats
- Gantt chart uses the combined datetime fields for precise positioning
- Default time is 09:00 for start, 17:00 for due date if not specified

