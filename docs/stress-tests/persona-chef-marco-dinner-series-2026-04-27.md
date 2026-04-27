# PERSONA STRESS TEST: Chef Marco (Dinner Series Impresario)

## Generated: 2026-04-27

## Prior test: First run (NOTE: Kai Donovan #5 covers adjacent territory -- supper club drops, scored 73/100 via Opus, 35/100 via local-ollama. Chef Marco is a higher-volume, more commercially mature variant.)

---

## 1. PERSONA PROFILE

```
PERSONA PROFILE
===============
Name/Label:        Chef Marco
Type:              Chef
Role:              Dinner series operator / pop-up impresario
Business Model:    Sells tickets ($150-300/head) to themed dinners 3-4x/month at rotating
                   venues. Revenue = ticket sales + add-on upsells (wine pairings, signed
                   menus, kitchen tours, merch). No recurring private clients -- audience
                   is a loyal public following.
Scale:             12-16 events/month (3-4 dinners), 40-80 guests each, $6K-24K gross per
                   event, $72K-288K annual gross from dinners alone. Solo chef with
                   2-4 hired staff per event.
Tech Comfort:      High (runs mailing list, social media, Stripe payments)
Current Tools:     Instagram (audience building), Eventbrite or Splash (ticketing),
                   Google Sheets (prep tracking), Venmo/Stripe (payments), personal
                   email (venue outreach), Notes app (recipes)
Top 3 Pain Points: 1. Managing demand (200+ people want 50 seats -- no fair way to release)
                   2. Venue logistics (new kitchen every event, no standardized setup)
                   3. Concurrent prep across 2-3 upcoming events while executing current one
Deal-Breakers:     1. No timed ticket drops (his entire business model depends on hype drops)
                   2. Cannot sell add-ons with tickets in one checkout
                   3. No public "notify me" signup for non-ticket-holders
Success Metric:    "Can I announce a dinner, sell it out in 2 hours, manage 60 dietary
                   restrictions, prep 3 events simultaneously, and close out financials
                   -- all without leaving the platform?"
ChefFlow Surface:  Events, Tickets, Public Event Pages, Dinner Circles, Calendar,
                   Recipes, Prep Timeline, Financial Hub, Marketing Campaigns, Staff
```

---

## 2. WORKFLOW SIMULATION

### Service Lifecycle Mapping (adapted for ticketed dinner series)

