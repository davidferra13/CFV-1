# Year/Week Prep Scheduling System

## Why This Was Built

A private chef's dinner event isn't just one calendar entry — it's 8–12 distinct activities spread across 3–4 days:

- 2 days before: equipment check
- Day before: grocery run, farmers market / fishmonger / specialty sourcing, optional early prep session (doughs, marinades, sauces)
- Morning of: main prep session, packing, mental prep
- Day of: travel, execution
- Day after: receipt upload, AAR, client follow-up

Previously, ChefFlow could suggest these activities (via DOP phases and prep prompts), but they never became **persistent calendar blocks**. That meant nothing was enforced, and things slipped through the cracks. This system adds the persistence layer.

---

## What Was Built

### 1. Database: `event_prep_blocks` table

**Migration:** `supabase/migrations/20260304000001_event_prep_blocks.sql`

```
event_prep_blocks
├── chef_id (tenant scoped)
├── event_id (nullable — standalone blocks allowed)
├── block_date (DATE)
├── start_time / end_time (TIME, optional)
├── block_type (ENUM: 10 types)
├── title, notes
├── store_name, store_address (for grocery/sourcing blocks)
├── estimated_duration_minutes
├── actual_duration_minutes
├── is_completed / completed_at
└── is_system_generated (true = chef confirmed an engine suggestion)
```

**Block types:**
| Type | When Used |
|---|---|
| `grocery_run` | Main grocery shopping |
| `specialty_sourcing` | Farmers market, fishmonger, butcher, wine shop |
| `prep_session` | At-home cooking prep |
| `packing` | Loading coolers and car |
| `travel_to_event` | Drive time to client |
| `mental_prep` | Chef centering ritual |
| `equipment_prep` | Check, clean, stage equipment |
| `admin` | Post-event receipts, AAR, client follow-up |
| `cleanup` | Post-event kitchen reset |
| `custom` | Anything else |

**Required types per event (for gap detection):** `grocery_run`, `prep_session`, `packing`, `equipment_prep`, `admin`

### 2. Pure Engine: `lib/scheduling/prep-block-engine.ts`

Zero DB calls. Mirrors the pattern of `timeline.ts` and `dop.ts`.

**`suggestPrepBlocks(event, existingBlocks, prefs)`**

- Calls `generateTimeline()` to get the departure time
- Works backward to compute prep_session start, packing start
- Uses `shop_day_before` preference to determine grocery_run date
- Generates one specialty_sourcing block per store in `default_specialty_stores`
- For events with >8 menu components, suggests a split prep (early session + morning-of)
- Skips types already covered by existing blocks

**`detectGaps(events, existingBlocks, prefs)`**

- For each upcoming non-terminal event, checks which required types are missing
- Returns `SchedulingGap[]` sorted: critical (< 48h) → warning (< 7 days) → info

### 3. Server Actions: `lib/scheduling/prep-block-actions.ts`

All actions follow `'use server'` + `requireChef()` + tenant scoping pattern.

| Action                            | Description                                  |
| --------------------------------- | -------------------------------------------- |
| `getEventPrepBlocks(eventId)`     | Blocks for one event                         |
| `getWeekPrepBlocks(offset)`       | Mon–Sun window                               |
| `getYearSummary(year)`            | 52-week grid data                            |
| `getSchedulingGaps()`             | All upcoming events missing required blocks  |
| `createPrepBlock(input)`          | Chef manually creates a block                |
| `bulkCreatePrepBlocks(blocks[])`  | Save chef-confirmed suggestions              |
| `updatePrepBlock(id, updates)`    | Edit a block                                 |
| `deletePrepBlock(id)`             | Remove a block                               |
| `completePrepBlock(id)`           | Mark done                                    |
| `uncompletePrepBlock(id)`         | Undo completion                              |
| `autoSuggestEventBlocks(eventId)` | Generate suggestions — **never saves to DB** |

**AI Policy compliance:** `autoSuggestEventBlocks` returns suggestions in memory only. The UI shows them to the chef for review. `bulkCreatePrepBlocks` is only called after explicit chef confirmation.

### 4. Per-Event Prep Panel: `components/events/event-prep-schedule.tsx`

Client component embedded in the event detail page (`/events/[id]`), below the DOP progress bar.

Shows:

- All prep blocks for the event, grouped by date
- Completion toggles per block
- "Auto-schedule" → suggestions → edit dates/times → confirm flow
- "Add Block" manual creation form
- Empty state with clear call to action

