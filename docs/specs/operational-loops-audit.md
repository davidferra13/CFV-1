# Operational Loops Audit: Persistent Intelligence and Automation

> **Status:** audit-complete
> **Date:** 2026-05-10
> **Purpose:** Map what exists, what's partial, what's missing across all operational loops. Produce build-ready improvement plan.

---

## Executive Summary

ChefFlow has far more operational loop infrastructure than it appears. The problem is not missing systems. The problem is **disconnected systems**. Most of the pieces exist. They do not talk to each other consistently, do not surface their intelligence in one place, and leave the chef to manually bridge gaps that the system could bridge itself.

**Verdict:** ~80% of the ideal loop architecture exists. The remaining 20% is cross-system wiring, deduplication of parallel intelligence surfaces, and closing specific propagation gaps (bulk price cascade, Pi Bridge auto-propagation, lifecycle checkpoint carry-forward).

---

## 1. Loop Inventory: What Exists

### 1A. Pricing / PIE Loop (85% complete)

**What works:**

- 10-tier price resolution chain (`lib/pricing/resolve-price.ts`) with LRU cache
- Pi Bridge: live ethernet API to 1.1M prices (`lib/pricing/pi-bridge.ts`)
- `propagatePriceChange()` cascades: ingredient price change -> recipe costs -> sub-recipe parents -> event `cost_needs_refresh` flag
- 60+ pricing domain files covering anomaly detection, seasonal analysis, census, synthetic pricing, trend intelligence, wholesale, market positioning
- Chef pricing overrides with full provenance
- Cost provenance system tracking source tier, confidence, staleness
- Menu economics and plate cost calculations

**What's partial:**

- `cost_needs_refresh` flag is SET on events but the chef must manually notice it. No proactive notification when an event's cost basis changed.
- Price propagation runs on explicit triggers (receipt scan, PO, chef override, batch refresh) but NOT on Pi Bridge price updates. When Pi gets new prices from OpenClaw nightly, affected recipes/events are not automatically flagged.
- **Menu cost snapshot taken ONCE** at draft->proposed transition (`menu_cost_snapshot_cents` + `menu_cost_snapshot_at` in `lib/events/transitions.ts`). Never retaken if menu is edited post-proposal or ingredient prices change. Snapshot becomes stale silently.
- **No automated per-tenant ingredient re-resolution.** `freshness-enforcer.ts` (PIE Law 4) operates on `openclaw.resolved_prices` (OpenClaw layer), NOT on per-tenant `ingredients.cost_per_unit_cents`. A chef's ingredient price can go stale indefinitely until they click "Refresh All Prices."
- **Quote `total_quoted_cents` is a frozen SERVICE FEE** (from `computePricing()`), not ingredient cost. Drift detection exists (`detectQuoteDrift()`, `getQuoteCostIntelligence()`) but is advisory only, passive read-only diagnostic.
- **3-layer provenance stack already built** but not surfaced prominently: recipe provenance (40pts coverage, 25pts freshness, 20pts confidence, 10pts unit cleanliness), menu provenance (weighted aggregate), quote cost guard (warns at quote send if insufficient confidence). All in `lib/costing/`.
- **`recipe_cost_summary` is a DB VIEW** so reads are always fresh, but underlying `computed_cost_cents` on `recipe_ingredients` may be stale if `propagatePriceChange()` hasn't run.
- **Ingredient prices silently degrade:** A receipt-sourced price (confidence 1.0) decays via step function over time. After 90 days, the system falls through to lower tiers. Chef is never told "your prices are aging."

**What's missing:**

- **Automatic nightly cost-drift detection:** When Pi prices update overnight, scan all upcoming events and flag any where cost drifted > X% from quoted price. Deterministic, no AI needed.
- **Cost-drift notification in proactive alerts:** `remy-proactive-alerts.ts` does NOT check `cost_needs_refresh`. Easy add.
- **Quote-vs-current cost comparison widget:** On event detail, show "quoted at $X, current cost $Y, delta $Z."
- **Periodic per-tenant ingredient refresh:** Scheduled job that re-resolves prices for active tenants' ingredients (weekly or when Pi Bridge reports new data for their region). Closes the gap where `freshness-enforcer.ts` only refreshes the OpenClaw layer.

### 1B. Recipe / Menu / Event Loop (80% complete)

**What works:**

