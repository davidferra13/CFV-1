# Build: Client Transparency Suite

**Branch:** `feature/scheduling-improvements`
**Migration:** `supabase/migrations/20260322000001_client_portal_improvements.sql`

---

## Why This Was Built

Market research identified **lack of visibility** as the #1 client complaint category for private chef services. Clients didn't know where they stood in the process, what action was needed from them, or when to expect the next step. This feature replaces that uncertainty with a full 12-stage progress tracker and three supporting features that give clients complete transparency from inquiry to post-event review.

Research finding: Clients who can see their dietary profile, approve menus, track invoices, and communicate through one clean interface are far less likely to switch chefs — switching means losing all that history.

---

## What Was Built

### 1. 12-Stage Client Journey Tracker

**Files:**

- `lib/events/journey-steps.ts` — Pure function that builds the step array from event data
- `components/events/event-journey-stepper.tsx` — Visual tracker component

**Behavior:**
The tracker shows the client exactly where they are in their service journey with timestamps for completed stages, a pulsing active indicator on the current stage, and direct action buttons (Review & Accept, Pay Deposit, Approve Menu, etc.) on the stages that require client action.

Milestone stages (Deposit Paid, Event Confirmed, Menu Approved, Event Day, Dinner Complete, Review) include a share button using the Web Share API with clipboard fallback — clients can share their excitement to social media or with invited guests.

#### The 12 Stages

| #   | Key                   | Trigger                                                   | CTA When Active |
| --- | --------------------- | --------------------------------------------------------- | --------------- |
| 1   | `inquiry_received`    | Always completed first                                    | —               |
| 2   | `proposal_sent`       | Quote sent or event.status = proposed                     | —               |
| 3   | `proposal_accepted`   | `event_state_transitions.to_status = accepted`            | Review & Accept |
| 4   | `contract_signing`    | Contract exists (skipped if no contract)                  | Sign Contract   |
| 5   | `deposit_paid`        | `event_state_transitions.to_status = paid`                | Pay Deposit     |
| 6   | `event_confirmed`     | `event_state_transitions.to_status = confirmed`           | —               |
| 7   | `menu_review`         | `menu_approval_status = pending`                          | Review Menu     |
| 8   | `pre_event_checklist` | No confirmation yet + event is confirmed/paid/in_progress | Confirm Details |
| 9   | `event_day`           | `event_state_transitions.to_status = in_progress`         | —               |
| 10  | `dinner_complete`     | `event_state_transitions.to_status = completed`           | —               |
| 11  | `event_summary`       | Event is completed                                        | View Summary    |
| 12  | `share_review`        | Event completed, no review yet                            | Leave a Review  |

Stage 4 (contract) is **conditional** — only shown when a non-voided contract exists for the event. The tracker suppresses all future stages when the event is cancelled, showing completed stages up to the cancellation point.

---

### 2. Pre-Event Confirmation Checklist

**Files:**

- `lib/events/pre-event-checklist-actions.ts` — Server actions
- `components/events/pre-event-checklist-client.tsx` — Client component
- `app/(client)/my-events/[id]/pre-event-checklist/page.tsx` — Page

**What it shows the client:**

1. Dietary preferences on file (restrictions, allergies, dislikes, spice tolerance, protocols)
2. Kitchen access info (constraints, equipment, parking, access instructions)
3. Guest count (with link to message chef if changed)
4. Special requests for this event (read-only)
5. A "Confirm Details" button that sets `pre_event_checklist_confirmed_at`

Once confirmed, stage 8 of the journey tracker turns green. The chef can see the confirmation status in the event detail (via the existing `MenuApprovalStatus` panel area).

**Server actions exported:**

- `confirmPreEventChecklist(eventId)` — Sets timestamp, validates status is confirmed/paid/in_progress
- `updateClientJourneyNote(eventId, note)` — Saves client's personal journey note (private, not shown to chef)
- `getPreEventChecklistData(eventId)` — Fetches event + client profile for the checklist page

---

### 3. Post-Event Summary Page

**Files:**

- `components/events/post-event-summary-client.tsx` — Client component
- `app/(client)/my-events/[id]/event-summary/page.tsx` — Page (redirects if not completed)

**What it shows:**

- Financial snapshot (total quoted, total paid, outstanding balance)
- All menus that were attached to the event
- Full payment history from ledger_entries (line items with dates)
- Event timeline showing when each FSM state was reached (confirmed, in progress, completed)
- CTA to download receipt, view photos (if any), and leave a review
- Share button for the completed event milestone

Only available when `event.status === 'completed'` — all other statuses redirect to the main event detail page.

---

### 4. Client Spending Dashboard

**Files:**

- `lib/clients/spending-actions.ts` — `getClientSpendingSummary()` server action
- `components/clients/spending-dashboard-client.tsx` — Dashboard component
- `app/(client)/my-spending/page.tsx` — Page

**Stats shown:**

