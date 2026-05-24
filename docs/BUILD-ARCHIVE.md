# ChefFlow V1 - Comprehensive Build Archive

> **Generated:** 2026-05-23
> **Branch:** main | **HEAD:** a918ae83d
> **Generator:** Claude Opus 4.6, from local git history + file-backed queue + legacy queue + product blueprint

---

## 1. Source Notes

This archive draws from five source systems. Each has different coverage and granularity:

| Source                  | Path                                                   | Coverage                          | Notes                                                                                  |
| ----------------------- | ------------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------- |
| Git history             | `git log --all --reverse`                              | Complete (4,165 commits)          | Authoritative for what shipped and when                                                |
| File-backed build queue | `.agents/build-queue/{active,done,blocked,in-flight}/` | Current queue state (1,576 items) | Introduced ~2026-05-15. Most items are machine-generated from research/spec extraction |
| Legacy unified queue    | `docs/UNIFIED-BUILD-QUEUE.md`                          | 341 curated items, 21 categories  | Merged 2026-05-16 from Claude + Codex sources. Human-curated, detailed notes           |
| Product blueprint       | `docs/product-blueprint.md`                            | 118 tracked specs, 6 pillars      | Last updated 2026-04-23. Pillar completion percentages may lag current state           |
| Spec files              | `docs/specs/*.md`                                      | 627 files                         | Mix of build specs, interrogation question sets, research docs, and templates          |

**Source drift warning:** The legacy unified queue (341 items) and file-backed queue (1,576 items) overlap but do not align. The file-backed queue is ~4.6x larger because it includes machine-generated research items, spec extractions, proof packs, and granular decompositions that the curated queue condensed. Treat the legacy queue as the curated human-readable inventory and the file-backed queue as the operational machine state.

---

## 2. Stats Dashboard

### Core Metrics (Verified)

| Metric                            | Value      | Source                                                        |
| --------------------------------- | ---------- | ------------------------------------------------------------- |
| Total commits                     | 4,165      | `git log --oneline --all`                                     |
| Project start date                | 2026-02-14 | Earliest commit: "Initial commit: ChefFlow V1 - Complete MVP" |
| Days active (start to 2026-05-23) | 98         | Calendar math                                                 |
| Average commits/day               | 42.5       | 4,165 / 98                                                    |

### File-Backed Queue (from `build-queue.mjs status`)

| Status          | Count     |
| --------------- | --------- |
| Active          | 709       |
| Done            | 456       |
| Blocked         | 409       |
| In-Flight       | 1         |
| Archive         | 1         |
| **Total items** | **1,576** |

| Operational Metric    | Count |
| --------------------- | ----- |
| Runs executed         | 149   |
| Proof packs generated | 391   |
| Event log entries     | 2,605 |

### Legacy Unified Queue (from `docs/UNIFIED-BUILD-QUEUE.md` summary table)

| Status     | Count   |
| ---------- | ------- |
| SPEC-READY | 167     |
| DONE       | 100     |
| PARTIAL    | 24      |
| DRAFT      | 19      |
| BLOCKED    | 15      |
| IN-FLIGHT  | 2       |
| UNSPECCED  | 14      |
| **Total**  | **341** |

> Note: The legacy summary table was last updated 2026-05-17. Some counts (e.g., DONE) are lower than current state because the Ulysses commitment wave (55 items, all DONE by 2026-05-23) was not fully reflected in the summary.

### Product Blueprint Spec Inventory (from `docs/product-blueprint.md`)

| Status              | Count                                                |
| ------------------- | ---------------------------------------------------- |
| Verified            | 64                                                   |
| Ready               | 34                                                   |
| Built               | 12                                                   |
| In Progress         | 2                                                    |
| Draft               | 3                                                    |
| Deferred/Superseded | 3                                                    |
| **Total tracked**   | **118**                                              |
| Research reports    | 135 (stated in blueprint, not individually verified) |

### Spec Files on Disk

| Metric                         | Value                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| Total files in `docs/specs/`   | 627                                                        |
| System integrity question sets | ~70 (filenames matching `system-integrity-question-set-*`) |
| Codex dispatch specs           | ~80 (filenames matching `codex-*`)                         |
| Homepage discovery rail specs  | ~20 (filenames matching `homepage-*-discovery-rail-*`)     |
| P0/P1 priority specs           | ~40 (filenames matching `p0-*` or `p1-*`)                  |

### Commit Volume By Month

| Month                   | Commits | % of Total |
| ----------------------- | ------- | ---------- |
| 2026-02                 | 682     | 16.4%      |
| 2026-03                 | 1,258   | 30.2%      |
| 2026-04                 | 1,756   | 42.2%      |
| 2026-05 (to 2026-05-23) | 469     | 11.3%      |

---

## 3. Project Timeline

### Era 1: Genesis (2026-02-14 to 2026-02-17) - 682 commits in Feb total

**Initial MVP + Vercel Deploy + Core Systems**

The project started with a massive initial commit containing the complete MVP, followed by 3 days of rapid deployment fixes and feature additions.

Key commits:

- `2026-02-14` | Initial commit: ChefFlow V1 - Complete MVP
- `2026-02-17` | Complete ChefFlow rebuild: all phases, PWA support, deployment prep
- `2026-02-17` | Add real-time chat system: pages, components, nav, event integration
- `2026-02-17` | Add AI policy compliance: review confirmations and extraction badges
- `2026-02-17` | Add multi-agent feature batch: chat, leads, households, reviews, notifications, network, sharing
- `2026-02-17` | Replace Households with Client Connections + Resend email integration
- `2026-02-17` | Add Wix integration, unified inbox, automations engine, activity tracking
- `2026-02-17` | Complete chef activity log: instrument all actions, dashboard card, nav, client timeline

### Era 2: Core Platform (2026-02-18 to 2026-02-24)

**Auth, Navigation, Analytics, Recipes, Testing**

- `2026-02-18` | Migrate domain from cheflow.us to cheflowhq.com
- `2026-02-19` | feat(pwa): full mobile and PWA readiness pass
- `2026-02-19` | feat(chef-nav): simplify IA with advanced disclosure and nav audit
- `2026-02-20` | feat(events): post-event financial close-out system
- `2026-02-20` | feat(tests): complete E2E test infrastructure with Playwright
- `2026-02-20` | feat(seo): robots.txt, dynamic sitemap, OpenGraph metadata
- `2026-02-20` | feat(analytics): booking score, menu hints, pricing suggestions, quote insights
- `2026-02-21` | feat(billing): freemium architecture, tier gating, module toggles, upgrade gates
- `2026-02-21` | feat(remy): personality guide, persistent memory, conversation threads
- `2026-02-21` | feat(clients): ultimate client profile, comprehensive dossier
- `2026-02-22` | feat(ui): add manual create buttons to 12 entity list pages
- `2026-02-22` | feat: add Culinary Composition Board, 230+ word cheat sheet

