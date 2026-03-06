# Widget Intelligence - Exact Build Spec

> Every file to create, every function to write, every query to run, every component to modify.
> Maps to the existing dashboard architecture: Suspense sections, server-action data fetching,
> CollapsibleWidget wrappers, CSS order reordering, props-down pattern.

---

## Architecture Overview (Current State)

```
page.tsx (instant: prefs + queue + archetype)
  |-- ScheduleSection (Suspense)  -> Today's Schedule, Week Strip, DOP Tasks, Prep Prompts
  |-- AlertsSection (Suspense)    -> Response Time SLA, Follow-Ups, Scheduling Gaps
  |-- IntelligenceSection (Suspense) -> Business Health, Proactive Alerts
  |-- BusinessSection (Suspense)  -> Snapshot, Accountability, Insights, Hours, Todo, Activity
```

**Data flow:** Section fetches data via server actions -> passes as props to widget components.
**Widget config:** `chef_preferences.dashboard_widgets` JSONB array, `isWidgetEnabled()` + `getWidgetOrder()`.
**No dashboard caching:** All queries are fresh on every load.

---

## WIDGET 1: TODAY'S SCHEDULE

**Current file:** `app/(chef)/dashboard/_sections/schedule-section.tsx` (inline, no separate component)
**Current data:** `getTodaysSchedule()` from `lib/scheduling/actions.ts`

### 1a. Contextual Countdown Timers

**What changes:**

Create new component:

```
components/dashboard/todays-schedule-widget.tsx
```

Extract today's schedule rendering from `schedule-section.tsx` into this dedicated component.

**New server action** in `lib/scheduling/actions.ts`:

```typescript
export async function getTodaysScheduleEnriched(): Promise<EnrichedTodaySchedule> {
  // Existing getTodaysSchedule() data PLUS:
  // - milestones with absolute timestamps (already in timeline)
  // - current phase detection (which milestone window are we in?)
  // - next milestone ETA
}
```

**New type** in `lib/scheduling/types.ts`:

```typescript
interface EnrichedTodaySchedule extends TodaySchedule {
  currentPhase:
    | 'pre_event'
    | 'shopping'
    | 'prep'
    | 'packing'
    | 'travel'
    | 'service'
    | 'cleanup'
    | 'post_event'
  nextMilestone: { label: string; time: string; minutesUntil: number } | null
  departureTime: string | null // When to leave (from route plan)
  minutesUntilDeparture: number | null
}
```

**Client-side countdown** in `todays-schedule-widget.tsx`:

```typescript
// Client component with useEffect interval
'use client'

const [now, setNow] = useState(Date.now())
useEffect(() => {
  const interval = setInterval(() => setNow(Date.now()), 60_000) // Update every minute
  return () => clearInterval(interval)
}, [])

// Derive countdown from server-provided milestone times + client now
const minutesUntil = differenceInMinutes(parseISO(nextMilestone.time), now)
```

**Color logic (pure CSS classes, no state):**

```typescript
const urgencyClass =
  minutesUntil > 120 ? 'text-emerald-600' : minutesUntil > 30 ? 'text-amber-600' : 'text-red-600'
```

**Render:**

```
"Leaving in 1h 42m" (green)  ->  "Leaving in 28m" (amber)  ->  "Leave NOW" (red, pulsing)
"Service starts in 3h 15m"   ->  "Service starts in 12m"   ->  "Service started 5m ago"
```

**Files touched:**

- `lib/scheduling/actions.ts` - add `getTodaysScheduleEnriched()` (extend existing `getTodaysSchedule`)
- `lib/scheduling/types.ts` - add `EnrichedTodaySchedule` type
- `components/dashboard/todays-schedule-widget.tsx` - NEW component (client component for countdown)
- `app/(chef)/dashboard/_sections/schedule-section.tsx` - swap inline rendering for new component

---

### 1b. Weather-Aware Alerts

**Current state:** Weather already fetched via `getWeatherForEvents()` in schedule-section.tsx and passed to DOP panel. Already shows emoji + temp + precipitation.

**What changes:**

Add alert logic to `todays-schedule-widget.tsx`:

```typescript
interface WeatherAlert {
  severity: 'info' | 'warning' | 'critical'
  message: string
}

function getWeatherAlerts(weather: InlineWeather, event: TodayEvent): WeatherAlert[] {
  const alerts: WeatherAlert[] = []

  // Outdoor event + rain
  if (event.isOutdoor && weather.precipitationChance > 40) {
    alerts.push({
      severity: weather.precipitationChance > 70 ? 'critical' : 'warning',
      message: `${weather.precipitationChance}% chance of rain - outdoor event`,
    })
  }

  // Extreme heat
  if (weather.highF > 90) {
    alerts.push({
      severity: 'warning',
      message: `${weather.highF}F high - pack extra ice, hydration for staff`,
    })
  }

  // Freezing
  if (weather.lowF < 32) {
    alerts.push({
      severity: 'warning',
      message: `${weather.lowF}F low - protect perishables during transport`,
    })
  }

  return alerts
}
```

**New column needed on events table:**

```sql
-- Migration: add is_outdoor flag to events
ALTER TABLE events ADD COLUMN is_outdoor boolean DEFAULT false;
```

**Files touched:**

- `components/dashboard/todays-schedule-widget.tsx` - add `getWeatherAlerts()` function + render alerts
- `supabase/migrations/XXXXXXXXX_add_outdoor_flag.sql` - NEW migration (additive, safe)
- `components/events/event-form.tsx` - add "Outdoor event?" toggle to event creation form

---

### 1c. Traffic-Adjusted Departure Time

**What changes:**

**New server action** in `lib/scheduling/actions.ts`:

```typescript
export async function getDepartureEstimate(
  originAddress: string,
  destinationAddress: string,
  arrivalTime: string // ISO timestamp - when they need to arrive
): Promise<DepartureEstimate> {
  // Use Google Maps Directions API (already have API key for maps integration)
  // Request: directions with departure_time for traffic prediction
  // Return: recommended departure time, drive duration with traffic, distance
}
```

**New type:**

```typescript
interface DepartureEstimate {
  departBy: string // ISO timestamp
  driveDurationMinutes: number
  driveDurationInTraffic: number
  distanceMiles: number
  stops: Array<{ name: string; addedMinutes: number }> // intermediate stops
  totalTripMinutes: number // drive + all stops
}
```

**Data source:** Chef's home address from `chef_preferences.home_address` + event location from `events.location`.

**Integration in schedule-section.tsx:**

```typescript
// Only fetch if today has an event and chef has home address set
if (todayEvent && preferences.home_address) {
  const departure = await getDepartureEstimate(
    preferences.home_address,
    todayEvent.location,
    todayEvent.arrival_time
  )
  // Pass to todays-schedule-widget as prop
}
```

**Render in widget:**

```
"Leave by 2:15 PM (47 min drive with traffic)"
"Leave by 2:15 PM via Whole Foods (+15 min stop)"
```

**Files touched:**

- `lib/scheduling/actions.ts` - add `getDepartureEstimate()`
- `lib/scheduling/types.ts` - add `DepartureEstimate` type
- `components/dashboard/todays-schedule-widget.tsx` - render departure time with countdown
- `app/(chef)/dashboard/_sections/schedule-section.tsx` - fetch departure estimate, pass as prop

---

### 1d. Client Context Card

**What changes:**

**New server action** in `lib/scheduling/actions.ts`:

```typescript
export async function getEventClientContext(clientId: string): Promise<ClientEventContext> {
  const { data } = await supabase
    .from('clients')
    .select('name, email, phone, dietary_restrictions, allergies, notes')
    .eq('id', clientId)
    .single()

  const { count: eventCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('status', 'completed')

  const { data: lastEvent } = await supabase
    .from('events')
    .select('event_date, occasion')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('event_date', { ascending: false })
    .limit(1)
    .single()

  return {
    name: data.name,
    dietaryRestrictions: data.dietary_restrictions,
    allergies: data.allergies, // RED HIGHLIGHT - safety critical
    pastEventCount: eventCount ?? 0,
    lastEventDate: lastEvent?.event_date ?? null,
    lastOccasion: lastEvent?.occasion ?? null,
  }
}
```

**Render in widget (always visible, no click needed):**

```
Sarah Chen - Pescatarian
  ALLERGY: Shellfish (severe)          <-- red badge, always visible
  3rd event together - last: Nov 2025 Anniversary Dinner
```

**Files touched:**

- `lib/scheduling/actions.ts` - add `getEventClientContext()`
- `lib/scheduling/types.ts` - add `ClientEventContext` type
- `components/dashboard/todays-schedule-widget.tsx` - render client context card
- `app/(chef)/dashboard/_sections/schedule-section.tsx` - fetch client context, pass as prop

---

### 1e. Prep Completion Gate

**Current state:** DOP tasks already tracked via `getDOPTaskDigest()`. Prep status dots on Week Strip.

**What changes:**

**New function** in `lib/scheduling/dop.ts` (or wherever DOP logic lives):

```typescript
export function computePrepGate(digest: DOPTaskDigest, eventId: string): PrepGate {
  const eventTasks = digest.events.find((e) => e.eventId === eventId)
  if (!eventTasks) return { progress: 1, total: 0, completed: 0, blockers: [] }

  const total = eventTasks.tasks.length
  const completed = eventTasks.tasks.filter((t) => t.completed).length
  const blockers = eventTasks.tasks
    .filter((t) => !t.completed && t.isBlocker)
    .map((t) => ({ label: t.label, category: t.category, deadline: t.deadline }))

  return {
    progress: total > 0 ? completed / total : 1,
    total,
    completed,
    blockers, // Hard blocks shown in red
  }
}
```

**Render in widget:**

```
Prep: 8/12 complete [====----] 67%
  BLOCKED: Buy groceries (due by 2pm)    <-- red, must do first
  BLOCKED: Marinate lamb (due by 3pm)    <-- red
```

**One-tap completion:** Each blocker has a checkbox that calls existing `toggleDOPTaskCompletion()`.

**Files touched:**

- `lib/scheduling/dop.ts` (or equivalent) - add `computePrepGate()` pure function
- `components/dashboard/todays-schedule-widget.tsx` - render prep gate with progress bar + blocker list

---

### 1f. Smart Packing Checklist Summary

**What changes:**

**New server action** in `lib/scheduling/actions.ts`:

```typescript
export async function getPackingSummary(eventId: string): Promise<PackingSummary> {
  // Query packing_list_items for this event
  const { data: items } = await supabase
    .from('packing_list_items')
    .select('id, name, packed, category')
    .eq('event_id', eventId)

  // Query AAR forgotten items (historical)
  const { data: forgottenHistory } = await supabase
    .from('after_action_reviews')
    .select('forgotten_items')
    .eq('tenant_id', tenantId)
    .not('forgotten_items', 'is', null)

  // Count frequency of each forgotten item
  const forgottenCounts: Record<string, number> = {}
  for (const aar of forgottenHistory ?? []) {
    for (const item of aar.forgotten_items ?? []) {
      forgottenCounts[item] = (forgottenCounts[item] || 0) + 1
    }
  }

  const unpacked = items?.filter((i) => !i.packed) ?? []
  const frequentlyForgotten = unpacked
    .filter((i) => (forgottenCounts[i.name] ?? 0) >= 2)
    .map((i) => ({ name: i.name, forgottenCount: forgottenCounts[i.name] }))

  return {
    totalItems: items?.length ?? 0,
    packedCount: items?.filter((i) => i.packed).length ?? 0,
    unpackedItems: unpacked.map((i) => i.name),
    frequentlyForgotten, // "You forgot tongs on 3 of last 5 events"
  }
}
```

**Render:**

```
Packing: 12/15 items packed
  Missing: Tongs (forgotten 3x!), Serving spoons, Torch
```

**Files touched:**

- `lib/scheduling/actions.ts` - add `getPackingSummary()`
- `lib/scheduling/types.ts` - add `PackingSummary` type
- `components/dashboard/todays-schedule-widget.tsx` - render packing summary
- `app/(chef)/dashboard/_sections/schedule-section.tsx` - fetch packing summary for today's event

---

### 1g. Post-Event Lookahead

**What changes:**

**New server action** in `lib/scheduling/actions.ts`:

```typescript
export async function getNextDayLookahead(todayEventId: string): Promise<NextDayLookahead | null> {
  const tomorrow = addDays(new Date(), 1)
  const { data: tomorrowEvent } = await supabase
    .from('events')
    .select('id, occasion, guest_count, client:clients(name)')
    .eq('tenant_id', tenantId)
    .eq('event_date', format(tomorrow, 'yyyy-MM-dd'))
    .not('status', 'in', '("cancelled","completed")')
    .limit(1)
    .single()

  if (!tomorrowEvent) return null

  // Find shared ingredients between today's event menu and tomorrow's event menu
  const [todayIngredients, tomorrowIngredients] = await Promise.all([
    getEventIngredients(todayEventId),
    getEventIngredients(tomorrowEvent.id),
  ])

  const shared = todayIngredients.filter((i) =>
    tomorrowIngredients.some((t) => t.ingredientId === i.ingredientId)
  )

  return {
    event: {
      id: tomorrowEvent.id,
      occasion: tomorrowEvent.occasion,
      guestCount: tomorrowEvent.guest_count,
      clientName: tomorrowEvent.client?.name,
    },
    sharedIngredients: shared.map((i) => i.name),
  }
}
```

**Render (only if tomorrow has an event):**

```
Tomorrow: Johnson dinner (6 guests)
  Shared ingredients: olive oil, lemons, garlic - buy extra today
```

**Files touched:**

- `lib/scheduling/actions.ts` - add `getNextDayLookahead()`
- `lib/scheduling/types.ts` - add `NextDayLookahead` type
- `components/dashboard/todays-schedule-widget.tsx` - render lookahead section
- `app/(chef)/dashboard/_sections/schedule-section.tsx` - fetch lookahead, pass as prop

---

## WIDGET 2: PRIORITY QUEUE

**Current files:**

- `components/queue/queue-summary.tsx` (QueueSummaryBar)
- `components/queue/next-action.tsx` (NextActionCard)
- `components/queue/queue-item-row.tsx` (QueueItemRow)
- `lib/queue/build.ts` (builder)
- `lib/queue/score.ts` (scoring)
- `lib/queue/providers/*.ts` (9 domain providers)

### 2a. Inline Actions (Zero-Navigation Completions)

**What changes:**

**New component:**

```
components/queue/queue-item-inline-action.tsx
```

This is a client component that renders an expandable action panel inside each QueueItemRow.

**New type** in `lib/queue/types.ts`:

```typescript
interface InlineAction {
  type:
    | 'send_message'
    | 'record_payment'
    | 'respond_inquiry'
    | 'send_followup'
    | 'file_aar'
    | 'log_expense'
  prefill: Record<string, string> // Pre-filled form values
}
```

**Modify queue item generation** - each provider adds `inlineAction` to its items:

In `lib/queue/providers/inquiry.ts`:

```typescript
// When generating "respond to inquiry" items:
inlineAction: {
  type: 'respond_inquiry',
  prefill: {
    clientName: inquiry.client_name,
    occasion: inquiry.occasion,
    guestCount: String(inquiry.guest_count),
    suggestedResponse: getInquiryResponseTemplate(inquiry.occasion, inquiry.guest_count),
  }
}
```

In `lib/queue/providers/post-event.ts`:

```typescript
// When generating "send follow-up" items:
inlineAction: {
  type: 'send_followup',
  prefill: {
    clientName: event.client_name,
    occasion: event.occasion,
    eventDate: event.event_date,
    draftMessage: getFollowUpTemplate(event),
  }
}
```

In `lib/queue/providers/financial.ts`:

```typescript
// When generating "record payment" items:
inlineAction: {
  type: 'record_payment',
  prefill: {
    eventId: event.id,
    amount: String(event.balance_due_cents),
    suggestedMethod: 'venmo', // most common for this chef
  }
}
```

**Inline action component renders:**

```typescript
// components/queue/queue-item-inline-action.tsx
'use client'

export function QueueItemInlineAction({ action, onComplete }: Props) {
  switch (action.type) {
    case 'respond_inquiry':
      return <InlineInquiryResponse prefill={action.prefill} onSend={handleSend} />
    case 'record_payment':
      return <InlineRecordPayment prefill={action.prefill} onRecord={handleRecord} />
    case 'send_followup':
      return <InlineFollowUpSend prefill={action.prefill} onSend={handleSend} />
    // etc.
  }
}
```

Each inline form:

- Pre-fills from queue item data
- Has a textarea (editable) + "Send" / "Record" button
- On success: removes item from queue, shows confirmation, reveals next item
- On failure: shows error, keeps form open

**Existing server actions to reuse:**

- `sendMessage()` from `lib/messaging/actions.ts`
- `recordPayment()` from `lib/payments/actions.ts`
- `respondToInquiry()` or similar from `lib/inquiries/actions.ts`

**Files touched:**

- `lib/queue/types.ts` - add `InlineAction` type to `QueueItem`
- `lib/queue/providers/inquiry.ts` - add `inlineAction` to inquiry items
- `lib/queue/providers/post-event.ts` - add `inlineAction` to follow-up items
- `lib/queue/providers/financial.ts` - add `inlineAction` to payment items
- `components/queue/queue-item-inline-action.tsx` - NEW component
- `components/queue/queue-item-row.tsx` - add expand/collapse toggle, render inline action

---

### 2b. Revenue-Weighted Priority Scoring

**What changes:**

**Modify** `lib/queue/score.ts`:

Current scoring:

```
TIME_PRESSURE (0-400) + IMPACT (0-250) + BLOCKING (0-150) + STALENESS (0-100) + REVENUE (0-100) = max 1000
```

The REVENUE bucket already exists but is capped at 100. Reweight:

```typescript
// lib/queue/score.ts - updated weights
const WEIGHTS = {
  TIME_PRESSURE: 300, // was 400
  IMPACT: 200, // was 250
  BLOCKING: 150, // unchanged
  STALENESS: 100, // unchanged
  REVENUE: 250, // was 100 <-- MAJOR INCREASE
}

function computeRevenueScore(item: QueueItem): number {
  if (!item.revenueCents) return 0
  // Log scale: $100 = 50pts, $1000 = 125pts, $5000 = 200pts, $10000 = 250pts
  return Math.min(250, Math.round(50 * Math.log10(item.revenueCents / 100 + 1)))
}
```

**Add revenue context to each provider** - providers must set `revenueCents` on items:

In `lib/queue/providers/inquiry.ts`:

```typescript
// Estimate from guest count * avg per-guest revenue (from chef's history)
revenueCents: inquiry.budget_cents ?? estimateEventRevenue(inquiry.guest_count, avgPerGuestCents)
```

In `lib/queue/providers/event.ts`:

