# Bob & Joy: Complete Action Catalog

> **Purpose:** Define every action Chef Bob and Client Joy can take on ChefFlow. This is the exhaustive test surface. Every item is a testable interaction.
>
> **Stats:** 564 chef pages, 38 client pages, 70 public pages. ~1,400 discrete user actions cataloged below.
>
> **Accounts:**
>
> - **Chef Bob** - `chef-bob@chefflow.test` / `ChefBobFlow!2026` (chef role, tenant `a6be3806`)
> - **Client Joy** - `emma@northandpine.co` / `E2eClientTest!2026` (client role)
>
> **Rule:** Joy must exist under Bob's tenant for cross-role flows. Seed script must link them.

---

## How to Read This

Each action is formatted as: `[ACTION_ID] Description (page, element)`

Actions are tagged:

- **C** = Create (new data)
- **R** = Read (view/navigate)
- **U** = Update (modify existing)
- **D** = Delete (remove data)
- **T** = Transition (state change / FSM)
- **X** = Cross-role (Bob+Joy interact)
- **AI** = Requires Ollama/AI
- **EXT** = External integration (Stripe, Gmail, Google, etc.)

---

## PART 1: CHEF BOB (564 pages, ~1,100 actions)

---

### 1. DASHBOARD (`/dashboard`) - 78 actions

#### Navigation & Layout

- `D-001` View dashboard greeting with time-of-day (R)
- `D-002` Open Layout dropdown, reorder widgets with arrows (U)
- `D-003` Collapse/expand individual widgets (U)
- `D-004` Collapse All / Expand All toggle (U)
- `D-005` Save widget layout changes (U)
- `D-006` Navigate to Full Queue via link (R)
- `D-007` Click "New Event" button (R)
- `D-008` Open Cmd+K global search modal (R)
- `D-009` Use Cmd+K quick actions (New Event/Client/Quote/Inquiry/Expense/Recipe) (R)

#### Banners

- `D-010` View Daily Ops Banner, click to navigate to /daily (R)
- `D-011` View Priority Action Banner, click colored link (R)
- `D-012` View Scheduling Gap Banner, click "Plan Week" (R)
- `D-013` View Response Time SLA card, click to /inquiries?status=new (R)
- `D-014` View Pending Follow-Ups card, click inquiry links (R)
- `D-015` View Holiday Outreach Panel, copy AI text, create promo code, send outreach (C, AI)

#### Command Center

- `D-016` View 24 feature area cards with live counts (R)
- `D-017` Collapse/expand command center to tag strip (U)
- `D-018` Click any of 103+ quick-link URLs from cards (R)

#### Widgets

- `D-019` Complete onboarding checklist steps (5 links) (R)
- `D-020` Use Onboarding Accelerator (import contacts, log events, capture inquiry, send quote) (R)
- `D-021` View upcoming calls, click "Schedule" to create new call (R)
- `D-022` Accept/Decline collaboration invitations (T)
- `D-023` Accept/Decline pending recipe shares (T)
- `D-024` View collaborating-on events (R)
- `D-025` View Recipe Debt widget, click "Capture Now" (R)
- `D-026` View Today's Schedule with timeline and route plan (R)
- `D-027` View Next Action Card, click to take action (R)
- `D-028` View Week Strip with prep-status dots (R)
- `D-029` View Dinner Circles section, click "+ New Circle" (R)
- `D-030` View Priority Queue, filter by domain/urgency (R)
- `D-031` View Follow-Ups Overdue, click "Send message" (R)
- `D-032` Toggle DOP Task checkboxes on digest (U)
- `D-033` View Preparation Prompts by group (R)
- `D-034` View Service Quality / AAR scores and trends (R)
- `D-035` View Business Snapshot (revenue, profit, events, inquiries, expenses) (R)
- `D-036` View Pipeline Forecast (R)
- `D-037` View Stuck Events, click event links (R)
- `D-038` View Re-Engage Clients, click client links (R)
- `D-039` View Upcoming Occasions (birthdays/anniversaries) (R)
- `D-040` View Food Cost Trend sparkline (R)
- `D-041` View Top Events by profit (R)
- `D-042` View Weekly Accountability Panel (R)
- `D-043` View Quote Performance Insights, click quote links (R)
- `D-044` View Career Growth / Chef Journal stats (R)
- `D-045` Log hours via Hours Log widget (preset buttons or full form) (C)
- `D-046` Create/toggle/delete todos in To Do List widget (C, U, D)
- `D-047` View Activity Section (my activity, live client presence, feed) (R)
- `D-048` Click "Get Insights" for AI Business Insights (AI)
- `D-049` View Business Intelligence health score and alerts (R)
- `D-050` View Weekly Price Briefing card (R)
- `D-051` View Price Coverage Health (admin only) (R)
- `D-052` View Price Intelligence unified card (R)
- `D-053` View System Health nerve center, click "Sweep All" (R, admin)
- `D-054` Click service fix buttons (Wake/Restart/Reset Breaker) (U, admin)
- `D-055` View Prospecting Widget (admin only) (R)
- `D-056` View Booking Seasons chart (R)
- `D-057` View Next Best Actions links (R)
- `D-058` View Multi-Event Day Alert (R)

#### Notifications (global)

- `D-059` Click bell icon to open notification panel (R)
- `D-060` Filter notifications by category chips (R)
- `D-061` Toggle unread filter (R)
- `D-062` Mark individual notification as read (U)
- `D-063` Mark all notifications as read (U)
- `D-064` Archive individual notification (U)
- `D-065` Navigate to /notifications for full center (R)

#### Sidebar Navigation (global)

- `D-066` Navigate via primary sidebar items (R)
- `D-067` Expand/collapse "All Features" directory (R)
- `D-068` View "Recent" section (last 8 visited pages) (R)
- `D-069` Clear recent pages (D)
- `D-070` Select archetype to customize nav (U)

#### Remy Widget (global)

- `D-071` Open/close Remy floating widget (R)
- `D-072` Drag to reposition widget (U)
- `D-073` Resize widget from edges and corners (U)
- `D-074` Chat with Remy (send message, receive streaming response) (AI)
- `D-075` Switch between 5 Remy views (Chat/List/Search/Actions/Templates) (R)
- `D-076` Create/manage Remy projects (folders) (C, U, D)
- `D-077` Pin/archive/delete Remy conversations (U, D)
- `D-078` Bookmark Remy messages (U)

---

### 2. EVENTS - 142 actions

#### Event List (`/events`)

- `E-001` View events in List view (R)
- `E-002` View events in Board/Kanban view (R)
- `E-003` Toggle between List and Board views (R)
- `E-004` Filter events by 9 status tabs (R)
- `E-005` Select multiple events via checkboxes (R)
- `E-006` Bulk Archive selected events (U)
- `E-007` Bulk Delete Draft events (D)
- `E-008` Click "+ New Event" to create (R)
- `E-009` Click event row to view detail (R)

#### Event Creation (`/events/new`)

- `E-010` Fill event form (occasion, date, time, location, guest count, special requests) (C)
- `E-011` Link client to event (U)
- `E-012` Set service style, dietary requirements, cannabis flag (C)
- `E-013` Submit event creation (C)

#### Event Creation Wizard (`/events/new/wizard`)

- `E-014` Walk through multi-step wizard (C)

#### Event From Text (`/events/new/from-text`)

- `E-015` Paste text, AI extracts event details (C, AI)

#### Event Detail (`/events/[id]`)

- `E-016` View event header (occasion, status badge, date/time) (R)
- `E-017` Click "Edit Event" (draft only) (R)
- `E-018` Click "Schedule" to view day-of plan (R)
- `E-019` Click "Packing List" (R)
- `E-020` Click "Grocery Quote" (R)
- `E-021` Click "Travel Plan" (R)
- `E-022` Click "Quick Proposal" to generate preview (AI)

##### Overview Tab

- `E-023` View Event Details card (location, map, weather, referral) (R)
- `E-024` View Client Info card (name, email, phone) (R)
- `E-025` View/copy Client Portal QR code (R)
- `E-026` Manage Service Contract (template-based) (C, U)
- `E-027` Generate AI Contract (C, AI)
- `E-028` Manage Guest RSVPs (share link, RSVP tracker) (R, U)
- `E-029` Copy host message template (R)
- `E-030` Read guest-to-chef messages (R)
- `E-031` Send day-before/day-of reminders to guests (C)
- `E-032` Send dietary confirmation requests (C)
- `E-033` Customize pre-event countdown page content (U)
- `E-034` Share documents with guests (create, publish, delete) (C, D)
- `E-035` Send post-event feedback requests (C)
- `E-036` Reconcile actual attendance (attended/no-show/late/left early) (U)
- `E-037` View Event Recap share link (R)
- `E-038` View Guest Pipeline QR (R)
- `E-039` View Guest Excitement Wall (R)
- `E-040` Send Post-Event Guest Outreach (C)
- `E-041` View Allergen Conflict Alert (deterministic) (R)
- `E-042` Run AI Allergen Risk Matrix (AI)
- `E-043` Run AI Menu Nutritional Summary (AI)
- `E-044` View Communication Log (R)
- `E-045` Send message via MessageLogForm (channel, template, textarea) (C)
- `E-046` View Lifecycle Progress Panel (R)

