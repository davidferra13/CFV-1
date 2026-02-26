# Dashboard Command Center — Complete Overhaul

## What Changed

The chef dashboard was expanded from 9 data streams to 16, turning it from a "preparable work surface" into a true command center where a chef can see everything they need at a glance — without navigating anywhere.

## Why

The original dashboard answered: "What can I safely prepare right now?" That's a great core question, but a chef opening the app first thing in the morning also needs to know:

- What's my week look like?
- Does anyone owe me money?
- Are any quotes about to expire?
- Am I making more or less money than last month?
- How busy am I relative to last year?

All of this data already existed in the system but was buried in subpages. The dashboard should surface everything so the chef can act without hunting.

## New Data Streams Added

| #   | Data Stream              | Source                                      | What It Shows                                           |
| --- | ------------------------ | ------------------------------------------- | ------------------------------------------------------- |
| 1   | Week at a Glance         | `getWeekSchedule(0)`                        | 7-day strip with event/prep/free days, burnout warnings |
| 2   | Outstanding Payments     | `getOutstandingPayments()` (**new**)        | Events with unpaid balances, total outstanding          |
| 3   | Pending Quotes           | `getDashboardQuoteStats()` (**new**)        | Draft/sent counts, quotes expiring within 3 days        |
| 4   | Event Counts             | `getDashboardEventCounts()` (**new**)       | This month + YTD totals, completed counts               |
| 5   | Month-over-Month Revenue | `getMonthOverMonthRevenue()` (**new**)      | Current month revenue vs previous, profit, % change     |
| 6   | Monthly Expenses         | `getCurrentMonthExpenseSummary()` (**new**) | Business + total expenses for current month             |
| 7   | Loyalty Opportunities    | `getClientsApproachingRewards()`            | Clients close to earning rewards                        |

## Files Created

- **`lib/dashboard/actions.ts`** — 5 new server actions specifically designed for lightweight dashboard aggregation. Each independently authenticated, safe to call in `Promise.all`.
- **`components/dashboard/week-strip.tsx`** — Compact 7-day grid component with event/prep/free indicators, prep readiness dots, burnout warnings, and today highlight ring.

## Files Modified

- **`app/(chef)/dashboard/page.tsx`** — Complete rewrite. Same `safe()` wrapper pattern, now fetches 16 data streams in parallel.

## Dashboard Section Layout (top to bottom)

1. **Header** — Title + "Weekly View" + "New Event" buttons
2. **Today's Schedule** — Event timeline or calm empty state (unchanged)
3. **Week at a Glance** — NEW: 7-day strip with prep readiness and burnout warnings
4. **Needs Attention** — NEW: Consolidated alert row for inquiries, outstanding payments, pending quotes. Color-coded (amber/rose/blue). Only shows when actionable.
5. **Preparation Prompts** — Time-aware prep nudges (unchanged)
6. **Outreach Opportunities** — Milestones (existing) + loyalty approaching rewards (NEW)
7. **Work Surface** — Core preparable/blocked/fragile engine (unchanged)
8. **Events Needing Closure** — Post-event checklist tracking (unchanged)
9. **Service Quality** — AAR stats and trends (unchanged)
10. **Business Snapshot** — Enhanced 3×2 grid:
    - Revenue (all-time + this month + MoM % change)
    - Profit (this month with margin %)
    - Events (this month + YTD + completed)
    - Inquiries (pipeline + quote stats)
    - Clients (total + loyalty approaching count)
    - Expenses (this month business + total)

## Architecture Notes

### Graceful Degradation

Every data fetch is wrapped in the `safe()` helper. If any single stream fails (DB timeout, missing table, auth issue), the rest of the dashboard still renders. Failed sections degrade to their empty defaults — no blank page.

### Query Count

16 parallel data fetches, each independently authenticated. Internally these expand to ~24 Supabase queries total. All run concurrently via `Promise.all` against Supabase's connection pooler. Acceptable for a server-rendered dashboard page.

### No Client Components Added

The entire dashboard remains a server component. The `WeekStrip` is also a server component. No client-side JavaScript was added — the dashboard is fully server-rendered.

### What Was Intentionally NOT Added

- **Unread messages** — The messaging system is a communication LOG, not an inbox. "Unread" isn't meaningful for a log.
- **Document readiness per event** — Already covered by the prep prompts system, which generates category=documents prompts for missing documents.
- **Dashboard customization / widget reordering** — Over-engineering for V1.
- **Year-over-year comparisons** — Not enough historical data in V1 to be meaningful yet.