```typescript
revenueCents: event.quoted_price_cents ?? 0
```

**Display in QueueItemRow:**

```
Respond to inquiry - Sarah Chen          $4,500 potential
  Anniversary dinner, 8 guests, Jun 14
```

**Files touched:**

- `lib/queue/score.ts` - reweight scoring, enhance `computeRevenueScore()`
- `lib/queue/types.ts` - ensure `revenueCents` is on `QueueItem` (may already exist)
- `lib/queue/providers/inquiry.ts` - set `revenueCents` from budget or estimate
- `lib/queue/providers/event.ts` - set `revenueCents` from quoted price
- `lib/queue/providers/financial.ts` - set `revenueCents` from invoice amount
- `lib/queue/providers/post-event.ts` - set `revenueCents` from event value (for follow-ups)
- `components/queue/queue-item-row.tsx` - render dollar context

---

### 2c. Time-Decay Escalation

**What changes:**

**Modify** `lib/queue/score.ts`:

Current staleness scoring is linear. Make it exponential:

```typescript
function computeStalenessScore(item: QueueItem): number {
  const hoursOld = differenceInHours(new Date(), parseISO(item.createdAt))

  // Exponential decay: items get increasingly urgent
  // 0-2h:  0-10 pts
  // 2-12h: 10-30 pts
  // 12-24h: 30-60 pts
  // 24-72h: 60-85 pts
  // 72h+: 85-100 pts
  return Math.min(100, Math.round(100 * (1 - Math.exp(-hoursOld / 24))))
}
```

**Auto-escalate urgency label** in `lib/queue/build.ts`:

```typescript
function deriveUrgency(item: QueueItem): 'critical' | 'high' | 'normal' | 'low' {
  const hoursOld = differenceInHours(new Date(), parseISO(item.createdAt))

  // Provider sets base urgency, time decay can only escalate (never reduce)
  if (item.domain === 'inquiry' && hoursOld > 24) return 'critical'
  if (item.domain === 'inquiry' && hoursOld > 12) return 'high'
  if (hoursOld > 72) return Math.max(item.urgency, 'high') // anything 3+ days old
  return item.urgency // provider default
}
```

**Visual in QueueItemRow:**

```
"Waiting 3h"  (gray)  ->  "Waiting 18h" (amber)  ->  "Waiting 2d" (red, pulsing)
```

**Files touched:**

- `lib/queue/score.ts` - exponential staleness curve
- `lib/queue/build.ts` - auto-escalate urgency based on age
- `components/queue/queue-item-row.tsx` - render "Waiting Xh" badge with color escalation

---

### 2d. Batching Suggestions

**What changes:**

**New function** in `lib/queue/build.ts`:

```typescript
export function computeBatches(items: QueueItem[]): QueueBatch[] {
  const batches: QueueBatch[] = []

  // Group by action type
  const followUps = items.filter((i) => i.inlineAction?.type === 'send_followup')
  if (followUps.length >= 2) {
    batches.push({
      label: `${followUps.length} follow-up emails to send`,
      estimatedMinutes: followUps.length * 3,
      items: followUps,
    })
  }

  const expenses = items.filter((i) => i.inlineAction?.type === 'log_expense')
  if (expenses.length >= 2) {
    batches.push({
      label: `${expenses.length} expenses need receipts`,
      estimatedMinutes: expenses.length * 2,
      items: expenses,
    })
  }

  const inquiries = items.filter((i) => i.inlineAction?.type === 'respond_inquiry')
  if (inquiries.length >= 2) {
    batches.push({
      label: `${inquiries.length} inquiries to respond to`,
      estimatedMinutes: inquiries.length * 4,
      items: inquiries,
    })
  }

  return batches
}
```

**New type:**

```typescript
interface QueueBatch {
  label: string
  estimatedMinutes: number
  items: QueueItem[]
}
```

**New component:**

```
components/queue/queue-batch-banner.tsx
```

Renders above queue items:

```
"You have 3 follow-up emails to send. Batch them now? (est. 9 min)" [Start batch]
```

Clicking "Start batch" enters a flow: show first item's inline action -> on complete, auto-show next -> repeat until batch done.

**Files touched:**

- `lib/queue/build.ts` - add `computeBatches()`
- `lib/queue/types.ts` - add `QueueBatch` type
- `components/queue/queue-batch-banner.tsx` - NEW component
- `app/(chef)/dashboard/page.tsx` - compute batches from queue, pass to widget section

---

### 2e. Completion Streaks and Velocity

**What changes:**

**New server action** in `lib/queue/actions.ts`:

```typescript
export async function getQueueVelocity(): Promise<QueueVelocity> {
  const user = await requireChef()

  // Count completions from activity log
  const { data: thisWeek } = await supabase
    .from('chef_activity_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId)
    .eq('activity_type', 'queue_item_completed')
    .gte('created_at', startOfWeek(new Date()).toISOString())

  const { data: lastWeek } = await supabase
    .from('chef_activity_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId)
    .eq('activity_type', 'queue_item_completed')
    .gte('created_at', startOfWeek(subWeeks(new Date(), 1)).toISOString())
    .lt('created_at', startOfWeek(new Date()).toISOString())

  // Today's completions
  const { count: todayCount } = await supabase
    .from('chef_activity_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId)
    .eq('activity_type', 'queue_item_completed')
    .gte('created_at', startOfDay(new Date()).toISOString())

  return {
    todayCompleted: todayCount ?? 0,
    thisWeekCompleted: thisWeek ?? 0,
    lastWeekCompleted: lastWeek ?? 0,
    weeklyAverage: Math.round(((thisWeek ?? 0) + (lastWeek ?? 0)) / 2),
  }
}
```

**Prerequisite:** Log completions. When any queue-actionable task is completed, insert into `chef_activity_log`:

```typescript
// In each relevant server action (sendMessage, recordPayment, etc.)
await supabase.from('chef_activity_log').insert({
  tenant_id: user.tenantId,
  chef_id: user.entityId,
  activity_type: 'queue_item_completed',
  metadata: { domain: 'inquiry', action: 'respond' },
})
```

**Render in QueueSummaryBar:**

```
4 completed today | 12/18 this week (avg: 15/week)
```

**Files touched:**

- `lib/queue/actions.ts` - add `getQueueVelocity()`
- `lib/queue/types.ts` - add `QueueVelocity` type
- Relevant server actions - add activity log inserts on completion
- `components/queue/queue-summary.tsx` - render velocity stats

---

### 2f. Stale Item Auto-Escalation with Snooze

**What changes:**

**New table** (migration):

```sql
CREATE TABLE queue_item_snoozes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  chef_id uuid NOT NULL REFERENCES chefs(id),
  item_key text NOT NULL,           -- stable identifier for the queue item
  snoozed_until timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_queue_snoozes_chef ON queue_item_snoozes(chef_id, item_key);
```

**New server actions** in `lib/queue/actions.ts`:

```typescript
export async function snoozeQueueItem(itemKey: string, duration: '1d' | '3d' | '1w') {
  const user = await requireChef()
  const snoozedUntil =
    duration === '1d'
      ? addDays(new Date(), 1)
      : duration === '3d'
        ? addDays(new Date(), 3)
        : addWeeks(new Date(), 1)

  await supabase.from('queue_item_snoozes').upsert(
    {
      tenant_id: user.tenantId,
      chef_id: user.entityId,
      item_key: itemKey,
      snoozed_until: snoozedUntil.toISOString(),
    },
    { onConflict: 'chef_id,item_key' }
  )

  revalidatePath('/dashboard')
}

export async function dismissQueueItem(itemKey: string) {
  // Same as snooze but with a very far future date
  await snoozeQueueItem(itemKey, '1w') // or permanent dismiss
}
```

**Modify** `lib/queue/build.ts`:

```typescript
// Filter out snoozed items
const snoozed = await getActiveSnoozesForChef(user.entityId)
const snoozedKeys = new Set(snoozed.map((s) => s.item_key))
const filteredItems = items.filter((i) => !snoozedKeys.has(i.key))

// Flag stale items (72h+ without action)
for (const item of filteredItems) {
  const hoursOld = differenceInHours(new Date(), parseISO(item.createdAt))
  if (hoursOld > 72) {
    item.isStale = true
    item.staleMessage = `This has been here ${Math.round(hoursOld / 24)} days. Still relevant?`
  }
}
```

**Render in QueueItemRow for stale items:**

```
[Snooze 1d] [Snooze 3d] [Snooze 1w] [Dismiss] [Do it now]
"This has been here 5 days. Still relevant?"
```

**Files touched:**

- `supabase/migrations/XXXXXXXXX_queue_snoozes.sql` - NEW migration
- `lib/queue/actions.ts` - add `snoozeQueueItem()`, `dismissQueueItem()`, `getActiveSnoozesForChef()`
- `lib/queue/build.ts` - filter snoozed items, flag stale items
- `lib/queue/types.ts` - add `isStale`, `staleMessage` to QueueItem
- `components/queue/queue-item-row.tsx` - render stale banner with snooze/dismiss buttons

---

## WIDGET 3: BUSINESS SNAPSHOT

**Current file:** `app/(chef)/dashboard/_sections/business-section.tsx`
**Current data:** `loadBusinessSectionData()` fetches 80+ metrics

### 3a. Forward-Looking Projections

**What changes:**

**New server action** in `lib/dashboard/actions.ts`:

```typescript
export async function getRevenueProjection(): Promise<RevenueProjection> {
  const user = await requireChef()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const dayOfMonth = now.getDate()
  const daysInMonth = endOfMonth.getDate()

  // Confirmed revenue (booked events this month)
  const { data: bookedEvents } = await supabase
    .from('events')
    .select('quoted_price_cents, status')
    .eq('tenant_id', user.tenantId)
    .gte('event_date', startOfMonth.toISOString())
    .lte('event_date', endOfMonth.toISOString())
    .not('status', 'eq', 'cancelled')

  const confirmedCents =
    bookedEvents
      ?.filter((e) => ['paid', 'confirmed', 'in_progress', 'completed'].includes(e.status))
      .reduce((sum, e) => sum + (e.quoted_price_cents ?? 0), 0) ?? 0

  const pendingCents =
    bookedEvents
      ?.filter((e) => ['draft', 'proposed', 'accepted'].includes(e.status))
      .reduce((sum, e) => sum + (e.quoted_price_cents ?? 0), 0) ?? 0

  // Historical conversion rate for pipeline
  const { data: historicalEvents } = await supabase
    .from('events')
    .select('status')
    .eq('tenant_id', user.tenantId)
    .gte('created_at', subMonths(now, 6).toISOString())

  const totalHistorical = historicalEvents?.length ?? 1
  const convertedHistorical =
    historicalEvents?.filter((e) =>
      ['paid', 'confirmed', 'in_progress', 'completed'].includes(e.status)
    ).length ?? 0
  const conversionRate = convertedHistorical / totalHistorical

  // Linear projection
  const dailyRate = confirmedCents / Math.max(dayOfMonth, 1)
  const linearProjection = Math.round(dailyRate * daysInMonth)

  // Pipeline projection
  const pipelineExpected = Math.round(pendingCents * conversionRate)

  // Monthly goal
  const { data: prefs } = await supabase
    .from('chef_preferences')
    .select('target_monthly_revenue_cents')
    .eq('chef_id', user.entityId)
    .single()

  const goalCents = prefs?.target_monthly_revenue_cents ?? 0
  const gapCents = Math.max(0, goalCents - confirmedCents - pipelineExpected)

  // Avg event value for "events needed"
  const avgEventCents =
    confirmedCents /
    Math.max(
      bookedEvents?.filter((e) =>
        ['paid', 'confirmed', 'in_progress', 'completed'].includes(e.status)
      ).length ?? 1,
      1
    )
  const eventsNeeded = avgEventCents > 0 ? Math.ceil(gapCents / avgEventCents) : 0

  return {
    confirmedCents,
    pendingCents,
    pipelineExpectedCents: pipelineExpected,
    conversionRate: Math.round(conversionRate * 100),
    linearProjectionCents: linearProjection,
    goalCents,
    gapCents,
    eventsNeeded,
    daysRemaining: daysInMonth - dayOfMonth,
  }
}
```

**Render:**

```
This month: $4,200 confirmed + $2,400 pipeline (40% converts = ~$960 expected)
Projected: $5,160 / $8,000 goal
Gap: $2,840 (need ~2 more events)
15 days remaining
```

**Files touched:**

- `lib/dashboard/actions.ts` - add `getRevenueProjection()`
- `lib/dashboard/types.ts` - add `RevenueProjection` type
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch projection, render in snapshot

---

### 3b. Comparative Periods

**What changes:**

**New server action** in `lib/dashboard/actions.ts`:

```typescript
export async function getComparativePeriods(): Promise<ComparativePeriods> {
  const user = await requireChef()
  const now = new Date()

  const [thisMonth, lastMonth, sameMonthLastYear] = await Promise.all([
    getMonthRevenue(user.tenantId, now),
    getMonthRevenue(user.tenantId, subMonths(now, 1)),
    getMonthRevenue(user.tenantId, subYears(now, 1)),
  ])

  return {
    thisMonth,
    vsLastMonth: {
      revenueDelta: thisMonth.revenueCents - lastMonth.revenueCents,
      revenuePercent: percentChange(lastMonth.revenueCents, thisMonth.revenueCents),
      eventsDelta: thisMonth.eventCount - lastMonth.eventCount,
    },
    vsSameMonthLastYear:
      sameMonthLastYear.eventCount > 0
        ? {
            revenueDelta: thisMonth.revenueCents - sameMonthLastYear.revenueCents,
            revenuePercent: percentChange(sameMonthLastYear.revenueCents, thisMonth.revenueCents),
            eventsDelta: thisMonth.eventCount - sameMonthLastYear.eventCount,
            avgEventValueDelta: thisMonth.avgEventCents - sameMonthLastYear.avgEventCents,
          }
        : null,
  }
}

async function getMonthRevenue(tenantId: string, date: Date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)

  const { data } = await supabase
    .from('event_financial_summary') // existing view
    .select('total_revenue_cents')
    .eq('tenant_id', tenantId)
    .gte('event_date', start.toISOString())
    .lte('event_date', end.toISOString())

  const revenueCents = data?.reduce((s, e) => s + (e.total_revenue_cents ?? 0), 0) ?? 0
  const eventCount = data?.length ?? 0

  return {
    revenueCents,
    eventCount,
    avgEventCents: eventCount > 0 ? Math.round(revenueCents / eventCount) : 0,
  }
}
```

**Render (toggle buttons: vs Last Month | vs Last Year):**

```
Revenue: $4,200 (+23% vs last March, +$780)
Events: 4 (+2 vs last March)
Avg event: $1,050 (+$150 vs last March)
```

**Files touched:**

- `lib/dashboard/actions.ts` - add `getComparativePeriods()`, `getMonthRevenue()`
- `lib/dashboard/types.ts` - add `ComparativePeriods` type
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch + render with toggle

---

### 3c. Margin Alerts

**What changes:**

**New server action** in `lib/dashboard/actions.ts`:

```typescript
export async function getMarginAlerts(): Promise<MarginAlert[]> {
  const user = await requireChef()

  const { data: prefs } = await supabase
    .from('chef_preferences')
    .select('target_margin_percent')
    .eq('chef_id', user.entityId)
    .single()

  const targetMargin = prefs?.target_margin_percent ?? 30

  // Get this month's events with margins
  const { data: events } = await supabase
    .from('event_financial_summary')
    .select(
      'event_id, occasion, total_revenue_cents, total_expense_cents, food_cost_cents, client_name'
    )
    .eq('tenant_id', user.tenantId)
    .gte('event_date', startOfMonth(new Date()).toISOString())

  const alerts: MarginAlert[] = []
  let totalFoodCost = 0
  let totalRevenue = 0

  for (const event of events ?? []) {
    totalFoodCost += event.food_cost_cents ?? 0
    totalRevenue += event.total_revenue_cents ?? 0

    const foodCostPercent =
      event.total_revenue_cents > 0
        ? ((event.food_cost_cents ?? 0) / event.total_revenue_cents) * 100
        : 0

    if (foodCostPercent > targetMargin + 10) {
      alerts.push({
        eventId: event.event_id,
        occasion: event.occasion,
        clientName: event.client_name,
        foodCostPercent: Math.round(foodCostPercent),
        targetPercent: targetMargin,
      })
    }
  }

  return alerts
}
```

**Render (amber card, only when alerts exist):**

```
Food cost is 38% this month (target: 30%)
  Johnson dinner: 52% food cost - review pricing?   [View event ->]
  Smith party: 41% food cost                        [View event ->]
```

**Files touched:**

- `lib/dashboard/actions.ts` - add `getMarginAlerts()`
- `lib/dashboard/types.ts` - add `MarginAlert` type
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch + render alerts in snapshot

---

### 3d. Cash Flow Timing

**What changes:**

**New server action** in `lib/dashboard/actions.ts`:

```typescript
export async function getCashFlowTiming(): Promise<CashFlowTiming> {
  const user = await requireChef()
  const now = new Date()
  const weekEnd = addDays(now, 7)

  // Outstanding invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('amount_cents, due_date, status')
    .eq('tenant_id', user.tenantId)
    .eq('status', 'sent')

  const totalOutstanding = invoices?.reduce((s, i) => s + i.amount_cents, 0) ?? 0
  const dueThisWeek =
    invoices
      ?.filter((i) => parseISO(i.due_date) <= weekEnd)
      .reduce((s, i) => s + i.amount_cents, 0) ?? 0

  // Upcoming event grocery estimates (avg grocery spend per guest from history)
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, guest_count, event_date')
    .eq('tenant_id', user.tenantId)
    .gte('event_date', now.toISOString())
    .lte('event_date', weekEnd.toISOString())
    .not('status', 'in', '("cancelled","completed")')

  // Historical avg grocery cost per guest
  const { data: historicalExpenses } = await supabase
    .from('expenses')
    .select('amount_cents')
    .eq('tenant_id', user.tenantId)
    .eq('category', 'groceries')
    .gte('date', subMonths(now, 3).toISOString())

  const { data: historicalGuests } = await supabase
    .from('events')
    .select('guest_count')
    .eq('tenant_id', user.tenantId)
    .eq('status', 'completed')
    .gte('event_date', subMonths(now, 3).toISOString())

  const totalGroceryCents = historicalExpenses?.reduce((s, e) => s + e.amount_cents, 0) ?? 0
  const totalGuests = historicalGuests?.reduce((s, e) => s + (e.guest_count ?? 0), 0) ?? 1
  const avgGroceryPerGuest = Math.round(totalGroceryCents / totalGuests)

  const estimatedExpenses =
    upcomingEvents?.reduce((s, e) => s + (e.guest_count ?? 4) * avgGroceryPerGuest, 0) ?? 0

  return {
    outstandingCents: totalOutstanding,
    dueThisWeekCents: dueThisWeek,
    estimatedExpensesCents: estimatedExpenses,
    netPositionCents: dueThisWeek - estimatedExpenses,
    avgGroceryPerGuestCents: avgGroceryPerGuest,
  }
}
```