##### Money Tab

- `E-047` Browse Menu Library Picker (All/Templates/Showcase/Recent) (R)
- `E-048` Apply menu to event via "Use" button (U)
- `E-049` View client preferences summary (R)
- `E-050` View Menu Approval status (R)
- `E-051` Click "Edit Menu" to open editor (R)
- `E-052` View Financial Summary (Quoted/Deposit/Paid/Balance) (R)
- `E-053` Click "View Invoice" (R)
- `E-054` Export financial data (R)
- `E-055` View AI Pricing Intelligence (AI)
- `E-056` Record Payment (amount, method) via modal (C)
- `E-057` Process Refund (cancelled events with payments) (C)
- `E-058` Manage Payment Plan (installment schedule) (C, U)
- `E-059` Log Mileage entry (C)
- `E-060` Log Tip (in_progress/completed events) (C)
- `E-061` View Budget Tracker (budget vs actual) (R)
- `E-062` Quick Receipt Capture (upload) (C)
- `E-063` View Cost Forecast Badge (R)
- `E-064` Add Expense linked to event (C)
- `E-065` View Profit Summary (revenue, margin, food cost %, hourly rate) (R)
- `E-066` View Loyalty Points earned (R)
- `E-067` Navigate to Split Billing (R)

##### Ops Tab

- `E-068` Start/Stop time tracking (Shopping/Prep/Packing/Driving/Execution) (C, U)
- `E-069` Manual edit time tracking entries (U)
- `E-070` Run Service Simulation (C)
- `E-071` Re-simulate stale service simulation (U)
- `E-072` Manage Event Staff (add/remove/log hours) (C, U, D)
- `E-073` Generate AI Staff Briefing (AI)
- `E-074` Generate AI Prep Timeline (AI)
- `E-075` Generate AI Service Timeline (AI)
- `E-076` Invite Chef Collaborators (C)
- `E-077` Log Temperature readings (food safety) (C)
- `E-078` Run AI Temperature Anomaly Detection (AI)
- `E-079` Log Shopping Substitutions (C)
- `E-080` Log Menu Modifications (completed events) (C)
- `E-081` View Carry-Forward Inventory (R)
- `E-082` Run AI Grocery List Consolidation (AI)
- `E-083` Log Unused Ingredients for carry-forward (C)
- `E-084` Add/edit Contingency Plans + emergency contacts (C, U)
- `E-085` Generate AI Contingency Suggestions (AI)
- `E-086` Generate/view 8+ printable PDF documents (DOP, packing, grocery, etc.) (R)
- `E-087` View Readiness Gate Panel (hard blocks + soft warnings) (R)
- `E-088` Transition: Propose (draft -> proposed) (T)
- `E-089` Transition: Confirm (paid -> confirmed) (T)
- `E-090` Transition: Mark In Progress (confirmed -> in_progress) (T)
- `E-091` Transition: Mark Completed (in_progress -> completed, redirects to close-out) (T)
- `E-092` Transition: Cancel (opens reason dialog) (T)
- `E-093` Complete Post-Event Closure checklist (AAR/Reset/Follow-Up/Financially Closed) (U)
- `E-094` View AAR Summary (R)
- `E-095` Upload Event Photos (C)
- `E-096` View Recipe Capture Prompt (R)

##### Wrap-Up Tab

- `E-097` Navigate to File AAR (R)
- `E-098` Navigate to Post-Dinner Debrief (R)
- `E-099` Send Client Satisfaction Survey (C)
- `E-100` Generate AI AAR (AI)
- `E-101` Generate AI Review Request Draft (AI)
- `E-102` Generate AI Gratuity Framing (AI)
- `E-103` Generate AI Social Media Captions (AI)
- `E-104` View Status History timeline (R)

#### Event Sub-Pages

- `E-105` Edit event form (`/events/[id]/edit`) with Prep Time Estimate bar (U)
- `E-106` View/toggle Day-of Schedule + DOP checklist (`/events/[id]/schedule`) (R, U)
- `E-107` Check packing list items, mark car packed, reset, print PDF (`/events/[id]/pack`) (U)
- `E-108` Manage travel legs (add/edit/start/complete/cancel/delete) (`/events/[id]/travel`) (C, U, D)
- `E-109` View multi-vendor price comparison, save prices (`/events/[id]/grocery-quote`) (R, U)
- `E-110` View/print invoice (`/events/[id]/invoice`) (R)
- `E-111` File AAR (calm/prep ratings, recipe feedback, forgotten items, notes) (`/events/[id]/aar`) (C)
- `E-112` Complete Post-Dinner Debrief (photos, recipe notes, client insights, rating) (`/events/[id]/debrief`) (C)
- `E-113` Walk through 5-step close-out wizard (Tip/Receipts/Mileage/Reflection/Close) (`/events/[id]/close-out`) (C)
- `E-114` View 7-section financial summary, mark financially closed (`/events/[id]/financial`) (R, U)
- `E-115` Review receipts with OCR, approve to expenses (`/events/[id]/receipts`) (R, U)
- `E-116` Divide cost across payers (`/events/[id]/split-billing`) (C, U)
- `E-117` Use Kitchen Display System (fire/plating/served progression) (`/events/[id]/kds`) (U)
- `E-118` Use mobile DOP with large tap targets (`/events/[id]/dop/mobile`) (U)
- `E-119` Print Guest Card QR (`/events/[id]/guest-card`) (R)
- `E-120` View interactive tappable documents (`/events/[id]/interactive`) (R)

---

### 3. CLIENTS - 108 actions

#### Client Directory (`/clients`)

- `CL-001` Export CSV of all clients (R)
- `CL-002` Click "+ Add Client" (R)
- `CL-003` Send client invitation (name + email) or create without invitation (C)
- `CL-004` Copy invitation URL (R)
- `CL-005` Cancel pending invitation (D)
- `CL-006` Search clients (R)
- `CL-007` Sort clients (Name/Total Spent/Created) (R)
- `CL-008` Click client row to view detail (R)
- `CL-009` Bulk Archive selected clients (U)
- `CL-010` View client health badges (R)

#### Client Creation (`/clients/new`)

- `CL-011` Quick Add mode (essential fields only) (C)
- `CL-012` Full Profile mode (8 collapsible sections: identity, household, culinary, access, kitchen, service defaults, personality, assessment) (C)

#### Client Detail (`/clients/[id]`) - 30 panels

- `CL-013` Change client status (Active/Dormant/Repeat Ready/VIP) (U)
- `CL-014` View health/relationship/engagement badges (R)
- `CL-015` Add/remove client tags (C, D)
- `CL-016` Generate/copy/rotate/revoke portal link (C, U, D)
- `CL-017` Click "Create Event for Client" (R)
- `CL-018` View Dormancy Warning banner (R)
- `CL-019` View/click Next Best Action Card (R)
- `CL-020` View Profile Completeness Meter (R)
- `CL-021` View/toggle email notifications for client (U)
- `CL-022` Edit demographics (occupation, company, birthday, anniversary, Instagram, contact method, referral source, formality) (U)
- `CL-023` View Statistics (events, completed, spent, avg value) (R)
- `CL-024` View Profitability History chart (R)
- `CL-025` View LTV Trajectory Chart (R)
- `CL-026` View Menu History Panel (R)
- `CL-027` Compose Direct Outreach (email/SMS) + view history (C, R)
- `CL-028` View Financial Detail (event breakdown + ledger entries) (R)
- `CL-029` View Loyalty Card (tier, points, rewards, redeem, award bonus) (R, U)
- `CL-030` Edit Personal Info (preferred name, partner, family notes) (U)
- `CL-031` Add/remove Pets (name, type, notes) (C, D)
- `CL-032` Upload/manage Client Photos (C, D)
- `CL-033` Edit Kitchen Profile (size, constraints, equipment, notes) (U)
- `CL-034` Edit Security & Access (gate code, WiFi, parking, house rules) (U)
- `CL-035` Edit Service Defaults (style, guest count, preferred days, budget, cleanup, leftovers) (U)
- `CL-036` Manage Client Connections (link other clients with relationship type) (C, D)
- `CL-037` View Fun Q&A answers (R)
- `CL-038` Add/remove Allergy Records with severity (C, D)
- `CL-039` Manage NDA (toggle, coverage, dates, photo permission) (U)
- `CL-040` Add/pin/edit/delete Quick Notes (5 categories) (C, U, D)
- `CL-041` Add/remove Milestones (type, date, label, notes) (C, D)
- `CL-042` Add/remove Addresses (label, address, access instructions, kitchen notes) (C, D)
- `CL-043` View Communication History (sentiment + thread) (R)
- `CL-044` Send message via compose form (C)
- `CL-045` Run AI Client Preference analysis (AI)
- `CL-046` Edit Chef's Internal Assessment (referral potential, red flags, acquisition cost, payment/tipping behavior) (U)
- `CL-047` View Unified Relationship Timeline (R)
- `CL-048` Filter Event History by status (R)
- `CL-049` View Client Feedback/Reviews (R)
- `CL-050` View Client Ops Snapshot (Action Required, Balance, Profile Readiness, Next RSVP) (R)