## How It Connects

The dashboard is the entry point for the chef portal. Every section links deeper:

- Week strip → `/schedule`
- Inquiry alert → `/inquiries?status=new`
- Outstanding payments → `/financials`
- Pending quotes → `/quotes`
- Outreach items → `/clients/{id}`
- Work items → `/events/{id}`
- Closure items → `/events/{id}`
- AAR stats → `/aar`
- Business cards → respective detail pages

The dashboard now answers 9 questions at a glance:

1. What's happening today?
2. What does my week look like?
3. What needs my immediate attention?
4. What can I prepare right now?
5. What events need closure?
6. How's my service quality trending?
7. Who should I reach out to?
8. How's the business doing this month?
9. Am I making money?

---

## Phase 2: Completeness Audit Fixes

After the initial overhaul, a thorough audit found 7 display-level gaps where data was either fetched but not rendered, or rendered without enough detail to be actionable. All 7 were fixed. Data stream count increased from 16 to 17.

### Gap 1: Tips Were Invisible

- **Problem**: `getTenantFinancialSummary()` returns `totalTipsCents`, but the revenue card only showed revenue + MoM change.
- **Fix**: Added a tips line to the Revenue card: `+ $X.XX in tips`. Only renders when tips > 0.

### Gap 2: Guest Counts Missing Everywhere

- **Problem**: Week strip showed event count but not how many people the chef is cooking for. Events card showed event count but not guest volume.
- **Fix (3 files)**:
  - `lib/scheduling/types.ts` — Added `guestCount: number` to `WeekDay.events[]` interface.
  - `lib/scheduling/actions.ts` — Passed `guestCount: e.guest_count` in `getWeekSchedule()` event mapping.
  - `components/dashboard/week-strip.tsx` — Now shows `{guestCount}g · {serveTime}` per event and total weekly guests in the header.
  - Dashboard Events card — Shows total guests this month + YTD.

### Gap 3: Outstanding Payments Not Itemized

- **Problem**: The rose alert said "3 events with outstanding balances — $1,500 total" but didn't name which events.
- **Fix**: Alert now lists up to 3 specific events with client name, occasion, and amount. Shows "+N more" if additional events exist.

### Gap 4: Expiring Quotes Were Anonymous

- **Problem**: Quote alert said "2 quotes expiring soon" without naming clients or amounts.
- **Fix**:
  - `lib/dashboard/actions.ts` — Enhanced `getDashboardQuoteStats()` to return `expiringDetails: { clientName, validUntil, amountCents }[]`.
  - Dashboard — Alert now shows client names and amounts for expiring quotes.

### Gap 5: Empty Today State Had No Forward Look

- **Problem**: When no event exists today, the dashboard showed "No dinners today" — no indication of when the next event is.
- **Fix**:
  - `lib/dashboard/actions.ts` — Added `getNextUpcomingEvent()` server action (queries events after today, non-cancelled/completed, limit 1).
  - Dashboard — Empty state now shows "Next up: [Client] — [Occasion] on [Date]" with a link to the event.

### Gap 6: Inquiry Alert Missed `awaiting_chef` Status

- **Problem**: Inquiry alert only counted `status = 'new'`, missing inquiries in `awaiting_chef` state that also need the chef's response.
- **Fix**: Changed from `newInquiryCount` to `needsResponseCount = inquiryStats.new + inquiryStats.awaiting_chef`.

### Gap 7: Events Card Too Vague

- **Problem**: Events card showed "X events this month" with no breakdown of what's upcoming vs. already completed.
- **Fix**: Card now shows upcoming this month, completed this month, and total YTD — all in a single card.

### Files Modified in Phase 2

| File                                  | Change                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `lib/scheduling/types.ts`             | Added `guestCount` to `WeekDay.events[]`                                                                   |
| `lib/scheduling/actions.ts`           | Passed `guestCount` in week schedule event mapping                                                         |
| `lib/dashboard/actions.ts`            | Enhanced quote stats (client names), event counts (guest totals, upcoming), added `getNextUpcomingEvent()` |
| `components/dashboard/week-strip.tsx` | Guest count per event + total weekly guests in header                                                      |
| `app/(chef)/dashboard/page.tsx`       | All 7 gap fixes applied                                                                                    |

### Architecture Impact

- Data stream count: 16 → 17 (added `getNextUpcomingEvent`)
- Query count: ~24 → ~26 Supabase queries (still all parallel via `Promise.all`)
- No client components added — still fully server-rendered
- Build passes clean with zero errors