**Render:**

```
Cash flow this week:
  Incoming: $2,800 due (of $4,200 outstanding)
  Outgoing: ~$1,400 groceries (2 events, est. $35/guest)
  Net position: +$1,400
```

**Files touched:**

- `lib/dashboard/actions.ts` - add `getCashFlowTiming()`
- `lib/dashboard/types.ts` - add `CashFlowTiming` type
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch + render

---

### 3e. Client Concentration Risk

**What changes:**

**New server action** in `lib/dashboard/actions.ts`:

```typescript
export async function getClientConcentration(): Promise<ClientConcentration> {
  const user = await requireChef()

  const { data } = await supabase
    .from('event_financial_summary')
    .select('client_id, client_name, total_revenue_cents')
    .eq('tenant_id', user.tenantId)
    .gte('event_date', subMonths(new Date(), 12).toISOString())

  // Group by client
  const byClient: Record<string, { name: string; totalCents: number }> = {}
  let grandTotal = 0
  for (const row of data ?? []) {
    if (!byClient[row.client_id]) byClient[row.client_id] = { name: row.client_name, totalCents: 0 }
    byClient[row.client_id].totalCents += row.total_revenue_cents ?? 0
    grandTotal += row.total_revenue_cents ?? 0
  }

  const sorted = Object.entries(byClient)
    .map(([id, { name, totalCents }]) => ({
      clientId: id,
      clientName: name,
      revenueCents: totalCents,
      percent: grandTotal > 0 ? Math.round((totalCents / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents)

  const topClient = sorted[0] ?? null
  const top2Percent = sorted.slice(0, 2).reduce((s, c) => s + c.percent, 0)

  return {
    clients: sorted.slice(0, 5), // top 5
    isConcentrated: top2Percent > 50,
    topClientPercent: topClient?.percent ?? 0,
    topClientName: topClient?.clientName ?? '',
    grandTotalCents: grandTotal,
  }
}
```

**Render (amber card, only when `isConcentrated`):**

```
Client concentration risk: 60% of revenue from 2 clients
  Johnson family: $18,000 (42%)    [View ->]
  Smith household: $7,800 (18%)    [View ->]
  If Johnson stops booking, monthly revenue drops ~35%
```

**Files touched:**

- `lib/dashboard/actions.ts` - add `getClientConcentration()`
- `lib/dashboard/types.ts` - add `ClientConcentration` type
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch + render

---

### 3f. Seasonality Intelligence

**What changes:**

**New server action** in `lib/dashboard/actions.ts`:

```typescript
export async function getSeasonalityIntelligence(): Promise<SeasonalityInsight> {
  const user = await requireChef()

  // Get event counts by month for all time
  const { data } = await supabase
    .from('events')
    .select('event_date')
    .eq('tenant_id', user.tenantId)
    .eq('status', 'completed')

  const monthCounts: Record<number, number[]> = {} // month -> [count per year]
  for (const event of data ?? []) {
    const date = parseISO(event.event_date)
    const month = date.getMonth()
    const year = date.getFullYear()
    const key = `${month}-${year}`
    if (!monthCounts[month]) monthCounts[month] = []
    // Track per year
  }

  // Simplified: avg events per month
  const monthlyAvg: number[] = Array(12).fill(0)
  for (const event of data ?? []) {
    monthlyAvg[parseISO(event.event_date).getMonth()]++
  }

  const nextMonth = (new Date().getMonth() + 1) % 12
  const nextMonthName = format(new Date(2026, nextMonth, 1), 'MMMM')
  const currentMonthBookings = /* count booked for current month */ 0

  const busiestMonth = monthlyAvg.indexOf(Math.max(...monthlyAvg))
  const slowestMonth = monthlyAvg.indexOf(Math.min(...monthlyAvg))

  return {
    monthlyAvg,
    busiestMonth: format(new Date(2026, busiestMonth, 1), 'MMMM'),
    slowestMonth: format(new Date(2026, slowestMonth, 1), 'MMMM'),
    nextMonthForecast: monthlyAvg[nextMonth],
    nextMonthName,
    insight:
      monthlyAvg[nextMonth] < monthlyAvg[new Date().getMonth()]
        ? `Bookings typically drop ${Math.round(((monthlyAvg[new Date().getMonth()] - monthlyAvg[nextMonth]) / monthlyAvg[new Date().getMonth()]) * 100)}% in ${nextMonthName}. Consider outreach now.`
        : `${nextMonthName} is typically busier. You have ${currentMonthBookings} booked so far.`,
  }
}
```

**Files touched:**

- `lib/dashboard/actions.ts` - add `getSeasonalityIntelligence()`
- `lib/dashboard/types.ts` - add `SeasonalityInsight` type
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch + render

---

### 3g. Effective Hourly Rate per Event Type

**What changes:**

**New server action** in `lib/dashboard/actions.ts`:

```typescript
export async function getHourlyRateByEventType(): Promise<EventTypeRate[]> {
  const user = await requireChef()

  const { data } = await supabase
    .from('events')
    .select(
      `
      occasion, guest_count, quoted_price_cents,
      shopping_hours, prep_hours, packing_hours, travel_hours, service_hours, reset_hours
    `
    )
    .eq('tenant_id', user.tenantId)
    .eq('status', 'completed')
    .gte('event_date', subMonths(new Date(), 12).toISOString())

  // Group by guest count bracket
  const brackets: Record<string, { totalRevenue: number; totalHours: number; count: number }> = {
    'Intimate (2-4)': { totalRevenue: 0, totalHours: 0, count: 0 },
    'Small (5-8)': { totalRevenue: 0, totalHours: 0, count: 0 },
    'Medium (9-15)': { totalRevenue: 0, totalHours: 0, count: 0 },
    'Large (16+)': { totalRevenue: 0, totalHours: 0, count: 0 },
  }

  for (const event of data ?? []) {
    const guests = event.guest_count ?? 4
    const bracket =
      guests <= 4
        ? 'Intimate (2-4)'
        : guests <= 8
          ? 'Small (5-8)'
          : guests <= 15
            ? 'Medium (9-15)'
            : 'Large (16+)'

    const totalHours =
      (event.shopping_hours ?? 0) +
      (event.prep_hours ?? 0) +
      (event.packing_hours ?? 0) +
      (event.travel_hours ?? 0) +
      (event.service_hours ?? 0) +
      (event.reset_hours ?? 0)

    brackets[bracket].totalRevenue += event.quoted_price_cents ?? 0
    brackets[bracket].totalHours += totalHours
    brackets[bracket].count++
  }

  return Object.entries(brackets)
    .filter(([, v]) => v.count > 0)
    .map(([label, v]) => ({
      label,
      eventCount: v.count,
      avgHourlyRateCents: v.totalHours > 0 ? Math.round(v.totalRevenue / v.totalHours) : 0,
      avgTotalHours: Math.round((v.totalHours / v.count) * 10) / 10,
    }))
}
```

**Render:**

```
Effective hourly rate by event size:
  Intimate (2-4): $185/hr (avg 4.2h)   <-- most profitable
  Small (5-8):    $142/hr (avg 6.1h)
  Medium (9-15):  $118/hr (avg 8.5h)
  Large (16+):    $95/hr  (avg 12.3h)
```

**Files touched:**

- `lib/dashboard/actions.ts` - add `getHourlyRateByEventType()`
- `lib/dashboard/types.ts` - add `EventTypeRate` type
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch + render

---

## WIDGET 4: WEEK STRIP

**Current file:** `components/dashboard/week-strip.tsx`
**Current data:** `getWeekSchedule(0)` from `lib/scheduling/actions.ts`

### 4a. Drag-to-Block Prep Time

**Defer to Month 2.** Requires drag-and-drop library integration (dnd-kit or similar) and new `prep_blocks` table writes from the dashboard. Complex UX. Build capacity scoring and grocery windows first.

### 4b. Capacity Scoring Per Day

**What changes:**

**New pure function** in `lib/scheduling/capacity.ts`:

```typescript
export function computeDayCapacity(day: WeekDay): DayCapacity {
  let score = 0
  let label: 'free' | 'light' | 'moderate' | 'heavy' | 'overloaded' = 'free'

  for (const event of day.events) {
    score += 30 // base per event
    score += (event.guestCount ?? 4) * 2 // guests add load
    score += (event.travelMinutes ?? 0) > 60 ? 15 : 0 // long travel
    // Could add: menu complexity, staff count needed, etc.
  }

  if (day.isPrep) score += 20
  if (day.events.length > 1) score += 30 // multi-event day penalty

  label =
    score === 0
      ? 'free'
      : score < 30
        ? 'light'
        : score < 60
          ? 'moderate'
          : score < 90
            ? 'heavy'
            : 'overloaded'

  return { score, label, eventCount: day.events.length }
}
```

**Visual in WeekStrip:**

```
Mon    Tue     Wed      Thu       Fri       Sat      Sun
FREE   LIGHT   PREP     MODERATE  HEAVY     HEAVY    FREE
       (dot)   (amber)  (dot)     (2 evts)  (pulse)
```

Overloaded days get a red pulsing ring. Free days show as available.

**Files touched:**

- `lib/scheduling/capacity.ts` - NEW file with `computeDayCapacity()`
- `components/dashboard/week-strip.tsx` - import + render capacity labels + color coding

---

### 4c. Grocery Shopping Windows

**What changes:**

**New pure function** in `lib/scheduling/capacity.ts`:

```typescript
export function findGroceryWindows(
  weekDays: WeekDay[],
  eventsNeedingShopping: Array<{ eventDate: string; eventId: string }>
): GroceryWindow[] {
  const windows: GroceryWindow[] = []

  for (const event of eventsNeedingShopping) {
    const eventDayIndex = weekDays.findIndex((d) => d.date === event.eventDate)
    if (eventDayIndex < 0) continue

    // Look backwards for free/light days (shop 1-2 days before)
    for (let i = eventDayIndex - 1; i >= Math.max(0, eventDayIndex - 2); i--) {
      const day = weekDays[i]
      const capacity = computeDayCapacity(day)
      if (capacity.label === 'free' || capacity.label === 'light') {
        windows.push({
          shopDate: day.date,
          forEventId: event.eventId,
          forEventDate: event.eventDate,
          suggestedTime: '9:00 AM - 12:00 PM', // morning default
          reason: `${capacity.label} day, ${eventDayIndex - i}d before event`,
        })
        break // found a window for this event
      }
    }
  }

  // Consolidation: if two events can share a shopping trip
  const grouped = groupBy(windows, (w) => w.shopDate)
  for (const [date, wins] of Object.entries(grouped)) {
    if (wins.length > 1) {
      wins[0].consolidatedWith = wins.slice(1).map((w) => w.forEventId)
      wins[0].reason += ` (buy for ${wins.length} events in one trip)`
    }
  }

  return windows
}
```

**Render on WeekStrip (icon on suggested shopping days):**

```
Tue: [cart icon] "Shop for Wed + Fri events (9am-12pm)"
```

**Files touched:**

- `lib/scheduling/capacity.ts` - add `findGroceryWindows()`
- `components/dashboard/week-strip.tsx` - render shopping window indicators

---

### 4d. Revenue Per Day Overlay

**What changes:**

**Add to existing `getWeekSchedule()` return:**

```typescript
// In lib/scheduling/actions.ts - extend WeekDay type
interface WeekDay {
  // ...existing fields
  revenueCents: number // sum of quoted_price_cents for events on this day
}
```

Already have event data in the week schedule. Just need to sum `quoted_price_cents` per day.

**Toggle button in WeekStrip component:**

```typescript
const [showRevenue, setShowRevenue] = useState(false)
// Toggle: "Revenue" pill button in header
```

**Render when toggled on:**

```
Mon    Tue    Wed      Thu    Fri      Sat    Sun     TOTAL
-      -      $2,400   -      $3,800   -      -      $6,200
```

**Files touched:**

- `lib/scheduling/actions.ts` - ensure `revenueCents` is on `WeekDay`
- `components/dashboard/week-strip.tsx` - add revenue toggle + render

---

### 4e. Rest Day Enforcement

**What changes:**

**New pure function** in `lib/scheduling/capacity.ts`:

```typescript
export function checkRestDays(
  weekDays: WeekDay[],
  priorWeekDays?: WeekDay[]
): RestDayWarning | null {
  const workDays = weekDays.filter((d) => d.events.length > 0 || d.isPrep)
  const consecutiveWork = longestConsecutiveRun(weekDays, (d) => d.events.length > 0 || d.isPrep)

  if (consecutiveWork >= 6) {
    return {
      severity: 'critical',
      message: `${consecutiveWork} consecutive working days. Block a rest day.`,
      suggestedRestDay: weekDays.find((d) => d.events.length === 0 && !d.isPrep)?.date ?? null,
    }
  }

  if (consecutiveWork >= 5) {
    return {
      severity: 'warning',
      message: 'No rest day this week. Consider blocking one.',
      suggestedRestDay: weekDays.find((d) => d.events.length === 0 && !d.isPrep)?.date ?? null,
    }
  }

  return null
}
```

**Render as amber/red banner above WeekStrip:**

```
No rest day this week (5 consecutive working days). Block Tuesday? [Block it]
```

**Files touched:**

- `lib/scheduling/capacity.ts` - add `checkRestDays()`
- `components/dashboard/week-strip.tsx` - render rest day warning

---

### 4f. Multi-Week Peek

**What changes:**

**Modify** `app/(chef)/dashboard/_sections/schedule-section.tsx`:

```typescript
// Fetch 3 weeks instead of 1
const [week0, week1, week2] = await Promise.all([
  getWeekSchedule(0),
  getWeekSchedule(1),
  getWeekSchedule(2),
])
```

**Modify** `components/dashboard/week-strip.tsx`:

```typescript
// Accept additional weeks
interface WeekStripProps {
  schedule: WeekSchedule
  nextWeek?: WeekSchedule
  weekAfter?: WeekSchedule
}

// Render expandable rows
const [expanded, setExpanded] = useState(false)
// Next 2 weeks shown with 50% opacity, smaller text
```

**Files touched:**

- `app/(chef)/dashboard/_sections/schedule-section.tsx` - fetch 3 weeks
- `components/dashboard/week-strip.tsx` - accept + render additional weeks with expand toggle

---

## WIDGET 5: NEXT ACTION CARD

**Current file:** `components/queue/next-action.tsx`
**Current data:** `queue.nextAction` from `getPriorityQueue()`

### 5a. Time-Aware Action Selection

**What changes:**

**Modify** `lib/queue/build.ts`:

```typescript
export function selectNextAction(items: QueueItem[]): QueueItem | null {
  if (items.length === 0) return null

  const hour = new Date().getHours()

  // Time-based preference weights
  const timeWeights: Record<string, number> = {}

  if (hour >= 6 && hour < 12) {
    // Morning: prioritize prep and shopping
    timeWeights['prep'] = 1.3
    timeWeights['shopping'] = 1.3
    timeWeights['culinary'] = 1.2
  } else if (hour >= 12 && hour < 17) {
    // Afternoon: prioritize communication and admin
    timeWeights['inquiry'] = 1.3
    timeWeights['message'] = 1.3
    timeWeights['client'] = 1.2
    timeWeights['financial'] = 1.2
  } else if (hour >= 17) {
    // Evening: prioritize next-day prep and planning
    timeWeights['event'] = 1.3
    timeWeights['post_event'] = 1.2
  }

  // During an active event (check if any event is in_progress): suppress non-critical
  // This requires checking event status - pass as param or check here

  const reweighted = items.map((item) => ({
    ...item,
    adjustedScore: item.score * (timeWeights[item.domain] ?? 1.0),
  }))

  reweighted.sort((a, b) => b.adjustedScore - a.adjustedScore)
  return reweighted[0]
}
```

**Files touched:**

- `lib/queue/build.ts` - modify next action selection with time-of-day weighting

---

### 5b. Estimated Completion Time

**What changes:**

**Add to each provider** in `lib/queue/providers/*.ts`:

```typescript
// Each item gets an estimatedMinutes field based on action type
estimatedMinutes: actionType === 'respond_inquiry'
  ? 3
  : actionType === 'send_followup'
    ? 2
    : actionType === 'record_payment'
      ? 1
      : actionType === 'file_aar'
        ? 5
        : actionType === 'complete_grocery_list'
          ? 8
          : 3 // default
```

**Render in NextActionCard:**

```
Reply to inquiry from Sarah (~3 min)
```

**Files touched:**

- `lib/queue/types.ts` - add `estimatedMinutes` to `QueueItem`
- `lib/queue/providers/*.ts` - set `estimatedMinutes` per item type
- `components/queue/next-action.tsx` - render estimated time

---

### 5c. Skip with Reason Tracking

**What changes:**

**New table** (migration):

```sql
CREATE TABLE queue_item_skips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  chef_id uuid NOT NULL REFERENCES chefs(id),
  item_key text NOT NULL,
  reason text NOT NULL,          -- 'waiting_on_client', 'will_do_later', 'not_relevant'
  skip_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX idx_queue_skips_unique ON queue_item_skips(chef_id, item_key);
```

**New server actions** in `lib/queue/actions.ts`:

```typescript
export async function skipQueueItem(itemKey: string, reason: string) {
  const user = await requireChef()
  await supabase.from('queue_item_skips').upsert(
    {
      tenant_id: user.tenantId,
      chef_id: user.entityId,
      item_key: itemKey,
      reason,
      skip_count: 1, // Will be incremented via SQL
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'chef_id,item_key',
      // On conflict, increment skip_count
    }
  )
  revalidatePath('/dashboard')
}
```

**Modify** `lib/queue/build.ts`:

