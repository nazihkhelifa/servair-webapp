# Gantt Chart Date Range Filtering

## Overview

The Gantt chart includes powerful date range filtering controls that allow users to focus on specific time periods. This helps manage large numbers of tasks by showing only those relevant to the selected timeframe.

## Filter Options

### 1. **Show All** (Default)
- Displays all tasks across all dates
- Timeline automatically spans from earliest to latest task
- Minimum display: 30 days
- Use case: Get complete overview of all scheduled work

### 2. **Today**
- Shows only tasks active on the current day
- Timeline displays: 00:00 to 23:59 of today
- Filters tasks that overlap with today
- Use case: Daily operations and immediate priorities

### 3. **This Week**
- Shows tasks for the current week (Monday to Sunday)
- Timeline starts at Monday 00:00, ends Sunday 23:59
- Use case: Weekly planning and resource allocation

### 4. **This Month**
- Shows tasks for the current calendar month
- Timeline spans from 1st to last day of month
- Use case: Monthly planning and reporting

### 5. **Custom Range**
- Allows selection of any start and end date
- Shows two date pickers: "From" and "To"
- Timeline displays selected range exactly
- Use case: Specific reporting periods, project phases, or custom analysis

## How Filtering Works

### Task Visibility Logic

A task is **visible** if it **overlaps** with the selected date range:

```typescript
task.dueDate >= rangeStart && task.createdAt <= rangeEnd
```

**Examples:**

```
Selected Range: Oct 29 - Oct 31

Task A: Oct 28 14:00 → Oct 29 10:00
✅ VISIBLE (ends during range)

Task B: Oct 29 08:00 → Oct 30 17:00
✅ VISIBLE (entirely within range)

Task C: Oct 30 15:00 → Nov 1 12:00
✅ VISIBLE (starts during range)

Task D: Oct 28 09:00 → Nov 2 16:00
✅ VISIBLE (spans entire range)

Task E: Oct 25 09:00 → Oct 27 17:00
❌ HIDDEN (ends before range)

Task F: Nov 3 09:00 → Nov 5 17:00
❌ HIDDEN (starts after range)
```

### Timeline Adjustment

When filtering is active:
- Timeline shows **only the selected date range**
- Grid lines, hours, and intervals adjust to fit the range
- Task bars position relative to the filtered timeline
- Timeline info panel updates to show filtered period

## User Interface

### Filter Controls Location
- Located in the Gantt chart header
- Positioned below the title and timeline info
- Always visible when viewing timeline

### Visual Elements

```
┌─────────────────────────────────────────────┐
│ Date Range: [Show All] [Today] [Week] ...  │
└─────────────────────────────────────────────┘
```

**Active Filter:**
- Selected button: Blue background (bg-blue-600)
- Inactive buttons: Gray background (bg-gray-100)
- Hover effect on inactive buttons

**Custom Range:**
- Shows two date input fields when selected
- Format: Native browser date picker (yyyy-mm-dd)
- Positioned next to filter buttons
- Separated by vertical border

### Filter Status Messages

**Partial Results:**
```
⚠️ Showing 5 of 10 tasks that overlap with the selected date range.
   5 task(s) are outside this range.
```
- Yellow background
- Shows when some tasks are filtered out
- Displays count of visible vs total tasks

**No Results:**
```
⚠️ No tasks found in the selected date range.
   Try selecting a different range or click "Show All".
```
- Orange background
- Shows when no tasks match the filter
- Provides guidance to user

## Usage Examples

### Example 1: Daily Operations
**Scenario:** Check today's deliveries

**Steps:**
1. Click "Today" button
2. Timeline shows current day (00:00 - 23:59)
3. See all active tasks for today
4. Quick overview of immediate work

**Result:** Focus on today's priorities without distraction

### Example 2: Weekly Planning
**Scenario:** Plan next week's resources

**Steps:**
1. Click "This Week" button
2. Timeline shows Monday-Sunday
3. See all tasks scheduled this week
4. Identify resource conflicts or gaps

**Result:** Clear view of week's workload

### Example 3: Custom Reporting
**Scenario:** Generate report for Oct 15-25

**Steps:**
1. Click "Custom Range" button
2. Set From: Oct 15
3. Set To: Oct 25
4. Timeline shows exact 11-day period
5. See all overlapping tasks

**Result:** Precise data for reporting period

### Example 4: Return to Full View
**Scenario:** Check all scheduled work

**Steps:**
1. Click "Show All" button
2. Timeline expands to show all tasks
3. Minimum 30 days displayed
4. Complete project overview

**Result:** Full visibility of all work

## Technical Details

### State Management

