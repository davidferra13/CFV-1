# Chef Portal — Next Improvements Roadmap

**Created:** 2026-02-28
**Status:** Planning — not yet started
**Context:** Written after completing the 14 QoL features (`docs/qol-14-features.md`). These are the next highest-impact improvements identified from a full codebase review.

---

## Tier 1 — High Impact, Moderate Effort

### 1. Keyboard Power-User Mode

**Problem:** Chefs on desktop have Cmd+K (search) and Ctrl+Shift+E (expense) but no comprehensive keyboard navigation. Power users lose time reaching for the mouse.

**What exists:**

- `Cmd+K` global search in `components/search/global-search.tsx`
- `Ctrl+Shift+E` quick expense in `components/expenses/quick-expense-trigger.tsx`
- Keyboard shortcut registration pattern in `app/(chef)/layout.tsx`

**What to build:**

- `?` key opens a keyboard shortcuts help overlay (modal listing all shortcuts)
- Vim-style go-to navigation: `g e` → Events, `g c` → Clients, `g d` → Dashboard, `g f` → Finance, `g i` → Inquiries, `g q` → Quotes, `g r` → Recipes, `g s` → Settings
- Arrow keys to navigate table rows, Enter to open selected row
- `Escape` to close any modal/drawer/panel
- Shortcuts registry: `lib/keyboard/shortcuts.ts` — central definition, consumed by help overlay and listener

**Files to create:**

- `lib/keyboard/shortcuts.ts` — shortcut registry (key combo, label, action, category)
- `components/ui/keyboard-help-modal.tsx` — `?` key overlay showing all shortcuts
- `hooks/use-keyboard-shortcuts.ts` — global listener with chord support (g+e = two keystrokes)

**Files to modify:**

- `app/(chef)/layout.tsx` — register global listener

---

### 2. Recurring Events

**Problem:** Many private chefs have weekly clients (Sunday meal prep, Thursday family dinner). Every instance is created manually — massive repetitive work.

**What exists:**

- Event form: `components/events/event-form.tsx`
- Event creation: `lib/events/actions.ts` (`createEvent()`)
- Event FSM: `lib/events/transitions.ts` (8-state lifecycle)
- Calendar: `app/(chef)/calendar/` (month/week/day views)

**What to build:**

- Add recurrence rule to event form: frequency (weekly/biweekly/monthly), end condition (after N occurrences / until date / indefinitely)
- `lib/events/recurrence.ts` — recurrence engine:
  - `generateOccurrences(rule, startDate, endDate)` → date array
  - `createRecurringEventSeries(eventData, rule)` — creates parent + child events
  - Parent event stores the rule; children reference `parent_event_id`
- Edit options: "Edit this event only" vs "Edit all future events in series"
- Calendar shows recurring events with a small repeat icon
- Cancel one occurrence without cancelling the series

**Database changes (additive):**

- `events` table: add `recurrence_rule jsonb`, `parent_event_id uuid references events(id)`, `is_recurring boolean default false`

**Files to create:**

- `lib/events/recurrence.ts` — recurrence rule engine
- `components/events/recurrence-picker.tsx` — UI for setting recurrence in event form

**Files to modify:**

- `components/events/event-form.tsx` — add recurrence picker section
- `lib/events/actions.ts` — handle recurring event creation
- Calendar components — show repeat icon on recurring events

---

### 3. Event Templates

**Problem:** "Corporate lunch for 20" has the same menu, timeline, staff configuration every time. Chef re-enters everything from scratch.

**What exists:**

- Event form: `components/events/event-form.tsx` (complex, many fields)
- Event creation: `lib/events/actions.ts`
- Menu association: events link to menus
- Staff assignment: `components/events/event-staff-panel.tsx`

**What to build:**

- "Save as Template" button on any existing event detail page
- Templates page: `app/(chef)/events/templates/page.tsx` — list saved templates
- "Create from Template" option on events/new — dropdown to pick template, pre-fills all fields
- Template stores: occasion type, default guest count, menu ID, staff roles needed, prep timeline defaults, notes, cuisine type
- Templates are tenant-scoped, editable, deletable

**Database changes (additive):**

- New table: `event_templates` (id, tenant_id, name, template_data jsonb, created_at, updated_at)

**Files to create:**

- `lib/events/template-actions.ts` — CRUD for templates
- `app/(chef)/events/templates/page.tsx` — template list page
- `components/events/template-picker.tsx` — dropdown for "Create from Template"
- `components/events/save-as-template-button.tsx` — button on event detail

**Files to modify:**

- `app/(chef)/events/[id]/page.tsx` — add "Save as Template" button
- `components/events/event-form.tsx` — accept template pre-fill data

---

### 4. Smart Auto-Fill for Returning Clients

**Problem:** When creating a new event for a client who's booked 5 times before, the chef still manually enters dietary restrictions, typical guest count, cuisine preferences, and budget range.

**What exists:**

- Client profile: `app/(chef)/clients/[id]/page.tsx` — stores dietary notes, tags, history
- Event history per client: queryable from events table filtered by client_id
- Client selection in event form: `components/events/event-form.tsx`

**What to build:**

- When a client is selected in the event form, auto-fetch their last 3 events
- Pre-fill (with visual "auto-filled" badges so chef knows what came from history):
  - Dietary restrictions / allergies (from client profile)
  - Typical guest count (mode of last 3 events)
  - Cuisine preferences (most common from history)
  - Budget range (average quoted price from history)
  - Preferred venue/location (if consistent)
- Chef can override any auto-filled field
- `lib/clients/auto-fill.ts` — server action: `getClientAutoFill(clientId)` → `AutoFillData`

**Files to create:**

- `lib/clients/auto-fill.ts` — fetches client history and computes defaults
- `components/events/auto-fill-badge.tsx` — small "Auto-filled" indicator on fields

**Files to modify:**

- `components/events/event-form.tsx` — on client selection, fetch auto-fill data and populate fields

---

## Tier 2 — Strategic, Larger Effort

### 5. Cash Flow Forecasting

**Problem:** The ledger system is solid but backward-looking. Chef can't answer "Will I have enough cash in 30 days?" without manual math.

**What exists:**

- Ledger system: `lib/ledger/append.ts`, `lib/ledger/compute.ts` — immutable, append-only
- Financial summary: `getTenantFinancialSummary()` — current totals
- Event financial view: `event_financial_summary` — per-event P&L
- Dashboard: revenue/expense widgets already exist

**What to build:**

