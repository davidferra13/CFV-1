# ChefFlow Omninet: Synthetic Organism Audit & Wiring Mission

> **Purpose:** Audit ChefFlow as a complete biological operating system. Every organ must pump. Every nerve must fire. Every bloodstream must flow. The chef should wake up, open ChefFlow, and have the system already know what needs doing, already be doing most of it, and only surface the irreducible human decisions.

---

## The Thesis

ChefFlow is not an app. It is a **synthetic biological program** that runs a chef's entire business as a living organism. The chef is the brain giving high-level intent. ChefFlow is the body executing it.

The standard for "done" is: **the chef does nothing unless only a human can.** Price lookups, scheduling conflicts, follow-up reminders, invoice generation, ingredient sourcing, dietary cross-checks, prep timelines, client communication cadence: all autonomous. The chef's job is taste, relationships, and creative decisions. Everything else is the organism's job.

---

## The Body Systems (Canonical Reference: `docs/specs/chefflow-human-body-master-transcript-2026-05-15.md`)

### Heart: Event Lifecycle FSM (`lib/events/fsm.ts`)

The heartbeat. Every event pumps through: `Inquiry -> Quote -> Event -> Payment -> Confirmed -> In Progress -> Completed -> Follow-up`. This FSM is the central clock. **Every other system synchronizes to it.**

**Audit questions:**

- Does every state transition trigger the correct downstream systems? (Rails update, CIL signal, Remy context refresh, Circle notification, financial ledger entry, calendar sync, prep timeline generation)
- Are there transitions that happen silently without propagating?
- Does the operating spine (`lib/events/operating-spine.ts`) surface the correct next-action card for every FSM state?

### Bloodstream: Dinner Circles (`lib/dinner-circles/`, 28 files, 50+ integration points)

Dinner Circles are not a feature. They are the **circulatory system**. Every piece of information flows through them: menus, dietary restrictions, guest lists, sourcing decisions, approvals, reminders, communication, feedback.

**The bloodstream mandate:** If information exists about a dinner and it is NOT flowing through the Circle, that is a circulatory blockage. Find it. Wire it.

**Audit questions:**

- Do all 28 Circle modules (`event-circle.ts`, `approval-actions.ts`, `collaborator-bridge-actions.ts`, `dietary-reminder-actions.ts`, `sourcing-actions.ts`, `memory-rotation.ts`, `fulfillment-mode-contract.ts`, `pantry-grocery-contract.ts`, etc.) have active consumers in the UI?
- Is the Circle the single coordination surface for multi-party events, or do some workflows bypass it?
- Does `marisol-bridge-actions.ts` (cross-circle coordination) actually fire for overlapping event dates?
- Does `rotation-memory-contract.ts` actively prevent menu repetition for recurring clients?
- Are corporate circles (`corporate-actions.ts`) wired into the inquiry pipeline for corporate event requests?

### Nervous System: Rails + SSE + CIL Signals

Three parallel nervous systems that must fire together:

1. **God Mode Rail** (`lib/discovery/god-mode-assembly.ts`) -- 20+ domain resolvers feed tiered priority items. RailStrip on every page, RailFull on dashboard. The chef's peripheral vision.
2. **SSE Bus** (`useSSE()` hook, `broadcast()` after mutations) -- Real-time nerve impulses.
3. **CIL Signals** (`lib/cil/`, 24 files, 8 domain analyzers) -- Background pattern detection. Hourly scans producing `ProactiveSignal[]` objects.

**Audit questions:**

- Do all 8 CIL analyzers (calendar, finance, inventory, pipeline, reputation, cannabis, clients, commitment) have Rail sources wired? Check `lib/rail/sources/` and `lib/discovery/resolvers/`.
- When CIL detects a pattern (e.g., "client always books 3 weeks before event"), does that intelligence surface anywhere the chef can see it?
- Does the Ulysses Commitment Analyzer (`docs/specs/cil-commitment-analyzer.md`) actually fire when readiness gates are overridden?
- Are SSE events broadcasting on every mutation that changes Rail priority? Or do some mutations leave the Rail stale until next page load?

### Brain: CONTEXT.md + Remy Memory + CIL Graph

