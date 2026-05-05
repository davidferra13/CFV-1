# Dashboard Diagnostic Report

> **Date:** 2026-05-04
> **Severity:** CRITICAL (production-facing)
> **Surface:** `/dashboard` (chef homepage, triage mode)
> **Method:** Live screenshot + code audit + server error capture

---

## Executive Summary

The dashboard violates its own governing specs (Universal Interface Philosophy, Surface Grammar Governance) in 12+ ways. Multiple server-side crashes are silently swallowed by error boundaries. The decision queue shows duplicate items. The notification system has no expiry and hits 99+. The page is ~5000px tall with dozens of equal-weight sections, the exact antipattern the specs exist to prevent.

---

## CRITICAL FAILURES

### 1. Decision Queue Deduplication Bug

**What:** "Attach a menu to this event" appears 5 times for "Dinner Party - Chain Test" in the DECIDE NOW widget.

**Root cause:** Three independent sources feed the decision queue, but deduplication only applies to two of them.

- `lib/decision-queue/actions.ts` line 133: event-level dedup excludes `proactive_alert` source
- `lib/intelligence/proactive-alerts.ts` lines 145-163: generates items with different ID pattern (`prep-${eventId}`) than work surface (`${eventId}:qualification:attach_menu`)
- Multiple event rows for "Dinner Party - Chain Test" each produce their own items with unique UUIDs

**Files:**

- `lib/decision-queue/actions.ts:124-148` (dedup logic)
- `lib/decision-queue/actions.ts:194-220` (three-source merge)
- `lib/workflow/stage-definitions.ts:158-170` (attach_menu generation)
- `lib/intelligence/proactive-alerts.ts:145-163` (duplicate alert generation)

**Fix required:**

1. Include `proactive_alert` in event-level dedup (line 133)
2. Add title+eventId fallback dedup to catch cross-source duplicates

---

### 2. Multi-Location Summary Server Crash (35 errors)