- `recipe_sub_recipes` table for reusable components (simple syrups, vinaigrettes, doughs, etc.)
- Sub-recipe cost propagation: parent recipes update when child recipe costs change
- Menu -> Dishes -> Components -> Recipes -> Ingredients: full relational chain
- Completion Contract (`lib/completion/`) with recursive evaluators for event, client, menu, recipe, ingredient
- CompletionCard UI component showing score, missing items, next action
- Flexible creation order: events can exist without menus, menus without recipes, recipes standalone

**What's partial:**

- Recipe reuse tracking: `recipe_sub_recipes` links parent/child, but there's no "where is this recipe used?" surface. Chef can't see all menus/events using a given recipe from the recipe detail page.
- When a recipe is edited (method, yield, timing changed), no notification goes to events using that recipe. Only PRICE changes propagate.
- Ingredient substitution in one recipe doesn't flag other recipes using the same ingredient pattern.

**Already exists (was initially missed):**

- **Recipe usage panel:** `components/recipes/recipe-usage-panel.tsx` already shows which menus use a recipe. Rendered on `recipe-detail-client.tsx`. Calls `getRecipeUsage()` from `lib/menus/menu-intelligence-actions.ts`. This loop is CLOSED for menu usage. May need extension to show upcoming events using the recipe.

**What's missing:**

- **Recipe edit propagation alerts:** When a recipe's method/yield/timing changes, flag events within 14 days that use it. The chef should know their prep timeline changed.
- **Component reuse suggestions:** When adding a component to a menu, surface "you already have Lemon Vinaigrette in 4 recipes." Deterministic matching by recipe name/ingredients.
- **Bulk price cascade gap:** `bulkUpdateIngredientPrices()` in `lib/recipes/bulk-price-actions.ts` updates `ingredients.last_price_cents` but only calls `revalidatePath()`, NOT `propagatePriceChange()`. Recipe snapshot costs are NOT updated and events are NOT flagged. This is a concrete staleness gap.

### 1C. Communication Loop (75% complete)

**What works:**

- Canonical communication pipeline: `conversation_threads` + `communication_events` + `communication_action_log`
- Inbound webhooks for email (Cloudflare) and SMS (Twilio)
- Managed channel registry (Gmail, Twilio per-tenant)
- Thread resolution and client linkage
- Follow-up tracking system (`app/api/scheduled/follow-ups/`, `follow-up-sends/`)
- Client follow-up rules (`app/api/scheduled/client-followup-rules/`)
- Stale inquiry detection in proactive alerts
- Gmail send/sync/threading integration
- Template messages and quick replies (`lib/communication/template-actions.ts`, `quick-reply-actions.ts`)
- Communication triage in inbox

**What's partial:**

- **Message classification:** `communication_classification_rules` table exists with per-chef configurable rules (contains/equals/starts_with matching on sender, content, source, direction). Default seeds: "urgent" -> priority 100, "available" -> availability_request, "book" -> booking_intent. But these are keyword-only; cannot distinguish "change the guest count" (event modification) from "book a dinner" (new inquiry) semantically. `triage-suggestions.ts` analyzes 90 days of inquiry patterns and suggests rules (slow channels, high guest count, repeat clients) but doesn't auto-classify intent.
- **Returning client detection:** Client linkage works when phone/email matches an existing client (pipeline.ts `resolveClientId` checks email then phone). But no proactive "this person booked with you 8 months ago" enrichment surfaced in the thread.
- **Channel privacy/opt-in:** Managed channels exist per-tenant. Business hours config exists (`business_hours_config` table). Quiet hours for notifications. But no "personal vs business phone" filter for which inbound messages to ingest vs ignore.
- **Follow-up intelligence:** Three independent follow-up systems: (A) silence timers (24h auto-timer on inbound, cleared on outbound), (B) stale inquiry detection (inquiries in awaiting_client/quoted without outbound in N days), (C) follow-up sequences (configurable multi-step, stored in `follow_up_sequences`). These operate without coordination; no unified "this conversation needs attention" signal.
- **Entity linking:** System SUGGESTS links (inquiry or event) with confidence scores (0.92 single inquiry, 0.68 multiple, 0.57 events) but chef must manually accept. No content-based matching (parsing dates or event references from message text).
- **Website form bypass:** Public inquiries go directly to `inquiries` table without creating a `communication_event`. Not visible in communication inbox unless client later emails/texts.

**What's missing:**