#### Client Sub-Pages

- `CL-051` View Relationship follow-through route (`/clients/[id]/relationship`) (R)
- `CL-052` View Recurring services + dish history, log dish served (`/clients/[id]/recurring`) (R, C)
- `CL-053` View Active/Inactive/VIP client lists (R)
- `CL-054` View Duplicate pairs with confidence badges (`/clients/duplicates`) (R)
- `CL-055` Build custom client segments (name, color, filters) (`/clients/segments`) (C, U)
- `CL-056` Issue gift cards (code, discount, send/deactivate) (`/clients/gift-cards`) (C, U)
- `CL-057` View Communication Hub (notes, follow-ups, touchpoints) (R)
- `CL-058` View all client notes across clients (R)
- `CL-059` View Follow-Ups (overdue/at-risk/check-in) (R)
- `CL-060` View Upcoming Touchpoints (R)
- `CL-061` View Client History Hub (events, menus, spending) (R)
- `CL-062` View Event History table (R)
- `CL-063` View Past Menus table (R)
- `CL-064` View Spending History ranked table (R)
- `CL-065` View Preferences Hub (dietary, allergies, favorites, dislikes) (R)
- `CL-066` View Allergy tag cloud + table (R)
- `CL-067` View Dietary Restrictions tag cloud + table (R)
- `CL-068` View Favorite Dishes tag cloud + table (R)
- `CL-069` View Dislikes tag cloud + table (R)
- `CL-070` View Insights Hub (top, frequent, at-risk, portal active) (R)
- `CL-071` View Loyalty Hub (enrolled, points, tiers) (R)
- `CL-072` View Points balance table (R)
- `CL-073` View Reward codes table (R)
- `CL-074` View Referral source analysis (R)
- `CL-075` View Real-time Client Presence (SSE) (`/clients/presence`) (R)

---

### 4. INQUIRY PIPELINE - 89 actions

#### Inquiries (`/inquiries`)

- `IP-001` View inquiries in List view with smart priority grouping (R)
- `IP-002` View inquiries in Kanban view (R)
- `IP-003` Filter by 8 status tabs (R)
- `IP-004` Select multiple inquiries via checkboxes (R)
- `IP-005` Bulk Decline/Archive selected (U)
- `IP-006` Navigate to Funnel Analytics (R)
- `IP-007` Click "+ Log New Inquiry" (R)

#### Inquiry Creation (`/inquiries/new`)

- `IP-008` Use Smart Fill (paste text, AI parses) (C, AI)
- `IP-009` Manual entry (channel, client link, contact, event details, message, notes) (C)

#### Inquiry Detail (`/inquiries/[id]`)

- `IP-010` View contact card and confirmed facts (R)
- `IP-011` Edit pipeline card (next action, follow-up due) (U)
- `IP-012` Click "+ Create Quote" (linked via prefill contract) (R)
- `IP-013` View Critical Path (10-item progress tracker) (R)
- `IP-014` View Service Lifecycle panel (200+ checkpoints across 10 stages) (R)
- `IP-015` Confirm/skip/reset lifecycle checkpoints (U)
- `IP-016` Click "Draft Email for Missing Info" (AI)
- `IP-017` Generate AI response draft (AI)
- `IP-018` Edit AI draft before sending (U)
- `IP-019` Approve & Send response via Gmail (C, EXT)
- `IP-020` Toggle "Include Dinner Circle link" / "Include dinner summary" (U)
- `IP-021` View communication log (R)
- `IP-022` Transition inquiry status (T)
- `IP-023` Decline inquiry with reason modal (T)
- `IP-024` Add notes (C)
- `IP-025` Link recipe ideas (U)
- `IP-026` View/print documents (R)

#### Quotes (`/quotes`)

- `IP-027` Filter quotes by 6 status tabs (R)
- `IP-028` View quote acceptance insights (R)

#### Quote Creation (`/quotes/new`)

- `IP-029` View client pricing history panel (R)
- `IP-030` View AI pricing suggestions (AI)
- `IP-031` View Smart Pricing Hint (confidence, acceptance rate, range), click "Use" (R, U)
- `IP-032` Use price calculator (service type, courses, date, distance, premium) (R)
- `IP-033` Fill quote form (client, name, pricing model, amount, deposit, valid until, notes) (C)
- `IP-034` Submit quote (C)

#### Quote Detail (`/quotes/[id]`)

- `IP-035` View pricing and deposit/validity cards (R)
- `IP-036` Transition: Send quote (T)
- `IP-037` Transition: Accept quote (T)
- `IP-038` Transition: Reject quote (T)
- `IP-039` Transition: Expire quote (T)
- `IP-040` Transition: Revise quote (T)
- `IP-041` Edit quote (U)
- `IP-042` Delete quote (D)
- `IP-043` Add notes (C)

#### Rate Card (`/rate-card`)

- `IP-044` View rate card sections (R)
- `IP-045` Copy section text to clipboard (R)
- `IP-046` Copy full rate card (R)

#### Leads (`/leads`)

- `IP-047` View website form submissions (R)
- `IP-048` Claim a lead (U)
- `IP-049` Dismiss a lead (U)
- `IP-050` View operator walkthrough requests (admin inbox) (R)
- `IP-051` Change operator status (New/Qualified/Replied/Scheduled/Pilot/Not fit) (U)
- `IP-052` Navigate to sub-pages (contacted, qualified, converted, archived) (R)

#### Calls & Meetings (`/calls`)

- `IP-053` View calls by status (All/Upcoming/Completed/No-show/Cancelled) (R)
- `IP-054` Create new call (type, datetime, duration, title, contact, prep notes, notification) (C)
- `IP-055` View call detail (meta, agenda, outcome) (R)
- `IP-056` Mark call confirmed (T)
- `IP-057` Cancel call (T)
- `IP-058` Add/remove/toggle agenda items (C, U, D)
- `IP-059` Complete call (summary, notes, next action, duration) (U)
- `IP-060` Mark call as no-show (T)

#### Partners (`/partners`)

- `IP-061` Filter partners by status + type (R)
- `IP-062` View partner detail (6 stats, contact, notes, locations, events, service history) (R)
- `IP-063` Add/edit/deactivate partner locations (C, U)
- `IP-064` Bulk assign events to partner (U)
- `IP-065` Share/print partner report (R)
- `IP-066` Send portal invite to partner (C)

#### Prospecting (`/prospecting`, admin only)

- `IP-067` Add prospect (name, type, category, email, phone, contact, city, state, notes) (C)
- `IP-068` View 4 stat cards + conversion funnel (R)
- `IP-069` Filter prospects (search, region, status) (R)
- `IP-070` Batch Re-Enrich / Export CSV / Sync Reminders (U, R)
- `IP-071` Bulk Set Status/Stage/Priority (U)
- `IP-072` Bulk Delete prospects (D)
- `IP-073` View prospect dossier (contact, gatekeeper, call log, email, tags, approach, scripts, outreach, stage history, merge panel) (R)
- `IP-074` Log quick call (outcome, follow-up, notes) (C)
- `IP-075` Send email via Gmail integration (C, EXT)
- `IP-076` Add/remove prospect tags (C, D)
- `IP-077` Convert prospect to Inquiry (T)
- `IP-078` Delete prospect (D)
- `IP-079` View/use daily call queue (`/prospecting/queue`) (R)
- `IP-080` Run AI lead scrub (`/prospecting/scrub`) (C, AI)
- `IP-081` Manage call scripts (`/prospecting/scripts`) (C, U, D)
- `IP-082` View pipeline kanban (`/prospecting/pipeline`) (R)
- `IP-083` View geographic clusters (`/prospecting/clusters`) (R)
- `IP-084` Import CSV (`/prospecting/import`) (C)