**What:** `MultiLocationSummary` widget crashes server-side. Error boundary catches it but 35 console errors fire (2x 401, 33x 403, React #419).

**Root cause (ranked):**

1. **`getActiveAlerts()` throws unhandled** (`lib/locations/alert-actions.ts:118`): `if (error) throw new Error(...)`. Component has no try/catch around its `Promise.all` on line 21 of `multi-location-summary.tsx`.

2. **Broken cross-column comparison** (`lib/locations/actions.ts:358`): `.lt('current_qty', 'par_level')` passes the string literal `'par_level'` to PostgreSQL instead of a column reference. Causes: `ERROR: invalid input syntax for type numeric: "par_level"`.

3. **Migration possibly not applied** (`20260425000015_multi_location_operations.sql`): If `location_alerts` or `location_daily_metrics` tables don't exist, queries fail.

**Architectural flaw:** `WidgetErrorBoundary` is `'use client'` and cannot catch server-side async throws. `<Suspense>` only helps with streaming, not error isolation. At least 10 async server components share this vulnerability:

| Section                       | Risk Level   |
| ----------------------------- | ------------ |
| MultiLocationSummary          | CRASHING NOW |
| RestaurantMetricsSection      | At risk      |
| PulseSummary                  | At risk      |
| ScheduleCards                 | At risk      |
| PrepPressureCard              | At risk      |
| SaturationCards               | At risk      |
| SmartSuggestions              | At risk      |
| NetworkActivitySection        | At risk      |
| DinnerCirclesSection          | At risk      |
| CompletionSummaryWidgetServer | At risk      |

**Fix required:** Each async server component needs internal try/catch (like the `safe()` helper used at the page level) or a nested error.tsx layout segment.

---

### 3. Dev Server Dead (Port 3100)

**What:** Node process PID 95020 consuming ~9.2GB RAM, accepts connections but never responds.

**Fix:** Kill and restart. Investigate memory leak source.

---

## HIGH-SEVERITY VIOLATIONS

### 4. Surface Grammar: Triage Mode Violated

**Rule:** Surface grammar spec declares dashboard as `triage` mode.
**Forbidden defaults for triage:** "multi-section dashboards with equal visual weight"

**Actual state:** Page is ~5000px tall with 20+ sections of equal visual weight:

- Client Attention
- Decide Now (13 items)
- Resolve Next
- ~10 Lifecycle Action Surface cards
- Schedule / Prep Pressure / Saturation
- Seasonal Calendar
- ChefTips
- Event Readiness
- Network Activity
- Dinner Circles
- Priority Queue + Post-Event Actions + Touchpoints
- Smart Suggestions
- Quick Notes
- Secondary Insights (collapsed, but contains 5 more sections)

**Rule broken:** "Maximum 7 dashboard cards visible without scrolling on a default viewport" (Interface Philosophy 2.2)

**File:** `app/(chef)/dashboard/page.tsx:1567-1958` (the entire render function)

---

### 5. Four Header Action Buttons (One Primary Rule)

**Rule:** "Every screen has exactly one primary action. Never two." (Interface Philosophy 5.1)

**Actual:** Four buttons: Briefing, Create Menu, Storefront, + New Event

**File:** `app/(chef)/dashboard/page.tsx:1595-1628`

**Fix:** Only "+ New Event" should be primary (gradient-accent). Others should be tertiary (text links, context menu, or command palette only).

---

### 6. Miller's Law Violation in Decision Queue

**Rule:** "Maximum 7 actionable items visible in any group without sub-grouping" (Interface Philosophy 2.2)

**Actual:** DECIDE NOW shows 8+ items inline (13 total, "Show all" link), no grouping by domain or event.

**File:** `components/dashboard/decision-queue-widget.tsx`

**Fix:** Group by event or domain. Show top 3-5 with smart grouping, collapse rest.

---

## MEDIUM-SEVERITY VIOLATIONS

### 7. Duplicate Sidebar Navigation

**What:** Two nav constructs render the same categories:

- **Action Bar** (top): Today, Inbox, Events, Clients, Culinary, Finance (flat links)
- **Nav Groups** (below): Clients >, Culinary >, Events >, Finance >, Pipeline > (collapsible accordions)

**Files:**

- `components/navigation/chef-nav.tsx:1068-1097` (renders both)
- `components/navigation/action-bar.tsx` (top links)
- `components/navigation/nav-config.tsx:217` (groups) and `:1891` (action bar items)

**Intent:** Action Bar = daily driver, Nav Groups = deep navigation. But visually, "Clients" appears twice and "Events" appears twice. Confusing.

**Fix:** Action Bar items that have matching Nav Groups should not duplicate the label. Either collapse Nav Groups when Action Bar is visible, or differentiate labels clearly.

---

### 8. Survey Banner in Triage Mode

**Rule:** Surface Grammar: "surveys, promotional banners" are forbidden defaults in triage mode.

**Actual:** "Food Operator Survey - Wave 1" banner at the top of the dashboard.

**Irony:** The code INTENTIONALLY shows it on triage. `lib/interface/surface-governance.ts:282`:

```typescript
const allowAmbientResearchPrompts = mode === 'triage'
```

This directly contradicts the Surface Grammar spec which forbids surveys in triage mode.

**Files:**

- `lib/interface/surface-governance.ts:282` (allows survey on triage)
- `app/(chef)/layout.tsx:274-279` (renders banner)
- `components/beta-survey/market-research-banner-wrapper.tsx`

**Fix:** Change line 282 to `mode !== 'triage'` or `false`, or add dashboard exclusion.

---

### 9. Notification System: No Expiry, No Auto-Read

**What:** Bell icon shows "99+" unread notifications.

**Root causes:**

1. **Founder mirror** (`lib/notifications/actions.ts:134-172`): Every notification from all tenants is duplicated to the founder account. Founder sees everything.
2. **No auto-mark-read:** Opening the notification panel does NOT mark items as read. Only explicit per-item or "mark all" actions do.
3. **No TTL/cleanup:** The `notifications` table has no `expires_at` column. No cron job expires old notifications. `notifications_no_delete` RLS policy blocks hard deletes.
4. **SSE increment-only:** `notification-provider.tsx:279` does `setUnreadCount(prev => prev + 1)` on each event but never re-queries the actual DB count.

**Files:**

- `lib/notifications/actions.ts:134-172` (founder mirror)
- `lib/notifications/actions.ts:249-270` (unread count)
- `components/notifications/notification-provider.tsx:279` (increment-only)
- `database/migrations/20260221000003_notifications.sql` (no expires_at)

**Fix required:**

1. Add notification TTL (30-day expiry) + cron cleanup
2. Auto-mark-as-read when notification panel is opened
3. Re-evaluate founder mirror (does the founder need ALL tenant notifications?)
4. Re-query actual DB count periodically instead of increment-only

---

### 10. Equal-Weight Action Surface Cards

**What:** ~10 lifecycle action cards (Prepare Next, Procurement, Prep Flow, Menu Decision, Safety Check, Collect Balance, Receipt Capture, Team Ready, Service Ready, Execution Next, etc.) all render as equal-weight cards in a 2-column grid.

**Rule broken:** "features do not compete for attention" and priority hierarchy (Interface Philosophy 3.3)

**File:** `app/(chef)/dashboard/page.tsx:1410-1436` (LifecycleActionLayerSection render)

**Fix:** Prioritize by urgency/temporal proximity. Show only the top 2-3 actionable items. Collapse rest behind "More actions."

---

### 11. Cookie Consent Banner

**What:** Still showing, covering bottom-right content.

**Minor issues:**

- Close "x" button is `hidden sm:block` (invisible on mobile; `components/ui/cookie-consent.tsx:62`)
- "Not now" stores 7-day localStorage expiry; if localStorage unavailable (private browsing), banner reappears every page load (line 51 catch block silently fails)
- No server-side cookie check, so banner always mounts then checks client-side

**File:** `components/ui/cookie-consent.tsx`

---

## ARCHITECTURAL OBSERVATIONS

### 12. Dashboard Page: 1982 Lines, God Component

`app/(chef)/dashboard/page.tsx` is 1982 lines with:

- 122 imports
- 20+ async server component functions
- 7 skeleton functions
- 8 candidate-fetching functions (each 50-100 lines of raw Supabase queries)
- 1 massive render function

This file is unmaintainable. The candidate-fetching functions (`getProcurementCandidates`, `getPrepFlowCandidates`, `getTravelConfirmCandidates`, etc.) belong in `lib/` domain modules, not in the page file.

### 13. `createServerClient()` Cast to `any`

Throughout the page, `createServerClient()` is cast to `any` to bypass TypeScript:

```typescript
const db: any = createServerClient()
```

This disables all type safety for database queries in the dashboard, making it easy to write broken queries (like the `.lt('current_qty', 'par_level')` bug above) without compile-time detection.

---

## SUMMARY TABLE

| #   | Issue                                           | Severity | Spec Violated              | File(s)                                        |
| --- | ----------------------------------------------- | -------- | -------------------------- | ---------------------------------------------- |
| 1   | Decision queue shows 5x duplicate "Attach menu" | CRITICAL | Honest over smooth         | decision-queue/actions.ts, proactive-alerts.ts |
| 2   | Multi-Location Summary crash (35 errors)        | CRITICAL | Error isolation            | multi-location-summary.tsx, alert-actions.ts   |
| 3   | Dev server dead (9.2GB RAM)                     | CRITICAL | Infrastructure             | N/A                                            |
| 4   | 5000px page, 20+ equal-weight sections          | HIGH     | Surface Grammar: triage    | dashboard/page.tsx                             |
| 5   | 4 header action buttons                         | HIGH     | One primary action rule    | dashboard/page.tsx:1595-1628                   |
| 6   | 13 decision items without grouping              | HIGH     | Miller's Law               | decision-queue-widget.tsx                      |
| 7   | Duplicate sidebar navigation                    | MEDIUM   | Clutter prevention         | chef-nav.tsx, nav-config.tsx                   |
| 8   | Survey banner in triage mode                    | MEDIUM   | Surface Grammar: forbidden | surface-governance.ts:282                      |
| 9   | 99+ notifications, no expiry                    | MEDIUM   | Actionable information     | notifications/actions.ts                       |
| 10  | Equal-weight action cards                       | MEDIUM   | Feature competition        | dashboard/page.tsx:1410-1436                   |
| 11  | Cookie consent banner                           | LOW      | Polish                     | cookie-consent.tsx                             |
| 12  | 1982-line god component                         | DEBT     | Maintainability            | dashboard/page.tsx                             |
| 13  | `any` casts disable type safety                 | DEBT     | Code quality               | dashboard/page.tsx (throughout)                |

---

## RECOMMENDED FIX ORDER

1. **Kill dev server** (immediate, 30 seconds)
2. **Fix decision queue dedup** (line 133 inclusion + title fallback)
3. **Wrap MultiLocationSummary in try/catch** (prevent 35 errors)
4. **Fix `.lt('current_qty', 'par_level')` cross-column bug**
5. **Fix surface-governance.ts:282** (survey forbidden in triage)
6. **Add notification TTL + auto-mark-read**
7. **Reduce dashboard to triage-compliant layout** (biggest structural change, needs planning)