- **Inbound message intent classifier:** Deterministic first (regex patterns for common phrases: "change the date", "how much for", "cancel", "book again"), AI fallback for ambiguous. Tag messages with intent. Surface to chef: "3 messages need attention: 1 date change, 1 new inquiry, 1 payment question."
- **Returning client enrichment:** When a known client contacts, auto-pull their history: last event, preferences, dietary restrictions, spending total. Show this context INLINE in the conversation thread.
- **Channel boundary controls:** Settings page where chef marks a phone number as "business only" (ingest everything) vs "mixed use" (require keyword or opt-in). For mixed-use, only ingest messages that match a known client or contain business keywords.
- **Conversation-to-event linking:** When a conversation mentions an upcoming event, auto-suggest linking. "This conversation mentions your dinner on June 15. Link it?"

### 1D. Client Intelligence Loop (78% complete - higher than initially assessed)

**What works:**

- 30-panel client CRM with exceptionally rich schema (kitchen details, personality notes, formality level, tipping patterns, vibe notes, wow factors, red flags, acquisition cost)
- Unified timeline (`lib/clients/unified-timeline.ts`) spanning 13 interaction sources (events, inquiries, messages, notes, quotes, ledger, reviews, etc.)
- **Client preference learning engine** (`lib/clients/preference-learning-actions.ts`): `learnClientPreferences()` analyzes all past events to extract patterns (favorite day, guest count range, occasions, service styles, cuisines, dietary). Stored in `client_preference_patterns` with confidence scores.
- **Repeat client intelligence** (`lib/clients/intelligence.ts`): single-call `getRepeatClientIntelligence()` returns isRepeat, eventCount, totalSpent, lovedDishes, dislikedDishes, allergens, feedback scores, milestones, venue notes.
- **Culinary profile vector** (`lib/clients/client-profile-service.ts`): full evidence-based profiling with menu planning integration via `mapClientProfileVectorToMenuClientTasteSummary()` and `buildDietaryConflictsFromVector()`.
- **Menu history** (`lib/clients/menu-history.ts`): all dishes/components served across completed events, component frequency, distinct cuisines. Designed to avoid repeating menus.
- **Taste profile** (`lib/clients/taste-profile-actions.ts`): persistent per-client.
- **Rebook data** (`lib/events/client-rebook-actions.ts`): prefills occasion, guest_count, location, dietary_notes from last event.
- **Last event prefill** on New Inquiry form (`lib/clients/actions.ts`).
- **Client deduplication** (`lib/clients/deduplication.ts`, `cross-platform-matching.ts`): email + phone + fuzzy name matching, full merge with audit log.
- Spending dashboard, LTV calculations, profitability tracking, client tiers.

**What's partial:**

- **Rebook prefill is shallow:** `getRebookData()` carries only 6 fields (occasion, guest_count, location x3, dietary_notes). Does NOT carry forward: service style, kitchen notes, equipment needs, staff preferences, menu approach, budget, or any of the ~150 lifecycle checkpoints.
- **Lifecycle checkpoints don't carry forward:** `service_lifecycle_progress` is per-inquiry/event. When a returning client books again at the SAME venue, all 150 checkpoints reset. Stage 2 Discovery data (kitchen situation, equipment, parking, dining space, vibe, service style, drink expectations) is re-gathered from scratch.
- **Returning client detection is passive:** `createClientFromLead()` is idempotent by email (returns existing client). But different email = new record. No proactive blocking at inquiry submission. Chef must notice and merge via Potential Duplicates Card.
- **Post-event learning depends on chef action:** `s9_guest_preferences_noted` and `s9_venue_notes_updated` checkpoints are manual (no `auto_detect_rule`). If chef doesn't fill them in, operational insights are lost.
- **No formal inquiry state machine:** Unlike the gold-standard event FSM (dual-layer enforcement, atomic transitions, audit trail), inquiry status transitions are implicit and scattered. No `TRANSITION_RULES`, no permission enforcement, no state change audit trail.
- **Quotes and proposals are parallel but disconnected:** Pipeline uses proposals (`createProposalFromLead` -> `createEventFromProposal`), while quotes have their own lifecycle. Chef might create both for same inquiry with no cross-reference.

**What's missing:**

- **Lifecycle checkpoint carry-forward for returning clients:** When a client books again, seed Stage 2 Discovery checkpoints from their profile and last completed event's venue notes. Kitchen situation, parking, equipment don't change between visits.
- **Rebooking signals in proactive alerts:** Deterministic: client's last event was 6+ months ago, 3+ events total, no active event. Surface: "Consider reaching out to [client] for rebooking."
- **Rich rebook prefill:** Extend `getRebookData()` to include service style, kitchen notes, equipment list, budget range, staff preferences from last event AND client profile patterns.

