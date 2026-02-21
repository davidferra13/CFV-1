# Scheduling Improvements — Feature Branch `fix/grade-improvements`

> **Branch:** `fix/grade-improvements`
> **Build status:** ✅ `npx next build` exits 0 — 341 App Router pages + 2 Pages Router routes
> **TypeScript:** ✅ `npx tsc --noEmit --skipLibCheck` exits 0

---

## Overview

This document covers all scheduling improvements implemented in this branch, plus the build-stability fixes required to get the project back to a clean exit-0 build. The improvements stem from a competitive analysis against 10 top scheduling platforms (Calendly, Cal.com, Google Calendar, Motion, Morgen, Zoho, Square Appointments, Outlook, Doodle, YouCanBookMe) that graded ChefFlow at **C+ overall** — strong chef-side operational tooling but weak on anything client-facing or collaborative.

---

## Phase 1 — Quick Wins

### 1.1 — Double-Booking Conflict Warning

**Problem:** A chef could create a second event on a date that already had a confirmed event or manual block with no warning.

**Solution:** Added `checkDateConflicts(tenantId, date)` to `lib/availability/actions.ts`. The function queries both `chef_availability_blocks` and non-cancelled `events` for the target date and returns a structured result:

```typescript
{
  hasManualBlock: boolean
  existingEvents: { id: string; title: string; status: string }[]
  isHardBlocked: boolean
  warnings: string[]
}
```

`createEvent()` in `lib/events/actions.ts` now calls this check and returns `warnings[]` alongside the event result (soft warning — does not block creation). `event-form.tsx` surfaces an inline banner: *"Another event exists on [date] — confirm to continue."*

**Files changed:** `lib/availability/actions.ts`, `lib/events/actions.ts`, `components/events/event-form.tsx`

---

### 1.2 — Prep Block Cascade on Reschedule

**Problem:** When an event was drag-dropped to a new date, system-generated prep blocks on the old date were orphaned — they stayed on the old date with no connection to the rescheduled event.

**Solution:** `rescheduleEvent()` in `lib/scheduling/actions.ts` now:
1. Deletes all `event_prep_blocks` rows where `event_id = eventId AND is_system_generated = true`
2. Calls `autoSuggestEventBlocks(eventId)` to generate fresh suggestions for the new date
3. Returns `{ clearedBlocks: N, newSuggestions: [] }` in the result

`calendar-view.tsx` reads `newSuggestions` from the result and shows a toast: *"Event rescheduled — [N] prep blocks cleared. Tap to review suggestions."*

**Files changed:** `lib/scheduling/actions.ts`, `components/scheduling/calendar-view.tsx`

---

### 1.3 — Saved Calendar Filter Views ("Calendar Sets")

**Problem:** Switching between viewing modes (events only vs. full ops view vs. planning view) required toggling 8–13 individual filter checkboxes each time.

**Solution:** Added named, one-click filter presets modeled on Morgen's Calendar Sets pattern.

- `lib/calendar/constants.ts` — Added `CalendarSavedView` type and 4 built-in presets: Full View, Events Only, Ops View, Planning View
- `lib/calendar/view-actions.ts` — Server actions `saveCalendarView()` and `getCalendarViews()` that read/write to the `calendar_saved_views` key on the existing `chef_preferences` JSONB column (no migration needed)
- `components/calendar/calendar-filter-panel.tsx` — Added a "View:" dropdown at the top of the filter panel. Selecting a preset applies its filters instantly. "Save current as..." lets chefs create custom named views.

**Files changed:** `lib/calendar/constants.ts`, `lib/calendar/view-actions.ts` (new), `components/calendar/calendar-filter-panel.tsx`

---

### 1.4 — PWA (Progressive Web App / Installable)

**Problem:** `@ducanh2912/next-pwa` was installed but the config had `disable: true`, meaning no service worker was registered and the app was not installable.

**Solution:** Restored `disable: process.env.NODE_ENV === 'development'` in `next.config.js` — PWA is active in production, disabled in development (avoids RSC/Windows path conflicts during dev). Created `public/offline.html` as a branded fallback page shown when the device is offline.

**Files changed:** `next.config.js`, `public/offline.html` (new)

> **Note:** Disabling the PWA was also the root cause of a `pages-manifest.json` build failure. The PWA plugin's double-webpack-pass is what generates the manifest. Restoring this config fixed a cascade of `PageNotFoundError` failures during the "Collecting page data" build phase.

