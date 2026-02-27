# ChefFlow — Complete Application Audit

> **Generated:** 2026-02-23 ~6:00 PM EST (snapshot — source code may have changed since)
> **Scope:** Every page, every button, every tab, every link, every form, every modal, every overlay, every data display, every conditional element, every navigation path in the entire ChefFlow application.
> **Source:** Direct source code analysis of all ~265 page.tsx files and their imported components.
>
> **Companion Documents (full element-by-element detail):**
>
> - [`docs/ui-audit-calendar.md`](ui-audit-calendar.md) — Calendar system (7 pages, 1368 lines)
> - [`docs/ui-audit-settings.md`](ui-audit-settings.md) — Settings (50 pages, 1730 lines)
> - [`docs/ui-audit-network-community.md`](ui-audit-network-community.md) — Network & Community (6 pages, 14 components, 1093 lines)
> - [`docs/ui-audit-marketing-social.md`](ui-audit-marketing-social.md) — Marketing & Social (14 routes, 1173 lines)
> - [`docs/ui-audit-secondary-pages.md`](ui-audit-secondary-pages.md) — Onboarding, Import, Cannabis, Help, Loyalty, Safety, Remy, Games, Dev Tools (31 pages, 1431 lines)

---

## Table of Contents

1. [Dashboard](#1-dashboard)
2. [Events](#2-events)
   - [Events List](#21-events-list)
   - [Event Detail (4 Tabs)](#22-event-detail)
   - [Event Sub-Pages](#23-event-sub-pages)
3. [Clients](#3-clients)
   - [Client Directory](#31-client-directory)
   - [Client Detail](#32-client-detail)
   - [Client Sub-Sections](#33-client-sub-sections)
4. [Inquiry Pipeline](#4-inquiry-pipeline)
   - [Inquiries](#41-inquiries)
   - [Quotes](#42-quotes)
   - [Leads](#43-leads)
   - [Calls & Meetings](#44-calls--meetings)
   - [Partners](#45-partners)
   - [Prospecting](#46-prospecting)
   - [Guest Leads](#47-guest-leads)
   - [Proposals](#48-proposals)
   - [Testimonials](#49-testimonials)
5. [Financials](#5-financials)
   - [Financial Hub](#51-financial-hub)
   - [Expenses](#52-expenses)
   - [Invoices](#53-invoices)
   - [Payments](#54-payments)
   - [Ledger](#55-ledger)
   - [Payouts](#56-payouts)
   - [Reporting](#57-reporting)
   - [Tax Center](#58-tax-center)
   - [Payroll](#59-payroll)
   - [Other Financial](#510-other-financial)
   - [Goals](#511-goals)
6. [Culinary](#6-culinary)
   - [Menus](#61-menus)
   - [Recipes](#62-recipes)
   - [Ingredients](#63-ingredients)
   - [Components](#64-components)
   - [Costing](#65-costing)
   - [Prep](#66-prep)
   - [Vendors](#67-vendors)
   - [Inventory](#68-inventory)
   - [Culinary Board](#69-culinary-board)
   - [Seasonal Palettes](#610-seasonal-palettes)
7. [Calendar](#7-calendar)
8. [Inbox & Messaging](#8-inbox--messaging)
9. [Staff](#9-staff)
   - [Tasks](#9a-tasks)
   - [Stations (Kitchen Clipboard)](#9b-stations-kitchen-clipboard-system)
   - [Vendors & Food Cost](#9c-vendors--food-cost)
   - [Guest CRM](#9d-guest-crm)
   - [Notifications](#9e-notifications)
   - [Staff Portal](#9f-staff-portal-staff-facing)
10. [Analytics](#10-analytics)
11. [Daily Ops](#11-daily-ops)
12. [Activity & Queue](#12-activity--queue)
13. [Travel & Operations](#13-travel--operations)
14. [Reviews & AAR](#14-reviews--aar)
15. [Settings](#15-settings)
16. [Marketing & Social](#16-marketing--social)
17. [Network & Community](#17-network--community)
18. [Loyalty Program](#18-loyalty-program)
19. [Safety & Protection](#19-safety--protection)
20. [Remy (AI Concierge)](#20-remy-ai-concierge)
21. [Onboarding & Import](#21-onboarding--import)
22. [Cannabis Vertical](#22-cannabis-vertical)
23. [Help Center](#23-help-center)
24. [Games](#24-games)
25. [Dev Tools](#25-dev-tools)

---

## 1. DASHBOARD

**Route:** `/dashboard`

### Header (always visible)

| Element                                    | Type                  | What It Does                                                                                                                                                                  |
| ------------------------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Dashboard"                                | h1                    | Static title                                                                                                                                                                  |
| "Good [morning/afternoon/evening], [name]" | Text                  | Time-of-day greeting from user session                                                                                                                                        |
| "Layout" button                            | Button → Dropdown     | Opens `DashboardQuickSettings` panel for reordering widgets. Contains: up/down arrows per widget, "Manage widget visibility" link → `/settings/dashboard`, Save/Close buttons |
| "Full Queue"                               | Link button           | → `/queue`                                                                                                                                                                    |
| "New Event"                                | Link button (primary) | → `/events/new`                                                                                                                                                               |

### Banners (conditional, above widgets)

| Banner                     | Condition                               | Elements                                                                                                                                                                                                         |
| -------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Daily Ops Banner**       | `dailyPlanStats.totalItems > 0`         | Shows task counts by lane (admin/prep/creative/relationship) + estimated time. Entire banner links to `/daily`. If all cleared: green "Go cook" banner                                                           |
| **Priority Action Banner** | Always shown                            | If queue has next action: full-width colored link to `queue.nextAction.href` (red=critical, amber=high, brand=normal) showing action title + context. If empty: green "All caught up"                            |
| **Scheduling Gap Banner**  | `schedulingGaps.length > 0`             | Amber/red warning showing gap count. Contains "Plan Week →" link → `/calendar/week`                                                                                                                              |
| **Response Time SLA**      | Any open inquiry awaiting response      | Card showing count of overdue (24h+) / urgent (4h+) / fresh inquiries + avg response time. Red/amber/green styling. Links to `/inquiries?status=new`                                                             |
| **Pending Follow-Ups**     | Stale inquiries (3+ days quiet)         | Card listing inquiries where client hasn't responded in 3+ days. Shows client name, occasion, "Xd quiet" badge. Links to inquiry detail. Max 5 shown.                                                            |
| **Holiday Outreach Panel** | `holidayOutreachSuggestions.length > 0` | Per holiday: expandable row with AI outreach text + "Copy" button, promo code creation form (code/discount%/expiry inputs + "Create code" button), client rows with "Send" button opening email/SMS compose form |

### Widgets (configurable show/hide/reorder via Layout settings)

#### Onboarding Checklist

- **Condition:** Shown until all 5 setup phases complete
- 5 step links: Complete Profile → `/settings/profile`, Add Client → `/onboarding/clients`, Configure Loyalty → `/onboarding/loyalty`, First Recipe → `/onboarding/recipes`, Add Team Member → `/onboarding/staff`
- Completed steps show green checkmark + strikethrough
- "Open setup guide" link → `/onboarding`

#### Onboarding Accelerator

- **Condition:** No events yet AND (≤10 clients OR ≤10 inquiries)
- 4 steps with "Start" links: Import contacts → `/import?mode=csv`, Log past events → `/import?mode=past-events`, Capture inquiry → `/inquiries/new`, Send quote → `/quotes/new`
- Bottom buttons: "Next: [step]" (primary), "Upload CSV", "Log Past Events", "Brain Dump" (all secondary)

#### Upcoming Calls Widget

- **Condition:** `upcomingCalls.length > 0`
- "Schedule" link → `/calls/new`
- Per call row: link to `/calls/${id}` showing date, time, contact name, call type, duration, agenda progress
- "View all calls" link → `/calls`

#### Collaboration Invitations

- **Condition:** `pendingCollabInvitations.length > 0`
- Per invitation: event name, chef name, role badge, "Accept" button, "Decline" button

#### Pending Recipe Shares

- **Condition:** `pendingRecipeShares.length > 0`
- Per share: recipe name, chef name, "Accept & Copy" button, "Decline" button

#### Collaborating On

- **Condition:** `collaboratingOnEvents.length > 0`
- Per event: link to `/events/${id}` showing occasion, date, client, role badge

#### Recipe Debt Widget

- If debt=0: green "Recipe Book up to date" + "View all" → `/recipes`
- If debt>0: shows breakdown by time period + "Capture Now →" link → `/recipes/sprint`

#### Today's Schedule

- **Widget ID:** `todays_schedule`
- If event today: card with event name, "Full Schedule" link → `/events/${id}/schedule`, client/guests/city info, full `TimelineView` (hour-by-hour with NOW indicator), route plan with stops
- If no event: "No dinners today" + "Next up" link to next event

#### Next Action Card

- **Widget ID:** `next_action`
- Entire card is a link to `item.href` showing urgency label, domain icon, action title, description, context labels, "Take action →"

#### Week Strip

- **Widget ID:** `week_strip`
- 7-day grid showing events, prep days, free days with color-coded prep-status dots (green/amber/grey)
- "Full Schedule" link → `/schedule`
- Burnout warnings (amber boxes)

#### Priority Queue

- **Widget ID:** `priority_queue`
- `QueueSummaryBar`: 4 stat cards (Total Items, Critical, High Priority, Domains Active)
- Domain filter pills + Urgency filter pills
- Up to 20 `QueueItemRow` entries (each a link to item detail) with colored left border, urgency badge, domain label
- "View all" link → `/queue`

#### Follow-Ups Overdue

- **Condition:** `overdueFollowUps.length > 0`
- Per row: event link → `/events/${id}`, time overdue, "Send message →" link → `/clients/${id}#messages`
- "All Events" link → `/events?status=completed`

#### DOP Task Digest

- Shows incomplete Day-of-Plan tasks grouped by event
- Per task: **DOPTaskCheckbox** (toggle, calls `toggleDOPTaskCompletion`), category emoji, task label, deadline
- Event header links to event detail, "+X more → Full schedule" links to event schedule

#### Preparation Prompts

- **Widget ID:** `prep_prompts`
- Prompts in Overdue/Today/Upcoming groups, each a link to `prompt.actionUrl`

#### Service Quality / AAR

- **Widget ID:** `service_quality`
- Left card: calm/prep scores (last 5), trend indicator (up/down/steady), "All Reviews" link → `/aar`
- Right card: frequently forgotten items (count ≥2) in red

#### Business Snapshot

- **Widget ID:** `business_snapshot`
- **Revenue Card:** all-time net + this month with MoM % change, "Details" → `/financials`
- **Revenue Goal Card:** progress %, projected, gap, dinners needed, "View" → `/financials`
- **Profit Card:** this month profit, margin %, avg hourly rate, "Details" → `/financials`
- **Events Card:** this month + YTD counts, guests, "All Events" → `/events`
- **Inquiries Card:** active count, breakdown, "Pipeline" → `/inquiries`
- **YoY Cards:** revenue, events, avg event value (current year vs prior year with trend)
- **Pipeline Forecast:** expected + best case revenue, stage breakdown, "X open →" → `/inquiries`
- **Stuck Events:** per event link to `/events/${id}` showing days stuck
- **Multi-Event Day Alert:** warning with event links
- **Clients Card:** total count, loyalty approaching link → `/loyalty`, "Manage" → `/clients`
- **Re-Engage Clients:** dormant client rows linking to `/clients/${id}`
- **Next Best Actions:** per action link to `action.href`
- **Upcoming Occasions:** birthday/anniversary links to `/clients/${id}`
- **Expenses Card:** this month total, "Details" → `/expenses`
- **Food Cost Trend:** 6-month sparkline bars (green/amber/red), "Details" → `/finance/reporting`
- **Booking Seasons:** 12-month bar chart showing peak/quiet months
- **Top Events:** per event link to `/events/${id}` showing profit + margin %

#### Weekly Accountability Panel

- Closure streak badge, 4 stat blocks (events completed, follow-ups sent, closed on time, receipts uploaded)
- "Send now →" link → `/clients/communication/follow-ups` (conditional)

#### Quote Performance Insights

- Expiring quotes (each a link to `/quotes/${id}`), acceptance rate stats, pricing model breakdown
- "All Quotes →" → `/quotes`

#### Career Growth / Chef Journal

- **Widget ID:** `career_growth`
- 6 stat tiles, progression coaching tip, latest journey with "Open" link → `/settings/journal/${id}`
- "Open Journal" → `/settings/journal`

#### Hours Log

- **Widget ID:** `hours`
- Today/Week/All-Time stats, streak banner, category breakdown
- Quick preset buttons (15m/30m/1h/2h), full log form (date, hours, category select with 13 options, note textarea)
- "Log Hours" submit → `logDashboardHours()`, recent entries list

#### To Do List

- **Widget ID:** `todo_list`
- Per todo: toggle checkbox → `toggleTodo(id)`, delete button → `deleteTodo(id)`
- Add task form: text input + "+" submit button → `createTodo(text)`

#### Activity Section

- **Widget ID:** `activity`
- 3-column grid: My Recent Activity (links by entity type), Live Client Presence (real-time Supabase, links to `/clients/${id}`), Recent Activity Feed
- "View all →" → `/activity`

#### AI Business Insights Panel

- "Get Insights" button → calls Ollama locally
- Results: health score, per-domain insight cards with recommendations
- "Refresh" button to re-run

#### System Health (System Nerve Center)

- **Widget ID:** `system_nerve_center`
- **Condition:** Admin only — renders nothing for non-admins
- Header: "System Health" with overall status dot, "Sweep All" button (runs full health sweep + auto-fix), Refresh button
- Summary bar: healthy count, degraded count, error count, skipped count, time since last check
- Service rows grouped by tier: Core (Internet, Database, Auth, Dev Server), AI (Ollama PC, Ollama Pi), Services (Stripe, Resend, Gmail, Maps, Spoonacular, Kroger, MealMe), Infrastructure (Beta Server, CF Tunnel)
- Each row: status dot (green/amber/red), service name, detail text, latency in ms, expand arrow
- Expandable detail: error message, circuit breaker state, fix action buttons
- Fix buttons per service: Wake / Restart / Load Model (Ollama), Reset Breaker (external APIs), Restart PM2 (Beta Server — requires confirmation)
- Dangerous actions (PM2 restart) show `window.confirm()` dialog before executing
- Adaptive polling: 120s (all healthy), 30s (any degraded), 15s (any error)
- Footer: total services checked + sweep duration
- API: `GET /api/system/health` (read-only sweep), `POST /api/system/heal` (execute fix or sweep-all)

---

## 2. EVENTS

### 2.1 Events List

**Route:** `/events`

| Element           | Type             | Details                                                                                                                        |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| View toggle       | 2 buttons        | "List" → list view, "Board" → kanban view                                                                                      |
| "+ New Event"     | Link (primary)   | → `/events/new`                                                                                                                |
| Status filter bar | 9 filter buttons | All, Draft, Proposed, Accepted, Paid, Confirmed, In Progress, Completed, Cancelled — each a Link                               |
| Table rows        | Clickable rows   | Columns: Occasion (link → `/events/[id]`), Date, Client, Status badge, Quoted Price, "View" button, "Edit" button (draft only) |
| Empty state       | Conditional      | "No events yet" + "Create Event" → `/events/new`                                                                               |
| Kanban view       | Component        | `EventsKanban` with drag columns by status                                                                                     |

### 2.2 Event Detail

**Route:** `/events/[id]` (with `?tab=overview|money|ops|wrap`)

#### Header

- h1: event occasion, `EventStatusBadge`, date/time
- Buttons: "Edit Event" (draft only) → `/events/[id]/edit`, "Schedule" → `/events/[id]/schedule`, "Packing List" (not draft/cancelled) → `/events/[id]/pack`, "Grocery Quote" (has menu, not cancelled) → `/events/[id]/grocery-quote`, "Travel Plan" → `/events/[id]/travel`, "Back to Events" → `/events`
- Realtime sync component (auto-refreshes on FSM change)

#### Banners (conditional)

- Collaborator Role Banner (when viewing as collaborator)
- Deposit Shortfall Banner (accepted/paid, deposit not met)
- TakeAChef Conversion Banner (completed TAC events)
- Quick Debrief Prompt (completed, within 48h, no AAR)
- Preparation Progress Card (DOP progress bar + "View full schedule →")
- Packing Progress Card (confirmed/in_progress, "Open checklist →")
- Prep Block Nudge Banner (confirmed, no prep blocks)

#### Tab: Overview

- **Event Details Card:** location with map + weather, referral partner link, guest count, special requests, created date
- **Client Info Card:** name, email (mailto), phone (tel)
- **Client Portal QR:** QR code for client portal access
- **Service Contract:** template-based contract management
- **AI Contract Generator:** AI-powered contract drafting
- **Guests & RSVPs:** share link management, RSVP tracker, photo consent summary, host message template with copy button
- **Event Recap:** (completed events) share link to recap page
- **Guest Pipeline QR:** guest lead capture QR code
- **Guest Excitement Wall:** moderated guest messages
- **Post-Event Guest Outreach:** follow-up messaging panel
- **AI Allergen Risk Matrix:** AI-powered allergen analysis
- **AI Menu Nutritional Summary:** AI nutritional breakdown
- **Communication Log:** `MessageThread` (read-only) + `MessageLogForm` (compose with channel select, template select, textarea, submit)

#### Tab: Money

- **Menu Approval:** status display + "Edit Menu" → `/menus/[id]/editor`
- **Financial Summary:** 4 stats (Quoted, Deposit, Paid, Balance Due) + "View Invoice" → `/events/[id]/invoice` + export button
- **AI Pricing Intelligence:** (proposed/accepted only)
- **Record Payment Panel:** "Record Deposit/Payment" button → opens modal (amount, payment method, submit)
- **Process Refund Panel:** (cancelled, has payments) → opens modal
- **Payment Plan:** installment schedule manager
- **Mileage Log:** log mileage entries
- **Tip Log:** (in_progress/completed) log tips
- **Budget Tracker:** budget vs actual with progress bar
- **Quick Receipt Capture:** fast upload for receipts
- **Expenses Card:** expense list with category subtotals, "Add Expense" → `/expenses/new?event_id=[id]`, per-expense "View" → `/expenses/[id]`
- **Profit Summary:** revenue, expenses, profit, margin %, food cost %, per-guest breakdown, effective hourly rate
- **Loyalty Points:** (completed, points > 0) points earned + "View Client Loyalty" link
- **Split Billing:** link to `/events/[id]/split-billing`

#### Tab: Ops

- **Time Tracking:** 5 activity rows (Shopping/Prep/Packing/Driving/Execution) each with Start/Stop buttons, manual edit mode with number inputs
- **Event Staff Panel:** roster with add/remove/log-hours actions per staff member
- **AI Staff Briefing, AI Prep Timeline, AI Service Timeline:** AI-generated documents
- **Chef Collaborators:** invite other chefs panel
- **Temperature Log:** food safety temp logging
- **AI Temperature Anomaly Detection**
- **Shopping Substitutions:** log substitutions
- **Menu Modifications:** (completed) log modifications
- **Carry-Forward Inventory:** surplus from other events + AI matching
- **AI Grocery List Consolidation**
- **Unused Ingredients:** (completed) log unused for carry-forward
- **Contingency Plans:** add/edit scenarios + emergency contacts + AI suggestions
- **Document Section:** 8+ printable PDFs (DOP, packing, grocery, etc.)
- **Readiness Gate Panel:** hard blocks (red) + soft warnings (amber) before FSM transition
- **Event Transitions:** FSM buttons by status: "Propose" (draft), "Confirm" (paid), "Mark In Progress" (confirmed), "Mark Completed" (in_progress, redirects to close-out), "Cancel" (opens reason dialog). All disabled when hard-blocked.
- **Post-Event Closure:** (completed) 4-item checklist (AAR Filed, Reset Complete, Follow-Up Sent, Financially Closed) with action buttons
- **AAR Summary:** calm/prep ratings, forgotten items, well/wrong text
- **Event Photo Gallery:** upload and manage photos
- **Recipe Capture Prompt:** unrecorded recipe components

#### Tab: Wrap-Up

- **File AAR Prompt:** → `/events/[id]/aar`
- **Post-Dinner Debrief CTA:** → `/events/[id]/debrief`
- **Client Satisfaction Survey:** "Send Survey" button
- **AI AAR Generator, AI Review Request Drafter, AI Gratuity Framing, AI Social Media Captions**
- **Status History:** timeline of all FSM transitions

### 2.3 Event Sub-Pages

| Route                        | Key Elements                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/events/[id]/edit`          | Full event form (draft/proposed only)                                                                                                                                                                              |
| `/events/[id]/schedule`      | Day-of timeline + DOP checklist with toggleable completions                                                                                                                                                        |
| `/events/[id]/pack`          | 5-section packing checklist with tap-to-check items, progress bar, "Mark Car Packed" button, "Reset checklist" button, departure callout, "Print PDF" button                                                       |
| `/events/[id]/travel`        | Travel legs with add/edit forms, route stops, ingredient sourcing status dropdowns, start/complete/cancel/delete buttons per leg                                                                                   |
| `/events/[id]/grocery-quote` | Multi-vendor price comparison table (USDA/Spoonacular/Kroger/MealMe), budget check, "Open in Instacart →" button, "Save Prices to Recipe Book" button                                                              |
| `/events/[id]/invoice`       | Print-format invoice with service details, payment history, balance summary, "Download PDF" + "Print" buttons                                                                                                      |
| `/events/[id]/aar`           | AAR form: calm/prep/execution ratings (1-5), what went well/wrong textareas, forgotten items tag input, submit button                                                                                              |
| `/events/[id]/debrief`       | 4 collapsible sections: Dish Gallery (photo upload), Recipe Notes (per-recipe fields), Client Insights (milestones, dietary, vibe), How Did It Go (star rating + AI auto-draft + notes). "Complete Debrief" button |
| `/events/[id]/close-out`     | 5-step wizard: Tip → Receipts → Mileage → Reflection (Quick AAR) → Close Out. Final celebration screen with confetti, profit display, "Go to Dashboard" button                                                     |
| `/events/[id]/financial`     | 7-section financial summary with revenue, costs, margins, time investment, mileage input, historical comparison. "Mark Financially Closed" button                                                                  |
| `/events/[id]/receipts`      | Per-receipt: thumbnail, OCR-extracted line items with category/tag dropdowns, "Auto-Extract" button, "Approve → Add to Expenses" button                                                                            |
| `/events/[id]/split-billing` | Divide event cost across multiple payers                                                                                                                                                                           |
| `/events/[id]/kds`           | Kitchen Display System: live course tracking with fire → plating → served progression                                                                                                                              |
| `/events/[id]/dop/mobile`    | Full-screen mobile DOP with large tap targets                                                                                                                                                                      |
| `/events/[id]/guest-card`    | Printable QR card for dinner tables                                                                                                                                                                                |
| `/events/[id]/interactive`   | Interactive tappable version of any of 9 document types                                                                                                                                                            |

---

## 3. CLIENTS

### 3.1 Client Directory

**Route:** `/clients`

| Element                    | Type           | Details                                                                                                                                                            |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Export CSV"               | Link           | Downloads CSV                                                                                                                                                      |
| "+ Add Client"             | Button         | → `/clients/new`                                                                                                                                                   |
| **Client Invitation Form** | Form           | Name + email inputs, "Create client (no invitation)" checkbox, "Send Invitation" / "Create Client" button. On success shows invitation URL with "Copy Link" button |
| **Pending Invitations**    | Table          | Email, Name, Sent date, Status badge, "Copy Link" button, "Cancel" button (with confirm dialog)                                                                    |
| **Clients Table**          | Sortable table | Search input, sortable columns (Name, Total Spent, Created), clickable rows → `/clients/[id]`, health badge per row                                                |

### 3.2 Client Detail

**Route:** `/clients/[id]` — ~30 distinct panels

**Header:** name, status dropdown (Active/Dormant/Repeat Ready/VIP), health badge, relationship badge, email, tag manager (add/remove tags), portal link manager (generate/copy/rotate/revoke), "Create Event for Client" → `/events/new?client_id=...`

**All panels on client detail (in order):**

1. **Dormancy Warning** — amber banner with "Send Message" link (conditional: 90+ days inactive)
2. **Next Best Action Card** — urgency-colored link to action page
3. **Profile Completeness Meter** — progress bar (conditional: <85%)
4. **Client Information** — name, email, phone, since date + email toggle switch
5. **Demographics Editor** — edit mode with occupation, company, birthday, anniversary, Instagram, contact method, referral source, formality
6. **Statistics** — 4 cards: total events, completed, total spent, avg event value
7. **Profitability History** — avg margin/food cost/hourly rate + mini bar chart (conditional: has events)
8. **LTV Trajectory Chart** — line chart (conditional: ≥2 events)
9. **Menu History Panel** — dishes/menus served to this client
10. **Direct Outreach Panel** — email/SMS compose + outreach history
11. **Financial Detail** — event breakdown + ledger entries
12. **Loyalty Card** — tier badge, points/stats, progress bar, available rewards with redeem buttons, award bonus form, recent transactions
13. **Personal Info Editor** — preferred name, partner name, family notes (edit/save/cancel)
14. **Pet Manager** — add/remove pets (name, type, notes)
15. **Client Photo Gallery** — upload/manage photos
16. **Kitchen Profile Panel** — size, constraints, equipment, oven/burner/counter/fridge/sink notes (edit/save)
17. **Security & Access Panel** — gate code, WiFi, parking, access instructions, house rules (edit/save)
18. **Service Defaults Panel** — service style, guest count, preferred days, budget range, cleanup, leftovers (edit/save)
19. **Client Connections** — link other clients with relationship type
20. **Fun Q&A** — personality answers display
21. **Allergy Records** — add/remove allergy records with severity
22. **NDA Panel** — NDA status toggle, coverage, dates, photo permission
23. **Quick Notes** — add/pin/edit/delete notes with category (General/Dietary/Preference/Logistics/Relationship)
24. **Milestone Manager** — add/remove milestones (type, date, label, notes)
25. **Address Manager** — add/remove addresses (label, address, city/state/zip, access instructions, kitchen notes)
26. **Communication History** — sentiment badge + message thread + compose form
27. **AI Client Preference Panel** — AI-analyzed preferences (Ollama)
28. **Chef's Internal Assessment** — referral potential, red flags, acquisition cost, payment behavior, tipping pattern (edit/save)
29. **Unified Relationship Timeline** — chronological events/messages/notes/activity
30. **Event History Table** — status filter buttons + table with "View Details" per row
31. **Client Feedback** — reviews with ratings (conditional)

### 3.3 Client Sub-Sections

| Route                                         | Content                                                                                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/clients/new`                                | Full create form: Quick Add mode (essential fields) or Full Profile mode (8 collapsible sections covering identity, household, culinary preferences, access/security, kitchen profile, service defaults, personality, internal assessment) |
| `/clients/[id]/recurring`                     | Recurring services + dish history + "Log Dish Served" form                                                                                                                                                                                 |
| `/clients/active`, `/inactive`, `/vip`        | Filtered client tables                                                                                                                                                                                                                     |
| `/clients/duplicates`                         | Duplicate pairs with confidence badges, links to both records                                                                                                                                                                              |
| `/clients/segments`                           | Segment builder: name, color, description, filter rows (field/operator/value), save                                                                                                                                                        |
| `/clients/gift-cards`                         | Issue gift cards/vouchers, stats, codes table with send/deactivate actions, redemption history                                                                                                                                             |
| `/clients/communication`                      | Hub linking to Notes, Follow-Ups, Upcoming Touchpoints                                                                                                                                                                                     |
| `/clients/communication/notes`                | All client notes across clients                                                                                                                                                                                                            |
| `/clients/communication/follow-ups`           | Overdue/At-Risk/Check-In stats + table                                                                                                                                                                                                     |
| `/clients/communication/upcoming-touchpoints` | This week/month/60-day stats + table                                                                                                                                                                                                       |
| `/clients/history`                            | Hub linking to Event History, Past Menus, Spending History                                                                                                                                                                                 |
| `/clients/history/event-history`              | All past events table                                                                                                                                                                                                                      |
| `/clients/history/past-menus`                 | Menu library table                                                                                                                                                                                                                         |
| `/clients/history/spending-history`           | Ranked spending table                                                                                                                                                                                                                      |
| `/clients/preferences`                        | Hub linking to Dietary Restrictions, Allergies, Favorites, Dislikes                                                                                                                                                                        |
| `/clients/preferences/allergies`              | Tag cloud + table                                                                                                                                                                                                                          |
| `/clients/preferences/dietary-restrictions`   | Tag cloud + table                                                                                                                                                                                                                          |
| `/clients/preferences/favorite-dishes`        | Tag cloud + table                                                                                                                                                                                                                          |
| `/clients/preferences/dislikes`               | Tag cloud + table                                                                                                                                                                                                                          |
| `/clients/insights`                           | Hub: Top Client, Most Frequent, Avg Spend, At-Risk, Active on Portal                                                                                                                                                                       |
| `/clients/insights/top-clients`               | Ranked revenue table                                                                                                                                                                                                                       |
| `/clients/insights/most-frequent`             | Ranked frequency table                                                                                                                                                                                                                     |
| `/clients/insights/at-risk`                   | Days-since + priority table                                                                                                                                                                                                                |
| `/clients/loyalty`                            | Hub: enrolled, points outstanding, tier distribution                                                                                                                                                                                       |
| `/clients/loyalty/points`                     | Points balance table                                                                                                                                                                                                                       |
| `/clients/loyalty/rewards`                    | Reward codes table                                                                                                                                                                                                                         |
| `/clients/loyalty/referrals`                  | Referral source analysis with bars + top referrer cards                                                                                                                                                                                    |
| `/clients/presence`                           | Real-time client portal monitoring (Supabase Realtime), online count, activity stream with high-intent badges                                                                                                                              |

---

## 4. INQUIRY PIPELINE

### 4.1 Inquiries

**Route:** `/inquiries`

- List + Kanban views with toggle buttons
- **Smart Priority Grouping (All view):** Inquiries auto-sorted into 4 sections:
  - "Needs Your Response" (red) — new/awaiting_chef with no outbound message
  - "Follow-Up Due" (amber) — awaiting_client/quoted, client quiet 3+ days
  - "Active Pipeline" (green) — open inquiries on track
  - "Closed" (collapsed) — declined/expired/confirmed behind `<details>` toggle
- 8 status filter tabs (All, New, Awaiting Client, Awaiting Chef, Quoted, Confirmed, Declined/Expired, TakeAChef)
- Per inquiry row: client name, status/channel/booking score/lead score/likelihood/urgency badges, completeness ring (SVG progress), occasion, next action, relative time
- "Funnel Analytics" button → `/analytics/funnel`
- "+ Log New Inquiry" → `/inquiries/new`

**`/inquiries/new` — Form:** Smart Fill (paste text → AI parse via Ollama), channel select, client link, contact info, event details (date/guests/occasion/location/budget/dietary/service/cannabis), original message textarea, internal notes. Submit creates inquiry.

**`/inquiries/[id]` — Detail:** Full inquiry dossier with contact card, confirmed facts, pipeline card (next action/follow-up due with inline edit), quotes card ("+ Create Quote" → `/quotes/new`), AI response composer (generate draft → edit → "Approve & Send" via Gmail), communication log, transition buttons by status (with decline modal), notes section, recipe ideas linker, printed documents section, metadata.

### 4.2 Quotes

**Route:** `/quotes`

- Status filter tabs (All, Draft, Sent, Accepted, Rejected, Expired)
- Quote acceptance insights panel (analytics)
- Per row: client, status/pricing model badges, total amount

**`/quotes/new` — Form:** Client pricing history panel, AI pricing suggestions, price calculator (collapsible with service type/courses/date/distance/weekend premium, "Use This Price →" button), main form (client, quote name, pricing model, amount, deposit, valid until, notes). Submit creates quote.

**`/quotes/[id]` — Detail:** Pricing card, deposit/validity card, linked resources, transition buttons (Send/Accept/Reject/Expire/Revise/Edit/Delete), notes, status history.

### 4.3 Leads

**Route:** `/leads` — Website form submissions with "Claim →" and "Dismiss" buttons per lead. Sub-pages: contacted, qualified, converted, archived.

### 4.4 Calls & Meetings

**Route:** `/calls` — Status tabs (All/Upcoming/Completed/No-show/Cancelled). Per call: type badge, contact, date/time, duration, agenda progress.

**`/calls/new`** — Form: type select, datetime, duration, title, contact info, prep notes, notification toggle.

**`/calls/[id]`** — Detail: meta grid, status action buttons (Mark confirmed/Cancel), agenda checklist (add/remove/toggle items, progress bar), outcome form (summary, notes, next action, duration, "Mark complete & save" / "Mark as no-show" buttons).

### 4.5 Partners

**Route:** `/partners` — Filter by status + type, stats per partner (referrals, events, revenue).

**`/partners/[id]`** — 6 stat cards, contact info, internal notes, locations (add/edit/deactivate with image gallery), bulk assign events, service history table, share report button, print report button, portal invite button.

### 4.6 Prospecting (Admin Only)

**Route:** `/prospecting` — Stats, filter form, prospect table.

**`/prospecting/[id]`** — Full dossier: contact info, gatekeeper intel, quick call log (outcome buttons + follow-up select + notes), approach strategy, talking points, call script, intelligence card, notes timeline. "Convert to Inquiry" and "Delete" buttons.

**`/prospecting/queue`** — Daily call queue builder.
**`/prospecting/scrub`** — AI lead scrub (paste query → Ollama generates dossiers).
**`/prospecting/scripts`** — Call script CRUD.

### 4.7 Guest Leads

**Route:** `/guest-leads` — Filter tabs (All/New/Contacted/Converted/Archived). Per lead: status-specific action buttons (Convert to Client, Mark Contacted, Archive, Restore, View Client).

**`/guest-analytics`** — Repeat guests with event badges, dinner groups with co-attendance data.

### 4.8 Proposals

**Route:** `/proposals` — Hub linking to Templates and Add-Ons.

**`/proposals/templates`** — Visual builder with create/edit forms.
**`/proposals/addons`** — Selectable add-on cards with running per-person/total, create/edit/delete.

### 4.9 Testimonials

**Route:** `/testimonials` — Filter tabs (All/Pending/Approved/Featured). Per testimonial: food/chef ratings, text, "Approve"/"Unapprove"/"Feature"/"Unfeature" buttons.

---

## 5. FINANCIALS

### 5.1 Financial Hub

**Route:** `/financials` — Summary cards (revenue, refunds, net, tips), monthly overview with progress bar, revenue goal card, per-event breakdown table (links to events), other income card, filterable ledger entries table with CSV export.

**Route:** `/finance` — 16 section link cards to all sub-pages.

### 5.2 Expenses

**Route:** `/expenses` — Summary cards, category breakdown chips, filter bar, expense table. "+ Add Expense" → `/expenses/new`.

**`/expenses/[id]`** — Amount, category, payment method, type badge, event link, notes, receipt photo, mileage.

**`/finance/expenses/*`** — 7 category sub-pages (food-ingredients, labor, marketing, miscellaneous, rentals-equipment, software, travel) each with KPIs + filtered table.

### 5.3 Invoices

**`/finance/invoices`** — KPIs + 6 status link cards (Draft/Sent/Paid/Overdue/Refunded/Cancelled). Each sub-page has KPIs + filtered table.

### 5.4 Payments

**`/finance/payments`** — KPIs + 4 sub-links (Deposits, Installments, Refunds, Failed/Pending). Each with tables.

### 5.5 Ledger

**`/finance/ledger`** — KPIs + Transaction Log (full table with CSV export) + Adjustments (credits/add-ons).

### 5.6 Payouts

**`/finance/payouts`** — Stripe Payouts (conditional on Stripe Connect), Manual Payments, Reconciliation (match events to payments).

### 5.7 Reporting

**`/finance/reporting`** — 9 report link cards. Sub-pages: Revenue by Month/Client/Event, Profit by Event, Expense by Category, Tax Summary, YTD Summary, P&L (with year selector + monthly revenue chart + CSV download), Year-End Summary.

### 5.8 Tax Center

**`/finance/tax`** — Year selector, quarterly estimate cards, mileage log form (date/purpose/from/to/miles), "Export for Accountant (JSON)" button. Sub-pages: Quarterly, Year-End, 1099-NEC, Depreciation, Home Office, Retirement.

### 5.9 Payroll

**`/finance/payroll`** — KPIs + links to Employees (add/edit/terminate), Run Payroll, Form 941, W-2 Summaries.

### 5.10 Other Financial

| Route                          | Content                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `/finance/recurring`           | Recurring invoice form                                                                                                        |
| `/finance/retainers`           | Retainer list + detail + create. Detail: agreement, billing timeline, linked events, status actions                           |
| `/finance/bank-feed`           | Bank feed panel + manual transaction form                                                                                     |
| `/finance/cash-flow`           | 30-day cash flow forecast chart                                                                                               |
| `/finance/forecast`            | Revenue forecast with trend + next 3 months                                                                                   |
| `/finance/disputes`            | Dispute tracker                                                                                                               |
| `/finance/contractors`         | 1099 contractor panel                                                                                                         |
| `/finance/sales-tax`           | Sales tax panel with settings (enable/disable, state rate, local rate, filing frequency, registration #) + remittance history |
| `/finance/planning/break-even` | Break-even calculator                                                                                                         |
| `/finance/year-end`            | Year-end summary with revenue, expenses, tax prep, "Download for Accountant" CSV, "Email to Myself"                           |

### 5.11 Goals

**`/goals`** — Goals dashboard. **`/goals/setup`** — Goal creation wizard. **`/goals/[id]/history`** — Sparkline + monthly history table. **`/goals/revenue-path`** — Revenue path panel with gap-closing strategies. **`/finance/goals`** — Revenue goal snapshot with recommendations.

---

## 6. CULINARY

### 6.1 Menus

- **`/menus`** — Grid of menu cards with search + sort. "Create Menu" → `/menus/new`.
- **`/menus/[id]`** — Menu detail with edit mode (draft only), per-component recipe linking (inline search), duplicate/delete. "Open Editor" → `/menus/[id]/editor`.
- **`/menus/[id]/editor`** — Full document editor with auto-save (1.5s debounce), structured mode (courses/dishes with dietary toggles, allergen flags, chef notes, dish photos, hover reorder/delete) or freeform mode. Right sidebar: event/client/season/pricing/previous menus panels.

### 6.2 Recipes

- **`/recipes`** — Recipe book with search, category filter, sort, seasonal banner. Per card links to detail.
- **`/recipes/new`** — Smart Import (AI parse from text) or Manual Entry (all fields + dynamic ingredient rows).
- **`/recipes/[id]`** — Detail with ingredients, scaling calculator, method, cost summary, event history. Duplicate/Share/Delete buttons.
- **`/recipes/[id]/edit`** — Full edit form (ingredient names locked, new ingredients highlighted).
- **`/recipes/ingredients`** — Ingredient library with inline edit per row (name, category, unit, price).
- **`/recipes/sprint`** — Queue-based recipe capture: paste description → AI parse → save → next. Progress bar + skip/done.

### 6.3 Ingredients

- **`/culinary/ingredients`** — Full library with add form (name, category, unit, price, staple checkbox).
- **`/culinary/ingredients/seasonal-availability`** — 4 season cards + year-round section.
- **`/culinary/ingredients/vendor-notes`** — Grouped by vendor.

### 6.4 Components

- **`/culinary/components`** — All menu components with stats. Add form (name, category, dish select, execution notes, make-ahead checkbox).
- Sub-pages: `/culinary/components/ferments`, `/garnishes`, `/sauces`, `/shared-elements`, `/stocks` — each filtered with specific stats.

### 6.5 Costing

- **`/culinary/costing`** — Recipe + menu cost tables.
- **`/culinary/costing/food-cost`** — Large food cost % KPI with threshold colors.
- **`/culinary/costing/menu`** — Per-menu cost analysis.
- **`/culinary/costing/recipe`** — Per-recipe cost with relative cost bars.

### 6.6 Prep

- **`/culinary/prep`** — Make-ahead components grouped by menu.
- **`/culinary/prep/shopping`** — Consolidated ingredient list grouped by category.
- **`/culinary/prep/timeline`** — Components sorted by lead time.

### 6.7 Vendors

- **`/culinary/vendors`** — Vendor directory with add form, star/unstar toggle, delete button.

### 6.8 Inventory

- **`/inventory`** — Hub with par alert panel + 4 navigation tiles.
- **`/inventory/counts`** — Par-level tracking with add form + count entry form.
- **`/inventory/waste`** — Waste log form (ingredient, qty, reason, cost) + dashboard with 6-month trend.
- **`/inventory/food-cost`** — Theoretical vs actual cost variance per event.
- **`/inventory/vendor-invoices`** — Upload + view invoices.

### 6.9 Culinary Board

- **`/culinary-board`** — Visual culinary vocabulary display. Board/List/Submissions(admin) views. "Add Word" dialog.

### 6.10 Seasonal Palettes

- **`/settings/repertoire`** — Palette list with create button.
- **`/settings/repertoire/[id]`** — Edit palette: season name, micro-windows (add/edit/delete), proven wins (link recipes), save/delete.

---

## 7. CALENDAR

> **Full element-by-element detail → [`docs/ui-audit-calendar.md`](ui-audit-calendar.md)** (1368 lines, 7 pages)

| Route             | Key Elements                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/calendar`       | Monthly grid with filter toggles (events, drafts, prep blocks, calls, personal, business, intentions, leads). Day click → detail panel with items + "Quick Block"/"Remove Block" + "+ Add Entry" modal. 2-column layout with Seasonal Palette sidebar. Entry modal: 3 entry type groups (Personal/Business/Intentions) with fields (title, dates, times, all-day, blocks bookings, revenue section, public signal section) |
| `/calendar/day`   | 6AM–midnight time grid with 30-min slots. Click slot → pre-filled entry modal. Per-slot item cards with "View" links                                                                                                                                                                                                                                                                                                       |
| `/calendar/week`  | 7-column Mon–Sun grid with prep blocks (complete/delete buttons), event cards (links), "+ add" per day → inline block form (type/title/date/time/duration). Gap alerts with "Auto-schedule" → suggestion modal with bulk create. Calendar entry banners spanning date ranges                                                                                                                                               |
| `/calendar/year`  | 52-week grid grouped by month. Week cells colored by event/gap status, clickable → week view. Stats strip + year navigation                                                                                                                                                                                                                                                                                                |
| `/calendar/share` | Generate share tokens with labels, copy URL, revoke tokens                                                                                                                                                                                                                                                                                                                                                                 |
| `/schedule`       | FullCalendar-based with 4 views (Month/Week/Day/Agenda), keyboard shortcuts (T/M/W/D/A/N/arrows), mini calendar sidebar, drag-and-drop rescheduling, event detail popovers, seasonal sidebar                                                                                                                                                                                                                               |
| `/waitlist`       | Waiting + contacted entries with "Mark Contacted"/"Expire" buttons. Add form: date, guests, occasion, notes                                                                                                                                                                                                                                                                                                                |

---

## 8. INBOX & MESSAGING

| Route                      | Key Elements                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/inbox` (triage enabled)  | 4 tabs (Unassigned/Action Required/Snoozed/Done), source filters, response turn filter (My Turn/Their Turn/No Action), follow-up filter. Per item: star toggle, status badges, AI-suggested inquiry/event links with accept buttons. Bulk actions toolbar (Mark Done/Snooze/Unassign). Log New Message modal. Calendar peek sidebar |
| `/inbox` (triage disabled) | Simpler feed view with source filter toggles                                                                                                                                                                                                                                                                                        |
| `/inbox/triage/[threadId]` | Full thread detail view                                                                                                                                                                                                                                                                                                             |
| `/inbox/history-scan`      | Gmail historical scan: status bar, pending/imported/dismissed findings                                                                                                                                                                                                                                                              |
| `/chat`                    | Conversation list + "New Conversation" button                                                                                                                                                                                                                                                                                       |
| `/chat/[id]`               | Chat view + sidebar (client info, pinned notes, AI insights)                                                                                                                                                                                                                                                                        |

---

## 9. STAFF

| Route                 | Key Elements                                                                                                                                                                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/staff`              | **Search bar** (real-time filter by name), **Role filter** dropdown (all/lead_chef/sous_chef/cook/server/bartender/assistant), **Status filter** (active/inactive/all). Staff cards now **clickable** → link to `/staff/[id]`. Active + inactive sections                                                                  |
| `/staff/[id]`         | **Staff detail page.** Contact info (name, email, phone, role, rate). **Portal Access** card: "Create Login" form (email + password) or "Portal Access Active" badge if login exists. Onboarding checklist progress with document status. Assignment history (event list). Performance stats. Deactivate button. Edit form |
| `/staff/schedule`     | 7-column week grid. Per-event: assigned staff list + "Assign" button → staff picker dropdown. Staff summary bar                                                                                                                                                                                                            |
| `/staff/availability` | Staff × 7-day grid. Click cell cycles Available/Unavailable/Unknown. Summary row with counts                                                                                                                                                                                                                               |
| `/staff/clock`        | Active entries with green pulse dot + elapsed time + "Out" button. Clock in button → staff picker. Completed entries list                                                                                                                                                                                                  |
| `/staff/performance`  | Sortable table (Name, On-Time Rate, Cancellations, Avg Rating, Total Events) with color-coded badges. Top performer trophy                                                                                                                                                                                                 |
| `/staff/labor`        | Summary cards (labor cost, ratio, avg). Recharts dual-axis chart (revenue bars + labor bars + ratio line). Monthly breakdown table                                                                                                                                                                                         |

---

## 9A. TASKS

| Route              | Key Elements                                                                                                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/tasks`           | **Daily task board.** Date navigation (prev/today/next). Tasks grouped by assigned person. Each task: title, priority badge (low/medium/high/urgent), status (pending/in_progress/done), due time, "Complete" button. Create task form (title, description, assignee, due date/time, priority) |
| `/tasks/templates` | **Task template management.** List of templates (opening/closing/prep/cleaning/custom). Create template: name, category, items list. "Generate Today's Tasks" button — one-click creates all tasks from template. Edit/delete templates                                                        |

---

## 9B. STATIONS (Kitchen Clipboard System)

| Route                            | Key Elements                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/stations`                      | **Station list.** Cards per station (name, status, component count). Create station form (name, description). Click → station detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `/stations/[id]`                 | **Station detail.** Station info + menu items with components. Clipboard link. Edit station form. Manage menu items and components (name, unit, par level, shelf life)                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `/stations/[id]/clipboard`       | **The Clipboard** — core daily view. Excel-like grid: Item, Par, On Hand, Need to Make, Made, Need to Order, Waste, Shelf Life, Notes. Auto-generates entries from station components. Shift check-in/check-out panel. 86 toggle per item. Shelf life color coding (green/yellow/red). Updated_by accountability on every save                                                                                                                                                                                                                                                                                  |
| `/stations/[id]/clipboard/print` | **Print-friendly clipboard.** `@media print` CSS. Table with all clipboard columns. Shelf life highlights (expired=red, expiring today=yellow). Station name + date header. "Print (Ctrl+P)" button. No nav chrome                                                                                                                                                                                                                                                                                                                                                                                              |
| `/stations/orders`               | **Unified order sheet.** All "need to order" items from ALL stations compiled. Pending order requests table. One view for the purchaser to call/email vendors                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `/stations/orders/print`         | **Print-friendly order sheet.** Pending order requests table + clipboard "need to order" items. Blank "Ordered" column for manual checkoff when calling vendors. Clean black/white layout for paper                                                                                                                                                                                                                                                                                                                                                                                                             |
| `/stations/waste`                | **Waste log.** 7-day summary cards (total entries, estimated waste value, top reason). Full waste log table with reason badges (expired/over_production/dropped/contamination/quality/other), values, timestamps                                                                                                                                                                                                                                                                                                                                                                                                |
| `/stations/ops-log`              | **Operations log.** Append-only, permanent. Action type badges (Check In/Out, Prep Complete, Stock Update, Order Request, Delivery, Waste, 86). Description + timestamp per entry. Color-coded by action type                                                                                                                                                                                                                                                                                                                                                                                                   |
| `/stations/daily-ops`            | **Daily Ops Command Center.** Morning overview page. Header: today's date + shift indicator (Morning/Afternoon/Evening). Quick action bar: Generate Opening Tasks button (from first opening template), View Order Sheet link, Print Clipboards link. All Stations grid (2-col mobile, 3-4 col desktop): stock-at-par %, 86 count badge, checked-in staff, last updated. Tasks summary: total/completed/pending with progress bar + overdue tasks highlighted in red. Pending orders: count + top 5 items by quantity. Alerts section: 86'd items, expiring items, low stock warnings — color-coded by severity |

---

## 9C. VENDORS & FOOD COST

| Route                       | Key Elements                                                                                                                                                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/vendors`                  | **Vendor list.** Search by name. Status toggle (active/inactive). Cards: name, contact, phone, delivery day chips, status badge. "Add Vendor" form (name, contact, phone, email, account #, delivery days, payment terms, notes). Click → vendor detail                                  |
| `/vendors/[id]`             | **Vendor detail.** Info card (contact, phone, email, account #, payment terms, delivery days, notes) with "Edit Vendor Info" collapsible form. **Price list** (VendorPriceList component). **Invoice history** table (date, invoice #, total, notes). "Log New Invoice" collapsible form |
| `/vendors/invoices`         | **All invoices** across vendors. Filter by vendor dropdown. Table (date, vendor, invoice #, total, notes). "Log Invoice" form + CSV upload                                                                                                                                               |
| `/vendors/price-comparison` | **Side-by-side price comparison** across vendors per ingredient. Sorted by unit price. PriceComparison component                                                                                                                                                                         |
| `/food-cost`                | **Food cost dashboard.** Date range picker (week/month/custom). Computed food cost % = `(purchases - waste) / revenue × 100`. Charts + trends. Alert when above target. Integrates DailyRevenueForm, InvoiceForm, InvoiceCsvUpload                                                       |
| `/food-cost/revenue`        | **Daily revenue entry.** Date picker + amount input ($). "Save" upserts for the day. Revenue history table (last 30 days) with edit capability. Source tracking (manual/csv/pos)                                                                                                         |

---

## 9D. GUEST CRM

| Route                  | Key Elements                                                                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/guests`              | **Guest directory.** GuestSearch with instant dropdown (search by name/phone). Guest cards with name, visit count, total spend, tags (VIP/regular/new/problem/comp_pending), pending comp indicator. "Add Guest" form. Click → guest profile                                         |
| `/guests/[id]`         | **Guest profile.** Contact info (name, phone, email, first/last visit, total visits, spend). **Tags** section with color-coded badges + add/remove. **Pending comps** with "Redeem" buttons. **Visit history** table (date, party size, spend, server, notes). **Reservations** list |
| `/guests/reservations` | **Reservations page.** Upcoming reservations (date, time, party size, table, guest link, status). Past reservations. "Add Reservation" form (guest, date, time, party size, table, notes)                                                                                            |

---

## 9E. NOTIFICATIONS

| Route            | Key Elements                                                                                                                                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/notifications` | **Full notification center.** Filter tabs (All, Ops, Inquiries, Events, Quotes, Payments, Clients, System). Category badges with color coding. Mark individual/all as read. Archive individual. Pagination (20/page). Relative + absolute timestamps. Links to relevant pages |
| Bell icon (nav)  | **Notification panel** (existing, enhanced). New icon mappings for ops notifications (UserCheck, ClipboardList, CalendarClock, Package, Gift). `ops` category with orange color. "View all notifications" footer link → `/notifications`                                      |

**Notification triggers (non-blocking, background):**

- Staff assignment → event
- Task assigned → staff member
- Schedule change → event date/time/venue
- Order ready → all stations submitted
- Delivery received → station
- Low stock → component below par threshold
- Guest comp → pending unredeemed comp

---

## 9F. STAFF PORTAL (Staff-Facing)

> Separate route group `(staff)` with limited permissions. Staff login via `/staff-login`.

| Route              | Key Elements                                                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/staff-login`     | **Staff login page.** Email/password form. Styled consistently with main signin. Redirects to staff dashboard on success                                                                                                               |
| `/staff-dashboard` | **Staff home.** Welcome + today's date. Quick stats (tasks today, done today, upcoming events, stations). Today's tasks with checkboxes. Station links. Upcoming assignments                                                           |
| `/staff-tasks`     | **My tasks.** Tasks grouped by date. Completion checkboxes (with accountability: records who completed + when). Progress bars per day. Priority badges. Overdue indicators                                                             |
| `/staff-station`   | **Station clipboard.** Date navigation. Station selector dropdown. Shift check-in (open/mid/close). Editable clipboard: on_hand, waste_qty, waste_reason, notes (other fields read-only). Updated_by automatically set to staff member |
| `/staff-recipes`   | **Station recipes.** Read-only recipe cards filterable by station. Servings, prep time, cook time, instructions. Cannot edit                                                                                                           |
| `/staff-schedule`  | **My schedule.** Event assignments split into upcoming and past. Event name, date, times, hours, status. Read-only                                                                                                                     |

**Staff nav bar:** Links to Dashboard, Tasks, Station, Recipes, Schedule + Sign Out. Responsive hamburger menu on mobile.

---

## 10. ANALYTICS

**Route:** `/analytics` — 9-tab hub (Overview, Revenue, Operations, Pipeline, Clients, Marketing, Social, Culinary, Benchmarks) with 38+ data streams via `Promise.allSettled`.

| Tab        | Key Data                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Overview   | Revenue MoM, Events, NPS, Avg Rating, YTD, Capacity, Inquiry→Booking, Repeat Booking                                                             |
| Revenue    | Revenue per Guest/Hour/Mile, by Day/Season/Event Type, Labor %, Staff Cost, Carry-Forward, Break-Even                                            |
| Operations | On-Time Start, Kitchen Compliance, Receipt Submission, Temp Log, Dietary Accommodation, Menu Deviation rates + Time per Phase + Food Spend/Waste |
| Pipeline   | Quote Acceptance, Ghost Rate, Lead Time, Sales Cycle, Inquiry Funnel chart, Decline Reasons, Negotiation Rate, Response Times                    |
| Clients    | Active/Repeat/Retention/At-Risk/Churn, Revenue Concentration (Herfindahl), NPS distribution, referral stats                                      |
| Marketing  | Email open/click/bounce/spam rates, spend by channel, review performance, website stats                                                          |
| Social     | Instagram follower trend, Google review distribution, platform connections                                                                       |
| Culinary   | Recipe reuse rate, top recipes, dietary restrictions, menu modification/approval rates                                                           |
| Benchmarks | → `/analytics/benchmarks`                                                                                                                        |

**Sub-pages:** `/analytics/daily-report` (daily business snapshot — 13 metric categories: schedule, revenue, pipeline, operations, client activity, schedule conflicts, milestones, dormant clients, action items, pipeline forecast; date navigation + regenerate button + past reports browser; emailed daily at 7 AM ET via Vercel Cron), `/analytics/benchmarks` (benchmark dashboard), `/analytics/pipeline` (forecast), `/analytics/demand` (heatmap + holiday YoY), `/analytics/client-ltv` (LTV chart), `/analytics/referral-sources` (referral analytics), `/analytics/reports` (custom report builder), `/analytics/funnel` (conversion funnel: Inquiry→Quote→Booking→Completed visualization, KPI cards for response time/conversion rate/ghost rate/lead time, channel performance comparison, decline reason breakdown, lead time distribution).

---

## 11. DAILY OPS

**Route:** `/daily` — Remy-generated daily plan with 4 swim lanes (Quick Admin, Event Prep, Creative, Relationship).

Per lane: icon, label, item count badge, time estimate. Per item: checkbox (calls `completeDailyPlanItem`), title (strikethrough when done), time badge, description. Draft preview expandable with "Approve" button. Dismiss button (hover-only, calls `dismissDailyPlanItem`).

Protected time reminder (purple callout). Completion celebration when all done.

---

## 12. ACTIVITY & QUEUE

**Route:** `/activity` — Activity log with Summary/Retrace toggle. Summary: tab selector (My/Client/All), domain filter, time range, activity heat map (7×24 grid), feeds with "Load more". Retrace: breadcrumb session timeline. Activity logging on/off toggle. Real-time Supabase subscription.

**Route:** `/queue` — Priority Queue with `QueueSummaryBar` (4 stat cards) + `QueueList` (domain/urgency filters, items as links with colored borders).

---

## 13. TRAVEL & OPERATIONS

**Route:** `/travel` — Travel legs grouped by week with status badges, stop counts, "View" links.

**Route:** `/production` — Monthly calendar grid with event chips (color by status) + event list below.

**Route:** `/operations` — Hub with stats + links to Equipment Inventory and Kitchen Rentals.

**`/operations/equipment`** — Owned tab (add form, per-item "Log Maintenance" button) + Rentals tab (log rental form). Maintenance alert banner.

**`/operations/kitchen-rentals`** — Rental list with delete buttons + booking form (facility, date, cost, times, hours, confirmation #, address, purpose, notes).

---

## 14. REVIEWS & AAR

**Route:** `/aar` — Event reviews with stats (calm/prep ratings, trend, frequently forgotten items). Per AAR: link to `/events/[id]/aar`.

**Route:** `/reviews` — Unified internal + external reviews feed. Log feedback button (with "Show on public profile" toggle), import platform review button (with "Show on public profile" toggle, default on), external review sources panel, configure Google review link. "Public" badge on reviews marked for public display.

**Route:** `/chef/[slug]` — Public chef profile (no auth). Now includes **Reviews & Testimonials** section showing:

- Unified stats header: average rating (stars), total review count, platform breakdown pills (e.g., "Google 12 · 4.8★")
- Review cards: reviewer name, date, star rating, review text, source badge, external link
- Featured testimonials highlighted with gold border
- "View all X reviews" expand button (shows 6 initially)
- JSON-LD `AggregateRating` markup for SEO star ratings in Google search results
- Sources: consented client reviews, public chef feedback, external reviews (Google/website), approved guest testimonials

---

## 15. SETTINGS

> **Full element-by-element detail → [`docs/ui-audit-settings.md`](ui-audit-settings.md)** (1730 lines, 50 pages)

**Route:** `/settings` — 50 sub-pages organized in 5 visual groups with 20 collapsible categories.

Each category has a unique lucide-react icon and animated chevron expand/collapse. Categories 1–8 ("Your Business" + "Communication") are **primary** — brand-orange left border accent and orange icon. Categories 9–20 are **secondary** — muted stone icon, no accent.

**Group: Your Business** — Core settings for how you run your practice

| #   | Category            | Icon          | Sub-pages                                                                                          |
| --- | ------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Business Defaults   | Building2     | Home base, stores, timing, revenue goals, dashboard layout, primary nav customization              |
| 2   | Profile & Branding  | Palette       | My Profile, portal background, availability signal, public profile, favorite chefs, client preview |
| 3   | Availability Rules  | CalendarClock | Hard blocks, event limits, buffer time                                                             |
| 4   | Booking Page        | CalendarCheck | Shareable link with slug, headline, bio, min notice, pricing model, deposit                        |
| 5   | Event Configuration | Settings2     | Event types & labels, custom fields                                                                |
| 6   | Payments & Billing  | CreditCard    | Stripe payouts, subscription & billing, module toggles                                             |

**Group: Communication** — Messaging, automations, and alerts

| #   | Category                 | Icon          | Sub-pages                                                        |
| --- | ------------------------ | ------------- | ---------------------------------------------------------------- |
| 7   | Communication & Workflow | MessageSquare | Response templates, automations, seasonal palettes, chef journal |
| 8   | Notifications & Alerts   | Bell          | Email, push, SMS per category                                    |

**Group: Connections & AI** — External services, reviews, and intelligence

| #   | Category                          | Icon  | Sub-pages                                                             |
| --- | --------------------------------- | ----- | --------------------------------------------------------------------- |
| 9   | Connected Accounts & Integrations | Plug  | Google (Gmail + Calendar), Wix, embed widget, integrations center     |
| 10  | AI & Privacy                      | Brain | AI Trust Center (full privacy walkthrough), culinary profile for Remy |
| 11  | Client Reviews                    | Star  | Google review URL, view all                                           |

**Group: You & Your Career** — Branding, growth, network, and appearance

| #   | Category            | Icon       | Sub-pages                                                                               |
| --- | ------------------- | ---------- | --------------------------------------------------------------------------------------- |
| 12  | Appearance          | Sun        | Light/dark theme toggle                                                                 |
| 13  | Professional Growth | TrendingUp | Professional development, capability inventory, momentum, profile highlights, portfolio |
| 14  | Chef Network        | Users      | Discoverability toggle, network profile                                                 |

**Group: System & Account** — Developer tools, legal, and account management

| #   | Category           | Icon          | Sub-pages                                                                                          |
| --- | ------------------ | ------------- | -------------------------------------------------------------------------------------------------- |
| 15  | Legal & Protection | ShieldCheck   | Protection hub, contract templates, food safety & compliance, HACCP plan, GDPR, emergency contacts |
| 16  | Sample Data        | Database      | Demo data manager (load/remove)                                                                    |
| 17  | API & Developer    | Code          | API keys, webhooks                                                                                 |
| 18  | Desktop App        | Monitor       | System tray, auto-start, native notifications                                                      |
| 19  | Share Feedback     | MessageCircle | In-app feedback form                                                                               |
| 20  | Account & Security | Lock          | System health, system incidents (admin), change password, delete account                           |

### 15.1 HACCP Plan (`/settings/compliance/haccp`)

Auto-generated FDA-compliant HACCP plan based on chef's business archetype. Free tier feature.

| Element                    | Description                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| No-archetype state         | Message with link to `/settings/navigation` to select business type                                                                    |
| Tab: Reference Document    | Full printable plan — prerequisite programs, hazard analysis (process steps), critical control points, record-keeping, review schedule |
| Tab: Guided Review         | Step-by-step wizard with progress bar, section toggles (enable/disable), custom notes per section                                      |
| "Mark as Reviewed" button  | Records review timestamp for compliance auditing                                                                                       |
| "Reset to Defaults" button | Clears all custom overrides, regenerates from template                                                                                 |
| Section toggles            | Toggle individual sections on/off (stored as JSONB overrides)                                                                          |
| Custom notes               | Per-section text notes for chef-specific procedures                                                                                    |

Archetype-specific content for: private-chef, caterer, meal-prep, restaurant, food-truck, bakery.

### 20.1 Delete Account (`/settings/delete-account`)

Soft-delete with 30-day grace period, pre-deletion checks, data export prompt, confirmation. Free tier.

| Element                    | Description                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Warning alert              | Explains 30-day grace period, reactivation option, and 7-year financial retention                |
| Pre-Deletion Checklist     | Shows pass/fail for: active events, outstanding payments, active retainers, active subscription  |
| Export Your Data card      | "Download My Data (JSON)" button — comprehensive export of all tenant data                       |
| Reason selector            | Optional dropdown: found alternative, too expensive, not using, privacy, closing business, other |
| Confirmation input         | Type "DELETE" to enable submit button                                                            |
| Password input             | Identity verification                                                                            |
| "Request Account Deletion" | Danger button — sets 30-day grace period, bans auth, signs out                                   |
| Grace period info          | Text explaining 30-day window and 7-year financial retention                                     |

### 20.2 Reactivate Account (`/reactivate-account`) — Public

Public page for cancelling a pending account deletion during the 30-day grace period.

| Element           | Description                                                       |
| ----------------- | ----------------------------------------------------------------- |
| No-token state    | Message directing user to check their deletion confirmation email |
| Reactivation card | "Reactivate My Account" button with explanation text              |
| Success state     | Confirmation with "Sign In" button                                |
| Error state       | Alert for invalid/expired tokens                                  |

### 20.3 GDPR & Privacy (`/settings/compliance/gdpr`)

Data privacy management. Comprehensive data export, privacy controls display, and link to delete account.

| Element               | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| Export Your Data card | "Download My Data (JSON)" — comprehensive export of all tenant data |
| Privacy Controls card | Shows data encryption (AES-256 + TLS 1.3) and RLS status            |
| Danger Zone card      | "Delete My Account" button linking to `/settings/delete-account`    |

---

## 16. MARKETING & SOCIAL

> **Full element-by-element detail → [`docs/ui-audit-marketing-social.md`](ui-audit-marketing-social.md)** (1173 lines, 14 routes)

| Route                     | Content                                           |
| ------------------------- | ------------------------------------------------- |
| `/marketing`              | Hub with push dinners, sequences, templates links |
| `/marketing/[id]`         | Campaign detail with stats, recipients, send      |
| `/marketing/push-dinners` | Push dinner campaigns (list, new, detail)         |
| `/marketing/sequences`    | Email drip campaign builder                       |
| `/marketing/templates`    | Email template library                            |
| `/social/planner`         | Content scheduling calendar                       |
| `/social/planner/[month]` | Month-specific planner                            |
| `/social/post/new`        | Post editor with AI assist                        |
| `/social/vault`           | Media vault (photos/videos)                       |
| `/social/connections`     | Connected social platforms                        |
| `/social/settings`        | Queue/posting settings                            |

---

## 17. NETWORK & COMMUNITY

> **Full element-by-element detail → [`docs/ui-audit-network-community.md`](ui-audit-network-community.md)** (1093 lines, 6 pages, 14 components)

**Route:** `/network` — Tabs: Feed (community posts with 6 reaction types, threaded comments, stories), Channels (topic channels grouped by category with join/leave), Discover (trending hashtags + chefs to follow), Connections (search, pending requests, friends list with 2-step remove, direct contact shares with full form).

**Route:** `/network/[chefId]` — Chef profile with stats, follow/connect actions, post grid.

**Route:** `/network/notifications` — 12 notification types, mark-all-read, unread indicators.

**Route:** `/network/saved` — Bookmarked posts with empty state guidance.

**Route:** `/network/channels/[slug]` — Channel header with join/leave, member/post counts, channel-scoped feed.

**Route:** `/community/templates` — Community-shared templates with type badges, download counts, import button (currently stub).

---

## 18. LOYALTY PROGRAM

> **Full element-by-element detail → [`docs/ui-audit-secondary-pages.md`](ui-audit-secondary-pages.md)** § Loyalty Pages

**Route:** `/loyalty` — Program dashboard with tier management (points balance, tier progress bar, recent activity feed, reward catalog grid).

**`/loyalty/settings`** — Full config form: program active toggle, earn rates (points per guest, welcome bonus, referral bonus), large party bonus (toggle + threshold/points), milestone bonuses (add/remove), tier thresholds (Silver/Gold/Platinum with dynamic range summary). Save button.

**`/loyalty/rewards/new`** — Create reward form: name, description, points required, reward type (Free Course/Fixed Discount/Percent Discount/Free Dinner/Upgrade), conditional discount amount input. Submit creates reward.

---

## 19. SAFETY & PROTECTION

> **Full element-by-element detail → [`docs/ui-audit-secondary-pages.md`](ui-audit-secondary-pages.md)** § Safety Pages
> **Protection sub-pages → [`docs/ui-audit-settings.md`](ui-audit-settings.md)** § Protection Hub

| Route                    | Content                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `/safety/incidents`      | Incident list + "Report Incident" → `/safety/incidents/new`                                     |
| `/safety/incidents/new`  | Incident report form (12 fields: type, severity, date, location, description, witnesses, etc.)  |
| `/safety/incidents/[id]` | Incident detail: severity/status badges, details card, resolution tracker with timeline         |
| `/safety/backup-chef`    | Backup chef contacts list (priority ordered, add/remove/reorder)                                |
| `/reputation/mentions`   | Brand mention monitoring feed (source, sentiment, reach metrics)                                |
| `/settings/protection/*` | Insurance, certifications, NDA, continuity, crisis response, business health, portfolio removal |

---

## 20. REMY (AI CONCIERGE)

> **Full element-by-element detail → [`docs/ui-audit-secondary-pages.md`](ui-audit-secondary-pages.md)** § Remy & Commands Pages
> **AI settings → [`docs/ui-audit-settings.md`](ui-audit-settings.md)** § AI & Privacy

| Route                        | Content                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `/commands`                  | Remy Hub — 4 tabs (Quick Actions, History, Favorites, Settings) with command cards    |
| `/remy`                      | Conversation history (stored in browser IndexedDB, never on server)                   |
| `/settings/ai-privacy`       | AI Trust Center — onboarding wizard, 6 privacy sections, data controls                |
| `/settings/culinary-profile` | Tell Remy about cooking philosophy and signature dishes                               |
| Floating widget              | `remy-concierge-widget.tsx` — draggable/resizable on all pages, all edges + 4 corners |

### Remy Drawer — 5-View Architecture

The Remy drawer (`components/ai/remy-drawer.tsx`) has 5 views accessible via icon tabs in the header:

| View      | Icon          | Component                    | What It Does                                                                                                         |
| --------- | ------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Chat      | MessageSquare | (inline in drawer)           | AI chat with streaming, cancel, sound, TTS, voice input, file attachment, memory, auto-project suggestion            |
| List      | List          | `remy-conversation-list.tsx` | Project-grouped conversations: Pinned, Projects (collapsible), Uncategorized, Archived. Right-click context menus    |
| Search    | Search        | `remy-search-view.tsx`       | Full-text search across all conversations (titles + message content). Debounced, keyword highlighting, click to open |
| Actions   | Activity      | `remy-action-log.tsx`        | Audit trail of all task executions grouped by date (Today/Yesterday/date), status icons, duration, click to source   |
| Templates | BookTemplate  | `remy-templates-view.tsx`    | Saved starter prompts with emoji icon, optional project assignment. Run (creates conversation + sends), Edit, Delete |

**Message actions (hover):** Listen (TTS), Copy, Bookmark (amber, persisted to IndexedDB), Delete (persisted to IndexedDB)

**Organization features (all stored in browser IndexedDB):**

- Projects (folders) with emoji icons — CRUD, conversations grouped under projects
- Pin / Archive conversations
- Message bookmarks with count badges on conversation items
- Auto-project suggestion banner (keyword-based, deterministic, no AI cost)
- Smart auto-title (strips filler words, capitalizes, truncates at word boundary)
- Export: Markdown and JSON per conversation or per project

### Universal Intake (via Remy chat)

| Feature            | Description                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Transcript parsing | Paste a call transcript or attach a .txt — Remy extracts clients, events, inquiries, notes. Tier 2 approval.  |
| Bulk client import | Paste a client list or CSV into Remy — parses and creates all clients after approval. Batch "Approve All" UX. |
| Brain dump intake  | Paste freeform text mixing clients, recipes, notes — Remy sorts everything into the right category.           |
| Input limits       | Text: 2000 chars, file attachment: 10000 chars. Duplicate client detection with warnings.                     |

---

## 21. ONBOARDING & IMPORT

> **Full element-by-element detail → [`docs/ui-audit-secondary-pages.md`](ui-audit-secondary-pages.md)** § Onboarding & Import Pages

| Route                 | Content                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/onboarding`         | Guided setup wizard with progress steps (profile, clients, recipes, staff, loyalty)                                                                                                                       |
| `/onboarding/clients` | Client import step (CSV upload, manual entry, skip)                                                                                                                                                       |
| `/onboarding/loyalty` | Loyalty setup step (program name, earn rates, tier config)                                                                                                                                                |
| `/onboarding/recipes` | Recipe import step (CSV, URL paste, manual)                                                                                                                                                               |
| `/onboarding/staff`   | Staff setup step (add team members, roles)                                                                                                                                                                |
| `/import`             | Smart import hub — 10 modes: Brain Dump, CSV/Spreadsheet, Past Events, Take a Chef, **Import Inquiries** (CSV + freeform AI), Import Clients, Import Recipe, Import Receipt, Import Document, Upload File |

---

## 22. CANNABIS VERTICAL

> **Full element-by-element detail → [`docs/ui-audit-secondary-pages.md`](ui-audit-secondary-pages.md)** § Cannabis Pages

| Route                  | Content                                                                                                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/cannabis`            | Cannabis chef hub (compliance score, upcoming events, quick actions)                                                                                                                                                                                  |
| `/cannabis/about`      | About page — task force story, **12-hour meeting summaries** (4 collapsible meeting cards with topic breakdowns, attributed quotes with timestamps, consensus points), credentials, legislation timeline (LD 1365), feature roadmap, all source links |
| `/cannabis/compliance` | Compliance tracker (license status, testing requirements, regulatory items)                                                                                                                                                                           |
| `/cannabis/events`     | Cannabis events list (strain pairings, dosage info, compliance badges)                                                                                                                                                                                |
| `/cannabis/invite`     | Guest invitations with age verification and consent forms                                                                                                                                                                                             |
| `/cannabis/ledger`     | Cannabis-specific ledger (separate from main financials for compliance)                                                                                                                                                                               |

---

## 23. HELP CENTER

> **Full element-by-element detail → [`docs/ui-audit-secondary-pages.md`](ui-audit-secondary-pages.md)** § Help Pages

**Route:** `/help` — Help article index with category cards, search input, and featured articles.
**Route:** `/help/[slug]` — Individual help article pages with breadcrumb, rich content, and related articles sidebar.

---

## 24. GAMES

> **Full element-by-element detail → [`docs/ui-audit-secondary-pages.md`](ui-audit-secondary-pages.md)** § Games Pages

| Game        | Route                | Description                                                                                                                                                                                                                                                                 |
| ----------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arcade Hub  | `/games`             | Game selection menu with cards per game (thumbnail, description, play button)                                                                                                                                                                                               |
| Galaga      | `/games/galaga`      | Space shooter (canvas-based, keyboard controls, high score in localStorage)                                                                                                                                                                                                 |
| Chef Snake  | `/games/snake`       | Snake with culinary twist: collect ingredient emojis to complete recipes (+50 bonus). 14 food types, 10 recipes. Canvas 480x480, keyboard + touch. High score in localStorage                                                                                               |
| The Line    | `/games/the-line`    | Kitchen service game: ORDER RAIL → 4 STATIONS (Grill/Sauté/Prep/Oven) → PLATING. Click ticket items to assign, click stations to pull. Timing: raw/perfect/overcooked/burnt. 3 strikes = game over. 5 rush levels. Prep Mode uses chef's actual menu dishes. Canvas 480x640 |
| Menu Muse   | `/games/menu-muse`   | Culinary-themed word game (5-letter words, 6 guesses, keyboard input, color-coded feedback)                                                                                                                                                                                 |
| Tic-Tac-Toe | `/games/tic-tac-toe` | vs Remy AI. 3x3 (minimax, unbeatable), 4x4/5x5 (heuristic, beatable). Win/loss/draw tracking. Remy taunts                                                                                                                                                                   |
| Trivia      | `/games/trivia`      | Remy's Kitchen Trivia. Culinary Knowledge or My Business modes. 15 topic chips + custom. Difficulty levels. Timed mode. 4-answer questions with fun facts + source citations + confidence badges. High score + seen-question dedup in localStorage                          |

---

## 25. DEV TOOLS

> **Full element-by-element detail → [`docs/ui-audit-secondary-pages.md`](ui-audit-secondary-pages.md)** § Dev Tools

**Route:** `/dev/simulate` (admin only) — Simulation Lab for Ollama quality testing. Module selection chips, scenarios-per-module slider (1-10), estimated time display, "Run Simulation" button. Results panel with pass rates. Run history table with timestamp, module, pass/fail counts, and "View Details" expand.

---

## GLOBAL ELEMENTS (present on every page)

| Element                  | Description                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sidebar Navigation**   | 5 groups (Pipeline, Events, Clients, Finance, More) + customizable top shortcuts + bottom shortcuts (Settings). Curated per-archetype presets.                                 |
| **Archetype Selector**   | Full-screen onboarding gate for new chefs — pick from 6 archetypes (Private Chef, Caterer, Meal Prep, Restaurant, Food Truck, Bakery) to set nav defaults. Nothing locked out. |
| **Mobile Tab Bar**       | Home, Inbox, Events, Clients (customizable per archetype)                                                                                                                      |
| **Remy Floating Widget** | Draggable/resizable concierge on all pages. 5-view drawer (Chat, List, Search, Actions, Templates). Projects, bookmarks, pin/archive. All data in browser IndexedDB.           |
| **Breadcrumbs**          | Every sub-page has "← Parent" navigation                                                                                                                                       |
| **Auth Gate**            | Every page calls `requireChef()` — unauthenticated users redirected to sign-in                                                                                                 |
| **Tenant Scoping**       | Every query scoped to session `tenant_id`                                                                                                                                      |
| **Pro Feature Gating**   | Pro features gated via `requirePro()` server-side + `<UpgradeGate>` client-side                                                                                                |
| **Admin Bypass**         | Admins always have full Pro access                                                                                                                                             |

---

## STATISTICS

| Metric                    | Count                                                                    |
| ------------------------- | ------------------------------------------------------------------------ |
| Total page.tsx files      | ~295 (+30 from ops system)                                               |
| Distinct route namespaces | 50+                                                                      |
| Nav groups                | 13 (was 8, +5: Staff, Tasks, Stations, Vendors, Guests)                  |
| AI panels on event detail | 13                                                                       |
| Dashboard data streams    | ~48                                                                      |
| Analytics data streams    | ~38                                                                      |
| Client detail panels      | ~30                                                                      |
| Event detail tabs         | 4                                                                        |
| Financial sub-pages       | ~78                                                                      |
| Settings sub-pages        | 50                                                                       |
| Station clipboard pages   | 8 (list, detail, clipboard, print, orders, print-orders, waste, ops-log) |
| Task pages                | 2 (daily board, templates)                                               |
| Vendor/food cost pages    | 6 (list, detail, invoices, price-comparison, dashboard, revenue)         |
| Guest CRM pages           | 3 (directory, profile, reservations)                                     |
| Staff portal pages        | 6 (login, dashboard, tasks, station, recipes, schedule)                  |
| Games                     | 6                                                                        |
| Calendar views            | 7 (month, day, week, year, share, schedule, waitlist)                    |
| Event FSM states          | 8                                                                        |
| Total audit lines         | ~8,600 (master + 5 companion docs)                                       |
| Companion documents       | 5                                                                        |