| Stage                     | What Marco Does                                                                                           | What ChefFlow Offers                                                                                                                                                                                     | Gap                                                                                                                                                                                                                                          | Friction |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **1. Concept**            | Dreams up theme ("Tokyo After Dark"), picks target date range, scouts 2-3 potential venues                | Event creation with `occasion` field (free text). No theme entity. No venue scouting.                                                                                                                    | No structured theme field, no series grouping, no venue shortlist. `occasion` is the only place to name the theme.                                                                                                                           | 1        |
| **2. Venue Lock**         | Contacts venue owners, negotiates terms, confirms kitchen specs, locks date                               | Partner locations (`partner_locations` table) with `max_guest_count`, kitchen assessment (`event_site_assessments`). Partner detail page at `/partners/[id]`.                                            | Partner system works but is conceptually wrong for venues. A gallery owner hosting one dinner is not a "partner." No venue-specific view or quick-add. No co-host revenue split.                                                             | 2        |
| **3. Announce**           | Posts "tickets dropping Friday at 6pm" on Instagram. No theme, no date, just hype.                        | Marketing campaigns (`lib/marketing/actions.ts`), Dinner Circle broadcast (`lib/hub/circle-notification-actions.ts`), circle event email template.                                                       | No timed announcement scheduling. No "save the date" without revealing details. Circle broadcast is immediate, not scheduled. No Instagram integration.                                                                                      | 2        |
| **4. Ticket Drop**        | Releases tickets at exact time. Sells out in hours. Waitlist captures overflow.                           | Ticketing system BUILT: `event_ticket_types`, `event_tickets`, Stripe Checkout, capacity enforcement (DB trigger + CAS), ticket waitlist (`joinTicketWaitlist`). Public event page at `/e/[shareToken]`. | **NO timed release.** `tickets_enabled` is binary on/off. No `sale_starts_at`. No waiting room for simultaneous access. No early-access tier (circle members first, then public). No countdown timer on public page. This is the #1 BLOCKER. | 3        |
| **5. Dietary Collection** | Collects restrictions from 40-80 ticket buyers. Cross-checks against menu.                                | Ticket purchase collects dietary info. Allergen cross-check (deterministic, FDA Big 9) on event overview. AI allergen risk matrix. Household members with allergies.                                     | Dietary collection at ticket purchase EXISTS. Cross-check against menu EXISTS. Gap: no bulk dietary dashboard for 60+ guests -- the per-guest allergen view works but doesn't scale to this volume.                                          | 1        |
| **6. Menu Design**        | Creates themed menu (5-7 courses themed to concept). Often reuses base recipes with thematic twists.      | Menu builder, recipe management, component library, course structure, menu cost breakdown. Culinary Board kanban.                                                                                        | Menu system is strong. No "clone previous event's menu as starting point" quick action (must manually create). No theme-to-menu linkage. No "past themes" reference view.                                                                    | 1        |
| **7. Concurrent Prep**    | Preps for 2-3 upcoming dinners simultaneously. Different menus, different venues, different guest counts. | Multi-event day detection (`lib/scheduling/multi-event-days.ts`), capacity planning (`lib/scheduling/capacity-planning-actions.ts`), per-event prep timeline, per-event grocery list.                    | **No unified cross-event prep view.** Each event's prep is siloed. No consolidated grocery list across events. No "what am I shopping for across all 3 dinners this week?" view.                                                             | 2        |
| **8. Venue Setup**        | Arrives at unfamiliar kitchen. Needs to know: layout, equipment, parking, load-in, restrictions.          | `event_site_assessments` (has_dishwasher, has_freezer, elevator_access, notes). Partner location notes. Packing list at `/events/[id]/pack`.                                                             | Site assessment exists but is thin for a chef who hits a new venue every event. No photo gallery of venue kitchen. No equipment delta (what venue has vs what I need to bring).                                                              | 1        |
| **9. Service**            | Executes themed dinner for 40-80. Staff coordination, course timing, guest interaction.                   | KDS (`/events/[id]/kds`), DOP mobile (`/events/[id]/dop/mobile`), time tracking, temperature logging, service simulation, staff panel.                                                                   | Service execution is STRONG. KDS + DOP + time tracking cover this well. No guest check-in by ticket (attendance tracking exists but not a door scanner/QR flow).                                                                             | 1        |
| **10. Close-Out**         | Collects tips, photographs everything for social, sends thank-you, posts recap. Close out financials.     | Close-out wizard (`/events/[id]/close-out`): tip, receipts, mileage, AAR, celebration. Photo gallery. Social media caption AI. Event recap share link. Financial summary.                                | Close-out flow is excellent for this persona. AI social captions are a bonus. One gap: no "post to Instagram" integration -- captions are generated but chef must manually post.                                                             | 1        |
| **11. Add-On Sales**      | Sells wine pairings ($45), signed menus ($25), kitchen tours ($50) alongside tickets.                     | Commerce/POS system exists (`lib/commerce/`) but is NOT integrated with ticketing. Proposal add-ons exist (`/proposals/addons`) but are for quotes, not tickets.                                         | **No add-on items at ticket checkout.** Commerce and ticketing are separate systems. Chef cannot bundle merch with ticket purchase. Must run two separate payment flows.                                                                     | 3        |
| **12. Audience Growth**   | Wants non-attendees to sign up for "notify me of future events" list.                                     | Dinner Circles (requires prior relationship). Directory waitlist (location-based, not chef-specific). Beta signup.                                                                                       | **No public "subscribe to this chef's events" mechanism.** A foodie who discovers Marco's public event page after sellout has no way to get notified of the next one without joining a Circle, which requires a prior interaction.           | 2        |
| **13. Series Analytics**  | Tracks which themes sell fastest, which venues work best, revenue per theme, repeat guest rate.           | Analytics hub with inquiry funnel, revenue trends. Per-event profitability. No series-level analytics.                                                                                                   | **No theme/series performance tracking.** No "Tuscan nights average $18K, Tokyo nights average $22K" view. No repeat guest rate across events. `event_series` table exists in DB but has no UI or server actions for dinner series use.      | 2        |

