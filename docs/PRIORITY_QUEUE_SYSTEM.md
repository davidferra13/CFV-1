# Priority Queue System

**Date:** 2026-02-17
**Phase:** New Feature — Unified Priority Queue
**Status:** Implemented

## What Changed

Built a unified Priority Queue that replaces the dashboard's fragmented attention signals (3 alert cards, Work Surface, Events Needing Closure, Outreach Opportunities) with a single, scored, sorted list of every actionable item across the entire business.

### Why

The chef's dashboard previously had 4+ separate sections showing actionable items — each with its own visual treatment, data fetching, and no cross-domain ordering. A chef had to mentally scan multiple sections to figure out "what should I do next?" This created cognitive load instead of reducing it.

The Priority Queue answers one question: **"What's the single most important thing right now?"** If the queue is empty, the chef is caught up. Peace of mind.

### How It Connects to the System

The queue sits on top of existing domain data — it doesn't replace any business logic, it simply provides a unified scoring and rendering layer.

- **Absorbs the Work Surface** — The existing 17-stage `getPreparableActions` engine (stages 1-13) becomes one input provider among many. WorkItems are converted into scored QueueItems.
- **Absorbs Attention Needed** — Inquiry, quote, and outstanding payment alerts are now individual queue items with proper scoring instead of static alert cards.
- **Absorbs Events Needing Closure** — Post-event items (AAR, follow-up, review link, reset) are now individually scored by time since event completion.
- **Absorbs Outreach Opportunities** — Client milestones and dormant re-engagement are now low-priority queue items.

## Architecture

### Scoring Engine (`lib/queue/score.ts`)

Pure function. No database. Five weighted dimensions produce a 0-1000 score:

| Dimension     | Range | Description                                      |
| ------------- | ----- | ------------------------------------------------ |
| Time Pressure | 0-400 | How soon is the deadline? Overdue = max.         |
| Impact        | 0-250 | Business consequence of delay (set per provider) |
| Blocking      | 0/150 | Does this block downstream work?                 |
| Staleness     | 0-100 | How long has this sat untouched?                 |
| Revenue       | 0-100 | Money at stake (logarithmic)                     |

Score thresholds map to urgency tiers: critical (>=600), high (>=400), normal (>=200), low (<200).

### Domain Providers (`lib/queue/providers/*.ts`)

8 providers, each returning `QueueItem[]`:

| Provider        | Domain     | What it surfaces                                                |
| --------------- | ---------- | --------------------------------------------------------------- |
| `inquiry.ts`    | inquiry    | New/awaiting_chef inquiries, overdue follow-ups                 |
| `message.ts`    | message    | Outbound drafts/approved messages pending action                |
| `quote.ts`      | quote      | Draft quotes, expiring sent quotes, unlinked accepted quotes    |
| `event.ts`      | event      | WorkItems from stages 1-13 (converted from Work Surface)        |
| `financial.ts`  | financial  | Outstanding balances, missing receipts, unclosed financials     |
| `post-event.ts` | post_event | Unfiled AARs, unsent follow-ups/review links, incomplete resets |
| `client.ts`     | client     | Birthday/milestone outreach, dormant client re-engagement       |
| `culinary.ts`   | culinary   | Draft menus on upcoming events, seasonal windows ending         |

All providers run in parallel via `Promise.all`. Each handles its own errors gracefully (returns `[]` on failure).

### Queue Builder (`lib/queue/build.ts`)

1. Calls all 7 non-event providers in parallel
2. Converts Work Surface items synchronously (stages 1-13 only)
3. Merges, deduplicates by deterministic ID, sorts by score descending
4. Computes summary stats (counts by domain and urgency)

### Server Action (`lib/queue/actions.ts`)

Single entry point: `getPriorityQueue()`. Calls `requireChef()`, reuses `getDashboardWorkSurface()`, then builds the queue.

## UI Changes

### Dashboard (`app/(chef)/dashboard/page.tsx`)

**Before (9 sections):** Header, Today, Week, Attention Needed, Prep, Outreach, Work Surface, Closure, Business Snapshot

**After (7 sections):** Header, Today, **Next Action** (hero card), Week, **Priority Queue** (scored list), Prep, Service Quality, Business Snapshot

Removed sections absorbed into the queue: Attention Needed, Work Surface, Events Needing Closure, Outreach Opportunities.

### New Queue Page (`app/(chef)/queue/page.tsx`)

Full-page view with all items, summary stats bar, and domain/urgency filter pills. Accessible from dashboard header ("Full Queue" button) and sidebar nav.

### Navigation (`components/navigation/chef-nav.tsx`)

Added "Queue" (ListChecks icon) as standalone top-level nav item alongside Dashboard.

## Files Created

- `lib/queue/types.ts` — QueueItem, QueueDomain, QueueUrgency, ScoreInputs, PriorityQueue, QueueSummary
- `lib/queue/score.ts` — computeScore(), urgencyFromScore()
- `lib/queue/build.ts` — buildPriorityQueue()
- `lib/queue/actions.ts` — getPriorityQueue() server action
- `lib/queue/providers/inquiry.ts`
- `lib/queue/providers/message.ts`
- `lib/queue/providers/quote.ts`
- `lib/queue/providers/event.ts`
- `lib/queue/providers/financial.ts`
- `lib/queue/providers/post-event.ts`
- `lib/queue/providers/client.ts`
- `lib/queue/providers/culinary.ts`
- `components/queue/queue-icon.tsx` — Lucide icon name-to-component mapper
- `components/queue/queue-item-row.tsx` — Single queue row (urgency-colored, linked)
- `components/queue/next-action.tsx` — Hero card for #1 item
- `components/queue/queue-filters.tsx` — Domain and urgency filter pills
- `components/queue/queue-list.tsx` — Filterable list with optional limit
- `components/queue/queue-summary.tsx` — 4-card stats bar
- `components/queue/queue-empty.tsx` — "All caught up" state
- `app/(chef)/queue/page.tsx` — Dedicated queue page

## Files Modified

- `app/(chef)/dashboard/page.tsx` — Replaced scattered sections with unified queue
- `components/navigation/chef-nav.tsx` — Added Queue nav item

## Design Decisions

1. **No new database tables** — The queue is computed at render time from existing data. No persistence needed.
2. **Score engine is pure** — Zero side effects, fully testable without a database.
3. **Providers are independent** — Each can fail without crashing the queue.
4. **Work Surface stages 14-17 excluded** — Post-event items get better time-decay scoring from dedicated providers.
5. **Deduplication by deterministic ID** — `${domain}:${entityType}:${entityId}:${actionKey}` prevents duplicate items.
6. **Caps on low-priority items** — Max 10 missing receipts, 15 post-event items, 5 dormant clients to prevent queue flooding.
