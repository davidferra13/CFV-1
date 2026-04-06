# ChefFlow V1 - Product Blueprint

> **This is THE document.** It defines what ChefFlow is, what V1 includes, what's done, what's left, and when it ships. Every agent reads this. Every build references this. This is the finish line.

---

## What Is ChefFlow

ChefFlow is an operating system for food service professionals. It replaces 10+ disconnected tools (spreadsheets, texts, notes apps, accounting software, recipe binders) with one unified platform that handles everything from the first client inquiry to the final invoice.

**One sentence:** ChefFlow handles the business so the chef can handle the art.

**Domain:** `app.cheflowhq.com`
**Tagline:** Ops for Artists

---

## Who It's For

**Primary (V1):** Solo private chefs running 3-15 active clients. They cook, sell, plan, shop, invoice, and manage relationships all by themselves. They need one place for everything.

**Secondary (V1):** Small catering operations (1-3 staff), personal/family chefs, meal prep operators, grazing board artists, and food truck operators who share the same operational chaos.

**Not V1:** Large restaurants, institutional food service, or enterprise catering companies. Those are V2+ if ever.

---

## V1 Progress

```
BUILD COMPLETENESS    [============================-] 93%
SECURITY HARDENING    [=====================-------] 80%
POLISH & UX           [==================----------] 70%
VALIDATION            [===-------------------------] 10%
LAUNCH READINESS      [=====-----------------------] 20%

OVERALL V1 PROGRESS   [====================--------] 68%
```

**What this means:** The software is 93% built. But shipping a product requires more than code. Validation (proving people want this) and launch readiness (marketing, onboarding, acquisition) are the remaining work.

---

## The Six Pillars

ChefFlow is organized around six things every food operator needs to do:

### 1. SELL (Inquiry to Booking) - 92% Complete

Get clients, close deals, manage the pipeline.

- [x] Inquiry pipeline (submit, parse, respond, track, priority grouping)
- [x] Quote builder (create, send, accept, reject, pricing intelligence)
- [x] Public booking page (shareable slug-based link)
- [x] Lead management (website leads, guest leads, conversion tracking)
- [x] Calls and meetings (agenda, outcome tracking, no-show handling)
- [x] Partner referrals (stats, locations, service history)
- [x] Proposals and templates (visual editor, selectable add-ons)
- [x] Testimonial collection (approval workflow, featured display)
- [x] Smart Fill (paste text, AI extracts structured data)
- [x] Gmail integration (send, sync, thread linking)
- [x] Service Lifecycle Intelligence (auto-detects stage from conversations)
- [ ] **Remy inquiry parsing** - BROKEN (0% parse rate since March 30)

### 2. PLAN (Menus, Calendar, Daily Ops) - 100% Complete

Organize the work, see the schedule, know what's next.

