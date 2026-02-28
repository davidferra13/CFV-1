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

## Recommended Build Order

| Priority | Feature                                  | Why First                                      |
| -------- | ---------------------------------------- | ---------------------------------------------- |
| 1        | **Recurring Events + Templates** (2 & 3) | Eliminates the most repetitive daily work      |
| 2        | **Smart Auto-Fill** (4)                  | Quick win, high perceived value, no migration  |
| 3        | **Keyboard Power-User** (1)              | Desktop chefs get dramatically faster          |
| 4        | **Cash Flow Forecast** (5)               | Business-critical insight, data already exists |
| 5        | **Client Self-Service** (6)              | Reduces back-and-forth, scales the business    |
| 6        | **Offline-First** (7)                    | Kitchen reliability, differentiator            |
| 7        | **Scheduling Intelligence** (8)          | Proactive revenue generation                   |
| 8        | **Vendor Pricing** (9)                   | Cost savings, data-driven purchasing           |
| 9        | **Photo Portfolio** (10)                 | Marketing + proposals, client-facing           |

---

## Notes

- Features 2 and 3 (Recurring Events + Templates) should be built together — they share the event form infrastructure and solve the same pain (repetitive event creation)
- Feature 4 (Auto-Fill) requires no database migration — pure read from existing data
- Feature 6 (Client Self-Service) is the biggest scope item but has the highest long-term leverage for scaling
- All database changes listed are additive (new tables/columns only) — no destructive operations