#### Guest Leads (`/guest-leads`)

- `IP-085` Filter guest leads by status (R)
- `IP-086` Convert guest lead to Client (T)
- `IP-087` Mark guest lead Contacted / Archive / Restore (T)
- `IP-088` View Guest Analytics (repeat guests, dinner groups) (R)

#### Proposals & Testimonials

- `IP-089` Manage proposal templates (create/edit visual builder) (C, U)
- `IP-090` Manage add-ons (create/edit/delete cards with pricing) (C, U, D)
- `IP-091` Filter testimonials by status (All/Pending/Approved/Featured) (R)
- `IP-092` Approve/Unapprove/Feature/Unfeature testimonials (U)

---

### 5. FINANCIALS - 98 actions

#### Financial Hub (`/financials`)

- `FI-001` View summary cards (revenue, refunds, net, tips) (R)
- `FI-002` View monthly overview with progress bar (R)
- `FI-003` View per-event breakdown table (R)
- `FI-004` Filter/export ledger entries CSV (R)

#### Finance Hub (`/finance`)

- `FI-005` Navigate to 16 financial sub-sections (R)

#### Expenses

- `FI-006` View expense summary + category breakdown (`/expenses`) (R)
- `FI-007` Add Expense (amount, category, payment method, event link, receipt, notes) (C)
- `FI-008` Quick Expense via floating button or Ctrl+Shift+E (C)
- `FI-009` View expense detail (`/expenses/[id]`) (R)
- `FI-010` View 7 category sub-pages with KPIs (R)

#### Invoices

- `FI-011` View invoice KPIs + 6 status sub-pages (R)
- `FI-012` View individual invoice detail (R)

#### Payments

- `FI-013` View payment KPIs + 4 sub-links (Deposits/Installments/Refunds/Failed) (R)

#### Ledger

- `FI-014` View ledger KPIs + full transaction log (R)
- `FI-015` Export ledger CSV (R)
- `FI-016` Add ledger adjustments (credits/add-ons) (C)

#### Payouts

- `FI-017` View Stripe Payouts (conditional on Stripe Connect) (R, EXT)
- `FI-018` View Manual Payments (R)
- `FI-019` Reconcile events to payments (U)

#### Reporting

- `FI-020` View 9 report types (Revenue by Month/Client/Event, Profit, Expense, Tax, YTD, P&L, Year-End) (R)
- `FI-021` Select year for P&L report (R)
- `FI-022` Download P&L CSV (R)

#### Tax Center

- `FI-023` Select tax year (R)
- `FI-024` View quarterly estimate cards (R)
- `FI-025` Log mileage entry (date, purpose, from, to, miles) (C)
- `FI-026` Export for Accountant (JSON) (R)
- `FI-027` View 6 tax sub-pages (Quarterly, Year-End, 1099-NEC, Depreciation, Home Office, Retirement) (R)

#### Payroll

- `FI-028` View payroll KPIs (R)
- `FI-029` Add/edit/terminate employees (C, U)
- `FI-030` Run Payroll (C)
- `FI-031` View Form 941 (R)
- `FI-032` View W-2 Summaries (R)

#### Other Financial

- `FI-033` Create recurring invoice (`/finance/recurring`) (C)
- `FI-034` Manage retainers (create, billing timeline, linked events, status actions) (C, U)
- `FI-035` Use bank feed panel + manual transaction form (C)
- `FI-036` View 30-day cash flow forecast chart (R)
- `FI-037` View revenue forecast with trends (R)
- `FI-038` Track disputes (C, U)
- `FI-039` Manage 1099 contractors (C, U)
- `FI-040` Configure sales tax (enable, state/local rates, filing frequency, registration) (U)
- `FI-041` View sales tax remittance history (R)
- `FI-042` Use break-even calculator (R)
- `FI-043` View year-end summary, download CSV, email to self (R)

#### Goals

- `FI-044` View goals dashboard (R)
- `FI-045` Create goal via wizard (C)
- `FI-046` View goal history sparkline + monthly table (R)
- `FI-047` View revenue path with gap-closing strategies (R)

---

### 6. CULINARY - 112 actions

#### Culinary Hub (`/culinary`)

- `CU-001` View quick stats (recipes, menus, ingredients, vendors) (R)
- `CU-002` View price alerts widget (ingredients 30%+ above average) (R)
- `CU-003` Navigate to sub-sections via tiles (R)

#### Menus

- `CU-004` View menu grid with search + sort (`/menus`) (R)
- `CU-005` Create menu via multi-step wizard (`/menus/new`) (C)
- `CU-006` Set menu metadata (name, description, cuisine, scene, service style, guests, season, target date, notes) (C)
- `CU-007` Build courses (add course, set label + dish name + description, reorder) (C, U)
- `CU-008` View breakdown panel (courses, Recipe Bible matching, cost, dietary) (R)
- `CU-009` View menu detail (`/menus/[id]`) (R)
- `CU-010` Use Assembly Browser (add from Templates/Past Menus/Recipes/Quick Add) (U)
- `CU-011` View cost breakdown tree (Course > Dish > Component > Ingredient) (R)
- `CU-012` View Allergen Matrix (allergen-vs-dish grid) (R)
- `CU-013` Use scale dialog (guest count auto-scaling) (U)
- `CU-014` Toggle Showcase on/off (U)
- `CU-015` Duplicate menu (C)
- `CU-016` Delete menu (D)
- `CU-017` Open menu editor (`/menus/[id]/editor`) (R)
- `CU-018` Edit menu in structured mode (courses/dishes with dietary toggles, allergen flags, chef notes, photos) (U)
- `CU-019` Edit menu in freeform mode (U)
- `CU-020` Use Context Dock (Season pills, Target Date, Client picker) (U)
- `CU-021` View MenuCostSidebar (live food cost %, total cost, cost/guest) (R)
- `CU-022` View MenuContextSidebar (11 togglable intelligence sections) (R)
- `CU-023` View Budget Compliance (auto-loads when event has quote) (R)
- `CU-024` View Price Alerts (ingredients 30%+ above average) (R)
- `CU-025` Use Guest Scaling widget (rescale menu in real time) (U)
- `CU-026` View Tasting Menu hub (`/menus/tasting`) (R)
- `CU-027` Create/edit/preview tasting menus (C, U)

#### Recipes

- `CU-028` View recipe book with search, category filter, sort (`/recipes`) (R)
- `CU-029` Create recipe via Smart Import (AI parse from text) (`/recipes/new`) (C, AI)
- `CU-030` Create recipe via Manual Entry (all fields + ingredients) (C)
- `CU-031` View recipe detail (ingredients, scaling, nutrition, method, cost, event history) (`/recipes/[id]`) (R)
- `CU-032` Use scaling calculator (U)
- `CU-033` View on-demand USDA nutrition data (R)
- `CU-034` View Production History panel + log production (R, C)
- `CU-035` View Track Record (times cooked, would-use-again, timing accuracy) (R)
- `CU-036` Duplicate/Share/Delete recipe (C, D)
- `CU-037` Edit recipe (ingredient names locked, new highlighted) (`/recipes/[id]/edit`) (U)
- `CU-038` View global Production Log with stats (`/recipes/production-log`) (R)
- `CU-039` View Ingredient library with inline edit (`/recipes/ingredients`) (R, U)
- `CU-040` Use Recipe Sprint queue (paste, AI parse, save, next) (`/recipes/sprint`) (C, AI)
- `CU-041` Use Recipe Brain Dump (type name + dump text, AI parses, save) (`/recipes/dump`) (C, AI)
- `CU-042` Add recipe variation (group related recipes) (C)

#### Ingredients

- `CU-043` View ingredient library with add form (`/culinary/ingredients`) (R)
- `CU-044` Add ingredient (name, category, unit, price, staple) (C)
- `CU-045` View PriceAttribution (store, confidence, trend) (R)
- `CU-046` Add ingredient to Price Watch List (target price, alert) (C, D)
- `CU-047` View seasonal availability (`/culinary/ingredients/seasonal-availability`) (R)
- `CU-048` View vendor notes grouped by vendor (R)

#### Price Catalog

- `CU-049` Browse 32K+ food items with search and filters (`/culinary/price-catalog`) (R)
- `CU-050` Filter by category/store/tier/stock (R)
- `CU-051` Expand item detail (per-store prices, sparkline, stock) (R)
- `CU-052` Click "Add to My Pantry" (C)

#### Components

- `CU-053` View all components with stats (`/culinary/components`) (R)
- `CU-054` Add component (name, category, dish, execution notes, make-ahead) (C)
- `CU-055` View filtered sub-pages (ferments, garnishes, sauces, shared elements, stocks) (R)

