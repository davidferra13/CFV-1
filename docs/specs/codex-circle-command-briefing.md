# Codex Build Spec: Circle Command Briefing

> **Purpose:** Add a daily briefing section to the top of the circles page that gives the chef a 5-second snapshot: what needs action, what's coming up, what's going cold. Replaces the need to scan every row.
>
> **Complexity:** LOW (one new component, minor page change, no backend changes)
>
> **Risk:** LOW (purely additive UI component, no existing behavior modified)
>
> **Depends on:** Spec 1 (Circle Triage Engine) must be completed first. This spec uses the `urgency_score`, `response_gap_hours`, `estimated_value_cents`, and `days_in_stage` fields added by that spec.

---

## STRICT RULES FOR THIS TASK

1. **DO NOT create any new database tables or migrations.**
2. **DO NOT modify any server actions or backend files.**
3. **DO NOT delete any existing code.**
4. **DO NOT modify any files not listed in the "Files to Modify" section.**
5. **DO NOT use em dashes anywhere.** Use commas, semicolons, or separate sentences.
6. **DO NOT import from `@/lib/cil/`** or any AI/Ollama modules.
7. **Test your changes by running `npx tsc --noEmit --skipLibCheck` before committing.** Fix any type errors.
8. **Follow the existing dark theme.** All colors use stone-_, brand-_, emerald-_, amber-_, red-\* palettes. No new color palettes.

---

## What to Build

### 1. Create the Command Briefing component

**New file:** `components/hub/circles-command-briefing.tsx`

This is a client component that receives the circles array and renders a compact briefing card. Create this file with the following content:

