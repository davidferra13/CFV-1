# Codex Build Spec: Events List Urgency & Next-Step Indicators

> **Scope:** Add "Next Step" column with urgency dot to the events list table.
> **Risk:** LOW. Pure display logic added to one file. No new queries, no new files, no schema changes.
> **Files to modify:** exactly 1 file (`app/(chef)/events/page.tsx`). Do NOT create new files.

---

## Problem

The events list page (`/events`) shows a table with status badges, but a chef with 5-10 active events cannot tell at a glance:

- Which event needs attention RIGHT NOW
- What the next action is for each event
- Whether the ball is in their court or the client's
- How long an event has been stuck in its current state

The inquiry pipeline already solved this exact problem with urgency dots and "Next:" text. The events list has nothing.

## Goal

Add a "Next Step" column to the events table that shows:

1. A colored urgency dot (green/amber/red) based on how long the event has been in its current status
2. Short text describing what needs to happen next
3. Who owns the next action (chef or client)

This is purely deterministic display logic. No AI, no new database queries, no new files.

---

## File: `app/(chef)/events/page.tsx`

### Step 1: Add two helper functions ABOVE the `EventsList` component (around line 108, before `async function EventsList`)

Insert these two pure functions. They use NO imports, NO database calls, NO external dependencies.

```typescript
// --- Event list urgency helpers (deterministic, no DB calls) ---

type NextStepInfo = {
  text: string
  owner: 'chef' | 'client' | 'done'
}

function getEventNextStep(status: string): NextStepInfo {
  switch (status) {
    case 'draft':
      return { text: 'Finalize and send proposal', owner: 'chef' }
    case 'proposed':
      return { text: 'Waiting for client response', owner: 'client' }
    case 'accepted':
      return { text: 'Collect deposit', owner: 'chef' }
    case 'paid':
      return { text: 'Confirm event details', owner: 'chef' }
    case 'confirmed':
      return { text: 'Prepare for event', owner: 'chef' }
    case 'in_progress':
      return { text: 'Complete event', owner: 'chef' }
    case 'completed':
      return { text: 'Done', owner: 'done' }
    case 'cancelled':
      return { text: 'Cancelled', owner: 'done' }
    default:
      return { text: '', owner: 'done' }
  }
}

function getEventStaleness(updatedAt: string | null, status: string): 'ok' | 'warm' | 'hot' {
  if (!updatedAt) return 'ok'
  if (status === 'completed' || status === 'cancelled') return 'ok'
  const hoursStale = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60)
  if (hoursStale >= 72) return 'hot'
  if (hoursStale >= 24) return 'warm'
  return 'ok'
}

// --- End urgency helpers ---
```

### Step 2: Add a "Next Step" TableHead to the table header

Find this exact line (around line 187):

```typescript
            <TableHead>Status</TableHead>
```

Insert this line IMMEDIATELY AFTER it:

```typescript
            <TableHead>Next Step</TableHead>
```

### Step 3: Add the Next Step TableCell to each row

Find this exact block (around lines 235-237):

```typescript
                <TableCell>
                  <EventStatusBadge status={event.status} />
                </TableCell>
```

Insert this block IMMEDIATELY AFTER the closing `</TableCell>` of the status cell:

```typescript
                <TableCell>
                  {(() => {
                    const next = getEventNextStep(event.status)
                    const staleness = getEventStaleness(event.updated_at, event.status)
                    if (next.owner === 'done') return null
                    const dotColor =
                      staleness === 'hot'
                        ? 'bg-red-500 animate-pulse'
                        : staleness === 'warm'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    return (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${dotColor}`}
                        />
                        <span className="text-xs text-stone-400">
                          {next.text}
                          {next.owner === 'client' && (
                            <span className="text-stone-600 ml-1">(client)</span>
                          )}
                        </span>
                      </div>
                    )
                  })()}
                </TableCell>
```

---

## Context: what the table header looks like BEFORE your change

```typescript
        <TableHeader>
          <TableRow>
            <TableHead className="w-14"></TableHead>
            <TableHead>Occasion</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Quoted Price</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
```

## Context: what the table header looks like AFTER your change

```typescript
        <TableHeader>
          <TableRow>
            <TableHead className="w-14"></TableHead>
            <TableHead>Occasion</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Next Step</TableHead>
            <TableHead>Quoted Price</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
```

## Context: what a table row looks like BEFORE your change (status + price cells)

```typescript
                <TableCell>
                  <EventStatusBadge status={event.status} />
                </TableCell>
                <TableCell>{formatCurrency(event.quoted_price_cents ?? 0)}</TableCell>
```

## Context: what a table row looks like AFTER your change

```typescript
                <TableCell>
                  <EventStatusBadge status={event.status} />
                </TableCell>
                <TableCell>
                  {(() => {
                    const next = getEventNextStep(event.status)
                    const staleness = getEventStaleness(event.updated_at, event.status)
                    if (next.owner === 'done') return null
                    const dotColor =
                      staleness === 'hot'
                        ? 'bg-red-500 animate-pulse'
                        : staleness === 'warm'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    return (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${dotColor}`}
                        />
                        <span className="text-xs text-stone-400">
                          {next.text}
                          {next.owner === 'client' && (
                            <span className="text-stone-600 ml-1">(client)</span>
                          )}
                        </span>
                      </div>
                    )
                  })()}
                </TableCell>
                <TableCell>{formatCurrency(event.quoted_price_cents ?? 0)}</TableCell>
```

---

## Why this works

1. `getEvents()` selects `*` from the events table (line 424 of `lib/events/actions.ts`), so `updated_at` is already available on every event object. No query changes needed.

2. Both helper functions are pure (no side effects, no imports, no DB calls). They take primitive values and return plain objects/strings. Zero risk of runtime errors.

3. The urgency thresholds match the inquiry pipeline pattern: green (< 24h), amber (24-72h), red/pulsing (72h+). The `animate-pulse` class is built into Tailwind and already used elsewhere in the app.

4. Terminal states (`completed`, `cancelled`) return `owner: 'done'` and render nothing in the Next Step cell, keeping the table clean.

5. The `(client)` suffix on client-owned steps tells the chef "this isn't on you" at a glance, reducing anxiety for the Tyler Nash profile.

---

## Verification

After making the change:

1. `npx tsc --noEmit --skipLibCheck` must pass
2. The change adds ~55 lines of code to one file
3. No new imports are needed
4. No new files are created
5. No existing code is modified (only additions)
6. The table should render with 8 columns instead of 7

---

## DO NOT (critical guardrails)

- Do NOT create any new files
- Do NOT modify any other files
- Do NOT modify `getEvents()` or any query logic
- Do NOT modify the `EventStatusBadge` component
- Do NOT add new imports to the file
- Do NOT change the order of existing columns (Next Step goes between Status and Quoted Price)
- Do NOT add em dashes anywhere
- Do NOT modify the `TodayEventsBanner` component
- Do NOT modify the hub sections or filter buttons
- Do NOT add any database queries or server actions
- Do NOT use `differenceInHours` from date-fns (use raw `Date.now()` math to avoid import)