- `lib/analytics/cash-flow-forecast.ts`:
  - Inputs: upcoming events (with quoted prices + expected payment dates), recurring expenses, historical payment timing patterns
  - Output: 30/60/90-day projected cash position, day-by-day forecast line
  - Flag: "Cash drops below $X on [date]" warning threshold (configurable)
- `components/finance/cash-flow-forecast-chart.tsx` — line chart showing projected vs actual
- Add to finance dashboard or as a standalone page `/finance/forecast`

**Files to create:**

- `lib/analytics/cash-flow-forecast.ts` — forecast computation
- `components/finance/cash-flow-forecast-chart.tsx` — visualization
- `app/(chef)/finance/forecast/page.tsx` — dedicated forecast page

---

### 6. Client Self-Service Portal

**Problem:** Clients can view quotes/invoices but can't act on them. Every decision requires back-and-forth messages with the chef.

**What exists:**

- Client auth: `requireClient()` in `lib/auth/get-user.ts`
- Client portal: `app/(client)/` routes
- Quote viewing: clients can see quotes
- Invoice viewing: clients can see invoices
- Embeddable inquiry widget: `public/embed/chefflow-widget.js`

**What to build:**

- Client can pick available dates from chef's calendar (read-only view of open dates)
- Client can select menu options from a preset list (chef defines options per event/quote)
- Client can confirm/update dietary needs for their party
- Client can e-sign contracts (digital signature capture)
- Client can approve quotes directly (moves quote to accepted state)
- Each action notifies the chef via the existing notification system

**Database changes (additive):**

- `quote_approvals` table (quote_id, approved_by, approved_at, signature_data, ip_address)
- `client_dietary_updates` table (client_id, updated_fields jsonb, updated_at)

**Files to create:**

- `app/(client)/calendar/page.tsx` — read-only availability view
- `app/(client)/quotes/[id]/approve/page.tsx` — quote approval + signature
- `components/client/dietary-form.tsx` — self-service dietary update
- `lib/quotes/client-approval.ts` — server action for client-side quote approval

---

### 7. Offline-First for Kitchen Use

**Problem:** Chefs are in kitchens with spotty WiFi. Page loads fail, data doesn't save, prep timelines disappear mid-cook.

**What exists:**

- PWA manifest: `public/manifest.json`
- `useDurableDraft` uses IndexedDB for form data persistence
- `components/offline/offline-nav-indicator.tsx` — shows offline status in nav
- Service worker: basic setup exists

**What to build:**

- Cache critical read-only data in IndexedDB on each successful fetch:
  - Today's schedule
  - Active recipes (ingredients + instructions)
  - Prep timelines for upcoming events
  - Grocery lists
- Service worker intercepts failed network requests, serves cached data
- Visual indicator: "Offline — showing cached data from [time]"
- Queue mutations (expense logging, task completion) in IndexedDB, sync when back online
- `lib/offline/cache-manager.ts` — manages IndexedDB cache with TTL and versioning

**Files to create:**

- `lib/offline/cache-manager.ts` — IndexedDB cache layer
- `lib/offline/sync-queue.ts` — offline mutation queue
- `public/sw.js` — enhanced service worker with cache-first strategy for critical routes

---

## Tier 3 — Polish & Intelligence

### 8. Scheduling + CRM Intelligence

**Problem:** Calendar gaps and dormant clients are detected separately. No proactive connection between "you have free time" and "these clients might book."

**What exists:**

- Dormant client detection: `lib/clients/dormancy.ts` (`getDormantClients()`)
- Scheduling gaps: `lib/scheduling/prep-block-actions.ts` (`getSchedulingGaps()`)
- Campaign outreach: `lib/ai/campaign-outreach.ts`
- Queue system: `lib/queue/` — prioritized action items

**What to build:**

- `lib/intelligence/scheduling-crm.ts`:
  - Detect calendar gaps (3+ consecutive days with no events)
  - Cross-reference with dormant clients (no booking in 60+ days)
  - Generate suggestions: "You have a gap Mar 15-18. Client X hasn't booked in 72 days and their last event was a similar season."
  - Rank by: client lifetime value, recency, booking likelihood
- Surface suggestions in: dashboard widget, queue items, calendar gap overlay
- One-click: "Reach out to Client X" → opens draft message with context

**Files to create:**

- `lib/intelligence/scheduling-crm.ts` — gap + dormancy cross-reference engine
- `components/dashboard/scheduling-suggestion-widget.tsx` — dashboard card

---

### 9. Vendor Price Tracking

**Problem:** Chef buys from multiple vendors but has no visibility into price trends. Can't answer "Is Vendor Y still the cheapest for produce?"

**What exists:**

- Vendor system: `app/(chef)/vendors/` — vendor list, detail pages
- Vendor invoices: `app/(chef)/vendors/invoices/` — invoice tracking
- Price comparison: `app/(chef)/vendors/price-comparison/` — basic comparison page
- Grocery quote: `lib/grocery/pricing-actions.ts` — ingredient pricing via APIs

**What to build:**

- `lib/vendors/price-history.ts`:
  - Track price per ingredient per vendor over time (from invoice line items)
  - `getPriceHistory(ingredientName, vendorId, period)` → price trend
  - `getCheapestVendor(ingredientName)` → vendor + current price
  - `getPriceAlerts()` → ingredients where price increased >10% vs 30-day average
- Price history chart on vendor detail page
- "Best price" badge on ingredient rows in grocery quote
- Monthly price report: "You saved/overspent $X this month vs optimal vendor choices"

**Database changes (additive):**

- `vendor_price_history` table (id, tenant_id, vendor_id, ingredient_name, unit_price_cents, unit, recorded_at)

**Files to create:**

- `lib/vendors/price-history.ts` — price tracking + analysis
- `components/vendors/price-trend-chart.tsx` — sparkline/chart per ingredient

---

### 10. Photo Portfolio

**Problem:** Chefs can't showcase their work within the platform. Event photos, plated dishes, and setup shots live in phone galleries, not connected to events or proposals.

**What exists:**

- Supabase Storage: configured and available
- Event detail page: `app/(chef)/events/[id]/page.tsx` — has tabs but no photo section
- Receipt uploads: `components/expenses/expense-form.tsx` — file upload pattern exists

**What to build:**

- Photo uploads on event detail page (drag-and-drop, multi-file)
- Auto-organize by event (gallery per event)
- Tag photos: "plated", "setup", "team", "venue", "action"
- Portfolio page: `app/(chef)/portfolio/page.tsx` — curated gallery of best shots
- "Include in proposal" toggle — selected photos appear in quotes sent to clients
- Public portfolio view (optional): `/chef/[slug]/portfolio` — shareable link