#### Costing

- `CU-056` View recipe + menu cost tables (`/culinary/costing`) (R)
- `CU-057` View Freshness column (color-coded price recency) (R)
- `CU-058` Click "Refresh All Prices" (batch resolve) (U)
- `CU-059` View Costing Confidence Badges (R)
- `CU-060` Review Ingredient Match panel (pg_trgm suggestions, confirm/dismiss) (U)
- `CU-061` Batch confirm high-confidence matches (>80%) (U)
- `CU-062` Use Event Shopping Planner (aggregate ingredients, optimize stores) (R)
- `CU-063` View Cost Impact panel (recent price changes) (R)
- `CU-064` View Store Scorecard (personalized rankings) (R)
- `CU-065` View food cost KPI (`/culinary/costing/food-cost`) (R)
- `CU-066` View per-menu cost analysis (R)
- `CU-067` View per-recipe cost with relative bars (R)
- `CU-068` View "On Sale This Week" from OpenClaw Pi (`/culinary/costing/sales`) (R)

#### Prep

- `CU-069` View make-ahead components by menu (R)
- `CU-070` View consolidated shopping list by category (R)
- `CU-071` View components sorted by lead time (R)

#### Vendors

- `CU-072` View vendor directory + add/star/delete vendors (R, C, U, D)
- `CU-073` View vendor detail (info, price list, invoice history) (R)
- `CU-074` Edit vendor info (U)
- `CU-075` Log new vendor invoice (C)
- `CU-076` View all invoices across vendors + filter + CSV upload (R, C)
- `CU-077` View vendor price comparison (R)

#### Inventory

- `CU-078` View inventory hub + par alerts (`/inventory`) (R)
- `CU-079` Track par levels + count entries (`/inventory/counts`) (C, U)
- `CU-080` Log waste (ingredient, qty, reason, cost) + view 6-month trend (`/inventory/waste`) (C, R)
- `CU-081` View theoretical vs actual cost variance (`/inventory/food-cost`) (R)
- `CU-082` Upload/view vendor invoices (`/inventory/vendor-invoices`) (C, R)

#### Culinary Board & Seasonal Palettes

- `CU-083` View culinary vocabulary board/list (`/culinary-board`) (R)
- `CU-084` Add culinary word (C)
- `CU-085` View palette list (`/settings/repertoire`) (R)
- `CU-086` Create palette (C)
- `CU-087` Edit palette (season name, micro-windows, proven wins, recipes) (U)
- `CU-088` Delete palette (D)

#### Substitutions

- `CU-089` View/search substitutions (`/culinary/substitutions`) (R)

#### My Kitchen

- `CU-090` View/edit kitchen setup (`/culinary/my-kitchen`) (R, U)

---

### 7. CALENDAR - 32 actions

- `CA-001` View monthly calendar grid with filter toggles (8 types) (`/calendar`) (R)
- `CA-002` Drag-and-drop reschedule events (draft/proposed/accepted only) (U)
- `CA-003` Click day to view detail panel (R)
- `CA-004` Use "Quick Block" / "Remove Block" (C, D)
- `CA-005` Add calendar entry via modal (3 types: Personal/Business/Intentions with fields) (C)
- `CA-006` View day view with 6AM-midnight grid (`/calendar/day`) (R)
- `CA-007` Click time slot to pre-fill entry modal (C)
- `CA-008` View week view with 7-column grid (`/calendar/week`) (R)
- `CA-009` Complete/delete prep blocks (U, D)
- `CA-010` Add inline block form (type/title/date/time/duration) (C)
- `CA-011` View gap alerts, click "Auto-schedule" for suggestions (R, C)
- `CA-012` View year view with 52-week grid (`/calendar/year`) (R)
- `CA-013` Generate/copy/revoke share tokens (`/calendar/share`) (C, D)
- `CA-014` Use FullCalendar view with 4 modes + keyboard shortcuts (`/schedule`) (R)
- `CA-015` View/manage waitlist entries (add, mark contacted, expire) (`/waitlist`) (C, U)

---

### 8. INBOX & MESSAGING - 22 actions

- `IN-001` View inbox with 4 tabs (Unassigned/Action Required/Snoozed/Done) (R)
- `IN-002` Filter by source, response turn, follow-up (R)
- `IN-003` Star/unstar messages (U)
- `IN-004` Accept AI-suggested inquiry/event links (U)
- `IN-005` Bulk Mark Done / Snooze / Unassign (U)
- `IN-006` Log new message via modal (C)
- `IN-007` View calendar peek sidebar (R)
- `IN-008` View thread detail (`/inbox/triage/[threadId]`) (R)
- `IN-009` Run Gmail historical scan (`/inbox/history-scan`) (EXT)
- `IN-010` View scan results (pending/imported/dismissed) (R)
- `IN-011` View conversation list (`/chat`) (R)
- `IN-012` Create new conversation (C)
- `IN-013` View chat with sidebar (client info, pinned notes, AI insights) (`/chat/[id]`) (R)

---

### 9. STAFF - 38 actions

- `ST-001` View staff directory with search + role/status filters (`/staff`) (R)
- `ST-002` Click staff card to view detail (`/staff/[id]`) (R)
- `ST-003` View staff detail (contact, portal access, onboarding, assignments, performance) (R)
- `ST-004` Create staff login (email + password) (C)
- `ST-005` Edit staff info (name, email, phone, role, rate) (U)
- `ST-006` Deactivate staff member (U)
- `ST-007` View 7-day schedule grid + assign staff to events (`/staff/schedule`) (R, U)
- `ST-008` Toggle staff availability (Available/Unavailable/Unknown) per day (`/staff/availability`) (U)
- `ST-009` Clock in/out staff (`/staff/clock`) (C, U)
- `ST-010` View staff performance table (`/staff/performance`) (R)
- `ST-011` View labor cost charts (`/staff/labor`) (R)
- `ST-012` View real-time staff activity board (`/staff/live`) (R)

---

### 10. TASKS - 12 actions

- `TK-001` View daily task board with date navigation (`/tasks`) (R)
- `TK-002` Create task (title, description, assignee, due date/time, priority) (C)
- `TK-003` Complete task via button (U)
- `TK-004` Assign/unassign task to staff (U)
- `TK-005` View carried-over tasks from previous days (R)
- `TK-006` View task templates (`/tasks/templates`) (R)
- `TK-007` Create task template (name, category, items) (C)
- `TK-008` Edit/delete task templates (U, D)
- `TK-009` "Generate Today's Tasks" from template (C)

---

### 11. STATIONS (Kitchen Clipboard) - 28 actions

- `KS-001` View station list (`/stations`) (R)
- `KS-002` Create station (name, description) (C)
- `KS-003` View station detail + manage components (`/stations/[id]`) (R, C, U)
- `KS-004` Edit station form (U)
- `KS-005` Use Clipboard (Excel-like grid: Par/On Hand/Need to Make/Made/Need to Order/Waste/Shelf Life/Notes) (`/stations/[id]/clipboard`) (U)
- `KS-006` Shift check-in/check-out (U)
- `KS-007` Toggle 86 per item (U)
- `KS-008` Print clipboard (`/stations/[id]/clipboard/print`) (R)
- `KS-009` View unified order sheet from all stations (`/stations/orders`) (R)
- `KS-010` Print order sheet (`/stations/orders/print`) (R)
- `KS-011` View waste log with 7-day summary (`/stations/waste`) (R)
- `KS-012` View operations log (`/stations/ops-log`) (R)
- `KS-013` Use Daily Ops Command Center (`/stations/daily-ops`) (R)
- `KS-014` Generate opening tasks from template (C)
- `KS-015` Start timed prep (title, notes, duration) (C)

---

### 12. ANALYTICS - 18 actions

- `AN-001` View 9-tab analytics hub (Overview, Revenue, Operations, Pipeline, Clients, Marketing, Social, Culinary, Benchmarks) (`/analytics`) (R)
- `AN-002` View daily business snapshot report (`/analytics/daily-report`) (R)
- `AN-003` Navigate report dates, regenerate report (R, C)
- `AN-004` View benchmarks dashboard (`/analytics/benchmarks`) (R)
- `AN-005` View pipeline forecast (`/analytics/pipeline`) (R)
- `AN-006` View demand heatmap + holiday YoY (`/analytics/demand`) (R)
- `AN-007` View Client LTV chart (`/analytics/client-ltv`) (R)
- `AN-008` View referral analytics (`/analytics/referral-sources`) (R)
- `AN-009` Build custom reports (`/analytics/reports`) (C)
- `AN-010` View conversion funnel (Inquiry > Quote > Booking > Completed) (`/analytics/funnel`) (R)
- `AN-011` View Intelligence Hub (25 engines, 4 tiers) (`/intelligence`) (R)