```tsx
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { ChefCircleSummary } from '@/lib/hub/chef-circle-actions'

interface CommandBriefingProps {
  circles: ChefCircleSummary[]
}

export function CirclesCommandBriefing({ circles }: CommandBriefingProps) {
  const briefing = useMemo(() => computeBriefing(circles), [circles])

  // Don't render if there's nothing actionable
  if (
    briefing.urgent.length === 0 &&
    briefing.upcoming.length === 0 &&
    briefing.goingCold.length === 0
  ) {
    return null
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-5">
      {/* Header row with key stats */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-200">Command Briefing</h2>
        <div className="flex items-center gap-4 text-xs text-stone-400">
          {briefing.totalUnread > 0 && (
            <span>
              <span className="font-bold text-brand-400">{briefing.totalUnread}</span> unread
            </span>
          )}
          {briefing.totalValueCents > 0 && (
            <span>
              <span className="font-bold text-emerald-400">
                ${Math.round(briefing.totalValueCents / 100).toLocaleString()}
              </span>{' '}
              in pipeline
            </span>
          )}
          <span>
            <span className="font-bold text-stone-300">{briefing.activeCount}</span> active
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Urgent: needs reply NOW */}
        <BriefingColumn
          title="Needs Reply"
          accent="red"
          items={briefing.urgent}
          emptyText="All caught up"
        />

        {/* Upcoming: events in next 7 days */}
        <BriefingColumn
          title="This Week"
          accent="amber"
          items={briefing.upcoming}
          emptyText="No events this week"
        />

        {/* Going cold: stale circles */}
        <BriefingColumn
          title="Going Cold"
          accent="blue"
          items={briefing.goingCold}
          emptyText="Nothing going cold"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Briefing column
// ---------------------------------------------------------------------------

const accentStyles = {
  red: {
    dot: 'bg-red-400',
    title: 'text-red-300',
    border: 'border-red-500/20',
    bg: 'bg-red-500/5',
    badge: 'bg-red-500/20 text-red-300',
  },
  amber: {
    dot: 'bg-amber-400',
    title: 'text-amber-300',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    badge: 'bg-amber-500/20 text-amber-300',
  },
  blue: {
    dot: 'bg-blue-400',
    title: 'text-blue-300',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
    badge: 'bg-blue-500/20 text-blue-300',
  },
}

interface BriefingItem {
  id: string
  label: string
  sublabel: string
  emoji: string | null
}

function BriefingColumn({
  title,
  accent,
  items,
  emptyText,
}: {
  title: string
  accent: 'red' | 'amber' | 'blue'
  items: BriefingItem[]
  emptyText: string
}) {
  const styles = accentStyles[accent]

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg} p-3`}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`inline-block h-2 w-2 rounded-full ${styles.dot}`} />
        <span className={`text-xs font-semibold ${styles.title}`}>{title}</span>
        {items.length > 0 && (
          <span
            className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${styles.badge}`}
          >
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-stone-500">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 4).map((item) => (
            <Link
              key={item.id}
              href={`/circles/${item.id}`}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-stone-700/50"
            >
              <span className="flex-shrink-0">{item.emoji || '💬'}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-stone-200">{item.label}</div>
                <div className="truncate text-stone-500">{item.sublabel}</div>
              </div>
            </Link>
          ))}
          {items.length > 4 && (
            <p className="px-2 text-[10px] text-stone-500">+{items.length - 4} more</p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Briefing computation (pure function, no API calls)
// ---------------------------------------------------------------------------

interface Briefing {
  urgent: BriefingItem[]
  upcoming: BriefingItem[]
  goingCold: BriefingItem[]
  totalUnread: number
  totalValueCents: number
  activeCount: number
}

const ACTIVE_STAGES = new Set([
  'new_inquiry',
  'awaiting_client',
  'awaiting_chef',
  'quoted',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
])

function computeBriefing(circles: ChefCircleSummary[]): Briefing {
  const urgent: BriefingItem[] = []
  const upcoming: BriefingItem[] = []
  const goingCold: BriefingItem[] = []
  let totalUnread = 0
  let totalValueCents = 0

  const active = circles.filter((c) => ACTIVE_STAGES.has(c.pipeline_stage))

  for (const c of active) {
    totalUnread += c.unread_count
    totalValueCents += c.estimated_value_cents ?? 0

    const label = c.client_name || c.name

    // URGENT: response gap >= 24h OR urgency_score >= 60
    if ((c.response_gap_hours != null && c.response_gap_hours >= 24) || c.urgency_score >= 60) {
      const reason =
        c.response_gap_hours != null && c.response_gap_hours >= 24
          ? `Waiting ${Math.round(c.response_gap_hours / 24)}d for reply`
          : c.attention_reason || 'High urgency'
      urgent.push({ id: c.id, label, sublabel: reason, emoji: c.emoji })
    }

    // UPCOMING: event in next 7 days
    if (c.event_date) {
      const daysUntil = Math.ceil((new Date(c.event_date).getTime() - Date.now()) / 86400000)
      if (daysUntil >= 0 && daysUntil <= 7) {
        const when =
          daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`
        const value = c.estimated_value_cents
          ? ` ($${Math.round(c.estimated_value_cents / 100).toLocaleString()})`
          : ''
        upcoming.push({ id: c.id, label, sublabel: `${when}${value}`, emoji: c.emoji })
      }
    }

    // GOING COLD: quoted or accepted for 7+ days with no recent messages
    if (['quoted', 'accepted', 'new_inquiry'].includes(c.pipeline_stage) && c.days_in_stage >= 7) {
      const stage =
        c.pipeline_stage === 'new_inquiry'
          ? 'New'
          : c.pipeline_stage === 'quoted'
            ? 'Quoted'
            : 'Accepted'
      goingCold.push({
        id: c.id,
        label,
        sublabel: `${stage} for ${c.days_in_stage}d, no movement`,
        emoji: c.emoji,
      })
    }
  }

  // Sort: urgent by urgency_score desc, upcoming by event date asc, cold by days_in_stage desc
  urgent.sort((a, b) => {
    const aCircle = circles.find((c) => c.id === a.id)
    const bCircle = circles.find((c) => c.id === b.id)
    return (bCircle?.urgency_score ?? 0) - (aCircle?.urgency_score ?? 0)
  })

  upcoming.sort((a, b) => {
    const aCircle = circles.find((c) => c.id === a.id)
    const bCircle = circles.find((c) => c.id === b.id)
    const aDate = aCircle?.event_date ? new Date(aCircle.event_date).getTime() : Infinity
    const bDate = bCircle?.event_date ? new Date(bCircle.event_date).getTime() : Infinity
    return aDate - bDate
  })

  goingCold.sort((a, b) => {
    const aCircle = circles.find((c) => c.id === a.id)
    const bCircle = circles.find((c) => c.id === b.id)
    return (bCircle?.days_in_stage ?? 0) - (aCircle?.days_in_stage ?? 0)
  })

  return {
    urgent,
    upcoming,
    goingCold,
    totalUnread,
    totalValueCents,
    activeCount: active.length,
  }
}
```

### 2. Add the Command Briefing to the circles page

**File:** `app/(chef)/circles/page.tsx`

Add the import at the top of the file (after the existing imports):

```typescript
import { CirclesCommandBriefing } from '@/components/hub/circles-command-briefing'
```

Add the component in the JSX, BETWEEN the header `<div>` and the `<CirclesPipelineHeader>` (between lines 22 and 23):

```tsx
<CirclesCommandBriefing circles={circles} />
```

The final JSX should look like:

```tsx
return (
  <div className="mx-auto max-w-4xl space-y-6 p-6">
    <div>
      <h1 className="text-2xl font-bold text-stone-100">Circles</h1>
      <p className="mt-1 text-sm text-stone-400">
        Your client pipeline, dinner circles, and community groups
      </p>
    </div>

    <CirclesCommandBriefing circles={circles} />

    <CirclesPipelineHeader circles={circles} />

    <CirclesPageTabs
      circles={circles}
      feedItems={feedResult.items}
      feedCursor={feedResult.nextCursor}
    />
  </div>
)
```

---

## Files to Modify (Complete List)

| File                                          | Change Type                                    |
| --------------------------------------------- | ---------------------------------------------- |
| `components/hub/circles-command-briefing.tsx` | **NEW FILE** - Command Briefing component      |
| `app/(chef)/circles/page.tsx`                 | Add import + render `<CirclesCommandBriefing>` |

**NO OTHER FILES should be modified.**

---

## Done Criteria

1. `npx tsc --noEmit --skipLibCheck` passes with zero errors
2. New file `components/hub/circles-command-briefing.tsx` exists
3. Circles page renders the Command Briefing card above the pipeline header
4. Briefing shows three columns: "Needs Reply" (red), "This Week" (amber), "Going Cold" (blue)
5. Each column shows up to 4 circle items with emoji, name, and reason
6. Header row shows total unread count, pipeline value, and active count
7. Briefing hides entirely when there's nothing actionable (no urgent, no upcoming, no cold)
8. Each circle item links to `/circles/[id]`
9. No em dashes in any file
10. No existing functionality broken
11. Component follows dark theme (stone-_, brand-_, emerald-_, amber-_, red-\* palettes only)