**Database changes (additive):**

- `event_photos` table (id, tenant_id, event_id, storage_path, caption, tags text[], is_portfolio boolean, sort_order, created_at)

**Files to create:**

- `lib/photos/actions.ts` — upload, tag, reorder, portfolio toggle
- `components/events/event-photo-gallery.tsx` — upload + grid on event detail
- `app/(chef)/portfolio/page.tsx` — curated portfolio page
- `components/portfolio/portfolio-grid.tsx` — masonry/grid layout

---

## Tier 4 — Backend-Ready, Zero UI (Fastest Wins)

These features have **complete backend logic** but no UI pages. Building the frontend is straightforward since the data layer already works.

### 11. Equipment Management Dashboard

**Problem:** Chef owns knives, mixers, sous vide machines, chafing dishes. No way to see what they have, what needs maintenance, or what's depreciating.

**What exists (100% backend, 0% UI):**

- `lib/equipment/actions.ts` — full CRUD: create, update, deactivate equipment
- `lib/equipment/depreciation-actions.ts` — straight-line, declining balance, units-of-production depreciation
- `lib/equipment/depreciation-constants.ts` — method options
- Maintenance interval scheduling (days-based) with `logMaintenance()` action
- Monthly depreciation expense calculation
- Equipment rental cost per event attribution

**What to build:**

- `app/(chef)/equipment/page.tsx` — equipment roster grid (name, category, purchase date, current value, next maintenance)
- `app/(chef)/equipment/[id]/page.tsx` — detail page (depreciation schedule chart, maintenance history, event usage log)
- Maintenance calendar: upcoming maintenance alerts in dashboard queue
- "Equipment Cost per Event" column in event financial summary
- Quick-add form for new equipment purchases

**Database:** Already exists — just needs UI.

---

### 12. Contract & Document Library

**Problem:** Chef generates contracts but has nowhere to manage them. No template library, no signing status, no archive.

**What exists (backend only):**

- `lib/contracts/actions.ts` — contract generation engine
- `lib/contracts/advanced-contracts.ts` — specialized contract types
- `lib/ai/contract-generator.ts` — AI-assisted contract drafting (Ollama)
- Staff contractor agreements: `lib/staff/contractor-agreement-actions.ts`

**What to build:**

- `app/(chef)/documents/contracts/page.tsx` — contract library (filterable by status: draft, sent, signed, expired)
- `app/(chef)/documents/contracts/templates/page.tsx` — reusable contract templates
- Contract detail page: view generated contract, track sent/viewed/signed status
- "Send for Signature" flow: email contract link to client → client views → e-signature capture
- PDF export of signed contracts
- Connect to client self-service portal (Feature 6) for client-side signing

**Database changes (additive):**

- `contracts` table (id, tenant_id, event_id, client_id, template_id, content text, status, sent_at, viewed_at, signed_at, signature_data jsonb)

---

## Tier 5 — Operational Excellence

### 13. Staff Shift Scheduling

**Problem:** Chef has 3-5 staff members. Assigning them to events is manual — check each person's availability, text them, hope they reply. No visual schedule.

**What exists:**

- Staff roster: `app/(chef)/staff/page.tsx` — name, role, hourly rate, status
- Staff availability: `lib/staff/availability-actions.ts` — availability windows
- Event staff panel: `components/events/event-staff-panel.tsx` — assign staff to events
- Performance scoring: `lib/staff/performance-actions.ts`
- Labor cost tracking: `lib/staff/labor-dashboard-actions.ts`

**What to build:**

- `app/(chef)/staff/schedule/page.tsx` — visual weekly schedule (Gantt-style or grid)
  - Rows: staff members. Columns: days. Cells: assigned events with time blocks
  - Drag-assign staff to events (reuse @dnd-kit)
  - Color-code by role (sous chef = blue, server = green, etc.)
  - Conflict detection: highlight when someone is double-booked
- Availability overlay: grey out times when staff marked unavailable
- "Who's free on [date]?" quick check — filters available staff for a given event date
- Shift confirmation: send assignment notification → staff confirms/declines via app or text
- Labor cost projection: show total labor cost for upcoming week based on assignments

**Database changes (additive):**

- `staff_shift_assignments` table (id, tenant_id, staff_id, event_id, shift_start, shift_end, status: assigned/confirmed/declined, confirmed_at)

---

### 14. Service-Time Operations Dashboard

**Problem:** During an actual event service, chef needs a live view: what station is working on what, temps logged, items 86'd, timeline progress. Currently scattered across pages.

**What exists:**

- Station clipboard: `app/(chef)/stations/[id]/clipboard/` — per-station item tracking
- Ops log: `app/(chef)/stations/ops-log/page.tsx` — append-only action log
- KDS (Kitchen Display System): exists at event level (`app/(chef)/events/[id]/kds/`)
- 86'd item tracking: `lib/stations/clipboard-actions.ts`
- Temp logging: `components/events/temp-log-panel.tsx`
- Prep timeline: event prep timeline exists

**What to build:**