---

### 13. DAILY OPS & BRIEFING - 18 actions

- `DO-001` View Remy-generated daily plan with 4 swim lanes (`/daily`) (R, AI)
- `DO-002` Toggle task checkboxes (U)
- `DO-003` Dismiss daily plan items (D)
- `DO-004` Approve draft daily plan (U)
- `DO-005` View Morning Briefing (`/briefing`) (R)
- `DO-006` View alerts, yesterday recap, today's events, prep timers, tasks, staff (R)
- `DO-007` Add shift handoff note (shift, content) (C)
- `DO-008` Pin/delete handoff notes (U, D)
- `DO-009` Complete prep timers via "Done" button (U)

---

### 14. TRAVEL, OPERATIONS, REVIEWS & AAR - 24 actions

- `TO-001` View travel legs by week (`/travel`) (R)
- `TO-002` View production calendar (`/production`) (R)
- `TO-003` View operations hub (`/operations`) (R)
- `TO-004` Manage equipment inventory (add, log maintenance) (C, U)
- `TO-005` Log kitchen rental (facility, date, cost, times, hours, confirmation, address, purpose, notes) (C)
- `TO-006` View AAR list with stats (`/aar`) (R)
- `TO-007` View reviews feed (internal + external) (`/reviews`) (R)
- `TO-008` Log internal feedback (with "show on public profile" toggle) (C)
- `TO-009` Import platform review (with "show on public profile" toggle) (C)
- `TO-010` Configure Google review link (U)
- `TO-011` View Charity Hub (`/charity`) (R)
- `TO-012` Log charity hours (organization search, 501c verification, date, hours, notes) (C)
- `TO-013` Find charities by state + NTEE category (R)
- `TO-014` Export charity hours CSV (R)

---

### 15. SETTINGS - 54 sub-pages, ~85 actions

- `SE-001` Edit business defaults (home base, stores, timing, revenue goals, nav customization) (U)
- `SE-002` Edit profile & branding (avatar, name, bio, cuisine, service types, social links, slug, SEO) (U)
- `SE-003` Configure availability rules (hard blocks, event limits, buffer time) (U)
- `SE-004` Configure booking page (slug, headline, bio, min notice, pricing, deposit) (U)
- `SE-005` Configure event types & labels + custom fields (C, U, D)
- `SE-006` Connect Stripe payouts (EXT)
- `SE-007` Manage subscription & billing (U)
- `SE-008` Toggle modules on/off (U)
- `SE-009` Configure payment methods (Apple Pay, Google Pay) (U)
- `SE-010` Manage response templates (create/edit with variable placeholders) (C, U, D)
- `SE-011` Configure auto-response triggers (U)
- `SE-012` Edit business hours (timezone, per-day schedule, outside-hours message) (U)
- `SE-013` Configure automations (U)
- `SE-014` Configure notification preferences (email/push/SMS per category) (U)
- `SE-015` Connect Google (Gmail + Calendar) (EXT)
- `SE-016` Connect Wix integration (EXT)
- `SE-017` Configure embed widget (U)
- `SE-018` View integrations center (R)
- `SE-019` Configure Calendar Sync (iCal feed) (U)
- `SE-020` Manage Zapier webhooks (add/remove URLs, choose events, test ping) (C, U, D)
- `SE-021` Configure AI Trust Center (privacy wizard, 6 sections, data controls) (U)
- `SE-022` Edit culinary profile for Remy (U)
- `SE-023` Configure Menu Engine (11 feature toggles) (U)
- `SE-024` Configure Google review URL (U)
- `SE-025` Connect Yelp (business search, sync reviews) (EXT)
- `SE-026` Toggle light/dark theme (U)
- `SE-027` Manage professional development (skills, momentum, highlights, portfolio) (C, U)
- `SE-028` Configure chef network (discoverability toggle, profile) (U)
- `SE-029` Manage contract templates (C, U, D)
- `SE-030` Configure food safety / HACCP plan (guided review, section toggles, custom notes) (U)
- `SE-031` View/manage GDPR (export data, privacy controls) (R)
- `SE-032` Manage emergency contacts (C, U, D)
- `SE-033` Load/remove sample data (C, D)
- `SE-034` Manage API keys + webhooks (C, U, D)
- `SE-035` Configure desktop app settings (U)
- `SE-036` Submit in-app feedback (C)
- `SE-037` Change email (U)
- `SE-038` Change password (U)
- `SE-039` View devices + revoke sessions (R, D)
- `SE-040` Delete account (30-day grace, export data, confirmation) (D)
- `SE-041` Manage seasonal palettes (create, edit micro-windows, proven wins) (C, U, D)
- `SE-042` Write/view chef journal entries (C, R)
- `SE-043` Configure store preferences (OpenClaw integration) (U)
- `SE-044` View protection hub (insurance, certifications, NDA, continuity, crisis, health, portfolio removal) (R, U)
- `SE-045` Manage kiosk devices (create, pair, disable, revoke) (C, U, D)
- `SE-046` Set/change/remove staff PINs (C, U, D)
- `SE-047` Configure dashboard widget visibility (U)
- `SE-048` Configure primary nav customization (U)
- `SE-049` View public profile preview (R)
- `SE-050` Connect/disconnect Yelp (EXT)
- `SE-051` Manage iCal feed (enable/disable, copy URL, regenerate token) (U)
- `SE-052` Configure payment methods per checkout (U)

---

### 16. MARKETING & SOCIAL - 24 actions

- `MK-001` View marketing hub (`/marketing`) (R)
- `MK-002` Create/manage push dinner campaigns (`/marketing/push-dinners`) (C, U)
- `MK-003` View campaign detail with stats, recipients, send (`/marketing/[id]`) (R, C)
- `MK-004` Build email drip sequences (`/marketing/sequences`) (C, U)
- `MK-005` Manage email templates (`/marketing/templates`) (C, U, D)
- `MK-006` Use content scheduling calendar (`/social/planner`) (R, C)
- `MK-007` Plan month-specific content (`/social/planner/[month]`) (C, U)
- `MK-008` Create post with AI assist (`/social/post/new`) (C, AI)
- `MK-009` Manage media vault (`/social/vault`) (C, D)
- `MK-010` View connected social platforms (`/social/connections`) (R)
- `MK-011` Configure social settings (`/social/settings`) (U)
- `MK-012` View content pipeline (`/marketing/content-pipeline`) (R)

---

### 17. NETWORK & COMMUNITY - 22 actions

- `NW-001` View community feed (posts, reactions, threaded comments, stories) (R)
- `NW-002` Create post (C)
- `NW-003` React to posts (6 types) (C)
- `NW-004` Comment on posts (threaded) (C)
- `NW-005` Join/leave topic channels (U)
- `NW-006` View trending hashtags + chefs to follow (R)
- `NW-007` Search connections, send/accept/decline requests (R, C, U)
- `NW-008` Remove connections (2-step) (D)
- `NW-009` Share direct contacts (form) (C)
- `NW-010` View chef profiles (`/network/[chefId]`) (R)
- `NW-011` Follow/connect with chefs (C)
- `NW-012` View network notifications (`/network/notifications`) (R)
- `NW-013` Mark all notifications read (U)
- `NW-014` View saved/bookmarked posts (`/network/saved`) (R)
- `NW-015` View channel feed (`/network/channels/[slug]`) (R)
- `NW-016` Share template to community (select type, pick template, add metadata) (C)
- `NW-017` Import community template (C)

---

### 18. LOYALTY - 12 actions

- `LY-001` View loyalty dashboard (`/loyalty`) (R)
- `LY-002` Configure loyalty settings (earn rates, triggers, tiers, milestones) (U)
- `LY-003` Create reward (name, description, points, type, discount) (C)
- `LY-004` Create monthly raffle (main + bonus prizes) (C)
- `LY-005` View raffle round detail (winners, leaderboard, delivery tracking) (R)
- `LY-006` Mark raffle prizes as delivered (U)

---

### 19. SAFETY, FOOD COST & MISC - 18 actions

- `SF-001` Report safety incident (12 fields) (C)
- `SF-002` View incident detail + resolution tracker (R, U)
- `SF-003` Manage backup chef contacts (add/remove/reorder) (C, U, D)
- `SF-004` View brand mentions (`/reputation/mentions`) (R)
- `SF-005` View vendor food cost dashboard + date range picker (`/food-cost`) (R)
- `SF-006` Enter daily revenue (`/food-cost/revenue`) (C, U)
- `SF-007` Manage guest directory (search, add, tags) (`/guests`) (R, C, U)
- `SF-008` View guest profile (contact, visit history, reservations, comps) (`/guests/[id]`) (R)
- `SF-009` Redeem guest comps (U)
- `SF-010` Add/manage reservations (`/guests/reservations`) (C, U)