### Era 3: AI Layer + Intelligence (2026-02-22 to 2026-02-26)

**Remy, Dual LLM, Scheduled Intelligence, Reactive Events, Communication Drafts**

- `2026-02-22` | feat(ai): add 10 communication draft templates (queue-powered)
- `2026-02-22` | feat(ai): add reactive event layer with 15 event-driven triggers
- `2026-02-22` | feat(ai): add scheduled intelligence layer with 12 background jobs
- `2026-02-22` | feat(remy): add Public + Client Remy layers
- `2026-02-24` | feat(inventory): complete inventory management system
- `2026-02-24` | feat(vendors): vendor management, grades, order history, bulk actions
- `2026-02-24` | feat(ops): station ops, packing lists, travel management
- `2026-02-24` | feat(pricing): archetype formulas, auto-pricing, service type calculations

### Era 4: Mission Control + Polish (2026-02-26 to 2026-02-28)

**Testing, Weather, Packing, SEO, Gustav, Animation, Games**

- `2026-02-26` | test(journey): add 29-file Remy journey test suite, 335 scenarios
- `2026-02-26` | feat(integrations): add Sentry, PostHog, Cloudinary, Mapbox, Upstash, OneSignal
- `2026-02-26` | feat(packing): weather-aware packing suggestions via Open-Meteo
- `2026-02-26` | feat(remy): complete sprite sheet lip-sync
- `2026-02-26` | perf: optimize dev server, Turbopack, layout caching
- `2026-02-28` | feat: loyalty hardwiring, client list badges, payment receipt email
- `2026-02-28` | feat(test): close all 16 remaining test gaps, 100% catastrophic failure coverage

### Era 5: March - Growth + Hardening (1,258 commits)

**Gmail GOLDMINE, Focus Mode, Remy Eval, OpenClaw, Monetization, Settings, Surveys**

- `2026-03-01` | feat(remy): complete cross-chat awareness, nudge wiring, survey extraction
- `2026-03-01` | feat(focus-mode): complete product focus build, CI gate, tests, route gating
- `2026-03-01` | feat(gmail): 6-layer email classification + full inbox scan
- `2026-03-02` | feat(gmail): GOLDMINE extraction pipeline + conversion intelligence + lead scoring
- `2026-03-02` | feat(audit): overnight site crawler + DB integrity audit
- `2026-03-02` | feat(audit): GOLDMINE email intelligence validation, 464 tests, 100% pass
- March included: OpenClaw price intelligence, monetization model, 54 settings pages, navigation overhaul survey, persona pipeline, directory enrichment, mobile/PWA, community circles, landing page updates, Vercel to self-hosted migration prep

### Era 6: April - Maximum Velocity (1,756 commits)

**OpenClaw Debranding, PIE Foundation, Cloud AI, Staff Ops, Featured Chef, Network, Database Backups, CIL, Onboarding**

- `2026-04-01` | feat(openclaw-internal-only-boundary-and-debranding): remove OpenClaw from chef-facing surfaces
- `2026-04-01` | feat(chef-pricing-override-infrastructure): complete pricing override infrastructure
- `2026-04-01` | feat(full-cloud-ai-runtime): cloud-first Ollama routing + disclosure
- `2026-04-01` | feat(staff-ops): event context on staff tasks, inline creation, notifications
- `2026-04-01` | feat(chef-shell-clarity): guided shell, 8-item action bar
- `2026-04-02` | feat(dashboard): Smart Suggestions, metrics strip, system heartbeat
- April peak velocity: 1,756 commits in 30 days (58.5/day). Includes self-hosted migration, database backup automation, security audit waves, CIL Phase 1+2 build, Gemma 4 AI expansion, numerous persona builds, PI synthesis pipeline, OSM store ingestion, configuration engine work, and massive spec production.

### Era 7: May - Swarm Builds + Commitment Engine (469 commits to date)

**Build Queue Infrastructure, Proof Packs, Wave Builds, Ulysses Commitment Engine, Farm Dinners, Ticketing**

- `2026-05-01` | feat(communication): client attention widget with quick-reply
- `2026-05-02` | feat(remy): brain dump pipeline with entity resolution
- `2026-05-03` | feat: private AI system with on-device Gemma 4 support
- `2026-05-03` | feat(ticketing): complete farm dinner co-hosting system
- `2026-05-04` | feat(pie): add Pricing Intelligence Engine core
- `2026-05-04` | feat(infra): add ChefFlow MCP server, PIE skills, and hooks
- May included: Hermes night-shift ops, Pi Price Bridge (port 7700), build queue infrastructure with 149 runs and 391 proof packs, 30-wave swarm builds covering lifecycle, UI system, communication, circles, menus, chef ops, client management, navigation, AI, weather, architecture deepening, and the complete 60-item Ulysses Commitment Engine.

---

## 4. Complete Build Inventory By Domain (Legacy Queue)

> Source: `docs/UNIFIED-BUILD-QUEUE.md` (341 curated items, 21+ categories)
> Each table preserves the original item number, title, status, dependency, and notes.

### LIFECYCLE & EVENTS (41 items)