```typescript
// Load skip counts for all items
const skips = await getSkipCounts(user.entityId)
for (const item of items) {
  const skipInfo = skips.get(item.key)
  if (skipInfo) {
    item.skipCount = skipInfo.skip_count
    if (skipInfo.skip_count >= 3) {
      item.escalationMessage = `You've deferred this ${skipInfo.skip_count} times`
      item.score *= 1.5 // boost priority of repeatedly skipped items
    }
  }
}
```

**Render in NextActionCard:**

```
[Not now v]  dropdown: "Waiting on client" | "Will do later" | "Not relevant"
// If skipped 3x:
"You've deferred this 3 times" (amber badge)
```

**Files touched:**

- `supabase/migrations/XXXXXXXXX_queue_skips.sql` - NEW migration
- `lib/queue/actions.ts` - add `skipQueueItem()`, `getSkipCounts()`
- `lib/queue/build.ts` - load skip counts, boost repeatedly skipped items
- `lib/queue/types.ts` - add `skipCount`, `escalationMessage` to QueueItem
- `components/queue/next-action.tsx` - add skip button with dropdown + escalation badge

---

### 5d. Contextual "Why This Matters"

**What changes:**

**Add to each provider** in `lib/queue/providers/*.ts`:

```typescript
// Each item gets a contextLine explaining business impact
contextLine: `Johnson's event was 5 days ago. Follow-ups convert to rebooking 35% of the time. This client has booked 4x.`
// or
contextLine: `This inquiry is worth ~$4,500. Inquiries responded to within 2h convert at 68%.`
// or
contextLine: `$2,800 outstanding for 12 days. Your avg collection time is 5 days.`
```

The context line is built from existing data already available in each provider (event history, inquiry details, financial data).

**Render in NextActionCard (below description):**

```
Send follow-up to Johnson family (~2 min)
  "5 days since event. This client has booked 4x. Follow-ups protect ~$3,200/year in recurring revenue."
```

**Files touched:**

- `lib/queue/types.ts` - add `contextLine` to `QueueItem`
- `lib/queue/providers/*.ts` - generate context lines per item
- `components/queue/next-action.tsx` - render context line in muted text

---

### 5e. Completion Celebration + Chain

**What changes:**

**Modify** `components/queue/next-action.tsx` to be a client component:

```typescript
'use client'

const [justCompleted, setJustCompleted] = useState(false)
const [completionCount, setCompletionCount] = useState(0)

// After inline action completes:
function onActionComplete() {
  setCompletionCount(c => c + 1)
  setJustCompleted(true)
  // Brief flash, then show next action
  setTimeout(() => {
    setJustCompleted(false)
    router.refresh() // Fetch next action from server
  }, 1500)
}

// Render during celebration:
if (justCompleted) {
  return <div className="text-center text-emerald-600 py-4">
    Done! {completionCount} completed today.
  </div>
}
```

**Files touched:**

- `components/queue/next-action.tsx` - convert to client component, add completion flow

---

## WIDGET 6: DOP TASK DIGEST

**Current file:** `components/dashboard/dop-task-panel.tsx`
**Current data:** `getDOPTaskDigest()` from `lib/scheduling/dop.ts`

### 6a. Time-Sequenced Display

**What changes:**

**Modify** `components/dashboard/dop-task-panel.tsx`:

```typescript
// Instead of grouping by event, sort ALL tasks by deadline time
const allTasks = digest.events.flatMap((e) =>
  e.tasks.map((t) => ({ ...t, eventOccasion: e.occasion, eventId: e.eventId }))
)

// Sort by deadline (earliest first)
allTasks.sort((a, b) => {
  if (!a.deadline && !b.deadline) return 0
  if (!a.deadline) return 1
  if (!b.deadline) return -1
  return compareAsc(parseISO(a.deadline), parseISO(b.deadline))
})

// Label: NOW / NEXT / LATER
function getTimeLabel(task: DOPTask): string {
  if (!task.deadline) return 'LATER'
  const minutesUntil = differenceInMinutes(parseISO(task.deadline), new Date())
  if (minutesUntil <= 0) return 'OVERDUE'
  if (minutesUntil <= 30) return 'NOW'
  if (minutesUntil <= 120) return 'NEXT'
  return 'LATER'
}
```

**Render:**

```
OVERDUE: Buy groceries (was due 2pm)           [checkbox]
NOW:     Start marinating chicken (2:30 PM)     [checkbox]
NEXT:    Pack cooler bags (3:30 PM)             [checkbox]
LATER:   Load car (4:45 PM)                     [checkbox]
         Set table (6:00 PM)                    [checkbox]
```

Gray out completed tasks. Red for overdue. Amber for NOW.

**Files touched:**

- `components/dashboard/dop-task-panel.tsx` - resort by time, add time labels

---

### 6b. Duration Estimates and Running Clock

**What changes:**

**Add to DOP task generation** (wherever tasks are created):

```typescript
// In lib/scheduling/dop.ts or equivalent
estimatedMinutes: taskCategory === 'shopping'
  ? 60
  : taskCategory === 'prep'
    ? 30
    : taskCategory === 'packing'
      ? 20
      : taskCategory === 'admin'
        ? 10
        : taskCategory === 'reset'
          ? 15
          : 15 // default
```

**Client-side running total** in `dop-task-panel.tsx`:

```typescript
const remainingMinutes = tasks
  .filter(t => !t.completed)
  .reduce((sum, t) => sum + (t.estimatedMinutes ?? 15), 0)

const availableMinutes = /* minutes until first event service time */
const isOverCapacity = remainingMinutes > availableMinutes
```

**Render:**

```
3h 20m of tasks remaining | Service at 7:00 PM (4h 30m available)
// or if over capacity:
3h 20m of tasks remaining | Only 2h 45m until service - consider delegating (RED)
```

**Files touched:**

- DOP task generation code - add `estimatedMinutes` per task
- `lib/scheduling/types.ts` - add `estimatedMinutes` to DOP task type
- `components/dashboard/dop-task-panel.tsx` - render running total + capacity warning

---

### 6c. Dependency Chains (Month 2)

**What changes:**

**Add to DOP task type:**

```typescript
interface DOPTask {
  // ...existing
  dependsOn?: string[] // task IDs that must complete before this one
  blockedBy?: string[] // currently incomplete dependencies
}
```

**Visual:**

```
[x] Buy ice
  └── [ ] Pack cooler (unblocked!)     <-- was grayed, now highlighted
[ ] Buy groceries
  └── [locked] Start marinating         <-- can't check until groceries done
```

**Files touched:**

- `lib/scheduling/types.ts` - add `dependsOn` to DOP task type
- DOP task generation code - define dependency relationships
- `components/dashboard/dop-task-panel.tsx` - render dependency indicators, gray out blocked tasks

---

### 6d. Staff Delegation (Month 2)

**What changes:**

**New server action:**

```typescript
export async function delegateDOPTask(taskId: string, staffId: string) {
  // Assign task to staff member
  // Send notification (email/SMS) to staff with task details
}
```

**Render per task (only if event has staff assigned):**

```
[ ] Pack cooler bags (3:30 PM, ~20 min)    [Assign to: Mike v]
```

**Files touched:**

- New server action for delegation
- `components/dashboard/dop-task-panel.tsx` - add "Assign to" dropdown per task

---

### 6e. Smart Defaults from History

**What changes:**

**New server action** in `lib/scheduling/dop.ts`:

```typescript
export async function getSuggestedDOPTasks(
  guestCount: number,
  occasion: string
): Promise<SuggestedDOPTask[]> {
  const user = await requireChef()

  // Find similar past events (same guest bracket, similar occasion)
  const { data: pastEvents } = await supabase
    .from('events')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('status', 'completed')
    .gte('guest_count', guestCount - 2)
    .lte('guest_count', guestCount + 2)
    .limit(5)

  // Get DOP tasks from those events, count frequency
  const { data: pastTasks } = await supabase
    .from('dop_tasks')
    .select('label, category, estimated_minutes')
    .in('event_id', pastEvents?.map((e) => e.id) ?? [])

  // Deduplicate and rank by frequency
  const freq: Record<string, { count: number; category: string; minutes: number }> = {}
  for (const task of pastTasks ?? []) {
    const key = task.label.toLowerCase()
    if (!freq[key])
      freq[key] = { count: 0, category: task.category, minutes: task.estimated_minutes }
    freq[key].count++
  }

  return Object.entries(freq)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([label, info]) => ({
      label,
      category: info.category,
      estimatedMinutes: info.minutes,
      frequency: info.count, // "used in 4 of 5 similar events"
    }))
}
```

**Integration:** When creating a new event's DOP, offer "Apply template from similar events?"

**Files touched:**

- `lib/scheduling/dop.ts` - add `getSuggestedDOPTasks()`
- Event DOP creation flow - offer template application

---

## WIDGET 7: RESPONSE TIME SLA

**Current file:** `components/dashboard/response-time-widget.tsx`
**Current data:** `getResponseTimeSummary()` from alerts section

### 7a. Per-Inquiry Countdown Timers

**What changes:**

**Modify** `getResponseTimeSummary()` to return individual inquiries, not just counts:

```typescript
export async function getResponseTimeSummary(): Promise<ResponseTimeSummary> {
  // ...existing query...

  return {
    // ...existing summary fields...
    inquiries: rawInquiries.map((inq) => ({
      id: inq.id,
      clientName: inq.client_name,
      occasion: inq.occasion,
      guestCount: inq.guest_count,
      receivedAt: inq.created_at,
      hoursWaiting: differenceInHours(new Date(), parseISO(inq.created_at)),
      estimatedValueCents: inq.budget_cents ?? estimateFromGuestCount(inq.guest_count),
      slaDeadline: addHours(parseISO(inq.created_at), 24).toISOString(), // 24h SLA
    })),
  }
}
```

**Client component for live timers:**

```typescript
// components/dashboard/response-time-widget.tsx
'use client'

// Per inquiry row with live countdown
function InquiryTimer({ inquiry }: { inquiry: InquiryWithTimer }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const minutesLeft = differenceInMinutes(parseISO(inquiry.slaDeadline), now)
  const urgencyClass = minutesLeft < 0 ? 'text-red-600' : minutesLeft < 120 ? 'text-amber-600' : 'text-emerald-600'

  return (
    <div>
      <span>{inquiry.clientName} - {inquiry.occasion}</span>
      <span className={urgencyClass}>
        {minutesLeft < 0 ? `${Math.abs(minutesLeft)}m overdue` : `${minutesLeft}m remaining`}
      </span>
    </div>
  )
}
```

**Files touched:**

- Data source for `getResponseTimeSummary()` - return individual inquiries
- `components/dashboard/response-time-widget.tsx` - convert to client component, add per-inquiry timers

---

### 7b. Revenue-at-Risk Display

**Already in 7a changes.** Each inquiry now has `estimatedValueCents`.

**Render:**

```
3 unanswered inquiries (~$9,400 at risk)
  Sarah Chen - Anniversary (8 guests, ~$4,500)     2h 12m left
  Mike Ross - Birthday (12 guests, ~$3,200)         45m left (!)
  Lisa Park - Corporate (20 guests, ~$1,700)        OVERDUE 3h
```

**Files touched:** Same as 7a.

---

### 7c. Response Rate Tracking

**What changes:**

**New server action** in `lib/inquiries/actions.ts`:

```typescript
export async function getResponseRateStats(): Promise<ResponseRateStats> {
  const user = await requireChef()

  // All inquiries from last 90 days
  const { data } = await supabase
    .from('inquiries')
    .select('created_at, first_response_at')
    .eq('tenant_id', user.tenantId)
    .gte('created_at', subDays(new Date(), 90).toISOString())

  const responded = data?.filter((i) => i.first_response_at) ?? []
  const responseTimes = responded.map((i) =>
    differenceInMinutes(parseISO(i.first_response_at!), parseISO(i.created_at))
  )

  const avgMinutes =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0

  const within2h = responseTimes.filter((t) => t <= 120).length
  const within24h = responseTimes.filter((t) => t <= 1440).length

  // Last month for trend
  const lastMonth = data?.filter((i) => parseISO(i.created_at) < subDays(new Date(), 30)) ?? []
  const lastMonthTimes = lastMonth
    .filter((i) => i.first_response_at)
    .map((i) => differenceInMinutes(parseISO(i.first_response_at!), parseISO(i.created_at)))
  const lastMonthAvg =
    lastMonthTimes.length > 0
      ? Math.round(lastMonthTimes.reduce((a, b) => a + b, 0) / lastMonthTimes.length)
      : 0

  return {
    avgResponseMinutes: avgMinutes,
    within2hPercent: responded.length > 0 ? Math.round((within2h / responded.length) * 100) : 0,
    within24hPercent: responded.length > 0 ? Math.round((within24h / responded.length) * 100) : 0,
    trend:
      avgMinutes < lastMonthAvg ? 'improving' : avgMinutes > lastMonthAvg ? 'declining' : 'steady',
    lastMonthAvgMinutes: lastMonthAvg,
  }
}
```

**Prerequisite column:** `first_response_at` on inquiries table. If not exists:

```sql
ALTER TABLE inquiries ADD COLUMN first_response_at timestamptz;
```

Set this timestamp when the chef first sends a reply to an inquiry.

**Render:**

```
Avg response: 2.4h (improving, was 4.1h last month)
94% responded within 24h | 62% within 2h
```

**Files touched:**

- `lib/inquiries/actions.ts` - add `getResponseRateStats()`
- `supabase/migrations/XXXXXXXXX_inquiry_first_response.sql` - NEW migration (if column doesn't exist)
- Inquiry response server action - set `first_response_at` on first reply
- `components/dashboard/response-time-widget.tsx` - render stats

---

### 7d. Quick-Reply Templates

**What changes:**

**New pure function** in `lib/inquiries/templates.ts`:

```typescript
export function getInquiryQuickReplies(inquiry: {
  occasion: string
  guestCount: number
  clientName: string
  eventDate?: string
}): QuickReply[] {
  return [
    {
      label: 'Interested - schedule call',
      message: `Hi ${inquiry.clientName}! Thanks for reaching out about your ${inquiry.occasion}. I'd love to learn more about what you're envisioning for ${inquiry.guestCount} guests. Would you have time for a quick call this week to discuss the details?`,
    },
    {
      label: 'Need more details',
      message: `Hi ${inquiry.clientName}! Thanks for your interest in a ${inquiry.occasion} experience. To put together the best proposal, could you share a bit more about your preferences? Specifically: any dietary restrictions, cuisine preferences, and whether you have a venue in mind?`,
    },
    {
      label: 'Unavailable - suggest alternatives',
      message: `Hi ${inquiry.clientName}! Thank you for thinking of me for your ${inquiry.occasion}. Unfortunately, I'm not available on ${inquiry.eventDate ? format(parseISO(inquiry.eventDate), 'MMMM d') : 'that date'}. Would ${/* suggest nearby dates */ ''} work instead? I'd hate to miss the opportunity to cook for you.`,
    },
  ]
}
```

**Render inline in response-time-widget (expand per inquiry):**

```
Sarah Chen - Anniversary (8 guests)     2h 12m left
  [Interested - call] [Need details] [Unavailable]    [Custom reply]
```

Clicking a template opens an editable textarea pre-filled with the message. "Send" calls existing `respondToInquiry()`.

**Files touched:**

- `lib/inquiries/templates.ts` - NEW file
- `components/dashboard/response-time-widget.tsx` - render quick-reply buttons per inquiry

---

### 7e. Auto-Decline Suggestions

**What changes:**

**Add to `getResponseTimeSummary()`:**

```typescript
// For each inquiry, check if chef is booked on that date
for (const inquiry of inquiries) {
  if (inquiry.event_date) {
    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId)
      .eq('event_date', inquiry.event_date)
      .not('status', 'in', '("cancelled","draft")')

    inquiry.chefIsBooked = (count ?? 0) > 0
  }
}
```

**Render:**

```
Mike Ross - Birthday, Jun 14     BOOKED (you have an event)
  [Send "unavailable + suggest alternate" ->]