---

### 20. ONBOARDING, IMPORT & HELP - 16 actions

- `OB-001` Walk through guided onboarding wizard (`/onboarding`) (R, U)
- `OB-002` Import clients (CSV/manual/skip) (C)
- `OB-003` Configure loyalty in onboarding (U)
- `OB-004` Import recipes (CSV/URL/manual) (C)
- `OB-005` Add staff during onboarding (C)
- `OB-006` Use Smart Import hub (11 modes) (`/import`) (C, AI)
- `OB-007` Import CSV data (`/import/csv`) (C)
- `OB-008` Import MXP data (`/import/mxp`) (C)
- `OB-009` View import history (`/import/history`) (R)
- `OB-010` Browse help articles (`/help`) (R)
- `OB-011` View individual help article (`/help/[slug]`) (R)
- `OB-012` View Food Costing Knowledge Base (`/help/food-costing`) (R)

---

### 21. CONTRACTS & DOCUMENTS - 8 actions

- `DC-001` View contracts list (`/contracts`) (R)
- `DC-002` View document center (`/documents`) (R)
- `DC-003` Generate documents (DOP, packing, grocery, etc.) (C)
- `DC-004` Bulk generate documents (C)

---

### 22. COMMERCE - 10 actions

- `CM-001` View commerce hub (`/commerce`) (R)
- `CM-002` Manage products (create, edit, detail) (`/commerce/products`) (C, U)
- `CM-003` View orders (`/commerce/orders`) (R)
- `CM-004` View sales (`/commerce/sales`) (R)
- `CM-005` View settlements (`/commerce/settlements`) (R)
- `CM-006` View reconciliation detail (`/commerce/reconciliation/[id]`) (R)

---

### 23. CIRCLES (Dinner Circles) - 8 actions

- `CI-001` View circles list (R)
- `CI-002` Create circle (C)
- `CI-003` Manage circle members (invite, remove) (C, D)
- `CI-004` Post in circle feed (C)
- `CI-005` Configure circle settings (U)
- `CI-006` View circle social feed (R)

---

### 24. CANNABIS VERTICAL - 10 actions

- `CN-001` View cannabis hub (`/cannabis`) (R)
- `CN-002` View about page with meeting summaries (`/cannabis/about`) (R)
- `CN-003` Track compliance (`/cannabis/compliance`) (R, U)
- `CN-004` View cannabis events list (R)
- `CN-005` Manage cannabis guest invitations with age verification (C)
- `CN-006` View cannabis-specific ledger (R)
- `CN-007` Read operational handbook (`/cannabis/handbook`) (R)
- `CN-008` Track cannabis RSVPs (R, U)

---

## PART 2: CLIENT JOY (38 pages, ~120 actions)

---

### Client Portal

#### My Events (`/my-events`)

- `JE-001` View upcoming and past events list (R)
- `JE-002` View event detail (`/my-events/[id]`) (R)
- `JE-003` RSVP to event (accept/decline) (U, X)
- `JE-004` Submit dietary preferences/restrictions (C, X)
- `JE-005` Approve menu (`/my-events/[id]/approve-menu`) (U, X)
- `JE-006` Choose menu from options (`/my-events/[id]/choose-menu`) (U, X)
- `JE-007` View event summary (`/my-events/[id]/event-summary`) (R)
- `JE-008` View invoice (`/my-events/[id]/invoice`) (R)
- `JE-009` Make payment (`/my-events/[id]/pay`) (C, EXT, X)
- `JE-010` View payment plan (`/my-events/[id]/payment-plan`) (R)
- `JE-011` View countdown page (`/my-events/[id]/countdown`) (R)
- `JE-012` View/sign contract (`/my-events/[id]/contract`) (R, U, X)
- `JE-013` View proposal (`/my-events/[id]/proposal`) (R)
- `JE-014` View pre-event checklist (`/my-events/[id]/pre-event-checklist`) (R)
- `JE-015` View event history (`/my-events/history`) (R)
- `JE-016` Configure event dashboard settings (`/my-events/settings/dashboard`) (U)

#### My Quotes (`/my-quotes`)

- `JQ-001` View quotes list (R)
- `JQ-002` View quote detail (`/my-quotes/[id]`) (R)
- `JQ-003` Accept quote (T, X)
- `JQ-004` Reject quote (T, X)

#### My Inquiries (`/my-inquiries`)

- `JI-001` View inquiries list (R)
- `JI-002` View inquiry detail (`/my-inquiries/[id]`) (R)

#### My Bookings (`/my-bookings`)

- `JB-001` View bookings list (R)

#### My Chat (`/my-chat`)

- `JC-001` View chat list (R)
- `JC-002` View chat conversation (`/my-chat/[id]`) (R, C, X)

#### My Profile (`/my-profile`)

- `JP-001` View/edit profile (R, U)
- `JP-002` Delete account (`/my-profile/delete-account`) (D)

#### My Rewards (`/my-rewards`)

- `JR-001` View loyalty dashboard (points, tier, rewards) (R)
- `JR-002` Redeem rewards (U, X)
- `JR-003` View raffle section (entry count, leaderboard, draw results) (R)
- `JR-004` Play Snake game to earn raffle entry (C)
- `JR-005` View about rewards (`/my-rewards/about`) (R)

#### My Spending (`/my-spending`)

- `JS-001` View spending history (R)

#### My Hub (Dinner Circles)

- `JH-001` View hub overview (`/my-hub`) (R)
- `JH-002` Create circle (`/my-hub/create`) (C)
- `JH-003` View circle detail (`/my-hub/g/[groupToken]`) (R)
- `JH-004` View friends list (`/my-hub/friends`) (R)
- `JH-005` Invite friends (`/my-hub/friends/invite/[profileToken]`) (C, X)
- `JH-006` Share chef with friends (`/my-hub/share-chef`) (C)
- `JH-007` View notifications (`/my-hub/notifications`) (R)
- `JH-008` View favorite operators (`/my-hub/favorite-operators`) (R)
- `JH-009` View purchases (`/my-hub/purchases`) (R)

#### Book Now (`/book-now`)

- `JBK-001` Submit booking request (C, X)

#### Client Onboarding (`/onboarding/[token]`)

- `JO-001` Complete client onboarding form (C)

#### Cannabis

- `JCN-001` View cannabis events (R)

---

## PART 3: PUBLIC PAGES (Unauthenticated, ~70 pages)

These are pages both Bob and Joy (or anonymous users) can access without auth.

- `PU-001` View homepage (`/`) (R)
- `PU-002` View for-operators page (`/for-operators`) (R)
- `PU-003` Submit operator walkthrough request (`/for-operators/walkthrough`) (C)
- `PU-004` View chef profile (`/chef/[slug]`) (R)
- `PU-005` Submit direct chef inquiry (`/chef/[slug]/inquire`) (C, X)
- `PU-006` Browse chef gift cards + purchase (`/chef/[slug]/gift-cards`) (R, C)
- `PU-007` Browse chef store + purchase (`/chef/[slug]/store`) (R, C)
- `PU-008` View chef location detail (R)
- `PU-009` View public booking page (`/book`) (R)
- `PU-010` Submit booking form (C, X)
- `PU-011` View event share page (`/share/[token]`) (R)
- `PU-012` View event recap (`/share/[token]/recap`) (R)
- `PU-013` RSVP via guest link (`/event/[eventId]/guest/[secureToken]`) (C, X)
- `PU-014` Submit guest feedback (`/guest-feedback/[token]`) (C, X)
- `PU-015` Leave a review (`/review/[token]`) (C)
- `PU-016` Leave a tip (`/tip/[token]`) (C, EXT)
- `PU-017` Submit availability form (`/availability/[token]`) (C)
- `PU-018` View/complete worksheet (`/worksheet/[token]`) (C)
- `PU-019` View proposal (`/proposal/[token]`) (R)
- `PU-020` Submit survey (`/survey/[token]`) (C)
- `PU-021` View public feedback form (`/feedback/[token]`) (C)
- `PU-022` Browse chefs directory (`/chefs`) (R)
- `PU-023` View how-it-works (`/how-it-works`) (R)
- `PU-024` View pricing page (`/pricing`) (R)
- `PU-025` View trust page (`/trust`) (R)
- `PU-026` Browse ingredients encyclopedia (`/ingredients`, `/ingredients/[category]`, `/ingredient/[id]`) (R)
- `PU-027` Browse food operator directory (`/nearby`, `/nearby/[slug]`) (R)
- `PU-028` Submit operator listing (`/nearby/submit`) (C)
- `PU-029` View marketplace chefs (`/marketplace-chefs`) (R)
- `PU-030` View comparison pages (`/compare`, `/compare/[slug]`) (R)
- `PU-031` View gift cards hub (`/gift-cards`) (R)
- `PU-032` Join dinner circle via public link (`/hub/join/[groupToken]`) (C, X)
- `PU-033` View public circle (`/hub/g/[groupToken]`) (R)
- `PU-034` View public hub (`/hub`) (R)
- `PU-035` Browse public circles directory (`/hub/circles`) (R)
- `PU-036` View FAQ (`/faq`) (R)
- `PU-037` View about page (`/about`) (R)
- `PU-038` View services page (`/services`) (R)
- `PU-039` View contact page + submit form (`/contact`) (R, C)
- `PU-040` View privacy policy (`/privacy`, `/privacy-policy`) (R)
- `PU-041` View terms (`/terms`) (R)
- `PU-042` Submit beta signup (`/beta`) (C)
- `PU-043` Submit data request (`/data-request`) (C)
- `PU-044` Unsubscribe from emails (`/unsubscribe`) (U)
- `PU-045` Reactivate deleted account (`/reactivate-account`) (U)
- `PU-046` Partner signup (`/partner-signup`) (C)
- `PU-047` View partner report (`/partner-report/[token]`) (R)
- `PU-048` View blog (`/blog`) (R)
- `PU-049` View customers page (`/customers`, `/customers/[slug]`) (R)
- `PU-050` View Discover directory (`/discover/[...path]`) (R)