| #   | Item                                                          | Status | Depends On |
| --- | ------------------------------------------------------------- | ------ | ---------- |
| 1   | Canonical Chef-Client Action Vocabulary Contract              | DONE   | None       |
| 2   | Chef-Client Lifecycle Naming And Surface Decision Pass        | DONE   | #1         |
| 3   | Derived Chef-Client Lifecycle Action Graph Builder            | DONE   | #1         |
| 4   | Dashboard And Action Center Lifecycle Feed Integration        | DONE   | #3         |
| 5   | Event Detail Lifecycle Action Card                            | DONE   | #3         |
| 6   | Lifecycle Graph Regression Security And Documentation Harness | DONE   | #3         |
| 7   | Post-Event Closeout Completeness Loop                         | DONE   | None       |
| 8   | Waiting State Command Surface For Chef-Client Lifecycle       | DONE   | #1         |
| 9   | Event First Lifecycle Proof Surface Wave Plan                 | DONE   | None       |
| 10  | Event Current Operating State Card                            | DONE   | #9         |
| 11  | Event Lifecycle Rail And Stage Navigation                     | DONE   | #9         |
| 12  | Lifecycle Client Visibility And Redaction Rules               | DONE   | #11        |
| 13  | Lifecycle First Wave Ownership And Merge Plan                 | DONE   | #9         |
| 14  | Lifecycle Fixture Matrix For Finish-Gate Proof                | DONE   | #9         |
| 15  | Lifecycle Mobile Sticky Action Footer                         | DONE   | #11        |
| 16  | Lifecycle Recovery Menus And Confirmation Patterns            | DONE   | #11        |
| 17  | Lifecycle Waiting Age And Owner Language System               | DONE   | #8         |
| 18  | Remy Draft Versus Canonical Lifecycle Boundary                | DONE   | #3         |
| 19  | Live Service Execution Tracker                                | DONE   | None       |
| 20  | Live Service Execution Tracker Regression Coverage            | DONE   | #19        |
| 21  | Service Day Closeout                                          | DONE   | #19        |
| 22  | Component-Aware Prep Scheduling                               | DONE   | None       |
| 23  | Ticketed Events (5 critical bugs)                             | DONE   | None       |
| 24  | Clean Stop/Resume Trails                                      | DRAFT  | None       |
| 25  | Completion Contract                                           | DONE   | None       |
| 26  | Event Workspace Information Architecture Deepening            | DONE   | #5         |
| 27  | Day-Of Live Service Mode UI Deepening                         | DONE   | Multi      |
| 28  | Event Finance Profitability Cockpit UI Deepening              | DONE   | Multi      |
| 29  | Menu Variant Accommodations                                   | DONE   | None       |
| 30  | Allergy Severity Tiers                                        | DONE   | #29        |
| 31  | Equipment Packing List Auto-Generation                        | DONE   | None       |
| 32  | Day-Of Timeline Auto-Generation                               | DONE   | #29, #31   |
| 33  | Guest Count Flex                                              | DONE   | #29, #32   |
| 34  | Lifecycle Coverage Gap: Discovery + Vendor Fields             | DONE   | None       |
| 35  | Lifecycle Coverage Gap: Dietary Outreach System               | DONE   | None       |
| 36  | Lifecycle Coverage Gap: Reschedule + Cancel Flow              | DONE   | None       |
| 37  | Lifecycle Coverage Gap: Contract Clauses + Countersign        | DONE   | None       |
| 38  | Lifecycle Coverage Gap: Beverage Discovery                    | DONE   | None       |
| 39  | Lifecycle Coverage Gap: Departure + Leftover Tracking         | DONE   | None       |
| 40  | Lifecycle Coverage Gap: UI Wiring                             | DONE   | #34-39     |
| 41  | Post-Event Recap Video (Remotion)                             | DONE   | #7, #21    |

**Category summary:** 40 DONE, 1 DRAFT

### UI SYSTEM & DESIGN LANGUAGE (47 items)

| #   | Item                                                               | Status |
| --- | ------------------------------------------------------------------ | ------ |
| 1   | Chef UI Design System And Density Contract                         | DONE   |
| 2   | Unified Status Badge And Progress Language Pass                    | DONE   |
| 3   | Operational Empty Loading Error And Success States Pass            | DONE   |
| 4   | Dense Tables Lists Filters And Bulk Actions Upgrade                | DONE   |
| 5   | Forms Wizards And Client Intake Interaction Polish                 | DONE   |
| 6   | Lifecycle-Aware Contextual Action Bars                             | DONE   |
| 7   | Dashboard Command Center UI Deepening                              | DONE   |
| 8   | Client Portal Event Experience UI Polish                           | DONE   |
| 9   | 21st Magic Visual Optimization Gate For UI Queue                   | DONE   |
| 10  | Lifecycle UI 21st Magic Component Kit                              | DONE   |
| 11  | Event Detail Visual Before After Proof Pass                        | DONE   |
| 12  | Evidence Label Visual Treatment Pass                               | DONE   |
| 13  | Lifecycle Action Hierarchy Visual System                           | DONE   |
| 14  | Lifecycle Mobile Visual Ergonomics Pass                            | DONE   |
| 15  | Lifecycle Visual State Styling System                              | DONE   |
| 16  | Operational Visual Style Guardrails For ChefFlow UI                | DONE   |
| 17  | ChefFlow Culinary Visual Language Pass                             | DONE   |
| 18  | Data Visualization Upgrade For Chef Ops                            | DONE   |
| 19  | Operational Motion And State Transition System                     | DONE   |
| 20  | Role Specific Portal Visual Modes                                  | DONE   |
| 21  | Trust And Evidence Visual Grammar                                  | DONE   |
| 22  | Visual Priority And Surface Level System                           | DONE   |
| 23  | Visual QA Matrix And Screenshot Harness                            | DONE   |
| 24  | ChefFlow Card Composition Rules And Cleanup Pass                   | DONE   |
| 25  | ChefFlow Operational Icon Language System                          | DONE   |
| 26  | ChefFlow Signature Workflow Components                             | DONE   |
| 27  | ChefFlow Typography Roles And Text Hierarchy System                | DONE   |
| 28  | First Viewport Discipline For ChefFlow Pages                       | DONE   |
| 29  | Operational Metric Hierarchy Visual System                         | DONE   |
| 30  | Premium Detail Pass For Operational UI Craft                       | DONE   |
| 31  | Scan Understand Act Visual Heuristic Gate                          | DONE   |
| 32  | Strict Color Semantics For ChefFlow Operations                     | DONE   |
| 33  | ChefFlow Interaction Microcopy And Content Design System           | DONE   |
| 34  | ChefFlow Layout Grid And Responsive Container System               | DONE   |
| 35  | Modal Drawer And Sheet Interaction System                          | DONE   |
| 36  | ChefFlow Interaction Soundness Pass For Hover Focus Press Disabled | DONE   |
| 37  | Design Debt Map For ChefFlow Surfaces                              | DONE   |
| 38  | High Contrast And Service Environment Readability Mode             | DONE   |
| 39  | Print PDF And Share Asset Visual Consistency Pass                  | DONE   |
| 40  | Public Profile And Marketplace Trust Visual Upgrade                | DONE   |
| 41  | Revision Comparison UI For Menus Quotes And Event Changes          | DONE   |
| 42  | Route Screenshot Gallery And Design Review Board                   | DONE   |
| 43  | Theme Token Hardening And Light Dark Consistency Pass              | DONE   |
| 44  | Visual Consistency Lint And Route Audit Tooling                    | DONE   |
| 45  | Costing Transparency UI                                            | DONE   |
| 46  | Accessibility Keyboard And Focus Reliability Pass                  | DONE   |
| 47  | Documents And Proof Pack Workspace UI Upgrade                      | DONE   |

**Category summary:** 47 DONE

### INTERACTION & POWER USER (14 items)