---

## Phase 2 — Intelligence Layer

### 2.1 — Natural Language Event Entry

**Problem:** All event creation was form-based. Chefs couldn't quickly create an event from a free-form description like *"Dinner for the Hendersons, 8 guests, Saturday the 28th at 7pm, $2,800."*

**Solution:** New NL parsing pipeline using the existing `parseWithAI<T>()` infrastructure (`lib/ai/parse.ts`, Gemini 2.5 Flash).

- `lib/events/parse-event-from-text.ts` — New parser using `parseWithAI()` with a `z.object()` schema that extracts: `client_name`, `event_date`, `serve_time`, `guest_count`, `occasion`, `location_description`, `quoted_price_cents`, `deposit_amount_cents`, `notes`, `confidence_notes`. Price strings like `"$2,800"` are parsed to cents (280000).
- `components/events/event-nl-form.tsx` — Textarea + parsed preview with inline edits. Uncertain fields highlighted. "Create Event" button calls the existing `createEvent()` server action unchanged.
- `app/(chef)/events/new/from-text/page.tsx` — New route at `/events/new/from-text`.
- `app/(chef)/events/new/page.tsx` — Added "Quick entry (tell me about it)" link to the new route.

AI output is never saved until the chef explicitly confirms — consistent with the AI Policy (docs/AI_POLICY.md).

**Files changed:** `lib/events/parse-event-from-text.ts` (new), `components/events/event-nl-form.tsx` (new), `app/(chef)/events/new/from-text/page.tsx` (new), `app/(chef)/events/new/page.tsx`

---

### 2.2 — Prep Block Auto-Placement on Confirmation

**Problem:** `autoSuggestEventBlocks()` existed and generated suggestions, but they were passive — the chef had to manually accept them. On event confirmation, nothing happened automatically.

**Solution:**
- `lib/scheduling/prep-block-actions.ts` — Added `autoPlacePrepBlocks(eventId)` that calls `autoSuggestEventBlocks()` and immediately passes results to `bulkCreatePrepBlocks()`. Skips if blocks already exist (idempotent).
- `lib/events/transitions.ts` — Hooks into the `→ confirmed` transition: after state change succeeds, fires `autoPlacePrepBlocks(eventId)` (non-blocking, best-effort).
- `app/(chef)/events/[id]/page.tsx` — On confirmed events with zero prep blocks, shows banner: *"No prep blocks scheduled — [Auto-schedule] [Dismiss]."*

**Files changed:** `lib/scheduling/prep-block-actions.ts`, `lib/events/transitions.ts`, `app/(chef)/events/[id]/page.tsx`

---

## Phase 3 — Scheduling Rules Engine

### 3.1 — Chef Availability Rules

**Problem:** Chefs had no UI to express business rules like "I don't work Sundays," "max 3 events per week," or "require 2 days between events." These rules existed in code comments/docs only.

**Migration applied (additive — no data loss risk):**
```sql
CREATE TABLE chef_scheduling_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  chef_id UUID NOT NULL UNIQUE,
  no_sundays BOOLEAN NOT NULL DEFAULT false,
  no_mondays BOOLEAN NOT NULL DEFAULT false,
  blocked_days_of_week INTEGER[] DEFAULT '{}',  -- 0=Sun, 6=Sat
  max_events_per_week INTEGER,
  max_events_per_month INTEGER,
  min_buffer_days INTEGER NOT NULL DEFAULT 0,
  min_lead_days INTEGER NOT NULL DEFAULT 0,
  preferred_days_of_week INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**New files:**
- `lib/availability/rules-actions.ts` — `getSchedulingRules()`, `upsertSchedulingRules()`, `validateDateAgainstRules(tenantId, date)` returning `{ allowed, blockers[], warnings[] }`
- `components/settings/scheduling-rules-form.tsx` — Day-of-week toggles, number inputs for max/buffer/lead

**Modified files:**
- `app/(chef)/settings/page.tsx` — Added "Availability Rules" section
- `lib/events/actions.ts` — `createEvent()` now calls `validateDateAgainstRules()` and appends blockers/warnings to response
- `components/events/event-form.tsx` — Displays rule violations alongside conflict warnings from Phase 1.1

---

## Phase 4 — Integrations

### 4.1 — Google Calendar Sync

**Problem:** `lib/scheduling/calendar-sync.ts` had been written but deferred — it referenced a non-existent `chef_settings` table instead of `google_connections`, had `@ts-nocheck`, and was not called from anywhere.

**Migration applied (additive):**
```sql
ALTER TABLE events
  ADD COLUMN google_calendar_event_id TEXT,
  ADD COLUMN google_calendar_synced_at TIMESTAMPTZ;
