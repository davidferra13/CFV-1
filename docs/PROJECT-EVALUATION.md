# ChefFlow V1: Full Project Evaluation

> Generated 2026-05-23. Every number verified from live codebase.

---

## THE NUMBERS

### Scale

| What                        | Count                  |
| --------------------------- | ---------------------- |
| Git commits                 | 3,379                  |
| Days of development         | 98 (Feb 14 - May 23)   |
| Avg commits/day             | 34.5                   |
| TypeScript/TSX source files | ~9,400                 |
| Lines of application code   | ~1,752,000             |
| Lines of CSS                | 120,442                |
| Lines of SQL migrations     | 80,186                 |
| NPM packages                | 118 (91 deps + 27 dev) |

### Codebase Anatomy

| Layer                               | Count     |
| ----------------------------------- | --------- |
| App routes (page.tsx)               | 961       |
| API routes (route.ts)               | 408       |
| Component files (.tsx)              | 2,069     |
| Server action files (\*-actions.ts) | 981       |
| 'use server' files                  | 1,750     |
| lib/ domains (directories)          | 329       |
| Client components ('use client')    | 1,757     |
| Server components                   | 312       |
| Database tables (schema)            | 930       |
| SQL migration files                 | 1,083     |
| Test files                          | 873       |
| Test lines                          | 67,330    |
| Email/template files                | 43        |
| Integration files                   | 28        |
| Middleware                          | 292 lines |
| Public assets                       | 115       |

### Documentation

| What             | Count |
| ---------------- | ----- |
| Spec files       | 627   |
| Research reports | 193   |
| Superpowers docs | 30    |
| Session digests  | 72    |
| Swarm prompts    | 14    |
| Memory files     | 42    |
| Claude agents    | 25    |
| Git hooks        | 66    |

### Build Queue

| Tracker                                | Total       | Done        |
| -------------------------------------- | ----------- | ----------- |
| Curated queue (UNIFIED-BUILD-QUEUE.md) | 408 items   | 352 (86%)   |
| File-backed queue (.agents/)           | 1,578 items | 457 (29%)   |
| Product blueprint specs                | 118 tracked | 64 verified |

### Commits by Month

| Month              | Commits | Character                               |
| ------------------ | ------- | --------------------------------------- |
| February 2026      | 682     | Foundation: MVP, auth, Remy, ops        |
| March 2026         | 1,257   | Growth: Gmail, focus mode, monetization |
| April 2026         | 1,040   | Intelligence: CIL, PIE, Pi bridge       |
| May 2026 (to 23rd) | 400     | Explosion: swarm builds, everything     |

### Commits by Type

| Type     | Count | %     |
| -------- | ----- | ----- |
| feat     | 1,423 | 42.1% |
| fix      | 842   | 24.9% |
| docs     | 536   | 15.9% |
| chore    | 173   | 5.1%  |
| test     | 73    | 2.2%  |
| refactor | 36    | 1.1%  |
| perf     | 24    | 0.7%  |
| style    | 7     | 0.2%  |
| other    | 265   | 7.8%  |

---

## DEPTH ANALYSIS

### Route Content Depth (961 routes)

| Category                               | Count | %     |
| -------------------------------------- | ----- | ----- |
| **Substantial** (50+ meaningful lines) | 576   | 59.9% |
| Minimal (10-49 lines)                  | 318   | 33.1% |
| Stub (<10 lines)                       | 67    | 7.0%  |
| **Data-connected** (imports from lib/) | 877   | 91.3% |
| Static only (no lib/ imports)          | 84    | 8.7%  |

### Routes by Portal

| Portal                           | Total | Substantial | Data-Connected |
| -------------------------------- | ----- | ----------- | -------------- |
| Chef portal                      | 703   | 400 (56.9%) | 647 (92.0%)    |
| Public portal                    | 94    | 66 (70.2%)  | 74 (78.7%)     |
| Client portal                    | 65    | 30 (46.2%)  | 65 (100%)      |
| Admin portal                     | 44    | 34 (77.3%)  | 42 (95.5%)     |
| Auth pages                       | 13    | 12 (92.3%)  | 12 (92.3%)     |
| Partner portal                   | 6     | 6 (100%)    | 6 (100%)       |
| Staff portal                     | 6     | 5 (83.3%)   | 6 (100%)       |
| Vendor portal                    | 6     | 5 (83.3%)   | 6 (100%)       |
| Other (kiosk, beta, print, etc.) | 24    | 18 (75%)    | 20 (83%)       |