| #   | Item                                                      | Status |
| --- | --------------------------------------------------------- | ------ |
| 1   | Bulk Action Review And Undo Safety Pattern                | DONE   |
| 2   | ChefFlow Adaptive Density And Workspace Mode Controls     | DONE   |
| 3   | ChefFlow Keyboard Shortcut And Power User Command Layer   | DONE   |
| 4   | ChefFlow Privacy Consent And Sharing Visual Controls      | DONE   |
| 5   | Cross Surface Continuity And Resume Where You Left Off UI | DONE   |
| 6   | Freshness Staleness And Last Updated Visual System        | DONE   |
| 7   | Scenario Based UI Fixture Library For Chef Workflows      | DONE   |
| 8   | ChefFlow Audit Trail And Change History Visual Pattern    | DONE   |
| 9   | ChefFlow Inline Editing And Quick Correction Pattern      | DONE   |
| 10  | ChefFlow Notification Severity And Interruption Design    | DONE   |
| 11  | Client Facing Progress Tracker Visual Upgrade             | DONE   |
| 12  | Operator Memory Search And Source Preview UI              | DONE   |
| 13  | Inbox Notifications And Triage UI Upgrade                 | DONE   |
| 14  | Universal Search And Command Palette UI Deepening         | DONE   |

**Category summary:** 14 DONE

### CLIENT COMMUNICATION & REMY (41 items)

| #   | Item                                                   | Status  |
| --- | ------------------------------------------------------ | ------- |
| 1   | Remy Routines Foundation And Policy Model              | DONE    |
| 2   | Remy Routine Authoring And Approval Experience         | DRAFT   |
| 3   | Remy Routine Runtime Matching And Execution Guardrails | PARTIAL |
| 4   | Remy Routine Safety Audit Tests And Observability      | PARTIAL |
| 5   | Remy To Codex Skill Proposal Handoff                   | DRAFT   |
| 6   | Email Snapshot & Portal Strategy                       | DRAFT   |
| 7   | Soft-Close Leverage & Reactivation                     | DONE    |
| 8   | Loyalty Client Experience                              | DONE    |
| 9   | Loyalty Phase 1: Visibility & Perks                    | DONE    |
| 10  | Handoff Context Enrichment                             | DONE    |
| 11  | Inquiry Response Cockpit UI Deepening                  | DONE    |
| 12  | Inquiry-to-Booking Orchestration                       | DONE    |
| 13  | Pre-Event Confidence Cadence                           | DONE    |
| 14  | Social Proof Loop                                      | DONE    |
| 15  | Referrer Circle Visibility                             | DONE    |
| 16  | Client Portal Guest Dietary Surfacing                  | DONE    |
| 17  | Post-Event Photo Gallery                               | DONE    |
| 18  | One-Click Rebook                                       | DONE    |
| 19  | Client Communications Brand Voice                      | DONE    |
| 20  | Day-Of Live Client Status                              | DONE    |
| 21  | Professional Invoice Delivery                          | DONE    |
| 22  | Returning Client Recognition                           | DONE    |
| 23  | Event Total Recall                                     | DONE    |
| 24  | Event Media Vault                                      | DONE    |
| 25  | Tip Tracking and Gratitude Intelligence                | DONE    |
| 26  | Personal Assistant / Delegate Access                   | DONE    |
| 27  | Wire brand-voice.ts Into Outbound Emails               | DONE    |
| 28  | Consolidate Dual Payment Reminder Paths                | DONE    |
| 29  | Wire cadence-trigger-handler Into deposit-actions.ts   | DONE    |
| 30  | Consolidate Dual Push Notification Systems             | DONE    |
| 31  | Audit Dual Follow-Up Engines                           | DRAFT   |
| 32  | Remy SMS Auto-Triage & Intelligent Response            | DONE    |
| 33  | Wire CIL-to-Communication Action Bridge Dispatch       | DONE    |
| 34  | Add cadence_schedule as Rail Source                    | DONE    |
| 35  | Passive Channel Preference Writer                      | DONE    |
| 36  | Fix CIL Draft Status Mismatch Bug                      | DONE    |
| 37  | Wire processSocialSignals Into CIL Signal Pipeline     | DONE    |
| 38  | Wire Communication Items Into Dashboard Feed           | DONE    |
| 39  | Build Communication Hub Index Page                     | DONE    |
| 40  | Add Inquiry-to-Communication Cross-Domain Edge         | DONE    |
| 41  | Add Event-to-Communication Cross-Domain Edge           | DONE    |

**Category summary:** 35 DONE, 4 DRAFT, 2 PARTIAL

### CIRCLES & COLLABORATION (12 items)

| #   | Item                                    | Status    |
| --- | --------------------------------------- | --------- |
| 1   | Circle Approval Flow                    | DONE      |
| 2   | Circle Reminder Cascade                 | DONE      |
| 3   | Collaborator Circle Bridge              | DONE      |
| 4   | Marisol 1: Circle Bridge                | DONE      |
| 5   | Crew Circles Build                      | DONE      |
| 6   | Dinner Circle Multi-Host Collaboration  | DRAFT     |
| 7   | Dinner Circle Unification               | DRAFT     |
| 8   | Circles Operating Loop Build Extraction | DRAFT     |
| 9   | Farm Dinner Co-Host Vision              | UNSPECCED |
| 10  | QR Circle Join                          | DONE      |
| 11  | Dinner Circle as Event Hub              | DONE      |
| 12  | Circle Recurring Event Support          | DONE      |

**Category summary:** 8 DONE, 3 DRAFT, 1 UNSPECCED

### MENU & RECIPE & COSTING (19 items)

| #   | Item                                          | Status |
| --- | --------------------------------------------- | ------ |
| 1   | Configurable Plate Cost                       | DONE   |
| 2   | Cost CSV Exports                              | DONE   |
| 3   | Cost Propagation Wiring                       | DONE   |
| 4   | Menu Costing Interrogation                    | DONE   |
| 5   | Chef Pricing Override Infrastructure          | DONE   |
| 6   | Food Costing Knowledge System                 | DONE   |
| 7   | Ingredient Sourcing Intelligence              | DONE   |
| 8   | Menu Builder Chef-Grade Workspace Upgrade     | DONE   |
| 9   | Menu Storytelling And FOH Presentation Studio | DONE   |
| 10  | Flexible Creation Order & Recipe Lifecycle    | DRAFT  |
| 11  | Recipe Peak Windows                           | DRAFT  |
| 12  | Menu Provenance System                        | DONE   |
| 13  | Client-Provided Menus                         | DONE   |
| 14  | Menu Proposal Sets                            | DONE   |
| 15  | Menu Fork Lineage                             | DONE   |
| 16  | Menu Fate Tracking                            | DONE   |
| 17  | Dish-Level Menu Assembly                      | DONE   |
| 18  | Fixed Menu Offerings                          | DONE   |
| 19  | Collaborative Menu Editing                    | DONE   |

**Category summary:** 17 DONE, 2 DRAFT

### CHEF OPERATIONS (16 items)