```

**Solution:**
- `lib/scheduling/calendar-sync.ts` — Removed `@ts-nocheck`. Replaced all `chef_settings` references with `google_connections`. Fixed field names to match actual schema.
- `lib/scheduling/calendar-sync-actions.ts` (new) — `'use server'` boundary exposing: `syncEventToGoogle()`, `deleteEventFromGoogle()`, `getCalendarConnection()`, `initiateGoogleCalendarConnect()`, `disconnectGoogleCalendar()`. Written as proper async wrapper functions (required by `'use server'` rules — `export { }` re-export groups are not allowed).
- `app/api/auth/google/calendar/callback/route.ts` (new) — OAuth callback mirroring the Gmail callback pattern.
- `lib/events/transitions.ts` — Hooks `→ confirmed` to call `syncEventToGoogle()` and `→ cancelled` to call `deleteEventFromGoogle()` (both non-blocking).
- `app/(chef)/events/[id]/page.tsx` — Added "Sync to Google Calendar" manual button + sync status badge.

**Files changed:** `lib/scheduling/calendar-sync.ts`, `lib/scheduling/calendar-sync-actions.ts` (new), `app/api/auth/google/calendar/callback/route.ts` (new), `lib/events/transitions.ts`, `app/(chef)/events/[id]/page.tsx`

---

### 4.2 — Payment Deposit Gate

**Problem:** The `→ confirmed` transition could proceed even when a required deposit had not been collected.

**Solution:** `lib/events/transitions.ts` now calls `getEventFinancialSummary(eventId)` (from `lib/ledger/compute.ts`) before allowing the `accepted → paid` or `paid → confirmed` transition. If `deposit_amount_cents > 0` and `total_paid_cents < deposit_amount_cents`, the transition returns an error with a descriptive `reason`.

UI changes:
- `components/events/event-transitions.tsx` — Shows deposit status in the transition UI: *"Deposit: $500 required / $0 collected — record payment to proceed."*
- `app/(chef)/events/[id]/page.tsx` — Prominent banner on accepted events when deposit is outstanding: *"Awaiting $500 deposit before confirming."*

**Files changed:** `lib/events/transitions.ts`, `components/events/event-transitions.tsx`, `app/(chef)/events/[id]/page.tsx`

---

## Phase 5 — Major Features

### 5.1 — Client-Facing Booking Page

**Problem:** Clients had no way to discover a chef's availability or submit an inquiry without the chef initiating contact first. There was no shareable link.

**Migration applied (additive):**
```sql
ALTER TABLE chefs
  ADD COLUMN booking_slug TEXT UNIQUE,
  ADD COLUMN booking_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN booking_headline TEXT,
  ADD COLUMN booking_bio_short TEXT,
  ADD COLUMN booking_min_notice_days INTEGER DEFAULT 7,
  ADD COLUMN booking_deposit_percent INTEGER DEFAULT 0;
```

**New files:**
- `app/book/[chefSlug]/page.tsx` — Public page (no auth required). Shows chef name/headline, calendar widget, inquiry form.
- `app/book/[chefSlug]/availability/route.ts` — API route returning JSON availability for next 90 days: `{ date, status: 'available' | 'blocked' | 'waitlist_only' }[]`. Uses `getAvailabilityForMonth()` + `validateDateAgainstRules()`.
- `app/book/[chefSlug]/thank-you/page.tsx` — Post-submission confirmation page.
- `components/booking/booking-calendar.tsx` — Month calendar grid with color-coded dates (green = available, gray = blocked, orange = waitlist only).
- `components/booking/booking-form.tsx` — Simplified inquiry form (name, email, phone, occasion, guest count, notes) that calls `submitPublicInquiry()`.

**Modified files:**
- `lib/inquiries/public-actions.ts` — Resolves chef by `booking_slug` instead of hardcoded email.
- `app/(chef)/settings/page.tsx` — Added "Booking Page" section with enable/disable toggle, slug editor, headline/bio fields.
- `app/(chef)/dashboard/page.tsx` — Added "Your booking link" widget with copy-to-clipboard.

---

### 5.2 — Timezone Support

**Problem:** All times were stored and displayed as if in a single timezone. Events, prep blocks, and timeline calculations had no timezone awareness.

**Migration applied (additive — safe fallback for existing rows):**
```sql
ALTER TABLE chefs
  ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/New_York';