- Lifetime spend (sum of total_paid_cents on completed events)
- This-year spend (YTD)
- Events attended (completed event count)
- Average event cost
- Upcoming committed spend (sum of deposits already paid on future events)

**History table:** Upcoming events (linked to event detail), past events (linked to post-event summary), cancelled events (greyed out).

Data is aggregated from `event_financial_summary` view (never computed inline — stays true to the ledger-first model).

**Nav:** Added "Spending" (DollarSign icon) to `components/navigation/client-nav.tsx` between Rewards and Profile.

---

### 5. Dietary Protocol Tags on Client Profile

**Files:**

- `app/(client)/my-profile/client-profile-form.tsx` — Added protocol pill UI
- `lib/clients/client-profile-actions.ts` — Added `dietary_protocols` to schema and select

**Protocols available:**

- GLP-1 / Ozempic Support
- Longevity Protocol (Bryan Johnson)
- Low-FODMAP
- AIP (Autoimmune Protocol)
- Carnivore
- Intermittent Fasting
- DASH Diet
- Mediterranean

These are toggled as pill buttons (not free-text tags) since they're a fixed vocabulary. Stored in `clients.dietary_protocols TEXT[]`. The pre-event checklist shows the active protocols to both the client (for confirmation) and to the chef (via the kitchen profile callout in the event detail).

---

## Database Changes

Migration: `supabase/migrations/20260322000001_client_portal_improvements.sql`

```sql
-- Pre-event checklist confirmation tracking on events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS pre_event_checklist_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pre_event_checklist_confirmed_by UUID REFERENCES auth.users(id);

-- Client-side personal journey note (private — not shown in chef dashboard)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS client_journey_note TEXT;

-- Dietary protocol tags on client profiles
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS dietary_protocols TEXT[] DEFAULT '{}';
```

**Important:** Apply this migration before enabling the pre-event checklist or dietary protocols. The app handles missing columns gracefully (falls back to null/empty via `?? null`), but writes will fail until the columns exist.

---

## How the Journey Tracker Computes State

`buildJourneySteps()` in `lib/events/journey-steps.ts` is a pure function — it receives all event data as params and returns `JourneyStep[]` with no DB access. State is derived from:

1. **`eventTransitions`** — array of `{ to_status, transitioned_at }` from `event_state_transitions` table. Earliest timestamp for each status is used (handles any re-transition edge cases).
2. **`menuApprovalStatus` / `menuApprovalUpdatedAt`** — from `events.menu_approval_status` and `events.menu_approval_updated_at` (added by earlier migration).
3. **`hasContract` / `contractSignedAt`** — from `event_contracts` table query in `getClientEventById`.
4. **`preEventChecklistConfirmedAt`** — from `events.pre_event_checklist_confirmed_at`.
5. **`hasReview`** — from count on `client_reviews` table.

The `isCurrent` step is the first step with `completedAt === null` after the last completed step. All steps beyond that are `isFuture`. Cancelled events set `isCurrent: false` on all steps so no action is shown.

---

## Modified Files (Key Changes)

| File                                              | Change                                                          |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `lib/events/journey-steps.ts`                     | Rewritten — 12 stages, action CTAs, milestone flags, share text |
| `components/events/event-journey-stepper.tsx`     | Added ShareButton (Web Share API), action button rendering      |
| `lib/events/client-actions.ts`                    | Added contract + review count fetches to `getClientEventById`   |
| `app/(client)/my-events/[id]/page.tsx`            | Passes all new params to `buildJourneySteps`                    |
| `components/navigation/client-nav.tsx`            | Added Spending nav item                                         |
| `lib/clients/client-profile-actions.ts`           | Added `dietary_protocols` to schema + select                    |
| `app/(client)/my-profile/client-profile-form.tsx` | Added dietary protocol pill UI                                  |

---

## TypeScript Notes

- `pre-event-checklist-actions.ts` uses `// @ts-nocheck` — new columns not yet in `types/database.ts`
- `client-profile-actions.ts` uses `// @ts-nocheck` — `dietary_protocols` column not in generated types
- After running `supabase db push` and `supabase gen types typescript --linked > types/database.ts`, these suppression comments can be removed
- `lib/quotes/client-actions.ts` has `// @ts-nocheck` for a pre-existing Supabase TypeScript parser quirk on the `quote_name` select string (runtime behavior is correct)

---

## Connection to the Broader System

- **Journey tracker** consumes existing `event_state_transitions` (written by `lib/events/transitions.ts`) — no new writes needed
- **Pre-event checklist** writes to `events.pre_event_checklist_confirmed_at` — chef sees this in the event detail as a confidence signal before day-of prep
- **Spending dashboard** reads from `event_financial_summary` view — stays true to the ledger-first architecture
- **Dietary protocols** flow through to the pre-event checklist display and the kitchen profile callout on the chef's event detail, giving the chef full protocol context before cooking