| #   | Item                                                             | Status |
| --- | ---------------------------------------------------------------- | ------ |
| 1   | Chef Shell Clarity & Guided Settings                             | DONE   |
| 2   | Marisol 2: Batch View                                            | DONE   |
| 3   | Marisol 3: Weekly Retro                                          | DONE   |
| 4   | Menu Performance Dashboard                                       | DONE   |
| 5   | Prep Sheet Generator                                             | DONE   |
| 6   | Saturation Tracking Core                                         | DONE   |
| 7   | Chef Opportunity Network                                         | DONE   |
| 8   | Pop-Up Operating System (Noah Kim)                               | DONE   |
| 9   | Chef Burnout Capacity And Boundary UI                            | DONE   |
| 10  | Chef Quick Capture Everything Inbox                              | DONE   |
| 11  | Chef Reputation Studio For Reviews Testimonials And Social Proof | DONE   |
| 12  | Chef Taste Memory And Preference Learning UI                     | DONE   |
| 13  | Multi-Event Week Command Center                                  | DONE   |
| 14  | Reusable Service Playbooks And Event Templates Studio            | DONE   |
| 15  | Shopping Receipts Inventory Mobile Workbench                     | DONE   |
| 16  | Staff Task And Assignment UI Deepening                           | DONE   |

**Category summary:** 16 DONE

### CLIENT & GUEST MANAGEMENT (10 items)

| #   | Item                                                                | Status  |
| --- | ------------------------------------------------------------------- | ------- |
| 1   | Client Passport & Delegation                                        | DONE    |
| 2   | Guest Preference Profile                                            | DONE    |
| 3   | Client UX Bug Sweep                                                 | DONE    |
| 4   | Corporate Procurement Layer                                         | DONE    |
| 5   | Overhaul Client Profiles Into Intelligence Ledger/Prediction Engine | BLOCKED |
| 6   | Client Change Request Review Center                                 | DONE    |
| 7   | Client Relationship Cockpit UI Deepening                            | DONE    |
| 8   | ChefFlow Command Timeline For Every Client Relationship             | DONE    |
| 9   | Guest Experience And Table Touchpoint Builder                       | DONE    |
| 10  | Proposal Experience Builder With Add-Ons And Tradeoffs              | DONE    |

**Category summary:** 9 DONE, 1 BLOCKED

### NAVIGATION & INFORMATION ARCHITECTURE (9 items)

| #   | Item                                           | Status      |
| --- | ---------------------------------------------- | ----------- |
| 1   | Chef Navigation And Page Header Unification    | DONE        |
| 2   | Portal Rail System Foundation                  | VERIFY-ONLY |
| 3   | Admin Portal Rail Prominence                   | SPEC-READY  |
| 4   | Chef and Client Portal Rail Prominence         | SPEC-READY  |
| 5   | Staff Portal Rail Conversion                   | SPEC-READY  |
| 6   | Partner and Vendor Portal Rail Standardization | SPEC-READY  |
| 7   | First Next Handoff Bar Mounts                  | BLOCKED     |
| 8   | Rail Item Lifecycle And Scoring Engine         | DONE        |
| 9   | Domain Wiring And Orphan Elimination Pass      | DONE        |

**Category summary:** 3 DONE, 4 SPEC-READY, 1 BLOCKED, 1 VERIFY-ONLY

### AI & INTELLIGENCE (14 items)

| #   | Item                                         | Status |
| --- | -------------------------------------------- | ------ |
| 1   | BYOAI Phase 2: Ollama Adapter                | DONE   |
| 2   | BYOAI Phase 2: Privacy Narrative             | DONE   |
| 3   | Full Cloud AI Runtime & Disclosure           | DONE   |
| 4   | Local AI Integration                         | DONE   |
| 5   | Platform Intelligence Hub                    | DONE   |
| 6   | Business Health Narrative Dashboard          | DONE   |
| 7   | Chef Operating Loop External Memory          | DRAFT  |
| 8   | Configuration Engine                         | DRAFT  |
| 9   | Culinary Operations & Costing System         | DRAFT  |
| 10  | PIE Current Attention Collector              | DONE   |
| 11  | CIL-to-Communication Action Bridge           | DONE   |
| 12  | Lifecycle Engine Activation (Event FSM Hook) | DONE   |
| 13  | Churn Triggers -> Communication Cadence      | DONE   |
| 14  | PIE -> Event Menu Auto-Costing               | DONE   |

**Category summary:** 11 DONE, 3 DRAFT

### OPENCLAW & DATA INFRASTRUCTURE (8 items)

| #   | Item                                        | Status     |
| --- | ------------------------------------------- | ---------- |
| 1   | OpenClaw Scraper Enrichment                 | IN-FLIGHT  |
| 2   | OpenClaw Archive Digester                   | SPEC-READY |
| 3   | OpenClaw Canonical Scope & Sequence         | DONE       |
| 4   | OpenClaw Capture Countdown & Pixel Schedule | DONE       |
| 5   | OpenClaw Developer Usage Page               | DONE       |
| 6   | OpenClaw Goal Governor & KPI Contract       | DONE       |
| 7   | OpenClaw Intelligence Layer                 | DONE       |
| 8   | OpenClaw Food Price Intelligence            | DRAFT      |

**Category summary:** 5 DONE, 1 SPEC-READY, 1 IN-FLIGHT, 1 DRAFT

### PUBLIC SURFACE & MARKETING (7 items)

| #   | Item                                                | Status |
| --- | --------------------------------------------------- | ------ |
| 1   | Consumer-First Discovery & Dinner Planning          | DONE   |
| 2   | Featured Chef Public Proof & Booking                | DONE   |
| 3   | Nearby Directory Redesign                           | DONE   |
| 4   | Directory Post-Claim Enhancement                    | DONE   |
| 5   | Homepage Discovery Rail Completion                  | DONE   |
| 6   | Kill Onboarding Redirect                            | DONE   |
| 7   | Public Profile And Marketplace Trust Visual Upgrade | DONE   |

**Category summary:** 7 DONE

### MOBILE & OFFLINE (5 items)

| #   | Item                                          | Status  |
| --- | --------------------------------------------- | ------- |
| 1   | Cloud Mobile Unified Migration                | DONE    |
| 2   | Mobile Chef Operations UI Pass                | DONE    |
| 3   | Chef Offline And Bad-Network Continuity Layer | DONE    |
| 4   | Android Home Screen Widgets                   | DONE    |
| 5   | iOS PWA/Tauri                                 | BLOCKED |

**Category summary:** 4 DONE, 1 BLOCKED

### SECURITY, LEGAL & TRUST (8 items)

