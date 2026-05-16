# ORCHESTRATION MISSION: Wire the Intelligence Layer

> Paste this into a fresh Claude Code session. It orchestrates parallel agents to wire existing built-but-orphaned code into live execution paths. No new features. Pure signal routing.

## Context Load (Read These First)

- `CLAUDE.md` (auto-loaded)
- `docs/UNIFIED-BUILD-QUEUE.md` (queue state, focus on AI #11-14, COMM #27-29)
- `docs/intensify/navigation.md` (this session's findings)
- `docs/intensify/communication.md` (prior communication zone findings)
- `docs/intensify/cil.md` (CIL zone findings)
- `lib/lifecycle/cadence-trigger-handler.ts` (built, zero importers)
- `lib/email/brand-voice.ts` (built, zero importers)
- `lib/invoices/reminder-actions.ts` (built, raw text body)

## Session Decisions (Do Not Re-Debate)

- "Ultimate Instrument" principle: growth solved by progressive disclosure, NEVER deletion
- Navigation PROMOTE layer shipped (usage-weighted action bar, pinned surfaces, rail-tier priority)
- All moves in this swarm are WIRING tasks: both endpoints exist, connect them
- Route-consolidation swarm dispatched separately (do not duplicate; see `docs/handoffs/2026-05-16-route-consolidation-swarm.md`)
- Lifecycle engine files exist (8/13 orphaned); wire them, don't rebuild
- PIE resolve-price chain complete (65 files, 8 crons); wire into menu creation surface

## Wave 1 (Parallel - Launch Immediately)

### Agent 1: Verify Nav PROMOTE Layer (Playwright)

- **Model:** haiku
- **Task:** Start dev server at localhost:3100. Sign in as agent (`.auth/agent.json`). Navigate to chef dashboard. Verify: (1) action bar items are present and rendering, (2) pinned surfaces section appears if chef has pins (or doesn't appear if no pins), (3) collapsed rail mode works without errors. Screenshot each state.
- **Read first:** `components/navigation/action-bar.tsx`, `components/navigation/pinned-surfaces-section.tsx`, `components/navigation/chef-nav.tsx`
- **Done when:** Screenshots show nav renders without console errors. All 3 features visible or gracefully hidden.

### Agent 2: Wire brand-voice.ts Into Outbound Emails

- **Model:** haiku
- **Task:** `lib/email/brand-voice.ts` exports voice config (3 presets: warm/professional/casual, greeting/signoff, forbidden-phrase lint). Currently imported by zero files. Wire it into: (1) `lib/communication/cadence-scheduler.ts` email composition, (2) any auto-response email templates, (3) the personal-thank-you template. Each email path should call `getChefVoice(tenantId)` and apply greeting/signoff/forbidden checks.
- **Read first:** `lib/email/brand-voice.ts`, `lib/communication/cadence-scheduler.ts`, `lib/email/templates/personal-thank-you.tsx`
- **Done when:** `brand-voice.ts` has 3+ importers. Emails use chef's configured voice preset. tsc passes.

### Agent 3: Wire cadence-trigger-handler Into deposit-actions.ts

- **Model:** haiku
- **Task:** `lib/lifecycle/cadence-trigger-handler.ts` is built but has zero importers. It handles scheduled cadence events (pre-event confidence emails, follow-ups). The natural trigger point is `lib/finance/deposit-actions.ts` (when deposit is confirmed, start the pre-event cadence). Wire: after successful deposit confirmation, call the cadence trigger handler to start the appropriate cadence for that event.
- **Read first:** `lib/lifecycle/cadence-trigger-handler.ts`, `lib/finance/deposit-actions.ts`, `lib/communication/cadence-scheduler.ts`
- **Done when:** Deposit confirmation triggers cadence start. Handler has 1+ importers. tsc passes.

### Agent 4: Consolidate Dual Payment Reminder Paths

- **Model:** sonnet
- **Task:** Two payment reminder systems exist: (1) `lib/invoices/reminder-actions.ts` uses raw text body (basic), (2) `lib/email/notifications.ts` uses proper React email templates (richer). Two live callers use the proper version. Consolidate: make `reminder-actions.ts` delegate to the notification system's React template path instead of sending raw text. Do NOT delete either file; redirect the raw path to the proper one.
- **Read first:** `lib/invoices/reminder-actions.ts`, `lib/email/notifications.ts`, grep for callers of both
- **Done when:** All payment reminder emails go through React templates. No raw text email bodies for payment reminders. tsc passes.

### Agent 5: PIE -> Event Menu Auto-Costing

- **Model:** sonnet
- **Task:** The PIE resolve-price chain is complete (65 files, 8 crons, Pi bridge at port 7700). But when a chef creates or views a menu for an event, no cost estimate appears. Wire `resolve-price` into the menu/event creation surface so chefs see instant margin visibility. Find where menu items are displayed in event context, call the pricing resolver, show cost-per-plate and estimated margin.
- **Read first:** `lib/pricing/resolve-price.ts` (the resolver), `lib/pricing/` (chain structure), event menu display pages, `docs/specs/pie-laws.md` (immutable rules)
- **Done when:** Event menu view shows ingredient cost estimates via PIE. Fallback gracefully if Pi bridge unavailable. tsc passes.

## Wave 2 (After Wave 1 Verified)

### Agent 6: Lifecycle Engine Activation

- **Model:** opus
- **Task:** 8 of 13 lifecycle files are orphaned (built but never imported into the event transition flow). The trigger-engine and journey-orchestrator exist but are not called when events transition states. Wire them into the event FSM so that state transitions (inquiry->proposal->booked->prep->service->closeout) automatically fire lifecycle handlers. This activates the entire automated communication/action layer.
- **Read first:** `lib/lifecycle/` (all files), `lib/events/` (transition logic), `docs/intensify/lifecycle.md`
- **Done when:** Event state transitions trigger lifecycle handlers. Journey orchestrator records stage transitions. 8 orphaned files have importers. tsc passes.

### Agent 7: CIL-to-Communication Action Bridge

- **Model:** sonnet
- **Task:** CIL's `actOnSignal()` function computes signals (overdue-invoice, expired-quote, follow_up_needed, churn-risk) but dispatches to nothing. Wire it to real dispatchers: overdue-invoice -> sendPaymentReminder, expired-quote -> follow-up sequence, follow_up_needed -> cadence email. Both sides exist. Bridge is a switch/dispatch.
- **Read first:** `lib/intelligence/` (CIL signal producers), `lib/communication/` (dispatchers), `docs/intensify/cil.md`
- **Done when:** actOnSignal has real dispatch cases for 3+ signal types. Signals produce actual communications. tsc passes.

### Agent 8: Rail Item Lifecycle Scoring Engine

- **Model:** opus
- **Task:** NAV queue item #8 (P0, unblocks 5 blocked items). Build the shared RailItem type, scoring/decay engine, density caps, item lifecycle states, time-awareness, and cross-rail signal flow. This is the foundation that makes the rail intelligent.
- **Read first:** `docs/specs/rail-item-lifecycle-and-scoring-engine.md`, `lib/discovery/rail-tier-assigner.ts`, `lib/discovery/universal-rail-actions.ts`
- **Done when:** Scoring engine exists with decay, density caps, lifecycle states. Rail items score and sort by relevance. tsc passes. Spec marked verified.

## Wave 3 (After Wave 2 Verified)

### Agent 9: Churn Triggers -> Communication Cadence

- **Model:** haiku
- **Task:** `lib/intelligence/churn-prevention-triggers.ts` computes at-risk client signals but no automation acts on them. Wire into communication cadence so at-risk clients get re-engagement outreach (gentle check-in, seasonal menu tease, special offer for lapsed clients). Use the CIL bridge from Wave 2 Agent 7 as the dispatch path.
- **Read first:** `lib/intelligence/churn-prevention-triggers.ts`, CIL bridge (from Agent 7), `lib/communication/cadence-scheduler.ts`
- **Done when:** Churn signals auto-trigger re-engagement cadences. tsc passes.

### Agent 10: Integration Test - Full Communication Pipeline

- **Model:** sonnet
- **Task:** End-to-end verification that the wired pipeline works: (1) Create event, confirm deposit -> cadence starts. (2) CIL detects overdue invoice -> payment reminder fires with React template + brand voice. (3) Lifecycle transition fires journey orchestrator. (4) Menu shows PIE cost estimate. Use Playwright with agent account.
- **Read first:** All files modified by Waves 1-2
- **Done when:** Screenshots prove the pipeline. No console errors. All flows complete.

## Verification Protocol

- Each agent runs tsc --noEmit --skipLibCheck after changes
- Orchestrator does NOT build. Orchestrator dispatches, monitors, verifies.
- After each wave: combined tsc must pass
- After final wave: full Playwright verification of affected flows
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, screenshot, behavioral test).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work, update queue items to verified, push.

## Queue Items Addressed

- COMM #27: Wire brand-voice.ts (Wave 1)
- COMM #28: Consolidate dual payment reminders (Wave 1)
- COMM #29: Wire cadence-trigger-handler (Wave 1)
- AI #11: CIL-to-Communication Action Bridge (Wave 2)
- AI #12: Lifecycle Engine Activation (Wave 2)
- AI #14: PIE -> Event Menu Auto-Costing (Wave 1)
- AI #13: Churn Triggers -> Communication Cadence (Wave 3)
- NAV #8: Rail Item Lifecycle Scoring Engine (Wave 2)