### 1E. Automation / Scheduling Loop (92% complete)

**What works:**

- Full automation engine (`lib/automations/engine.ts`) with 15 trigger events, 10 action types
- Cooldown deduplication prevents duplicate firings
- Execution logging and audit trail, feeds back into CIL via `notifyCIL()`
- **55+ scheduled jobs** across 5min/15min/30min/hourly/6h/daily cadences covering: Gmail sync, AI queue drain, stale leads, follow-ups, client re-engagement, dormancy nudge, campaigns, proactive alerts, revenue forecasts, RSVP reminders, social publishing, loyalty expiry, service readiness, recurring auto-generation, FDA recall checks, brand monitoring, wellbeing signals, momentum snapshots, morning briefings, and more
- **12 proactive alert rules** (all deterministic, no LLM): prep lists, grocery lists, overdue invoices/installments, stale inquiries, payments, birthdays, weather, post-event AAR capture, dormant clients, stuck events, high-risk events
- Automation presets (6 types) and rule templates (3 categories) for quick setup
- **25+ chef-configurable automation settings** (follow-up intervals, no-response thresholds, event approaching alerts, auto-expiry, payment reminders, deposit defaults, pre-event reminder intervals)
- User-configurable rules with condition builder UI (field/op/value)

**What's partial:**

- **Automation activity feed:** Execution data is logged to `automation_executions` table and CIL, but no dedicated chef-facing activity feed shows "what automations did today." Chef must check individual surfaces.
- **Cross-system triggers:** Automations trigger on entity events (inquiry created, event status changed) but not on data-level events (price changed, recipe edited, client preference updated).

**What's missing:**

- **Automation activity feed:** Chronological feed reading from `automation_executions` + `communication_action_log`. "Today: sent follow-up to Jane, flagged stale inquiry from Bob." Low effort, reads existing data.
- **Price-change trigger:** Add `price_changed` to TriggerEvent. When Pi Bridge prices update, fire automations that check affected recipes/events.

### 1F. CIL / Continuous Intelligence Layer (82% complete - much higher than initially assessed)

**What works:**

- Per-tenant SQLite knowledge graph (`storage/cil/{tenantId}.db`) with WAL mode
- 7 Phase 1 signal sources: activity log, event transitions, ledger entries, Remy memories, automation executions, inventory transactions, SSE bus
- Phase 2 pattern scanner: dormant clients, weakening relations, isolated entities, high-velocity anomalies, milestones, cohesiveness gaps
- Phase 3 analyzers across 6 domains: finance (revenue decline/growth, overdue invoices, expense spikes), clients (dormant, at-risk, VIP upcoming), calendar (overload, dead spots, pace decline), inventory (price spikes, waste patterns), reputation (testimonial opportunities, rating trends), pipeline (stale leads urgency 5, expiring proposals, unsigned contracts)
- Daily decay job with entity-type-specific half-lives
- Remy context integration: both CIL insights AND proactive signals injected into system prompt
- **UI consumers EXIST:**
  - `components/cil/daily-signal-banner.tsx` on Daily page
  - `components/cil/domain-signals.tsx` + `domain-signals-client.tsx` on Calendar and Clients pages (domain-filtered)
  - Signal actions: `getSignalsForDisplay()`, `getSignalsByDomain()`, `dismissSignalAction()`, `actOnSignal()`
- `lib/intelligence/` directory has 50+ intelligence modules (business health, cashflow, churn prevention, client lifetime journey, event profitability, seasonal demand, smart scheduling) all feeding Remy context
- Automation executions feed back into CIL via `notifyCIL()` with source "automation"

**What's partial:**

- **CIL signals surface on Daily/Calendar/Clients but NOT on the main Dashboard.** The dashboard shows Remy proactive alerts but not CIL domain signals. Two separate intelligence surfaces.
- **CIL proactive signals and Remy proactive alerts are parallel systems** producing similar outputs (both detect dormant clients, both flag stale leads) without deduplication.

**What's missing:**

- **Dashboard-level CIL signal widget:** CIL signals appear on secondary pages (Daily, Calendar, Clients) but not the main Dashboard landing page. A top-3 signal summary on the dashboard would close this gap.
- **CIL/Remy alert deduplication:** Both systems detect dormant clients, stale leads, etc. independently. A deduplication layer would prevent the chef seeing the same insight from two surfaces.

### 1G. Prep / Shopping / Purchasing Loop (80% complete)

**What works:**