| #   | Item                                               | Status    |
| --- | -------------------------------------------------- | --------- |
| 1   | Legal Readiness Center & Compliance Infrastructure | IN-FLIGHT |
| 2   | Settings, Branding, Account Security               | DONE      |
| 3   | ChefFlow Confidence And Evidence Labels Everywhere | DONE      |
| 4   | Route Coverage CI Test (all pages classified)      | DONE      |
| 5   | Admin Middleware Defense-in-Depth (isAdmin check)  | DONE      |
| 6   | Token Path Rate Limiting (Cloudflare WAF)          | DONE      |
| 7   | Route Manifest JSON (machine-readable inventory)   | DONE      |
| 8   | Dead Route Detection & Classification              | DONE      |

**Category summary:** 7 DONE, 1 IN-FLIGHT

### STAFF & VENDOR (3 items)

All 3 DONE: Staff Ops Unified Workflow, Referral Partner/Venue Relationship UI, Venue/Kitchen Recon Intelligence.

### ADMIN & OPERATIONS (5 items)

All 5 DONE: Mission Control Passive Dashboard, Admin Quality Console, Calendar/Production Planning UI, Onboarding Import/Activation UI, Settings IA/Preferences Cleanup.

### DEVELOPER INFRASTRUCTURE & QA (13 items)

| #   | Item                                                             | Status     |
| --- | ---------------------------------------------------------------- | ---------- |
| 1   | Comprehensive QA Validation                                      | SPEC-READY |
| 2   | Cross-Boundary Flow Interrogation                                | SPEC-READY |
| 3   | Hub Table Schema Sync                                            | DONE       |
| 4   | Comprehensive Domain Inventory Phase 1                           | SPEC-READY |
| 5   | Digital Twin Simulation Protocol                                 | DONE       |
| 6   | Internal Codex Readiness Pack                                    | DONE       |
| 7   | Work Continuity Control Plane                                    | DONE       |
| 8   | System Improvement Control Tower                                 | DONE       |
| 9   | David's Docket OpenClaw Cartridge                                | DONE       |
| 10  | Contextual Wiring Mise en Place                                  | SPEC-READY |
| 11  | Notes/Dishes/Menus/Client/Event Pipeline                         | DONE       |
| 12  | Service Simulation                                               | DONE       |
| 13  | Perceived Performance Skeletons And Route Responsiveness UI Pass | DONE       |

**Category summary:** 9 DONE, 4 SPEC-READY

### ONBOARDING & GETTING STARTED (2 items)

Both DRAFT: Onboarding Cohesion Rework, Passive Capture Triage Dock.

### REMAINING BUILT (needs Playwright verification) (6 items)

All 6 DONE: CPA Tax Export, Golden Path Reliability, Pricing Readiness Gate, Allergy/Dietary Trust, Performance Optimization, Restaurant Ops.

### HUMAN BODY BUILD WAVES (10 items)

All 10 UNSPECCED: Growth Organ Repair, Immune System Hardening, Blood Flow Standardization, Sense Upgrade, Reflex Observability, Memory Resurfacing, Endocrine/Gating Cleanup, Surface Ownership Registry, Admin Diagnosis Surface, File-to-Organ Inventory.

### REMAINING DRAFTS (7 items)

All 7 DRAFT: Beta-First Monetization, Data Export Takeout, Human Systems Doctrine, Research-Derived Builds Index, Respectful Monetization, Support Network Map, System Integrity Interrogation.

### DISCOVERY INTENSIFICATION (6 items)

All 6 DONE.

### RAIL INTENSIFICATION (6 items)

All 6 DONE.

### V1 EXIT CRITERIA (5 items)

| #   | Item                                            | Status    |
| --- | ----------------------------------------------- | --------- |
| 1   | Real chef used 2+ weeks with feedback           | UNSPECCED |
| 2   | Public booking page tested E2E by non-developer | UNSPECCED |
| 3   | Onboarding tested with non-technical user       | UNSPECCED |
| 4   | iOS app                                         | BLOCKED   |
| 5   | 48 ready specs built                            | PARTIAL   |

### CHEF AS CONSUMER (4 items)

All 4 DONE.

### GROWTH & GUEST CONVERSION (3 items)

All 3 DONE.

### WEATHER INTELLIGENCE (20 items)

All 20 DONE across 5 build waves.

### ARCHITECTURE DEEPENING (5 items)

All 5 DONE.

### ULYSSES CONTRACT / COMMITMENT LAYER (60 items)

All 60 DONE across 7 waves:

- **Wave 0:** CIL Commitment Analyzer
- **Wave 1 (10):** Unified Engine (Registry, Friction Calculator, Override Ceremony), Insights Card, Override Taxonomy, Pricing/Scheduling/Dietary Safety Domains, Streak Counter, Commitment Cockpit
- **Wave 2 (7):** Menu Integrity, Closeout Discipline, Communication, Capacity domains; Future Self Letters, Cooling-Off Periods, Portfolios
- **Wave 3 (11):** Contingency, Travel, Business Health domains; 5 Compound Signals (Spiral, Client Vortex, Seasonal Erosion, Fatigue, New Client Risk); Seasons, Event Contracts, Override Correlation
- **Wave 4 (6):** Temptation Catalog, Accountability Witness, Archaeology, Best-Month Mirror, Negotiation, Regret Minimizer
- **Wave 5 (8):** Remy Coaching (Morning/Post-Override/Monthly); Anti-Commitment Detection, Recovery Protocol, Commitment DNA, Diffusion, Quarterly Audit
- **Wave 6 (7):** Anti-Scope-Creep, Delegation/Bus-Factor, No Free Work, Client Transparency, Say No, Milestones, Commitment-Aware Quoting
- **Wave 7 (10):** Decay Detection, Vendor/Supplier, Learning, Time-of-Day, Reputation Firewall, Energy Budget, Client Education, Gratitude, Living Recipe, Pre-Mortem

### PHILOSOPHY & LANGUAGE (1 item)

DONE: System Dynamics Vocabulary.

### DEV INFRASTRUCTURE (1 item)

DONE: Action Surface Coverage Audit Script.

### Legacy Queue Recount

| Status      | Count (from per-category review) |
| ----------- | -------------------------------- |
| DONE        | ~290                             |
| DRAFT       | ~19                              |
| PARTIAL     | ~2                               |
| SPEC-READY  | ~8                               |
| BLOCKED     | ~4                               |
| IN-FLIGHT   | ~2                               |
| UNSPECCED   | ~14                              |
| VERIFY-ONLY | ~1                               |

> The summary table in `UNIFIED-BUILD-QUEUE.md` states DONE=100, but that was written before the May build waves marked ~190 additional items DONE. The SPEC-READY=167 count likely includes file-backed queue items not listed in the curated document.

---

## 5. File-Backed Queue Inventory

> Source: `.agents/build-queue/{active,done,blocked,in-flight,archive}/`
> Each directory contains individual `.md` files with YAML frontmatter.

