# Daily Ops Command Center

**Route:** `/stations/daily-ops`
**Created:** 2026-02-24
**Branch:** `feature/risk-gap-closure`

## What This Is

The Daily Ops Command Center is a single-page morning overview for the chef. Instead of clicking through individual station clipboards, the task list, and the order sheet separately, this page aggregates the state of the entire kitchen operation into one view.

## Files

| File                                            | Purpose                                                         |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `app/(chef)/stations/daily-ops/page.tsx`        | Server component page (the UI)                                  |
| `lib/stations/daily-ops-actions.ts`             | Server action: `getDailyOpsData()` fetches all data in one call |
| `components/stations/daily-ops-actions-bar.tsx` | Client component for the "Generate Opening Tasks" button        |

## Page Sections

### 1. Header

- Today's date (formatted: "Monday, February 24, 2026")
- Shift indicator based on current time: Morning (<12), Afternoon (12-17), Evening (17+)
- Breadcrumb: Stations > Daily Ops

### 2. Quick Action Bar

- **Generate Opening Tasks** -- calls `generateTasksFromTemplate` with the first `opening` category template found. If no opening template exists, shows "Create Opening Template" linking to `/tasks/templates`.
- **View Order Sheet** -- links to `/stations/orders`
- **Print Clipboards** -- links to `/stations` (opens in new tab)

### 3. All Stations At A Glance

Grid of interactive cards (1 col mobile, 2 col tablet, 3-4 col desktop). Each card shows:

- Station name
- Stock at par percentage with color-coded progress bar (green >= 80%, amber 50-79%, red < 50%)
- 86'd count (red badge, only shown if > 0)
- Who's checked in (green name) or "No one checked in" (gray)
- Last updated (relative time: "5m ago", "2h ago")
- Component count
- Click navigates to that station's clipboard

### 4. Today's Tasks Summary

- Total / completed / pending / in-progress counts
- Completion percentage with color-coded progress bar
- Overdue tasks (due_time has passed, status != done) highlighted in red cards with priority badge and due time

### 5. Pending Orders

- Total count of pending order requests
- Top 5 items by quantity with component name, station name, and amount
- "View full sheet" link

### 6. Alerts

Three types, color-coded:

- **86'd items** (red) -- currently unavailable items across all stations
- **Expiring items** (amber) -- items where `made_at + shelf_life_days <= today`
- **Low stock** (blue) -- items where `on_hand + made < 50% of par_level`

If no alerts exist and stations are set up, shows a green "All clear" message.

## Data Architecture

`getDailyOpsData()` uses `Promise.allSettled` to fire 6 parallel queries:

1. Active stations
2. Today's clipboard entries (with component data)
3. Active shifts (check_out_at IS NULL, with staff names)
4. Today's tasks (with staff names)
5. Pending order requests (with component and station names)
6. First opening task template

If any individual query fails, the others still return data. The page degrades gracefully -- a failed stations query shows "No stations" rather than crashing.

All data is processed server-side into typed result objects (`StationSnapshot`, `TaskSummary`, `OrderSummary`, `AlertItem`) to minimize client-side computation.

## Database Columns Used

- `clipboard_entries.entry_date` (NOT `clipboard_date`) -- the actual DB column name
- `clipboard_entries.is_86d`, `eighty_sixed_at`, `on_hand`, `made`, `made_at`
- `station_components.par_level`, `shelf_life_days`
- `shift_logs.check_out_at` (NULL = still active), `staff_member_id`
- `tasks.due_date`, `due_time`, `status`, `priority`, `assigned_to`
- `order_requests.status = 'pending'`, `quantity`
- `task_templates.category = 'opening'`

## Future Enhancements

- Real-time refresh via polling or WebSocket for shift check-ins
- Weather widget (affects outdoor catering events)
- Revenue forecast for today's events
- Direct task completion from the overdue list