- Shopping list generation from menus/events (`lib/culinary/shopping-list-actions.ts`)
- Grocery list generation (`lib/grocery/generate-grocery-list.ts`)
- Purchase order system (`lib/inventory/purchase-order-actions.ts`)
- Prep timeline with active timers, countdowns, station assignments
- Pre-service checklist (auto-generated)
- Inventory tracking with reorder alerts
- Receipt scanning with price cascade

**What's partial:**

- **Shopping list auto-generation:** Lists CAN be generated but require chef to click "Generate." Not auto-generated when a menu is assigned to an event.
- **Prep timeline from recipes:** Recipes have timing data but the prep timeline doesn't automatically sequence based on recipe dependencies (e.g., brine must start 24h before cooking).

**What's missing:**

- **Auto-generate shopping list on menu assignment:** When menu is linked to confirmed event, auto-generate shopping list draft. Chef reviews, doesn't build from scratch.
- **Prep dependency sequencing:** Use recipe timing data + sub-recipe relationships to auto-generate a reverse-timeline prep schedule. "Start brine Tuesday 6pm. Prep vinaigrette Wednesday 2pm. Final plating Thursday 4pm." Deterministic from recipe data.

---

## 2. Data Staleness Map

Where data becomes static, disconnected, or manually dependent:

| Data Point                                      | Current State                                                                         | Staleness Risk                                                                                | Fix                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Recipe cost after Pi update                     | `cost_needs_refresh` flag set on manual triggers only                                 | HIGH: Nightly Pi imports don't trigger recipe cost recalc                                     | Wire Pi Bridge sync to `propagatePriceChange`              |
| Event cost vs quoted cost                       | Quote snapshot in `quote_state_transitions`, live cost computed                       | MEDIUM: No comparison surface                                                                 | Build quote-vs-current widget                              |
| Client preferences from conversations           | Preference learning engine exists but post-event capture is manual (checkpoint-based) | MEDIUM: Engine runs on past events, but new preferences from conversations not auto-extracted | Extend preference learning to analyze conversation text    |
| Lifecycle checkpoints for returning clients     | Per-event, resets each booking                                                        | HIGH: 150 checkpoints of operational discovery reset even for same client + venue             | Seed from client profile + last event's venue notes        |
| Shopping list after menu change                 | Must manually regenerate                                                              | MEDIUM: Chef forgets to regenerate                                                            | Auto-regenerate on menu mutation                           |
| Completion score                                | Computed on-demand per page load                                                      | LOW: Always fresh when viewed                                                                 | No fix needed                                              |
| Client aggregates (LTV, event count, avg spend) | Denormalized on `clients` table                                                       | MEDIUM: Can drift from `clientFinancialSummary` view truth                                    | Periodic reconciliation job or remove denormalized columns |
| CIL insights                                    | Generated hourly, not surfaced                                                        | HIGH: Intelligence generated but invisible                                                    | Dashboard widget                                           |
| Follow-up state                                 | Time-based scheduled jobs                                                             | MEDIUM: No context awareness                                                                  | Add conversation-intent detection                          |
| Recipe usage across system                      | Not tracked/surfaced                                                                  | MEDIUM: Chef can't see impact of recipe changes                                               | Build usage map query                                      |

---

## 3. Manual Friction Points

Where the chef currently must press a button, remember context, or manually bridge systems:

1. **"Refresh All Prices"** - Per-tenant ingredient prices don't auto-refresh when Pi Bridge gets new data. Chef must click button.
2. **"Generate shopping list"** - Must click after menu assignment, not automatic.
3. **"Check if costs changed"** - `cost_needs_refresh` flag exists but is not in proactive alerts. Chef must notice on event page.
4. **"Link conversation to event"** - System suggests links with confidence scores but chef must manually accept.
5. **"Re-discover returning client's venue"** - 150 lifecycle checkpoints reset for same client at same venue. Kitchen/parking/equipment re-gathered from scratch.
6. **"Track automation activity"** - 55+ cron jobs and automations run, data logged to `automation_executions`, but no dedicated activity feed.
7. **"Compare quoted vs current cost"** - Drift detection exists (`detectQuoteDrift()`) but no chef-facing comparison widget on event detail.
8. ~~"Find where recipe is used"~~ - **SOLVED:** `recipe-usage-panel.tsx` already exists on recipe detail page.
9. ~~"Review CIL findings"~~ - **SOLVED:** CIL signals surface on Daily, Calendar, and Clients pages via `domain-signals.tsx`.

