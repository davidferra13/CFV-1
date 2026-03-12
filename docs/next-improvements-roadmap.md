# Chef Portal — Next Improvements Roadmap

**Created:** 2026-02-28
**Last updated:** 2026-02-28
**Branch:** `feature/risk-gap-closure`
**Status:** Planning — none started yet

---

## How to Use This Document

This is the master list of every improvement identified for the chef portal, **organized by area of the website**. Every section of the app is covered — nothing is funneled.

1. **Pick a section** you want to work on — each maps to a nav group in the sidebar
2. **Read the improvements listed** — each has: problem, what exists, what to build, files
3. **Check the build order table** at the bottom for recommended priority across all areas
4. **After completing a feature:** mark it done in the status tracker, update `docs/app-complete-audit.md` if UI changed, commit

### Prerequisite: Branch & Build State

- All work should stay on a feature branch (not `main`)
- The 14 QoL features (F1-F14) are complete — see `docs/qol-14-features.md`
- Build was passing clean as of 2026-02-28 (`npx next build --no-lint` — exit 0)
- No pending migrations — schema is current

### Feature Status Tracker

| #   | Feature                          | Area          | Status              |
| --- | -------------------------------- | ------------- | ------------------- |
| 1   | Keyboard Power-User Mode         | Global        | Not started         |
| 2   | Recurring Events                 | Events        | Done                |
| 3   | Event Templates                  | Events        | Done                |
| 4   | Smart Auto-Fill                  | Events        | Done                |
| 5   | Cash Flow Forecasting            | Finance       | Not started         |
| 6   | Client Self-Service Portal       | Client Portal | Not started         |
| 7   | Offline-First for Kitchen        | Global        | Not started         |
| 8   | Scheduling + CRM Intelligence    | Sales         | Not started         |
| 9   | Vendor Price Tracking            | Vendors       | Not started         |
| 10  | Photo Portfolio                  | Marketing     | Not started         |
| 11  | Equipment Dashboard              | Operations    | Done (pre-existing) |
| 12  | Contract Library                 | Operations    | Done                |
| 13  | Staff Shift Scheduling           | Operations    | Not started         |
| 14  | Service-Time Dashboard           | Operations    | Not started         |
| 15  | Automated Follow-Up Sequences    | Marketing     | Not started         |
| 16  | Analytics Drill-Down             | Analytics     | Not started         |
| 17  | Public Chef Profile & SEO        | Marketing     | Not started         |
| 18  | Message Templates                | Sales         | Not started         |
| 19  | Revenue Goal Tracking            | Analytics     | Not started         |
| 20  | Inventory & Pantry               | Inventory     | Not started         |
| 21  | Dark Mode Fix                    | Global        | Done                |
| 22  | Toast Feedback                   | Global        | Done                |
| 23  | Optimistic Rollback              | Global        | Done                |
| 24  | Date Formatting Helpers          | Global        | Deferred            |
| 25  | Status Color Registry            | Global        | Deferred            |
| 26  | Error Boundaries                 | Global        | Done                |
| 27  | Accessibility Fixes              | Global        | Done                |
| 28  | In-Page Search                   | Global        | Not started         |
| 29  | Loading States (Async)           | Global        | Not started         |
| 30  | Pagination                       | Global        | Not started         |
| 31  | Tax Reports                      | Finance       | Not started         |
| 32  | Event PDF Exports                | Events        | Not started         |
| 33  | Client Year-End Summary          | Clients       | Not started         |
| 34  | Staff Utilization Report         | Operations    | Not started         |
| 35  | Webhook Triggers                 | Settings      | Not started         |
| 36  | Notification Triggers            | Global        | Not started         |
| 37  | Financial Alerts                 | Finance       | Not started         |
| 38  | Operational Reminders            | Operations    | Not started         |
| 39  | Audit Trail Viewer               | Settings      | Not started         |
| 40  | Data Archival                    | Settings      | Not started         |
| 41  | Duplicate Detection              | Clients       | Not started         |
| 42  | Bulk Import                      | Settings      | Not started         |
| 43  | Proactive Remy Nudges            | Remy AI       | Not started         |
| 44  | Remy Conversation-to-Action      | Remy AI       | Not started         |
| 45  | Kitchen Display System (KDS)     | Commerce      | Not started         |
| 46  | POS Loyalty Integration          | Commerce      | Not started         |
| 47  | Recipe Versioning & Cost History | Culinary      | Not started         |
| 48  | Batch Prep Planner               | Culinary      | Not started         |
| 49  | Nutritional & Allergen Scoring   | Culinary      | Not started         |
| 50  | HACCP Food Safety Plan           | Protection    | Not started         |
| 51  | Supplier Recall Management       | Protection    | Not started         |
| 52  | Crisis Playbook Execution        | Protection    | Not started         |

### Where to Start

Start with **#21 Dark Mode Fix** (visible bug, mechanical fix). Then **#22 Toast Feedback** and **#23 Optimistic Rollback** (Zero Hallucination Rule compliance). After those, **#2+3 Recurring Events + Templates** for biggest daily impact.