### 5. Week Planner: `app/(chef)/calendar/week/`

Server page + client component. Route: `/calendar/week?offset=N`

- **offset=0** = current week, **offset=-1** = last week, **offset=1** = next week
- 7-column grid (Mon–Sun)
- Confirmed events shown as amber anchor cards (non-editable, link to event)
- Prep blocks shown by day, sorted by start_time
- Gap alerts at top: critical (red) and warning (amber) with "Auto-schedule" buttons
- Add block button per day column
- Week navigation (prev/next/today)
- Auto-schedule flow: modal with editable suggestions → confirm → save

### 6. Year View: `app/(chef)/calendar/year/`

Server page + client component. Route: `/calendar/year?year=YYYY`

- 52-week grid grouped by month
- Each cell: week date, event count, gap indicator
- Cell colors: gray (no events), amber (events, all scheduled), red-bordered (gaps)
- Current week highlighted with amber ring
- Stats strip: total events, fully scheduled weeks, gap count
- Click any cell → navigates to `/calendar/week?offset=N`
- Prev/next year navigation

### 7. Navigation Integration

**Calendar page** (`/calendar`): Added "Week Planner" and "Year View" buttons in header.

**Dashboard**: Gap banner appears above the widget grid when upcoming events have missing prep blocks. Red for critical (< 48h), amber for warning. Links to week planner.

---

## How the Pieces Connect

```
Event is created/confirmed
  ↓
Chef opens /events/[id]
  → EventPrepSchedule shows: "No prep blocks scheduled. Auto-schedule to get started."
  → Chef clicks "Auto-schedule"
  → autoSuggestEventBlocks() runs engine (no DB write)
  → Suggestions shown: grocery_run on Fri, prep_session Sat 10am, packing Sat 1pm, etc.
  → Chef edits a date (moves grocery run to Thursday)
  → Chef clicks "Confirm 5 Blocks"
  → bulkCreatePrepBlocks() saves to event_prep_blocks
  ↓
Dashboard shows gap banner if any required blocks are still missing
  → "Plan Week →" link opens week planner
  ↓
Week planner shows the event + all prep blocks on their scheduled days
  → Chef marks "Grocery Run" complete after shopping
  → completePrepBlock() updates is_completed + completed_at
  ↓
Year view shows this week as amber (events, all scheduled) instead of red
```

---

## Type System

New types in `lib/scheduling/types.ts`:

- `PrepBlockType` — enum of 10 block types
- `PREP_BLOCK_TYPE_LABELS` — display labels for each type
- `PrepBlock` — persisted block from DB
- `PrepBlockSuggestion` — engine output (never persisted until chef confirms)
- `SchedulingGap` — event with missing required blocks
- `YearWeekSummary` — one cell in the year grid
- `YearSummary` — full 52-week data
- `CreatePrepBlockInput` / `UpdatePrepBlockInput` — mutation inputs

---

## Verification Steps

1. **Apply migration:**

   ```
   supabase db push --linked
   ```

2. **Regenerate types:**

   ```
   supabase gen types typescript --linked > types/database.ts
   ```

   (This removes the `@ts-nocheck` need from `prep-block-actions.ts`)

3. **Smoke test engine:**
   - Open an event → click "Auto-schedule" → verify suggestions appear without saving
   - Edit a suggestion date → confirm → verify blocks appear grouped by date
   - Mark a block complete → verify it turns green
   - Delete a block → verify it disappears

4. **Week planner:**
   - Navigate to `/calendar/week` → see current week
   - Confirm events appear as amber anchors
   - Gap alerts appear for events missing required blocks
   - "Auto-schedule" in gap alert opens modal for that event

5. **Year view:**
   - Navigate to `/calendar/year` → 52 weeks render
   - Weeks with events show amber
   - Weeks with gaps show red border
   - Click any week → navigates to week planner for that week

6. **Dashboard:**
   - Create an event with no prep blocks → gap banner appears on dashboard
   - Schedule all required blocks → gap banner disappears

---

## Future Improvements

- **ICS export of prep blocks** — add prep blocks to `.ics` download alongside the event
- **Recurring prep patterns** — if chef always shops on Fridays, remember that preference
- **Actual vs estimated duration tracking** — when chef marks complete, prompt for actual time to improve future estimates
- **Cross-event carry-forward** — when events are back-to-back, note shared ingredient runs
- **Notification triggers** — send push/email when a prep block is due soon and not yet completed
