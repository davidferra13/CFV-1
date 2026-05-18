# ORCHESTRATION MISSION: God-Tier Autonomy Engine

> Generated 2026-05-17 from God-Tier Chef OS vision session.
> North star: full admin autonomy, chef only touches creativity.
> Foundational principle: Algorithm First, AI as opt-in upgrade.

## Context Load (Read These First)

- `CLAUDE.md` (auto-loaded)
- `docs/vision/god-tier-chef-os.md` (the complete vision + Algorithm-First Principle)
- `docs/UNIFIED-BUILD-QUEUE.md` (current state of all 237 items)
- `docs/CLAUDE-ARCHITECTURE.md` (existing patterns)
- `docs/CLAUDE-DOMAINS.md` (265 lib/ domains)
- `lib/ai/dispatch/auto-dispatch.ts` (existing CIL dispatch)
- `lib/communication/signal-comm-bridge.ts` (existing signal-to-comm bridge)
- `lib/communication/brand-voice.ts` (existing voice system)
- `lib/cil/signal-actions.ts` (CIL signal pipeline)

## Session Decisions (Do Not Re-Debate)

1. **Creative Sovereignty Thesis:** Chef touches ONLY creative decisions (menus, recipes, authentic voice). Everything else is autonomous.
2. **Algorithm First:** Every feature works without AI. AI is opt-in upgrade. Build order: algorithm -> AI layer -> crystallization.
3. **Progressive Crystallization:** When AI repeatedly does the same thing, observe the pattern, hardcode it as deterministic code. AI moves to next frontier.
4. **Autonomy Engine Pattern:** detect situation -> draft action in chef's voice -> route to approval or auto-execute -> confirm -> learn. Every admin domain uses this same loop.
5. **AI Uses App Routes:** AI calls the same actions/routes buttons would call. Never bypasses deterministic layer.
6. **Approval Gate Spectrum:** Auto-execute for logistics/low-risk. Approval gate for client communication/financial decisions. Chef chooses their comfort level.

---

## Wave 1: Autonomy Engine Foundation (Parallel - Launch Immediately)

### Agent 1: Autonomy Engine Core Pattern

- **Model:** opus
- **Task:** Build the universal autonomy engine pattern in `lib/autonomy/`. This is the detect-draft-approve-learn loop that every admin domain will plug into.

  Create these files:
  - `lib/autonomy/types.ts` - AutonomyAction, ApprovalGate, ExecutionResult, LearningSignal types
  - `lib/autonomy/engine.ts` - Core loop: detectSituation() -> draftAction() -> routeToApproval() -> execute() -> recordOutcome()
  - `lib/autonomy/approval-router.ts` - Routes actions to auto-execute or approval queue based on: action type, risk level, chef preferences, confidence score
  - `lib/autonomy/approval-queue-actions.ts` - Server actions: getPendingApprovals(), approveAction(), rejectAction(), editAndApprove(), getApprovalHistory()
  - `lib/autonomy/learning.ts` - Records approval/rejection/edit patterns. After N approvals of same action type, suggests promoting to auto-execute.
  - `lib/autonomy/chef-preferences.ts` - Per-chef autonomy settings: which action types auto-execute, which need approval, confidence thresholds
  - Migration for: autonomy_actions, approval_queue, autonomy_preferences, learning_signals tables

  **Algorithm-First Rule:** The entire engine works WITHOUT AI. The "draft" step can be a template/formula. AI enhancement is a separate optional layer on top.

  **Read first:** `docs/vision/god-tier-chef-os.md` (especially the Autonomy Engine and Algorithm-First sections), `lib/cil/signal-actions.ts`, `lib/communication/signal-comm-bridge.ts`
  **Done when:** Types exported, engine callable, approval queue functional, migration runs, `npx tsc --noEmit --skipLibCheck` passes.

### Agent 2: Unblock Remy Routines Foundation