The organism's self-model. CONTEXT.md defines language. Remy's memory (8 categories, 90-day decay, IndexedDB) stores conversational context. CIL's observation graph stores behavioral patterns.

**Audit questions:**

- Does Remy's context loading (`formatInsightsForRemy`, `formatSignalsForRemy`) pull from ALL three knowledge sources (CONTEXT.md terms, Remy memory, CIL signals)?
- When the chef asks Remy "how's my week looking?", does Remy synthesize calendar + financial + prep + client communication state, or just calendar?
- Are Remy's 130+ deterministic commands covering every domain, or are there domains where Remy falls back to generic LLM responses?

### Digestive System: PIE + OpenClaw (`lib/pricing/`, `lib/openclaw/`)

Raw external data (store prices, USDA data, seasonal patterns, commodity indices) enters through OpenClaw on the Pi, gets normalized through 11 synthesizers, and emerges as actionable pricing intelligence through the 11-tier resolution chain.

**The PIE autonomy mandate (Law 1):** PIE runs 24/7 without human input. Every ingredient in the Census has a price. Always. No exceptions.

**Audit questions:**

- Is the Pi Price Bridge (`port 7700`, systemd service) healthy and serving live data?
- Are all 11 tiers of `resolve-price.ts` actually reachable, or do some tiers have dead code paths?
- Does synthetic pricing (`lib/pricing/synthetic-engine.ts`) fire correctly when real prices are unavailable?
- Is the Census (`docs/specs/pie-laws.md`, Law 8) actually tracking coverage percentage? What is current coverage?
- Are price freshness guarantees (Law 4: 7-day volatile, 30-day stable) being enforced and quarantining stale data?

### Immune System: Completion Contract + Auth + Validation

The organism's self-defense. The Completion Contract (`lib/completion/`, 8 files) recursively evaluates readiness: Event -> Menu -> Recipe -> Ingredient. Auth gates (`requireChef()`, `requireClient()`, `requireAuth()`) protect boundaries. Validation prevents bad data entry.

**Audit questions:**

- Does the Completion Contract block event confirmation when blocking requirements exist, or is it advisory only?
- Are completion scores visible on every event detail page, every menu page, every recipe page?
- Does the `actionUrl` + `actionLabel` on each missing requirement actually navigate to the right fix location?
- Is the completion evaluation used by the Rail to surface "incomplete event" items, or are these two systems disconnected?

### Voice: Remy + Email + Notifications (`lib/ai/`, 232 files; `lib/email/`, 107 files)

The organism speaks through Remy (conversational AI), email (Gmail integration + Resend transactional), and notifications (SSE + future push).

**Audit questions:**

- Can Remy draft and send emails on the chef's behalf with one confirmation click?
- Are Remy's agent actions (`propose write operations with chef confirmation`) covering all high-frequency chef tasks?
- Is the email cadence system (`components/communication/cadence-settings.tsx`) wired to automatically send follow-ups, or does the chef still manually trigger them?
- Does Remy's stale inquiry scanner (background job) actually surface results through the Rail?

### Reflexes: Hermes + Cron + Background Jobs

Autonomous actions that fire without the chef knowing. Hermes runs 6 overnight cron jobs. Remy has scheduled background jobs (stale inquiry scanner, overdue payment scanner, social post drafts, sentiment monitoring).

**Audit questions:**

- Are Hermes morning reports (`docs/hermes/`) being consumed by the `/morning` skill to brief the chef?
- Do all background scanners produce actionable Rail items, or do they just log?
- Is the overdue payment scanner creating follow-up email drafts automatically?
- Are cron results feeding back into CIL signals for pattern learning?

### Hormones: Settings + Feature Flags + Tier Gating

The organism's configuration layer. `requirePro()` gates paid features. 54 settings pages let chefs customize behavior. Feature flags control rollout.

**Audit questions:**

- Does the adaptive config engine (onboarding: 5 questions -> tailored workspace) actually change which features are prominent?
- Are there settings that should be auto-configured based on CIL observation but currently require manual configuration?

---

## The Ulysses Layer (`docs/specs/cil-commitment-analyzer.md`)

The Ulysses Contract is the organism's **self-binding system**. The chef sets standards for themselves (readiness gates, pricing floors, menu locks, response time commitments). The system watches for when the chef circumvents their own commitments under pressure.