```

**Files touched:**

- Data source for response time summary - add booking conflict check
- `components/dashboard/response-time-widget.tsx` - render booking conflict badge + auto-decline button

---

### 7f. Win/Loss Correlation

**What changes:**

**New server action** in `lib/inquiries/actions.ts`:

```typescript
export async function getResponseTimeConversion(): Promise<ResponseConversion> {
  const user = await requireChef()

  const { data } = await supabase
    .from('inquiries')
    .select('first_response_at, created_at, status')
    .eq('tenant_id', user.tenantId)
    .not('first_response_at', 'is', null)

  const within2h =
    data?.filter(
      (i) => differenceInHours(parseISO(i.first_response_at!), parseISO(i.created_at)) <= 2
    ) ?? []
  const after24h =
    data?.filter(
      (i) => differenceInHours(parseISO(i.first_response_at!), parseISO(i.created_at)) > 24
    ) ?? []

  const convertedStatuses = ['accepted', 'paid', 'confirmed', 'in_progress', 'completed']
  const within2hConverted = within2h.filter((i) => convertedStatuses.includes(i.status)).length
  const after24hConverted = after24h.filter((i) => convertedStatuses.includes(i.status)).length

  return {
    within2hConversion:
      within2h.length > 0 ? Math.round((within2hConverted / within2h.length) * 100) : 0,
    after24hConversion:
      after24h.length > 0 ? Math.round((after24hConverted / after24h.length) * 100) : 0,
  }
}
```

**Render (monthly stat, small text):**

```
Responded <2h: 68% conversion | Responded >24h: 12% conversion
```

**Files touched:**

- `lib/inquiries/actions.ts` - add `getResponseTimeConversion()`
- `components/dashboard/response-time-widget.tsx` - render correlation stats

---

## WIDGET 8: FOLLOW-UPS OVERDUE

**Current file:** `components/inquiries/pending-follow-ups-widget.tsx` (inquiry follow-ups)
**Also:** `lib/dashboard/accountability.ts` `getOverdueFollowUps()` (post-event follow-ups)

### 8a. Tiered Follow-Up Sequences

**What changes:**

**New server action** in `lib/dashboard/accountability.ts`:

```typescript
export async function getFollowUpSequence(): Promise<FollowUpSequenceItem[]> {
  const user = await requireChef()

  // Get all completed events with their last follow-up date
  const { data: events } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, client_id,
      client:clients(name, email),
      last_follow_up_at
    `
    )
    .eq('tenant_id', user.tenantId)
    .eq('status', 'completed')
    .gte('event_date', subDays(new Date(), 90).toISOString())
    .order('event_date', { ascending: false })

  const items: FollowUpSequenceItem[] = []

  for (const event of events ?? []) {
    const daysSinceEvent = differenceInDays(new Date(), parseISO(event.event_date))
    const daysSinceLastFollowUp = event.last_follow_up_at
      ? differenceInDays(new Date(), parseISO(event.last_follow_up_at))
      : daysSinceEvent

    // Determine which sequence stage is due
    let stage: FollowUpStage | null = null
    if (daysSinceEvent <= 2 && !event.last_follow_up_at) {
      stage = { name: 'thank_you', label: 'Thank you + photos', dueDays: 1 }
    } else if (daysSinceEvent >= 5 && daysSinceEvent <= 10 && daysSinceLastFollowUp >= 4) {
      stage = { name: 'feedback', label: 'How was everything?', dueDays: 7 }
    } else if (daysSinceEvent >= 14 && daysSinceEvent <= 21 && daysSinceLastFollowUp >= 10) {
      stage = { name: 'rebook_nudge', label: 'Rebooking nudge', dueDays: 14 }
    } else if (daysSinceEvent >= 30 && daysSinceEvent <= 45 && daysSinceLastFollowUp >= 20) {
      stage = { name: 'check_in', label: 'Check-in + seasonal menu', dueDays: 30 }
    } else if (daysSinceEvent >= 90 && daysSinceLastFollowUp >= 60) {
      stage = { name: 're_engage', label: 'Re-engagement', dueDays: 90 }
    }

    if (stage) {
      items.push({
        eventId: event.id,
        clientId: event.client_id,
        clientName: event.client?.name ?? '',
        occasion: event.occasion,
        eventDate: event.event_date,
        daysSinceEvent,
        stage,
        isOverdue: daysSinceEvent > stage.dueDays + 2,
      })
    }
  }

  return items
}
```

**New column needed:**

```sql
ALTER TABLE events ADD COLUMN last_follow_up_at timestamptz;
```

Set when chef sends a follow-up message for that event.

**Render:**

```
Follow-up sequence:
  OVERDUE: Sarah Chen - Thank you + photos (2 days ago)     [Send ->]
  DUE:     Mike Ross - How was everything? (7 days ago)      [Send ->]
  UPCOMING: Lisa Park - Rebooking nudge (in 5 days)
```

**Files touched:**

- `lib/dashboard/accountability.ts` - add `getFollowUpSequence()`
- `supabase/migrations/XXXXXXXXX_event_last_followup.sql` - NEW migration
- `components/dashboard/follow-up-sequence-widget.tsx` - NEW component (replaces simple overdue list)
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch sequence, render new widget

---

### 8b. Pre-Drafted Messages with Personalization

**What changes:**

**New pure function** in `lib/dashboard/follow-up-templates.ts`:

```typescript
export function draftFollowUp(
  stage: FollowUpStage,
  context: {
    clientName: string
    occasion: string
    eventDate: string
    menuHighlights?: string[] // from event menu
    guestCount?: number
    aarNotes?: string // from AAR "what went well"
  }
): string {
  const firstName = context.clientName.split(' ')[0]

  switch (stage.name) {
    case 'thank_you':
      return `Hi ${firstName}! It was such a pleasure cooking for your ${context.occasion}${context.guestCount ? ` with ${context.guestCount} guests` : ''}. ${context.menuHighlights?.length ? `I hope everyone enjoyed the ${context.menuHighlights[0]}!` : 'I hope everyone enjoyed the meal!'} I'll send over some photos from the evening shortly.`

    case 'feedback':
      return `Hi ${firstName}! Just checking in - how did everyone feel about the ${context.occasion} dinner? Any dishes that were a particular hit? Your feedback helps me keep improving.`

    case 'rebook_nudge':
      return `Hi ${firstName}! I've been putting together some new seasonal dishes that I think your family would love. Would you be interested in booking another dinner sometime in the coming weeks?`

    case 'check_in':
      return `Hi ${firstName}! It's been about a month since your ${context.occasion}. I've got some exciting new seasonal menus I've been working on. Let me know if you'd like to get something on the calendar!`

    case 're_engage':
      return `Hi ${firstName}! It's been a while since we last cooked together. I've been expanding my repertoire and would love to create something special for you. Any upcoming occasions on the horizon?`

    default:
      return ''
  }
}
```

**Integration:** Each follow-up item in the widget has a pre-filled textarea using this template. Chef reviews, edits, sends.

**Files touched:**

- `lib/dashboard/follow-up-templates.ts` - NEW file
- `components/dashboard/follow-up-sequence-widget.tsx` - render editable pre-drafted messages

---

### 8c. Rebooking Probability Score

**What changes:**

**New pure function** in `lib/dashboard/rebooking-score.ts`:

```typescript
export function computeRebookingProbability(client: {
  pastEventCount: number
  avgBookingFrequencyDays: number | null // avg days between bookings
  daysSinceLastEvent: number
  lastAARScore: number | null // 1-5 scale
  loyaltyTier: string | null
  hasRespondedToLastFollowUp: boolean
}): number {
  let score = 50 // base

  // Repeat client bonus
  if (client.pastEventCount >= 4) score += 20
  else if (client.pastEventCount >= 2) score += 10

  // Frequency pattern
  if (
    client.avgBookingFrequencyDays &&
    client.daysSinceLastEvent < client.avgBookingFrequencyDays * 1.5
  ) {
    score += 15 // within normal cadence
  } else if (
    client.avgBookingFrequencyDays &&
    client.daysSinceLastEvent > client.avgBookingFrequencyDays * 2
  ) {
    score -= 20 // past normal cadence
  }

  // Satisfaction
  if (client.lastAARScore && client.lastAARScore >= 4) score += 10
  if (client.lastAARScore && client.lastAARScore <= 2) score -= 15

  // Engagement
  if (client.hasRespondedToLastFollowUp) score += 10

  // Loyalty tier
  if (client.loyaltyTier === 'gold' || client.loyaltyTier === 'platinum') score += 10

  return Math.max(0, Math.min(100, score))
}
```

**Render per follow-up item:**

```
Johnson family: 85% likely to rebook (quarterly pattern, 4 past events)  [Send ->]
New client Mike: 40% likely (first event, no feedback yet)               [Send ->]
```

**Sort follow-ups by rebooking probability \* event value = expected value.**

**Files touched:**

- `lib/dashboard/rebooking-score.ts` - NEW file
- `components/dashboard/follow-up-sequence-widget.tsx` - compute + display probability per client

---

### 8d. Revenue Impact of Follow-Up Delay

**What changes:**

Pure calculation, no new data needed:

```typescript
// In follow-up-sequence-widget.tsx
const avgEventValueCents = client.lifetimeRevenueCents / client.pastEventCount
const rebookProb = computeRebookingProbability(client)
const expectedValueCents = Math.round(avgEventValueCents * (rebookProb / 100))
const dailyDecayCents = Math.round(expectedValueCents * 0.02) // 2% decay per day of delay

// Render:
// "Each day of delay = ~$64 in expected value lost"
```

**Files touched:**

- `components/dashboard/follow-up-sequence-widget.tsx` - compute + display delay cost

---

### 8e. Batch Send Capability

**What changes:**

**Client component with batch mode:**

```typescript
// components/dashboard/follow-up-sequence-widget.tsx
const [batchMode, setBatchMode] = useState(false)
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

// "Send all Day-1 thank yous (4 clients)" button
const thankYouItems = items.filter((i) => i.stage.name === 'thank_you')
if (thankYouItems.length >= 2) {
  // Show batch button
}

// Batch review: show all drafts stacked, one "Send all" button
async function sendBatch() {
  for (const item of selectedItems) {
    await sendFollowUp(item.clientId, item.message)
    // Update last_follow_up_at on event
  }
}
```

**Files touched:**

- `components/dashboard/follow-up-sequence-widget.tsx` - add batch mode UI

---

### 8f. Outcome Tracking

**What changes:**

**New columns on events:**

```sql
ALTER TABLE events
  ADD COLUMN follow_up_responded boolean DEFAULT false,
  ADD COLUMN follow_up_rebooked boolean DEFAULT false,
  ADD COLUMN follow_up_review_left boolean DEFAULT false;
```

**Track outcomes** when:

- Client responds to follow-up message -> set `follow_up_responded = true`
- Client books another event -> set `follow_up_rebooked = true`
- Client leaves a review -> set `follow_up_review_left = true`

**Aggregate stat** in `lib/dashboard/accountability.ts`:

```typescript
export async function getFollowUpOutcomes(): Promise<FollowUpOutcomes> {
  const { data } = await supabase
    .from('events')
    .select('follow_up_responded, follow_up_rebooked')
    .eq('tenant_id', user.tenantId)
    .not('last_follow_up_at', 'is', null)
    .gte('event_date', subMonths(new Date(), 3).toISOString())

  const sent = data?.length ?? 0
  const rebooked = data?.filter((e) => e.follow_up_rebooked).length ?? 0
  const rebookedRevenue = /* sum of rebooked event values */ 0

  return {
    followUpsSent: sent,
    rebookings: rebooked,
    rebookingRevenueCents: rebookedRevenue,
    conversionRate: sent > 0 ? Math.round((rebooked / sent) * 100) : 0,
  }
}
```

**Render:**

```
Your follow-ups: 8 rebookings from 24 sent (33%), worth $24,600 this quarter
```

**Files touched:**

- `supabase/migrations/XXXXXXXXX_follow_up_outcomes.sql` - NEW migration
- `lib/dashboard/accountability.ts` - add `getFollowUpOutcomes()`
- Follow-up and rebooking server actions - set outcome flags

---

## WIDGET 9: TO DO LIST

**Current file:** `components/dashboard/chef-todo-widget.tsx`
**Current data:** Server actions `createTodo`, `toggleTodo`, `deleteTodo`

### 9a. Smart Categorization (defer - low priority)

Auto-categorize is nice but not critical. Skip for now.

### 9b. Due Dates

**What changes:**

**Migration:**

```sql
ALTER TABLE chef_todos
  ADD COLUMN due_date date,
  ADD COLUMN is_recurring boolean DEFAULT false,
  ADD COLUMN recurrence_interval text; -- 'daily', 'weekly', 'monthly', 'yearly'
```

**Modify** `createTodo` server action:

```typescript
export async function createTodo(text: string, dueDate?: string) {
  // ...existing logic + optional due_date insert
}
```

**Modify** `components/dashboard/chef-todo-widget.tsx`:

```typescript
// Add optional date picker to create form
// Sort: overdue first (red), today (amber), future (normal), no date (last)
// Render due date badge: "Due today" | "Due Fri" | "Overdue 2d"
```

**Files touched:**

- `supabase/migrations/XXXXXXXXX_todo_due_dates.sql` - NEW migration
- Todo server actions - accept `dueDate` param
- `components/dashboard/chef-todo-widget.tsx` - add date picker, sort by due date, render badges

---

### 9c. Event Linking

**What changes:**

**Migration:**

```sql
ALTER TABLE chef_todos ADD COLUMN event_id uuid REFERENCES events(id);
```

**Modify** create form to include optional event dropdown (populated from upcoming events).

**Files touched:**

- `supabase/migrations/XXXXXXXXX_todo_event_link.sql` - NEW migration
- Todo server actions - accept `eventId` param
- `components/dashboard/chef-todo-widget.tsx` - add event link dropdown, show event badge on linked todos

---

### 9d. Recurring Tasks

**Uses the columns from 9b migration** (`is_recurring`, `recurrence_interval`).

**New server action:**

```typescript
export async function regenerateRecurringTodos() {
  // Called on dashboard load (or via cron)
  // Find completed recurring todos where next occurrence is due
  // Create new todo with same text, next due date
}
```

**Files touched:**

- Todo server actions - add `regenerateRecurringTodos()`
- `components/dashboard/chef-todo-widget.tsx` - add "Repeat" toggle to create form

---

## WIDGET 10: PREPARATION PROMPTS

**Current file:** `components/scheduling/prep-prompts-view.tsx`
**Current data:** `getAllPrepPrompts()` from schedule section

### 10a. Reverse-Scheduled from Event Time

**What changes:**

**Modify** prep prompt generation (wherever `getAllPrepPrompts()` builds its data):

```typescript
// Instead of generic "X days before event" prompts,
// calculate backwards from service time:

function generatePrepTimeline(event: {
  serviceTime: string // e.g., "19:00"
  eventDate: string
  menuItems: Array<{ name: string; prepTimeMinutes: number; technique: string }>
}): PrepPrompt[] {
  const serviceDateTime = parseISO(`${event.eventDate}T${event.serviceTime}`)

  const prompts: PrepPrompt[] = []

  // Work backwards
  let cursor = serviceDateTime

  // Plating / final assembly: 30 min before service
  cursor = subMinutes(cursor, 30)
  prompts.push({ time: cursor, label: 'Final plating and assembly', category: 'service' })

  // Cooking / execution: varies by menu
  const cookTime = event.menuItems.reduce((sum, i) => sum + (i.prepTimeMinutes ?? 30), 0)
  cursor = subMinutes(cursor, cookTime)
  prompts.push({ time: cursor, label: 'Start cooking', category: 'prep' })

  // Arrive at venue: 30 min before cooking starts
  cursor = subMinutes(cursor, 30)
  prompts.push({ time: cursor, label: 'Arrive at venue, set up', category: 'arrival' })

  // Travel: based on distance
  // Packing: 30-60 min
  // Prep: morning
  // Shopping: day before

  return prompts.sort((a, b) => compareAsc(a.time, b.time))
}
```

**Files touched:**

- Prep prompt generation code - rebuild with reverse scheduling from service time
- `components/scheduling/prep-prompts-view.tsx` - render timeline with exact times

---

### 10c. Shopping Deadline Alerts

**What changes:**

**Add to prep prompt generation:**

```typescript
// Calculate latest possible shopping time
// Event prep starts at 9am Saturday
// Perishables: shop day before (Friday by 6pm)
// Farmers market: check if Saturday morning works vs prep start time

function getShoppingDeadline(event: EventWithPrep): PrepPrompt {
  const prepStart = parseISO(event.prepStartTime)
  const dayBefore = subDays(prepStart, 1)

  return {
    time: set(dayBefore, { hours: 18, minutes: 0 }), // 6pm day before
    label: `Shopping deadline for ${event.occasion}`,
    category: 'shopping',
    urgency: 'actionable',
    message: `Buy groceries by ${format(dayBefore, 'EEEE')} 6pm for ${event.occasion} prep`,
  }
}
```

**Files touched:**

- Prep prompt generation - add shopping deadline calculation
- `components/scheduling/prep-prompts-view.tsx` - render shopping deadlines prominently

---

### 10d. Cross-Event Prep Consolidation

**What changes:**

**New function** in prep prompt generation:

```typescript
export function findConsolidationOpportunities(
  events: Array<{ id: string; occasion: string; eventDate: string; ingredients: string[] }>
): ConsolidationTip[] {
  const tips: ConsolidationTip[] = []

  // Find events within 3 days of each other
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const daysBetween = differenceInDays(
        parseISO(events[j].eventDate),
        parseISO(events[i].eventDate)
      )
      if (daysBetween <= 3 && daysBetween > 0) {
        const shared = events[i].ingredients.filter((ing) => events[j].ingredients.includes(ing))
        if (shared.length >= 2) {
          tips.push({
            events: [events[i].occasion, events[j].occasion],
            sharedIngredients: shared,
            message: `Both need ${shared.join(', ')}. Buy together, save a trip.`,
          })
        }
      }
    }
  }

  return tips
}
```

**Render:**

```
Consolidation opportunity:
  Wed dinner + Fri party both need: olive oil, lemons, garlic, chicken stock
  Buy together on Tuesday, save a trip
```

**Files touched:**

- Prep prompt generation - add consolidation detection
- `components/scheduling/prep-prompts-view.tsx` - render consolidation tips

---

## NEW MIGRATIONS SUMMARY

All additive, no destructive operations:

| #   | Migration                     | Tables/Columns                                                                         |
| --- | ----------------------------- | -------------------------------------------------------------------------------------- |
| 1   | `_add_outdoor_flag.sql`       | `events.is_outdoor` (boolean, default false)                                           |
| 2   | `_queue_snoozes.sql`          | NEW `queue_item_snoozes` table                                                         |
| 3   | `_queue_skips.sql`            | NEW `queue_item_skips` table                                                           |
| 4   | `_inquiry_first_response.sql` | `inquiries.first_response_at` (timestamptz)                                            |
| 5   | `_event_last_followup.sql`    | `events.last_follow_up_at` (timestamptz)                                               |
| 6   | `_follow_up_outcomes.sql`     | `events.follow_up_responded`, `follow_up_rebooked`, `follow_up_review_left` (booleans) |
| 7   | `_todo_enhancements.sql`      | `chef_todos.due_date`, `is_recurring`, `recurrence_interval`, `event_id`               |

**All 7 migrations are ALTER TABLE ADD COLUMN or CREATE TABLE. Zero data loss risk.**

---

## NEW FILES SUMMARY

| File                                                 | Type             | Purpose                                                                                                           |
| ---------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `components/dashboard/todays-schedule-widget.tsx`    | Client component | Extracted today's schedule with countdowns, weather alerts, client context, prep gate, packing summary, lookahead |
| `components/queue/queue-item-inline-action.tsx`      | Client component | Inline action forms for queue items (respond, pay, follow-up)                                                     |
| `components/queue/queue-batch-banner.tsx`            | Client component | Batch action suggestions above queue                                                                              |
| `components/dashboard/follow-up-sequence-widget.tsx` | Client component | Tiered follow-up sequences with drafts, probability, batch send                                                   |
| `lib/scheduling/capacity.ts`                         | Server utility   | Day capacity scoring, grocery windows, rest day checks                                                            |
| `lib/inquiries/templates.ts`                         | Pure function    | Inquiry quick-reply templates                                                                                     |
| `lib/dashboard/follow-up-templates.ts`               | Pure function    | Follow-up message drafts by stage                                                                                 |
| `lib/dashboard/rebooking-score.ts`                   | Pure function    | Client rebooking probability calculator                                                                           |

---

## MODIFIED FILES SUMMARY

| File                                                  | Changes                                                                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/scheduling/actions.ts`                           | +`getTodaysScheduleEnriched()`, +`getDepartureEstimate()`, +`getEventClientContext()`, +`getPackingSummary()`, +`getNextDayLookahead()`                                                          |
| `lib/scheduling/types.ts`                             | +`EnrichedTodaySchedule`, +`DepartureEstimate`, +`ClientEventContext`, +`PackingSummary`, +`NextDayLookahead`, +`DayCapacity`, +`GroceryWindow`, +`RestDayWarning`                               |
| `lib/dashboard/actions.ts`                            | +`getRevenueProjection()`, +`getComparativePeriods()`, +`getMarginAlerts()`, +`getCashFlowTiming()`, +`getClientConcentration()`, +`getSeasonalityIntelligence()`, +`getHourlyRateByEventType()` |
| `lib/dashboard/accountability.ts`                     | +`getFollowUpSequence()`, +`getFollowUpOutcomes()`                                                                                                                                               |
| `lib/inquiries/actions.ts`                            | +`getResponseRateStats()`, +`getResponseTimeConversion()`                                                                                                                                        |
| `lib/queue/types.ts`                                  | +`InlineAction`, +`QueueBatch`, +`QueueVelocity` on QueueItem: +`inlineAction`, +`revenueCents`, +`estimatedMinutes`, +`skipCount`, +`escalationMessage`, +`isStale`, +`contextLine`             |
| `lib/queue/score.ts`                                  | Reweight scoring (revenue 100->250), exponential staleness                                                                                                                                       |
| `lib/queue/build.ts`                                  | +`computeBatches()`, +`selectNextAction()` with time awareness, snooze/skip filtering, stale flagging                                                                                            |
| `lib/queue/actions.ts`                                | +`snoozeQueueItem()`, +`dismissQueueItem()`, +`skipQueueItem()`, +`getQueueVelocity()`                                                                                                           |
| `lib/queue/providers/*.ts`                            | +`inlineAction`, +`revenueCents`, +`estimatedMinutes`, +`contextLine` on items                                                                                                                   |
| `app/(chef)/dashboard/_sections/schedule-section.tsx` | Fetch enriched schedule + client context + packing + lookahead + departure + 3 weeks. Use new widget component.                                                                                  |
| `app/(chef)/dashboard/_sections/business-section.tsx` | Fetch projection + comparatives + margin alerts + cash flow + concentration + seasonality + hourly rates                                                                                         |
| `app/(chef)/dashboard/page.tsx`                       | Pass batches to queue section                                                                                                                                                                    |
| `components/dashboard/week-strip.tsx`                 | +capacity scoring, +grocery windows, +revenue overlay toggle, +rest day warning, +multi-week peek                                                                                                |
| `components/dashboard/dop-task-panel.tsx`             | Time-sequenced sort, duration estimates, running clock, dependency rendering                                                                                                                     |
| `components/dashboard/response-time-widget.tsx`       | Convert to client component, per-inquiry timers, revenue-at-risk, quick replies, auto-decline, correlation stats                                                                                 |
| `components/dashboard/chef-todo-widget.tsx`           | Due dates, event linking, recurring tasks                                                                                                                                                        |
| `components/scheduling/prep-prompts-view.tsx`         | Reverse scheduling, shopping deadlines, consolidation tips                                                                                                                                       |
| `components/queue/next-action.tsx`                    | Completion chain, skip with reasons, context line, estimated time                                                                                                                                |
| `components/queue/queue-item-row.tsx`                 | Inline action expand, revenue display, stale banner with snooze, waiting-time badge                                                                                                              |
| `components/queue/queue-summary.tsx`                  | Velocity stats display                                                                                                                                                                           |