---

## PART 4: BOB + JOY CROSS-ROLE INTERACTION SCENARIOS

These are end-to-end flows where Bob and Joy must interact through the platform.

### Scenario 1: Full Event Lifecycle (The Golden Path)

1. **Joy** submits inquiry via public booking page (`PU-010`)
2. **Bob** sees new inquiry in pipeline (`IP-001`), views detail (`IP-010`)
3. **Bob** generates AI response, sends via Gmail (`IP-017`, `IP-019`)
4. **Bob** creates quote for Joy (`IP-029-034`)
5. **Bob** sends quote (`IP-036`)
6. **Joy** views quote (`JQ-002`), accepts (`JQ-003`)
7. **Bob** creates event linked to Joy (`E-010-013`)
8. **Bob** builds menu (`CU-004-008`)
9. **Bob** proposes event (`E-088`)
10. **Joy** views event, approves menu (`JE-005`)
11. **Bob** records Joy's payment (`E-056`)
12. **Joy** pays via portal (`JE-009`)
13. **Bob** confirms event (`E-089`)
14. **Bob** runs service simulation (`E-070`)
15. **Bob** marks in progress (`E-090`)
16. **Bob** tracks time, logs temps, manages staff (`E-068`, `E-077`, `E-072`)
17. **Bob** marks completed, walks through close-out (`E-091`, `E-113`)
18. **Bob** sends Joy feedback request (`E-035`)
19. **Joy** submits feedback via guest link (`PU-014`)
20. **Bob** views feedback, files AAR (`E-111`)

### Scenario 2: Client Onboarding + Dinner Circle

1. **Bob** sends Joy a portal invitation (`CL-003`)
2. **Joy** receives invitation, creates account (`JO-001`)
3. **Joy** edits profile, sets dietary preferences (`JP-001`)
4. **Bob** views Joy's portal activity in real-time (`CL-075`)
5. **Joy** creates a dinner circle (`JH-002`)
6. **Joy** invites friends to circle (`JH-005`)
7. Anonymous guest joins circle via public link (`PU-032`)
8. **Bob** sees circle activity on dashboard (`D-029`)

### Scenario 3: Quote Negotiation

1. **Bob** creates quote for Joy with Smart Pricing Hint (`IP-029-031`)
2. **Bob** sends quote (`IP-036`)
3. **Joy** views quote (`JQ-002`), rejects (`JQ-004`)
4. **Bob** revises quote (`IP-040`)
5. **Bob** re-sends revised quote (`IP-036`)
6. **Joy** accepts revised quote (`JQ-003`)

### Scenario 4: Multi-Event Client Relationship

1. **Bob** creates Event 1 for Joy (intimate dinner) (`E-010`)
2. **Bob** completes Event 1 lifecycle (full path)
3. **Bob** creates Event 2 for Joy (holiday party) (`E-010`)
4. **Bob** views Joy's LTV trajectory grow (`CL-025`)
5. **Bob** awards Joy loyalty bonus points (`CL-029`)
6. **Joy** redeems loyalty reward (`JR-002`)
7. **Bob** views Joy's menu history across events (`CL-026`)

### Scenario 5: Guest RSVP + Dietary Management

1. **Bob** creates event for Joy, sets up RSVP link (`E-028`)
2. **Joy** shares RSVP link with guests
3. Guests RSVP via public link (`PU-013`)
4. Guests submit dietary preferences
5. **Bob** views allergen conflict alerts (deterministic) (`E-041`)
6. **Bob** sends dietary confirmation requests (`E-032`)
7. **Bob** reconciles attendance after event (`E-036`)

### Scenario 6: Financial Full Loop

1. **Bob** creates event, quotes Joy, gets accepted
2. **Bob** records deposit from Joy (`E-056`)
3. **Bob** adds event expenses (receipts, mileage) (`E-062`, `E-059`)
4. **Joy** views invoice in portal (`JE-008`)
5. **Joy** makes payment via Stripe (`JE-009`)
6. **Bob** views profit summary (margin, food cost %, hourly rate) (`E-065`)
7. **Bob** financially closes event (`E-114`)
8. **Bob** exports tax data (`FI-026`)

### Scenario 7: Communication + Follow-Up

1. **Bob** sends direct outreach to Joy (`CL-027`)
2. **Joy** chats with Bob via portal (`JC-002`)
3. **Bob** views communication in inbox (`IN-001`)
4. **Bob** views Joy's communication history (`CL-043`)
5. **Bob** views follow-up due alerts (`D-014`)
6. **Bob** marks follow-up complete

### Scenario 8: Recipe + Menu Intelligence

1. **Bob** creates recipes via brain dump (`CU-041`)
2. **Bob** builds menu from recipes (`CU-004-008`)
3. **Bob** views menu cost breakdown (`CU-011`)
4. **Bob** checks allergen matrix against Joy's allergies (`CU-012`)
5. **Bob** scales menu for Joy's guest count (`CU-013`)
6. **Bob** views budget compliance (`CU-023`)
7. **Joy** approves menu in portal (`JE-005`)

### Scenario 9: Contract + Payment Plan

1. **Bob** generates AI contract for Joy's event (`E-027`)
2. **Joy** views contract in portal (`JE-012`)
3. **Joy** signs contract (`JE-012`)
4. **Bob** sets up payment plan (installments) (`E-058`)
5. **Joy** views payment plan (`JE-010`)
6. **Joy** makes installment payment (`JE-009`)

### Scenario 10: Public Presence + Review Loop

1. **Bob** publishes public profile (`SE-002`)
2. Anonymous user views Bob's profile (`PU-004`)
3. After event, **Bob** sends Joy review request (`E-101`)
4. **Joy** submits review via token link (`PU-015`)
5. **Bob** approves review for public profile (`IP-092`)
6. Review appears on Bob's public profile with JSON-LD SEO

---

## SUMMARY STATISTICS

| Surface              | Pages   | Actions                  |
| -------------------- | ------- | ------------------------ |
| Chef Bob             | 564     | ~1,100                   |
| Client Joy           | 38      | ~120                     |
| Public               | 70      | ~50                      |
| Cross-role scenarios | -       | 10 scenarios, ~100 steps |
| **Total**            | **672** | **~1,370**               |

### Action Type Distribution

| Type           | Count | %   |
| -------------- | ----- | --- |
| R (Read/View)  | ~680  | 50% |
| C (Create)     | ~310  | 23% |
| U (Update)     | ~250  | 18% |
| D (Delete)     | ~60   | 4%  |
| T (Transition) | ~30   | 2%  |
| AI (Ollama)    | ~25   | 2%  |
| EXT (External) | ~15   | 1%  |

### Priority Tiers for Testing

**Tier 1 - Must Test (Golden Path):** Scenario 1 (full event lifecycle), all FSM transitions, payment flows, auth flows. ~150 actions.

**Tier 2 - Should Test (Core Features):** All CRUD on major entities (events, clients, inquiries, quotes, menus, recipes, expenses). ~400 actions.

**Tier 3 - Nice to Test (Complete Coverage):** Settings, analytics, network, loyalty, cannabis, help, all sub-pages. ~500 actions.

**Tier 4 - Edge Cases:** Bulk operations, import/export, AI features, external integrations. ~320 actions.