- [x] Menu builder (create, edit, assign to events, drag-drop dishes)
- [x] Calendar (day/week/month views, iCal sync, Google Calendar)
- [x] Daily Ops (AI-generated daily plan, 4 swim lanes, checkboxes)
- [x] Morning Briefing (alerts, yesterday recap, today's events, staff, tasks)
- [x] Prep Timeline (active timers, countdowns, station assignments, alerts)
- [x] Task Board (kanban, priority badges, carry-forward from previous days)
- [x] Station Ops / Kitchen Clipboard (daily command center per station)
- [x] Production Calendar (monthly grid, color-coded by status)
- [x] Travel Planning (weekly travel legs, stop counts)
- [x] Pre-Service Checklist (auto-generated, safety/prep/venue/staff/service)
- [x] Weekly Meal Board (family/household meal planning)
- [x] Weekly Template Cloning

### 3. COOK (Recipes, Ingredients, Prep) - 100% Complete

Manage the craft. Recipes are the chef's IP.

- [x] Recipe management (create, edit, scale by guest count)
- [x] Ingredient master list (allergen classification, FDA Big 9)
- [x] Component library (pre-prepped elements with quantities and cost)
- [x] Menu cost breakdown (per-dish, per-guest analysis)
- [x] Allergen cross-checking (deterministic + AI deep analysis)
- [x] Technique tags and method tracking
- [x] AI-generated nutrition summaries
- [x] Culinary Board (kanban: brainstorm, design, test, approved)
- [x] Seasonal Palettes (seasonal ingredient/dish curation)
- [x] Recipe photo gallery

### 4. STOCK (Inventory, Pricing, Vendors) - 95% Complete

Know what things cost, where to buy them, what's on hand.

- [x] Ingredient price catalog (15K+ items from OpenClaw, 39 local stores)
- [x] Vendor management (contact, pricing, order history)
- [x] Inventory tracking (on-hand stock, reorder alerts, movement log)
- [x] Price history visualization (line charts, source attribution)
- [x] Auto-costing engine (10-tier price resolution chain, auto-price on ingredient add)
- [x] Grocery list generation (from menus/events)
- [x] Cost forecasting (linear interpolation from historical data)
- [x] Universal price intelligence (cross-store averaging, safety net)
- [x] Chef pricing overrides (manual per-ingredient override)
- [x] Ingredient auto-matching (pg_trgm vs 5,435 canonical names, alias-aware pricing)
- [x] Centralized unit conversions (single source of truth, zero duplicated constants)
- [x] Operator-aware food cost targets (14 operation types, dynamic thresholds)
- [ ] **Bulk menu import** - spec ready, not built

### 5. MONEY (Invoicing, Ledger, Tax, Reporting) - 92% Complete

Track every dollar in and out. Immutable, auditable, real.

- [x] Invoicing (draft, sent, paid, overdue, refunded, cancelled)
- [x] Payment tracking (deposits, installments, refunds, failed/pending)
- [x] Expense tracking (7 categories, receipt photos, mobile-first)
- [x] Immutable ledger (append-only, computed balances, never stored)
- [x] Financial reporting (9 report types: revenue, profit, expense, tax, P&L)
- [x] Tax center (quarterly estimates, mileage log, depreciation, home office)
- [x] Payroll management (employees, Form 941, W-2)
- [x] 30-day cash flow forecast
- [x] Revenue goals with progress tracking
- [x] Stripe integration (payments + voluntary supporter contributions)
- [x] Loyalty and rewards program (points, tiers, gift cards, redemption)
- [ ] **CPA-ready tax export** - built, needs Playwright verification

### 6. GROW (Clients, Analytics, Public Presence) - 85% Complete

Build relationships, understand the business, get visible.

- [x] Client CRM (30-panel relationship hub, unified timeline)
- [x] Analytics hub (inquiry funnel, revenue trends, utilization, cost tracking; 5 metrics deferred with honest "N/A" states)
- [x] Public chef profile (avatar, bio, reviews, JSON-LD SEO)
- [x] Reviews management (internal + external, approval workflow)
- [x] Client segmentation (custom segments with filters)
- [x] Embed widget (external inquiry capture, vanilla JS, any website)
- [x] Chef Opportunity Network (collaboration, referrals, knowledge sharing)
- [x] Food operator directory (public discovery, claim flow)
- [x] AI-assisted social media orchestration
- [x] Client portal (events, RSVP, dietary, feedback, rewards)
- [x] Gift cards and vouchers
- [ ] **User acquisition strategy** - ZERO (no channels, no marketing, no growth plan)
- [ ] **Survey validation** - designed and ready, not launched

---

## Infrastructure - 77% Complete

The systems that power everything.

- [x] Authentication (Auth.js v5, credentials + Google OAuth, JWT sessions)
- [x] Database (PostgreSQL, Drizzle ORM, 725 tables, 4-layer schema)
- [x] AI runtime (Ollama for private data, Gemini for generic tasks)
- [x] Real-time updates (SSE with EventEmitter bus)
- [x] File storage (local filesystem, HMAC signed URLs)
- [x] Email integration (Gmail API, send/sync/threading)
- [x] Kiosk and device fleet (tablet RSVP, dietary, feedback)
- [x] Settings (54 configuration pages)
- [x] Admin tools (platform pulse, beta signups, price catalog)
- [x] Mission Control (developer ops dashboard, Gustav AI, 90+ API endpoints)
- [ ] **SSE authentication** - SECURITY GAP (zero-auth on real-time bus)
- [x] **Automated database backups** - built April 4, encrypted, 14-day retention
- [ ] **Request correlation and observability** - spec ready, not built

---

## V1 Exit Criteria

V1 is "done" and ready to ship when ALL of the following are true:

### Must-Have (Blocks Launch)

- [x] Remy inquiry parsing works (fixed April 4: Ollama stuck on 30b model, switched to 4b)
- [x] SSE authentication implemented (already has auth + tenant channel validation; minor gaps in presence/typing endpoints)
- [ ] At least 1 real chef has used it for 2+ weeks and provided feedback
- [ ] Public booking page tested end-to-end by a non-developer
- [ ] All 6 pillars pass a Playwright walkthrough (happy path)
- [x] No critical security gaps (2 security audit waves: 38 functions hardened, all critical/high fixed; 2 remaining items are Medium/Low design decisions)
- [x] Database backup automation running (built April 4: encrypted, 14-day retention, alerting)

### Should-Have (Ship Without, Fix Fast)

- [ ] Wave-1 operator survey launched and analyzed
- [ ] 3+ interface philosophy violations fixed
- [ ] 9 built specs verified with Playwright
- [ ] Form auto-save on critical forms (inquiry, event, quote, recipe)
- [ ] Onboarding flow tested with a non-technical user

### Nice-to-Have (V1.1)

- [ ] User acquisition channel identified and tested
- [ ] Monetization model validated ($12/month voluntary)
- [ ] 179 forms with auto-save
- [ ] Full observability/request correlation
- [ ] 48 ready specs built

---

## What's Actively Being Worked On

| Item                                   | Status   | Owner                                      |
| -------------------------------------- | -------- | ------------------------------------------ |
| 6-pillar Playwright walkthrough        | Written  | Tests ready, blocked on dev server restart |
| Infrastructure system completion       | Complete | Merged to main                             |
| Food costing pipeline (full E2E)       | Complete | Merged to main (Apr 6)                     |
| Analytics honesty (zero-hallucination) | Complete | Merged to main (Apr 6)                     |

_Last cleared: 2026-04-06. Completed items moved to queue or exit criteria._

---

## What's Queued (Next Up After V1 Exit Criteria)

| Priority | Item                                          | Spec                                                 |
| -------- | --------------------------------------------- | ---------------------------------------------------- |
| ~~P0~~   | ~~Fix Remy parsing regression~~               | **DONE** (April 4)                                   |
| ~~P0~~   | ~~SSE authentication~~                        | **DONE** (already implemented, minor gaps remain)    |
| ~~P0~~   | ~~Database backup automation~~                | **DONE** (April 4)                                   |
| P1       | 9 built specs need Playwright verification    | Various                                              |
| ~~P1~~   | ~~Interface philosophy violations (3 found)~~ | **DONE** (April 5)                                   |
| P1       | CPA-ready tax export verification             | `p0-chef-cpa-ready-tax-export-and-reconciliation.md` |
| P1       | Bulk menu import                              | Spec ready                                           |
| P2       | Wave-1 operator survey launch                 | Surveys designed                                     |
| P2       | Dead-zone gating and surface honesty          | `p1-dead-zone-gating-and-surface-honesty.md`         |
| P2       | Form auto-save on critical paths              | No spec yet                                          |

---

## What We're NOT Doing (V2+ or Never)

These are explicitly out of scope for V1. Do not build, spec, or plan these:

- **Multi-tenant / multi-chef platform** - V1 is single-chef. No marketplace.
- **Restaurant POS integration** - not our market for V1
- **AI recipe generation** - PERMANENT BAN. Recipes are chef IP. AI never creates recipes.
- **Paid feature tiers / Pro gates** - all features free. No paywalls.
- **Mobile native app** - PWA is sufficient for V1
- **Enterprise catering features** - large team management, multi-location
- **White-label / reseller** - one brand, one product
- **Automated client outreach without chef approval** - AI assists, chef decides
- **OpenClaw user-facing features** - OpenClaw is internal data infrastructure only

---

## Known Issues (Current Bugs and Regressions)

| Issue                             | Severity | Since         | Impact                                                     |
| --------------------------------- | -------- | ------------- | ---------------------------------------------------------- |
| Remy parsing (FIXED)              | Fixed    | March 30      | Fixed Apr 4: 30b hung, switched 4b                         |
| SSE presence/typing validation    | Low      | Always        | Substring match instead of structured                      |
| Ollama exposed on localhost:11434 | Medium   | Always        | No auth on AI endpoint (local only)                        |
| 3 interface philosophy violations | Fixed    | Found April 4 | Fixed Apr 5: inquiries filter, event header, quotes panels |
| 179/184 forms lack auto-save      | Low      | Always        | UX debt, not blocking                                      |
| Share token PII scope undefined   | Low      | Always        | Security design decision needed                            |

---

## Spec Inventory Summary

| Status              | Count   | Meaning                                  |
| ------------------- | ------- | ---------------------------------------- |
| Verified            | 64      | Complete, tested, shipped                |
| Ready               | 34      | Spec done, waiting for builder           |
| Built               | 12      | Code done, needs Playwright verification |
| In Progress         | 2       | Actively being built                     |
| Draft               | 3       | Being written                            |
| Deferred/Superseded | 3       | Parked or replaced                       |
| **Total**           | **118** |                                          |

Plus 135 research reports across competitive analysis, persona workflows, architecture, and strategy.

---

## Revenue Model

All features are free. Revenue comes from voluntary supporter contributions ($12/month via Stripe). No locked features, no upgrade pressure, no "free bad version" messaging. Community growth is the priority.

**Break-even:** $116/month MRR (10 supporters)
**Target:** $29K/month MRR at scale

**Current validation status:** ZERO. Nobody has confirmed they'd pay. This is the #1 business risk.

---

## OpenClaw Relationship

OpenClaw is a separate system running on a Raspberry Pi. It does ALL data collection (price scraping, directory crawling, catalog building). ChefFlow reads from OpenClaw's databases. They are completely separate codebases with no shared runtime.

- OpenClaw feeds: ingredient prices, store availability, directory images
- ChefFlow consumes: via sync scripts and price resolution chain
- Developer has full surveillance dashboard on Pi:8090
- PC-side Operator control center at localhost:4000

**Rule:** OpenClaw does the scraping. ChefFlow does the UI. No redundancy.

---

## How to Update This Document

**When to update:**

- A feature moves from not-done to done (check the box)
- A new bug or regression is found (add to Known Issues)
- V1 Exit Criteria status changes
- The queue changes (items added, removed, or reprioritized)
- Progress percentages shift meaningfully (recalculate)

**Who updates:** Any agent that changes the state of a feature listed here. Check the box, update the percentage, move on.

**Rule in CLAUDE.md:** After completing work that affects a feature listed in this blueprint, update the relevant checkbox and percentage.

---

_Last updated: 2026-04-04_
_Document owner: Developer (David)_
_Canonical location: `docs/product-blueprint.md`_
