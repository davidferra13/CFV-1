# ChefFlow Autodocket

Memory palace sweep. Append-only. Each section is timestamped. Do not edit manually.

---

## Sweep: 2026-04-12T10:30:00Z (DEEP SWEEP - Full Memory Palace Cross-Reference)

### Summary

- UNBUILT SPECS: 36 (ready status, zero build rows)
- UNBUILT FEATURES: 14 (established in memory/convos, no code)
- PARTIAL: 7
- OPENCLAW DATA GAPS: 6
- SECURITY OPEN ITEMS: 5
- CONTRADICTIONS: 3
- DEVELOPER ACTION REQUIRED: 9
- **Total actionable items: 80+**
- Top priority: Mission Control passive TV dashboard, Request Trust hardening (P0 security), Android widgets, Consumer-first directory redesign, residential proxy ($25/month blocks nationwide pricing)

---

### SECTION 1: UNBUILT READY SPECS (36 specs written, never executed)

These exist in `docs/specs/` with `Status: ready` and empty build timelines. A planner wrote them. No builder ever claimed them.

---

#### SPEC_ONLY Mission Control Passive TV Dashboard

- **Evidence:** `docs/specs/mission-control-passive-dashboard.md` Status: ready. Developer: "I haven't touched Mission Control in 2-3 months. Never pressed buttons because I was afraid." "I want it to look like Google Calendar being managed autonomously. Everything stagnant on screen."
- **Gap:** Mission Control still has 18 action-button panels. Spec calls for a single-screen passive TV dashboard: V1 progress bar, recent completions, active work queue, live dev activity feed, system health, OpenClaw status. All via SSE, zero user interaction. Developer has a dedicated 4th TV monitor waiting for this.
- **Effort:** MEDIUM (one HTML file rewrite + minor server.mjs additions)
- **Priority:** P1 (developer's stated ADHD need; the "loading bar" and "watching a team work in Slack" feeling they described)

---

#### SPEC_ONLY Android Home Screen Widgets (10 widgets)

- **Evidence:** `docs/specs/android-home-screen-widgets.md` Status: ready. APK done (Phase 3 complete). Developer: "I didn't open ChefFlow once today but stayed on top of everything." 10 widgets designed: Today's Events, Dinner Circle Status, Quick Capture notepad, Prep List, Grocery List, Inquiry Count, Morning Briefing, Active Timer, Financial Summary, Remy Quick Message.
- **Gap:** APK exists at `builds/ChefFlow-0.1.0-arm64.apk`. Widgets require Kotlin Glance API + new widget data endpoints. Zero widget code written.
- **Effort:** LARGE (Kotlin native + new backend endpoints per widget)
- **Priority:** P1 (APK is done; widgets are the next natural step; chef's phone is the command center)

---

#### SPEC_ONLY Consumer-First Discovery + Dinner Planning Expansion

- **Evidence:** `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md` Status: ready. Developer: "If I'm hungry and love food, I should not have to fight the product to figure out what I want to eat." Memory: `project_platform_vision.md` - Airbnb for food, consumer-first.
- **Gap:** Public discovery is a functional database. No craving-led browsing, no group planning, no occasion-first search, no social sharing. 12+ files, 1 migration. Zero code written.
- **Effort:** LARGE
- **Priority:** P1 (the consumer acquisition strategy; turns directory into product)

---

#### SPEC_ONLY Nearby Directory Redesign

- **Evidence:** `docs/specs/nearby-directory-redesign.md` Status: ready. `memory/project_nearby_directory_hidden.md`: "/nearby hidden since 2026-04-06. Data quality not ready." `memory/project_food_directory_vision.md`: "Feels like a creepy scraped database. No pictures. Images are #1 gap."
- **Gap:** 150K+ stores ingested. Directory hidden because it looks like a raw database. Spec redesigns to: consumer-first, Airbnb-style visual, intuitive filtering, images. Currently completely blocked from public.
- **Effort:** LARGE
- **Priority:** P1 (150K records invisible; this is the "food near me" product)

---

#### SPEC_ONLY Request Trust + API Tenant Boundary Hardening (P0 SECURITY)

- **Evidence:** `docs/specs/p0-request-trust-and-api-tenant-boundary-hardening.md` Status: ready. Session digest 2026-04-09: "Not yet built. Broader debt: raw admin DB access, in-memory rate limiting, non-transactional public writes, disabled build gating."
- **Gap:** Identity, tenant scoping, and API route coherence enforced by convention not structure. API routes secretly depend on browser-session helpers. No API-key traffic path when no browser session exists.
- **Effort:** LARGE (9+ files)
- **Priority:** P0 (security; convention-based trust = eventual tenant bleed)

---

#### SPEC_ONLY Runtime Surface Boundary Enforcement (P0 SECURITY)

- **Evidence:** `docs/specs/p0-runtime-surface-boundary-enforcement.md` Status: ready. Session digest 2026-04-09: "Not yet built. Cannot prove which admin-aware behaviors in chef shell are intentional vs. founder convenience leaks."
- **Gap:** No hard enforcement of surface boundaries. Admin-only behavior bleeds into chef shell.
- **Effort:** LARGE (9+ files)
- **Priority:** P0 (security)

---

#### SPEC_ONLY OpenClaw Total Capture (The 2026 American Grocery Price Database)

- **Evidence:** `docs/specs/openclaw-total-capture.md` Status: ready. Developer: "We need EVERY store. Scan one place and go to the next. Don't stop until you have every single thing ever." Current: 49K products, ~3 NE states. Target: 600K+ products, 50 states.
- **Gap:** 4 phases written (retail, wholesale, government data, cross-reference). Zero phases executed.
- **Effort:** LARGE
- **Priority:** P0 (nationwide pricing is the stated launch requirement)

---

#### SPEC_ONLY OpenClaw Goal Governor + KPI Contract

- **Evidence:** `docs/specs/openclaw-goal-governor-and-kpi-contract.md` Status: ready, P0.
- **Gap:** No KPI contract. 94 cron jobs run with no governor telling them whether coverage targets are being hit. No "done when X" criteria.
- **Effort:** MEDIUM
- **Priority:** P0

---

#### SPEC_ONLY OpenClaw PC Local Mirror + Backup Contract

- **Evidence:** `docs/specs/openclaw-pc-local-mirror-and-backup-contract.md` Status: ready, P0.
- **Gap:** Pi is single point of failure for all OpenClaw data. No backup SLA. One hardware failure = 10 months of scraped pricing lost.
- **Effort:** MEDIUM
- **Priority:** P0

---

#### SPEC_ONLY Catalog Store Selection + Image Delivery Contract

- **Evidence:** `docs/specs/catalog-store-selection-and-image-delivery-contract.md` Status: ready, P0.
- **Gap:** No contract for which store's image to show per ingredient, how images route from Pi to ChefFlow, or what happens when images are missing.
- **Effort:** MEDIUM
- **Priority:** P0

---

#### SPEC_ONLY Self-Hosted Deployment Standard

- **Evidence:** `docs/specs/self-hosted-deployment-standard.md` Status: ready, P0.
- **Gap:** No runbook for: port exposure, what restarts on reboot, crash recovery, Cloudflare tunnel health, how to rebuild prod after hardware failure.
- **Effort:** MEDIUM (documentation + scripts)
- **Priority:** P0 (one Windows crash away from needing this)

---

#### SPEC_ONLY TakeAChef + PrivateChefManager Parity Documentation

- **Evidence:** `docs/specs/takeachef-privatechefmanager-parity-doc-program.md` Status: ready, P0. Tier 2 skeleton parsers (PrivateChefManager, HireAChef, CuisineistChef) need real email samples to complete.
- **Gap:** No parity documentation. 9 parsers built, no record of what they cover vs. platform native features.
- **Effort:** MEDIUM
- **Priority:** P0

---

#### SPEC_ONLY P0 Zero Manual Entry Form Control Plane

- **Evidence:** `docs/specs/p0-zero-manual-entry-form-control-plane.md` Status: ready, P0. `memory/project_current_priorities.md` pain point #2: "Some people told me everything but I still have to manually plug it all in."
- **Gap:** No central auto-population system. Inquiries with full data still require chef to re-enter into events, menus, and quotes.
- **Effort:** LARGE
- **Priority:** P0 (stated immediate pain; chef's biggest time waste)

---

#### SPEC_ONLY P0 Public Booking Routing + Source Truth

- **Evidence:** `docs/specs/p0-public-booking-routing-and-source-truth.md` Status: ready, P0.
- **Gap:** No contract defining which booking entry point is canonical, how source attribution flows to inquiry, or what happens from a referral link.
- **Effort:** MEDIUM
- **Priority:** P0 (booking conversion is the top of the revenue funnel)

---

#### SPEC_ONLY Comprehensive Domain Inventory Phase 1

- **Evidence:** `docs/specs/comprehensive-domain-inventory-phase-1.md` Status: ready, P0.
- **Gap:** No complete inventory of subdomains, email domains, DNS records. Required for security audit completion.
- **Effort:** SMALL
- **Priority:** P0

---

#### SPEC_ONLY Chef Shell Clarity + Guided Settings

- **Evidence:** `docs/specs/chef-shell-clarity-and-guided-settings.md` Header says "verified" but entire timeline build rows are empty. This is a contradiction - spec was never built.
- **Gap:** 54 settings pages exist with no guided onboarding path. New chefs face a wall of configuration. Progressive disclosure, guided wizard, settings grouped by workflow stage - none of this exists.
- **Effort:** LARGE
- **Priority:** P1 (onboarding is a V1 exit criteria item)

---

#### SPEC_ONLY P1 Getting Started Surface Consolidation

- **Evidence:** `docs/specs/p1-chef-getting-started-surface-consolidation.md` Status: ready.
- **Gap:** No single "getting started" surface. New chef has no guided path from signup to first event.
- **Effort:** MEDIUM
- **Priority:** P1

---

#### SPEC_ONLY P1 Demo Continuity + Portal Proof

- **Evidence:** `docs/specs/p1-demo-continuity-and-portal-proof.md` Status: ready. Blueprint: "Demo/sample data shown by default for new users - real and demo data not visually distinguished."
- **Gap:** No demo-mode experience. Demo data not visually distinguished from real data. Hallucination rule violation.
- **Effort:** MEDIUM
- **Priority:** P1 (V1 launch readiness + Zero Hallucination compliance)

---

#### SPEC_ONLY P1 Buyer Education + Pre-Decision Guidance

- **Evidence:** `docs/specs/p1-buyer-education-and-pre-decision-guidance.md` Status: ready.
- **Gap:** No pre-decision guidance for potential clients. A first-time private chef buyer doesn't know what to expect, ask, or budget.
- **Effort:** MEDIUM
- **Priority:** P1 (conversion; most leads die because clients don't understand the product)

---

#### SPEC_ONLY P1 Operational Reassurance + What Happens Next

- **Evidence:** `docs/specs/p1-operational-reassurance-and-what-happens-next.md` Status: ready. `memory/project_current_priorities.md` pain: "Inquiry auto-acknowledgment - 72-hour silence after submit."
- **Gap:** After inquiry submit, no explicit "what happens next." No response time promise, no timeline to dinner explanation.
- **Effort:** SMALL
- **Priority:** P1 (conversion; silence kills deals)

---

#### SPEC_ONLY P1 Navigation + CTA Continuity

- **Evidence:** `docs/specs/p1-navigation-and-cta-continuity.md` Status: ready.
- **Gap:** Same action (book a chef) has different wording on different public pages. No unified CTA strategy.
- **Effort:** SMALL
- **Priority:** P1

---

#### SPEC_ONLY P1 Search Intent Landing Architecture

- **Evidence:** `docs/specs/p1-search-intent-landing-architecture.md` Status: ready.
- **Gap:** No SEO landing pages for intents like "hire a private chef in Boston." Zero organic search acquisition.
- **Effort:** MEDIUM
- **Priority:** P1 (user acquisition is a V1 exit criteria; currently zero channels)

---

#### SPEC_ONLY P1 Source Provenance + Conversion Analytics

- **Evidence:** `docs/specs/p1-source-provenance-and-conversion-analytics-correction.md` Status: ready.
- **Gap:** Analytics cannot answer "where did this client come from?" Source attribution from embed, booking, organic, referral not tracked correctly to inquiry.
- **Effort:** MEDIUM
- **Priority:** P1 (can't optimize acquisition without this)

---

#### SPEC_ONLY Directory Post-Claim Enhancement Flow

- **Evidence:** `docs/specs/directory-post-claim-enhancement-flow.md` Status: ready.
- **Gap:** Post-claim experience is empty. No guided flow: add photos, verify hours, add menu, connect ChefFlow account.
- **Effort:** MEDIUM
- **Priority:** P1 (directory-to-user conversion path)

---

#### SPEC_ONLY P1 Analytics + Event Scheduling + Recipe Route Truth (3 specs)

- **Evidence:** `docs/specs/p1-analytics-surface-ownership-and-route-truth.md`, `p1-event-scheduling-surface-ownership-and-route-truth.md`, `p1-recipe-root-canonicalization-and-route-truth.md` - all Status: ready.
- **Gap:** Duplicate routes, ambiguous canonical surfaces, inconsistent deep links across analytics, events, and recipes.
- **Effort:** MEDIUM each
- **Priority:** P1

---

#### SPEC_ONLY OpenClaw Capture Countdown + Pixel Schedule

- **Evidence:** `docs/specs/openclaw-capture-countdown-and-pixel-schedule.md` Status: ready.
- **Gap:** Chefs in non-NE states see empty price catalogs with no explanation of when data is coming. No regional coverage timeline visible to users.
- **Effort:** SMALL
- **Priority:** P1

---

#### SPEC_ONLY OpenClaw Ideal Runtime + National Intelligence

- **Evidence:** `docs/specs/openclaw-ideal-runtime-and-national-intelligence.md` Status: ready.
- **Gap:** 94 cron jobs with no formal runtime policy. No CPU allocation targets, data freshness targets, or coverage map.
- **Effort:** MEDIUM
- **Priority:** P1

---

#### SPEC_ONLY P1 Build + Release Contract Truth

- **Evidence:** `docs/specs/p1-build-and-release-contract-truth.md` Status: ready. Build-state.md: "next build can exit 0 on webpack errors - check BUILD_ID exists."
- **Gap:** No automated regression gate before code hits main. No CI/CD. Manual build only.
- **Effort:** MEDIUM
- **Priority:** P1

---

#### SPEC_ONLY Opus Distillation Tasks 3-5

- **Evidence:** `memory/project_opus_distillation_strategy.md`: "Tasks 3-5 pending: re-categorize 69,149 canonical ingredients, triage 15,540 unacknowledged anomalies, generate ingredient variant mappings (synonym table)."
- **Gap:** Tasks 1-2 done. 69K ingredients have stale categories. 15K price anomalies unacknowledged. No synonym table (scallion/green onion/spring onion all resolve differently).
- **Effort:** MEDIUM (SSH sessions with Opus)
- **Priority:** P1 (ingredient matching accuracy = costing accuracy)

---

### SECTION 2: UNBUILT FEATURES FROM MEMORY + ACTION INVENTORY

These were established in conversations, never specced or built.

---

#### UNBUILT Inquiry Auto-Classification During Service (Mid-Service Mode)

- **Evidence:** `memory/action-inventory.md` Stage 12: "Inbound inquiries during service: system classifies autonomously, queues for post-service, does NOT interrupt chef."
- **Gap:** No "chef is mid-service" mode. Inquiries arrive in real time regardless. No queue suppression during an active service window.
- **Effort:** MEDIUM (service mode flag on events + queue suppression logic)
- **Priority:** P1 (chef cannot look at phone mid-service; stated workflow reality)

---

#### UNBUILT Post-Event Auto-Prompt (Stage 14)

- **Evidence:** `memory/action-inventory.md` Stage 14: "Prompt: 'How was tonight's service? Quick capture while it's fresh.'"
- **Gap:** When event transitions to "completed," no automatic prompt. AAR form exists but is never surfaced at the right moment.
- **Effort:** SMALL (SSE trigger on event completion + Remy alert)
- **Priority:** P1 (data quality; post-event data feeds loyalty and AAR learning)

---

#### UNBUILT System Learning from AAR (Auto-Promote to Non-Negotiables)

- **Evidence:** `memory/action-inventory.md` Stage 18: "System learning from AAR: forgotten items auto-promote to Non-Negotiables if repeated."
- **Gap:** AAR forms fillable but system never reads them to learn. No "forgot X in 3+ AARs" detection. 16-item terminal checklist before event marked TERMINAL is not enforced.
- **Effort:** MEDIUM (AAR analysis job + terminal checklist gate)
- **Priority:** P1 (the "get smarter over time" flywheel)

---

#### UNBUILT Client Milestone Outreach (Birthday/Anniversary)

- **Evidence:** `memory/action-inventory.md` Long Tail: "Client milestone outreach (birthdays, anniversaries) - drafted, chef approves." CRM stores birthdays. Nothing reads them proactively.
- **Effort:** MEDIUM (cron + Remy draft + chef approval queue)
- **Priority:** P1 (relationship retention; long-tail revenue)

---

#### UNBUILT Dormant Client Re-Engagement

- **Evidence:** `memory/action-inventory.md` Long Tail: "Dormant client re-engagement (configurable threshold)." Client lifecycle field exists, never read proactively.
- **Effort:** SMALL (query + Remy draft + threshold config)
- **Priority:** P1 (most chef revenue = repeat clients)

---

#### UNBUILT Grocery List Store Route Optimization

- **Evidence:** `memory/action-inventory.md` Stage 6: "Store grouping + optimized route with addresses."
- **Gap:** Grocery lists group by category, not by store. No route planning. Chef mentally plans which stores to hit in what order.
- **Effort:** MEDIUM (store preference mapping + route suggestion)
- **Priority:** P1 (direct daily workflow)

---

#### UNBUILT Prep List Split (PREP NOW vs PREP AFTER SHOPPING)

- **Evidence:** `memory/action-inventory.md` Stage 7: "Split: PREP NOW (on-hand) vs PREP AFTER SHOPPING (grocery-dependent)."
- **Gap:** Prep lists exist but don't split by "can prep now" vs "must wait for grocery run."
- **Effort:** MEDIUM (stock-check against inventory + dependency graph)
- **Priority:** P1 (wrong prep order = re-prep; wasted time)

---

#### UNBUILT Budget Guardrail on Grocery Lists

- **Evidence:** `memory/action-inventory.md` Stage 6: "Budget guardrail: projected grocery spend vs event margin."
- **Gap:** Grocery lists generated without warning if spend exceeds food cost budget. Chef can shop $800 for a $600 event.
- **Effort:** SMALL (compare grocery list estimated cost vs event food cost budget)
- **Priority:** P1 (financial accuracy; food cost % is a core promise)

---

#### UNBUILT Browser Extension (ChefFlow Sidebar for Third-Party Platforms)

- **Evidence:** `memory/project_inquiry_consolidation_vision.md` Layer 2: "Chrome extension reads DOM when chef visits platform pages. Captures full conversation, dietary details, menu proposals."
- **Gap:** Layer 1 (email parsers) and Layer 3 (compose + deep-link) have code. Layer 2 (browser extension) completely unbuilt. No extension project, no manifest.json.
- **Effort:** LARGE (new Chrome extension project)
- **Priority:** P1 (platforms with gated UIs cannot be reached any other way)

---

#### UNBUILT Cookie Consent Banner

- **Evidence:** Session digest 2026-04-11: "Cookie consent banner: still missing (lower priority than Article 9 gap we fixed)."
- **Effort:** SMALL
- **Priority:** P1 (GDPR/CCPA compliance)

---

#### UNBUILT Data Deletion Self-Serve Form

- **Evidence:** Session digest 2026-04-11: "Privacy policy mentions email to privacy@cheflowhq.com but no self-serve form exists."
- **Effort:** SMALL
- **Priority:** P1 (GDPR right-to-erasure)

---

### SECTION 3: PARTIAL IMPLEMENTATIONS

---

#### PARTIAL Cost-as-You-Type Menu Building

- **Evidence:** `memory/project_nav_overhaul_survey.md` Q8: "Menu Builder #1 - cost as you type." Currently requires manual recalculation click.
- **Gap:** Price resolution chain exists. Not called on keystroke.
- **Effort:** MEDIUM (debounced price resolution on ingredient add/remove)
- **Priority:** P1

---

#### PARTIAL Menu Versioning + Version Log

- **Evidence:** `memory/project_nav_overhaul_survey.md`: "Versioning - save draft variations." `memory/action-inventory.md` Stage 3: "Menu revision version log: what changed, when, why." No `menu_versions` table in schema.
- **Gap:** Menus are editable but have no version history or revision log.
- **Effort:** MEDIUM
- **Priority:** P1

---

#### PARTIAL Trust Provenance at Recipe + Quote Level

- **Evidence:** Session digest 2026-04-06: "Recipe detail page doesn't surface confidence per-ingredient. Event/quote level: no warning when quote generated from low-confidence pricing." Menu-level badge was built; deeper levels were not.
- **Gap:** A quote can be sent based on 40% low-confidence prices with zero warning.
- **Effort:** MEDIUM
- **Priority:** P1 (Zero Hallucination rule; showing a price as real when it's a guess)

---

#### PARTIAL Ingredient Overlap Detection Across Concurrent Events

- **Evidence:** `docs/specs/spring-surge-command-center.md` Pain 5: "Batch opportunity detector - pure formula set intersection on recipe_ingredients." Spec says "verified" but no `findIngredientOverlap()` or `batchOpportunity` function found in codebase.
- **Gap:** This change from the spring surge spec appears to have been skipped despite "verified" status.
- **Effort:** SMALL
- **Priority:** P1

---

#### PARTIAL Inquiry Readiness Score

- **Evidence:** `docs/specs/spring-surge-command-center.md` Change 1: "Readiness Score on inquiries page." Spec "verified" but no `computeReadinessScore` function found in codebase. May have been skipped.
- **Effort:** SMALL
- **Priority:** P1

---

#### PARTIAL SSE Listener Cleanup on Disconnect

- **Evidence:** Session digest 2026-04-07: "SSE listener cleanup on disconnect in `lib/realtime/sse-server.ts` - memory leak risk at scale."
- **Effort:** SMALL
- **Priority:** P1

---

### SECTION 4: OPENCLAW DATA GAPS

| Gap                                                                          | Action                                                              | Priority |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------- |
| FL + TX + ME OSM stores underrepresented                                     | Re-run `--state FL --state TX --state ME`                           | P1       |
| Farmers markets: 0 records (USDA cert expired)                               | Find alt source: USDA Farmers Market Directory public dataset       | P1       |
| USDA Foundation Foods: only 2/6 pages (rate-limited)                         | Register free API key at api.data.gov, set USDA_FDC_API_KEY, re-run | P1       |
| USDA SNAP Retailer list (250K+ stores) not ingested                          | Check API availability, run ingest script                           | P1       |
| Wholesale scrapers not built (Restaurant Depot, Sysco, US Foods)             | New scrapers per source                                             | P0       |
| store_products Pi-to-PostgreSQL sync has TODO (prices on Pi never reach app) | Implement TODO in `scripts/openclaw-pull/pull.mjs`                  | P1       |

---

### SECTION 5: SECURITY OPEN ITEMS

| Item                                                          | Since      | Priority |
| ------------------------------------------------------------- | ---------- | -------- |
| GitHub repo still public (source, schema, 294 routes visible) | March 2026 | P1       |
| DMARC DNS record missing (email spoofing risk)                | March 2026 | P1       |
| 17 npm vulnerabilities including abandoned `xlsx` package     | March 2026 | P1       |
| next-auth@5.0.0-beta.30 in production                         | March 2026 | P1       |
| No chef business verification on signup                       | March 2026 | P1       |

---

### SECTION 6: CONTRADICTIONS

1. **Chef Shell Clarity spec:** Header says "verified" but entire build timeline is empty. Was never built.
2. **Action inventory 46% automation claim:** Aspirational target, not a measurement. True automation rate probably 20-25% based on what's actually built.
3. **Platform vision memory:** Says "operator sign-up is secondary (footer links)." Current homepage has chef signup as primary CTA above the fold. Memory is stale.

---

### SECTION 7: DEVELOPER ACTION REQUIRED

| Item                                                             | Unblocks                                      | Priority |
| ---------------------------------------------------------------- | --------------------------------------------- | -------- |
| Register USDA FDC API key at api.data.gov (free)                 | USDA ingest (4/6 pages blocked by rate limit) | P1       |
| Purchase $25/month residential proxy                             | Instacart nationwide; price-intel Phase 3     | P0       |
| Dump 10 years artifacts to `F:/archive-dump/`                    | Archive Digester (#1 OpenClaw priority)       | P0       |
| Launch Wave-1 operator survey                                    | Validation phase; V1 launch gate              | P0       |
| Make GitHub repo private                                         | Information security                          | P1       |
| Add DMARC DNS TXT record                                         | Email security                                | P1       |
| Restart prod server (VAPID keys loaded April 6, never restarted) | PWA push notifications                        | P1       |
| Physically sideload APK on Android device                        | Prove Android app works on real hardware      | P1       |
| Purchase Mac mini                                                | iOS Tauri Phase 4                             | P1       |

---

### Cross-Reference Synthesis (What the Memory Palace Is Really Saying)

Five consistent patterns across 6 months of conversation:

1. **The Automation Gap:** 467 identified chef actions, 46% claimed automated. Stages 6-14 automation (mid-service mode, post-event capture, AAR learning, milestone outreach, grocery routing, prep sequencing) are all unbuilt. The app is an excellent form-builder but a weak autonomous agent. The product promise is "handles the business so the chef can handle the art." The business handling is ~25% complete.

2. **The Spec Backlog:** 36 specs written and ready. Zero claimed. The planning machine works. The build machine stalled (anti-clutter rule + validation phase). But validation never started. The anti-clutter rule is enforced against building; it's not enforced against the fact that no users have actually validated anything.

3. **The Data Gap:** OpenClaw has 150K stores, 49K products, 442MB SQLite. ChefFlow shows maybe 5% of that to users. The sync pipeline gap, store_products TODO, FL/TX/ME re-runs, wholesale scrapers, and USDA key are all cheap/free/quick actions that would multiply visible data.

4. **The Developer Visibility Gap:** Mission Control unused for 3 months. Developer cannot see project state. Everything they described wanting (TV feed, progress bar, passive Google Drive feel, Tamagotchi growth) is exactly what `mission-control-passive-dashboard.md` specifies. Written 8 days ago. Never built.

5. **The Mobile Gap:** APK exists. Widgets not built. APK never tested on real hardware. iOS blocked on hardware. Mobile strategy is 75% done and completely stuck.

---

## Sweep: 2026-04-12T08:00:00Z (Initial Sweep - Memory Backlog Items)

### Initial Summary

- UNBUILT: 12 | PARTIAL: 6 | TEST_GAP: 2 | SPEC_ONLY: 3 | CONTRADICTION: 3 | STALE: 4
- Total actionable items: 30
- Top priority: DocuSign Send UI, Recipe Unit Conversion, Wave-1 Survey Launch

---

### Initial Findings

---

#### UNBUILT DocuSign "Send for Signature" UI

- **Evidence:** `memory/project_mempalace_backlog.md` - "DocuSign 'Send for Signature' has no UI entry point - `lib/integrations/docusign/docusign-client.ts` has `sendContractForSignature()` fully built (OAuth + webhook wired), but no button/page calls it. Only OAuth connect/disconnect is exposed in settings/integrations." Confirmed by grep: zero components reference `sendContractForSignature`.
- **Gap:** A fully functional DocuSign client with OAuth, webhooks, and signature sending exists in code but is completely unreachable from the UI. No button, no contract detail page CTA, no modal. Chefs cannot send contracts for e-signature.
- **Effort:** SMALL (add button to contract detail page that calls the existing server action)
- **Priority:** P1 (contract workflow is core to the booking pipeline)

---

#### UNBUILT Google Calendar Two-Way Sync

- **Evidence:** `memory/project_mempalace_backlog.md` - "Calendar integration is stubs only (`components/calendar/calendly-integration-stub.tsx`) - no actual Google Calendar sync." Confirmed by grep: no Google Calendar OAuth in components. `project_current_priorities.md` item #7: "Two-way GCal sync - Currently one-directional."
- **Gap:** ChefFlow has an internal calendar but no real Google Calendar integration. Calendly stub file exists. No OAuth flow, no sync engine, no two-way write-back. Events created in ChefFlow do not appear in Google Calendar and vice versa.
- **Effort:** LARGE (OAuth flow + sync engine + conflict resolution)
- **Priority:** P1 (chef listed this explicitly as a pain point; Q3 survey: "smart calendar that acts on chef's behalf")

---

#### UNBUILT SMS Channel for Client Communication

- **Evidence:** `memory/project_mempalace_backlog.md` - "SMS channel for client communication (alongside email) - needs Twilio/SMS provider, complex." Session digest 2026-04-12-mempalace-alerts-billing-guidance.md confirms: "Genuine Remaining Gaps: SMS channel - needs Twilio/SMS provider integration, not started."
- **Gap:** All client communication goes through email or internal messages. No SMS delivery. Chefs communicate with clients via text in real life but ChefFlow has no path for it. Zero code exists for Twilio or any SMS provider.
- **Effort:** LARGE (Twilio integration, SMS delivery, opt-in consent, message log)
- **Priority:** P1 (real chefs text clients constantly; this is how the business actually runs)

---

#### UNBUILT Location Roster + Rotation Calendar

- **Evidence:** `memory/project_mempalace_backlog.md` - "Location roster + rotation calendar - spec NOT found in docs/specs/, no matching app routes found. May be unbuilt." Confirmed: no spec file, no routes.
- **Gap:** No feature for tracking where staff are deployed across multiple event locations, or rotating assignments. For chefs running multiple concurrent events with staff, there is no roster view.
- **Effort:** MEDIUM (new spec needed first)
- **Priority:** P2 (relevant for multi-staff operations; V1 is mostly solo chef)

---

#### UNBUILT Quick-Service Menu Board Display

- **Evidence:** `memory/project_mempalace_backlog.md` - "Quick-service menu board display - app/(chef)/stations/ exists (daily-ops, ops-log, orders, waste, [id]) but NO dedicated menu board display route." Confirmed by glob: no menu-board route.
- **Gap:** Station ops exist but there is no public-facing or large-display menu board view. Restaurant operators and pop-up chefs need a full-screen, TV-ready menu display.
- **Effort:** MEDIUM (new page, large-text display layout, real-time updates)
- **Priority:** P2 (needed for restaurant/pop-up operators, not solo private chef V1 target)

---

#### UNBUILT Google Contacts Import

- **Evidence:** `docs/specs/p1-google-contacts-import-via-google-people-api.md` - Timeline shows "Created: 2026-04-01" and "Status: ready" but all build rows (Claimed, Spike, Build, TSC, Playwright) are empty. Confirmed: `app/(chef)/contacts/import*` returns no files.
- **Gap:** Spec is fully written and ready but has never been built. Chefs cannot import their existing Google Contacts into the CRM. Every new ChefFlow user must manually enter clients they already have in their phone/Google.
- **Effort:** MEDIUM (Google People API OAuth, contact mapping, dedup logic)
- **Priority:** P1 (first-time onboarding blocker; chefs have years of client data in Google Contacts already)

---

#### UNBUILT Wave-1 Operator Survey Launch

- **Evidence:** `docs/product-blueprint.md` - V1 Exit Criteria: "Wave-1 operator survey launched and analyzed - Should-Have (Ship Without, Fix Fast)." Blueprint queue: "P2 - Wave-1 operator survey launch - Surveys designed." `memory/project_current_priorities.md` - "Validation phase is active (began 2026-04-01). No new features without validated user feedback."
- **Gap:** Survey is designed and the in-app survey tooling is built, but zero surveys have been launched. Validation phase has been "active" since April 1 with no actual validation happening. V1 launch criteria requires at least 1 real chef using it for 2+ weeks AND survey data. Both are zero.
- **Effort:** SMALL (launch the survey that already exists; requires developer to distribute it)
- **Priority:** P0 (launch gate item; nothing else can ship without this)

---

#### UNBUILT OpenClaw Archive Digester

- **Evidence:** `memory/project_openclaw_archive_digester.md` - "Status: Waiting on raw artifact collection (developer action required)." `memory/project_current_priorities.md` - "#1 OpenClaw priority." `docs/specs/openclaw-archive-digester.md` exists.
- **Gap:** The spec is written but the pipeline code (file classifier, entity extractor, cross-referencer) has not been built. Also blocked on developer dumping 10 years of business artifacts into `F:/archive-dump/`. No raw files collected yet. ChefFlow with real historical data is a product. Without it it is a demo.
- **Effort:** LARGE (pipeline build after files collected)
- **Priority:** P0 (declared #1 OpenClaw priority; "nationwide pricing is a launch requirement")

---

#### UNBUILT UX Energy: Live Heartbeat + Hover Intelligence + Smart Suggestions

- **Evidence:** `memory/project_ux_energy_priorities.md` - "Developer identified ChefFlow is 'functional but emotionally flat.' 10 UX expansions. Top 3: heartbeat, action bar, smart suggestions." Checked: existing heartbeat files (`session-heartbeat.tsx`, `kiosk/heartbeat-provider.tsx`) are for kiosk devices/sessions, not a user-facing "last updated X seconds ago" indicator. No hover intelligence or smart suggestions panel found.
- **Gap:** The three highest-priority UX energy items from developer's own ranking are unbuilt. The app feels static and "dead." The existing heartbeat files are internal session tools, not the user-visible live activity pulse. Smart Suggestions ("You're missing pricing on 12 items") and Hover Intelligence (hover any item to see quick stats) do not exist anywhere.
- **Effort:** MEDIUM (each item is 2-4 files; can be done independently)
- **Priority:** P1 (developer's own ranking; "this is cool" vs "this works" gap)

---

#### UNBUILT v2 API Document Generation

- **Evidence:** `memory/project_mempalace_backlog.md` - "`app/api/v2/documents/generate/route.ts` - For legacy doc types (invoice, quote, receipt, contract, menu, prep_list, grocery_list, timeline), returns `supported: false` with 'use the UI' message."
- **Gap:** The v2 API returns a non-error "supported: false" for all major document types. Any automation or integration that tries to trigger document generation programmatically gets a soft refusal. The v1 UI path works but the API path is dead.
- **Effort:** MEDIUM (wire existing generators to the v2 API route)
- **Priority:** P2 (blocks automation; low user-facing impact for solo chefs)

---

#### UNBUILT iOS Tauri App (Phase 4)

- **Evidence:** `docs/product-blueprint.md` - "Mobile app + PWA activation - Phases 1-3 complete (Apr 6): PWA live, Tauri desktop installer built, Android APK signed. Phase 4 (iOS) blocked on macOS hardware."
- **Gap:** iOS Tauri build requires macOS hardware. Developer plans Mac mini purchase. No progress possible until hardware arrives.
- **Effort:** MEDIUM (once hardware exists; Tauri config already exists for other platforms)
- **Priority:** P1 (iOS is 60%+ of mobile market; blocked on hardware not code)

---

#### UNBUILT Multi-Chef Client View

- **Evidence:** `memory/project_mempalace_backlog.md` - "Multi-chef client view (clients who use multiple chefs need unified view) - genuinely unbuilt, complex."
- **Gap:** When a client uses multiple chefs on the platform, there is no unified view showing all their activity across chefs. Each chef sees only their own client data. No cross-chef aggregation exists.
- **Effort:** LARGE (requires cross-tenant data access, privacy gating, new UI surface)
- **Priority:** P2 (V1 is single-chef; this is V1.1+ territory)

---

#### PARTIAL Recipe Unit Conversion in Costing Engine

- **Evidence:** `memory/project_mempalace_backlog.md` - "Recipe unit mismatch - `compute_recipe_cost_cents()` SQL function does naive `qty * cost_per_unit` with no unit conversion. 'cups' vs 'grams' gives silently wrong costs with no warning." Unit conversion files exist (`lib/grocery/unit-conversion.ts`, `lib/units/conversion-engine.ts`) but are not wired into the SQL costing function.
- **Gap:** The costing engine exists and runs but produces silently wrong numbers whenever recipe units don't match catalog units. A recipe calling for "2 cups of flour" priced per gram returns a nonsense cost with no warning. The unit conversion engine exists but is not called from `compute_recipe_cost_cents()`.
- **Effort:** MEDIUM (wire existing `conversion-engine.ts` into the SQL function or server-side costing action)
- **Priority:** P1 (silent financial inaccuracy; core product promise is accurate costing)

---

#### PARTIAL Dark Mode Coverage

- **Evidence:** `memory/project_mempalace_backlog.md` - "Dark mode gaps remain on several pages (~97% of components missing `dark:` class coverage)." Session digest 2026-04-12-dead-zone-gating mentions dark mode as "Remaining Known Gaps."
- **Gap:** The app has dark mode infrastructure but only ~3% of components have `dark:` class coverage. Most pages look broken in dark mode. This is a large ongoing effort affecting every page.
- **Effort:** LARGE (97% of components; systematic but tedious)
- **Priority:** P2 (UX polish; not blocking function)

---

#### PARTIAL Social Media Planner - Compliance Hardening

- **Evidence:** `memory/project_openclaw_social_media_orchestration.md` - "Repo Gaps To Remember: TikTok adapter older than current TikTok docs, preflight is generic not policy-aware, UI language stronger than proven platform reality in some places." `docs/specs/openclaw-social-media-orchestration.md` exists.
- **Gap:** The social planner has annual planner, queue settings, OAuth connections, scheduled publishing, and encrypted token storage. But it lacks: per-platform policy matrix, explicit delivery modes, owner approval checkpoint, TikTok direct-vs-draft gating, and partner handoff fallback. Some UI claims capabilities that the platform reality doesn't support.
- **Effort:** MEDIUM (hardening pass on existing system)
- **Priority:** P1 (publishing to wrong mode could violate platform ToS; "UI language stronger than proven reality" is a hallucination violation)

---

#### PARTIAL Invoice Number Race Condition

- **Evidence:** `memory/project_mempalace_backlog.md` - "`lib/events/invoice-actions.ts:105` - `generateInvoiceNumber()` uses count-based generation with no unique constraint. Two simultaneous webhook payments for different events can both count '0 existing' and both get `INV-2026-001`."
- **Gap:** Invoice numbers are not unique under concurrent load. Fix requires DB migration (unique constraint) + retry logic. Very low probability but non-zero.
- **Effort:** SMALL (migration + retry on 23505 violation)
- **Priority:** P1 (requires explicit approval before migration runs; financial data integrity)

---

#### PARTIAL store_products Pi-to-PostgreSQL Sync

- **Evidence:** `memory/project_mempalace_backlog.md` - "`scripts/openclaw-pull/pull.mjs` downloads Pi SQLite but skips store_products rows with a TODO. Prices exist on Pi but never reach PostgreSQL catalog."
- **Gap:** The Pi has store_products price data that never syncs to the app database. The pull script has a commented-out TODO for this. This means the price catalog is missing data that physically exists on the Pi.
- **Effort:** SMALL (uncomment/implement the TODO in pull.mjs, test sync)
- **Priority:** P1 (price data sitting unused on Pi directly affects catalog accuracy)

---

#### PARTIAL 5 Zero-Product Store Chains

- **Evidence:** `memory/project_mempalace_backlog.md` - "Walmart, Whole Foods, Shaw's, Target, Trader Joe's have 414 stores in DB with zero product catalog data. Pi scrapers not populating or sync not picking up."
- **Gap:** 414 store records exist in the DB but have zero products. These are the most important mainstream grocery chains. Could add 40-75K products.
- **Effort:** MEDIUM (Pi-side scraper diagnosis; may need new scrapers or sync fix)
- **Priority:** P1 (nationwide pricing is a launch requirement; missing Walmart/Whole Foods is a critical gap)

---

#### TEST_GAP Comprehensive QA Validation Suite

- **Evidence:** `memory/project_qa_launch_gate.md` - "Test Execution Order (by ROI): 1. Experiential (9 tests), 2. Coverage (7 files), 3. Interactions (49 files), 4. Journeys (17 files). Test infrastructure already existed." Last Playwright run was the 6-pillar walkthrough (28/28 April 11). No full Interactions (49 files) or Journeys (17 files) suite run documented in recent session digests.
- **Gap:** The 49-file Interactions suite and 17-file Journeys suite have not been run since significant changes were made (nav reduction, alerts system, client portal parity, dead-zone gating). These tests cover every form, button, mutation, and end-to-end workflow.
- **Effort:** SMALL (run `npm run test:interactions` and `npm run test:journeys`)
- **Priority:** P1 (launch gate; regression risk from recent changes)

---

#### TEST_GAP P0 Verification Script

- **Evidence:** `tests/p0-verify.spec.ts` exists in repo root (git status shows as untracked `?? tests/p0-verify.spec.ts`). It was never committed.
- **Gap:** A P0 verification spec exists as an untracked file. It has never been run in CI or committed to the repo. Unknown what it tests or whether it passes.
- **Effort:** SMALL (commit or delete; if it passes, commit; if broken, fix)
- **Priority:** P1 (untracked test file sitting in root is a signal it was created but abandoned)

---

#### SPEC_ONLY Action Bar Contextual Badges

- **Evidence:** `memory/project_nav_overhaul_survey.md` - "Follow-up Specs Needed #1: Action Bar Contextual Badges (Q5-Q7, Q14)." Session digest 2026-04-12-nav-reduction.md confirms the nav reduction shipped but contextual badges were not part of it.
- **Gap:** The nav reduction shipped 5 core groups. The #1 follow-up spec - contextual badges showing unread counts, pending items, and urgency on nav items - was never specced or built. The survey explicitly says "badges solve awareness" and rates them the highest-priority post-nav enhancement.
- **Effort:** MEDIUM (SSE-driven badge counts, server actions for unread counts per nav item)
- **Priority:** P1 (developer's own survey says this is the highest-priority enhancement after nav ships)

---

#### SPEC_ONLY Dashboard Reassurance Engine

- **Evidence:** `memory/project_nav_overhaul_survey.md` - "Follow-up Specs Needed #2: Dashboard Reassurance Engine (Q5-Q7, Q21, Q24)." Survey: "Dashboard = reassurance engine. Everything is handled. Here's where you stand. Go be creative."
- **Gap:** The dashboard exists but is a collection of widgets. The survey vision is a single emotional state: "everything is handled." No spec exists for the Reassurance Engine concept. No "communication status is everything" row showing who is waiting on the chef vs. waiting on the client across all active threads.
- **Effort:** MEDIUM (new spec needed; architecture exists in data)
- **Priority:** P1 (core product vision from developer's own survey; the feeling they open the app for)

---

#### SPEC_ONLY Menu Engine v2

- **Evidence:** `memory/project_nav_overhaul_survey.md` - "Follow-up Specs Needed #3: Menu Engine v2 (Q8, Q10, Q20)." Survey: "Menu Builder is #1. Cost as you type, templates, versioning, ingredient overlap detection."
- **Gap:** The current Menu Builder is built and functional but lacks the v2 features: cost-as-you-type against live pricing, versioning (save draft variations), and ingredient overlap detection across concurrent menus. No spec exists for these enhancements.
- **Effort:** LARGE (cost-as-you-type requires real-time price resolution; versioning is new DB structure)
- **Priority:** P1 ("#1 creative tool" per developer's survey; hours spent manually costing menus is the stated biggest time drain)

---

### Initial Contradictions

1. **Mobile PWA status:** `memory/project_cloud_mobile_migration.md` says "PWA already built but disabled" (written April 6). Product blueprint says "Phase 1 (PWA): live at app.cheflowhq.com" also updated April 6. Memory description is stale - PWA is live, not disabled. Memory file `project_cloud_mobile_migration.md` needs its description updated.

2. **Validation phase vs. building:** `memory/project_current_priorities.md` says "Validation phase active (began 2026-04-01). No new features without validated user feedback." But 30+ features have been built after April 1 with zero actual user validation collected. The rule is declared but not enforced. No survey has launched, no user feedback exists. The anti-clutter rule is written but the behavior since April 1 is pure build mode.

3. **Blueprint says "100% complete" for PLAN and COOK pillars** but `memory/project_ux_energy_priorities.md` says the app is "functional but emotionally flat" with 10 specific UX gaps. The completion percentage is measuring feature existence, not quality. 100% complete + "emotionally flat" cannot both be true as a UX assessment.

---

### Initial Stale Entries

1. **`memory/project_cloud_mobile_migration.md` description:** Says "PWA already built but disabled." PWA is now live at app.cheflowhq.com (Phase 1 complete April 6). Description is misleading - should say "Phase 4 (iOS) blocked on macOS hardware."

2. **`memory/project_ux_energy_priorities.md` - "Action Bar" listed as #2 UX energy item unbuilt:** The action bar shipped as part of the nav reduction (2026-04-12). It is now the 5-core-group sidebar architecture. The "action bar" concept in this memory refers to the floating persistent bar concept from the survey, not the nav reduction. Partially stale - the nav reduction happened but the floating command bar with Refresh/Run/Add did not.

3. **Security audit memory - "Ollama should be bound to localhost only":** Listed as a remaining manual action from March 2026. No session digest confirms this was done. Still open infrastructure item.

4. **Security audit memory - "GitHub repo: make private":** Listed from March 2026. Unconfirmed done. Still showing as open. The repo is `davidferra13/CFV-1` - if still public, this is an open security item.

---

### Initial Developer Action Required (not code problems)

These cannot be fixed by an agent. They require David to act.

| Item                                                              | Why                                              | Priority |
| ----------------------------------------------------------------- | ------------------------------------------------ | -------- |
| Dump 10 years of business artifacts to `F:/archive-dump/`         | Unblocks Archive Digester (#1 OpenClaw priority) | P0       |
| Launch the Wave-1 operator survey                                 | Unblocks validation phase; launch gate item      | P0       |
| Make GitHub repo private (`github.com/davidferra13/CFV-1`)        | Security audit open item since March 2026        | P1       |
| Add DMARC DNS record for cheflowhq.com                            | Security audit open item since March 2026        | P1       |
| Verify Ollama bound to localhost (`netstat -an \| findstr 11434`) | Security audit open item since March 2026        | P1       |
| Purchase Mac mini for iOS Tauri build                             | Unblocks Phase 4 (iOS app)                       | P1       |

---
