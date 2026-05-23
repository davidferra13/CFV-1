# Codex Zero-Out Manifest: 110 Prompts by Wave

> Generated 2026-05-23. ~103 buildable items (iOS PWA/Tauri and V1 EXIT CRITERIA excluded).
> Message truncated at Prompt 95 - Waves 9-10 partial.

## Status Legend

- `QUEUED` - Ready to dispatch
- `IN-FLIGHT` - Currently building
- `DONE` - Built and verified
- `BLOCKED` - Dependency not met
- `SKIPPED` - Not applicable

---

## WAVE 0: UNBLOCK + VERIFY (4 items, do first)

### Prompt 1: Portal Rail System Foundation (NAV #2, VERIFY-ONLY)

**Status:** QUEUED

```
Read docs/audits/rail-foundation-assessment.md for context. The Portal Rail System Foundation (13 components, 9 lib files, 42 resolvers, 7 role registries, 3 layout mounts) is code-complete but unverified. Write Playwright tests that authenticate as the agent account (.auth/agent.json), navigate to chef/client/admin portals, and verify rail components render, resolvers return data, and layout mounts are visible. Run npm run regression:firewall before marking done.
```

### Prompt 2: First Next Handoff Bar Mounts (NAV #7, BLOCKED)

**Status:** QUEUED