---

## 4. Ideal Loop Architecture

### Design Principles

1. **Deterministic first, AI never.** Every loop described below uses formulas, database queries, and conditional logic. AI is restricted to text interpretation (parsing unstructured messages) and ONLY with chef approval gates.
2. **Non-blocking side effects.** All propagation is try/catch wrapped. If a side effect fails, the primary action succeeds.
3. **Opt-in intelligence.** The chef controls what channels are ingested, what preferences are saved, what automations run. The system surfaces; the chef decides.
4. **Explainable connections.** Every auto-generated link shows WHY. "Linked because client email matches." "Cost updated because ingredient price changed from $3.20 to $3.85 via Pi Bridge."
5. **Audit trail.** Every automated action logged. Chef can review what the system did and undo if needed.

### The Five Persistent Loops

```
LOOP 1: PRICE PROPAGATION (deterministic)
Pi Bridge nightly sync
  -> detect price changes for chef's ingredients
  -> propagatePriceChange() cascade
  -> recipe costs update
  -> sub-recipe parents update
  -> event cost_needs_refresh = true
  -> proactive alert: "3 events have cost changes"
  -> quote-vs-current comparison updates

LOOP 2: OPERATIONAL READINESS (deterministic)
Event status change OR time-based (daily scan)
  -> Completion Contract evaluates recursively
  -> Missing requirements surfaced
  -> Proactive alerts for blocking items
  -> Auto-generate prep timeline from recipe timing
  -> Auto-generate shopping list draft on menu assignment
  -> Pre-service checklist refresh

LOOP 3: COMMUNICATION TRIAGE (deterministic + AI boundary)
Inbound message via any channel
  -> normalize through managed-ingest pipeline
  -> deterministic client matching (email/phone)
  -> deterministic intent classification (regex patterns)
  -> AI fallback ONLY for ambiguous intent (with confidence score)
  -> auto-link to existing conversation thread
  -> auto-suggest event linkage if date/client matches
  -> priority badge: urgent / action-needed / informational
  -> returning client context auto-loaded

LOOP 4: CLIENT CONTINUITY (deterministic)
Any client interaction (event, message, payment, feedback)
  -> unified timeline updated
  -> CIL signal ingested
  -> rebooking intelligence check (last event > 6mo, 3+ events)
  -> proactive alert for rebooking opportunities
  -> on new event creation: offer "start from last event" template

LOOP 5: INTELLIGENCE SURFACING (deterministic)
CIL hourly scan results + proactive alerts + automation executions
  -> merged into single operational feed
  -> dashboard widget: "3 things need attention"
  -> priority-ordered, deduplicated
  -> chef sees ONE surface for "what do I need to know"
```

---

## 5. Priority Implementation Plan

Ordered by: impact on operational calm, implementation effort, risk.

### Tier 1: Quick Wins (1-2 days each, high impact, low risk)

#### 1.1 Add `cost_needs_refresh` to proactive alerts

- **Files:** `lib/ai/remy-proactive-alerts.ts`
- **Change:** Add `checkCostDrift()` function that queries events where `cost_needs_refresh = true` and `event_date > today`. Generate alert with event name, client, and link.
- **Risk:** None. Additive. Non-blocking.
- **Validation:** Unit test: create event with `cost_needs_refresh = true`, verify alert generated.

#### 1.2 Fix bulk price cascade gap

- **Files:** `lib/recipes/bulk-price-actions.ts`
- **Change:** After `bulkUpdateIngredientPrices()` writes to `ingredients.last_price_cents`, call `propagatePriceChange()` with the updated ingredient IDs. Currently only calls `revalidatePath()`, skipping the entire recipe/event cost cascade.
- **Risk:** Low. `propagatePriceChange()` is already battle-tested. Wrap in try/catch as non-blocking side effect.
- **Validation:** Bulk-update ingredient prices via GroceryQuotePanel, verify recipe `total_cost_cents` updates and affected events get `cost_needs_refresh = true`.

#### 1.3 CIL signal summary on main Dashboard

- **Files:** Dashboard page (`app/(chef)/dashboard/`), reuse existing `components/cil/domain-signals.tsx`
- **Change:** CIL signals already render on Daily, Calendar, and Clients pages via `daily-signal-banner.tsx` and `domain-signals.tsx`. Add a top-3 cross-domain signal summary to the main Dashboard landing page using the existing `getSignalsForDisplay()` action. The component infrastructure already exists; this is a placement/wiring change.
- **Risk:** None. Component and data layer already built.
- **Validation:** Ensure CIL signals appear on Dashboard alongside existing Remy alerts widget.

