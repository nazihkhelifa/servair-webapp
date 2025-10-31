# Gantt Chart Positioning Accuracy

## How Task Positioning Works

The Gantt chart uses precise time-based calculations to position tasks accurately on the timeline.

### Timeline Setup

1. **Date Range Normalization**
   - **Min Date**: Set to midnight (00:00:00) of the earliest task start date
   - **Max Date**: Set to end of day (23:59:59) of the latest task due date
   - **Minimum Range**: 30 days guaranteed
   - **Grid**: 30-minute intervals (48 intervals per day)

```typescript
// Example:
// Task 1: Oct 29, 2024 09:30 → Oct 29, 2024 17:00
// Task 2: Oct 30, 2024 14:00 → Oct 30, 2024 18:30

minDate = Oct 29, 2024 00:00:00  // Start of first day
maxDate = Oct 30, 2024 23:59:59  // End of last day
```

2. **Timeline Scale**
   - Each 30-minute interval = 60px wide
   - Each hour = 120px (2 intervals)
   - Each day = 2,880px (48 intervals)

### Position Calculation

```typescript
const getDatePosition = (date: Date) => {
  const timeDiff = date.getTime() - minDate.getTime()
  const intervalsPassed = timeDiff / (30 * 60 * 1000) // 30 minutes in ms
  return (intervalsPassed / totalIntervals) * 100
}
```

**Example Calculation:**

```
Task: Oct 29, 2024 09:30 → 17:00

Timeline:
- minDate: Oct 29, 2024 00:00:00
- maxDate: Oct 30, 2024 23:59:59
- Total intervals: 48 * 2 = 96

Start Position (09:30):
- Time from midnight: 9.5 hours = 570 minutes
- Intervals passed: 570 / 30 = 19 intervals
- Position: (19 / 96) * 100 = 19.79%

End Position (17:00):
- Time from midnight: 17 hours = 1020 minutes  
- Intervals passed: 1020 / 30 = 34 intervals
- Position: (34 / 96) * 100 = 35.42%

Bar Width: 35.42% - 19.79% = 15.63%
```

### Visual Accuracy Features

#### 1. **Time Display on Task Bars**
Each task bar shows exact start and end times:
```
[Task Title] 09:30 → 17:00
```

#### 2. **Time Markers**
- White vertical bars at start and end of each task
- Clearly shows exact positioning

#### 3. **Hover Tooltip**
Shows detailed information:
- Full start datetime
- Full end datetime
- Position percentages
- Pixel width
- Task duration in hours

#### 4. **Timeline Info Panel**
Top-right panel displays:
- Date range being displayed
- Number of days
- Total intervals (30min each)
- Scale information

### Grid Alignment

#### Three-Tier Header
```
┌─────────────────────────────────────┐
│  Date: Wed, Oct 29   (Full Day)    │
├──────┬──────┬──────┬──────┬────────┤
│ 00:00│ 01:00│ 02:00│ 03:00│ ...    │ (Hours)
├───┬──┼───┬──┼───┬──┼───┬──┼────────┤
│00│30│00│30│00│30│00│30│ ... │      │ (30-min intervals)
└───┴──┴───┴──┴───┴──┴───┴──┴────────┘
```

#### Vertical Grid Lines
- **Hour lines**: Darker (border-gray-200)
- **30-min lines**: Lighter (border-gray-50)
- **Current time**: Blue line with dot marker

### Verification Methods

#### Method 1: Visual Inspection
1. Look at the task bar
2. Check the displayed times (e.g., "09:30 → 17:00")
3. Visually align with the hour markers below
4. Verify the bar spans the correct hours

#### Method 2: Hover Tooltip
1. Hover over any task bar
2. Check the "Position" field (e.g., "19.79% → 35.42%")
3. Check the "Duration" field (e.g., "7.5h")
4. Verify calculations match expected values

#### Method 3: Timeline Info Panel
1. Look at top-right info panel
2. Note the total days and intervals
3. Calculate expected position for a known time
4. Compare with actual position shown in tooltip

### Example Verification

**Task: "Deliver Cargo"**
- Start: Oct 29, 2024 14:00
- Due: Oct 29, 2024 16:30
- Duration: 2.5 hours

**Expected Position:**
```
Timeline: Oct 29 00:00 to Oct 30 23:59 (2 days, 96 intervals)

Start (14:00):
- Minutes from midnight: 840
- Intervals: 840 / 30 = 28
- Position: (28 / 96) * 100 = 29.17%

End (16:30):
- Minutes from midnight: 990
- Intervals: 990 / 30 = 33
- Position: (33 / 96) * 100 = 34.38%

Width: 34.38% - 29.17% = 5.21%
Pixel width: 5.21% of (96 * 60px) = 300px
```

**Verification:**
1. Task bar should start just after the 14:00 hour marker
2. Task bar should end between 16:00 and 17:00
3. Tooltip should show ~29% → ~34%
4. Duration should show 2.5h

### Common Issues & Solutions

#### Issue: Task bar doesn't align with hour markers
**Cause**: Browser zoom level or rounding errors
**Solution**: Reset browser zoom to 100%

#### Issue: Very short tasks are hard to see
**Cause**: Task duration < 30 minutes
**Solution**: Minimum width set to 150px, hover for details

#### Issue: Times seem off by a few hours
**Cause**: Timezone differences
**Solution**: All times stored in UTC, displayed in local timezone

#### Issue: Task bar extends beyond grid
**Cause**: Task extends beyond visible date range
**Solution**: Timeline automatically extends to show all tasks

### Accuracy Guarantees

✅ **Positioning Accuracy**: Down to the minute
- Uses millisecond timestamps for calculations
- No rounding until final percentage calculation

✅ **Grid Accuracy**: 30-minute precision
- Each column represents exactly 30 minutes
- Grid lines aligned to hour boundaries

✅ **Width Accuracy**: Proportional to duration
- Task spanning 1 hour = width of 2 intervals
- Task spanning 30 min = width of 1 interval

✅ **Date Alignment**: Normalized to midnight
- All days start at 00:00:00
- All days end at 23:59:59
- No arbitrary time offsets

### Technical Details

**Data Flow:**
```
Firestore → API → Tasks Page → Gantt Chart

Assignment in Firestore:
{
  createdAt: Timestamp (e.g., Oct 29 09:30)
  dueDate: Timestamp (e.g., Oct 29 17:00)
}

↓

API converts to ISO strings:
{
  createdAt: "2024-10-29T09:30:00.000Z"
  dueDate: "2024-10-29T17:00:00.000Z"
}

↓

Tasks Page converts to Date objects:
{
  createdAt: Date object with exact time
  dueDate: Date object with exact time
}

↓

Gantt Chart calculates positions:
{
  startPos: 19.79%
  endPos: 35.42%
  width: 15.63%
}
```

**Precision:**
- Firestore: Nanosecond precision (Timestamp)
- JavaScript: Millisecond precision (Date.getTime())
- Display: Minute precision (HH:mm format)
- Positioning: Sub-pixel precision (percentage with 2 decimals)

## Summary

The Gantt chart provides **minute-level accuracy** for task positioning:
- ✅ Tasks positioned based on exact start/end times
- ✅ Visual alignment with hour markers
- ✅ 30-minute interval grid for precision
- ✅ Time labels on each task bar
- ✅ Detailed tooltip with position metrics
- ✅ Timeline info panel for context
- ✅ Current time indicator for reference

All calculations use the actual datetime values from Firestore, ensuring tasks appear exactly where they should on the timeline.