### First 10 Minutes

Marco signs up, sees onboarding checklist. Dashboard has 24 feature area cards -- overwhelming for someone who only needs: create event, enable tickets, share link. The "New Event" button is prominent (good). He creates an event, sets occasion to "Prohibition Speakeasy", attaches a venue via partner system (awkward -- he has to create a "partner" first). Enables ticketing tab. Creates ticket types (General $200, VIP $300). Gets a share link. **Friction: no way to schedule when tickets go live.** He'd have to manually toggle `tickets_enabled` at the exact drop time. For a chef whose entire brand is the drop, this is a dealbreaker.

### First Day

Can enter 2-3 upcoming events. Can create menus. Can set up ticket types. Cannot do a timed drop. Cannot sell add-ons with tickets. Dinner Circle creation works (auto-created when ticketing enabled). Marketing campaign for announcement works but is immediate, not scheduled.

### First Week

Running 3-4 events through the system. Prep timeline per event works. Calendar shows all events. Grocery lists work per event but not consolidated. Financial tracking per event is strong. Closes out first event with full wizard. Sees profitability. **Value is real but incomplete** -- the ticketing limitations force him to keep Eventbrite for drops while using ChefFlow for everything else. Split-platform workflow kills adoption.

### First Month

If ticket drops aren't solved, Marco leaves. The rest of ChefFlow (prep, finance, recipes, staff, close-out) is genuinely useful, but his business identity IS the drop. Without it, he's using ChefFlow as a fancy spreadsheet replacement and Eventbrite as his actual business tool.

---

## 3. CAPABILITY AUDIT

### 1. Onboarding & Setup - PARTIAL

**Evidence:** Onboarding checklist at `/onboarding` (5 steps). Getting Started section on dashboard. Profile setup at `/settings/profile`.
**Gap:** Onboarding assumes private chef workflow (add client, create recipe, create event). No "dinner series" archetype that would prioritize: set up ticketing, create public page, build mailing list.
**Impact:** First 10 minutes feel misaligned. Chef has to discover ticketing on his own.

### 2. Client Management - PARTIAL