**Five override patterns to detect:**

1. Frequent gate override (skipping readiness checks before confirming events)
2. Time-pressure clustering (overrides concentrated near event dates)
3. Client-correlated overrides (always bending rules for specific clients)
4. Confidence erosion (accepting lower-confidence prices over time)
5. Menu unlock patterns (unlocking finalized menus repeatedly)

**Audit questions:**

- Is the commitment analyzer actually running as the 8th CIL domain?
- When an override is detected, does the system surface it gently (not punitively) through the Rail?
- Does the system track whether the override led to a negative outcome (financial loss, quality issue, client complaint)?
- Are "commitment profiles" being built over time so the system can distinguish intentional flexibility from drift?

---

## The Wiring Mandate

Every system above exists. Most are built. The mission is not building new features. The mission is **wiring every system to every other system so the organism breathes as one.**

### Priority Wiring Gaps to Investigate:

1. **CIL -> Rail:** Do all 8 CIL analyzers produce Rail items? Or does intelligence get generated and then sit in SQLite unseen?
2. **Completion Contract -> Rail:** Does an incomplete event automatically appear in the Critical tier?
3. **Completion Contract -> Remy:** Can Remy answer "what's missing for Saturday's dinner?" by querying the completion contract?
4. **Dinner Circles -> Everything:** Is the Circle truly the bloodstream, or are there workflows (sourcing, prep, invoicing) that operate independently of the Circle context?
5. **PIE -> Menu Costing -> Quote -> Invoice:** Is the price-to-payment pipeline fully automated? Can a chef add a menu item and have the cost, quote adjustment, and invoice update cascade automatically?
6. **Hermes -> CIL -> Rail -> Remy:** Do overnight discoveries (stale prices, dormant clients, overdue payments) cascade through the intelligence layer into the morning Rail and Remy briefing?
7. **Event FSM Transitions -> All Systems:** Does every FSM state change propagate to: Calendar, Prep Timeline, Shopping List, Ingredient Sourcing, Staff Scheduling, Client Portal, Dinner Circle, Financial Ledger, CIL, Rail?
8. **Remy Agent Actions -> Mutation -> Broadcast -> Rail:** When Remy executes an action (draft email, update event), does the SSE broadcast fire and the Rail refresh?

### The Prominence Mandate

Dinner Circles and Rails are not features in a sidebar. They are the **two most prominent surfaces in the entire product.**

- **Rails** = the chef's nervous system. Visible on every single page. The chef never has to hunt for what needs doing.
- **Dinner Circles** = the chef's circulatory system. Every piece of event information flows through them. The chef never has to context-switch between disconnected pages.

If either surface is buried, understated, or optional, the organism is failing.

---

## Infrastructure Optimization Audit

ChefFlow runs on significant infrastructure. Verify full utilization:

- **Pi Price Bridge** (port 7700, 1.1M prices) -- Is resolution time < 100ms p99?
- **11 OpenClaw Synthesizers** (nightly cron) -- Are all 11 running and producing output?
- **CIL Per-Tenant SQLite** -- Is the hourly scanner completing within its window?
- **SSE EventEmitter Bus** -- Are there mutation paths that skip broadcast?
- **Graphify Knowledge Graph** (31K nodes, 117K edges) -- Is this being queried for architectural decisions, or just a static report?
- **MemPalace** (535+ indexed conversations) -- Is Remy pulling from this for historical context?
- **150K+ OSM Stores** -- Are these wired into PIE's geographic intelligence (Law 6)?

---

## Success Criteria

The audit is complete when:

1. Every body system has zero orphaned outputs (everything produced is consumed somewhere)
2. Every FSM transition cascades through all dependent systems
3. Dinner Circles carry every piece of event information (zero circulatory blockages)
4. Rails surface every actionable item from every system (zero silent failures)
5. PIE operates with total autonomy (Law 1) with zero human price entry
6. Remy can answer any operational question by querying real systems (zero hallucinated responses)
7. The Ulysses layer detects commitment drift and surfaces it gently
8. The chef's daily workflow is: open ChefFlow -> read Rail -> act on top items -> Remy handles the rest

**The organism breathes. The chef cooks.**