### Server Action Wiring (981 action files)

| Category                                                 | Count | %     |
| -------------------------------------------------------- | ----- | ----- |
| **Imported somewhere** (app/, components/, or cross-lib) | 691   | 70.4% |
| **Orphaned** (no importer in app/components)             | 290   | 29.6% |

### Orphan Rate: Swarm-Built vs Core Domains

| Domain          | Orphaned | Total  | Orphan Rate | Era            |
| --------------- | -------- | ------ | ----------- | -------------- |
| **ui**          | **42**   | **43** | **97.7%**   | Swarm (May 17) |
| **interaction** | **9**    | **9**  | **100%**    | Swarm (May 17) |
| **qa**          | **5**    | **5**  | **100%**    | Swarm (May 17) |
| **lifecycle**   | **16**   | **18** | **88.9%**   | Swarm (May 17) |
| **weather**     | **4**    | **5**  | **80.0%**   | Swarm (May 17) |
| **commitment**  | **3**    | **4**  | **75.0%**   | Swarm (May 17) |
| **commitments** | **3**    | **4**  | **75.0%**   | Swarm (May 17) |
| auth            | 0        | 3      | 0%          | Core           |
| ingredients     | 0        | 4      | 0%          | Core           |
| invoices        | 0        | 4      | 0%          | Core           |
| recipes         | 1        | 15     | 6.7%        | Core           |
| inquiries       | 1        | 10     | 10.0%       | Core           |
| commerce        | 2        | 23     | 8.7%        | Core           |
| clients         | 7        | 36     | 19.4%       | Core           |
| events          | 10       | 66     | 15.2%       | Core           |
| pricing         | 4        | 20     | 20.0%       | Core           |
| menus           | 12       | 32     | 37.5%       | Core           |

**Pattern:** Core domains built over weeks have 0-20% orphan rates. Swarm-built domains from May 17 have 75-100% orphan rates. The swarm created server actions + types + migrations but largely did not wire them into UI routes.

### Database Tables (930 in schema)

| Metric                                       | Count |
| -------------------------------------------- | ----- |
| Tables in schema                             | 930   |
| Tables queried in application code (.from()) | 978   |
| Unique table names in main schema            | 790   |

Note: 978 > 790 because some queries reference tables via raw SQL that aren't in the Drizzle schema, or reference table names in comments/strings. The actual queried-vs-defined ratio suggests most tables have at least one query path.

### Migrations by Date (busiest days)

| Date       | Migrations | Notes              |
| ---------- | ---------- | ------------------ |
| 2026-04-01 | 157        | Biggest single day |
| 2026-05-17 | 154        | Swarm build day    |
| 2026-03-30 | 99         |                    |
| 2026-03-31 | 64         |                    |
| 2026-03-22 | 58         |                    |
| 2026-04-15 | 23         |                    |
| 2026-03-03 | 23         |                    |

---

## CATEGORIZATION

### Tier 1: REAL (fully wired, user-facing, data-connected)

These are features a chef actually uses. Routes exist, server actions are imported, data flows end-to-end.

| Category                 | What's Real                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Events & Lifecycle**   | Event CRUD, FSM transitions, quotes, proposals, contracts, deposits, payments, close-out, reschedule/cancel. 40 items, core workflow. |
| **Menus & Recipes**      | Menu builder, recipe CRUD, ingredient management, food costing, PIE price integration, scaling engine. 17 items.                      |
| **Inquiries & Booking**  | Inquiry pipeline, journey orchestrator, returning client recognition, public booking page. Deep wiring.                               |
| **Client Management**    | Client profiles, dietary tracking, loyalty tiers, communication history, delegate access.                                             |
| **Remy AI**              | Chat interface, lip-sync animation, personality system, local Ollama integration, SMS triage.                                         |
| **Finance**              | Invoices, payments, tips, ledger entries, Stripe integration, tax export.                                                             |
| **Calendar & Daily Ops** | Calendar views, task board, morning briefing, prep timeline, station ops.                                                             |
| **Circles**              | Dinner circles, QR join, event hub, approval flow, collaborator bridge.                                                               |
| **Admin**                | Platform stats, directory management, cannabis compliance, beta surveys.                                                              |
| **Auth & Security**      | Multi-role system, 2FA, rate limiting, route coverage CI, admin defense-in-depth.                                                     |
| **PIE (Pricing)**        | 5-tier price resolution, Pi bridge (1.1M prices), seasonal scoring, confidence decay.                                                 |
| **CIL (Intelligence)**   | Per-tenant SQLite, 7 signal sources, hourly scanner, notification wiring.                                                             |
| **Discovery**            | Chef directory, ingredient encyclopedia (4K+ pages), vendor portal, multi-role system.                                                |
| **Public**               | Homepage, booking page, ingredient pages, operator pages, client portal.                                                              |
| **Rail System**          | God mode dispatcher, domain resolvers (quote, event, payment), scoring engine.                                                        |

