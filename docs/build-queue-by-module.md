# ChefFlow Build Queue by Module

> 381 items sorted into workflow modules. Nothing discarded.
> Generated 2026-05-03. Source: specs, memory, audits, research, session digests, project map.

---

## How to Read This

- **Module** = one real chef workflow, end to end
- **Batch** = smallest set of items to make the module usable
- **Set Aside** = real ideas, wrong time. Parked, not deleted.
- Items marked **(CRITICAL)** have data integrity or safety implications
- Items marked **(BUILT?)** are built but unverified

---

# CORE WORKFLOW MODULES

These are what a chef does every day. Ship these first.

---

## MODULE 1: Inquiry -> Booked Event

_Lead comes in, you respond, quote, they accept._

### Batch 1A: Inquiry Pipeline (make it work)

1. Inquiry Consolidation Vision (centralize third-party inquiries)
2. Inquiry-to-client conversion may lose data fields (GAP #216)
3. addClientFromInquiry may not copy allergies (CRITICAL GAP #222)
4. Inquiry allergies may not populate both stores (CRITICAL GAP #223)
5. Inquiry dietary data may not flow to menu planning (GAP #224)
6. Inquiry Event Urgency (codex spec #123)
7. Spring Surge Command Center (5 changes for inquiry flood) (#256)
8. No test for quote acceptance triggering event transition (GAP #193)
9. Fix: Remove Phantom Terms from Quote Acceptance (#106)
10. Source-to-Close Funnel Truth Map (research #347)

### Batch 1B: Booking & Confirmation

11. P0: Public Booking Routing and Source Truth (#48)
12. Public booking tested by non-developer (exit criteria #5)
13. Route-aware reassurance spine (deferred #300)
14. P1: Operational Reassurance and What Happens Next (#58)
15. Soft-Close Leverage and Reactivation (BUILT? #172)
16. Re-booking flow doesn't pre-populate from recent event (GAP #239)
17. Fix: Pre-fill Re-booking Form from Client Profile (#107)
18. Open Slot Broadcast (codex #124)

### Batch 1C: Quoting & Pricing

19. Configurable Overhead % and Labor Rate in Plate Cost (P0 BLOCKER #15)
20. Quick Price From Menu (codex #125)
21. Chef Pricing Override Infrastructure (BUILT? #159)
22. Unit Conversion Costing Design (draft #149)
23. Costing Transparency UI / Confidence Tooltip (P2 #17)

### Related Research (not build items)

- Chef Pricing Override Current State (#331)
- Restaurant Costing Platform Landscape (#342)
- Competitive Intelligence Gap Closure (#349)

**Module 1 total: 23 build items**

---

## MODULE 2: Menu & Recipe

_Plan what you're cooking, document it, cost it._

### Batch 2A: Recipe Capture (your #1 pain)

1. Chef Knowledge System (ChefTips + ChefNotes) (#20)
2. ChefTips Daily Learning Log (#21)
3. Notes-Dishes-Menus-Client-Event Pipeline (BUILT? #165)
4. Food Costing Knowledge System (BUILT? #162)
5. Recipe and Menu Cost CSV Export (P1 #16)
6. P1: Recipe Root Canonicalization and Route Truth (#59)

### Batch 2B: Menu Planning

7. Menu Approval Workflow (deferred #371, revisit when using it)
8. Build Shareable Menu Selection Token (#181)
9. Event readiness doesn't verify allergies vs finalized menu (CRITICAL GAP #242)
10. Menu allergen gate may read from wrong store (CRITICAL GAP #227)
11. Ingredient substitution may not filter by allergies (GAP #233)

### Batch 2C: Ingredient & Costing

12. Ingredient Lifecycle: UI yield input needed (#273)
13. Recipe Peak Windows build (#285)
14. Ingredient Showcase Auto-Builder (codex #94)
15. Provenance Data Capture (codex #108)
16. Codex Menu Performance Dashboard (#66)

### Related Research

- Complete US Ingredient Catalog (#317)
- USDA SR Legacy Database Structure (#318)
- Food Pricing Databases and APIs (#316)

**Module 2 total: 16 build items**

---

## MODULE 3: Event Prep -> Execute -> Close

_Shopping list, prep timeline, cook, get paid._

### Batch 3A: Prep & Execution

1. Prep Timeline Professional Grade (#64)
2. P2 Prep Timeline iCal (codex #116)
3. Live Service Execution Tracker (#62)
4. Live Service Execution Tracker Regression Coverage (#63)
5. Chef Readiness Checklist: pre-event gear (#286)
6. Shopping list may not check client allergies (CRITICAL GAP #230)
7. Consolidated shopping list may strip per-event allergy context (GAP #231)
8. Codex Prep Sheet Generator (#67)

### Batch 3B: Service Day

9. Codex Service Day Closeout (#69)
10. Event completion may not update client last_event_date (GAP #241)
11. Event Completion Menu Auto-Log (codex #97)
12. Pack list serviceware/gear enhancements (deferred #305)

### Batch 3C: Post-Event

13. Shift History Page (codex #112)
14. Shift Knowledge Search (codex #113)
15. Waste Patterns Page (codex #115)
16. Marisol 3: Weekly Retro (codex #80)
17. Rotation Guard (codex #110)

**Module 3 total: 17 build items**

---

## MODULE 4: Client Management

_Profiles, dietary info, allergies, history, retention._

### Batch 4A: Client Data Integrity (CRITICAL)

1. Client TypeScript type incomplete, 50+ `as any` (GAP #197)
2. Chef allergy updates may only write to one store (CRITICAL #225)
3. Portal allergy self-report may only write to one store (CRITICAL #226)
4. End-to-end peanut allergy chain test (CRITICAL #245)
5. Dietary change logs not consumed for menu re-evaluation (CRITICAL #243)
6. Client health score Recency may use stale column (CRITICAL #235)
7. Dietary change alerts not on dashboard (GAP #205)
8. Create client without invitation, then later invite linking (GAP #200)

### Batch 4B: Client UX

9. Client UX Bug Sweep (3 fixes) (codex #73)
10. Client List Health Enrichment (codex #96)
11. Client Passport and Delegation Layer (codex #72)
12. Client Passport Persistence + Delegate Role (codex #95)
13. Guest Preference Profile Enhancement (codex #91)
14. Preference Sync Bridge (codex #109)
15. Taste profile data not used downstream (GAP #206)

### Batch 4C: Client Lifecycle

16. Client status dropdown may not trigger downstream effects (GAP #198)
17. Loyalty point redemption stops at points deducted (GAP #207)
18. Referral tree circular reference protection (GAP #208)
19. Pinned notes visibility scope unclear (GAP #209)
20. Follow-up rules trigger mechanism may not execute (GAP #210)
21. Touchpoint system not integrated with calendar (GAP #211)
22. Client tag normalization (case sensitivity) (GAP #212)
23. Bulk operations limited to archive only (GAP #213)
24. CSV export LTV may compute differently (GAP #240)
25. Client merge completeness (GAP #215)
26. Next Best Action may reference non-existent columns (GAP #236)
27. Proactive alerts blind spots (GAP #237)
28. Soft-deleted client notifications not cancelled (GAP #244)

### Batch 4D: Client Security & Compliance

29. GDPR account deletion purge completeness (GAP #199)
30. GDPR data export completeness (GAP #217)
31. Soft-deleted client portal access experience (GAP #218)
32. Client security data stored as plaintext (GAP #219)
33. Duplicate NDA implementations may conflict (GAP #220)
34. Intake form tokens not rate-limited (GAP #221)
35. CSV export field completeness (GAP #214)

### Batch 4E: Client Portal

36. Client portal dietary update sync (GAP #203)
37. Household allergen matrix cross-reference (GAP #204)
38. Client portal updates may be silent to chef (GAP #238)
39. Dietary change logging only fires on chef-side edit (GAP #229)
40. Intake form applyResponseToClient may overwrite data (GAP #201)
41. Onboarding token vs invitation token conflict (GAP #202)

**Module 4 total: 41 build items**

---

## MODULE 5: Communication Pipeline

_Email clients, respond, follow up, Remy._

### Batch 5A: Email & Messaging

1. Email Portal Strategy: A/B with portal delivering menus (#277)
2. Remy context builder may not load all client data (GAP #234)
3. Remy may not include severity from structured records (GAP #228)
4. No sync check when new Remy action added (GAP #189)
5. Handoff Context Enrichment (codex #92)
6. Private Circle Messaging (codex #111)

### Batch 5B: Notifications

7. Staff don't receive direct event transition notifications (GAP #195)
8. Non-blocking side effect failures lost (GAP #192)
9. Circle Reminder Cascade (codex #90)
10. Testimonial submission doesn't fire loyalty triggers (GAP #196)
11. Meal request system doesn't cross-reference allergies (GAP #232)

**Module 5 total: 11 build items**

---

## MODULE 6: Money & Finance

_Invoicing, payments, tax, reconciliation._

### Batch 6A: Core Money

1. Money Flow Audit remaining 28.4% (#299)
2. P0 Chef CPA-Ready Tax Export (BUILT? #166)
3. P1 Cash Flow Expense Projection (codex #119)
4. Build Report Normalization (#180)

### Related Research

- Chef Tax Export Intent and Gap Check (#333)

**Module 6 total: 4 build items**

---

# PLATFORM MODULES

Supporting infrastructure that makes core workflows better.

---

## MODULE 7: Dashboard & Navigation

### Batch 7A: Daily Driver

1. Mission Control Passive Dashboard (#27)
2. Navigation Action Bar (two-layer nav) (#275)
3. P1: Navigation and CTA Continuity (#57)
4. UX Energy: heartbeat, action bar, smart suggestions (#278)
5. Build Dashboard Interactivity (#175)
6. Station Nav Links (codex #114)
7. Events List Urgency & Next-Step Indicators (codex #98)
8. Circles Momentum Strip (codex #87)
9. Circles Nav Activation (codex #88)

**Module 7 total: 9 build items**

---

## MODULE 8: Settings & Onboarding

### Batch 8A: First Run

1. Onboarding Cohesion + Config Engine (#280)
2. Configuration Engine (draft #139)
3. P0: Onboarding First-Week Activation Contract (#47)
4. Interview state not persisted (GAP #248)
5. No "skip setup entirely" escape (GAP #249)
6. Re-running interview overwrites customizations (GAP #250)
7. Interview lacks ARIA (GAP #251)
8. Onboarding tested with non-technical user (exit criteria #7)
9. Settings Branding Account Security (BUILT? #171)

**Module 8 total: 9 build items**

---

## MODULE 9: Events & Scheduling

### Batch 9A: Event Lifecycle

1. Event Lifecycle remaining 2.8% (#297)
2. P1: Event Scheduling Surface Ownership (#56)
3. transitionEvent doesn't call revalidateTag (GAP #190)
4. Audit for unstable_cache without revalidateTag (GAP #191)
5. No test for client cancellation triggering refund notification (GAP #194)
6. Build Referral Context Badge on Event Detail (#179)

**Module 9 total: 6 build items**

---

## MODULE 10: Commerce & POS

### Batch 10A: Verify What's Built

1. Data Export: Commerce/POS not included (CRITICAL GAP #253)
2. Data Export: Conversations must include all types (GAP #252)
3. Data Export: Inquiries not included (CRITICAL GAP #254)
4. Build Group Split Page (#177)

**Module 10 total: 4 build items**

---

# EXPANSION MODULES

Real value, but only after core is proven.

---

## MODULE 11: Dinner Circles & Community

### Batch 11A: Circle Foundation

1. Dinner Circles Convergence (operational auto-create) (#272)
2. Dinner Circle Unification (draft #143)
3. Dinner Circles Elevation Spec (#154)
4. Dinner Circle Multi-Host Collaboration (draft #142)
5. Circles Agent 1: Bug Fixes (9 fixes) (codex #99)
6. Fix: Auto-Join Consent (codex #103)
7. Fix: Chat Empty State Wrong Copy (codex #104)
8. Fix: Remove Dev Note from Public Circles Page (codex #105)
9. Hub Table Drizzle Schema Sync (codex #93)

### Batch 11B: Circle Operations

10. Circle One-Pass Approval Flow (codex #70)
11. Circle Event Broadcast (codex #71)
12. Circle Command Center (codex #82)
13. Circle Command Briefing (codex #83)
14. Circle Quick Actions (codex #84)
15. Circle Triage Engine (codex #85)
16. Circle Prep Assignments (codex #86)
17. Circle Sourcing Board (codex #89)
18. Collaborator-to-Circle Bridge (codex #74)
19. Consumer Upcoming Events from My Circles (codex #75)
20. Post-Dinner Circle On-Ramp (codex #81)

### Batch 11C: Circle Personas

21. Marisol 1: Circle Bridge (codex #78)
22. Marisol 2: Batch View (codex #79)

### Batch 11D: Community

23. No platform-wide moderation (GAP #246)
24. No content moderation on circle names (GAP #247)

### Batch 11E: Co-Hosting & Ticketing

25. Farm Dinner Co-Host Vision (#295)
26. Co-Hosted Dinner Build Spec (#137)
27. Crew Circles Build Spec (#136)
28. Ticketed Events and Distribution (awaiting review #153)
29. Build Ticketed Events Chef Wiring Fix (#182)
30. Build Ticketed Events Migration Fix (#183)
31. Build Ticketed Events Public View (#184)
32. Build Ticketed Events Wiring Fixes (#185)
33. Stabilize Ticketing Wiring (codex #132)
34. Ticketed events: event_share_settings table never created (CRITICAL #303)
35. Ticketed events: public-event-view.tsx missing (CRITICAL #304)
36. Circles Agent 2: Ticketing-Circle Bridge (codex #100)
37. Corporate Procurement Layer (codex #76)

**Module 11 total: 37 build items**

---

## MODULE 12: Public Presence

_Website, SEO, discovery, public booking page._

### Batch 12A: Public Surface

1. Public Surface Cohesion: 32 FAIL items (#281)
2. Consumer-First Discovery and Dinner Planning (#24)
3. Nearby Directory Redesign (#28)
4. /nearby data quality not ready (#293)
5. Food Directory rename + consumer-first redesign (#296)
6. Directory Post-Claim Enhancement Flow (#26)
7. P1: Search Intent Landing Architecture (#60)
8. P1: Buyer Education and Pre-Decision Guidance (#54)
9. P1: Demo Continuity and Portal Proof (#55)
10. Circles Agent 4: Public Event Page Polish (codex #102)
11. Operator acquisition routing: channel validation missing (#368)

### Batch 12B: SEO & Discoverability

12. Featured Chef Public Proof and Booking (research #321)
13. Public Chef Credentials Showcase (research #322)
14. E-Phone Book: external food operator directory (#291)

### Related Research

- SEO Comprehensive Checklist (#332)
- External Entrypoint Classification (#334)
- Production Reachability Report (#335)
- Route Discoverability Report (#336)

**Module 12 total: 14 build items**

---

## MODULE 13: Staff & Delegation

### Batch 13A: Core Staff

1. Staff Ops Unified Workflow (BUILT? #173)
2. Chef Injury Delegation: three delegation modes (#273)
3. Circles Agent 3: Missing Lifecycle Notifications (codex #101)

### Related Research

- Staff Ops Competitive Landscape (#320)

**Module 13 total: 3 build items**

---

## MODULE 14: Analytics & Intelligence

### Batch 14A: Basics

1. P1: Analytics Surface Ownership and Route Truth (#51)
2. Saturation Tracking (#61)
3. Codex Saturation Tracking Core (#68)
4. Saturation tracking integrations deferred (#306)
5. Lifecycle Intelligence Layer (#274)
6. Predictive Lifecycle Engine (research #319)
7. Completion Contract: unified CompletionResult engine (#279)
8. Platform Intelligence Hub (Phase 1 built, more pending #152)

### Batch 14B: Guest Analytics

9. /clients/[id]/relationship 500 error (#301)
10. Guest analytics page improvements

**Module 14 total: 10 build items**

---

# INFRASTRUCTURE MODULES

Engineering. Chef never sees this directly.

---

## MODULE 15: Data & OpenClaw

### Batch 15A: Price Intelligence

1. Nationwide pricing 7-phase execution (#294)
2. Price Intel Spec 1: Government Expansion (codex #120)
3. Price Intel Spec 2: Nationwide Config Gapfill (codex #121)
4. Price Intel Spec 3: Scraper Hardening (codex #122)
5. OpenClaw Scraper Enrichment remaining phases (#151)
6. Pipeline Bugfix Synthesis Deadlock (#39)
7. OpenClaw Food Price Intelligence (draft #145)
8. OpenClaw Reference Libraries (73/400 shelf life, 89/200 waste) (#376)

### Batch 15B: OpenClaw Platform

9. OpenClaw Archive Digester (#29)
10. OpenClaw Total Capture (#35)
11. OpenClaw Capture Countdown and Pixel Schedule (#30)
12. OpenClaw Goal Governor and KPI Contract (#31)
13. OpenClaw Ideal Runtime and National Intelligence (#32)
14. OpenClaw Non-Goals and Never-Do Rules (#33)
15. OpenClaw PC Local Mirror and Backup Contract (#34)
16. OpenClaw Phase 3 Full Integration (#374)
17. OpenClaw Intelligence Layer (#377)
18. OpenClaw Directory Images Cartridge (#372)
19. OpenClaw Inventory Evolution Phases 2-4 (#373)
20. Lead Engine Cartridge (#375)
21. OSM Store Ingestion (150K+ stores) (#289)

### Batch 15C: Data Quality

22. Orchestration Data Pipeline (#65)
23. Adaptive Sourcing Workflow (#186)
24. Opus Distillation Strategy (#296)

### Related Research

- Instacart API Breakthrough (#315)
- Retailer API Inventory Research (#343)
- OpenClaw Social Media Scheduling Landscape (#334)

**Module 15 total: 24 build items**

---

## MODULE 16: AI & Remy

### Batch 16A: Remy Core

1. Remy Operating Layer Vision (more phases) (#174)
2. Local AI Integration (BUILT? #164)
3. Full Cloud AI Runtime and Disclosure (BUILT? #163)
4. CIL Phase 1+2 (BUILT, no UI consumer) (#292)
5. BYOAI Phase 2B: Ollama Adapter (#18)
6. BYOAI Phase 2C: Privacy Narrative (#19)

### Batch 16B: Remy Intelligence

7. Gemma 4 AI Expansion Mandate (#289)
8. Continuous Intelligence Layer full spec (draft #140)
9. Persona Pipeline Autonomous Agent (#36)
10. Persona Pipeline V2 (#37)
11. Persona Pipeline V3 Upgrades (#38)

**Module 16 total: 11 build items**

---

## MODULE 17: Platform Health & Security

### Batch 17A: Build & Deploy

1. Build Fix TSC Errors (#176)
2. Build Pipeline Reliability + Re-score (#178)
3. Stabilize Build Verification (codex #130)
4. Stabilize Migration Audit (codex #131)
5. P1: Build and Release Contract Truth (#53)
6. P1: Automated Database Backup System (#52)
7. Self-Hosted Deployment Standard (#40)
8. SSE presence uses substring match (known bug #12)
9. Ollama exposed with no auth (known issue #13)
10. Codebase TODO: tsvector parse failure (#381)
11. P0 Hallucination Fixes (codex #117)
12. P1 Allergen Word Boundary (codex #118)

### Batch 17B: Security

13. Client security data stored as plaintext (GAP #219)
14. Intake form tokens not rate-limited (GAP #221)

### Batch 17C: Testing & QA

15. Comprehensive QA Validation (#23)
16. Canonical Tasks Create Regression Harness (#187)
17. Tasks create Playwright regression spec (#302)
18. P1 Allergy and Dietary Trust Alignment (BUILT, Playwright blocked #168)
19. Tokenized public flows: deeper audit (#307)
20. Launch Stabilization Agent 1 (#126)
21. Launch Stabilization Agent 2 (#127)
22. Launch Stabilization Agent 3 (#128)
23. Overnight Batch 2026-04-24 (#129)
24. Digital Twin Simulation Protocol (#25)

### Related Research

- Attack Surface Audit (#308)
- AI Injection and Abuse Audit (#309)
- Infrastructure Audit (#310)
- Supply Chain Audit (#311)
- Cybersecurity Comprehensive Audit (#312)
- Raspberry Pi Full Audit (#313)

**Module 17 total: 24 build items**

---

## MODULE 18: Tooling & Developer Experience

### Batch 18A: Agent & Workflow

1. P0: Builder Agent Foundation (#46)
2. P0: Boundary-First Architecture Sequence (#45)
3. P0: Zero Manual Entry Form Control Plane (#50)
4. Comprehensive Domain Inventory Phase 1 (#22)
5. Surface Grammar Governance (#41)
6. Universal Interface Philosophy enforcement (#44)
7. Website Build Research Spec Cross-Reference Upgrade (#43)
8. TakeAChef / PrivateChefManager Parity Doc (#42)
9. Persona Drift Guard Generator (codex #133)
10. Persona Drift Inbox Preview (codex #134)
11. David's Docket cartridge enhancements (#297)
12. Graphify Knowledge Graph maintenance
13. MemPalace backlog execution (40 items referenced)

**Module 18 total: 13 build items**

---

# SET ASIDE

_Real ideas. Wrong time. Revisit after Module 1-6 are shipping._

---

## Set Aside: Far Future / Vision

1. OpenClaw VR/MR Spatial Dashboard (#269)
2. International Readiness: Phase 2 format wiring (#282)
3. International Readiness Layer (codex #135)
4. International Phase 2 Format Wiring (codex #77)
5. Android Home Screen Widgets (#14)
6. Cloud + Mobile Phase 4 iOS (blocked on macOS) (#4)
7. Tauri desktop resurrection (#287)

## Set Aside: Needs Users First

8. User acquisition strategy (#1)
9. Survey validation (#2)
10. Wave-1 operator survey (#6)
11. Monetization validated (#9)
12. User acquisition channel tested (#8)
13. Real chef used it 2+ weeks (exit criteria #4)
14. P0: Survey Passive Voluntary Deploy Verification (#49)
15. Survey Wave 1 Internal Launch (#155)
16. P1: Survey Public Hardening (#157)
17. Beta-First Monetization Decision Archive (draft #138)
18. Respectful Monetization Foundation (draft #148)

## Set Aside: Premature Scale

19. RBAC System Specification (#146)
20. Corporate Procurement Layer (codex #76)
21. Culinary School Bar quality test (#300)

## Set Aside: Superseded / Deferred

22. App Polish and Completion (superseded #368)
23. BYOAI Phase 2A Remy Prompt API (superseded #369)
24. Remy Hybrid Cloud Routing (superseded #370)

## Set Aside: OpenClaw Social

25. OpenClaw Social Media Orchestration (#270)

## Set Aside: Research (reference only, not build items)

26. QoL Comprehensive Audit (#308)
27. QoL Features State of Art (#309)
28. UX Refinement Master Plan (#310)
29. UX Refinement Phase 3 Implementation (#311)
30. Loyalty System Audit (#314)
31. Remy Cloud Routing Options (#323)
32. Respectful Monetization Direction (#324)
33. Restaurant Ops Current State (#332)
34. Free-First API Integration Priorities (#335)
35. Chef Shell Clarity Intent Audit (#337)
36. Cross-System Continuity Audit (#341)
37. Chef OS Sanity Check (#342)
38. Phase Shift System Audit (#343)
39. Text Measurement Audit (#344)
40. Media Intelligence Watchlist (#345)
41. Code Audit Decision Register (#348)
42. Platform Intelligence Cross-Persona Ground Truth (#350)
43. Chef Activation Signal Inventory (#352)
44. Website Routing and Source Analytics (#353)
45. System Completeness Gap Map (#354)

## Set Aside: Question Sets (reference, audit when module is active)

46. Analytics question set
47. Calendar question set
48. Client Portal question set
49. Cross-System Cohesion (29 items)
50. Culinary question set
51. Dashboard question set
52. Finance question set
53. Financials question set
54. Guest Experience question set
55. Inquiry Pipeline question set
56. Inquiry to Completion question set
57. Network/Collab question set
58. OpenClaw Cohesion V3 question set
59. Role Hierarchy question set
60. Settings question set
61. Staff Ops question set
62. Co-hosting question set (40 questions)

## Set Aside: Remaining Items

63. 179 forms missing auto-save (do per-module as you build)
64. First-Time Experience remaining 13.2% (fold into Module 8)
65. Onboarding tested with non-technical user (needs users)
66. Visual Strategy 4-phase (fold into modules as relevant)
67. Service Simulation (BUILT? #170)
68. P1 Performance Optimization (BUILT? #169)
69. OpenClaw surveillance dashboard improvements
70. Pi:8090/game pixel-art HQ dashboard

**Set Aside total: 70 items**

---

# SUMMARY

| #                   | Module                         | Items   | Priority                    |
| ------------------- | ------------------------------ | ------- | --------------------------- |
| 1                   | Inquiry -> Booked Event        | 23      | **NOW**                     |
| 2                   | Menu & Recipe                  | 16      | **NOW**                     |
| 3                   | Event Prep -> Execute -> Close | 17      | **NOW**                     |
| 4                   | Client Management              | 41      | **NOW** (batch 4A critical) |
| 5                   | Communication Pipeline         | 11      | **NOW**                     |
| 6                   | Money & Finance                | 4       | **NOW**                     |
| **Core total**      |                                | **112** |                             |
| 7                   | Dashboard & Navigation         | 9       | NEXT                        |
| 8                   | Settings & Onboarding          | 9       | NEXT                        |
| 9                   | Events & Scheduling            | 6       | NEXT                        |
| 10                  | Commerce & POS                 | 4       | NEXT                        |
| **Platform total**  |                                | **28**  |                             |
| 11                  | Dinner Circles & Community     | 37      | LATER                       |
| 12                  | Public Presence                | 14      | LATER                       |
| 13                  | Staff & Delegation             | 3       | LATER                       |
| 14                  | Analytics & Intelligence       | 10      | LATER                       |
| **Expansion total** |                                | **64**  |                             |
| 15                  | Data & OpenClaw                | 24      | PARALLEL (Pi)               |
| 16                  | AI & Remy                      | 11      | PARALLEL                    |
| 17                  | Platform Health & Security     | 24      | ONGOING                     |
| 18                  | Tooling & DX                   | 13      | ONGOING                     |
| **Infra total**     |                                | **72**  |                             |
| --                  | Set Aside                      | 70      | PARKED                      |
|                     | **GRAND TOTAL**                | **346** |                             |

> Note: 346 vs 381 because ~35 research docs were reclassified as
> reference material (not build items) and folded into "Related Research"
> subsections or Set Aside. Nothing was deleted.

---

# RECOMMENDED BUILD ORDER

```
Phase 1: "Use your own product"
  Module 1 Batch 1A (inquiry pipeline)
  Module 2 Batch 2A (recipe capture)
  Module 4 Batch 4A (client data integrity - CRITICAL)
  Module 5 Batch 5A (email & messaging)
  Module 6 Batch 6A (money basics)

Phase 2: "Full event cycle"
  Module 1 Batch 1B-1C (booking + quoting)
  Module 2 Batch 2B (menu planning)
  Module 3 Batch 3A-3B (prep + service day)

Phase 3: "Polish the daily driver"
  Module 7 (dashboard & nav)
  Module 8 (onboarding)
  Module 3 Batch 3C (post-event)
  Module 4 Batch 4B-4C (client UX + lifecycle)

Phase 4: "Grow"
  Module 11 (circles)
  Module 12 (public presence)
  Module 9 (events & scheduling)

Phase 5: "Scale"
  Everything in Set Aside, re-evaluated
```