### Directory Counts

| Directory | Files | Description                              |
| --------- | ----- | ---------------------------------------- |
| active    | 709   | Queued, ready to fire                    |
| done      | 456   | Completed with proof                     |
| blocked   | 409   | Waiting on dependency or external factor |
| in-flight | 1     | Currently being built                    |
| archive   | 1     | Historical record                        |

### Active Queue (709 items) - Domain Breakdown

The active queue is dominated by research/documentation items:

| Domain                    | Count | Notes                                        |
| ------------------------- | ----- | -------------------------------------------- |
| Documentation / Research  | 551   | 77.7% of active. Machine-generated           |
| pricing                   | 10    | PIE expansion items                          |
| culinary                  | 7     | Recipe/ingredient work                       |
| communications            | 6     | Communication pipeline                       |
| inquiries                 | 6     | Inquiry system                               |
| commitments               | 5     | Ulysses post-wave items                      |
| compliance                | 5     | Regulatory/compliance                        |
| client-intelligence       | 5     | Client data enrichment                       |
| operations                | 5     | Chef operations                              |
| scheduling                | 5     | Calendar/scheduling                          |
| surface-architecture      | 4     | Navigation/layout                            |
| qa                        | 4     | Quality assurance                            |
| architecture              | 3     | System architecture                          |
| intelligence              | 3     | AI/intelligence layer                        |
| research                  | 3     | Research tasks                               |
| security                  | 3     | Security hardening                           |
| automation guardrails     | 2     | Automation safety                            |
| client-portal             | 2     | Portal features                              |
| lifecycle                 | 2     | Event lifecycle                              |
| meal-prep                 | 2     | Meal prep features                           |
| observability             | 2     | System observability                         |
| queue-governance          | 2     | Queue management                             |
| rail                      | 2     | Universal Rail                               |
| retainers                 | 2     | Retainer contracts                           |
| staff                     | 2     | Staff management                             |
| travel                    | 2     | Travel planning                              |
| (40+ single-item domains) | ~40   | Privacy, dietary, household, referrals, etc. |

**Priority breakdown:** P0: 11, P1: 696, P2: 2

### Done Queue (456 items) - Grouped Domain Clusters

| Domain Cluster                                         | Approx. Count |
| ------------------------------------------------------ | ------------- |
| Pricing / PIE (various sub-domains)                    | ~20           |
| UI Platform (design system, colors, typography, etc.)  | ~20           |
| Dashboard (layout, feed, widgets, calendar, etc.)      | ~15           |
| Dinner Circles (client portal, events, communications) | ~15           |
| Client Portal (events, progress, security, etc.)       | ~15           |
| AI / Remy (governance, memory, routines, trust)        | ~15           |
| Chef Workflow / Memory                                 | 13            |
| Security / Auth / Tenant Isolation                     | ~8            |
| Loyalty / Rewards / Promotions / Retention             | ~10           |
| Events / Client Work Graph                             | ~10           |
| Navigation / Shell                                     | ~8            |
| Communications (various)                               | ~8            |
| Visual QA (design review, tooling, proof packs)        | ~8            |
| Clients (intelligence, segments, timeline, etc.)       | ~20           |
| Public Growth / Discovery / Marketplace                | ~8            |
| Platform / Build Queue                                 | ~8            |
| (200+ other unique domains)                            | ~260          |

**Priority breakdown:** P0: 49, P1: 390, P2: 17

### Blocked Queue (409 items) - Major Clusters

| Domain Cluster                                          | Approx. Count |
| ------------------------------------------------------- | ------------- |
| Chef Portal (navigation, settings, shell, verification) | ~30           |
| Client Intelligence (menu, retention, lifecycle, etc.)  | ~15           |
| assets                                                  | 14            |
| Chef UI (rail, events, scheduling, trust, etc.)         | ~12           |
| Client Experience (personalization, privacy, etc.)      | ~8            |
| Remy / AI (trust, routines, memory)                     | ~10           |
| Dinner Circles (various portal/notification items)      | ~10           |
| Finance (runway, tax, margin, contribution)             | ~8            |
| Event Lifecycle (client portal, operations)             | ~8            |
| Chef Time / Predictive Work Engine                      | ~5            |
| (300+ other unique domains)                             | ~289          |

### Operational Infrastructure

| Resource          | Count | Path                               |
| ----------------- | ----- | ---------------------------------- |
| Runs              | 149   | `.agents/build-queue/runs/`        |
| Proof packs       | 391   | `.agents/build-queue/proof-packs/` |
| Event log entries | 2,605 | `.agents/build-queue/events.jsonl` |

---

## 6. Spec Inventory

### Blueprint-Tracked Specs (118 total)

From `docs/product-blueprint.md`:

| Status              | Count |
| ------------------- | ----- |
| Verified            | 64    |
| Ready               | 34    |
| Built               | 12    |
| In Progress         | 2     |
| Draft               | 3     |
| Deferred/Superseded | 3     |

### Spec Files on Disk (627 total by category)

**Build specs (~150):** Feature implementation specifications

- Examples: `account-anchored-location.md`, `allergy-severity-tiers.md`, `completion-contract.md`, `configuration-engine.md`, `ticketed-events-and-distribution.md`

**System integrity question sets (~70):** Deep interrogation documents

- Pattern: `system-integrity-question-set-*.md`
- Domains covered: auth, analytics, calendar, cannabis, client management, circles, cohesion, cron, data layer, email, events, finance, guest experience, inquiries, notifications, onboarding, settings, staff

**Codex dispatch specs (~80):** Agent-ready build specifications

- Pattern: `codex-*.md`
- Domains covered: circle workflows, client UX, consumer events, corporate procurement, ingredient showcase, inquiry urgency, launch stabilization, menu performance, PIE testing, price intelligence, prep sheets, persona governance, waste patterns

**Homepage discovery rail specs (~20):** Consumer-facing discovery features

- Pattern: `homepage-*-discovery-rail-expansion-2026-05-12.md`
- Rails: availability, budget, chef-led, cuisine, diet, experience, group size, ingredient, learning, location, meal type, occasion, planning, seasonal, service format, social proof, spontaneity, technique, time/effort

**P0/P1 priority specs (~40):** Critical path items

- Pattern: `p0-*.md`, `p1-*.md`
- Covers: boundary architecture, builder agents, CPA tax, golden path, client portal hardening, onboarding, OpenClaw health, public booking, request trust, runtime surface

**Research/interrogation specs (~80):** Domain analysis documents

- Pattern: `*-interrogation.md`, `*-research*.md`

**Domain foundation contracts (~10):** Architecture blueprints

- Pattern: `*-foundation-domain-contract.md`