### Tier 2: BACKEND REAL (server actions work, minimal or no UI)

These have working server-side code but limited UI consumption.

| Category                         | Notes                                                                  |
| -------------------------------- | ---------------------------------------------------------------------- |
| Inquiry-to-Booking orchestration | 9-rule trigger engine, journey orchestrator. Logic-complete, lib-only. |
| Social Proof Loop                | Review requests, reminders, moderation. No dedicated page.             |
| Referrer Circle Visibility       | 4 milestone emails, status timeline. Not wired to UI page.             |
| Brand Voice                      | 3 tone presets. No tone picker UI.                                     |
| Communication hub                | Index page built, but drafts/CIL bridge lightly consumed.              |
| Remy Routines                    | Foundation built (types, engine, safety). No authoring UI.             |

### Tier 3: SCAFFOLDED (types + actions + migration, not wired)

Created during May 16-18 swarm builds. Have the full server-side pattern (types file, action file with 5-8 server actions, migration with CREATE TABLE) but nobody calls them.

| Domain                    | Orphaned Files | What Was Created                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UI System** (43 files)  | 42 orphaned    | Design system tokens, density preferences, badge variants, state patterns, filter presets, action bar configs, dashboard layouts, magic gate evaluations, visual QA entries, card composition rules, icon definitions, signature workflows, typography configs, viewport audits, metric configs, premium detail items, color tokens, microcopy entries, grid configs, overlay configs, interaction rules, design debt items, high contrast profiles, print/share configs, trust profiles, revision entries, route screenshots, theme tokens, lint rules, evidence labels, action hierarchy, mobile ergonomics, visual state styles, culinary palettes, data viz charts, motion preferences, portal visual modes, evidence items, surface configs |
| **Interaction** (9 files) | 9 orphaned     | Undo records, workspace preferences, custom shortcuts, consent records, session states, fixture sets, audit entries, inline edit history, notification preferences, progress templates, memory search, triage actions, command palette                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Lifecycle** (18 files)  | 16 orphaned    | Action vocabulary, naming surfaces, graph nodes, dashboard feeds, action cards, graph security, closeout items, waiting states, proof surfaces, operating states, rail stages, client visibility, ownership assignments, gate criteria, sticky footer configs, recovery menus, waiting age configs, draft boundary                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **QA** (5 files)          | 5 orphaned     | Visual QA entries, screenshot comparisons                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Weather** (5 files)     | 4 orphaned     | 20 weather intelligence features                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Commitment** (8 files)  | 6 orphaned     | Unified commitment engine, friction gradient, override taxonomy, domain rules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

**Pattern:** ~89 action files across these swarm domains are pure scaffolding. They have server actions that return data from tables, but no page.tsx or component.tsx file calls them.

### Tier 4: WIRING/GLUE (connecting existing things)

| What                      | Count | Notes                                                         |
| ------------------------- | ----- | ------------------------------------------------------------- |
| Cross-domain bridges      | 8     | Inquiry-to-comm, event-to-comm, CIL-to-comm, etc.             |
| Channel preference writer | 1     | Passive learning from communication events                    |
| Consolidation fixes       | 3     | Dual push notification, dual payment reminder, dual follow-up |
| Bug fixes                 | 4     | CIL draft status mismatch, wire processSocialSignals, etc.    |

### Tier 5: INFRASTRUCTURE/TOOLING (not user-facing)