#### 1.4 Automation activity feed

- **Files:** New component reading `automation_executions` + `communication_action_log`
- **Change:** Chronological feed of automated actions: "Sent follow-up to Jane (2h ago). Flagged stale inquiry from Bob (6h ago). Updated 3 recipe costs (overnight)."
- **Risk:** None. Read-only.
- **Validation:** Trigger automations, verify feed shows entries.

### Tier 2: Medium Effort (3-5 days each, high impact)

#### 2.1 Pi Bridge price-change propagation

- **Files:** `lib/pricing/pi-bridge.ts`, `app/api/scheduled/passive-store-sync/route.ts` or new scheduled route
- **Change:** After Pi Bridge nightly sync, diff old vs new prices for ingredients the chef actually uses. Call `propagatePriceChange()` for changed ingredients. This closes the biggest gap in the pricing loop.
- **Risk:** Medium. Must be non-blocking. Must handle large ingredient sets efficiently. Batch processing with chunking.
- **Validation:** Mock Pi price change for ingredient used in recipe+event. Verify recipe cost updates and event flagged.

#### 2.2 Auto-generate shopping list on menu assignment

- **Files:** Event mutation actions (where menu_id is set on event), `lib/grocery/generate-grocery-list.ts`
- **Change:** When `menu_id` is set/changed on a confirmed+ event, auto-generate shopping list draft as non-blocking side effect. Chef sees draft, reviews/edits, doesn't build from scratch.
- **Risk:** Low. Draft only, not committed. Chef reviews.
- **Validation:** Assign menu to confirmed event, verify shopping list draft created.

#### 2.3 Quote-vs-current cost comparison

- **Files:** Event detail page, new comparison component
- **Change:** On event detail, if event has a quote: show "Quoted: $X | Current: $Y | Delta: $Z (+N%)". Pull quoted amount from `quote_state_transitions` or `quotes`. Compute current from live recipe costs.
- **Risk:** Low. Read-only comparison.
- **Validation:** Create event with quote, change ingredient price, verify delta shown.

#### 2.4 Returning client context in conversations + lifecycle carry-forward

- **Files:** Communication inbox/thread view, `lib/events/client-rebook-actions.ts`, `lib/lifecycle/actions.ts`
- **Change:** Two parts:
  - (a) When viewing a conversation with a matched client, auto-load sidebar using existing `getRepeatClientIntelligence()`: isRepeat, eventCount, totalSpent, lovedDishes, allergens, venue notes. Data already exists, just not surfaced in the thread view.
  - (b) When creating a new event for a returning client at a known venue, seed lifecycle Stage 2 checkpoints (kitchen, parking, equipment, dining space) from last completed event's data. Extends `getRebookData()` to include service style, kitchen notes, equipment, budget, staff prefs.
- **Risk:** Low. Part (a) is read-only. Part (b) creates pre-filled checkpoints marked `auto_detected` (chef can override).
- **Validation:** Open conversation with repeat client, verify intelligence sidebar. Create new event for returning client, verify Discovery checkpoints pre-seeded.

### Tier 3: Larger Efforts (1-2 weeks, transformational)

#### 3.1 Inbound message intent classifier

- **Files:** `lib/communication/pipeline.ts` (extend `ingestCommunicationEvent`), new `lib/communication/intent-classifier.ts`
- **Change:** After message ingestion, run deterministic classifier:
  - Regex patterns for date changes ("change the date", "reschedule", "move it to")
  - Regex patterns for new inquiries ("looking for a chef", "how much for", "available on")
  - Regex patterns for cancellations ("cancel", "won't be needing")
  - Regex patterns for payments ("sent payment", "paid", "receipt")
  - Fallback: tag as "general" (no AI needed for V1)
  - Store intent tag on `communication_events` row
- **Risk:** Medium. Must not slow ingestion pipeline. Run as non-blocking side effect.
- **Validation:** Send test messages with known intents, verify classification.

#### 3.2 CIL-to-proactive-alerts bridge

- **Files:** `lib/cil/scanner.ts`, `lib/ai/remy-proactive-alerts.ts`
- **Change:** After CIL scanner runs, check for actionable findings (dormant clients, activity spikes, weak relations). Convert to `AlertCandidate` format and merge with existing proactive alerts. Deduplicate by entity+type.
- **Risk:** Low. Both systems already work. Just piping output from one to input of other.
- **Validation:** Run scanner with test data showing dormant client, verify alert appears.