```typescript
// Filter mode state
const [dateRangeMode, setDateRangeMode] = useState<
  'all' | 'today' | 'week' | 'month' | 'custom'
>('all')

// Custom range state
const [customStartDate, setCustomStartDate] = useState('')
const [customEndDate, setCustomEndDate] = useState('')
```

### Date Calculation

**Today:**
```typescript
const today = new Date()
today.setHours(0, 0, 0, 0)
const endOfToday = new Date(today)
endOfToday.setHours(23, 59, 59, 999)
```

**This Week (Monday-Sunday):**
```typescript
const weekStart = new Date(today)
const dayOfWeek = weekStart.getDay()
const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
weekStart.setDate(weekStart.getDate() + diff)
const weekEnd = new Date(weekStart)
weekEnd.setDate(weekEnd.getDate() + 6)
```

**This Month:**
```typescript
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
monthEnd.setHours(23, 59, 59, 999)
```

### Task Filtering

```typescript
const visibleTasks = dateRangeFilter 
  ? tasks.filter(task => {
      return task.dueDate >= dateRangeFilter.start && 
             task.createdAt <= dateRangeFilter.end
    })
  : tasks
```

### Timeline Generation

```typescript
// Use filtered date range if active
if (dateRangeFilter) {
  minDate = dateRangeFilter.start
  maxDate = dateRangeFilter.end
} else {
  // Auto-calculate from visible tasks
  minDate = new Date(Math.min(...allDates))
  maxDate = new Date(Math.max(...allDates))
}
```

## Benefits

### For Users
✅ **Focus**: See only relevant tasks for your timeframe
✅ **Clarity**: Reduced visual clutter
✅ **Speed**: Faster data comprehension
✅ **Flexibility**: Multiple quick options + custom range
✅ **Context**: Timeline info shows current filter

### For Operations
✅ **Daily Ops**: Quick "Today" view for immediate priorities
✅ **Planning**: Week/Month views for resource allocation
✅ **Reporting**: Custom ranges for specific periods
✅ **Analysis**: Easy comparison across time periods

### For Performance
✅ **Rendering**: Fewer bars to render = faster
✅ **Scrolling**: Smaller timeline = smoother navigation
✅ **Loading**: Only visible tasks processed for display

## Best Practices

### When to Use Each Filter

**Show All:**
- Initial view to understand full scope
- Long-term planning
- Identifying gaps in schedule

**Today:**
- Morning standup meetings
- Daily task assignment
- Immediate priority checks
- Real-time operations monitoring

**This Week:**
- Weekly planning meetings
- Resource allocation
- Identifying bottlenecks
- Team coordination

**This Month:**
- Monthly reviews
- Budget planning
- Long-term resource planning
- Month-end reporting

**Custom Range:**
- Project phase review
- Custom reporting periods
- Historical analysis
- Specific date investigation

### Tips

1. **Start with "Show All"** to get context
2. **Switch to "Today"** for daily operations
3. **Use "This Week"** for near-term planning
4. **Custom Range** for specific analysis
5. **Check filter info** to know what's hidden
6. **Return to "Show All"** periodically for full picture

## Keyboard Shortcuts (Future Enhancement)

Potential shortcuts for quick filtering:
- `T` - Today
- `W` - This Week  
- `M` - This Month
- `A` - Show All
- `C` - Custom Range

## Mobile Considerations

On smaller screens:
- Filter buttons stack vertically
- Date pickers use native mobile UI
- Timeline scrolls horizontally
- Filter status messages remain visible

## Accessibility

- All buttons keyboard accessible
- Clear visual indication of active filter
- Descriptive labels for screen readers
- Date pickers follow native accessibility standards
- Filter status announced to screen readers

## Future Enhancements

Potential additions:
- **Quick Presets**: "Next Week", "Last Month", "Quarter"
- **Saved Filters**: Save custom ranges for reuse
- **Keyboard Shortcuts**: Quick filter switching
- **Export**: Export filtered view as PDF/Excel
- **Sharing**: Share filtered URL with team
- **History**: Recently used filters
- **Favorites**: Star frequently used ranges

## Summary

Date range filtering makes the Gantt chart more powerful and user-friendly by:
- ✅ Allowing focus on specific time periods
- ✅ Providing quick preset options
- ✅ Supporting custom date selection
- ✅ Filtering tasks intelligently by overlap
- ✅ Adjusting timeline to match selection
- ✅ Showing clear status of what's visible
- ✅ Maintaining full functionality in all modes

Users can seamlessly switch between viewing all tasks and focusing on specific timeframes, making the Gantt chart adaptable to various workflows and use cases.