- **Model:** opus
- **Task:** The Remy Routines Foundation (CLIENT COMMUNICATION #1) is BLOCKED. This is the #1 blocker for communication autonomy. Current status: "worktree remains partial; runtime match/apply audit logging, tenant/safety tests, proof packs, browser/runtime proof, and auth scan cleanup are missing."

  Investigate the partial worktree state. Identify exactly what's missing vs what exists. Complete the foundation:
  1. Runtime match/apply with audit logging
  2. Tenant-scoped safety tests
  3. Auth scan cleanup
  4. Mark as DONE in build queue when complete

  **Critical context:** Remy Routines are the mechanism by which the chef defines "when X happens, do Y automatically." This is the chef-facing configuration of the autonomy engine. Without this, the chef can't control what auto-executes.

  **Read first:** Search for any existing remy-routines worktree files. Read `lib/ai/remy-*.ts` files. Read CLIENT COMMUNICATION section of build queue.
  **Done when:** Routines can be created, matched to situations, and executed with audit trail. Tenant isolation verified. tsc clean.

### Agent 3: Algorithm-First Audit of Communication Domain

- **Model:** haiku
- **Task:** Audit all files in `lib/communication/` and `lib/ai/` for AI dependencies. For each file, classify:
  - **ALGORITHM:** Works without AI. Pure deterministic code.
  - **AI-REQUIRED:** Breaks without AI. Needs algorithm fallback.
  - **AI-ENHANCED:** Has algorithm base, AI improves it. Correct pattern.

  Output a markdown report at `docs/audits/algorithm-first-communication-audit.md` with:
  1. File-by-file classification
  2. List of AI-REQUIRED files that need algorithm fallbacks
  3. Priority order for adding fallbacks (highest-traffic first)
  4. Specific recommendations for each AI-REQUIRED file

  **Read first:** `docs/vision/god-tier-chef-os.md` (Algorithm-First section), all files in `lib/communication/`, `lib/ai/dispatch/`, `lib/cil/`
  **Done when:** Audit complete, every file classified, recommendations documented. No code changes, just the audit.

### Agent 4: Approval Gate UI Components

- **Model:** haiku
- **Task:** Build reusable approval gate UI components in `components/autonomy/`. These are the chef-facing approval surfaces.

  Create:
  - `components/autonomy/approval-card.tsx` - Single pending approval: shows what will happen, who it affects, confidence score, approve/edit/reject buttons
  - `components/autonomy/approval-feed.tsx` - List of pending approvals, filterable by domain (communication, financial, logistics)
  - `components/autonomy/autonomy-settings.tsx` - Chef configures per-domain autonomy level (auto/approval/manual)
  - `components/autonomy/action-preview.tsx` - Preview of what the autonomous action will do before it executes
  - `components/autonomy/learning-nudge.tsx` - "You've approved this type 10 times. Auto-approve next time?" prompt

  **Design rules:** Follow existing component patterns in `components/`. Use shadcn/ui primitives. Mobile-first. Dense but readable. No AI dependency in components (they render data from the engine).

  **Read first:** `components/` directory structure for patterns, `docs/specs/universal-interface-philosophy.md`, the autonomy engine types from Agent 1 (coordinate via types.ts)
  **Done when:** All components render, follow existing patterns, tsc clean.

---

## Wave 2: Domain Wiring (After Wave 1 Verified)

### Agent 5: Wire Communication to Autonomy Engine

- **Model:** opus
- **Task:** Wire the communication domain as the first autonomy engine consumer. This means:
  1. **Detect:** CIL signals (already built in `signal-comm-bridge.ts`) feed into the autonomy engine's detect step
  2. **Draft:** For each signal type, create an algorithm-first draft:
     - Inquiry follow-up -> template-based draft using `brand-voice.ts`
     - Event confirmation -> deterministic template with event details filled
     - Payment reminder -> formula-based (amount + due date + tone)
     - Rebooking outreach -> seasonal template + client history
     - Post-event thank you -> template with event details
     - AI upgrade: if Ollama available, enhance the draft with client context
  3. **Route:** Configure default approval settings:
     - Auto-execute: logistics confirmations, standard reminders
     - Approval gate: client outreach, quotes, anything financial
  4. **Learn:** Record which drafts get approved as-is vs edited, for future crystallization

  Wire into existing: `lib/communication/`, `lib/cil/`, `lib/ai/dispatch/`

  **Read first:** Wave 1 Agent 1 output (autonomy engine), `lib/communication/signal-comm-bridge.ts`, `lib/communication/brand-voice.ts`, `lib/cil/signal-actions.ts`, `lib/communication/cadence-trigger-handler.ts`
  **Done when:** CIL signal -> autonomy engine -> draft message -> approval queue OR auto-send. Full loop working. tsc clean.

### Agent 6: Wire Financial Domain to Autonomy Engine

- **Model:** haiku
- **Task:** Wire financial operations as the second autonomy engine consumer:
  1. **Detect:** Event completion, payment due dates, invoice generation triggers
  2. **Draft (Algorithm-first):**
     - Quote generation: formula from menu cost + guest count + labor + markup (already exists in costing)
     - Invoice creation: auto-generate from event details (already exists)
     - Payment reminder: template with amount + due date
     - Expense categorization: rule-based from vendor/category
  3. **Route:** ALL financial actions go through approval gate by default. Chef can opt into auto-execute for reminders only.
  4. **Learn:** Track which quotes get approved vs modified (learn pricing preferences)

  **Read first:** Wave 1 Agent 1 output, `lib/finances/`, `lib/invoicing/`, `lib/costing/`, `lib/quotes/`
  **Done when:** Financial actions flow through autonomy engine. Quote, invoice, reminder all have algorithm-first drafts. tsc clean.

### Agent 7: Wire Logistics Domain to Autonomy Engine

- **Model:** haiku
- **Task:** Wire logistics as the third autonomy engine consumer:
  1. **Detect:** Event created, menu assigned, date approaching
  2. **Draft (Algorithm-first, no AI needed):**
     - Prep timeline: already built in `lib/prep/prep-schedule-actions.ts`, auto-generate on menu assignment
     - Shopping list: derive from menu ingredients + recipe scaling (already built)
     - Equipment checklist: auto-generate from menu techniques (already built)
     - Day-of timeline: already built in `lib/events/timeline-generator-actions.ts`
  3. **Route:** All logistics auto-execute by default (low risk, deterministic)
  4. **Learn:** Track if chef modifies auto-generated timelines (learn timing preferences)

  **Read first:** Wave 1 Agent 1 output, `lib/prep/`, `lib/events/timeline-generator-actions.ts`, `lib/events/equipment-actions.ts`, `lib/shopping/`
  **Done when:** Event creation automatically triggers prep timeline + shopping list + equipment checklist via autonomy engine. All auto-execute. tsc clean.

### Agent 8: Statistics-as-Exhaust Engine

- **Model:** haiku
- **Task:** Build the self-maintaining statistics system in `lib/statistics/`. Stats update as byproduct of operations, never require chef input.

  Create:
  - `lib/statistics/stat-collector.ts` - Hooks into event completion, payment receipt, client creation, menu assignment to auto-update stats
  - `lib/statistics/stat-types.ts` - Revenue (MTD/QTD/YTD), event count, avg ticket, client LTV, most-requested dishes, most-profitable dishes, busiest months, growth trajectory
  - `lib/statistics/stat-actions.ts` - Server actions: getChefStats(), getStatTrends(), getStatSnapshot()
  - `lib/statistics/stat-hooks.ts` - Register hooks on existing server actions to auto-collect stats on every mutation

  **Algorithm-First:** Pure math. No AI. Revenue = sum of payments. Avg ticket = revenue / events. Growth = this period vs last period. LTV = sum of client payments. Most-requested = count of dish appearances in menus. Most-profitable = revenue minus ingredient cost per dish.

  **Read first:** `lib/finances/`, `lib/events/`, `lib/clients/`, `lib/menus/`, existing dashboard actions
  **Done when:** Stats auto-update on every event completion and payment. Dashboard can query current stats without any manual input. tsc clean.

---

## Wave 3: Ambient Intelligence (After Wave 2 Verified)

### Agent 9: Client Intelligence Ambient Surfacing

- **Model:** opus
- **Task:** When an event is created or a client is selected, automatically surface everything the system knows about that client. No chef action needed.

  Build `lib/clients/ambient-intelligence.ts`:
  - `getClientContext(clientId)` returns: full event history, all menus served, dietary restrictions (current), average spend, booking frequency, last event date, satisfaction signals (tips, rebooking speed), dietary changes over time, preferred communication channel, seasonal patterns
  - Wire this into event creation flow: when client is attached to event, context loads automatically
  - Wire into communication: when drafting a message to a client, their full context is available to the template/AI

  **Algorithm-First:** Pure database queries. No AI. Just aggregate what we already know from existing tables.

  AI enhancement (separate, optional): "Based on this client's history, they might enjoy..." suggestions. But the data surfacing is pure algorithm.

  **Read first:** `lib/clients/`, `lib/events/recall-actions.ts`, `lib/communication/returning-client-matcher.ts`, `lib/clients/relationship-cockpit-actions.ts`
  **Done when:** `getClientContext()` returns comprehensive client intelligence from existing data. Wired into event creation. tsc clean.

### Agent 10: Vendor Communication Foundation

- **Model:** haiku
- **Task:** Build the vendor communication foundation in `lib/vendors/`. This domain has NOTHING built yet for God-tier.

  Create:
  - `lib/vendors/vendor-types.ts` - Vendor profile, communication preference, order history
  - `lib/vendors/vendor-actions.ts` - Server actions: getVendors(), getVendorHistory(), getPreferredVendor(ingredientCategory), recordVendorOrder()
  - `lib/vendors/order-draft.ts` - Algorithm-first order drafting: given a shopping list, group by vendor preference, generate order summary
  - Migration for: vendor_profiles (extend existing), vendor_orders, vendor_order_items tables

  **Algorithm-First:** Order drafting is pure formula: ingredient list -> vendor mapping -> grouped order. No AI needed. AI can later enhance vendor selection and communication.

  **Read first:** `lib/vendors/` (existing vendor files), `lib/shopping/`, `lib/ingredients/sourcing-actions.ts`
  **Done when:** Vendor profiles exist, order drafting from shopping lists works, history tracked. tsc clean.

---

## Verification Protocol

- Each agent runs tsc check: `npx tsc --noEmit --skipLibCheck`
- Each agent verifies its own imports resolve
- After Wave 1: verify autonomy engine types are importable by all Wave 2 agents
- After Wave 2: verify all three domains (communication, financial, logistics) flow through autonomy engine
- After Wave 3: verify client context surfaces on event creation
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide
- No Playwright needed this wave (infrastructure, not UI)

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, import resolution).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work, update build queue, push.
8. **Algorithm-First check:** Before marking any agent done, verify: "Does this work with AI off?" If any file REQUIRES AI to function, send it back.
9. **Do NOT touch existing working code.** This is additive. New files, new modules. Wire into existing via imports, not modifications.