**Evidence:** Full CRM at `/clients` with 30-panel detail view ([app-complete-audit.md:515](docs/app-complete-audit.md#L515)).
**Gap:** Marco doesn't have "clients" in the traditional sense. His customers are ticket buyers -- anonymous until purchase. The CRM is built for repeat private-chef clients with deep profiles. Ticket buyers are transactional. Guest lead capture (`/guest-leads`) is closer but still one-at-a-time. No bulk import from ticket buyer list.
**Impact:** CRM is overkill. What Marco needs is audience management, not client management.

### 3. Inquiry Pipeline - PARTIAL

**Evidence:** Full inquiry pipeline at `/inquiries` with 8 status tabs, Smart Priority Grouping, AI parsing ([app-complete-audit.md:600](docs/app-complete-audit.md#L600)).
**Gap:** Marco doesn't receive inquiries. People buy tickets. The inquiry pipeline is irrelevant to his workflow. However, venue owners reaching out or corporate groups wanting private buyouts could use it.
**Impact:** Low -- this feature just doesn't apply. Not a gap, just not his lane.

### 4. Event Lifecycle - SUPPORTED

**Evidence:** Event creation, 8-state FSM, event detail with 6 tabs including Tickets tab ([app-complete-audit.md:369](docs/app-complete-audit.md#L369)). Ticketing fully built with Stripe, capacity enforcement, waitlist.
**Gap:** FSM is designed for private events (draft -> proposed -> accepted -> paid). Ticketed events skip propose/accept -- they go draft -> tickets live -> selling -> sold out -> confirmed -> service -> completed. The FSM doesn't map cleanly.
**Impact:** Medium. The states work functionally but the labels and transitions feel wrong for a ticketed model.

### 5. Menu & Recipe - SUPPORTED

**Evidence:** Menu builder, recipe management, component library, course structure, allergen cross-check, menu cost breakdown ([product-blueprint.md:91-105](docs/product-blueprint.md#L91)).
**Gap:** No "clone and modify" for themed variations of base recipes. No theme-to-menu metadata link.
**Impact:** Minor. Menu system is strong; theme linkage is a nice-to-have.

### 6. Culinary Ops - PARTIAL

**Evidence:** Ingredient catalog (15K+), vendor management, inventory tracking, grocery list generation, prep timeline, station ops ([product-blueprint.md:106-123](docs/product-blueprint.md#L106)).
**Gap:** No consolidated cross-event grocery list. No unified prep dashboard for concurrent events. Each event is a silo.
**Impact:** High for a chef prepping 3 events simultaneously. Must manually merge grocery lists.

### 7. Financial - SUPPORTED

**Evidence:** Invoicing, payment tracking, expense tracking, immutable ledger, 9 report types, tax center, Stripe integration ([product-blueprint.md:124-140](docs/product-blueprint.md#L124)). Per-event profitability, close-out wizard.
**Gap:** No series-level P&L (aggregate across all "Tuscan" dinners). No per-theme revenue tracking. Ticket revenue flows through Stripe but reconciliation with add-on sales (separate POS) is manual.
**Impact:** Medium. Per-event financials are excellent. Aggregate analysis requires manual work.

### 8. Calendar & Scheduling - SUPPORTED

**Evidence:** Day/week/month views, iCal sync, Google Calendar, capacity planning, multi-event day detection ([product-blueprint.md:69-90](docs/product-blueprint.md#L69)).
**Gap:** No "dinner series" calendar view (show only my series events, not private bookings). Calendar treats all events equally.
**Impact:** Low. Calendar works; filtering is the only gap.

### 9. Communication - PARTIAL

**Evidence:** Marketing campaigns, Dinner Circle broadcast, email templates, Gmail integration ([product-blueprint.md:48-68](docs/product-blueprint.md#L48)). Circle event broadcast email with "Get Tickets" CTA.
**Gap:** No scheduled broadcasts (only immediate). No public mailing list signup. No Instagram/social integration. No SMS blast. No "tickets dropping at 6pm" countdown notification.
**Impact:** High. Marco's communication is announcement-driven, time-sensitive, and social-first. ChefFlow's email-centric, immediate-send model misses his rhythm.

### 10. Staff & Team - SUPPORTED

**Evidence:** Staff management, task delegation, station assignments, event staff panel with add/remove/log-hours ([app-complete-audit.md:449](docs/app-complete-audit.md#L449)).
**Gap:** No per-event staff cost allocation for profitability calculation. Staff are hired per-gig, not salaried.
**Impact:** Low. Staff panel works for his use case.

### 11. Analytics & Intelligence - PARTIAL

**Evidence:** Analytics hub with inquiry funnel, revenue trends, utilization, cost tracking. Business Intelligence widget. CIL signals ([product-blueprint.md:141-150](docs/product-blueprint.md#L141)).
**Gap:** No series/theme analytics. No "which theme performs best?" No repeat guest rate. No sellout velocity tracking. No demand forecasting.
**Impact:** High. Marco optimizes his business by theme performance data. Without it, he's guessing.

### 12. Public Presence - PARTIAL

**Evidence:** Public chef profile, public event pages at `/e/[shareToken]`, embed widget, JSON-LD SEO ([product-blueprint.md:147-150](docs/product-blueprint.md#L147)).
**Gap:** Public event page is functional but has no countdown timer for drops, no "notify me" for sold-out events (waitlist exists but is reactive), no upcoming events listing on chef profile, no social sharing optimization (OG tags specced but unverified).
**Impact:** Medium. The page works for buying tickets but doesn't serve the hype/discovery use case.

### Capability Summary

| Domain                   | Rating    | Key Gap                                                     |
| ------------------------ | --------- | ----------------------------------------------------------- |
| Onboarding & Setup       | PARTIAL   | No dinner series archetype                                  |
| Client Management        | PARTIAL   | CRM designed for private clients, not ticket audiences      |
| Inquiry Pipeline         | PARTIAL   | Irrelevant to ticketed model (not a gap, just N/A)          |
| Event Lifecycle          | SUPPORTED | FSM labels don't match ticketed flow                        |
| Menu & Recipe            | SUPPORTED | No clone-and-theme workflow                                 |
| Culinary Ops             | PARTIAL   | No cross-event consolidated prep/grocery                    |
| Financial                | SUPPORTED | No series-level aggregation                                 |
| Calendar & Scheduling    | SUPPORTED | No series filter                                            |
| Communication            | PARTIAL   | No scheduled drops, no public signup, no social integration |
| Staff & Team             | SUPPORTED | Minor per-gig cost gap                                      |
| Analytics & Intelligence | PARTIAL   | No theme/series performance tracking                        |
| Public Presence          | PARTIAL   | No drop countdown, no notify-me, no upcoming events list    |

**5 PARTIAL domains, 0 MISSING.** Final score capped at 69 max by the 5-PARTIAL rule.

---

## 4. FAILURE MAP

### BLOCKER: No Timed Ticket Drop Engine [critical]

**What:** Cannot schedule tickets to go live at a specific time. `tickets_enabled` is a manual binary toggle. No `sale_starts_at` field. No waiting room. No early-access tiers (Circle members first).
**Where:** `lib/tickets/actions.ts` (toggleTicketing function), `event_ticket_types` schema (no release timestamp).
**Persona impact:** Marco's entire business model is the timed drop. Without it, he must manually toggle tickets at the exact moment, pray the system handles 200 concurrent requests, and has no way to give loyal followers priority. This single gap makes ChefFlow unusable as his primary platform.
**Required fix:** Add `sale_starts_at` and `sale_ends_at` to `event_ticket_types`. Build countdown UI on public event page. Add queue/waiting room for concurrent access. Add early-access tier flag linked to Dinner Circle membership. Notification scheduling for "tickets go live in 1 hour."
**Scope class:** EXPAND

### BLOCKER: No Add-On Items at Ticket Checkout [critical]

**What:** Cannot sell wine pairings, merch, or experience upgrades alongside ticket purchase. Commerce system and ticketing system are disconnected.
**Where:** `lib/tickets/purchase-actions.ts` (purchaseTicket only handles ticket_type_id), `lib/commerce/` (separate POS system).
**Persona impact:** Marco loses 15-25% of potential per-event revenue. Guests who would impulse-buy a $45 wine pairing at checkout won't seek out a separate POS later.
**Required fix:** Add `event_ticket_addons` table (addon_id, ticket_type_id, name, price_cents, max_quantity). Include addon selection in public event purchase flow. Bundle into single Stripe Checkout session.
**Scope class:** EXPAND

### MONEY RISK: No Series-Level Financial Aggregation [high]

**What:** No way to see P&L across a series of themed dinners. Each event is financially isolated. Cannot answer "how much did my Tuscan series make this quarter?"
**Where:** `event_financial_summary` view is per-event only. No series grouping in financial reports.
**Persona impact:** Marco cannot evaluate which themes are profitable. A theme that grosses $20K but costs $18K in venue + ingredients looks identical to one that grosses $15K and costs $8K without series aggregation.
**Required fix:** Wire `event_series` table (already exists in DB) to a series financial summary view. Add series selector to financial reporting at `/finance/reporting`.
**Scope class:** EXPAND

### WORKFLOW BREAK: No Consolidated Cross-Event Prep [high]

**What:** Prepping 3 dinners simultaneously requires switching between 3 event detail pages. No unified "this week's prep" or "this week's shopping" view.
**Where:** Prep timeline at `/events/[id]/schedule` is per-event. Grocery list at `/events/[id]/grocery-quote` is per-event.
**Persona impact:** Marco manually merges 3 grocery lists on paper. Misses items. Double-buys. Loses the efficiency ChefFlow should provide.
**Required fix:** Add `/prep/weekly` view that aggregates prep tasks and grocery items across all events in a date range. Use existing `getMultiEventDays()` as the data source.
**Scope class:** EXPAND

### WORKFLOW BREAK: No Public Audience Signup [high]

**What:** No "notify me of future events" mechanism for non-Circle members on the public event page or chef profile.
**Where:** Public event page at `app/(public)/e/[shareToken]/public-event-view.tsx`. Chef profile at `app/(public)/chefs/[slug]/page.tsx`.
**Persona impact:** Marco's audience growth depends on converting one-time visitors into repeat attendees. Without a low-friction email capture, every sold-out page is a dead end for future demand.
**Required fix:** Add email capture component to public event page (sold-out state) and chef profile page. Store in `circle_members` or a new `audience_subscribers` table. Auto-notify on next event creation.
**Scope class:** EXPAND

### DATA DEAD-END: Event Series Table Exists But Has No UI [medium]

**What:** `event_series` table is fully schema'd in the database (service_mode, recurrence_rule, start_date, end_date, base_guest_count, quoted_total_cents, deposit_total_cents). `series-materialization.ts` exists. But there is no UI to create, view, or manage a series. No server actions for series CRUD.
**Where:** `clean-schema.sql:12599` (table definition), `lib/booking/series-materialization.ts` (materialization logic).
**Persona impact:** Marco would naturally group his dinners into series ("Spring 2026 Series: 12 dinners"). The data model supports it. The UI doesn't.
**Required fix:** Build series CRUD server actions. Add `/events/series` list view. Add series selector on event creation form. Link series to financial aggregation.
**Scope class:** EXPAND

### TRUST VIOLATION: Venue as "Partner" is Semantically Wrong [medium]

**What:** To track a rotating venue, Marco must create it as a "partner" with a "partner location." A gallery that hosts one dinner is not a business partner.
**Where:** Partner system at `lib/partners/actions.ts`, partner detail at `/partners/[id]`.
**Persona impact:** Data model friction. Marco would not naturally navigate to "Partners" to find his venues. The mental model mismatch causes confusion and reduces trust in the system's design.
**Required fix:** Either add a lightweight "Venues" entity (name, address, kitchen notes, capacity, photos) independent of partners, or add a "venue" partner type with streamlined creation. Surface venue picker on event form.
**Scope class:** EXPAND

### Failure Summary

| Category        | Critical | High | Medium |
| --------------- | -------- | ---- | ------ |
| BLOCKER         | 2        | 0    | 0      |
| MONEY RISK      | 0        | 1    | 0      |
| DATA DEAD-END   | 0        | 0    | 1      |
| TRUST VIOLATION | 0        | 0    | 1      |
| WORKFLOW BREAK  | 0        | 2    | 0      |

**2 critical BLOCKERs cap Workflow Coverage at 49 max.**

---

## 5. REQUIRED ADDITIONS

### Quick Wins (< 2 hours each)

1. **Add `sale_starts_at` / `sale_ends_at` columns to `event_ticket_types`** - `database/migrations/` new migration + `lib/tickets/actions.ts` update - Unblocks timed drops (Phase 4 BLOCKER partial fix) - EXPAND
2. **Add countdown timer to public event page** - `app/(public)/e/[shareToken]/public-event-view.tsx` - Shows "Tickets available in 2h 14m" when `sale_starts_at` is future - EXPAND
3. **Add "Notify Me" email capture on sold-out public event page** - `app/(public)/e/[shareToken]/public-event-view.tsx` + new server action - Resolves WORKFLOW BREAK: Public Audience Signup - EXPAND
4. **Add series_id selector to event creation form** - `components/events/event-form.tsx` - Links events to existing series (table already exists) - EXPAND
5. **Add "Clone Event" button on event detail** - `app/(chef)/events/[id]/page.tsx` - Creates new event pre-filled from previous (menu, venue, ticket types, staff template) - REFINE

### Medium Builds (2-8 hours each)

1. **Ticket drop engine (timed release + early access)** - `lib/tickets/actions.ts`, `lib/tickets/purchase-actions.ts`, public event page, circle notification - Resolves BLOCKER: Timed Ticket Drop. Includes: scheduled `sale_starts_at` enforcement, Circle-member early access window, waiting room queue on public page. - EXPAND
2. **Ticket add-ons at checkout** - New `event_ticket_addons` table, `lib/tickets/purchase-actions.ts`, `public-event-view.tsx`, Stripe session update - Resolves BLOCKER: Add-On Items. Bundle addon selection into Stripe Checkout line items. - EXPAND
3. **Consolidated weekly prep view** - New route `/prep/weekly` + server action aggregating prep tasks and grocery items across events in date range - Resolves WORKFLOW BREAK: Cross-Event Prep. - EXPAND
4. **Event series CRUD + list UI** - `lib/events/series-actions.ts` (new), `/events/series` list page, series detail page with linked events and aggregate stats - Resolves DATA DEAD-END: Event Series No UI. - EXPAND
5. **Series-level financial dashboard** - Extension of `/finance/reporting` with series grouping, per-theme P&L, comparative charts - Resolves MONEY RISK: Series Financial Aggregation. - EXPAND

### Large Builds (> 8 hours each)

1. **Venue management system** - Standalone venues entity (not partners), kitchen photo gallery, equipment inventory, capacity, availability calendar, venue-event linking. Multiple files across schema, server actions, and UI. Spec needed: yes. - EXPAND
2. **Theme performance analytics** - Series-level analytics: sellout velocity, repeat guest rate, revenue per theme, demand forecasting. New analytics views + data aggregation. Spec needed: yes. - EXPAND
3. **Social media integration** - Instagram/Facebook post scheduling from ChefFlow. Announcement scheduling with countdown. Spec needed: yes. - OUT-OF-SCOPE (social API integrations are a different product category)

### Out-of-Scope (documented, not planned)

1. **Full social media management** - Instagram posting, story scheduling, social analytics. Why out-of-scope: this is a social media tool, not a chef ops tool. Marco would continue using Instagram directly. ChefFlow's role is generating content (AI captions exist), not managing the social platform.
2. **QR door scanning / check-in app** - Mobile app for ticket scanning at event entrance. Why out-of-scope: requires native mobile app or dedicated hardware integration. Attendance tracking exists manually.
3. **Audience segmentation by engagement tier** - "VIP fans who attended 5+ events" vs "new followers." Why out-of-scope: this is a marketing automation platform feature. ChefFlow could tag guests but full segmentation with automated campaigns is a separate product.

---

## 6. SYSTEM BEHAVIOR REQUIREMENTS

```
BEHAVIOR: Ticket Release Timing Enforcement
  Rule: When sale_starts_at is set, the public purchase endpoint MUST return 403
        with countdown data before that timestamp. No early purchases, no manual override
        except by the chef toggling tickets off entirely.
  Trigger: Any purchaseTicket() call where NOW < sale_starts_at
  Violation example: A ticket is purchasable before the announced drop time because
                     the toggle was flipped early.
  Test: Set sale_starts_at to future. Attempt purchase. Expect 403 + countdown JSON.
```

```
BEHAVIOR: Circle Early Access Window
  Rule: When early_access_minutes is set on a ticket type, Circle members can purchase
        N minutes before public sale_starts_at. Non-members get countdown. Circle
        membership verified by authenticated session + circle_members lookup.
  Trigger: purchaseTicket() call where NOW is within early access window
  Violation example: Non-Circle member purchases during early access window.
  Test: Set 30min early access. Purchase as Circle member at T-20min: success.
        Purchase as non-member at T-20min: 403.
```

```
BEHAVIOR: Concurrent Event Prep Visibility
  Rule: Dashboard and calendar must surface prep-task counts and grocery-item counts
        aggregated across all events within the next 14 days, not just the next single event.
  Trigger: Dashboard load, weekly calendar view load
  Violation example: Chef sees "3 prep tasks" when they actually have 3 per event x 3 events = 9.
  Test: Create 3 events in next 7 days with prep tasks. Dashboard shows total across all.
```

```
BEHAVIOR: Sold-Out Event Must Capture Demand
  Rule: When all ticket types for an event are sold out, the public event page MUST
        show: (1) waitlist join form, (2) "Notify me of future events" email capture,
        (3) link to chef's other upcoming events. Never a dead end.
  Trigger: All ticket_types.sold_count >= capacity
  Violation example: Sold-out page shows "Sold Out" with no action path.
  Test: Sell out all tickets. Visit public page. Verify 3 demand capture elements present.
```

```
BEHAVIOR: Add-On Revenue Attribution
  Rule: Add-on purchases through ticket checkout MUST be attributed to the event
        in the financial ledger, included in event profitability calculations, and
        visible on the event Finance tab.
  Trigger: Stripe webhook for add-on line items in ticket checkout session
  Violation example: Wine pairing revenue appears in Stripe but not in event P&L.
  Test: Purchase ticket with add-on. Check event_financial_summary includes add-on revenue.
```

```
BEHAVIOR: Series Context on Event Creation
  Rule: When creating an event linked to a series, the form MUST pre-fill from
        series defaults: base_guest_count, venue (if recurring), ticket price template,
        and show a "Previous in series" reference panel.
  Trigger: Event form loaded with series_id parameter
  Violation example: Chef selects series but must re-enter guest count and price from scratch.
  Test: Create series. Create event in series. Verify pre-fill of guest count and price.
```

---

## 7. SCORE

### Score Card

| Dimension                  | Score      | Justification                                                                                                                                                                                                                                                 |
| -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow Coverage (30%)    | 42         | Ticketing exists and is strong, but no timed drops (BLOCKER) and no add-on checkout (BLOCKER) break the core revenue cycle. 2 critical BLOCKERs cap this at 49; actual coverage is lower because the ticket drop IS the workflow.                             |
| Data Model Fit (20%)       | 65         | `event_series` table exists (good), `event_ticket_types` + `event_tickets` + capacity enforcement are solid, partner_locations can awkwardly serve as venues. Missing: add-on entity, theme metadata, audience subscriber entity.                             |
| UX Alignment (15%)         | 50         | Event detail with Tickets tab works. Public event page works. But the overall UX assumes private-chef workflow: inquiry pipeline prominent, CRM central, ticketing buried in a tab. A dinner series chef would want tickets-first, audience-first navigation. |
| Financial Accuracy (15%)   | 58         | Per-event financials are excellent (ledger, profitability, close-out wizard). MONEY RISK from no series aggregation and no add-on revenue attribution caps this. Stripe integration is solid.                                                                 |
| Onboarding Viability (10%) | 40         | No dinner series archetype. Chef must discover ticketing on their own, create awkward "partner" for venues, and figure out the Circle system for audience management. Functional but not guided.                                                              |
| Retention Likelihood (10%) | 35         | Without timed drops, Marco keeps Eventbrite. Split-platform workflow kills stickiness. If drops were built, retention jumps to 70+ because the rest of ChefFlow (prep, finance, close-out) is genuinely better than spreadsheets.                             |
| **FINAL SCORE**            | **48/100** | **HOSTILE**                                                                                                                                                                                                                                                   |

**Scoring notes:**

- 2 BLOCKER failures cap Workflow Coverage at 49 max (actual: 42)
- 1 MONEY RISK failure caps Financial Accuracy at 59 max (actual: 58)
- 5 PARTIAL domains cap final score at 69 max (actual: 48)
- The 48 score reflects that ChefFlow has real, built infrastructure that serves this persona (ticketing, public pages, capacity enforcement, financial tracking, prep tools) but the two critical gaps (timed drops, add-on checkout) break the core business model

---

## 8. VERDICT

Chef Marco cannot use ChefFlow as his primary platform today because timed ticket drops -- the defining mechanic of his business -- do not exist. Without them, he must keep Eventbrite for the drop and use ChefFlow as a secondary tool for prep and finance, which halves its value. **The single highest-impact change is adding `sale_starts_at` to ticket types with a countdown UI and Circle-member early access** -- this one feature unlocks the entire persona. The second-highest is ticket checkout add-ons, which unlocks 15-25% of missing per-event revenue. Everything else (consolidated prep, series analytics, venue management) is important but not blocking.

**Overlap with Kai Donovan (#5):** Both personas hit the same #1 wall: no drop engine. Marco is more commercially mature (higher volume, add-on revenue, venue rotation) so he exposes additional gaps Kai didn't (add-on checkout, series financials, venue management). The drop engine is now confirmed as a cross-persona critical gap affecting at minimum 2 tested chef personas.