| What                     | Notes                                     |
| ------------------------ | ----------------------------------------- |
| Wire audit skill         | 30 integration domains, relevance scoring |
| Page X-Ray system        | Developer notes per route                 |
| Regression firewall      | npm run regression:firewall               |
| Test coverage blueprint  | 932 routes tracked                        |
| Build queue system       | Unified queue, status tags                |
| Session digests          | 72 auto-generated summaries               |
| Module guard hook        | File placement enforcement                |
| Compliance guard hook    | Em dash + OpenClaw enforcement            |
| Context load guard hook  | Session awareness                         |
| Route manifest generator | 938 routes classified                     |
| Dead route detector      | 631 navigable, 106 orphan                 |

---

## HONEST ASSESSMENT

### What's Genuinely Strong

1. **Core chef workflow is deep.** Events, menus, clients, inquiries, finance: these have months of iterative development, real data models, proper FSM transitions, and wired UI. This is real software.

2. **Pricing intelligence (PIE) is unique.** 1.1M prices, 5-tier resolution, Pi bridge, seasonal scoring. No competitor has this. Genuinely differentiated.

3. **961 routes with 91% data-connected.** The app is not empty shells. 877 pages pull real data from the database.

4. **1,083 migrations = serious data model.** 930 tables. This is enterprise-scale schema complexity.

5. **AI integration is thoughtful.** Algorithm-first philosophy, local Ollama, opt-in intelligence. Not a ChatGPT wrapper.

### What's Scaffolding

1. **~290 orphaned server action files (29.6%).** These have the full pattern (auth gate, tenant scope, input validation) but no consumer. They're code that looks finished but does nothing.

2. **Swarm-built domains are 75-100% unwired.** The May 17 mass build created 100+ "features" that are really just typed server functions with empty consumers. UI system alone has 42 orphaned action files.

3. **67 stub routes (7%).** These are pages that exist in the router but have <10 lines of content.

4. **Weather Intelligence (20 items "DONE")** is almost entirely scaffolded. 4 of 5 action files orphaned. Having 20 weather features sounds impressive; having 20 typed function signatures with no UI is scaffolding.

5. **Commitment Engine (60 items "DONE")** has the full engine + 10 domains + dream systems, but 6 of 8 action files are orphaned. The engine exists; almost nothing consumes it.

### The Velocity Illusion

| Metric               | Looks Like          | Actually Is                   |
| -------------------- | ------------------- | ----------------------------- |
| 352 features DONE    | Massive product     | ~250 real + ~100 scaffolded   |
| 961 routes           | Enterprise app      | 576 substantial, 67 stubs     |
| 981 action files     | Deep backend        | 691 imported, 290 orphaned    |
| 100+ items on May 17 | Incredible velocity | Mass scaffolding day          |
| 1.75M lines          | Huge codebase       | Includes generated + orphaned |

### What Actually Matters for Launch

| Category                      | Status           | Gap                                  |
| ----------------------------- | ---------------- | ------------------------------------ |
| Can a chef manage events?     | Yes              | Needs real-world testing             |
| Can a chef price services?    | Yes (PIE)        | Needs chef validation                |
| Can clients book?             | Yes              | Needs E2E test by non-dev            |
| Can chef get paid?            | Yes (Stripe)     | Working                              |
| Can chef communicate?         | Partially        | Email/SMS work, some bridges unwired |
| Is there a mobile experience? | PWA exists       | Needs activation + testing           |
| Does AI add value?            | CIL + Remy exist | Needs real usage data                |
| Revenue validated?            | **No**           | **Zero paying users**                |
| Used by real chef?            | **No**           | **Zero confirmed real usage**        |

### The Real Score

**What percentage of "352 DONE" items are genuinely complete (wired, tested, user-accessible)?**

- Tier 1 (Real): ~200-220 items
- Tier 2 (Backend real): ~20-30 items
- Tier 3 (Scaffolded): ~80-100 items
- Tier 4+5 (Glue/infra): ~20 items

**Honest completion: ~60-65% of claimed "DONE" items are genuinely wired end-to-end.**

The remaining ~35% have server actions, types, and migrations but no UI consumer. They're real code (not fake), but they're not features a user can access.

---

## REVENUE STATUS

| Metric                    | Value                         |
| ------------------------- | ----------------------------- |
| Monthly cost to operate   | ~$0 (self-hosted)             |
| Revenue model             | $12/month voluntary supporter |
| Break-even                | 10 supporters ($116/month)    |
| Current paying users      | 0                             |
| Validation conversations  | 0                             |
| Product-market fit signal | None yet                      |

---

_Source: Live codebase analysis (git log, grep, find, node scripts). All numbers verified 2026-05-23._