---

## IMPLEMENTATION ORDER (Week by Week)

### Week 1: Queue Intelligence

1. `lib/queue/score.ts` - reweight scoring (2b)
2. `lib/queue/types.ts` - add all new fields
3. `lib/queue/providers/*.ts` - add revenueCents, estimatedMinutes, contextLine, inlineAction
4. `lib/queue/build.ts` - time-aware selection (5a), stale flagging (2c)
5. `components/queue/next-action.tsx` - time estimate (5b), context line (5d), completion chain (5e)
6. `components/queue/queue-item-row.tsx` - revenue display, waiting-time badge
7. `components/queue/queue-item-inline-action.tsx` - NEW (2a)

### Week 2: Today's Schedule

1. `components/dashboard/todays-schedule-widget.tsx` - NEW (extract + countdowns 1a)
2. `lib/scheduling/actions.ts` - enriched schedule, client context (1d), prep gate (1e)
3. Weather alerts (1b) - add to new widget
4. Packing summary (1f) - add to new widget
5. `app/(chef)/dashboard/_sections/schedule-section.tsx` - swap in new component

### Week 3: Response Time + Follow-Ups

1. `components/dashboard/response-time-widget.tsx` - per-inquiry timers (7a), revenue at risk (7b), quick replies (7d)
2. `lib/inquiries/templates.ts` - NEW (7d)
3. `lib/inquiries/actions.ts` - response rate stats (7c), conversion correlation (7f)
4. `lib/dashboard/follow-up-templates.ts` - NEW (8b)
5. `lib/dashboard/rebooking-score.ts` - NEW (8c)
6. `lib/dashboard/accountability.ts` - follow-up sequences (8a)
7. `components/dashboard/follow-up-sequence-widget.tsx` - NEW (8a, 8b, 8c, 8d, 8e)

### Week 4: DOP + Prep Prompts + Todo

1. `components/dashboard/dop-task-panel.tsx` - time-sequenced (6a), durations (6b)
2. Prep prompt generation - reverse scheduling (10a), shopping deadlines (10c), consolidation (10d)
3. `components/scheduling/prep-prompts-view.tsx` - render improvements
4. `components/dashboard/chef-todo-widget.tsx` - due dates (9b), event linking (9c), recurring (9d)
5. Migrations 1-7 (batch apply)

### Week 5: Business Snapshot

1. `lib/dashboard/actions.ts` - revenue projection (3a), comparatives (3b), margin alerts (3c)
2. Cash flow timing (3d), client concentration (3e), seasonality (3f), hourly rates (3g)
3. `app/(chef)/dashboard/_sections/business-section.tsx` - render all new cards

### Week 6: Week Strip

1. `lib/scheduling/capacity.ts` - NEW (capacity scoring 4b, grocery windows 4c, rest days 4e)
2. `components/dashboard/week-strip.tsx` - capacity labels, grocery icons, revenue overlay (4d), rest warning (4e)
3. Multi-week peek (4f) - fetch 3 weeks, expandable rows

### Week 7: Queue Advanced

1. Snooze system - migration + server actions + UI (2f)
2. Skip tracking - migration + server actions + UI (5c)
3. Batch suggestions (2d) - compute + banner component
4. Velocity tracking (2e) - activity logging + stats display

### Week 8: Polish + Outcomes

1. Traffic-adjusted departure (1c) - Google Maps API integration
2. Post-event lookahead (1g)
3. Follow-up outcome tracking (8f) - migration + server actions + stats
4. Auto-decline suggestions (7e) - booking conflict detection
5. DOP smart defaults from history (6e)
6. Full integration testing across all 10 widgets

---

---

# PHASE 2: NEW WIDGETS (The Missing Five)

> These widgets don't exist yet. They fill the gaps that force chefs to leave the dashboard.
> Same architecture: server-action data, Suspense sections, CollapsibleWidget wrappers.

---

## WIDGET 11: LIVE INBOX

**Widget ID:** `live_inbox`
**Section:** AlertsSection (high priority, streams early)
**Why it matters:** Clients message throughout the day. Currently requires navigating to `/inbox`. Every minute a message sits unread is a minute the client feels ignored.

### Component

**New file:** `components/dashboard/live-inbox-widget.tsx` (client component for real-time)