---

## Global (Cross-App)

Improvements that affect every page, not tied to one section.

### 1. Keyboard Power-User Mode

**Problem:** Only Cmd+K (search) and Ctrl+Shift+E (expense) exist. No comprehensive keyboard navigation.

**What exists:** Global search in `components/search/global-search.tsx`, shortcut registration in `app/(chef)/layout.tsx`

**What to build:**

- `?` key opens keyboard shortcuts help overlay
- Vim-style go-to: `g e` → Events, `g c` → Clients, `g d` → Dashboard, `g f` → Finance, etc.
- Arrow keys navigate table rows, Enter opens selected
- `Escape` closes any modal/drawer/panel
- Central registry: `lib/keyboard/shortcuts.ts`

**Files to create:** `lib/keyboard/shortcuts.ts`, `components/ui/keyboard-help-modal.tsx`, `hooks/use-keyboard-shortcuts.ts`
**Files to modify:** `app/(chef)/layout.tsx`

---

### 7. Offline-First for Kitchen Use

**Problem:** Chefs in kitchens with spotty WiFi. Pages fail to load, data doesn't save.

**What exists:** PWA manifest, `useDurableDraft` (IndexedDB), `components/offline/offline-nav-indicator.tsx`, basic service worker

**What to build:**

- Cache critical read-only data in IndexedDB (today's schedule, recipes, prep timelines, grocery lists)
- Service worker intercepts failed requests, serves cached data
- "Offline — showing cached data from [time]" indicator
- Queue mutations offline (expense logging, task completion), sync when online
- `lib/offline/cache-manager.ts` with TTL and versioning

**Files to create:** `lib/offline/cache-manager.ts`, `lib/offline/sync-queue.ts`, `public/sw.js`

---

### 21. Dark Mode Consistency Fix

**Problem:** ~6 files use hardcoded light-theme colors (`bg-gray-50`, `text-gray-900`, `border-gray-300`).

**Affected files:** `app/(chef)/calls/page.tsx`, `calls/[id]/page.tsx`, `calls/[id]/edit/page.tsx`, `calendar/week/week-planner-client.tsx`, `calendar/year/year-view-client.tsx`

**Fix:** Replace `gray-50/100/200/300` → `stone-800/900`, `gray-800/900` text → `stone-100/200`, `gray-300` borders → `stone-600/700`. **Effort: XS**

---

### 22. Toast Feedback on All Server Actions

**Problem:** ~10-15 `startTransition` catch blocks only `console.error` — no user-visible toast.

**Fix:** Add `toast.error('Failed to [action]')` to every catch block. Add `toast.success()` where missing. **Effort: XS**

---

### 23. Optimistic Update Rollback

**Problem:** ~5-8 functions modify state optimistically but don't rollback on failure.

**Fix:** Save previous state before mutation, restore in catch: `const prev = state; setState(optimistic); try { await action() } catch { setState(prev); toast.error() }`. **Effort: S**

---

### 24. Centralized Date Formatting

**Problem:** 20+ files use inconsistent date format strings with no timezone handling.

**Fix:** Create `lib/date/format-helpers.ts` with `formatEventDate()`, `formatShortDate()`, `formatTime()`, `formatRelative()`, `formatDateRange()`. Migrate 20+ call sites. **Effort: S**

---

### 25. Centralized Status Color Registry

**Problem:** Status colors defined ad-hoc per component. Calls, prep blocks, events each have different maps.

**Fix:** Create `lib/ui/status-colors.ts` — one canonical color mapping for all status types. **Effort: XS**

---

### 26. Missing Error Boundaries

**Problem:** 17 `error.tsx` exist but deep route segments lack them (calendar/week, finance/_, vendors/_).

**Fix:** Add `error.tsx` to ~8-12 route segments. **Effort: XS**

---

### 27. Accessibility Fixes

**Problem:** Icon-only buttons without `aria-label`, status pills without screen reader descriptions, inputs without labels.

**Fix:** Add `aria-label` to ~20 elements, `sr-only` spans for icon buttons, `aria-live="polite"` on filter areas. **Effort: S**

---

### 28. In-Page Search & Filtering

**Problem:** List pages lack client-side search beyond Cmd+K. Calls, calendar, activity, ledger, components — no filtering.

**Fix:** Add debounced search input to ~8 list pages. **Effort: M**

---

### 29. Missing Loading States for Async Operations

**Problem:** Some button-click async operations lack spinners (autoSchedule, prep block save).

**Fix:** Add `isPending` / `useTransition` pending state to buttons. **Effort: XS**

---

### 30. Pagination for Large Data Sets

**Problem:** Events, clients, calls pages fetch all records without limits.

**Fix:** Cursor-based pagination with "Load more" button. **Effort: M**

---

### 36. Notification Triggers (Missing ~30%)

**Problem:** 120+ notification types defined, ~30% never triggered (`burnout_risk_high`, `relationship_cooling`, `capacity_limit_approaching`, etc.)

**What to build:** Implement trigger functions for all unused types. Create `lib/notifications/proactive-triggers.ts` + cron job `app/api/scheduled/proactive-notifications/route.ts`. **Effort: S**

---

## Remy AI

### 43. Proactive Chef Nudges

**Problem:** Remy only responds when asked. Never proactively alerts chef about overdue invoices, expiring certs, dormant clients, or upcoming milestones.

**What exists:** Remy memory system, business context, 100+ AI capabilities, notification infrastructure

**What to build:**

- Background job runs 2x daily, scans business state (unpaid invoices >30d, expiring certs <30d, inactive clients >60d, upcoming client anniversaries)
- Generates 1-2 context-aware nudges shown in Remy drawer
- Each nudge links to a 1-click action ("Send reminder" → pre-filled draft, ready to approve)
- Chef can dismiss or snooze nudges

**Files to create:** `lib/ai/remy-nudges.ts`, `app/api/scheduled/remy-nudges/route.ts`, `components/ai/remy-nudge-card.tsx`

---

### 44. Remy Conversation-to-Action

**Problem:** After Remy drafts an email, generates a business insight, or suggests a menu — chef must manually navigate to create the thing. No "Create event from this" or "File this expense."

**What exists:** Remy action log, agent actions system (`lib/ai/agent-actions/`)

**What to build:**

- After Remy generates output (draft email, event suggestion, expense estimate), show action buttons: "Create Event", "Send Email", "Log Expense"
- Clicking pre-fills the relevant form with Remy's output
- Track which Remy suggestions led to actions (analytics)

**Files to modify:** `components/ai/remy-drawer.tsx`, `lib/ai/remy-actions.ts`

---

## Sales (Inquiries, Quotes, Calls)

### 8. Scheduling + CRM Intelligence

**Problem:** Calendar gaps and dormant clients detected separately. No proactive "you have free time + these clients might book."

**What exists:** `lib/clients/dormancy.ts`, `lib/scheduling/prep-block-actions.ts` (`getSchedulingGaps()`), campaign outreach, queue system

**What to build:**

- Detect 3+ day calendar gaps, cross-reference with dormant clients (60+ days)
- Generate suggestions ranked by LTV, recency, booking likelihood
- Surface in dashboard widget + queue items
- One-click "Reach out to Client X" → opens draft with context

**Files to create:** `lib/intelligence/scheduling-crm.ts`, `components/dashboard/scheduling-suggestion-widget.tsx`

---

### 18. Client Communication Templates & Quick Replies

**Problem:** Chef types same messages repeatedly: booking confirmations, payment reminders, event logistics.

**What exists:** Unified inbox, email send infrastructure, AI draft capabilities

**What to build:**

- Template management page with categories (Booking, Menu, Payment, etc.)
- Dynamic variables: `{{client_name}}`, `{{event_date}}`, `{{quoted_price}}`
- Quick-reply picker in inbox compose area
- "Save as Template" on any sent message

**Database:** `message_templates` table
**Files to create:** `lib/templates/message-template-actions.ts`, `components/inbox/template-picker.tsx`, `app/(chef)/settings/templates/page.tsx`

---

## Clients

### 4. Smart Auto-Fill for Returning Clients

**Problem:** Creating event for 5th-time client still requires manual entry of dietary restrictions, guest count, budget.

**What exists:** Client profile with dietary notes, event history per client

**What to build:**

- On client selection in event form, fetch last 3 events
- Pre-fill: dietary restrictions, typical guest count, cuisine preferences, budget range, preferred venue
- Visual "auto-filled" badges so chef knows what came from history
- `lib/clients/auto-fill.ts` — `getClientAutoFill(clientId)`

**Files to create:** `lib/clients/auto-fill.ts`, `components/events/auto-fill-badge.tsx`
**Files to modify:** `components/events/event-form.tsx`

---

### 33. Client Year-End Summary

**Problem:** Loyal clients would value annual statement showing events, spending, loyalty tier, dietary accommodations.

**What to build:** One-click PDF per client, bulk generation for all active clients, optional email delivery.
**Files to create:** `lib/reports/client-annual-statement.ts`, `app/(chef)/reports/client-statements/page.tsx`

---

### 41. Duplicate Client Detection

**Problem:** Same client entered twice (inquiry widget + manual). No deduplication.

**What to build:** Fuzzy matching on name + email/phone, merge wizard, prevention on new client creation, weekly cron scan.
**Files to create:** `lib/clients/duplicate-detection.ts`, `components/clients/duplicate-merge-modal.tsx`, `app/api/scheduled/duplicate-scan/route.ts`

---

## Events & Calendar

### 2. Recurring Events

**Problem:** Weekly clients (Sunday meal prep, Thursday dinner) — every instance created manually.

**What exists:** Event form, event creation, 8-state FSM, calendar views

**What to build:**

- Recurrence rule in event form: weekly/biweekly/monthly, end condition
- `lib/events/recurrence.ts` — generates occurrences, creates parent + children
- Edit options: "this event only" vs "all future in series"
- Calendar shows repeat icon, cancel one without cancelling series

**Database:** `events` table: add `recurrence_rule jsonb`, `parent_event_id uuid`, `is_recurring boolean`
**Files to create:** `lib/events/recurrence.ts`, `components/events/recurrence-picker.tsx`
**Files to modify:** `components/events/event-form.tsx`, `lib/events/actions.ts`, calendar components

---

### 3. Event Templates

**Problem:** "Corporate lunch for 20" has same config every time. Chef re-enters everything.

**What to build:**

- "Save as Template" on any event detail page
- Templates page with saved configurations
- "Create from Template" dropdown on events/new

**Database:** `event_templates` table
**Files to create:** `lib/events/template-actions.ts`, `app/(chef)/events/templates/page.tsx`, `components/events/template-picker.tsx`, `components/events/save-as-template-button.tsx`

---

### 14. Service-Time Operations Dashboard

**Problem:** During live service, data scattered across pages. No unified view.

**What exists:** Station clipboard, ops log, KDS, 86'd tracking, temp logging, prep timeline

**What to build:**

- `app/(chef)/events/[id]/live/page.tsx` — unified dashboard: station status cards, temp log sidebar, timeline progress bar, quick actions (log temp, 86 item, mark station complete)
- "Go Live" button on event detail (appears when status = `in_progress`)
- Mobile-optimized, auto-refresh every 30s

---

### 32. Event-Level PDF Exports

**Problem:** No way to export event's full record as PDF.

**What to build:** Event Proposal PDF (client-facing), Prep Sheet PDF (team-facing), Post-Event Summary PDF, Guest Dietary Card PDF.
**Files to create:** `lib/documents/generate-event-pdf.ts`, `lib/documents/generate-prep-sheet.ts`, `components/events/event-export-menu.tsx`

---

## Commerce / POS

### 45. Kitchen Display System (KDS)

**Problem:** Orders pile up in queue; kitchen has no real-time visibility. Causes delays, duplicates, lost orders.

**What exists:** Order queue board with FSM (received → preparing → ready → picked_up), full POS register

**What to build:**

- Public KDS route (`/kds/:tenantId` with PIN, no auth) for monitor-friendly display
- Large text, color-coded by status (red=new, yellow=in-progress, green=almost ready)
- Multi-station support, fire/unfire orders, auto-ready timer
- Integrates with existing order queue actions

**Files to create:** `app/kds/[tenantId]/page.tsx`, `components/commerce/kds-order-card.tsx`, `lib/commerce/kds-actions.ts`

---

### 46. POS Loyalty Integration

**Problem:** Platform has loyalty tiers + points system, but POS doesn't know about them. No loyalty discounts at register.

**What exists:** Loyalty tiers, points, redemption logic in platform. POS has product pricing.

**What to build:**

- At checkout, enter client email/phone → look up loyalty tier
- Show tier badge + points balance on register
- Apply tier discount (% or cents off per tier)
- Points auto-earn on sale (configurable per product)
- One-click point redemption

**Files to modify:** `components/commerce/pos-register.tsx`
**Files to create:** `lib/commerce/pos-loyalty-bridge.ts`

---

## Culinary (Recipes, Menus, Prep)

### 47. Recipe Versioning & Cost History

**Problem:** Chef updates recipe (cost ↑ 20%), old events show wrong margin. No audit trail.

**What exists:** Recipes are mutable, no version control

**What to build:**

- On recipe update, create immutable `recipe_version` snapshot (ingredients + costs)
- Event menus link to specific version, not live recipe
- Version dropdown on recipe page ("View v1, v2, v3")
- Cost trend graph per recipe on costing dashboard

**Database:** `recipe_versions` table (recipe_id, version, ingredients_snapshot jsonb, total_cost_cents, created_at)
**Files to create:** `lib/recipes/versioning-actions.ts`, `components/recipes/recipe-version-selector.tsx`

---

### 48. Batch Prep Planner

**Problem:** Two events same week both need duck confit. Chef makes separately — 2x labor. No overlap detection.

**What exists:** Individual prep timelines per event, make-ahead windows

**What to build:**

- Drag 2+ events into a planner view
- System highlights shared components ("Make once on Day 4, split storage")
- Generates unified Gantt-style prep schedule with batched steps
- Links to consolidated shopping list
- Task checklist for execution tracking

**Files to create:** `lib/culinary/batch-prep-engine.ts`, `app/(chef)/culinary/batch-planner/page.tsx`, `components/culinary/batch-gantt-chart.tsx`

---

### 49. Nutritional & Allergen Scoring

**Problem:** Chef marks "contains peanuts" but no severity tier. Client says "tree nut allergy" — manual cross-check of every dish.

**What exists:** Recipe dietary flags, allergen tagging

**What to build:**

- Allergen database with severity tiers (trace/minor/major)
- Each ingredient tagged with allergen profile
- Auto-calculate allergen risk per serving when recipe updated
- Menu approval UI: allergen matrix per guest (green=safe, yellow=verify, red=avoid)
- Generates "Allergen Statement" text for client

**Database:** Add allergen_profile to ingredients, `allergen_assessments` table
**Files to create:** `lib/recipes/allergen-scoring.ts`, `components/menus/allergen-matrix.tsx`

---

## Operations (Staff, Equipment, Stations)

### 11. Equipment Management Dashboard

**Problem:** 100% backend exists (CRUD, depreciation, maintenance), 0% UI.

**What to build:** Equipment roster page, detail page with depreciation chart + maintenance history, maintenance calendar in dashboard queue, quick-add form.
**Files to create:** `app/(chef)/equipment/page.tsx`, `app/(chef)/equipment/[id]/page.tsx`

---

### 12. Contract & Document Library

**Problem:** Backend exists for contract generation, but no management UI.

**What to build:** Contract library page (filter by status), templates page, detail page with signing status, "Send for Signature" flow, PDF export.
**Database:** `contracts` table
**Files to create:** `app/(chef)/documents/contracts/page.tsx`, `app/(chef)/documents/contracts/templates/page.tsx`

---

### 13. Staff Shift Scheduling

**Problem:** Assigning staff to events is manual — check availability, text them, hope they reply.

**What exists:** Staff roster, availability windows, event staff panel, performance scoring, labor cost tracking

**What to build:**

- `app/(chef)/staff/schedule/page.tsx` — visual weekly grid (rows=staff, columns=days, cells=events)
- Drag-assign with @dnd-kit, color-code by role
- Conflict detection for double-booking
- "Who's free on [date]?" filter
- Shift confirmation notifications

**Database:** `staff_shift_assignments` table

---

### 34. Staff Utilization Report

**Problem:** Can't see who's overworked, underutilized, or what labor costs per event.

**What to build:** Hours per staff member, utilization rate, cost per event, overtime alerts, performance + utilization correlation.
**Files to create:** `lib/staff/utilization-report.ts`, `app/(chef)/staff/reports/page.tsx`, `components/staff/utilization-chart.tsx`

---

### 38. Operational Reminder Cron Jobs

**Problem:** Equipment maintenance, cert renewals, staff gaps go unnoticed.

**What to build:** Equipment maintenance 7-day alerts, cert renewal 30-day warnings, staff availability gap 48-hour warnings, dietary accommodation 7-day checks, stale data weekly digest.
**Files to create:** `lib/operations/proactive-alerts.ts`, `app/api/scheduled/operations-check/route.ts`

---

## Vendors

### 9. Vendor Price Tracking

**Problem:** No visibility into price trends. Can't answer "Is Vendor Y still cheapest for produce?"

**What exists:** Vendor list, invoices, price comparison page, grocery pricing APIs

**What to build:**

- Track price per ingredient per vendor over time (from invoice line items)
- Price history chart on vendor detail, "Best price" badge on ingredients
- Price alerts: ingredients where price increased >10% vs 30-day average
- Monthly savings report

**Database:** `vendor_price_history` table
**Files to create:** `lib/vendors/price-history.ts`, `components/vendors/price-trend-chart.tsx`

---

## Inventory

### 20. Inventory & Pantry Management

**Problem:** Chef buys ingredients but doesn't track what's in stock. Buys duplicates, wastes expired items.

**What exists:** Grocery quote system, recipe ingredients, vendor system

**What to build:**

- Pantry page: categories, per-item tracking (quantity, unit, expiration, cost)
- Low stock alerts, expiration warnings (within 3 days)
- Auto-deduct when event moves to `in_progress`
- Auto-suggest "you already have X in stock" on grocery lists
- Barcode scanning on mobile

**Database:** `pantry_items` + `pantry_transactions` tables
**Files to create:** `app/(chef)/pantry/page.tsx` and supporting components

---

## Finance

### 5. Cash Flow Forecasting

**Problem:** Ledger is backward-looking. Chef can't answer "Will I have enough cash in 30 days?"

**What exists:** Immutable ledger, financial summary, event financial views, dashboard widgets

**What to build:**

- 30/60/90-day projected cash position from upcoming events + recurring expenses
- "Cash drops below $X on [date]" warning threshold
- Line chart: projected vs actual

**Files to create:** `lib/analytics/cash-flow-forecast.ts`, `components/finance/cash-flow-forecast-chart.tsx`, `app/(chef)/finance/forecast/page.tsx`

---

### 31. Tax & Compliance Reports

**Problem:** Financial data exists in ledger but no structured tax output for accountant.

**What exists:** 1099 tracking, tax estimates, deduction identifier, P&L reports, year-end page

**What to build:** Quarterly estimated tax report, sales tax nexus report, deduction tracker dashboard, SE tax worksheet, one-click tax summary PDF.
**Files to create:** `lib/finance/tax-reports.ts`, `app/(chef)/finance/tax-reports/page.tsx`, `components/finance/tax-deduction-tracker.tsx`

---

### 37. Scheduled Financial Alerts

**Problem:** Chef discovers financial issues after the fact.

**What to build:** Overdue payment reminders (7/14/21 day escalation), low cash flow alerts, expense anomaly detection (>3x category average), budget variance warnings, daily payment settlement notifications.
**Files to create:** `lib/finance/financial-alerts.ts`, `app/api/scheduled/financial-alerts/route.ts`

---

## Marketing & Growth

### 10. Photo Portfolio

**Problem:** Event photos live in phone galleries, not connected to events or proposals.

**What to build:** Photo uploads on event detail (drag-and-drop, multi-file), auto-organize by event, tag photos, portfolio page, "include in proposal" toggle, public shareable link.
**Database:** `event_photos` table
**Files to create:** `lib/photos/actions.ts`, `components/events/event-photo-gallery.tsx`, `app/(chef)/portfolio/page.tsx`

---

### 15. Automated Follow-Up Sequences

**Problem:** Post-event follow-up (thank-you, review request, rebooking) is manual.

**What exists:** Campaign sequences UI, email infrastructure, survey auto-send, dormant client detection

**What to build:** Pre-built 5-step post-event sequence (Day 1: thank-you, Day 3: review request, Day 7: photo share, Day 14: rebooking, Day 30: check-in). Visual timeline editor, conditional logic, per-client override, completion analytics.
**Files to create:** `lib/sequences/engine.ts`, `lib/sequences/templates.ts`, `components/marketing/sequence-builder.tsx`

---

### 17. Public Chef Profile & SEO

**Problem:** No public-facing profile on ChefFlow for potential clients.

**What to build:** `app/chef/[slug]/page.tsx` — hero, bio, testimonials, gallery, cuisine badges, inquiry CTA, JSON-LD structured data. Settings page to control what's public.
**Database:** `chefs` table: add `public_slug`, `public_profile_enabled`, `public_bio`, `public_photo_url`

---

## Analytics

### 16. Analytics Drill-Down & Custom Date Ranges

**Problem:** 40+ metrics with fixed 12-month windows, no click-through to underlying data.

**What to build:** Date range picker (presets + custom), comparison mode ("vs previous period"), click-through detail panels, CSV export, threshold alerts.
**Files to create:** `components/analytics/date-range-picker.tsx`, `components/analytics/metric-detail-panel.tsx`, `lib/analytics/export.ts`

---

### 19. Revenue Goal Tracking

**Problem:** Chef sets revenue goals but tracks them in spreadsheets.

**What to build:** Goal setting page (monthly/quarterly/annual), dashboard progress ring with projection, pipeline integration, historical attainment chart.
**Database:** `revenue_goals` table
**Files to create:** `lib/goals/actions.ts`, `components/dashboard/revenue-goal-widget.tsx`, `app/(chef)/settings/goals/page.tsx`

---

## Protection & Compliance

### 50. HACCP Food Safety Plan

**Problem:** Chef legally required to document food safety processes. ChefFlow has zero HACCP support.

**What exists:** Temp logs, incident tracking

**What to build:**

- Guided HACCP form (Critical Control Points, safe temps, monitoring frequency)
- Generates HACCP plan PDF
- Links temp logs to CCPs ("Chicken must reach 165°F within 2 hours")
- Compliance dashboard: "CCP #1: 47 events logged, 0 failures"
- Non-compliance auto-creates incident
- Exportable for regulatory audits

**Database:** `haccp_plans` table, `haccp_ccps` table, `ccp_monitoring_logs` table
**Files to create:** `lib/compliance/haccp-actions.ts`, `app/(chef)/settings/protection/haccp/page.tsx`, `components/compliance/haccp-dashboard.tsx`

---

### 51. Supplier Recall Management

**Problem:** Supplier X has lettuce recall. Chef has no way to know which events are affected.

**What exists:** Vendor directory, event ingredient tracking

**What to build:**

- Vendor table adds `certifications_url`, `last_audit_date`
- `supplier_recalls` table (import or manual entry)
- When recall logged, auto-match against recent event orders → flag affected events
- Auto-create incident (severity=high, links events)
- Dashboard alert + email, 1-click client notification
- Track who was notified + when

**Database:** `supplier_recalls` table
**Files to create:** `lib/vendors/recall-actions.ts`, `components/vendors/recall-alert-panel.tsx`

---

### 52. Crisis Playbook Real-Time Execution

**Problem:** Crisis response page lists steps but no active timer, role assignment, or sign-off during actual crisis.

**What exists:** Crisis playbook page (text-based)

**What to build:**

- When incident marked "critical", activate Crisis Mode: full-screen checklist
- Each step has: owner, deadline (relative to incident time), countdown timer
- Chef checks off steps + adds notes, blocked steps tracked
- System tracks execution time vs recommended
- Generates incident report PDF for insurance/legal

**Files to create:** `components/safety/crisis-execution-modal.tsx`, `lib/safety/crisis-tracker.ts`

---

## Client Portal

### 6. Client Self-Service Portal

**Problem:** Clients can view quotes/invoices but can't act on them.

**What exists:** Client auth, client portal routes, quote/invoice viewing

**What to build:**

- Pick available dates from chef's calendar (read-only)
- Select menu options from preset list
- Confirm/update dietary needs
- E-sign contracts (digital signature)
- Approve quotes directly (moves to accepted)
- Each action notifies chef

**Database:** `quote_approvals`, `client_dietary_updates` tables
**Files to create:** `app/(client)/calendar/page.tsx`, `app/(client)/quotes/[id]/approve/page.tsx`, `components/client/dietary-form.tsx`, `lib/quotes/client-approval.ts`

---

## Settings & Data Management

### 35. Event-Driven Webhook Triggers

**Problem:** 17 integration providers configured but mostly pull-based. No push on event state changes.

**What to build:** Post-transition webhook emitter (fires on every FSM transition), delivery audit trail, webhook management UI.
**Files to create:** `lib/integrations/event-emitter.ts`, `lib/integrations/webhook-audit.ts`, `app/(chef)/settings/integrations/webhooks/page.tsx`
**Files to modify:** `lib/events/transitions.ts`

---

### 39. Audit Trail Viewer

**Problem:** Activity is logged but no UI to browse it.

**What to build:** Filterable audit log page (action type, date, entity, actor), timeline view per entity, CSV export, entity change history sidebar.
**Files to create:** `lib/activity/audit-viewer-actions.ts`, `app/(chef)/admin/audit-log/page.tsx`, `components/activity/entity-change-history.tsx`

---

### 40. Data Archival Strategy

**Problem:** No automated archival. Old completed events clutter queries.

**What to build:** Archive settings, auto-archive by age, archive browser, restore, export before delete.
**Database:** `archived_events`, `archival_policies` tables
**Files to create:** `lib/archival/archive-actions.ts`, `app/(chef)/settings/data-management/page.tsx`, `app/(chef)/admin/archives/page.tsx`

---

### 42. Bulk Data Import

**Problem:** New chef has data in spreadsheets. No import capability.

**What to build:** CSV import wizard with column mapping, preview, validation, rollback, deduplication.
**Files to create:** `lib/imports/csv-importer.ts`, `components/settings/import-wizard.tsx`, `app/(chef)/settings/import/page.tsx`

---

## Coverage Summary

Every section of the site now has at least one improvement planned:

| Area                  | # of Improvements | Key Items                                                                                     |
| --------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| **Global**            | 12                | Dark mode fix, toast feedback, rollback, keyboard, offline, accessibility, search, pagination |
| **Remy AI**           | 2                 | Proactive nudges, conversation-to-action                                                      |
| **Sales**             | 2                 | Scheduling+CRM intelligence, message templates                                                |
| **Clients**           | 3                 | Auto-fill, year-end summary, duplicate detection                                              |
| **Events & Calendar** | 5                 | Recurring events, templates, service dashboard, PDFs, auto-fill                               |
| **Commerce / POS**    | 2                 | Kitchen display system, POS loyalty integration                                               |
| **Culinary**          | 3                 | Recipe versioning, batch prep planner, allergen scoring                                       |
| **Operations**        | 5                 | Equipment dashboard, contracts, staff scheduling, utilization, alerts                         |
| **Vendors**           | 1                 | Price tracking                                                                                |
| **Inventory**         | 1                 | Pantry management                                                                             |
| **Finance**           | 3                 | Cash flow forecast, tax reports, financial alerts                                             |
| **Marketing**         | 3                 | Photo portfolio, follow-up sequences, public profile                                          |
| **Analytics**         | 2                 | Drill-down, revenue goals                                                                     |
| **Protection**        | 3                 | HACCP, supplier recalls, crisis playbook                                                      |
| **Client Portal**     | 1                 | Self-service portal                                                                           |
| **Settings**          | 4                 | Webhooks, audit trail, archival, bulk import                                                  |

---

## Recommended Build Order

| #   | Feature                                | Area          | Why                                 | Effort |
| --- | -------------------------------------- | ------------- | ----------------------------------- | ------ |
| 1   | **Dark Mode Fix** (21)                 | Global        | Visible bug, mechanical fix         | XS     |
| 2   | **Toast Feedback** (22)                | Global        | Zero Hallucination Rule             | XS     |
| 3   | **Optimistic Rollback** (23)           | Global        | Zero Hallucination Rule             | S      |
| 4   | **Recurring Events + Templates** (2+3) | Events        | Eliminates most repetitive work     | M      |
| 5   | **Smart Auto-Fill** (4)                | Events        | Quick win, no migration             | S      |
| 6   | **Equipment Dashboard** (11)           | Operations    | Backend 100% done, just UI          | S      |
| 7   | **Contract Library** (12)              | Operations    | Backend done, needs UI              | S-M    |
| 8   | **Status Color Registry** (25)         | Global        | Quick consistency win               | XS     |
| 9   | **Date Formatting** (24)               | Global        | Prevents timezone bugs              | S      |
| 10  | **Notification Triggers** (36)         | Global        | Fires existing notifications        | S      |
| 11  | **Recipe Versioning** (47)             | Culinary      | Prevents cost drift on old events   | S      |
| 12  | **Keyboard Power-User** (1)            | Global        | Desktop speed boost                 | S      |
| 13  | **Revenue Goals** (19)                 | Analytics     | Business-critical visibility        | S      |
| 14  | **Message Templates** (18)             | Sales         | Reduces daily typing                | S      |
| 15  | **Error Boundaries** (26)              | Global        | Crash resilience                    | XS     |
| 16  | **Proactive Remy Nudges** (43)         | Remy AI       | Turns AI from reactive to proactive | M      |
| 17  | **Accessibility Fixes** (27)           | Global        | Inclusive design                    | S      |
| 18  | **HACCP Plan** (50)                    | Protection    | Regulatory compliance               | M      |
| 19  | **Tax Reports** (31)                   | Finance       | Accountant handoff                  | M      |
| 20  | **Event PDFs** (32)                    | Events        | Client deliverables                 | M      |
| 21  | **KDS** (45)                           | Commerce      | Live kitchen operations             | M      |
| 22  | **Staff Scheduling** (13)              | Operations    | Operational efficiency              | M      |
| 23  | **Follow-Up Sequences** (15)           | Marketing     | Revenue recovery                    | M      |
| 24  | **Cash Flow Forecast** (5)             | Finance       | Financial planning                  | M      |
| 25  | **Financial Alerts** (37)              | Finance       | Proactive money management          | S      |
| 26  | **Analytics Drill-Down** (16)          | Analytics     | Makes 40+ metrics actionable        | M      |
| 27  | **Batch Prep Planner** (48)            | Culinary      | Reduces duplicate labor             | M      |
| 28  | **In-Page Search** (28)                | Global        | List page usability                 | M      |
| 29  | **Pagination** (30)                    | Global        | Performance at scale                | M      |
| 30  | **Staff Utilization** (34)             | Operations    | Labor cost visibility               | M      |
| 31  | **POS Loyalty** (46)                   | Commerce      | Loyalty integration                 | S      |
| 32  | **Allergen Scoring** (49)              | Culinary      | Food safety (allergies!)            | M      |
| 33  | **Client Self-Service** (6)            | Client Portal | Scales the business                 | L      |
| 34  | **Webhook Triggers** (35)              | Settings      | Automation backbone                 | M      |
| 35  | **Public Profile** (17)                | Marketing     | Client acquisition                  | M      |
| 36  | **Supplier Recalls** (51)              | Protection    | Food safety                         | M      |
| 37  | **Client Statements** (33)             | Clients       | Client retention                    | S      |
| 38  | **Service Dashboard** (14)             | Events        | During-service ops                  | M      |
| 39  | **Operational Alerts** (38)            | Operations    | Proactive maintenance               | S      |
| 40  | **Remy Conversation-to-Action** (44)   | Remy AI       | AI value multiplier                 | M      |
| 41  | **Audit Trail** (39)                   | Settings      | Compliance + debugging              | M      |
| 42  | **Crisis Playbook** (52)               | Protection    | Emergency response                  | M      |
| 43  | **Offline-First** (7)                  | Global        | Kitchen reliability                 | L      |
| 44  | **Scheduling Intelligence** (8)        | Sales         | Proactive revenue                   | M      |
| 45  | **Vendor Pricing** (9)                 | Vendors       | Cost optimization                   | M      |
| 46  | **Photo Portfolio** (10)               | Marketing     | Marketing + proposals               | M      |
| 47  | **Duplicate Detection** (41)           | Clients       | Data quality                        | S      |
| 48  | **Bulk Import** (42)                   | Settings      | Onboarding new chefs                | M      |
| 49  | **Archival Strategy** (40)             | Settings      | Long-term data management           | M      |
| 50  | **Inventory/Pantry** (20)              | Inventory     | Waste reduction                     | L      |
| 51  | **Loading States** (29)                | Global        | Polish                              | XS     |

---

## Notes

- Features 2+3 (Recurring Events + Templates) should be built together — same form infrastructure
- Features 21-23 (Dark Mode, Toast, Rollback) are Zero Hallucination Rule compliance — fix before new features
- Feature 4 (Auto-Fill) requires no database migration — pure read from existing data
- Feature 6 (Client Self-Service) is the biggest scope but highest long-term leverage
- Features 43+44 (Remy Nudges + Conversation-to-Action) transform AI from passive to proactive
- Features 50-52 (HACCP, Recalls, Crisis) are regulatory/safety — high urgency for catering chefs
- All database changes are additive (new tables/columns only) — no destructive operations
- **Effort key:** XS = <1hr, S = 1-3hr, S-M = 3-5hr, M = 5-10hr, L = 10-20hr
