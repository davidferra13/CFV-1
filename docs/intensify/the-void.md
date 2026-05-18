# Intensify Zone: The Void

Everything that makes a chef feel lost, abandoned, or unsupported. The first of three failure types from the ChefFlow failure rubric.

## Master Void: Intelligence-to-Action Last Mile

69 intelligence modules + 19 CIL modules compute signals across all 8 void categories. The compute layer is massive and stable (52 UI consumers confirmed). The delivery layer (notifications, dashboard, daily page) is also built and stable. The missing piece is the wiring between them: CIL does not trigger notifications, intelligence alerts don't flow to the primary dashboard feed, and cadence gaps don't auto-fire reminders. Fix this one structural gap and every void category shrinks.

## Void Taxonomy (8 Categories)

### 1. Knowledge Void - "It's all in my head"

**Severity: HIGH**

What exists:

- Full recipe CRUD (lib/recipes/actions.ts, 2500+ lines, 20+ exports)
- Recipe Capture Prompt: post-event banner nudging unrecorded dishes (components/recipes/recipe-capture-prompt.tsx)
- Recipe Debt tracker: getRecipeDebt() counts components with no recipe by time window (lib/recipes/actions.ts:1394)
- AI parse-recipe for natural language capture (lib/ai/parse-recipe.ts)
- Recipe step photos table (database/migrations/20260401000039_recipe_step_photos.sql)
- Recipe families for grouping variations
- Ingredient lifecycle: 5-stage tracking with yield factors, allergens, dietary flags
- Knowledge station (app/(chef)/stations/knowledge/page.tsx) - shift notes search
- CIL dish quality tracker (lib/intelligence/dish-quality-tracker.ts)
- CIL seasonal menu correlation (lib/intelligence/seasonal-menu-correlation.ts)

True voids:

- No structured technique library (methods are free-text, not referenceable catalog)
- No video/photo capture UI for techniques (step photos table exists, no capture flow)
- No recipe version history (no diff/changelog on updates)
- No recipe sharing between chefs (multi-tenant isolated)
- No recipe scaling engine (yield-based multiplication)

Islands:

- CIL seasonal-menu and quality-drift analyzers exist but no visible UI consumer
- Recipe debt computed but no persistent dashboard aggregates across events
- Equipment-technique map (lib/equipment/technique-equipment-map.ts) disconnected from recipe creation

### 2. Communication Void - "Did they even get my message?"

**Severity: MEDIUM**

What exists:

- Massive inquiry pipeline: 30+ files in lib/inquiries/ (create, transition, follow-up, soft-close, escalation, returning-client matching, goldmine scoring)
- Inquiry cockpit with status-based views (app/(chef)/inquiries/\*)
- Communication log table (database/migrations/20260331000028_communication_log.sql)
- Email sequences: tables + template actions (lib/marketing/email-template-actions.ts)
- Remy AI concierge: full conversation system (lib/remy/, components/ai/remy-\*.tsx)
- Client chat (app/(client)/my-chat/)
- Notification system (lib/notifications/, components/notifications/)
- CIL communication cadence tracker (lib/intelligence/client-communication-cadence.ts)
- Follow-up actions and delivery (lib/inquiries/follow-up-\*.ts)
- Client touchpoint rules table

True voids:

- No unified inbox merging all platforms into one stream
- No SMS/text integration (email only)
- No voicemail transcription or call logging tied to client records

Islands:

- CIL cadence analysis computes gaps but doesn't auto-trigger chef reminders
- Email sequences exist in schema but builder-to-sending wiring unclear
- Platform-specific captures (Take-a-Chef) may not route to main pipeline

### 3. Financial Void - "Am I even making money?"

**Severity: MEDIUM**

What exists:

- Expense tracking (lib/expenses/, lib/finance/expense-actions.ts)
- Receipt capture pipeline: OCR (lib/ocr/receipt-parser.ts, lib/ai/receipt-ocr.ts), quick capture, receipt learning
- Receipt-to-price bridge feeding PIE (lib/pricing/receipt-price-bridge.ts)
- Immutable ledger system (ledger_entries)
- Invoice generation (lib/documents/, lib/invoices/)
- Event profitability intelligence (lib/intelligence/event-profitability.ts)
- Revenue forecast + cashflow projections (lib/intelligence/)
- PIE pricing engine: 5-layer, 1.1M prices, Pi bridge
- Quote confidence scoring (lib/intelligence/quote-confidence.ts)
- Tax prep reports (components/reports/tax-prep/)
- Contract financial tracking (lib/contracts/, 2277 lines)

True voids:

- No real-time P&L dashboard aggregating per-event profitability
- No bank account integration or automatic transaction import
- No recurring billing (Stripe exists for events, unclear for recurring)

Islands:

- CIL finance analyzer computes signals but dashboard surfacing unclear
- Revenue opportunity scanner does analysis but actionable chef UI unclear
- Grocery price entries table exists but shopping flow connection unclear

### 4. Operational Void - "I'm doing everything manually"

**Severity: HIGH**

What exists:

- Full event lifecycle FSM (97.2% integrity)
- Prep time estimator (lib/intelligence/prep-time-estimator.ts, 295 lines)
- Prep consolidation (lib/intelligence/prep-consolidation.ts, 405 lines)
- Prep block engine (lib/scheduling/prep-block-engine.ts)
- Shopping routes (app/(chef)/culinary/prep/shopping/, app/(chef)/shopping/bulk/)
- Equipment tracking: inventory, conflict detection, depreciation, checklist (8 files)
- Production planning (lib/calendar/production-planning-actions.ts)
- Capacity planning + saturation detection (lib/scheduling/)
- Multi-event day coordination (lib/scheduling/multi-event-days.ts)
- Travel optimization (lib/intelligence/travel-optimization.ts)
- SOPs system, stocktake tracking

True voids:

- No real-time day-of-event timeline ("you're here now, next step in 15 min")
- No kitchen station assignment (who does what during service)
- No packing list generator (distinct from shopping; equipment + ingredients + supplies for offsite)

Islands:

- Prep consolidation computes optimal groupings but visible consolidated prep list unclear
- Travel optimization exists but no map-based route visualization
- Equipment inventory component exists but may not be in main navigation

Facades:

- Shopping domain thin: only 531 lines in lib/shopping/, no dedicated list generation engine
- Grocery route actions exist without confirmed map/directions integration

### 5. Delegation Void - "I can't hand this off"

**Severity: MEDIUM**

What exists:

- Full staff domain: 22 files in lib/staff/ (actions, availability, briefings, clock-in/out, contractor agreements, performance, scheduling, task assignment, VA tasks, tips)
- Staff event portal (lib/staff/staff-event-portal-actions.ts)
- Staff onboarding (lib/staff/onboarding-actions.ts)
- Task assignment with types (lib/staff/task-assignment-actions.ts)
- VA (virtual assistant) tasks (lib/staff/va-task-actions.ts)
- Role switching and permissions (lib/auth/role-switching.ts)
- Account access delegation (lib/auth/account-access.ts)
- Staff optimization intelligence (lib/intelligence/staff-optimization.ts, 315 lines)
- Labor dashboard (lib/staff/labor-dashboard-actions.ts)

True voids:

- No "emergency delegation" one-click handoff (the bus factor scenario)
- No read-only observer mode for delegated access
- No delegation templates (pre-configured task bundles for "I'm sick" scenarios)

Islands:

- Staff optimization intelligence computes but may not surface as recommendations
- VA task system exists but workflow connection unclear

### 6. Relationship Void - "Who are my people?"

**Severity: LOW** (strongest coverage)

What exists:

- Rich client profiles (lib/clients/)
- Client intelligence ledger (components/client-intelligence/)
- Client lifetime journey (lib/intelligence/client-lifetime-journey.ts)
- Client risk + churn prevention (lib/intelligence/client-risk.ts, churn-prevention-triggers.ts)
- Rebooking predictions (lib/intelligence/rebooking-predictions.ts)
- Network referral chain mapping (lib/intelligence/referral-chain-mapping.ts)
- Client taste profiles, gifting log, followup rules tables
- Dinner Circles as relationship primitive (lib/circles/)
- Client portal: 60+ pages (events, chat, preferences, dietary, documents, referrals, reviews, spending, timeline)
- Returning client matcher (lib/inquiries/returning-client-matcher.ts)
- Dietary trends intelligence, geographic hotspots, untapped markets

True voids:

- No client satisfaction scoring on chef dashboard (no NPS-like score)
- No automated birthday/anniversary/milestone recognition
- No referral tree visualization

Islands:

- Client lifetime journey computed but no chef-facing timeline view confirmed
- Churn prevention triggers compute risk but proactive alerting unconfirmed
- Gifting log table exists but workflow UI not confirmed
- Taste profiles table exists but capture mechanism unclear

### 7. Identity Void - "What even is my brand?"

**Severity: CRITICAL**

What exists:

- Public chef directory (app/(public)/chefs/)
- 38+ public pages (about, services, pricing, FAQ, contact, book, etc.)
- Social media publishing engine: 7 platform adapters (LinkedIn, Meta, Pinterest, TikTok, X, YouTube)
- Content pipeline: calendar, content-ready events, draft editor, social templates
- Marketing domain: A/B testing, campaigns, newsletters, segmentation (lib/marketing/ 20+ files)
- Customer stories capture (lib/marketing/customer-stories.ts)
- Chef social network (lib/social/chef-social/ 14 files)
- Branded illustrations (components/ui/branded-illustrations.tsx)

True voids:

- No individual chef portfolio page (directory lists chefs but no profile pages)
- No testimonial/review display on public surfaces (memory bans fake ones)

Facades:

- Social publishing: 7 adapters but requires developer OAuth setup per platform (no chef will do this)
- Chef directory: clicking a chef leads nowhere meaningful without portfolio pages
- Content pipeline requires multiple manual steps from event to published post
- Chef social network (14 files) may have no active users

### 8. Time Void - "Where did my day go?"