```typescript
'use client'

import { useEffect, useState, useTransition } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface InboxMessage {
  id: string
  clientName: string
  clientId: string
  preview: string         // first 120 chars
  receivedAt: string
  isRead: boolean
  channel: 'app' | 'email' | 'sms'
  eventContext?: string   // "Re: Johnson Anniversary Dinner"
}

export function LiveInboxWidget({ initialMessages }: { initialMessages: InboxMessage[] }) {
  const [messages, setMessages] = useState(initialMessages)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isPending, startTransition] = useTransition()

  // Real-time subscription for new messages
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_type=eq.chef`,
      }, (payload) => {
        // Add new message to top of list
        setMessages(prev => [mapPayloadToMessage(payload.new), ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleReply(messageId: string) {
    if (!replyText.trim()) return
    const previous = [...messages]
    // Optimistic: mark as read
    setMessages(msgs => msgs.map(m =>
      m.id === messageId ? { ...m, isRead: true } : m
    ))

    startTransition(async () => {
      try {
        await sendReply(messageId, replyText)
        setReplyText('')
        setExpandedId(null)
      } catch (err) {
        setMessages(previous) // rollback
        toast.error('Failed to send reply')
      }
    })
  }

  const unreadCount = messages.filter(m => !m.isRead).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">
          {unreadCount > 0
            ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
            : 'All caught up'}
        </span>
        <a href="/inbox" className="text-sm text-brand-600 hover:underline">Full inbox</a>
      </div>

      {messages.slice(0, 8).map(msg => (
        <div key={msg.id} className={msg.isRead ? 'opacity-60' : ''}>
          {/* Message row */}
          <button onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}>
            <span className="font-medium">{msg.clientName}</span>
            <span className="text-muted">{msg.preview}</span>
            <span className="text-xs">{formatDistanceToNow(parseISO(msg.receivedAt))}</span>
          </button>

          {/* Expanded: full message + reply form */}
          {expandedId === msg.id && (
            <div className="mt-2 pl-4 border-l-2">
              <p>{msg.fullText}</p>
              {msg.eventContext && (
                <span className="text-xs bg-stone-100 px-2 py-0.5 rounded">{msg.eventContext}</span>
              )}
              <div className="mt-2 flex gap-2">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 text-sm border rounded p-2"
                  rows={2}
                />
                <button
                  onClick={() => handleReply(msg.id)}
                  disabled={isPending || !replyText.trim()}
                  className="px-3 py-1 bg-brand-600 text-white rounded text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

### Server Action

**New function** in `lib/messaging/actions.ts`:

```typescript
export async function getInboxPreview(limit = 8): Promise<InboxMessage[]> {
  const user = await requireChef()

  const { data } = await supabase
    .from('messages')
    .select(
      `
      id, body, created_at, read_at, channel,
      sender:clients(id, name),
      event:events(occasion)
    `
    )
    .eq('tenant_id', user.tenantId)
    .eq('recipient_type', 'chef')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((m) => ({
    id: m.id,
    clientName: m.sender?.name ?? 'Unknown',
    clientId: m.sender?.id ?? '',
    preview: m.body?.slice(0, 120) ?? '',
    fullText: m.body ?? '',
    receivedAt: m.created_at,
    isRead: !!m.read_at,
    channel: m.channel ?? 'app',
    eventContext: m.event?.occasion ? `Re: ${m.event.occasion}` : undefined,
  }))
}

export async function sendReply(messageId: string, replyText: string) {
  const user = await requireChef()

  // Get the original message to find recipient
  const { data: original } = await supabase
    .from('messages')
    .select('sender_id, event_id, thread_id')
    .eq('id', messageId)
    .single()

  if (!original) throw new Error('Message not found')

  // Mark original as read
  await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', messageId)

  // Send reply
  await supabase.from('messages').insert({
    tenant_id: user.tenantId,
    sender_id: user.entityId,
    sender_type: 'chef',
    recipient_id: original.sender_id,
    recipient_type: 'client',
    body: replyText,
    event_id: original.event_id,
    thread_id: original.thread_id ?? messageId,
    channel: 'app',
  })

  revalidatePath('/dashboard')
  revalidatePath('/inbox')
}
```

### Integration

In `app/(chef)/dashboard/_sections/alerts-section.tsx`:

```typescript
const inboxMessages = await safe('inbox', getInboxPreview, [])

// Render:
{isWidgetEnabled('live_inbox') && (
  <section style={{ order: getWidgetOrder('live_inbox') }}>
    <CollapsibleWidget widgetId="live_inbox" title="Inbox">
      <LiveInboxWidget initialMessages={inboxMessages} />
    </CollapsibleWidget>
  </section>
)}
```

### Files touched

- `components/dashboard/live-inbox-widget.tsx` - NEW client component
- `lib/messaging/actions.ts` - add `getInboxPreview()`, `sendReply()`
- `app/(chef)/dashboard/_sections/alerts-section.tsx` - fetch + render
- `lib/scheduling/types.ts` - add `live_inbox` to `DASHBOARD_WIDGET_IDS`

---

## WIDGET 12: ACTIVE SHOPPING LIST

**Widget ID:** `active_shopping_list`
**Section:** ScheduleSection (appears near Today's Schedule)
**Why it matters:** Chef is at the store with their phone. They need the list NOW, on the dashboard, not buried 3 clicks deep. Most mobile-critical widget in the app.

### Component

**New file:** `components/dashboard/shopping-list-widget.tsx` (client component for checkboxes)

```typescript
'use client'

interface ShoppingItem {
  id: string
  name: string
  quantity: string       // "2 lbs", "1 bunch", "500g"
  category: string       // Produce, Protein, Dairy, Pantry, etc.
  purchased: boolean
  eventOccasion: string  // which event this is for
  eventId: string
  substituteNote?: string // "If no fresh basil, get dried"
}

interface ShoppingListWidgetProps {
  items: ShoppingItem[]
  eventLabel: string     // "Johnson Anniversary - Sat Jun 14"
  consolidatedEvents?: string[] // if buying for multiple events
}

export function ShoppingListWidget({ items, eventLabel, consolidatedEvents }: ShoppingListWidgetProps) {
  const [localItems, setLocalItems] = useState(items)
  const [isPending, startTransition] = useTransition()
  const [groupBy, setGroupBy] = useState<'category' | 'event'>('category')

  const purchasedCount = localItems.filter(i => i.purchased).length
  const totalCount = localItems.length

  async function togglePurchased(itemId: string) {
    const previous = [...localItems]
    setLocalItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, purchased: !i.purchased } : i
    ))

    startTransition(async () => {
      try {
        await toggleShoppingItem(itemId)
      } catch {
        setLocalItems(previous)
        toast.error('Failed to update item')
      }
    })
  }

  // Group items
  const grouped = groupBy === 'category'
    ? groupByKey(localItems, 'category')
    : groupByKey(localItems, 'eventOccasion')

  // Sort categories in store-walk order
  const categoryOrder = ['Produce', 'Protein', 'Seafood', 'Dairy', 'Bakery', 'Pantry', 'Frozen', 'Other']

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-medium">{eventLabel}</span>
          {consolidatedEvents && consolidatedEvents.length > 0 && (
            <span className="text-xs text-muted ml-2">
              + {consolidatedEvents.join(', ')}
            </span>
          )}
        </div>
        <span className="text-sm">
          {purchasedCount}/{totalCount} items
          <span className="ml-2 inline-block w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <span
              className="block h-full bg-emerald-500 rounded-full"
              style={{ width: `${(purchasedCount / totalCount) * 100}%` }}
            />
          </span>
        </span>
      </div>

      {/* Group toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setGroupBy('category')}
          className={groupBy === 'category' ? 'text-sm font-medium' : 'text-sm text-muted'}
        >
          By aisle
        </button>
        {consolidatedEvents && (
          <button
            onClick={() => setGroupBy('event')}
            className={groupBy === 'event' ? 'text-sm font-medium' : 'text-sm text-muted'}
          >
            By event
          </button>
        )}
      </div>

      {/* Items by group */}
      {Object.entries(grouped)
        .sort(([a], [b]) => {
          if (groupBy === 'category') {
            return categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
          }
          return a.localeCompare(b)
        })
        .map(([group, groupItems]) => (
          <div key={group} className="mb-3">
            <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-1">{group}</h4>
            {groupItems.map(item => (
              <label key={item.id} className="flex items-center gap-2 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.purchased}
                  onChange={() => togglePurchased(item.id)}
                  disabled={isPending}
                />
                <span className={item.purchased ? 'line-through text-muted' : ''}>
                  {item.name}
                </span>
                <span className="text-xs text-muted ml-auto">{item.quantity}</span>
              </label>
            ))}
          </div>
        ))}

      {/* All done state */}
      {purchasedCount === totalCount && (
        <div className="text-center text-emerald-600 py-2 text-sm">
          All items purchased. Start prepping!
        </div>
      )}
    </div>
  )
}
```

### Server Action

**New function** in `lib/scheduling/actions.ts`:

```typescript
export async function getActiveShoppingList(): Promise<ActiveShoppingList | null> {
  const user = await requireChef()

  // Find the next event(s) that need shopping (within 3 days, not yet shopped)
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count,
      client:clients(name),
      menus:event_menus(
        menu:menus(
          items:menu_items(
            recipe:recipes(
              ingredients:recipe_ingredients(
                ingredient:ingredients(id, name, category),
                quantity, unit
              )
            )
          )
        )
      )
    `
    )
    .eq('tenant_id', user.tenantId)
    .gte('event_date', new Date().toISOString())
    .lte('event_date', addDays(new Date(), 3).toISOString())
    .not('status', 'in', '("cancelled","completed")')
    .order('event_date', { ascending: true })

  if (!upcomingEvents?.length) return null

  // Get existing shopping list items (if chef has already generated one)
  const eventIds = upcomingEvents.map((e) => e.id)
  const { data: existingItems } = await supabase
    .from('shopping_list_items')
    .select('*')
    .in('event_id', eventIds)

  if (existingItems?.length) {
    // Return existing list with purchase status
    return {
      items: existingItems.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity ?? '',
        category: i.category ?? 'Other',
        purchased: i.purchased ?? false,
        eventOccasion: upcomingEvents.find((e) => e.id === i.event_id)?.occasion ?? '',
        eventId: i.event_id,
      })),
      eventLabel: formatEventLabel(upcomingEvents[0]),
      consolidatedEvents:
        upcomingEvents.length > 1 ? upcomingEvents.slice(1).map((e) => e.occasion) : undefined,
    }
  }

  // Auto-generate from menu ingredients if no list exists
  const items = extractIngredientsFromEvents(upcomingEvents)
  return {
    items,
    eventLabel: formatEventLabel(upcomingEvents[0]),
    consolidatedEvents:
      upcomingEvents.length > 1 ? upcomingEvents.slice(1).map((e) => e.occasion) : undefined,
  }
}

export async function toggleShoppingItem(itemId: string) {
  const user = await requireChef()

  const { data: item } = await supabase
    .from('shopping_list_items')
    .select('purchased')
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!item) throw new Error('Item not found')

  await supabase
    .from('shopping_list_items')
    .update({ purchased: !item.purchased, updated_at: new Date().toISOString() })
    .eq('id', itemId)

  revalidatePath('/dashboard')
}
```

### Mobile Optimization

This widget needs special mobile treatment:

```typescript
// In the widget component, detect mobile viewport
// On mobile: widget expands to near-full-screen with large touch targets
// Checkboxes are 44x44px minimum (Apple HIG)
// Category headers are sticky for scroll context
// "Back to top" float button when scrolled
```

### Files touched

- `components/dashboard/shopping-list-widget.tsx` - NEW client component
- `lib/scheduling/actions.ts` - add `getActiveShoppingList()`, `toggleShoppingItem()`
- `lib/scheduling/types.ts` - add `active_shopping_list` to widget IDs, add `ActiveShoppingList` type
- `app/(chef)/dashboard/_sections/schedule-section.tsx` - fetch + render

---

## WIDGET 13: QUICK EXPENSE CAPTURE

**Widget ID:** `quick_expense`
**Section:** BusinessSection (near financial widgets)
**Why it matters:** Chefs spend money throughout the day (groceries, supplies, gas). Every receipt not captured is a missed tax deduction and an inaccurate profit calculation. Must be one-tap.

### Component

**New file:** `components/dashboard/quick-expense-widget.tsx` (client component)

```typescript
'use client'

interface QuickExpenseWidgetProps {
  upcomingEvents: Array<{ id: string; occasion: string; date: string }>
  recentExpenses: Array<{ id: string; description: string; amountCents: number; date: string }>
}

export function QuickExpenseWidget({ upcomingEvents, recentExpenses }: QuickExpenseWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('groceries')
  const [eventId, setEventId] = useState(upcomingEvents[0]?.id ?? '')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  const categories = [
    { value: 'groceries', label: 'Groceries' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'travel', label: 'Travel/Gas' },
    { value: 'rental', label: 'Rental' },
    { value: 'other', label: 'Other' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !description) return

    startTransition(async () => {
      try {
        const amountCents = Math.round(parseFloat(amount) * 100)

        // Upload receipt if provided
        let receiptUrl: string | undefined
        if (receiptFile) {
          const formData = new FormData()
          formData.append('file', receiptFile)
          const uploadResult = await uploadReceipt(formData)
          receiptUrl = uploadResult.url
        }

        await createQuickExpense({
          amountCents,
          description,
          category,
          eventId: eventId || undefined,
          receiptUrl,
          date: new Date().toISOString(),
        })

        // Reset form
        setAmount('')
        setDescription('')
        setReceiptFile(null)
        setIsOpen(false)
        toast.success(`Logged $${amount} expense`)
      } catch (err) {
        toast.error('Failed to log expense')
      }
    })
  }

  return (
    <div>
      {/* Quick stats */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted">
          {recentExpenses.length > 0
            ? `${recentExpenses.length} expenses this week`
            : 'No expenses logged this week'}
        </span>
        <a href="/expenses" className="text-sm text-brand-600 hover:underline">All expenses</a>
      </div>

      {/* Quick-add button */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full py-3 border-2 border-dashed border-stone-300 rounded-lg text-sm text-muted hover:border-brand-400 hover:text-brand-600 transition-colors"
        >
          + Log expense
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-stone-50 rounded-lg">
          {/* Amount + Description on same row */}
          <div className="flex gap-2">
            <div className="w-28">
              <label className="text-xs text-muted">Amount</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-2 py-1.5 border rounded text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted">What for</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Groceries for Johnson dinner"
                className="w-full px-2 py-1.5 border rounded text-sm"
              />
            </div>
          </div>

          {/* Category + Event */}
          <div className="flex gap-2">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="flex-1 px-2 py-1.5 border rounded text-sm"
            >
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={eventId}
              onChange={e => setEventId(e.target.value)}
              className="flex-1 px-2 py-1.5 border rounded text-sm"
            >
              <option value="">No event</option>
              {upcomingEvents.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.occasion}</option>
              ))}
            </select>
          </div>

          {/* Receipt photo */}
          <div className="flex items-center gap-2">
            <label className="cursor-pointer text-sm text-brand-600 hover:underline">
              {receiptFile ? receiptFile.name : 'Snap receipt photo'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={e => setReceiptFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending || !amount || !description}
              className="flex-1 py-1.5 bg-brand-600 text-white rounded text-sm disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Log expense'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-sm text-muted hover:text-stone-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Recent expenses (last 3) */}
      {recentExpenses.slice(0, 3).map(exp => (
        <div key={exp.id} className="flex justify-between text-sm py-1 border-t mt-2 pt-2">
          <span>{exp.description}</span>
          <span className="font-medium">${(exp.amountCents / 100).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}
```

### Server Action

**New function** in `lib/expenses/actions.ts`:

```typescript
export async function createQuickExpense(input: {
  amountCents: number
  description: string
  category: string
  eventId?: string
  receiptUrl?: string
  date: string
}) {
  const user = await requireChef()

  await supabase.from('expenses').insert({
    tenant_id: user.tenantId,
    chef_id: user.entityId,
    amount_cents: input.amountCents,
    description: input.description,
    category: input.category,
    event_id: input.eventId,
    receipt_url: input.receiptUrl,
    date: input.date,
    source: 'dashboard_quick', // track where expenses are created
  })

  revalidatePath('/dashboard')
  revalidatePath('/expenses')
  if (input.eventId) revalidatePath(`/events/${input.eventId}`)
}

export async function getRecentExpenses(limit = 3): Promise<RecentExpense[]> {
  const user = await requireChef()

  const { data } = await supabase
    .from('expenses')
    .select('id, description, amount_cents, date')
    .eq('tenant_id', user.tenantId)
    .gte('date', startOfWeek(new Date()).toISOString())
    .order('date', { ascending: false })
    .limit(limit)

  return data ?? []
}
```

### Files touched

- `components/dashboard/quick-expense-widget.tsx` - NEW client component
- `lib/expenses/actions.ts` - add `createQuickExpense()`, `getRecentExpenses()`
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch events + recent expenses, render widget
- `lib/scheduling/types.ts` - add `quick_expense` to widget IDs

---

## WIDGET 14: QUICK AVAILABILITY CHECK

**Widget ID:** `availability_check`
**Section:** ScheduleSection (near Week Strip)
**Why it matters:** "Are you free on the 14th?" is the most common question a chef gets. Currently requires navigating to calendar. Should be instant from the dashboard.

### Component

**New file:** `components/dashboard/availability-widget.tsx` (client component)

```typescript
'use client'

interface AvailabilityWidgetProps {
  bookedDates: string[]       // ISO date strings for next 90 days
  prepDates: string[]         // dates with prep blocks
  blockedDates: string[]      // manually blocked dates
}

export function AvailabilityWidget({ bookedDates, prepDates, blockedDates }: AvailabilityWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showMonth, setShowMonth] = useState(new Date())

  const bookedSet = new Set(bookedDates)
  const prepSet = new Set(prepDates)
  const blockedSet = new Set(blockedDates)

  function getDateStatus(dateStr: string): 'booked' | 'prep' | 'blocked' | 'free' {
    if (bookedSet.has(dateStr)) return 'booked'
    if (blockedSet.has(dateStr)) return 'blocked'
    if (prepSet.has(dateStr)) return 'prep'
    return 'free'
  }

  const statusColors = {
    booked: 'bg-red-100 text-red-800 border-red-300',
    prep: 'bg-amber-100 text-amber-800 border-amber-300',
    blocked: 'bg-stone-200 text-stone-600',
    free: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
  }

  // Mini calendar grid (current month)
  const daysInMonth = getDaysInMonth(showMonth)
  const firstDayOfWeek = getDay(startOfMonth(showMonth))

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setShowMonth(subMonths(showMonth, 1))} className="text-sm px-2">
          &lt;
        </button>
        <span className="text-sm font-medium">{format(showMonth, 'MMMM yyyy')}</span>
        <button onClick={() => setShowMonth(addMonths(showMonth, 1))} className="text-sm px-2">
          &gt;
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const date = new Date(showMonth.getFullYear(), showMonth.getMonth(), i + 1)
          const dateStr = format(date, 'yyyy-MM-dd')
          const status = getDateStatus(dateStr)
          const isPast = date < startOfDay(new Date())

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              disabled={isPast}
              className={`
                text-xs p-1 rounded border text-center
                ${isPast ? 'opacity-30' : statusColors[status]}
                ${selectedDate === dateStr ? 'ring-2 ring-brand-500' : ''}
              `}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-2 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Free
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Prep
        </span>
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <div className="mt-3 p-2 bg-stone-50 rounded text-sm">
          <span className="font-medium">{format(parseISO(selectedDate), 'EEEE, MMMM d')}</span>
          {getDateStatus(selectedDate) === 'free' ? (
            <div className="mt-1 flex gap-2">
              <span className="text-emerald-600">Available</span>
              <a
                href={`/inquiries/new?date=${selectedDate}`}
                className="text-brand-600 hover:underline text-xs"
              >
                Create inquiry for this date
              </a>
              <button
                onClick={() => blockDate(selectedDate)}
                className="text-stone-500 hover:underline text-xs"
              >
                Block this date
              </button>
            </div>
          ) : getDateStatus(selectedDate) === 'booked' ? (
            <div className="mt-1 text-red-600">
              Booked: {/* show event name */}
              <a href={`/events/...`} className="underline ml-1">View event</a>
            </div>
          ) : (
            <div className="mt-1 text-amber-600">Prep day</div>
          )}
        </div>
      )}
    </div>
  )
}
```

### Server Action

**New function** in `lib/scheduling/actions.ts`:

```typescript
export async function getAvailabilityCalendar(): Promise<AvailabilityCalendar> {
  const user = await requireChef()
  const now = new Date()
  const end = addDays(now, 90)

  const [events, prepBlocks, blockedDays] = await Promise.all([
    supabase
      .from('events')
      .select('event_date')
      .eq('tenant_id', user.tenantId)
      .not('status', 'in', '("cancelled")')
      .gte('event_date', now.toISOString())
      .lte('event_date', end.toISOString()),

    supabase
      .from('prep_blocks')
      .select('date')
      .eq('tenant_id', user.tenantId)
      .gte('date', now.toISOString())
      .lte('date', end.toISOString()),

    supabase
      .from('blocked_dates')
      .select('date')
      .eq('chef_id', user.entityId)
      .gte('date', now.toISOString())
      .lte('date', end.toISOString()),
  ])

  return {
    bookedDates: (events.data ?? []).map((e) => e.event_date),
    prepDates: (prepBlocks.data ?? []).map((p) => p.date),
    blockedDates: (blockedDays.data ?? []).map((b) => b.date),
  }
}

export async function blockDate(date: string) {
  const user = await requireChef()
  await supabase.from('blocked_dates').insert({
    chef_id: user.entityId,
    tenant_id: user.tenantId,
    date,
  })
  revalidatePath('/dashboard')
  revalidatePath('/calendar')
}
```

### Files touched

- `components/dashboard/availability-widget.tsx` - NEW client component
- `lib/scheduling/actions.ts` - add `getAvailabilityCalendar()`, `blockDate()`
- `lib/scheduling/types.ts` - add `availability_check` to widget IDs
- `app/(chef)/dashboard/_sections/schedule-section.tsx` - fetch + render

---

## WIDGET 15: INVOICE PULSE

**Widget ID:** `invoice_pulse`
**Section:** BusinessSection (near Business Snapshot)
**Why it matters:** Revenue isn't real until it's collected. Chefs need to know which invoices are aging, which clients have viewed them, and which need a nudge. Inline "send reminder" turns knowing into doing.

### Component

**New file:** `components/dashboard/invoice-pulse-widget.tsx` (client component)

```typescript
'use client'

interface InvoiceItem {
  id: string
  eventOccasion: string
  clientName: string
  clientId: string
  amountCents: number
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue'
  sentAt: string | null
  viewedAt: string | null
  dueDate: string | null
  daysOverdue: number       // 0 if not overdue
}

interface InvoicePulseProps {
  invoices: InvoiceItem[]
  totals: {
    outstandingCents: number
    overdueCents: number
    paidThisMonthCents: number
    sentCount: number
    viewedCount: number
    overdueCount: number
  }
}

export function InvoicePulseWidget({ invoices, totals }: InvoicePulseProps) {
  const [isPending, startTransition] = useTransition()

  async function sendReminder(invoiceId: string) {
    startTransition(async () => {
      try {
        await sendInvoiceReminder(invoiceId)
        toast.success('Reminder sent')
      } catch {
        toast.error('Failed to send reminder')
      }
    })
  }

  return (
    <div>
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-stone-50 rounded">
          <div className="text-lg font-semibold">
            ${(totals.outstandingCents / 100).toLocaleString()}
          </div>
          <div className="text-xs text-muted">Outstanding</div>
        </div>
        <div className={`text-center p-2 rounded ${totals.overdueCents > 0 ? 'bg-red-50' : 'bg-stone-50'}`}>
          <div className={`text-lg font-semibold ${totals.overdueCents > 0 ? 'text-red-600' : ''}`}>
            ${(totals.overdueCents / 100).toLocaleString()}
          </div>
          <div className="text-xs text-muted">Overdue</div>
        </div>
        <div className="text-center p-2 bg-emerald-50 rounded">
          <div className="text-lg font-semibold text-emerald-600">
            ${(totals.paidThisMonthCents / 100).toLocaleString()}
          </div>
          <div className="text-xs text-muted">Collected</div>
        </div>
      </div>

      {/* Funnel: Sent -> Viewed -> Paid */}
      <div className="flex items-center gap-1 text-xs text-muted mb-3">
        <span>{totals.sentCount} sent</span>
        <span>&rarr;</span>
        <span>{totals.viewedCount} viewed</span>
        <span>&rarr;</span>
        <span className="text-emerald-600">collected</span>
        {totals.sentCount > 0 && totals.viewedCount === 0 && (
          <span className="ml-2 text-amber-600">(none viewed yet)</span>
        )}
      </div>

      {/* Individual invoices needing attention */}
      {invoices
        .filter(i => i.status !== 'paid')
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 5)
        .map(inv => (
          <div key={inv.id} className="flex items-center justify-between py-2 border-t text-sm">
            <div>
              <a href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                {inv.clientName}
              </a>
              <span className="text-muted ml-2">{inv.eventOccasion}</span>
              <span className="ml-2 font-medium">${(inv.amountCents / 100).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Status badges */}
              {inv.status === 'overdue' && (
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                  {inv.daysOverdue}d overdue
                </span>
              )}
              {inv.status === 'sent' && !inv.viewedAt && (
                <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                  Not viewed
                </span>
              )}
              {inv.status === 'viewed' && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  Viewed {formatDistanceToNow(parseISO(inv.viewedAt!))} ago
                </span>
              )}

              {/* Send reminder button */}
              {(inv.status === 'overdue' || (inv.status === 'sent' && inv.daysOverdue > 3)) && (
                <button
                  onClick={() => sendReminder(inv.id)}
                  disabled={isPending}
                  className="text-xs text-brand-600 hover:underline"
                >
                  Send reminder
                </button>
              )}
            </div>
          </div>
        ))}

      {/* Link to full invoices */}
      <a href="/invoices" className="block text-center text-sm text-brand-600 hover:underline mt-2">
        All invoices
      </a>
    </div>
  )
}
```

### Server Action

**New function** in `lib/invoices/actions.ts`:

```typescript
export async function getInvoicePulse(): Promise<InvoicePulseData> {
  const user = await requireChef()
  const now = new Date()

  const { data: invoices } = await supabase
    .from('invoices')
    .select(
      `
      id, amount_cents, status, sent_at, viewed_at, due_date,
      event:events(occasion),
      client:clients(name, id)
    `
    )
    .eq('tenant_id', user.tenantId)
    .gte('created_at', subMonths(now, 3).toISOString())
    .order('created_at', { ascending: false })

  const items: InvoiceItem[] = (invoices ?? []).map((inv) => {
    const dueDate = inv.due_date ? parseISO(inv.due_date) : null
    const isOverdue = inv.status === 'sent' && dueDate && dueDate < now
    const daysOverdue = isOverdue ? differenceInDays(now, dueDate) : 0

    return {
      id: inv.id,
      eventOccasion: inv.event?.occasion ?? '',
      clientName: inv.client?.name ?? '',
      clientId: inv.client?.id ?? '',
      amountCents: inv.amount_cents,
      status: isOverdue ? 'overdue' : inv.viewed_at ? 'viewed' : inv.status,
      sentAt: inv.sent_at,
      viewedAt: inv.viewed_at,
      dueDate: inv.due_date,
      daysOverdue,
    }
  })

  const outstanding = items.filter((i) => i.status !== 'paid' && i.status !== 'draft')
  const overdue = items.filter((i) => i.status === 'overdue')
  const paidThisMonth = items.filter(
    (i) => i.status === 'paid' && parseISO(i.sentAt!).getMonth() === now.getMonth()
  )

  return {
    invoices: items,
    totals: {
      outstandingCents: outstanding.reduce((s, i) => s + i.amountCents, 0),
      overdueCents: overdue.reduce((s, i) => s + i.amountCents, 0),
      paidThisMonthCents: paidThisMonth.reduce((s, i) => s + i.amountCents, 0),
      sentCount: items.filter((i) => ['sent', 'viewed', 'overdue'].includes(i.status)).length,
      viewedCount: items.filter((i) => i.viewedAt).length,
      overdueCount: overdue.length,
    },
  }
}