ALTER TABLE events
  ADD COLUMN event_timezone TEXT;
-- NULL = inherit from chef.timezone (safe for all existing events)
```

**Engine changes:**
- `lib/scheduling/timeline.ts` — Replaced raw DATE/TIME arithmetic with timezone-aware calculations using `date-fns-tz`. `event_date + serve_time` is now treated as local time in `event_timezone ?? chef.timezone`.
- `lib/scheduling/dop.ts` — All DOP phase times calculated in chef timezone.
- `lib/scheduling/actions.ts` — `mapEventToScheduling()` now includes `event_timezone`.

**UI changes:**
- `components/events/event-form.tsx` — Timezone picker (defaults to chef's stored timezone; can be overridden per event). Label: *"Times shown in: America/New_York."*
- `app/(chef)/events/[id]/page.tsx` — Serve time displays with timezone label.
- `components/scheduling/timeline-view.tsx` — Times rendered in correct timezone.
- `components/booking/booking-calendar.tsx` — Times displayed in visitor's browser timezone with a conversion note.

---

## Build Stability Fixes

Several pre-existing issues were blocking `npx next build`. These were fixed as part of this branch.

### `types/database.ts` — Corrupted by CLI Output

`Initialising login role...` from the Supabase CLI had been prepended to line 1 of the generated types file. This caused every module importing from `types/database.ts` to fail with `error TS6053`/`error TS1434`, completely masking real type errors.

**Fix:** Removed the prepended line. `types/database.ts` is now valid TypeScript again.

### `lib/stripe/transfer-routing.ts` — Sync Function in `'use server'` File

`computeApplicationFee` is a synchronous function. `'use server'` files may only export async functions. The directive was removed — this is a library file imported by server action files, not a server action boundary itself.

### `lib/scheduling/calendar-sync-actions.ts` — Illegal Re-export Syntax

`export { syncEventToGoogleCalendar as syncEventToGoogle }` is not valid syntax in `'use server'` files. Rewrote as individual async wrapper functions.

### `app/api/webhooks/stripe/route.ts` — Untyped Table Queries

Three `supabase.from('stripe_transfers')` calls referenced a table not present in the generated types. Cast to `(supabase as any)` to allow the queries while keeping the rest of the file type-safe.

### `app/(chef)/analytics/benchmarks/page.tsx` — Wrong Prop Shape

`BenchmarkDashboard` expects `{ current: KPISnapshot, history: HistoryPoint[] }` but the page was passing `data={benchmarkHistory}` (a flat `BenchmarkSnapshot[]`). Fixed to split the array and map the history entries.

### `app/(chef)/settings/page.tsx` — Incomplete Fallback Object

`BookingPageSettings` required 6 fields that were missing from the `?? {}` fallback: `booking_model`, `booking_base_price_cents`, `booking_pricing_type`, `booking_deposit_type`, `booking_deposit_percent`, `booking_deposit_fixed_cents`. Added all missing fields.

### Pages Router — Hybrid Mode Requirements

The project uses both App Router (`app/`) and Pages Router (`pages/`). Pages Router requires `pages/_document.tsx` to exist. Created the standard `Html/Head/Main/NextScript` document file.

### `lib/clients/next-best-action.ts` — Smart Apostrophe

A curly apostrophe (`'` U+2019) in a string literal on line 227 caused a TypeScript parse error. Replaced with plain `has not`.

---

## Migration Summary

| Migration file | What it adds | Tables affected |
|----------------|-------------|-----------------|
| `chef_scheduling_rules` table | Phase 3.1 | New table |
| `events.google_calendar_event_id/synced_at` | Phase 4.1 | `events` |
| `chefs.booking_slug/enabled/headline/bio/min_notice/deposit_pct` | Phase 5.1 | `chefs` |
| `chefs.timezone`, `events.event_timezone` | Phase 5.2 | `chefs`, `events` |