**Severity: CRITICAL**

What exists:

- Calendar system (lib/calendar/)
- Scheduling domain: 40+ files (capacity, prep blocks, time blocks, overlap, burnout, protected time, weekly commands, waitlist)
- Recurring services (lib/recurring/)
- CIL auto-dispatch (lib/cil/auto-dispatch.ts)
- Proactive alerts (lib/intelligence/proactive-alerts.ts)
- Smart scheduling (lib/intelligence/smart-scheduling.ts)
- Task digest (lib/scheduling/task-digest.ts)
- Weekly retro + command center (lib/scheduling/)
- DOP system (lib/scheduling/dop.ts)
- Burnout capacity tracking (lib/scheduling/burnout-capacity-actions.ts)
- Quick expense modal + mobile quick capture (components/)
- Autopilot with detection (lib/autopilot/detection.ts)

True voids:

- No single "today" view: prep schedule, shopping needs, client comms due, events coming, receipts to log
- No time tracking for admin vs creative work
- No batch action system ("do these 5 things at once")

Islands:

- DOP system exists but no confirmed daily dashboard consumes it
- Weekly command center computes plans but UI consumption unclear
- Task digest generates but delivery/display mechanism unconfirmed
- CIL auto-dispatch exists but triggers reducing manual work unclear

## Lifecycle Stage Void States

| Stage                | Key Void                                                |
| -------------------- | ------------------------------------------------------- |
| 1. Inquiry Received  | No auto-acknowledgment, no response time tracking       |
| 2. Discovery         | No checklist UI for 40+ discovery checkpoints           |
| 3. Quote             | No "client viewed" tracking, no 48hr follow-up nudge    |
| 4. Agreement         | No signature tracking dashboard                         |
| 5. Menu Planning     | No client feedback tracking, no draft versioning        |
| 6. Pre-Service       | No unified readiness dashboard                          |
| 7. Payment           | No visual reconciliation of paid vs owed                |
| 8. Service Day       | Two live-status paths not unified                       |
| 9. Post-Service      | No closure projection, unlinked follow-up flows         |
| 10. Client Lifecycle | No win-back triggers, no proactive preference surfacing |

## Built Empty State Infrastructure

- components/ui/empty-state.tsx - Remy mascot (5 moods), CTA, secondary link
- components/onboarding/empty-state-guide.tsx - Feature-specific with tour integration
- components/client-dashboard/empty-state.tsx - Client portal zero-event state
- components/goals/goals-empty-state.tsx
- components/queue/queue-empty.tsx
- PostActionFooter on 6 public token pages (dead-end eliminator)
- Onboarding hub, banner, interview (5-question), steps (5 guided), archetype selector, demo data manager, guided tours

## Cross-Domain Signal Gaps

- recipes -> events: No reverse signal ("events that generated most new recipes")
- events -> financial: Profitability intelligence doesn't feed back to pre-event quoting
- inquiries -> scheduling: Capacity not checked before acceptance
- clients -> communication: Cadence gaps computed but don't trigger reminders
- recipes -> shopping: Auto-generation from event->menu->recipe->ingredients unconfirmed
- staff -> events: No "brief my staff on tonight" one-click generation
- receipts -> pricing: Receipt-price-bridge feeds PIE but no "buy cheapest here" surfaces
- CIL -> notifications: Signals generated but delivery pipeline doesn't route through channel-router

## Run 2026-05-18

STATUS: fresh
DEPTH: deep

SURFACED:

- Master Void: Intelligence-to-Action Last Mile (CIL doesn't trigger notifications)
- Move 1: Wire CIL scanner -> notification channel-router (HIGH, stable)
- Move 2: Wire proactive-alerts -> dashboard alerts-section (HIGH, stable)
- Move 3: Wire cadence + churn triggers -> notification reminders (HIGH, stable)
- Move 4: Collapse dashboard zero-state widgets by data presence (MED, stable)
- Move 5: Wire capacity-check into inquiry acceptance (MED, stable)
- Move 6: Place daily-signal-banner on daily page (MED, stable)
- 8-category void taxonomy with severity ratings
- 10 lifecycle stage void states
- Cross-domain signal gap map
- Corrected Agent 2 overclaims: intelligence IS significantly wired (52 consumers), autopilot IS real, knowledge station IS real

ACTED ON:

- (pending user selection)

SKIPPED:

- Portfolio/social publishing: unstable (OAuth requires developer setup)
- Shopping list auto-generation: premature (engine doesn't exist, would be new feature)
- Discovery checklists: low-yield (40 new UI surfaces, not wiring)
- Vendor dedup (5 implementations): internal refactor, no chef benefit
- Receipt consolidation (4 domains): internal refactor
- Empty state unification (3+ patterns): cosmetic
- Signature dashboard: premature (no data layer)
- Win-back triggers: premature (needs investigation)
- P&L dashboard: premature (new surface)

NEXT TRIGGER: Moves 1+2 live (CIL->notifications + alerts->dashboard). Re-scan to measure void closure from actual usage.