export async function sendInvoiceReminder(invoiceId: string) {
  const user = await requireChef()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, client:clients(email, name), amount_cents, event:events(occasion)')
    .eq('id', invoiceId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!invoice) throw new Error('Invoice not found')

  // Send reminder email via Resend
  await sendEmail({
    to: invoice.client.email,
    subject: `Payment reminder: ${invoice.event?.occasion ?? 'Invoice'}`,
    template: 'invoice-reminder',
    data: {
      clientName: invoice.client.name,
      amount: (invoice.amount_cents / 100).toFixed(2),
      invoiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceId}/pay`,
    },
  })

  // Log the reminder
  await supabase.from('invoice_reminders').insert({
    invoice_id: invoiceId,
    tenant_id: user.tenantId,
    sent_at: new Date().toISOString(),
  })

  revalidatePath('/dashboard')
}
```

### Files touched

- `components/dashboard/invoice-pulse-widget.tsx` - NEW client component
- `lib/invoices/actions.ts` - add `getInvoicePulse()`, `sendInvoiceReminder()`
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch + render
- `lib/scheduling/types.ts` - add `invoice_pulse` to widget IDs

---

---

# PHASE 3: POWER FEATURES

> These make the dashboard truly self-contained. Chef never needs to leave.

---

## WIDGET 16: CLIENT QUICK-LOOKUP

**Widget ID:** `client_lookup`
**Section:** Top of dashboard (always visible, like Cmd+K but embedded)

### Component

**New file:** `components/dashboard/client-lookup-widget.tsx` (client component)

```typescript
'use client'

export function ClientLookupWidget() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClientCard[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return }

    const timeout = setTimeout(async () => {
      setIsSearching(true)
      const data = await searchClientsQuick(query)
      setResults(data)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Look up client (name, dietary, allergy...)"
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />

      {results.map(client => (
        <div key={client.id} className="p-3 border-t">
          <div className="flex justify-between">
            <a href={`/clients/${client.id}`} className="font-medium hover:underline">
              {client.name}
            </a>
            {client.loyaltyTier && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                {client.loyaltyTier}
              </span>
            )}
          </div>

          {/* Dietary + Allergies (always visible, safety critical) */}
          {client.dietaryRestrictions && (
            <div className="text-sm text-muted">{client.dietaryRestrictions}</div>
          )}
          {client.allergies && (
            <div className="text-sm text-red-600 font-medium">
              ALLERGY: {client.allergies}
            </div>
          )}

          {/* Quick stats */}
          <div className="text-xs text-muted mt-1">
            {client.eventCount} events | Last: {client.lastEventDate
              ? formatDistanceToNow(parseISO(client.lastEventDate)) + ' ago'
              : 'never'}
            {client.lifetimeRevenue > 0 && ` | $${(client.lifetimeRevenue / 100).toLocaleString()} lifetime`}
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-1">
            <a href={`/clients/${client.id}#messages`} className="text-xs text-brand-600">Message</a>
            <a href={`/inquiries/new?client=${client.id}`} className="text-xs text-brand-600">New inquiry</a>
            <a href={`tel:${client.phone}`} className="text-xs text-brand-600">Call</a>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Server Action

```typescript
export async function searchClientsQuick(query: string): Promise<ClientCard[]> {
  const user = await requireChef()

  const { data } = await supabase
    .from('clients')
    .select(
      `
      id, name, email, phone, dietary_restrictions, allergies, notes,
      loyalty_tier, lifetime_revenue_cents
    `
    )
    .eq('tenant_id', user.tenantId)
    .or(`name.ilike.%${query}%,dietary_restrictions.ilike.%${query}%,allergies.ilike.%${query}%`)
    .limit(5)

  // Enrich with event counts
  const enriched = await Promise.all(
    (data ?? []).map(async (client) => {
      const [{ count }, { data: lastEvent }] = await Promise.all([
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .eq('status', 'completed'),
        supabase
          .from('events')
          .select('event_date')
          .eq('client_id', client.id)
          .eq('status', 'completed')
          .order('event_date', { ascending: false })
          .limit(1)
          .single(),
      ])

      return {
        ...client,
        eventCount: count ?? 0,
        lastEventDate: lastEvent?.event_date ?? null,
        lifetimeRevenue: client.lifetime_revenue_cents ?? 0,
        loyaltyTier: client.loyalty_tier,
      }
    })
  )

  return enriched
}
```

### Files touched

- `components/dashboard/client-lookup-widget.tsx` - NEW
- `lib/clients/actions.ts` - add `searchClientsQuick()`
- `lib/scheduling/types.ts` - add `client_lookup` to widget IDs
- `app/(chef)/dashboard/page.tsx` - render above sections (not inside a section)

---

## WIDGET 17: RECIPE QUICK-CAPTURE

**Widget ID:** `recipe_capture`
**Section:** AlertsSection (near Recipe Debt widget)

### Component

**New file:** `components/dashboard/recipe-capture-widget.tsx` (client component)

```typescript
'use client'

export function RecipeCaptureWidget({ recipeDebt }: { recipeDebt: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleCapture() {
    if (!text.trim()) return

    startTransition(async () => {
      try {
        await createRecipeDraft(text)
        setText('')
        setIsOpen(false)
        toast.success('Recipe draft saved. Clean it up later in your recipe book.')
      } catch {
        toast.error('Failed to save draft')
      }
    })
  }

  return (
    <div>
      {recipeDebt > 0 && (
        <div className="text-sm text-amber-600 mb-2">
          {recipeDebt} recipe{recipeDebt > 1 ? 's' : ''} to document from recent events
        </div>
      )}

      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full py-3 border-2 border-dashed border-stone-300 rounded-lg text-sm text-muted hover:border-brand-400 hover:text-brand-600"
        >
          + Quick capture recipe
        </button>
      ) : (
        <div className="space-y-2 p-3 bg-stone-50 rounded-lg">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Brain dump your recipe here. Name, ingredients, rough method. You'll clean it up later. Voice input works great here."
            className="w-full border rounded p-2 text-sm"
            rows={6}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCapture}
              disabled={isPending || !text.trim()}
              className="flex-1 py-1.5 bg-brand-600 text-white rounded text-sm"
            >
              {isPending ? 'Saving...' : 'Save draft'}
            </button>
            <button
              onClick={() => { setIsOpen(false); setText('') }}
              className="px-3 py-1.5 text-sm text-muted"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-muted">
            Saved as a draft in your recipe book. You can refine it later.
          </p>
        </div>
      )}
    </div>
  )
}
```

### Server Action

```typescript
export async function createRecipeDraft(rawText: string) {
  const user = await requireChef()

  // Extract a rough name from first line
  const lines = rawText.trim().split('\n')
  const name = lines[0].slice(0, 100) || 'Untitled Recipe Draft'

  await supabase.from('recipes').insert({
    tenant_id: user.tenantId,
    chef_id: user.entityId,
    name,
    notes: rawText,
    status: 'draft',
    source: 'dashboard_quick_capture',
  })

  revalidatePath('/dashboard')
  revalidatePath('/recipes')
}
```

**Important: This does NOT generate recipes (per CLAUDE.md rule 0). It saves the chef's own text as-is. No AI processing, no ingredient extraction, no method generation. Just a raw text dump into a draft.**

### Files touched

- `components/dashboard/recipe-capture-widget.tsx` - NEW
- `lib/recipes/actions.ts` - add `createRecipeDraft()`
- `lib/scheduling/types.ts` - add `recipe_capture` to widget IDs
- `app/(chef)/dashboard/_sections/alerts-section.tsx` - render near recipe debt widget

---

## WIDGET 18: SMART HOURS LOG (Upgrade Existing)

**Current widget ID:** `hours`
**Current file:** `components/dashboard/hours-log-widget.tsx`

### Auto-Detection Enhancement

**Modify** the existing Hours Log widget to:

```typescript
// In the server data fetch, check for events that were yesterday/today with no hours logged

export async function getUnloggedEventHours(): Promise<UnloggedEvent[]> {
  const user = await requireChef()
  const yesterday = subDays(new Date(), 1)

  const { data: recentEvents } = await supabase
    .from('events')
    .select('id, occasion, event_date, service_hours, prep_hours, shopping_hours, travel_hours')
    .eq('tenant_id', user.tenantId)
    .in('status', ['completed', 'in_progress'])
    .gte('event_date', format(yesterday, 'yyyy-MM-dd'))

  return (recentEvents ?? [])
    .filter((e) => {
      const totalLogged =
        (e.service_hours ?? 0) +
        (e.prep_hours ?? 0) +
        (e.shopping_hours ?? 0) +
        (e.travel_hours ?? 0)
      return totalLogged === 0 // No hours logged at all
    })
    .map((e) => ({
      id: e.id,
      occasion: e.occasion,
      date: e.event_date,
      suggestedHours: {
        // Smart defaults from event timeline if available
        service: 4, // default
        prep: 2, // default
        shopping: 1, // default
        travel: 0.5, // default
      },
    }))
}
```

**Render prompt in hours widget:**

```
You haven't logged hours for yesterday's Johnson dinner.
  Service: [4h]  Prep: [2h]  Shopping: [1h]  Travel: [0.5h]
  [Log these hours]   [Edit first]
```

Pre-filled with smart defaults. Chef taps "Log these hours" or adjusts first.

### Files touched

- `lib/dashboard/actions.ts` - add `getUnloggedEventHours()`
- `components/dashboard/hours-log-widget.tsx` - add unlogged event prompt with pre-fills
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch unlogged events, pass to widget

---

## WIDGET 19: INLINE AAR PROMPT (Upgrade Existing)

**Current widget ID:** `service_quality`
**Current file:** `components/dashboard/service-quality-widget.tsx`

### Quick AAR Enhancement

**Add inline AAR form** for recently completed events:

```typescript
// In the widget, check for events completed in last 48h with no AAR filed

interface QuickAARForm {
  eventId: string
  eventOccasion: string
  completedAt: string
  // Simple form fields:
  calmScore: number // 1-5 slider
  prepScore: number // 1-5 slider
  whatWentWell: string // textarea
  whatWentWrong: string // textarea
  forgottenItems: string // comma-separated
}
```

**Render:**

```
Johnson dinner completed 18h ago. Quick debrief? (est. 3 min)

  How calm were you?    [1] [2] [3] [4] [5]
  How prepared?         [1] [2] [3] [4] [5]
  What went well?       [________________]
  What went wrong?      [________________]
  Forgot anything?      [________________]

  [Submit AAR]
```

**Server action:** Reuse existing AAR creation action, just wire up the inline form.

### Files touched

- `components/dashboard/service-quality-widget.tsx` - add inline AAR form for recent events
- `app/(chef)/dashboard/_sections/business-section.tsx` - fetch events needing AAR, pass to widget

---

## WIDGET 20: QUICK-CREATE STRIP

**Not a collapsible widget.** This is a persistent strip in the dashboard header, always visible.

### Component

**Modify** `app/(chef)/dashboard/page.tsx` header section:

```typescript
{/* Quick-create strip - always visible, right below greeting */}
<div className="flex gap-2 flex-wrap">
  <a href="/events/new"
    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-full">
    + Event
  </a>
  <a href="/inquiries/new"
    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-full">
    + Inquiry
  </a>
  <button onClick={() => setExpenseOpen(true)}
    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-full">
    + Expense
  </button>
  <button onClick={() => setRecipeOpen(true)}
    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-full">
    + Recipe
  </button>
  <button onClick={() => setTodoFocused(true)}
    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-full">
    + Todo
  </button>
</div>
```

Expense and Recipe buttons open their respective dashboard widgets' create forms (scroll to widget + auto-expand). Todo focuses the todo input. Event and Inquiry are simple links.

### Files touched

- `app/(chef)/dashboard/page.tsx` - add quick-create strip to header

---

---

# UPDATED SUMMARIES (All Phases)

## ALL MIGRATIONS (Phases 1-3)

| #   | Migration                     | Tables/Columns                                                           |
| --- | ----------------------------- | ------------------------------------------------------------------------ |
| 1   | `_add_outdoor_flag.sql`       | `events.is_outdoor` (boolean, default false)                             |
| 2   | `_queue_snoozes.sql`          | NEW `queue_item_snoozes` table                                           |
| 3   | `_queue_skips.sql`            | NEW `queue_item_skips` table                                             |
| 4   | `_inquiry_first_response.sql` | `inquiries.first_response_at` (timestamptz)                              |
| 5   | `_event_last_followup.sql`    | `events.last_follow_up_at` (timestamptz)                                 |
| 6   | `_follow_up_outcomes.sql`     | `events.follow_up_responded/rebooked/review_left` (booleans)             |
| 7   | `_todo_enhancements.sql`      | `chef_todos.due_date`, `is_recurring`, `recurrence_interval`, `event_id` |

**No new tables needed for Phase 2-3 widgets.** They all use existing tables (messages, invoices, expenses, recipes, events, clients, shopping_list_items, prep_blocks, blocked_dates). The shopping list and blocked dates tables may need creation if they don't exist yet - verify before building.

## ALL NEW FILES (Phases 1-3)

| #   | File                                                 | Type             | Phase |
| --- | ---------------------------------------------------- | ---------------- | ----- |
| 1   | `components/dashboard/todays-schedule-widget.tsx`    | Client component | 1     |
| 2   | `components/queue/queue-item-inline-action.tsx`      | Client component | 1     |
| 3   | `components/queue/queue-batch-banner.tsx`            | Client component | 1     |
| 4   | `components/dashboard/follow-up-sequence-widget.tsx` | Client component | 1     |
| 5   | `lib/scheduling/capacity.ts`                         | Server utility   | 1     |
| 6   | `lib/inquiries/templates.ts`                         | Pure function    | 1     |
| 7   | `lib/dashboard/follow-up-templates.ts`               | Pure function    | 1     |
| 8   | `lib/dashboard/rebooking-score.ts`                   | Pure function    | 1     |
| 9   | `components/dashboard/live-inbox-widget.tsx`         | Client component | 2     |
| 10  | `components/dashboard/shopping-list-widget.tsx`      | Client component | 2     |
| 11  | `components/dashboard/quick-expense-widget.tsx`      | Client component | 2     |
| 12  | `components/dashboard/availability-widget.tsx`       | Client component | 2     |
| 13  | `components/dashboard/invoice-pulse-widget.tsx`      | Client component | 2     |
| 14  | `components/dashboard/client-lookup-widget.tsx`      | Client component | 3     |
| 15  | `components/dashboard/recipe-capture-widget.tsx`     | Client component | 3     |

## ALL NEW SERVER ACTIONS (Phases 1-3)

| #   | Function                       | File                              | Phase |
| --- | ------------------------------ | --------------------------------- | ----- |
| 1   | `getTodaysScheduleEnriched()`  | `lib/scheduling/actions.ts`       | 1     |
| 2   | `getDepartureEstimate()`       | `lib/scheduling/actions.ts`       | 1     |
| 3   | `getEventClientContext()`      | `lib/scheduling/actions.ts`       | 1     |
| 4   | `getPackingSummary()`          | `lib/scheduling/actions.ts`       | 1     |
| 5   | `getNextDayLookahead()`        | `lib/scheduling/actions.ts`       | 1     |
| 6   | `getRevenueProjection()`       | `lib/dashboard/actions.ts`        | 1     |
| 7   | `getComparativePeriods()`      | `lib/dashboard/actions.ts`        | 1     |
| 8   | `getMarginAlerts()`            | `lib/dashboard/actions.ts`        | 1     |
| 9   | `getCashFlowTiming()`          | `lib/dashboard/actions.ts`        | 1     |
| 10  | `getClientConcentration()`     | `lib/dashboard/actions.ts`        | 1     |
| 11  | `getSeasonalityIntelligence()` | `lib/dashboard/actions.ts`        | 1     |
| 12  | `getHourlyRateByEventType()`   | `lib/dashboard/actions.ts`        | 1     |
| 13  | `getFollowUpSequence()`        | `lib/dashboard/accountability.ts` | 1     |
| 14  | `getFollowUpOutcomes()`        | `lib/dashboard/accountability.ts` | 1     |
| 15  | `getResponseRateStats()`       | `lib/inquiries/actions.ts`        | 1     |
| 16  | `getResponseTimeConversion()`  | `lib/inquiries/actions.ts`        | 1     |
| 17  | `snoozeQueueItem()`            | `lib/queue/actions.ts`            | 1     |
| 18  | `skipQueueItem()`              | `lib/queue/actions.ts`            | 1     |
| 19  | `getQueueVelocity()`           | `lib/queue/actions.ts`            | 1     |
| 20  | `getInboxPreview()`            | `lib/messaging/actions.ts`        | 2     |
| 21  | `sendReply()`                  | `lib/messaging/actions.ts`        | 2     |
| 22  | `getActiveShoppingList()`      | `lib/scheduling/actions.ts`       | 2     |
| 23  | `toggleShoppingItem()`         | `lib/scheduling/actions.ts`       | 2     |
| 24  | `createQuickExpense()`         | `lib/expenses/actions.ts`         | 2     |
| 25  | `getRecentExpenses()`          | `lib/expenses/actions.ts`         | 2     |
| 26  | `getAvailabilityCalendar()`    | `lib/scheduling/actions.ts`       | 2     |
| 27  | `blockDate()`                  | `lib/scheduling/actions.ts`       | 2     |
| 28  | `getInvoicePulse()`            | `lib/invoices/actions.ts`         | 2     |
| 29  | `sendInvoiceReminder()`        | `lib/invoices/actions.ts`         | 2     |
| 30  | `searchClientsQuick()`         | `lib/clients/actions.ts`          | 3     |
| 31  | `createRecipeDraft()`          | `lib/recipes/actions.ts`          | 3     |
| 32  | `getUnloggedEventHours()`      | `lib/dashboard/actions.ts`        | 3     |

## COMPLETE IMPLEMENTATION ORDER (12 Weeks)

### Weeks 1-8: Phase 1 (original 10 widgets upgraded)

_(See Phase 1 section above for week-by-week breakdown)_

### Week 9: Live Inbox + Shopping List

1. `components/dashboard/live-inbox-widget.tsx` - NEW (real-time Supabase subscription)
2. `lib/messaging/actions.ts` - `getInboxPreview()`, `sendReply()`
3. `components/dashboard/shopping-list-widget.tsx` - NEW (mobile-optimized checklist)
4. `lib/scheduling/actions.ts` - `getActiveShoppingList()`, `toggleShoppingItem()`
5. Wire both into dashboard sections

### Week 10: Expense Capture + Availability

1. `components/dashboard/quick-expense-widget.tsx` - NEW (one-tap capture + receipt photo)
2. `lib/expenses/actions.ts` - `createQuickExpense()`, `getRecentExpenses()`
3. `components/dashboard/availability-widget.tsx` - NEW (mini calendar with status)
4. `lib/scheduling/actions.ts` - `getAvailabilityCalendar()`, `blockDate()`
5. Wire both into dashboard sections

### Week 11: Invoice Pulse + Client Lookup + Recipe Capture

1. `components/dashboard/invoice-pulse-widget.tsx` - NEW (funnel + reminders)
2. `lib/invoices/actions.ts` - `getInvoicePulse()`, `sendInvoiceReminder()`
3. `components/dashboard/client-lookup-widget.tsx` - NEW (instant search)
4. `lib/clients/actions.ts` - `searchClientsQuick()`
5. `components/dashboard/recipe-capture-widget.tsx` - NEW (brain dump to draft)
6. `lib/recipes/actions.ts` - `createRecipeDraft()`

### Week 12: Power Upgrades + Quick-Create Strip

1. Hours Log auto-detection - `getUnloggedEventHours()` + prompt UI
2. Service Quality inline AAR form
3. Quick-create strip in dashboard header
4. Widget ID registration for all new widgets
5. Full integration testing
6. Mobile testing (Shopping List + Expense Capture are mobile-critical)

---

## FINAL WIDGET COUNT

| Category               | Count  | Widgets                                                                                                                                     |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1 (upgraded)** | 10     | Today's Schedule, Priority Queue, Business Snapshot, Week Strip, Next Action, DOP Tasks, Response Time SLA, Follow-Ups, To Do, Prep Prompts |
| **Phase 2 (new)**      | 5      | Live Inbox, Shopping List, Quick Expense, Availability Check, Invoice Pulse                                                                 |
| **Phase 3 (power)**    | 5      | Client Lookup, Recipe Capture, Smart Hours (upgrade), Inline AAR (upgrade), Quick-Create Strip                                              |
| **Total**              | **20** | 15 new/upgraded components, 5 existing upgrades                                                                                             |

## The Goal State

Chef opens dashboard at 7am. Without leaving the page, they:

1. See today's event with countdown, client allergies, weather alert
2. Check their shopping list, mark items as they buy
3. Snap a receipt, log the expense
4. Reply to 2 client messages
5. Respond to an inquiry with a quick template
6. Send a follow-up to last week's client
7. Send an invoice reminder to a slow payer
8. Check if they're free on the 22nd for a new inquiry
9. Log a quick recipe draft before they forget
10. File a 3-minute AAR for last night's event
11. Mark 3 queue items as done without navigating anywhere
12. Check their revenue projection and cash flow
13. See they need a rest day and block Tuesday
14. Brain dump a to-do with a due date

**Zero page navigations. Everything from the dashboard.**