## Build Queue Updates After This Swarm

Add these new items to `docs/UNIFIED-BUILD-QUEUE.md`:

**New category: AUTONOMY ENGINE**
| # | Item | Status | Depends On | Notes |
|---|------|--------|------------|-------|
| 1 | Autonomy Engine Core Pattern | IN-FLIGHT | None | Wave 1 Agent 1 |
| 2 | Approval Gate UI Components | IN-FLIGHT | #1 | Wave 1 Agent 4 |
| 3 | Communication Autonomy Wiring | IN-FLIGHT | #1 | Wave 2 Agent 5 |
| 4 | Financial Autonomy Wiring | IN-FLIGHT | #1 | Wave 2 Agent 6 |
| 5 | Logistics Autonomy Wiring | IN-FLIGHT | #1 | Wave 2 Agent 7 |
| 6 | Statistics-as-Exhaust Engine | IN-FLIGHT | None | Wave 2 Agent 8 |
| 7 | Client Intelligence Ambient Surfacing | IN-FLIGHT | None | Wave 3 Agent 9 |
| 8 | Vendor Communication Foundation | IN-FLIGHT | None | Wave 3 Agent 10 |
| 9 | Spatial/Temporal Awareness Layer | UNSPECCED | #1 | Future: weather, travel, venue context |
| 10 | Voice Learning Model | UNSPECCED | #3 | Future: learn from approval edits |
| 11 | Crystallization Engine | UNSPECCED | #1 | Future: auto-promote AI patterns to algorithms |