- `app/(chef)/events/[id]/live/page.tsx` — unified service dashboard for an active event
  - Station status cards (each station: current items, 86'd count, last update time)
  - Temp log sidebar (last 5 readings, alerts if out of range)
  - Timeline progress bar (prep → setup → service → breakdown → cleanup)
  - Quick actions: log temp, 86 an item, mark station complete, log waste
  - Auto-refresh every 30s (or Supabase Realtime subscription)
- "Go Live" button on event detail page (appears when event is in `in_progress` status)
- Mobile-optimized: designed for phone use during service

---

### 15. Automated Follow-Up Sequences

**Problem:** After an event, chef should: send thank-you (day 1) → request review (day 3) → suggest rebooking (day 14). Currently manual.

**What exists:**

- Campaign sequences: `app/(chef)/marketing/sequences/` — sequence UI exists
- Email infrastructure: `lib/email/` — send engine
- Survey auto-send on event completion
- Testimonial collection from surveys
- Dormant client detection: `lib/clients/dormancy.ts`

**What to build:**

- Pre-built post-event sequence template:
  1. Day 1: Thank-you email (personalized with event details)
  2. Day 3: Review request (link to survey if not already sent, or Google review link)
  3. Day 7: Photo gallery share (if photos attached to event)
  4. Day 14: "Book your next event" with seasonal menu suggestions
  5. Day 30: Check-in if no response
- Sequence builder: visual timeline editor (drag to reorder, set delays, add/remove steps)
- Conditional logic: skip step 2 if client already left a review, skip step 4 if they already rebooked
- Per-client override: pause sequence for specific clients
- Analytics: sequence completion rates, which step drives the most rebookings

**Files to create:**

- `lib/sequences/engine.ts` — sequence execution engine (cron-based or serverless function)
- `lib/sequences/templates.ts` — pre-built sequence templates
- `components/marketing/sequence-builder.tsx` — visual timeline editor

---

### 16. Analytics Drill-Down & Custom Date Ranges

**Problem:** Analytics page has 40+ metrics but they're all fixed 12-month windows with no way to click through to underlying data.

**What exists:**

- 9-tab analytics hub: `app/(chef)/analytics/page.tsx`
- 40+ metric queries across `lib/analytics/`
- Client retention, churn, acquisition, pipeline, revenue, culinary, operations, marketing, social metrics

**What to build:**

- **Date range picker** at top of analytics page: preset ranges (This Month, Last Quarter, YTD, Last Year, Custom) + custom date picker
- **Comparison mode**: toggle "Compare to previous period" — shows delta arrows and % change
- **Click-through**: clicking any metric card opens a detail panel showing the underlying data rows
  - Revenue per hour → list of events sorted by hourly rate with drill-down to event detail
  - Client churn → list of churned clients with last booking date and reach-out button
  - Ghost rate → list of ghosted inquiries with follow-up actions
- **CSV export**: "Export" button on any metric or the entire dashboard
- **Alerts**: set threshold on any metric (e.g., "Alert me if ghost rate exceeds 30%") — notification via existing system

**Files to create:**

- `components/analytics/date-range-picker.tsx` — period selector with presets
- `components/analytics/metric-detail-panel.tsx` — slide-out panel showing underlying data
- `lib/analytics/export.ts` — CSV generation for any metric dataset

---

## Tier 6 — Growth & Client Experience

### 17. Public Chef Profile & SEO

**Problem:** Chef has no public-facing profile on ChefFlow. Potential clients can't find or evaluate them without external tools.

**What exists:**

- Embeddable inquiry widget: `public/embed/chefflow-widget.js`
- Testimonial collection system (approved testimonials ready for display)
- Chef bio generation: `lib/ai/chef-bio.ts`
- Review aggregation from external platforms
- Partner showcase visibility toggle

**What to build:**

- `app/chef/[slug]/page.tsx` — public chef profile page (no auth required)
  - Hero: name, photo, tagline, specialties, location
  - Bio section (from AI-generated or manual bio)
  - Testimonials carousel (approved testimonials)
  - Photo gallery (from portfolio — Feature 10)
  - Cuisine/event type badges
  - Inquiry CTA button (links to embed form or direct inquiry)
  - Structured data (JSON-LD) for Google rich results
- `app/(chef)/settings/profile/public/page.tsx` — control what's visible on public profile
- SEO: meta tags, OG image per chef, sitemap.xml inclusion
- Vanity URL: `cheflowhq.com/chef/[slug]`

**Database changes (additive):**

- `chefs` table: add `public_slug text unique`, `public_profile_enabled boolean default false`, `public_bio text`, `public_photo_url text`

---

### 18. Client Communication Templates & Quick Replies

**Problem:** Chef types similar messages repeatedly: booking confirmations, menu proposals, payment reminders, event-day logistics. No reusable templates.

**What exists:**

- Unified inbox: `app/(chef)/inbox/page.tsx`
- Email send infrastructure: `lib/email/`
- Client notes and follow-ups
- AI draft capabilities (Remy can draft messages)

**What to build:**

- `app/(chef)/settings/templates/page.tsx` — manage reusable message templates
  - Categories: Booking, Menu, Payment, Logistics, Follow-Up, Thank You
  - Dynamic variables: `{{client_name}}`, `{{event_date}}`, `{{quoted_price}}`, `{{menu_name}}`
  - Preview with real data before sending
- Quick-reply picker in inbox: when composing a reply, dropdown of templates
- "Save as Template" on any sent message
- AI assist: "Personalize this template for [client]" using Remy

**Files to create:**

- `lib/templates/message-template-actions.ts` — CRUD for message templates
- `components/inbox/template-picker.tsx` — dropdown in compose area
- `app/(chef)/settings/templates/page.tsx` — template management page

**Database changes (additive):**

- `message_templates` table (id, tenant_id, name, category, subject, body, variables jsonb, usage_count, created_at)

---

### 19. Revenue Goal Tracking

**Problem:** Chef sets annual/monthly revenue goals but has no way to track progress within ChefFlow. They use spreadsheets or gut feel.

**What exists:**

- Revenue data: `getTenantFinancialSummary()` — actual revenue from ledger
- Pipeline forecast: `lib/pipeline/forecast.ts` — projected revenue from pipeline
- Dashboard revenue widgets
- Event financial summary views

**What to build:**

- `app/(chef)/settings/goals/page.tsx` — set monthly/quarterly/annual revenue goals
- Dashboard widget: progress ring showing actual vs goal with projection line
  - "You're at 67% of your March goal with 12 days remaining"
  - "At current pace, you'll hit $X by month end" (extrapolation)
  - Color coding: green (on track), amber (behind but recoverable), red (significantly behind)
- Pipeline integration: show how much confirmed + proposed revenue could close the gap
- Historical view: month-by-month goal attainment chart
- Stretch goals: optional "stretch" target above base goal

**Database changes (additive):**

- `revenue_goals` table (id, tenant_id, period_type: monthly/quarterly/annual, period_start date, target_amount_cents, stretch_amount_cents, created_at)

**Files to create:**

- `lib/goals/actions.ts` — goal CRUD + progress computation
- `components/dashboard/revenue-goal-widget.tsx` — progress ring for dashboard
- `app/(chef)/settings/goals/page.tsx` — goal setting page

---

### 20. Inventory & Pantry Management

**Problem:** Chef buys ingredients for events but doesn't track what's in stock. Buys duplicates, throws out expired items, can't plan across events.

**What exists:**

- Grocery quote system: `lib/grocery/pricing-actions.ts` — ingredient lists per event
- Recipe ingredients: stored in recipes table
- Vendor system: vendor + pricing data

**What to build:**

- `app/(chef)/pantry/page.tsx` — current pantry inventory
  - Categories: proteins, produce, dairy, dry goods, spices, beverages
  - Per item: name, quantity, unit, expiration date, location (fridge/freezer/pantry), cost
  - Low stock alerts (configurable par levels per item)
  - Expiration warnings (items expiring within 3 days highlighted)
- Auto-deduct: when event moves to `in_progress`, deduct planned ingredients from pantry
- Auto-suggest: when creating grocery list for an event, show "You already have X in stock"
- Barcode scanning (mobile): scan product barcode to quick-add to pantry
- Waste connection: when waste is logged at a station, deduct from pantry and track waste cost

**Database changes (additive):**

- `pantry_items` table (id, tenant_id, name, category, quantity, unit, par_level, expiration_date, location, cost_per_unit_cents, last_restocked_at)
- `pantry_transactions` table (id, tenant_id, pantry_item_id, event_id, type: restock/deduct/waste/adjust, quantity, note, created_at)

---

## Recommended Build Order (Updated)

| Priority | Feature                                  | Why                                          | Effort       |
| -------- | ---------------------------------------- | -------------------------------------------- | ------------ |
| 1        | **Recurring Events + Templates** (2 & 3) | Eliminates most repetitive daily work        | Medium       |
| 2        | **Smart Auto-Fill** (4)                  | Quick win, no migration needed               | Small        |
| 3        | **Equipment Dashboard** (11)             | Backend 100% done, just needs UI             | Small        |
| 4        | **Contract Library** (12)                | Backend mostly done, needs UI + signing      | Small-Medium |
| 5        | **Keyboard Power-User** (1)              | Desktop speed boost                          | Small        |
| 6        | **Revenue Goal Tracking** (19)           | Business-critical visibility                 | Small        |
| 7        | **Message Templates** (18)               | Reduces daily typing                         | Small        |
| 8        | **Staff Shift Scheduling** (13)          | Operational efficiency for multi-staff chefs | Medium       |
| 9        | **Automated Follow-Up Sequences** (15)   | Revenue recovery on autopilot                | Medium       |
| 10       | **Cash Flow Forecast** (5)               | Financial planning                           | Medium       |
| 11       | **Analytics Drill-Down** (16)            | Makes existing 40+ metrics actionable        | Medium       |
| 12       | **Client Self-Service** (6)              | Scales the business                          | Large        |
| 13       | **Public Chef Profile** (17)             | Client acquisition channel                   | Medium       |
| 14       | **Service-Time Dashboard** (14)          | During-service operations                    | Medium       |
| 15       | **Offline-First** (7)                    | Kitchen reliability                          | Large        |
| 16       | **Scheduling Intelligence** (8)          | Proactive revenue                            | Medium       |
| 17       | **Vendor Pricing** (9)                   | Cost optimization                            | Medium       |
| 18       | **Photo Portfolio** (10)                 | Marketing + proposals                        | Medium       |
| 19       | **Inventory/Pantry** (20)                | Waste reduction + planning                   | Large        |

---

## Tier 7 — UX Hardening & Polish

These improvements fix inconsistencies, accessibility gaps, and feedback holes found during a deep codebase audit. No new features — just making existing features bulletproof.

### 21. Dark Mode Consistency Fix

**Problem:** ~6 files use hardcoded light-theme colors (`bg-gray-50`, `bg-gray-100`, `text-gray-900`, `border-gray-300`) that break the dark theme.

**Affected files:**

- `app/(chef)/calls/page.tsx` — `text-gray-900`, `bg-gray-50`, light blue buttons
- `app/(chef)/calls/[id]/page.tsx` — `text-gray-900`, `text-gray-800`, `text-blue-600`
- `app/(chef)/calls/[id]/edit/page.tsx` — same light colors
- `app/(chef)/calendar/week/week-planner-client.tsx` — `bg-gray-50`, `border-gray-300`, input fields with light borders
- `app/(chef)/calendar/year/year-view-client.tsx` — `bg-gray-50`, `hover:bg-gray-100`, `text-gray-900`
- Status pills in calls: `bg-gray-100 text-gray-600` and `bg-gray-100 text-gray-400` for completed/cancelled

**Fix:** Replace all `gray-50/100/200/300` backgrounds with `stone-800/900`, all `gray-800/900` text with `stone-100/200`, all `gray-300` borders with `stone-600/700`. Match the rest of the app's dark palette.

**Effort:** Small (~2 hours, 50+ replacements across 6 files)

---

### 22. Toast Feedback on All Server Actions

**Problem:** ~10-15 `startTransition` calls catch errors silently — `console.error(err)` with no user-facing toast. User sees loading state disappear but no indication the action failed.

**Pattern found in:**

- `components/calls/call-status-actions.tsx` — call status update failures
- `app/(chef)/calendar/week/week-planner-client.tsx` — prep block toggle, auto-schedule
- Multiple other transition-based operations across the codebase

**Fix:** Add `toast.error('Failed to [action]')` to every `catch` block in `startTransition`. Also add `toast.success()` on successful mutations where missing.

**Effort:** Small (~1-2 hours, mechanical find-and-fix)

---

### 23. Optimistic Update Rollback

**Problem:** ~5-8 functions modify local state optimistically before calling server actions, but don't rollback on failure. If the server call fails, UI shows stale data.

**Example:** `toggleComplete()` in week-planner-client.tsx modifies the prep block state, but if `completePrepBlock()` fails, the UI still shows it as completed.

**Fix:** Save previous state before mutation, restore it in the catch block. Pattern: `const previous = state; setState(optimistic); try { await action() } catch { setState(previous); toast.error() }`

**Effort:** Small (~2-3 hours)

---

### 24. Centralized Date Formatting

**Problem:** 20+ files use inconsistent date format strings. Some use `format(new Date(), 'EEEE, MMM d, yyyy')`, others use `toLocaleDateString('en-US', ...)`, others use `parseISO()` + `format()`. No timezone handling.

**Fix:** Create `lib/date/format-helpers.ts` with standardized formatters:

- `formatEventDate(date)` — "Saturday, Mar 5, 2026"
- `formatShortDate(date)` — "Mar 5"
- `formatTime(date)` — "2:30 PM"
- `formatRelative(date)` — "2 hours ago"
- `formatDateRange(start, end)` — "Mar 5 – Mar 7, 2026"

Then find/replace across 20+ call sites.

**Effort:** Small-Medium (~1 hour for helper, ~2 hours for migration)

---

### 25. Centralized Status Color Registry

**Problem:** Status indicator colors are defined ad-hoc in each component. Calls use one color map, prep blocks use another, events use a third. Duplicated and inconsistent.

**Fix:** Create `lib/ui/status-colors.ts` that exports one canonical color mapping for every status type (event status, call status, prep block type, payment status, etc.). All components import from this single source.

**Effort:** Small (~1 hour)

---

### 26. Missing Error Boundaries

**Problem:** 17 `error.tsx` files exist, but deep route segments lack them. If a component crashes in `/calendar/week/` or `/finance/payroll/`, the entire chef layout error boundary catches it — losing all navigation context.

**Missing route segments:**

- `app/(chef)/calendar/day/`
- `app/(chef)/calendar/week/`
- `app/(chef)/finance/` subsections (payroll, expenses, reports)
- `app/(chef)/operations/` subsections
- `app/(chef)/vendors/` subsections

**Fix:** Add `error.tsx` to ~8-12 route segments using the existing error component pattern.

**Effort:** Small (~1 hour, mostly copy-paste with route-specific messaging)

---

### 27. Accessibility Fixes

**Problem:** While `AccessibleDialog` (focus trap, ARIA roles) is excellent, gaps exist elsewhere:

- Buttons with `+` icon only, no `aria-label` (week planner "add" buttons)
- Status pills without screen reader descriptions
- Weather emoji in calendar day headers without alt text
- Date/time inputs in forms without associated `<label>` elements
- No `aria-live` regions for dynamically loaded filtered views

**Fix:** Add `aria-label` to ~20 elements across 6-8 files. Add `sr-only` spans for icon-only buttons. Add `aria-live="polite"` to filter result areas.

**Effort:** Small (~2 hours)

---

### 28. In-Page Search & Filtering

**Problem:** Most list pages lack client-side search/filter beyond the global Cmd+K. Users can't filter within:

- Calls list (no search by contact name)
- Calendar events (no search within day/week/year views)
- Activity feed (no action type or date filter)
- Ledger entries (no client-side filter)
- Components (garnishes, sauces, stocks — no search)

**Fix:** Add a search input with debounced client-side filtering to ~8 list pages. Pattern: `<Input placeholder="Search..." onChange={debouncedFilter} />` at top of list.

**Effort:** Medium (~3-4 hours across all pages)

---

### 29. Missing Loading States for Async Operations

**Problem:** While 83 `loading.tsx` skeleton files exist, some async operations triggered by button clicks lack visual feedback:

- `autoSchedule()` in week planner — no spinner between click and modal
- Prep block save — no disabled state while saving
- Server actions triggered by buttons outside of `startTransition`

**Fix:** Add `isPending` state or `useTransition` pending state to buttons that trigger async operations. Show spinner or disabled state during processing.

**Effort:** Small (~1-2 hours)

---

### 30. Pagination for Large Data Sets

**Problem:** List pages fetch all records without limits. Events, clients, and calls pages load everything at once, which slows down as data grows.

**Fix:** Add cursor-based pagination to list queries. Show "Load more" button or infinite scroll. Start with events and clients pages (highest row counts).

**Effort:** Medium (~3-4 hours, requires modifying queries + UI)

---

## Tier 8 — Reporting & Financial Intelligence

### 31. Tax & Compliance Reports

**Problem:** Chef needs tax-related reports for their accountant. Currently, all financial data exists in the ledger but there's no structured tax output.

**What exists:**

- 1099 contractor tracking: `lib/finance/1099-actions.ts`
- Tax estimates: `lib/finance/tax-estimate-actions.ts`
- Tax deduction identifier: `lib/ai/tax-deduction-identifier.ts`
- Profit/loss reports: `lib/finance/profit-loss-report-actions.ts`
- Year-end page: `app/(chef)/finance/year-end/year-end-client.tsx`

**What to build:**

- **Quarterly Estimated Tax Report** — IRS Form 1040-ES pre-computed from YTD revenue/expenses
- **Sales Tax Nexus Report** — States where chef has nexus + tax obligations
- **Deduction Tracker Dashboard** — Real-time deduction summary by IRS category (home office %, mileage, equipment depreciation, ingredients)
- **Self-Employment Tax Worksheet** — IRS Schedule SE pre-filled from ledger
- **Tax Summary Package** — One-click PDF: all forms + schedules + supporting documentation

**Files to create:**

- `lib/finance/tax-reports.ts` — quarterly, annual, and SE tax computations
- `app/(chef)/finance/tax-reports/page.tsx` — tax reporting dashboard
- `components/finance/tax-deduction-tracker.tsx` — real-time deduction cards

---

### 32. Event-Level PDF Exports

**Problem:** No way to export an event's full record as a PDF for client handoffs, team briefings, or archival.

**What exists:**

- Quote PDF exists
- Invoice PDF exists
- Contract generation exists
- No event summary PDF

**What to build:**

- **Event Proposal PDF** — Client-facing: occasion, menu, pricing, timeline, photos
- **Event Prep Sheet PDF** — Team-facing: prep timeline, ingredient lists, station assignments, dietary notes
- **Post-Event Summary PDF** — Photos, actual costs vs quoted, client feedback, lessons learned
- **Guest Dietary Card PDF** — Printable card with each guest's allergies/restrictions for kitchen posting

**Files to create:**

- `lib/documents/generate-event-pdf.ts` — event summary PDF builder
- `lib/documents/generate-prep-sheet.ts` — team-facing prep document
- `components/events/event-export-menu.tsx` — dropdown with export options on event detail page

---

### 33. Client Year-End Summary

**Problem:** Loyal clients (corporate accounts, recurring households) would value a year-end statement showing all events, total spent, dietary preferences tracked, and tier status.

**What to build:**

- **Client Annual Statement** — One-click PDF per client showing:
  - All events in the year (date, occasion, guest count, price)
  - Total spent with breakdown by category
  - Loyalty tier, points earned, rewards redeemed
  - Dietary accommodations tracked
  - Testimonials left
- **Bulk generation** — Generate statements for all active clients at once (December/January)
- **Email delivery** — Option to email statement to client with thank-you message

**Files to create:**

- `lib/reports/client-annual-statement.ts` — computation + PDF generation
- `app/(chef)/reports/client-statements/page.tsx` — bulk generation page

---

### 34. Staff Utilization Report

**Problem:** Chef with 3-5 staff can't see who's overworked, who's underutilized, or what labor costs per event look like.

**What exists:**

- Staff performance scoring: `lib/staff/performance-actions.ts`
- Labor cost tracking: `lib/staff/labor-dashboard-actions.ts`
- Event staff assignments: `components/events/event-staff-panel.tsx`

**What to build:**

- **Hours per staff member** — Weekly/monthly totals from shift assignments
- **Utilization rate** — Hours worked / hours available
- **Cost per event** — Labor cost breakdown by staff member per event
- **Overtime alerts** — Flag when any staff member exceeds configurable weekly hour limit
- **Performance + utilization correlation** — Overlay performance scores with hours to spot burnout

**Files to create:**

- `lib/staff/utilization-report.ts` — compute utilization metrics
- `app/(chef)/staff/reports/page.tsx` — staff analytics page
- `components/staff/utilization-chart.tsx` — visual utilization breakdown

---

## Tier 9 — Integration & Automation

### 35. Event-Driven Webhook Triggers

**Problem:** Integrations exist (17 providers) but are mostly pull-based. When an event status changes, no automatic push to external systems.

**What exists:**

- Integration framework: `lib/integrations/core/pipeline.ts`
- 17 providers configured
- Zapier webhook subscriptions: `lib/integrations/zapier/zapier-webhooks.ts`
- 8-state event FSM: `lib/events/transitions.ts`

**What to build:**

- **Post-transition webhook emitter** — After any FSM transition, fire registered webhooks:
  - `event.proposed` → push to Google Calendar + CRM
  - `event.accepted` → push to accounting (QuickBooks) + calendar
  - `event.paid` → push to payment tracker + CRM deal update
  - `event.completed` → push to review request + survey system
- **Webhook delivery audit** — Log every delivery attempt with response code, timing, retry count
- **Webhook management UI** — `app/(chef)/settings/integrations/webhooks/page.tsx` with test/retry buttons

**Files to create:**

- `lib/integrations/event-emitter.ts` — post-transition webhook dispatcher
- `lib/integrations/webhook-audit.ts` — delivery tracking + retry with exponential backoff
- `app/(chef)/settings/integrations/webhooks/page.tsx` — webhook management

**Files to modify:**

- `lib/events/transitions.ts` — add webhook trigger after successful transition

---

### 36. Missing Notification Triggers

**Problem:** 120+ notification action types are defined, but ~30% of triggers are never fired. Notifications like `burnout_risk_high`, `relationship_cooling`, `capacity_limit_approaching`, and `recall_alert_matched` are defined but never sent.

**What exists:**

- Full notification types: `lib/notifications/types.ts` (14 categories, 120+ actions)
- Partial triggers: `lib/notifications/triggers.ts`
- Send infrastructure: `lib/notifications/send.ts`

**What to build:**

- Implement trigger functions for all unused notification types:
  - `burnout_risk_high` — compute from events/month vs capacity limit
  - `relationship_cooling` — query `activity_events` for clients inactive 60+ days
  - `capacity_limit_approaching` — compare event count to monthly max
  - `recall_alert_matched` — periodic check against FDA recall database
  - `quarterly_checkin_due` — fire every 90 days per chef
  - `no_education_logged_90d` — check education/certificate tables

**Files to create:**

- `lib/notifications/proactive-triggers.ts` — implementations for all missing triggers
- `app/api/scheduled/proactive-notifications/route.ts` — cron job to fire periodic triggers

---

### 37. Scheduled Financial Alerts

**Problem:** Chef finds out about financial issues after the fact. No proactive alerts for overdue payments, budget overruns, or cash flow dips.

**What to build:**

- **Overdue payment reminders** — Escalating sequence: 7d, 14d, 21d past due → email + in-app notification
- **Low cash flow alert** — If month-to-date revenue < 50% of average by mid-month → alert
- **Expense anomaly detection** — If any expense > 3x the category average → flag for review
- **Budget variance alert** — If spending pace will exceed monthly budget → warning
- **Payment settlement notifications** — Daily: which payments cleared, which are pending

**Files to create:**

- `lib/finance/financial-alerts.ts` — alert computation logic
- `app/api/scheduled/financial-alerts/route.ts` — daily/weekly cron job

---

### 38. Operational Reminder Cron Jobs

**Problem:** Equipment maintenance, certificate renewals, and staff availability gaps go unnoticed until they cause problems.

**What to build:**

- **Equipment maintenance due** — Check maintenance intervals, alert 7 days before
- **Certificate renewal reminders** — Food handler, health permit, insurance expiry → 30-day warning
- **Staff availability gaps** — Event scheduled but no staff assigned → 48-hour warning
- **Guest dietary accommodation check** — 7 days before event, flag unaccommodated restrictions
- **Stale data quality scan** — Recipes without costs, events without menus, incomplete client profiles → weekly digest

**Files to create:**

- `lib/operations/proactive-alerts.ts` — operational check logic
- `app/api/scheduled/operations-check/route.ts` — cron job

---

## Tier 10 — Data Management & Compliance

### 39. Audit Trail Viewer

**Problem:** Chef activity is logged (`chef_activity_log`, `activity_events`) but there's no UI to browse the audit trail. Useful for compliance, debugging, and understanding team activity.

**What exists:**

- Chef activity log: `lib/activity/log-chef.ts`
- Client activity tracking: `lib/activity/track.ts` (15 event types)
- Entity timeline: `lib/activity/entity-timeline.ts`

**What to build:**

- `app/(chef)/admin/audit-log/page.tsx` — filterable audit log viewer
  - Filter by: action type, date range, entity, actor
  - Timeline view per entity (event lifecycle: inquiry → quote → accept → pay → complete)
  - Export audit log as CSV
- Entity change history sidebar on detail pages (who changed what, when)

**Files to create:**

- `lib/activity/audit-viewer-actions.ts` — paginated audit log queries
- `app/(chef)/admin/audit-log/page.tsx` — audit log page
- `components/activity/entity-change-history.tsx` — sidebar component

---

### 40. Data Archival Strategy

**Problem:** No automated archival of old data. Completed events from 2+ years ago still appear in queries, slowing everything down.

**What to build:**

- **Archive settings page** — Configure retention policies per data type
- **Auto-archive** — Completed events older than N months move to archive table
- **Archive browser** — View archived events by year, search within archives
- **Restore** — Convert archived event back to active with one click
- **Export before delete** — Full data export before any permanent deletion

**Database changes (additive):**

- `archived_events` table (mirrors `events` schema + `archived_at`, `archived_by`)
- `archival_policies` table (tenant_id, entity_type, retention_months, auto_archive boolean)

**Files to create:**

- `lib/archival/archive-actions.ts` — archive, restore, export
- `app/(chef)/settings/data-management/page.tsx` — retention policy settings
- `app/(chef)/admin/archives/page.tsx` — archive browser

---

### 41. Duplicate Client Detection

**Problem:** Same client may be entered twice (once from inquiry widget, once manually). No deduplication.

**What to build:**

- **Duplicate scanner** — Match on normalized name + email or phone
- **Merge wizard** — Select primary record, merge activity history, combine contacts
- **Prevention** — On new client creation, show "Similar clients found" if near-match exists
- Run as weekly cron + on-demand scan

**Files to create:**

- `lib/clients/duplicate-detection.ts` — fuzzy matching + merge logic
- `components/clients/duplicate-merge-modal.tsx` — merge wizard UI
- `app/api/scheduled/duplicate-scan/route.ts` — weekly cron job

---

### 42. Bulk Data Import

**Problem:** New chef has existing clients, recipes, and vendors in spreadsheets. No way to import them into ChefFlow.

**What to build:**

- **CSV import wizard** — Upload CSV, map columns to fields, preview, import
- Supported entities: Clients, Recipes, Vendors, Expenses, Equipment
- **Validation** — Show errors per row before importing
- **Rollback** — If import fails mid-way, rollback all rows
- **Deduplication** — Skip or flag duplicates during import

**Files to create:**

- `lib/imports/csv-importer.ts` — generic CSV parser + validator
- `components/settings/import-wizard.tsx` — column mapping UI
- `app/(chef)/settings/import/page.tsx` — import page

---

## Recommended Build Order (Final)

| Priority | Feature                                  | Tier | Why                                           | Effort |
| -------- | ---------------------------------------- | ---- | --------------------------------------------- | ------ |
| 1        | **Dark Mode Fix** (21)                   | 7    | Visible bug, mechanical fix                   | XS     |
| 2        | **Toast Feedback** (22)                  | 7    | Zero Hallucination Rule compliance            | XS     |
| 3        | **Optimistic Rollback** (23)             | 7    | Zero Hallucination Rule compliance            | S      |
| 4        | **Recurring Events + Templates** (2 & 3) | 1    | Eliminates most repetitive daily work         | M      |
| 5        | **Smart Auto-Fill** (4)                  | 1    | Quick win, no migration needed                | S      |
| 6        | **Equipment Dashboard** (11)             | 4    | Backend 100% done, just needs UI              | S      |
| 7        | **Contract Library** (12)                | 4    | Backend mostly done, needs UI + signing       | S-M    |
| 8        | **Status Color Registry** (25)           | 7    | Quick consistency win                         | XS     |
| 9        | **Date Formatting Helpers** (24)         | 7    | Consistency + prevents timezone bugs          | S      |
| 10       | **Notification Triggers** (36)           | 9    | Fires existing notifications, high engagement | S      |
| 11       | **Keyboard Power-User** (1)              | 1    | Desktop speed boost                           | S      |
| 12       | **Revenue Goal Tracking** (19)           | 6    | Business-critical visibility                  | S      |
| 13       | **Message Templates** (18)               | 6    | Reduces daily typing                          | S      |
| 14       | **Error Boundaries** (26)                | 7    | Crash resilience, 1hr work                    | XS     |
| 15       | **Accessibility Fixes** (27)             | 7    | Inclusive design, small effort                | S      |
| 16       | **Tax Reports** (31)                     | 8    | Accountant handoff, tax season                | M      |
| 17       | **Event PDF Exports** (32)               | 8    | Client-facing deliverables                    | M      |
| 18       | **Staff Scheduling** (13)                | 5    | Operational efficiency                        | M      |
| 19       | **Follow-Up Sequences** (15)             | 5    | Revenue recovery on autopilot                 | M      |
| 20       | **Cash Flow Forecast** (5)               | 2    | Financial planning                            | M      |
| 21       | **Financial Alerts** (37)                | 9    | Proactive money management                    | S      |
| 22       | **Analytics Drill-Down** (16)            | 5    | Makes 40+ metrics actionable                  | M      |
| 23       | **In-Page Search** (28)                  | 7    | List page usability                           | M      |
| 24       | **Pagination** (30)                      | 7    | Performance at scale                          | M      |
| 25       | **Staff Utilization** (34)               | 8    | Labor cost visibility                         | M      |
| 26       | **Client Self-Service** (6)              | 2    | Scales the business                           | L      |
| 27       | **Webhook Triggers** (35)                | 9    | Automation backbone                           | M      |
| 28       | **Public Chef Profile** (17)             | 6    | Client acquisition channel                    | M      |
| 29       | **Client Statements** (33)               | 8    | Client retention                              | S      |
| 30       | **Service Dashboard** (14)               | 5    | During-service ops                            | M      |
| 31       | **Operational Alerts** (38)              | 9    | Proactive maintenance/compliance              | S      |
| 32       | **Audit Trail** (39)                     | 10   | Compliance + debugging                        | M      |
| 33       | **Offline-First** (7)                    | 2    | Kitchen reliability                           | L      |
| 34       | **Scheduling Intelligence** (8)          | 3    | Proactive revenue                             | M      |
| 35       | **Vendor Pricing** (9)                   | 3    | Cost optimization                             | M      |
| 36       | **Photo Portfolio** (10)                 | 3    | Marketing + proposals                         | M      |
| 37       | **Duplicate Detection** (41)             | 10   | Data quality                                  | S      |
| 38       | **Bulk Import** (42)                     | 10   | Onboarding new chefs                          | M      |
| 39       | **Archival Strategy** (40)               | 10   | Long-term data management                     | M      |
| 40       | **Inventory/Pantry** (20)                | 6    | Waste reduction + planning                    | L      |
| 41       | **Loading States** (29)                  | 7    | Polish                                        | XS     |

---

## Notes

- Features 2 and 3 (Recurring Events + Templates) should be built together — they share the event form infrastructure and solve the same pain
- Features 21-23 (Dark Mode, Toast, Rollback) are Zero Hallucination Rule compliance items — they should be fixed before new features
- Feature 4 (Auto-Fill) requires no database migration — pure read from existing data
- Feature 6 (Client Self-Service) is the biggest scope item but has the highest long-term leverage
- Features 36 and 38 (Notification Triggers, Operational Alerts) unlock value from already-built infrastructure
- All database changes listed are additive (new tables/columns only) — no destructive operations
- **Effort key:** XS = <1hr, S = 1-3hr, S-M = 3-5hr, M = 5-10hr, L = 10-20hr