All migrations are purely additive (no `DROP`, no `DELETE`, no column type changes). Existing rows get `NULL` or default values for new columns. No data migration needed.

---

## Files Added / Modified

### New files (19)
- `lib/calendar/view-actions.ts`
- `lib/events/parse-event-from-text.ts`
- `lib/availability/rules-actions.ts`
- `lib/scheduling/calendar-sync-actions.ts`
- `app/(chef)/events/new/from-text/page.tsx`
- `app/book/[chefSlug]/page.tsx`
- `app/book/[chefSlug]/availability/route.ts`
- `app/book/[chefSlug]/thank-you/page.tsx`
- `app/api/auth/google/calendar/callback/route.ts`
- `components/events/event-nl-form.tsx`
- `components/settings/scheduling-rules-form.tsx`
- `components/booking/booking-calendar.tsx`
- `components/booking/booking-form.tsx`
- `public/offline.html`
- `pages/_document.tsx`
- `supabase/migrations/*_chef_scheduling_rules.sql`
- `supabase/migrations/*_events_gcal_columns.sql`
- `supabase/migrations/*_chefs_booking_columns.sql`
- `supabase/migrations/*_timezone_columns.sql`

### Modified files (18)
- `lib/availability/actions.ts` — `checkDateConflicts()`
- `lib/events/actions.ts` — conflict + rules checks in `createEvent()`
- `lib/events/transitions.ts` — deposit gate + auto-prep-placement + GCal sync hooks
- `lib/scheduling/actions.ts` — prep cascade in `rescheduleEvent()`, timezone in mapper
- `lib/scheduling/prep-block-actions.ts` — `autoPlacePrepBlocks()`
- `lib/scheduling/calendar-sync.ts` — removed `@ts-nocheck`, fixed table references
- `lib/scheduling/timeline.ts` — timezone-aware calculations
- `lib/scheduling/dop.ts` — timezone-aware DOP phases
- `lib/inquiries/public-actions.ts` — resolve chef by slug
- `lib/calendar/constants.ts` — `CalendarSavedView` type + presets
- `lib/stripe/transfer-routing.ts` — removed `'use server'` directive
- `components/events/event-form.tsx` — conflict/rule warnings + NL entry link + timezone picker
- `components/events/event-transitions.tsx` — deposit requirement display
- `components/calendar/calendar-filter-panel.tsx` — saved views dropdown
- `components/scheduling/calendar-view.tsx` — reschedule toast with block count
- `components/scheduling/timeline-view.tsx` — timezone-aware time display
- `components/analytics/demand-heatmap.tsx` — type interface fix
- `app/(chef)/events/[id]/page.tsx` — deposit banner + GCal sync button + prep banner
- `app/(chef)/events/new/page.tsx` — NL entry link
- `app/(chef)/settings/page.tsx` — rules + booking sections, fixed fallback
- `app/(chef)/analytics/benchmarks/page.tsx` — correct prop shape
- `app/(chef)/dashboard/page.tsx` — booking link widget
- `app/api/webhooks/stripe/route.ts` — `(supabase as any)` cast for untyped table
- `types/database.ts` — removed prepended CLI output
- `next.config.js` — restored PWA production enable

---

## How It Connects to the System

**Event FSM:** The deposit gate (4.2) and auto-prep-placement (2.2) hook directly into `lib/events/transitions.ts`. Both use the existing hook pattern — they run after the state change succeeds and are non-blocking (failures are logged but don't roll back the transition).

**AI Policy compliance:** NL event entry (2.1) follows the policy strictly. AI output is shown as a draft preview; nothing is written to the database until the chef hits "Create Event." The AI is in the drafting zone, not the mutating zone.

**Tenant scoping:** All new server actions follow the same pattern: `const { tenantId } = await requireChef()` first, then every query is scoped with `.eq('tenant_id', tenantId)`.

**Ledger integrity:** The deposit gate reads from ledger compute (`getEventFinancialSummary`) but never writes. The ledger remains append-only and immutable.

**Public routes:** `/book/[chefSlug]` and `/book/[chefSlug]/availability` are public (no auth). The booking form calls `submitPublicInquiry()` which is already the public intake path. The slug-based chef resolution was the only change needed to `public-actions.ts`.