```
Read the rail foundation in lib/rail/ (9 files: scoring, state, aggregator, 5 source adapters). The First/Next Handoff Bar needs contextual mounts on menu and recipe detail pages. Build a HandoffBar component that reads from the rail registry, shows the next action for the current entity (menu or recipe), and mount it in app/(chef)/menus/[id]/page.tsx and app/(chef)/recipes/[id]/page.tsx. Use existing rail types. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 3: Client Intelligence Ledger (CLIENT #5, BLOCKED)

**Status:** QUEUED

```
Read the partial work from RUN-20260515T230923Z. The Client Intelligence Ledger needs: (1) durable schema expansion on clients table (lifetime_value_cents, risk_score, predicted_churn_date, satisfaction_trend), (2) client portal capture hooks that log interactions, (3) revenue attribution persistence linking events->client revenue, (4) sensitive data controls (PII redaction in exports). Write migration, server actions in lib/clients/intelligence-actions.ts, types in lib/clients/intelligence-types.ts. Respect existing client table structure. No deletions. Run npm run regression:firewall before marking done.
```

### Prompt 4: Legal Readiness Center (SECURITY #1, IN-FLIGHT)

**Status:** QUEUED

```
Continue the in-flight Legal Readiness Center build. Check lib/legal/ and lib/compliance/ for existing work. Build: compliance-infrastructure-actions.ts with server actions for compliance checklist tracking, document storage references, regulatory requirement mapping. Types in compliance-types.ts. Migration for legal_compliance_items table (tenant-scoped). Admin-gated. No external service dependencies. Run npm run regression:firewall before marking done.
```

---

## WAVE 1: SPEC-READY ITEMS (13 items)

### Prompt 5: Admin Portal Rail Prominence (NAV #3)

**Status:** QUEUED

```
Read docs/specs/rail-portal-prominence-specs.md. Build the Admin Portal Rail Prominence: wire rail resolvers into the admin layout, add admin-specific rail sources (tenant health, system alerts, pending approvals), mount TieredRail component in app/(admin)/layout.tsx. Use existing lib/rail/ infrastructure. No new tables. Scope: admin portal only. Run npm run regression:firewall before marking done.
```

### Prompt 6: Chef and Client Portal Rail Prominence (NAV #4)

**Status:** QUEUED

```
Read docs/specs/rail-portal-prominence-specs.md. Build Chef and Client Portal Rail Prominence: mount TieredRail in chef layout (app/(chef)/layout.tsx) and client layout (app/(client)/layout.tsx). Chef rail uses existing resolvers (lifecycle, weather, cadence, completion). Client rail uses portal-specific resolvers (upcoming events, dietary requests, payment reminders). Use existing lib/rail/ infrastructure. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 7: Staff Portal Rail Conversion (NAV #5)

**Status:** QUEUED

```
Read docs/specs/rail-portal-prominence-specs.md. Build Staff Portal Rail Conversion: mount TieredRail in staff layout (app/(staff)/layout.tsx). Staff rail sources: assigned tasks, upcoming shifts, event prep items. Create staff-rail-resolver.ts in lib/rail/resolvers/. Use existing rail types and assembleTieredRail. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 8: Partner and Vendor Portal Rail Standardization (NAV #6)

**Status:** QUEUED

```
Read docs/specs/rail-portal-prominence-specs.md. Build Partner/Vendor Portal Rail: mount TieredRail in partner layout. Partner rail sources: referral activity, upcoming events at venue, pending approvals. Create partner-rail-resolver.ts in lib/rail/resolvers/. Use existing rail types. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 9: Comprehensive QA Validation (DEV #1)

**Status:** QUEUED

```
Build a comprehensive QA validation framework. Create lib/qa/validation-actions.ts with server actions: runRouteValidation (checks all 938 routes respond 200), runActionValidation (imports and type-checks all server action modules), runSchemaValidation (verifies all migrations applied). Types in lib/qa/validation-types.ts. Admin-gated. Output JSON report. No new tables needed. Run npm run regression:firewall before marking done.
```

### Prompt 10: Cross-Boundary Flow Interrogation (DEV #2)

**Status:** QUEUED

```
Build cross-boundary flow interrogation tooling. Create lib/qa/flow-interrogation-actions.ts with server actions that trace entity flows across domain boundaries: inquiry->event->menu->recipe chain integrity, event->communication->notification delivery chain, client->loyalty->reward chain. Report orphaned entities, broken references, dead-end flows. Types in lib/qa/flow-types.ts. Admin-gated. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 11: Comprehensive Domain Inventory Phase 1 (DEV #4)

**Status:** QUEUED

```
Build domain inventory tooling. Create lib/qa/domain-inventory-actions.ts with server actions: inventoryDomains (scans lib/ directories, counts files/exports/actions per domain), detectOrphanedDomains (domains with no route consumers), detectDuplicateDomains (overlapping exports). Output structured JSON. Types in lib/qa/domain-inventory-types.ts. Admin-gated. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 12: Contextual Wiring Mise en Place (DEV #10)

**Status:** QUEUED

```
Build contextual wiring infrastructure. Create lib/qa/wiring-mise-actions.ts with server actions: getWiringStatus (for a given route, shows all connected domains, actions, components), getUnwiredRoutes (routes with no server action imports), getOverwiredRoutes (routes importing from 10+ domains). Types in lib/qa/wiring-types.ts. Admin-gated. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 13: OpenClaw Archive Digester (OPENCLAW #2)

**Status:** QUEUED

```
Read memory about Archive Digester being #1 cartridge priority. Build the ingestion framework: lib/openclaw/archive-digester-actions.ts with server actions for ingesting business artifacts (receipts, invoices, menus, contracts) from file uploads. Types in lib/openclaw/archive-digester-types.ts. Migration for archive_digester_jobs table (job_id, file_path, file_type, status, extracted_data jsonb, tenant_id, timestamps). Process: upload -> classify -> extract structured data -> store. Admin-gated. No external APIs. Run npm run regression:firewall before marking done.
```

### Prompt 14: OpenClaw Scraper Enrichment (OPENCLAW #1, IN-FLIGHT)

**Status:** QUEUED

```
Check existing work in lib/openclaw/ for scraper enrichment. Continue the in-flight build: enrich existing OpenClaw store/product records with additional metadata (hours, categories, brand info). Create lib/openclaw/enrichment-actions.ts with server actions for batch enrichment jobs, quality scoring of enriched records, gap detection. Types in lib/openclaw/enrichment-types.ts. Migration for enrichment_jobs table if not exists. Admin-gated. Run npm run regression:firewall before marking done.
```

### Prompt 15: Remy Routine Authoring UI (COMMS #2, DRAFT)

**Status:** QUEUED

```
Read lib/remy/routines/ (types.ts, engine.ts, routine-actions.ts, audit.ts, safety.ts) built in the swarm. Build the Routine Authoring UI: app/(chef)/remy/routines/page.tsx with CRUD for routines (create, edit, delete, toggle active). Approval flow: new routines start as draft, chef reviews conditions+actions, approves to activate. Use existing routine-actions.ts server actions. List view with status badges, condition previews, last-triggered timestamps. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 16: Remy Routine Runtime Hardening (COMMS #3, PARTIAL)

**Status:** QUEUED

```
Read lib/remy/routines/engine.ts and safety.ts. The runtime matching engine is built but needs hardening. Add: (1) edge case tests for overlapping conditions, (2) idempotency verification (same trigger doesn't fire routine twice in 1h window), (3) safety gate integration tests (verify blocked actions actually block), (4) logging observability (structured logs for each routine evaluation). Write tests in tests/remy-routines/. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 17: Remy Routine Safety Audit + Observability (COMMS #4, PARTIAL)

**Status:** QUEUED

```
Read lib/remy/routines/audit.ts and safety.ts. Build dedicated test suite in tests/remy-safety/ covering: safety boundary enforcement (all 4 boundaries), audit trail completeness (every routine trigger logged), tenant isolation (routines can't cross tenants), rate limiting (max routine fires per hour). Create observability component: components/remy/routine-observability.tsx showing recent triggers, safety blocks, audit trail. Admin-gated. No new tables. Run npm run regression:firewall before marking done.
```

---

## WAVE 2: COMMUNICATION + REMY (5 items)

### Prompt 18: Remy Codex Skill Proposal Handoff (COMMS #5, DRAFT)

**Status:** QUEUED

```
Read lib/remy/routines/types.ts for routine types. Build skill proposal handoff: when a routine pattern is used 5+ times successfully, generate a skill proposal. Create lib/remy/skill-proposal-actions.ts with: generateSkillProposal (extracts routine pattern into skill template), reviewSkillProposal (chef approval UI), getProposalCandidates (routines meeting threshold). Types in lib/remy/skill-proposal-types.ts. Migration for remy_skill_proposals table. Admin-gated. Run npm run regression:firewall before marking done.
```

### Prompt 19: Email Snapshot & Portal Strategy (COMMS #6, DRAFT)

**Status:** QUEUED

```
Read docs/specs/email-snapshot-and-portal-strategy.md and docs/research/email-to-portal-transition-tactics.md. Build A/B email strategy: lib/communication/email-snapshot-actions.ts with server actions for generating email snapshots (inline menu preview, event summary, next-action CTA), portal deep-link generation with UTM tracking, A/B variant assignment (snapshot-heavy vs portal-link). Types in lib/communication/email-snapshot-types.ts. Migration for email_ab_assignments table. No external APIs. Run npm run regression:firewall before marking done.
```

### Prompt 20: Audit Dual Follow-Up Engines (COMMS #31, DRAFT)

**Status:** QUEUED

```
Read lib/communication/follow-up-actions.ts and lib/follow-up/sequence-engine.ts. These may serve different lifecycle stages. Audit: (1) map all callers of each, (2) determine if they serve different purposes or duplicate, (3) if duplicate, consolidate into one canonical path and re-export from the other for backwards compat. If different purposes, document the boundary in a comment. No new tables. Do not delete any exports. Run npm run regression:firewall before marking done.
```

---

## WAVE 3: CIRCLES + MENU + LIFECYCLE (7 items)

### Prompt 21: Dinner Circle Multi-Host Collaboration (CIRCLES #6, DRAFT)

**Status:** QUEUED

```
Read lib/circles/ and lib/dinner-circles/ for existing circle infrastructure. Build multi-host collaboration: lib/circles/multi-host-actions.ts with server actions for inviting co-hosts to a circle, co-host role permissions (can edit events, manage guests, post broadcasts), shared ingredient lists between hosts. Types in lib/circles/multi-host-types.ts. Migration for circle_co_hosts table (circle_id, user_id, role, permissions jsonb, invited_at, accepted_at). Run npm run regression:firewall before marking done.
```

### Prompt 22: Dinner Circle Unification (CIRCLES #7, DRAFT)

**Status:** QUEUED

```
Read lib/circles/ and lib/dinner-circles/ for the full circle landscape. Unify: ensure all circle types (dinner, crew, collaborator, operational) share a common base type and registry. Create lib/circles/unified-registry-actions.ts with: getUnifiedCircleList (all circle types for a user), getCircleByType, migrateCircleType. Types in lib/circles/unified-types.ts. No new tables (use existing hub_groups + type discriminator). Run npm run regression:firewall before marking done.
```

### Prompt 23: Circles Operating Loop Build Extraction (CIRCLES #8, DRAFT)

**Status:** QUEUED

```
Read lib/circles/ for existing circle code. Extract operational circle patterns into reusable build blocks: lib/circles/operating-loop-actions.ts with server actions for circle-scoped broadcasts, member activity feeds, circle health scoring, circle-level notification preferences. Types in lib/circles/operating-loop-types.ts. Use existing circle tables. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 24: Farm Dinner Co-Host Vision (CIRCLES #9, UNSPECCED, deps #21)

**Status:** BLOCKED (needs Prompt 21 multi-host first)

```
Read docs/specs/ticketed-events-and-distribution.md and memory about farm dinner co-hosting. Build farm dinner co-host features on top of multi-host infrastructure: lib/circles/farm-dinner-actions.ts with server actions for creating co-hosted farm events (chef + farm owner), shared ingredient sourcing lists, venue-specific settings (outdoor capacity, weather contingency), ticketed event integration. Types in lib/circles/farm-dinner-types.ts. Use existing circle_co_hosts and events tables. No new tables beyond what multi-host created. Run npm run regression:firewall before marking done.
```

### Prompt 25: Flexible Creation Order & Recipe Lifecycle (MENU #10, DRAFT)

**Status:** QUEUED

```
Read docs/specs/flexible-creation-order-and-recipe-lifecycle.md. Build flexible creation order: remove any hard ordering constraints between menu/recipe/event creation. Ensure: recipes can exist without menus, menus can exist without events, events can exist without menus. Create lib/recipes/lifecycle-actions.ts with recipe lifecycle states (draft, active, archived, retired). Types in lib/recipes/lifecycle-types.ts. Migration to add lifecycle_status column to recipes table if not exists. Run npm run regression:firewall before marking done.
```

### Prompt 26: Recipe Peak Windows (MENU #11, DRAFT)

**Status:** QUEUED

```
Read memory about recipe peak windows (quality peaks + safety ceilings + reverse prep timeline). Build: lib/recipes/peak-window-actions.ts with server actions for defining peak serving windows per recipe (best temp, hold time, quality decay curve), safety ceilings (max hold time at temp), reverse prep timeline generation (work backwards from service time). Types in lib/recipes/peak-window-types.ts. Migration for recipe_peak_windows table (recipe_id, peak_temp, max_hold_minutes, quality_decay_rate, safety_ceiling_minutes). Run npm run regression:firewall before marking done.
```

### Prompt 27: Clean Stop/Resume Trails (LIFECYCLE #24, DRAFT)

**Status:** QUEUED

```
Read lib/events/transitions.ts for event FSM. Build clean stop/resume trails: lib/events/stop-resume-actions.ts with server actions for pausing event planning (captures current state snapshot), resuming (restores from snapshot, shows what changed while paused), trail logging (who stopped, why, duration). Types in lib/events/stop-resume-types.ts. Migration for event_pause_trails table (event_id, paused_by, paused_at, resumed_at, reason, state_snapshot jsonb). Run npm run regression:firewall before marking done.
```

---

## WAVE 4: AI + ONBOARDING + UI (6 items)

### Prompt 28: Chef Operating Loop External Memory (AI #7, DRAFT)

**Status:** QUEUED

```
Build external memory for the chef operating loop. Create lib/ai/external-memory-actions.ts with server actions: storeOperatingMemory (saves chef decisions, preferences, patterns observed during operations), recallRelevantMemory (retrieves contextually relevant memories for current task), pruneStaleMemory (removes outdated memories after 90 days). Types in lib/ai/external-memory-types.ts. Migration for chef_operating_memories table (tenant_id, memory_type, context, content, relevance_score, created_at, expires_at). Run npm run regression:firewall before marking done.
```

### Prompt 29: Configuration Engine (AI #8, DRAFT)

**Status:** QUEUED

```
Read memory about onboarding cohesion and config engine (5 questions -> tailored workspace). Build: lib/config/engine-actions.ts with server actions for running configuration wizard (5 adaptive questions about service type, client volume, pricing style, team size, tech comfort), generating workspace configuration from answers, applying configuration (sets defaults for relevant settings). Types in lib/config/engine-types.ts. Migration for tenant_configurations table (tenant_id, question_responses jsonb, applied_config jsonb, created_at). Run npm run regression:firewall before marking done.
```

### Prompt 30: Culinary Operations & Costing System (AI #9, DRAFT)

**Status:** QUEUED

```
Build culinary operations intelligence. Create lib/ai/culinary-ops-actions.ts with server actions: analyzeCookingPatterns (identifies chef's most-used techniques from recipes), suggestCostOptimizations (finds ingredient substitutions that maintain quality at lower cost), forecastSeasonalCosts (predicts ingredient cost changes based on PIE data). Types in lib/ai/culinary-ops-types.ts. Use existing recipe and ingredient tables. No new tables. No external AI calls (pure algorithmic analysis). Run npm run regression:firewall before marking done.
```

### Prompt 31: Onboarding Cohesion Rework (ONBOARDING #1, DRAFT)

**Status:** BLOCKED (needs Prompt 29 config engine first)

```
Read memory about onboarding cohesion. Build adaptive onboarding: app/(chef)/onboarding/page.tsx with 5-question wizard (service type, client volume, pricing approach, team size, tech comfort). Each answer adjusts subsequent questions. Final step applies configuration via config engine. Uses progressive disclosure (start simple, unlock features as chef engages). lib/onboarding/cohesion-actions.ts with server actions. Types in lib/onboarding/cohesion-types.ts. No new tables (uses tenant_configurations from config engine). Run npm run regression:firewall before marking done.
```

### Prompt 32: Passive Capture Triage Dock (ONBOARDING #2, DRAFT)

**Status:** QUEUED

```
Read lib/capture/capture-actions.ts (already built: capture-actions with 7 actions, capture_entries table). Build the triage dock: components/capture/triage-dock.tsx - a persistent bottom dock that shows uncategorized capture items count, quick-triage actions (assign to event, client, recipe, or dismiss), bulk triage mode. Wire into chef layout as a floating element. Use existing capture_entries table and capture server actions. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 33: OpenClaw Food Price Intelligence (OPENCLAW #8, DRAFT)

**Status:** QUEUED

```
Build food price intelligence display layer. Create lib/openclaw/price-intelligence-actions.ts with server actions: getPriceIntelligence (retrieves pricing data from Pi bridge for given ingredients), getPriceTrends (30/60/90 day trend lines), getSeasonalForecast (predicted prices for upcoming months), getPriceAlerts (ingredients with significant price changes). Types in lib/openclaw/price-intelligence-types.ts. Use existing Pi Price Bridge (port 7700) as data source. No new tables. Run npm run regression:firewall before marking done.
```

---

## WAVE 5: ULYSSES COMMITMENT ENGINE (12 items, waves 1-3)

### Prompt 34: Override Ceremony Component (ULYSSES #4, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/engine.ts, types.ts, friction.ts, commitment-actions.ts. Build the unified override ceremony dialog: components/commitments/override-ceremony.tsx. Shows: commitment being overridden, override history count, friction-tier UI (Tier 1: banner, Tier 2: countdown, Tier 3: written reason required, Tier 4: witness notification, Tier 5: full ceremony with future-self letter). All domains route through this one component. Uses existing commitment-actions.ts. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 35: Domain - Scheduling Commitments (ULYSSES #8, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and types.ts for the commitment engine contract, and lib/commitments/domains/pricing.ts for domain implementation pattern. Build scheduling domain: lib/commitments/domains/scheduling.ts with rules: max_events_per_week, min_rest_days, max_consecutive_work_days, protected_time_locks, no_same_day_doubles_after_x. Register in commitment engine. Add 4 server action wrappers that check scheduling commitments before booking/availability actions. Run npm run regression:firewall before marking done.
```

### Prompt 36: Domain - Dietary Safety Commitments (ULYSSES #9, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and domains/pricing.ts for pattern. Build dietary safety domain: lib/commitments/domains/dietary-safety.ts with rules: allergens_verified_before_confirm, cross_contamination_check_required, no_unverified_substitutions, dietary_summary_sent_before_event. Default Tier 3 friction (these are safety-critical). Register in commitment engine. Wire checks into allergy and dietary server actions. Run npm run regression:firewall before marking done.
```

### Prompt 37: Streak Counter + Integrity Score (ULYSSES #10, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and commitment-actions.ts. Build streak tracking: lib/commitments/streak-actions.ts with server actions: getCommitmentStreaks (per-commitment consecutive days honored), getIntegrityScore (rolling 90-day score 0-100 across all domains), getMilestones (30/60/90/180/365 day markers), getIntegrityTrend (score over time). Types in lib/commitments/streak-types.ts. Migration for commitment_streaks table (commitment_id, current_streak_days, longest_streak, last_honored_at, last_broken_at). Run npm run regression:firewall before marking done.
```

### Prompt 38: Commitment Cockpit Dashboard Section (ULYSSES #11, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/ for all commitment infrastructure. Build dashboard widget: components/commitments/commitment-cockpit.tsx - overall integrity score (large number), domain health grid (10 domains, color-coded), active streaks list, recent overrides (last 7 days), system suggestions for new commitments based on gaps. Wire into dashboard page as a section. Uses existing commitment server actions. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 39: Domain - Menu Integrity (ULYSSES #12, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and domains/ for pattern. Build menu integrity domain: lib/commitments/domains/menu-integrity.ts with rules: menu_lock_cooldown_hours, max_revisions_per_event, no_new_dishes_within_x_days, recipe_required_before_lock. Register in engine. Wire checks into menu lifecycle actions (lock, unlock, add dish, update). Run npm run regression:firewall before marking done.
```

### Prompt 40: Domain - Closeout Discipline (ULYSSES #13, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and domains/ for pattern. Build closeout discipline domain: lib/commitments/domains/closeout-discipline.ts with rules: invoice_within_x_days, payment_followup_within_x_days, cost_reconciliation_required, max_unclosed_events_cap. Register in engine. Wire checks into closeout and invoice actions. Run npm run regression:firewall before marking done.
```

### Prompt 41: Domain - Communication (ULYSSES #14, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and domains/ for pattern. Build communication domain: lib/commitments/domains/communication.ts with rules: response_time_sla_hours, cadence_integrity (never skip touchpoint), max_radio_silence_days, post_event_followup_48h. Register in engine. Wire checks into communication pipeline and cadence scheduler. Run npm run regression:firewall before marking done.
```

### Prompt 42: Domain - Capacity (ULYSSES #15, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and domains/ for pattern. Build capacity domain: lib/commitments/domains/capacity.ts with rules: max_guests_without_sous_chef, revenue_concentration_cap (Herfindahl index), min_prep_time_per_guest_tier, min_gap_between_same_day_events. Register in engine. Wire checks into booking and event creation actions. Run npm run regression:firewall before marking done.
```

### Prompt 43: Future Self Letters (ULYSSES #16, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and the override ceremony component. Build future self letters: lib/commitments/future-self-actions.ts with server actions: writeFutureSelfLetter (chef writes note explaining WHY when setting commitment), getFutureSelfLetter (retrieved during Tier 4+ override ceremonies), updateFutureSelfLetter. Types in lib/commitments/future-self-types.ts. Migration for commitment_future_self_letters table (commitment_id, letter_text, written_at, last_shown_at). Run npm run regression:firewall before marking done.
```

### Prompt 44: Cooling-Off Periods (ULYSSES #17, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/friction.ts for the friction gradient system. Build cooling-off periods: lib/commitments/cooling-off-actions.ts with server actions: initiateCoolingOff (starts configurable delay: 4h pricing, 24h client drops, 48h commitment removal), checkCoolingOffStatus (is action still in cooling period?), executeCooledAction (runs after delay if not cancelled), cancelCoolingOff. Types in lib/commitments/cooling-off-types.ts. Migration for cooling_off_periods table (action_type, action_data jsonb, initiated_at, executes_at, cancelled_at, executed_at). Run npm run regression:firewall before marking done.
```

### Prompt 45: Commitment Portfolios (ULYSSES #18, DRAFT)

**Status:** QUEUED

```
Read lib/commitments/engine.ts. Build commitment portfolios: lib/commitments/portfolio-actions.ts with server actions: getPortfolios (Quality-First, Growth, Sustainability, Recovery presets), applyPortfolio (activates all commitments in a portfolio), customizePortfolio (chef adjusts thresholds), getSeasonalSuggestion (recommends portfolio based on time of year). Types in lib/commitments/portfolio-types.ts. Migration for commitment_portfolios table (tenant_id, portfolio_type, customizations jsonb, activated_at). Run npm run regression:firewall before marking done.
```

---

## WAVE 6: ULYSSES DOMAINS + COMPOUND SIGNALS (18 items)

### Prompt 46: Domain - Contingency (ULYSSES #19)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and domains/ for pattern. Build contingency domain: lib/commitments/domains/contingency.ts with rules: emergency_contacts_before_confirm, backup_plan_for_high_value, insurance_currency_required, equipment_checklist_before_in_progress. Register in engine. Wire into event confirmation flow. Run npm run regression:firewall before marking done.
```

### Prompt 47: Domain - Travel (ULYSSES #20)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and domains/ for pattern. Build travel domain: lib/commitments/domains/travel.ts with rules: travel_time_buffer_minutes, travel_plan_before_confirm, max_miles_without_overnight, travel_surcharge_auto_include. Register in engine. Wire into event creation and booking flow. Run npm run regression:firewall before marking done.
```

### Prompt 48: Domain - Business Health (ULYSSES #21)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and domains/ for pattern. Build business health domain: lib/commitments/domains/business-health.ts with rules: weekly_financial_review (dashboard_viewed tracker), quarterly_rate_review, certification_currency (block if expired), savings_reserve_advisory. Register in engine. Run npm run regression:firewall before marking done.
```

### Prompt 49: Spiral Detector (ULYSSES #22)

**Status:** QUEUED

```
Read lib/commitments/streak-actions.ts and commitment-actions.ts. Build spiral detector: lib/commitments/compound/spiral-detector.ts - detects overrides across 3+ domains within 2-week window. Emits urgency-5 CIL signal. Create server actions: detectSpiral, getSpiralHistory, getSpiralRiskScore. Register as CIL signal source. Wire into Remy morning briefing data. No new tables (queries existing commitment_overrides). Run npm run regression:firewall before marking done.
```

### Prompt 50: Client Vortex Detector (ULYSSES #23)

**Status:** QUEUED

```
Read lib/commitments/compound/ for pattern. Build client vortex detector: lib/commitments/compound/client-vortex-detector.ts - detects one client driving overrides across multiple domains. Server actions: detectClientVortex, getVortexClients, getClientOverrideProfile. Surfaces disproportionate energy/standards cost. No new tables (joins commitment_overrides with events/clients). Run npm run regression:firewall before marking done.
```

### Prompt 51: Seasonal Erosion Detector (ULYSSES #24)

**Status:** QUEUED

```
Read lib/commitments/compound/ for pattern. Build seasonal erosion detector: lib/commitments/compound/seasonal-erosion-detector.ts - maps override frequency to calendar, pre-warns before historically high-override months. Server actions: getSeasonalErosionPattern, predictUpcomingErosion, getMonthlyOverrideHeatmap. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 52: Fatigue Cascade Detector (ULYSSES #25)

**Status:** QUEUED

```
Read lib/commitments/compound/ for pattern. Build fatigue cascade detector: lib/commitments/compound/fatigue-cascade-detector.ts - detects burnout score + override frequency + response time + closeout backlog all trending worse simultaneously. Server actions: detectFatigueCascade, getCascadeRiskScore, getCascadeTrends. Predicts operational crash. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 53: New Client Risk Detector (ULYSSES #26)

**Status:** QUEUED

```
Read lib/commitments/compound/ for pattern. Build new client risk detector: lib/commitments/compound/new-client-risk-detector.ts - first-time client events have higher override rates, suggests stricter commitments. Server actions: getNewClientRiskProfile, suggestFirstEngagementCommitments. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 54: Commitment Seasons (ULYSSES #27)

**Status:** QUEUED

```
Read lib/commitments/portfolio-actions.ts. Build seasonal commitment profiles: lib/commitments/seasons-actions.ts with server actions: defineSeasons (peak/quiet/custom date ranges), assignPortfolioToSeason, getActiveSeasonProfile, autoSwapOnBoundary. Types in lib/commitments/seasons-types.ts. Migration for commitment_seasons table (tenant_id, season_name, start_month, end_month, portfolio_id). Run npm run regression:firewall before marking done.
```

### Prompt 55: Event-Specific Commitment Contracts (ULYSSES #28)

**Status:** QUEUED

```
Read lib/commitments/engine.ts. Build event-specific contracts: lib/commitments/event-contract-actions.ts with server actions: generateEventContract (pre-acceptance quality standards, auto-tiered by event value/complexity), scoreContractAdherence (post-event scoring), getRunningIntegrityAverage. Types in lib/commitments/event-contract-types.ts. Migration for event_commitment_contracts table (event_id, commitment_rules jsonb, adherence_score, scored_at). Run npm run regression:firewall before marking done.
```

### Prompt 56: Override-Issue Correlation (ULYSSES #29)

**Status:** QUEUED

```
Read lib/commitments/ for override data. Build override-issue correlation: lib/commitments/correlation-actions.ts with server actions: correlateOverridesWithIssues (matches overrides to post-event problems), getCorrelationInsights (proves overrides have real consequences), getOverrideRiskFactors. No new tables (joins commitment_overrides with event_closeouts and feedback). Run npm run regression:firewall before marking done.
```

### Prompt 57: Beta Monetization (REMAINING #1)

**Status:** QUEUED

```
Build beta monetization decision archive. Create lib/monetization/archive-actions.ts with server actions: archiveMonetizationDecision (records pricing/billing decisions with rationale), getDecisionHistory, getDecisionsByCategory (free-tier, paid-tier, pricing-changes). Types in lib/monetization/archive-types.ts. Migration for monetization_decisions table (decision_type, rationale, decided_by, decided_at, superseded_by). Admin-gated. Run npm run regression:firewall before marking done.
```

### Prompt 58: Data Export Takeout (REMAINING #2)

**Status:** QUEUED

```
Build GDPR-style data export/takeout. Create lib/export/takeout-actions.ts with server actions: requestTakeout (queues full data export for tenant), getTakeoutStatus, downloadTakeout (ZIP of all tenant data: events, clients, menus, recipes, invoices, settings as JSON/CSV). Types in lib/export/takeout-types.ts. Migration for takeout_requests table (tenant_id, status, requested_at, completed_at, download_url). Tenant-scoped, auth-gated. Run npm run regression:firewall before marking done.
```

### Prompt 59: Human Systems Product Doctrine (REMAINING #3)

**Status:** QUEUED

```
Build product doctrine registry. Create lib/doctrine/doctrine-actions.ts with server actions: getDoctrinePrinciples (returns all active product principles), evaluateAgainstDoctrine (checks a proposed feature against principles), getDoctrineCoverage (which principles are reflected in code). Types in lib/doctrine/doctrine-types.ts. Hardcoded principles array (no DB). Admin-gated internal tool. Run npm run regression:firewall before marking done.
```

### Prompt 60: Research-Derived Builds Index (REMAINING #4)

**Status:** QUEUED

```
Build research-derived builds index. Create lib/research/builds-index-actions.ts with server actions: getResearchDerivedBuilds (maps docs/research/ files to actual code built from them), getUnbuiltResearch (research docs with no corresponding code), getBuildCoverage (percentage of research acted upon). No new tables (reads filesystem + git history). Admin-gated. Run npm run regression:firewall before marking done.
```

### Prompt 61: Respectful Monetization (REMAINING #5)

**Status:** QUEUED

```
Build respectful monetization foundation. Create lib/monetization/respectful-actions.ts with server actions: evaluatePricingFairness (checks if pricing change is within reasonable bounds), getMonetizationGuardrails (returns configured limits on price increases, billing frequency), logMonetizationEvent (tracks all billing-related actions). Types in lib/monetization/respectful-types.ts. No new tables (uses monetization_decisions from #57). Run npm run regression:firewall before marking done.
```

### Prompt 62: Support Network Map (REMAINING #6)

**Status:** QUEUED

```
Build support network map. Create lib/support/network-map-actions.ts with server actions: getSupportNetwork (maps chef's support contacts: sous chefs, vendors, mentors, emergency contacts), addNetworkContact, getNetworkCoverage (identifies gaps: no backup chef, no emergency vendor). Types in lib/support/network-map-types.ts. Migration for support_network_contacts table (tenant_id, contact_name, role, phone, email, availability_notes). Run npm run regression:firewall before marking done.
```

### Prompt 63: System Integrity Interrogation (REMAINING #7)

**Status:** QUEUED

```
Build system integrity interrogation. Create lib/qa/integrity-interrogation-actions.ts with server actions: interrogateSystem (runs 10 cross-boundary checks: orphan events, unlinked menus, stale caches, broken references, tenant leaks), getIntegrityScore (0-100 system health), getIntegrityHistory (trend over time). Types in lib/qa/integrity-types.ts. Admin-gated. No new tables. Run npm run regression:firewall before marking done.
```

---

## WAVE 7: ULYSSES ADVANCED (12 items, waves 4-5)

### Prompt 64: Temptation Catalog (ULYSSES #30)

**Status:** QUEUED

```
Read lib/commitments/ for override data. Build temptation catalog: lib/commitments/temptation-actions.ts - learns override triggers (time-of-day, day-of-week, client type, event proximity, season). Server actions: getTemptationProfile, getTemptationHotspots, predictOverrideRisk. No new tables (analyzes existing override logs). Run npm run regression:firewall before marking done.
```

### Prompt 65: Accountability Witness (ULYSSES #31)

**Status:** QUEUED

```
Read lib/commitments/ and the override ceremony component. Build accountability witness: lib/commitments/witness-actions.ts with server actions: designateWitness (chef picks human for Tier 4+ notifications), notifyWitness (sends digest of overrides), getWitnessDigest, removeWitness. Types in lib/commitments/witness-types.ts. Migration for commitment_witnesses table (tenant_id, witness_name, witness_email, designated_at, opt_in_confirmed). Fully opt-in. Run npm run regression:firewall before marking done.
```

### Prompt 66: Commitment Archaeology (ULYSSES #32)

**Status:** QUEUED

```
Read lib/commitments/ for engine and override data. Build commitment archaeology: lib/commitments/archaeology-actions.ts - retroactive simulation: "if current commitments had been active for last 12 months, what would have happened?" Server actions: runRetroSimulation, getSimulationResults, compareActualVsCommitted. Shows evidence from chef's own history. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 67: Best-Month Mirror (ULYSSES #33)

**Status:** QUEUED

```
Read lib/commitments/ for scoring data. Build best-month mirror: lib/commitments/mirror-actions.ts - identifies chef's best-performing month, creates behavioral snapshot. Server actions: identifyBestMonth, getBestMonthSnapshot, compareCurrentToBest. Shows comparison when drifting. Chef compared to own peak, not benchmarks. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 68: Commitment Negotiation (ULYSSES #34)

**Status:** QUEUED

```
Read lib/commitments/engine.ts. Build commitment negotiation: lib/commitments/negotiation-actions.ts - when two commitments conflict (max 3/week vs never reject repeat clients), system offers resolution options. Server actions: detectConflicts, getResolutionOptions, resolveConflict, learnPriorityHierarchy. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 69: Regret Minimizer (ULYSSES #35)

**Status:** QUEUED

```
Read lib/commitments/ and correlation-actions.ts. Build regret minimizer: lib/commitments/regret-actions.ts - pre-override question "if this goes wrong, how much will you regret?" (1-5). Post-event correlation calibrates prediction accuracy. Server actions: recordRegretPrediction, correlateRegretWithOutcome, getCalibrationAccuracy. Migration for commitment_regret_predictions table (override_id, predicted_regret, actual_outcome, correlated_at). Run npm run regression:firewall before marking done.
```

### Prompt 70: Remy Commitment Coach - Morning Briefing (ULYSSES #36)

**Status:** QUEUED

```
Read lib/remy/ and lib/commitments/ for both systems. Build Remy commitment coach morning briefing integration: lib/commitments/remy-coach-actions.ts with server actions: getCommitmentBriefing (commitment status, capacity warnings, pending verifications, streak updates, pressure forecast for the day). Wire output into Remy morning briefing data pipeline. Remy illuminates, never judges. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 71: Remy Post-Override Coaching (ULYSSES #37)

**Status:** QUEUED

```
Read lib/commitments/ and lib/remy/. Build post-override coaching: lib/commitments/remy-override-coaching-actions.ts - after override, Remy offers non-judgmental coaching. Server actions: triggerPostOverrideCoaching (generates coaching prompt), recordCoachingResponse, suggestCommitmentAdjustment. Pattern surfacing: "you've overridden this 3 times in 2 weeks, want to adjust the threshold?" No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 72: Remy Monthly Review (ULYSSES #38)

**Status:** QUEUED

```
Read lib/commitments/ and lib/remy/. Build monthly integrity report: lib/commitments/remy-monthly-actions.ts with server actions: generateMonthlyReport (strongest/weakest domains, suggestions, trend analysis, pattern surfacing like "you override more on Fridays"), getReportHistory. Types in lib/commitments/remy-monthly-types.ts. No new tables (aggregates existing data). Run npm run regression:firewall before marking done.
```

### Prompt 73: Anti-Commitment Detection (ULYSSES #39)

**Status:** QUEUED

```
Read lib/commitments/. Build anti-commitment detection: lib/commitments/anti-commitment-actions.ts - detects chefs with NO commitments who exhibit erratic behavior. Server actions: detectErraticBehavior (analyzes pricing variance, scheduling chaos, response time volatility), suggestCommitmentsFromVolatility. "Your quotes range $60-$200. Want a floor?" No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 74: Recovery Protocol (ULYSSES #40)

**Status:** QUEUED

```
Read lib/commitments/ including spiral-detector and portfolios. Build recovery protocol: lib/commitments/recovery-actions.ts - spiral circuit breaker. Server actions: activateRecovery (auto-pause non-safety commitments, activate Recovery Portfolio), get7DayCheckIn, gradualReactivation (over 2 weeks), recordRecoveryDebrief. Types in lib/commitments/recovery-types.ts. Migration for commitment_recovery_sessions table (tenant_id, triggered_by, started_at, stage, completed_at). Run npm run regression:firewall before marking done.
```

### Prompt 75: Commitment DNA (ULYSSES #41)

**Status:** QUEUED

```
Read lib/commitments/ for all pattern data. Build commitment DNA: lib/commitments/dna-actions.ts - operational personality fingerprint from commitment patterns. Server actions: computeCommitmentDNA (classifies: Perfectionist, Hustler, Balanced, Artisan, Caretaker), getDNAInsights, getDNATrend. Self-awareness + onboarding guidance. No new tables (analyzes existing commitment data). Run npm run regression:firewall before marking done.
```

---

## WAVE 8: ULYSSES BUSINESS + MASTERY (17 items, waves 6-7)

### Prompt 76: Commitment Diffusion (ULYSSES #42)

**Status:** QUEUED

```
Read lib/commitments/. Build commitment diffusion: lib/commitments/diffusion-actions.ts - when commitment works in one domain, suggest analogous commitments in other domains. Server actions: detectSuccessfulPatterns, suggestCrossDomainCommitments, getDiffusionHistory. Cross-domain learning. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 77: Quarterly Audit "Is This Still Me?" (ULYSSES #43)

**Status:** QUEUED

```
Read lib/commitments/. Build quarterly auto-audit: lib/commitments/quarterly-audit-actions.ts - auto-prompt to review all active commitments. Server actions: triggerQuarterlyAudit, getAuditChecklist (keep/adjust/retire for each), processAuditDecisions, getAuditHistory. Prevents zombie rules. Growth-aware recalibration. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 78: Anti-Scope-Creep Lock (ULYSSES #44)

**Status:** QUEUED

```
Read lib/commitments/ and lib/events/. Build anti-scope-creep lock: lib/commitments/scope-creep-actions.ts - post-proposal scope soft-lock. Server actions: detectScopeChange (classifies: minor=Tier1, medium=Tier2+repricing, major=Tier3+re-proposal), enforceScopeGate, getScopeCreepHistory. Prevents margin erosion from "oh and also." No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 79: Delegation/Bus-Factor Commitment (ULYSSES #45)

**Status:** QUEUED

```
Read lib/commitments/ and lib/events/delegate-actions.ts. Build delegation commitment: lib/commitments/delegation-actions.ts - pre-written crisis protocol. Server actions: createCrisisProtocol (which clients get notified, which events cancelled/rescheduled, who accesses what), getCrisisProtocol, testCrisisProtocol (dry run). Types in lib/commitments/delegation-types.ts. Migration for crisis_protocols table (tenant_id, protocol_data jsonb, last_reviewed_at, tested_at). Run npm run regression:firewall before marking done.
```

### Prompt 80: No Free Work Commitment (ULYSSES #46)

**Status:** QUEUED

```
Read lib/commitments/ and pricing domains. Build no-free-work commitment: lib/commitments/no-free-work-actions.ts - tracks waived fees. Server actions: trackWaivedFee (tasting, revision, consultation, recipe dev, travel), getWaivedFeeSummary ("$1,200 waived this quarter"), suggestFeeEnforcement. No new tables (uses existing commitment engine + pricing data). Run npm run regression:firewall before marking done.
```

### Prompt 81: Client-Facing Commitment Transparency (ULYSSES #47)

**Status:** QUEUED

```
Read lib/commitments/. Build client-facing transparency: lib/commitments/transparency-actions.ts - optional public exposure. Server actions: getPublicIntegrityBadge (score for profile), generateContractAddendum (specific promises), generatePostEventReport (commitments honored). Trust differentiation for chef's public profile. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 82: "Say No" Pre-Commitment (ULYSSES #48)

**Status:** QUEUED

```
Read lib/commitments/ and inquiry/booking flow. Build say-no pre-commitment: lib/commitments/say-no-actions.ts - pre-declared refusal categories. Server actions: defineRefusalRules (under $X, over X miles, previously cancelled without prepay, too many dietary accommodations), evaluateInquiry (auto-decline or flag), getRefusalHistory. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 83: Milestone Commitments (ULYSSES #49)

**Status:** QUEUED

```
Read lib/commitments/. Build milestone commitments: lib/commitments/milestone-actions.ts - business growth milestones with committed actions. Server actions: defineMilestone ("At 100 events, hire sous chef"), checkMilestoneProgress, triggerMilestoneAction, getMilestoneHistory. Types in lib/commitments/milestone-types.ts. Migration for commitment_milestones table (tenant_id, milestone_type, threshold, action_description, triggered_at). Run npm run regression:firewall before marking done.
```

### Prompt 84: Commitment-Aware Quoting (ULYSSES #50)

**Status:** QUEUED

```
Read lib/commitments/ and lib/quotes/. Build commitment-aware quoting: lib/commitments/quote-check-actions.ts - quote builder checks all commitments before send. Server actions: preflightQuoteCommitments (returns list of commitments this quote would break: "pricing floor and capacity"), getQuoteCompatibilityScore. Wire into quote creation flow as pre-send gate. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 85: Commitment Decay Detection (ULYSSES #51)

**Status:** QUEUED

```
Read lib/commitments/ for historical data. Build decay detection: lib/commitments/decay-actions.ts - detects gradual threshold erosion (floor creeping from $125 to $108), increasing override frequency, friction tier ineffectiveness. Server actions: detectDecay, getDecayTrends, suggestRecalibration. Honest recalibration, not shame. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 86: Vendor & Supplier Commitments (ULYSSES #52)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and domains/ for pattern. Build vendor domain: lib/commitments/domains/vendor.ts with rules: preferred_vendor_lock, order_lead_time_minimum, no_same_day_market_runs, quality_tier_lock. Register in engine. Correlates same-day sourcing with quality issues. Run npm run regression:firewall before marking done.
```

### Prompt 87: Learning Commitment (ULYSSES #53)

**Status:** QUEUED

```
Read lib/commitments/ and correlation data. Build learning domain: lib/commitments/domains/learning.ts with rules: debrief_within_x_days, one_lesson_per_event, recipe_update_on_modification, photo_documentation_minimum. Register in engine. Feeds override-issue correlation. Run npm run regression:firewall before marking done.
```

### Prompt 88: Time-of-Day Commitments (ULYSSES #54)

**Status:** QUEUED

```
Read lib/commitments/engine.ts. Build time-of-day rules: lib/commitments/domains/time-of-day.ts with rules: no_client_responses_after_9pm, no_quote_changes_after_6pm, no_event_accepts_10pm_to_7am, no_business_comms_on_protected_days. Rules active only during configured windows. +1 friction tier during active hours. Register in engine. Run npm run regression:firewall before marking done.
```

### Prompt 89: Reputation Firewall (ULYSSES #55)

**Status:** QUEUED

```
Read lib/commitments/engine.ts. Build reputation firewall: lib/commitments/domains/reputation.ts with rules: no_unplated_photos, review_response_sla, portfolio_currency_quarterly_update, no_public_pricing, brand_consistent_templates. Register in engine. Wire checks into photo upload and review response flows. Run npm run regression:firewall before marking done.
```

### Prompt 90: Energy Budget (ULYSSES #56)

**Status:** QUEUED

```
Read lib/commitments/ and scheduling domain. Build energy budget: lib/commitments/energy-budget-actions.ts - emotional energy tracking beyond time. Server actions: logEventEnergyLevel (high-energy event cap, difficult client limit), getEnergyBudgetStatus, getEnergyForecast (upcoming week), setEnergyBoundaries. Types in lib/commitments/energy-types.ts. Migration for energy_budget_entries table (tenant_id, event_id, energy_score, factors jsonb, logged_at). Run npm run regression:firewall before marking done.
```

### Prompt 91: Client Education Commitment (ULYSSES #57)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and communication domain. Build client education domain: lib/commitments/domains/client-education.ts with rules: timeline_transparency (realistic prep timelines shared), pricing_transparency (explain components), scope_confirmation_after_changes, limitation_honesty (refer vs overcommit). Register in engine. Run npm run regression:firewall before marking done.
```

### Prompt 92: Gratitude Commitment (ULYSSES #58)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and closeout domain. Build gratitude domain: lib/commitments/domains/gratitude.ts with rules: thank_vendors_within_48h, personal_client_thank_you_within_24h, team_recognition_post_event, host_venue_thanks. Tracks relationship reliability correlation. Register in engine. Run npm run regression:firewall before marking done.
```

---

## WAVE 9: HUMAN BODY BUILD WAVES (partial - truncated)

### Prompt 93: Living Recipe Commitment (ULYSSES #59)

**Status:** QUEUED

```
Read lib/commitments/engine.ts and recipe lifecycle. Build living recipe domain: lib/commitments/domains/living-recipe.ts with rules: document_new_dishes_within_7_days, update_recipes_after_modification_48h, cost_link_required_for_complete, scaling_verified_for_large_events. Register in engine. Wire into recipe actions. Run npm run regression:firewall before marking done.
```

### Prompt 94: Pre-Mortem Commitment (ULYSSES #60)

**Status:** QUEUED

```
Read lib/commitments/ and event-contract-actions.ts. Build pre-mortem commitment: lib/commitments/pre-mortem-actions.ts - before confirming event, 30-second pre-mortem: pick expected failure modes (kitchen too small, tight timeline, new cuisine, large party). Each selection auto-activates corresponding domain commitment for that event. Anxiety becomes protection. Server actions: getPremortermChecklist, selectFailureModes, activateEventCommitments. No new tables. Run npm run regression:firewall before marking done.
```

### Prompt 95: Growth Organ Repair (BODY #0)

**Status:** QUEUED

```
Build growth organ repair: restore and enforce the build queue contract. Create lib/qa/build-queue-contract-actions.ts with server actions: validateQueueIntegrity (checks UNIFIED-BUILD-QUEUE.md for orphaned items, status inconsistencies, missing dependencies), reconcileQueueWithCode (matches queue items to actual built code), getQueueHealth. Admin-gated. No new tables. Run npm run regression:firewall before marking done.
```

### Prompts 96-110: TRUNCATED

**Status:** NEEDS INPUT - user message exceeded 50K chars. Waves 9-10 incomplete.

---

## Summary

| Wave | Items | Theme                      | Dependencies    |
| ---- | ----- | -------------------------- | --------------- |
| 0    | 4     | Unblock + Verify           | None (do first) |
| 1    | 13    | Spec-Ready                 | Wave 0          |
| 2    | 5     | Communication + Remy       | None            |
| 3    | 7     | Circles + Menu + Lifecycle | #24 needs #21   |
| 4    | 6     | AI + Onboarding + UI       | #31 needs #29   |
| 5    | 12    | Ulysses Commitment Engine  | None            |
| 6    | 18    | Ulysses Domains + Compound | Wave 5          |
| 7    | 12    | Ulysses Advanced           | Wave 5-6        |
| 8    | 17    | Ulysses Business + Mastery | Wave 5-7        |
| 9-10 | ~15   | Human Body + remaining     | TRUNCATED       |

**Total tracked:** 95 of ~103 buildable items
**Blocked:** 2 (Prompts 24, 31)
**Needs input:** Prompts 96-110 (truncated)
