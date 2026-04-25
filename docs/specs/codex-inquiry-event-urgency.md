# Codex Task: Event-Date Urgency Scoring for Inquiries

## Problem

The inquiry page already has "response time" urgency (how long the chef hasn't replied). But it is missing "event date" urgency (the dinner is TONIGHT vs next month). A last-minute chef loses jobs because same-day inquiries look identical to next-week inquiries. The system must surface time-to-event pressure visually.

## Context

The inquiry page is at `app/(chef)/inquiries/page.tsx`. It already has:

- `getWaitingUrgency(updatedAt)` returning `'ok' | 'warm' | 'hot'` based on response delay
- A colored dot next to each inquiry using `URGENCY_STYLES`

This task adds a SECOND, independent urgency signal: how close the event date is. They are separate concerns. Response urgency = "you haven't replied." Event urgency = "this dinner is soon."

## What to Build

2 new files, 1 small modification.

---

### Change 1: New pure function file

**Create:** `lib/inquiries/event-urgency.ts`

This is NOT a server action file. No `'use server'` directive. It is a pure utility.

```ts
// ---------------------------------------------------------------------------
// Event-Date Urgency Scoring
// Calculates how urgent an inquiry is based on proximity of the event date.
// Pure function, no DB access, no side effects.
// ---------------------------------------------------------------------------

export type EventUrgencyLevel = 'critical' | 'high' | 'normal' | 'none'

export interface EventUrgency {
  level: EventUrgencyLevel
  label: string
  daysUntil: number | null
}

/**
 * Score urgency based on how close the event date is to now.
 *
 * - critical: event is today or tomorrow (0-1 days)
 * - high: event is within 3 days (2-3 days)
 * - normal: event is within 7 days (4-7 days)
 * - none: event is more than 7 days away, or no date set
 *
 * @param eventDate - The confirmed event date (ISO string or null)
 * @param now - Current date (injectable for testing, defaults to new Date())
 */
export function scoreEventUrgency(
  eventDate: string | null | undefined,
  now: Date = new Date()
): EventUrgency {
  if (!eventDate) {
    return { level: 'none', label: '', daysUntil: null }
  }

  // Parse the date. Event dates are stored as YYYY-MM-DD (date only).
  // Append T00:00:00 to avoid timezone offset issues.
  const event = new Date(eventDate + 'T00:00:00')
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const diffMs = event.getTime() - today.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Past events are not urgent (they are overdue, a different concern)
  if (diffDays < 0) {
    return { level: 'none', label: '', daysUntil: diffDays }
  }

  if (diffDays <= 1) {
    const label = diffDays === 0 ? 'TODAY' : 'TOMORROW'
    return { level: 'critical', label, daysUntil: diffDays }
  }

  if (diffDays <= 3) {
    return { level: 'high', label: `${diffDays}d away`, daysUntil: diffDays }
  }

  if (diffDays <= 7) {
    return { level: 'normal', label: `${diffDays}d away`, daysUntil: diffDays }
  }

  return { level: 'none', label: '', daysUntil: diffDays }
}
```

---

### Change 2: New badge component

**Create:** `components/inquiries/event-urgency-badge.tsx`

```tsx
import type { EventUrgency } from '@/lib/inquiries/event-urgency'

const URGENCY_BADGE_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-300 animate-pulse',
  high: 'bg-amber-100 text-amber-800 border-amber-300',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
}

/**
 * Displays event-date urgency as a small inline badge.
 * Only renders when urgency level is critical, high, or normal.
 * Returns null for 'none' level (no date or far away).
 */
export function EventUrgencyBadge({ urgency }: { urgency: EventUrgency }) {
  if (urgency.level === 'none') return null

  const style = URGENCY_BADGE_STYLES[urgency.level] ?? ''

  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0 text-xxs font-semibold ${style}`}
      title={urgency.daysUntil !== null ? `Event is ${urgency.daysUntil} day(s) away` : undefined}
    >
      {urgency.label}
    </span>
  )
}
```

NOTE: This is a server component (no `'use client'`). It receives data as props. The `text-xxs` class is a custom Tailwind class already used in this project (see existing `Badge` usage in the inquiry page).

---

### Change 3: Wire into inquiry list page

**File:** `app/(chef)/inquiries/page.tsx`

**Step A:** Add imports near the top (after the existing imports around line 36):

```ts
import { scoreEventUrgency } from '@/lib/inquiries/event-urgency'
import { EventUrgencyBadge } from '@/components/inquiries/event-urgency-badge'
```

**Step B:** Inside the `InquiryList` function, in the `.map()` callback (around line 121-128), find this block:

```ts
const needsChefAction = CHEF_ACTION_STATUSES.has(inquiry.status)
const urgency = needsChefAction ? getWaitingUrgency(inquiry.updated_at) : null
```

Add ONE line right after it:

```ts
const eventUrgency = scoreEventUrgency(inquiry.confirmed_date)
```

**Step C:** In the JSX of the same map callback, find the badges row (around line 142-158). Look for this line:

```tsx
{
  readiness && <ReadinessScoreBadge score={readiness} />
}
```

Add ONE line right after it:

```tsx
<EventUrgencyBadge urgency={eventUrgency} />
```

**Step D:** Do the same for the `ResponseQueueList` function. Inside its `.map()` callback (around line 309), find:

```ts
        const urgencyColor =
```

Add ONE line right before it:

```ts
const eventUrgency = scoreEventUrgency(item.confirmedDate)
```

Then in the JSX of `ResponseQueueList`, find this line (around line 344):

```tsx
                  <span className={`text-xs font-medium ${readinessColor}`}>
```

Add ONE line right before it:

```tsx
<EventUrgencyBadge urgency={eventUrgency} />
```

---

## DO NOT

- Do NOT modify the existing `getWaitingUrgency` function or its usage
- Do NOT modify the existing `URGENCY_STYLES` or `URGENCY_LABELS` constants
- Do NOT add `'use server'` to the event-urgency.ts file (it is a pure utility)
- Do NOT add `'use client'` to the badge component (it is a server component)
- Do NOT change the tab structure, layout, or any other part of the inquiry page
- Do NOT create any database migrations
- Do NOT add any new dependencies or npm packages
- Do NOT rename or move any existing files

## Verification

After building, verify:

1. `npx tsc --noEmit --skipLibCheck` passes (no type errors)
2. `scoreEventUrgency('2026-04-24')` returns `{ level: 'critical', label: 'TODAY', daysUntil: 0 }` when run on April 24, 2026
3. `scoreEventUrgency(null)` returns `{ level: 'none', label: '', daysUntil: null }`
4. `scoreEventUrgency('2026-05-15')` returns `{ level: 'none', label: '', daysUntil: 21 }` when run on April 24, 2026
5. The `EventUrgencyBadge` renders in the inquiry list next to existing badges
6. Inquiries without a `confirmed_date` show no event urgency badge
7. No em dashes in any file