#### 3.3 Unified operational feed ("What needs attention")

- **Files:** New dashboard component, new `lib/operations/attention-feed.ts`
- **Change:** Merge three sources into one priority-ordered feed:
  1. Proactive alerts (already has priority)
  2. CIL scanner insights (map to priority)
  3. Automation execution results (filter to actionable only)
  - Deduplicate by entity. Show top 5 on dashboard. Full feed on dedicated page.
- **Risk:** Low. Reads from existing data sources.
- **Validation:** Generate alerts, scanner findings, and automation results. Verify unified feed merges and deduplicates.

#### 3.4 Channel boundary controls

- **Files:** Settings page, `lib/communication/managed-ingest.ts`
- **Change:** Add `channel_mode` to managed channel config: "business" (ingest everything) or "mixed" (filter by known contacts + business keywords). For mixed mode, messages from unknown numbers that don't match business patterns are silently dropped from ChefFlow (not stored).
- **Risk:** Medium. Must not lose legitimate business messages. Default to "business" (ingest everything). Chef must explicitly opt into filtering.
- **Validation:** Configure mixed mode, send test messages from unknown number without business keywords, verify not ingested. Send from known client, verify ingested.

---

## 6. What Should NOT Be Automated

These require human judgment and must remain manual:

1. **Recipe creation and editing** - Chef's creative IP. System assists with costing and usage tracking, never generates or modifies recipes.
2. **Quote approval and sending** - System calculates, chef decides the price and sends.
3. **Client preference confirmation** - System can SUGGEST extracted preferences, chef must APPROVE before saving.
4. **Event status transitions** - FSM enforces valid transitions, chef initiates them.
5. **Message responses** - Templates and quick replies assist, chef always sends. No auto-reply to client messages.
6. **Menu design** - System shows cost implications, chef makes creative decisions.
7. **Financial adjustments** - System flags overdue invoices, chef decides action.

---

## 7. Architecture Constraints

### No New Tables Required for Tier 1-2

All quick wins and medium efforts use existing tables and data. The only schema consideration is adding an `intent_tag` column to `communication_events` for Tier 3.1.

### No AI Required for Tier 1-2

Every Tier 1 and Tier 2 improvement is purely deterministic. Tier 3.1 (intent classifier) is deterministic-first with optional AI fallback.

### Non-Breaking

All changes are additive side effects. No existing functionality is modified. Existing pages, actions, and scheduled jobs continue working unchanged.

### Performance

- Price propagation batches: chunk to 50 ingredients per cycle, non-blocking
- CIL-to-alerts bridge: runs after scanner completes, adds <1s
- Usage map query: joins through 4 tables, index on recipe_id already exists
- Shopping list auto-generation: same function chef already uses manually, just triggered automatically

---

## 8. Validation Approach

Each tier has a clear validation path:

| Tier | Method           | Criteria                                                 |
| ---- | ---------------- | -------------------------------------------------------- |
| 1.1  | Unit test        | Alert generated for events with cost_needs_refresh       |
| 1.2  | Playwright       | Recipe detail shows usage in menus and events            |
| 1.3  | Playwright       | Dashboard widget renders CIL insights                    |
| 1.4  | Playwright       | Activity feed shows recent automated actions             |
| 2.1  | Integration test | Pi price change triggers recipe cost update + event flag |
| 2.2  | Integration test | Menu assignment creates shopping list draft              |
| 2.3  | Playwright       | Event detail shows quoted vs current cost                |
| 2.4  | Playwright       | Conversation shows client context sidebar                |
| 3.1  | Unit test        | Known message patterns classified correctly              |
| 3.2  | Integration test | Scanner finding becomes proactive alert                  |
| 3.3  | Playwright       | Unified feed merges all attention sources                |
| 3.4  | Integration test | Mixed-mode channel filters non-business messages         |

---

## 9. The End State

When all three tiers are complete, the chef's experience changes from:

**Before:** "Let me check the inbox. Now check recipe costs. Now check if my shopping list is still right. Now check if any clients went quiet. Now check if my quotes are still accurate. Now check if any automations ran."

**After:** Opens ChefFlow. Dashboard shows: "2 events have cost changes (ingredients went up 8%). Jane's birthday is Thursday. Shopping list for Saturday's dinner is ready for review. Bob hasn't responded in 5 days. You quoted the Miller dinner at $2,400 but current costs are $2,580."

One glance. Full picture. Operational calm.