**Persona pipeline specs (~15), loyalty specs (~8), OpenClaw specs (~20), chromatic atlas specs (~8), devtools specs (~6), PIE specs (~5)**

---

## 7. Pre-Queue Archaeological Builds

> `feat:` commits from Feb-Mar 2026 that predate the build queue system (~2026-05-15).
> Label: "pre-queue or not obviously queue-tracked."

### Authentication & Deployment (Feb 17-19)

- `2026-02-17` | Fix Vercel deployment: remove legacy secret references
- `2026-02-17` | Remove Google sign-in button from auth pages
- `2026-02-17` | Full codebase audit: fix 30 issues, add auth flows
- `2026-02-18` | Migrate domain from cheflow.us to cheflowhq.com
- `2026-02-19` | fix(cron): add GET handlers to all Vercel Cron Job routes

### Chat & Messaging (Feb 17)

- `2026-02-17` | Add real-time chat system: pages, components, nav, event integration
- `2026-02-17` | Add multi-agent feature batch: chat, leads, households, reviews

### AI & Remy (Feb-Mar)

- `2026-02-17` | Add AI policy compliance: review confirmations and extraction badges
- `2026-02-22` | feat(ai): add 10 communication draft templates
- `2026-02-22` | feat(ai): add reactive event layer with 15 triggers
- `2026-02-22` | feat(ai): add scheduled intelligence layer with 12 jobs
- `2026-02-22` | feat(remy): add Public + Client Remy layers
- `2026-02-26` | feat(remy): complete sprite sheet lip-sync
- `2026-03-01` | feat(remy): complete cross-chat awareness, nudge wiring

### Navigation & UX (Feb)

- `2026-02-17` | Promote Schedule to top-level Calendar nav item
- `2026-02-19` | feat(chef-nav): simplify IA with advanced disclosure and nav audit
- `2026-02-22` | feat(ui): add manual create buttons to 12 entity list pages
- `2026-02-22` | feat: add Culinary Composition Board, 230+ word cheat sheet

### Analytics & Finance (Feb)

- `2026-02-20` | feat(events): post-event financial close-out system
- `2026-02-20` | feat(analytics): booking score, menu hints, pricing suggestions
- `2026-02-21` | feat(billing): freemium architecture, tier gating

### Testing (Feb)

- `2026-02-20` | feat(tests): complete E2E test infrastructure with Playwright
- `2026-02-26` | test(journey): add 29-file Remy journey test suite, 335 scenarios
- `2026-02-28` | feat(test): close all 16 remaining test gaps

### Infrastructure (Feb)

- `2026-02-17` | Add Wix integration, unified inbox, automations engine
- `2026-02-19` | feat(pwa): full mobile and PWA readiness pass
- `2026-02-20` | feat(seo): robots.txt, dynamic sitemap, OpenGraph metadata
- `2026-02-26` | feat(integrations): Sentry, PostHog, Cloudinary, Mapbox, Upstash, OneSignal
- `2026-02-26` | perf: optimize dev server, Turbopack, layout caching

### Inventory, Vendors, Ops (Feb)

- `2026-02-24` | feat(inventory): complete inventory management system
- `2026-02-24` | feat(vendors): vendor management, grades, order history
- `2026-02-24` | feat(ops): station ops, packing lists, travel management
- `2026-02-24` | feat(pricing): archetype formulas, auto-pricing

### Gmail & Email Intelligence (Mar)

- `2026-03-01` | feat(gmail): 6-layer email classification + full inbox scan
- `2026-03-02` | feat(gmail): GOLDMINE extraction pipeline + lead scoring
- `2026-03-02` | feat(audit): GOLDMINE validation, 464 tests, 100% pass

### March Builds (selected)

- `2026-03-01` | feat(focus-mode): complete product focus build, CI gate, tests
- `2026-03-01` | feat(admin): add "Preview as Chef" toggle
- `2026-03-01` | feat: add recipe organization fields
- `2026-03-01` | feat(eval): expand Remy test suite to 270 cases, 50+ categories

---

## 8. Evidence Gaps And Reconciliation Notes

### Count Mismatches

| Source A                    | Count A | Source B                        | Count B | Gap    | Explanation                                                 |
| --------------------------- | ------- | ------------------------------- | ------- | ------ | ----------------------------------------------------------- |
| Legacy queue summary (DONE) | 100     | Legacy queue per-category count | ~290    | +190   | Summary table not updated after May build waves             |
| Legacy queue (TOTAL)        | 341     | File-backed queue (TOTAL)       | 1,576   | +1,235 | File-backed queue includes machine-generated research items |
| Blueprint specs (TOTAL)     | 118     | Spec files on disk              | 627     | +509   | Most spec files are question sets and research docs         |
| build-queue.mjs active      | 709     | PowerShell dir count            | 709     | 0      | Match                                                       |
| build-queue.mjs done        | 456     | PowerShell dir count            | 456     | 0      | Match                                                       |
| build-queue.mjs blocked     | 409     | PowerShell dir count            | 409     | -1     | Near-match (timing)                                         |

### Stale Documents

| Document                    | Last Updated | Concern                                              |
| --------------------------- | ------------ | ---------------------------------------------------- |
| `docs/product-blueprint.md` | 2026-04-23   | 30 days stale. Progress percentages likely higher    |
| Legacy queue summary table  | 2026-05-17   | Summary counts do not match per-category item status |

### Done Items Without Proof Packs

- Done queue items: 456
- Proof packs: 391
- Gap: 65 items (~14%) without formal proof packs

### Active Queue Composition

551 of 709 active items (77.7%) are "Documentation / Research." The actionable build backlog is closer to ~158 items.

### Specs with Unclear Status

The 627 spec files on disk are not individually status-tracked. Only 118 appear in the product blueprint. The remaining ~509 may be active, superseded, or purely informational. No automated reconciliation exists.

### Command Failures During Gathering

- `ctx_execute` sandbox lacks git and project path access; all git/file commands used PowerShell instead
- `ctx_batch_execute` runs bash, not PowerShell; `Get-Content`/`Get-ChildItem` commands failed; used native tools

---

## 9. Suggested Next Maintenance Step

**Recommended:** Generate `docs/build-archive.json` with structured data for programmatic access. A script could run `build-queue.mjs status`, parse `UNIFIED-BUILD-QUEUE.md`, count specs, and emit JSON. Enables: automated refresh, dashboard visualization, status drift detection, historical trend analysis.

Estimated effort: ~1 hour of Codex work. Do not implement without explicit request.

---

_Generated by Claude Opus 4.6 on 2026-05-23_
_Verification commands: `git status --short`, `git log --oneline --all | Measure-Object -Line` (4,165), `node .agents/skills/build-queue/scripts/build-queue.mjs status`, PowerShell directory counts_
