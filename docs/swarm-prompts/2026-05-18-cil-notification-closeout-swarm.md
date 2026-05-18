# ORCHESTRATION MISSION: Post-CIL Notification Wiring Swarm

> Generated 2026-05-18 from session that wired CIL scanner insights into notification pipeline + god-mode intelligence resolvers.

## Context Load (Read These First)

- `CLAUDE.md` (project rules, mandates, anti-patterns)
- `docs/UNIFIED-BUILD-QUEUE.md` (canonical queue, status tags, deps)
- `docs/product-blueprint.md` (V1 scope, exit criteria)
- `docs/specs/universal-interface-philosophy.md` (UI mandates)
- `docs/definition-of-done.md`
- `lib/cil/scanner-dispatch.ts` (just built: CIL insight to notification adapter)
- `lib/cil/scanner-handler.ts` (just edited: calls dispatch after scan)
- `lib/discovery/god-mode-dispatcher.ts` (just edited: 3 new intelligence resolvers)

## Session Decisions (Do Not Re-Debate)

- CIL scanner now feeds notification pipeline via `scanner-dispatch.ts` (150 lines, dedup, dispatch)
- 24h in-memory dedup prevents notification spam from repeated hourly scans
- God-mode gained 3 intelligence resolvers: client-risk, churn-signals, price-anomalies
- All SPEC-READY lifecycle items (#26, #27, #28) have deps fully met (Nav, Mobile, Design System, Status Badge all DONE)
- Architecture Deepening category: all 5 items DONE and VERIFIED
- Weather Intelligence: all 20 items DONE
- Ulysses Commitment Layer: foundation design decided (Approach A, unified engine, progressive friction)

## Wave 1 (Parallel, Launch Immediately)

### Agent 1: Event Workspace Information Architecture Deepening

- **Model:** opus
- **Queue ref:** Lifecycle #26
- **Task:** Deepen event detail page information architecture. Event workspace should organize sections by lifecycle stage with progressive disclosure. Read existing `app/(chef)/events/[id]/page.tsx` (154 lines) and its 14 `_sections/` files. Reorganize into lifecycle-aware tabs/panels. Wire action cards, operating state, rail navigation into coherent workspace.
- **Read first:** `docs/UNIFIED-BUILD-QUEUE.md` (Lifecycle #26 row), `app/(chef)/events/[id]/page.tsx`, `app/(chef)/events/[id]/_sections/`, `lib/lifecycle/action-card-actions.ts`, `lib/lifecycle/operating-state-actions.ts`, `lib/lifecycle/rail-navigation-actions.ts`
- **Done when:** Event detail page has lifecycle-aware section organization, tsc clean, no regressions in existing event functionality.

### Agent 2: Event Finance Profitability Cockpit UI Deepening

- **Model:** opus
- **Queue ref:** Lifecycle #28
- **Task:** Build profitability cockpit into event finance view. Show cost breakdown, margin analysis, per-guest economics, food cost percentage, labor allocation. Wire into existing closeout data and costing transparency components. Use existing `lib/lifecycle/closeout-loop-actions.ts` and `lib/costing/` domain.
- **Read first:** `docs/UNIFIED-BUILD-QUEUE.md` (Lifecycle #28 row), `lib/lifecycle/closeout-loop-actions.ts`, `lib/costing/`, `lib/finance/`, `app/(chef)/events/[id]/_sections/`
- **Done when:** Finance cockpit renders real data from closeout + costing domains, tsc clean.

### Agent 3: Ulysses Commitment Engine Foundation

- **Model:** opus
- **Queue ref:** Ulysses #1
- **Task:** Build unified commitment engine foundation. `lib/commitment/engine.ts` with CommitmentRule type, 5-tier progressive friction (banner, countdown, reason-required, witness, ceremony), domain plugin interface. Per-tenant SQLite storage matching CIL pattern. CRUD server actions. No UI yet, just engine + actions + types + migration.
- **Read first:** `docs/UNIFIED-BUILD-QUEUE.md` (Ulysses section header + items #1-6), `lib/cil/` (pattern reference for per-tenant SQLite), `database/migrations/` (latest timestamp for new migration)
- **Done when:** `lib/commitment/engine.ts` exists, types exported, server actions with auth gate, migration file, tsc clean.

### Agent 4: Remy Routines Foundation Unblock

- **Model:** opus
- **Queue ref:** Communication #1
- **Task:** Complete Remy routines foundation. The worktree was partial: missing runtime match/apply audit logging, tenant/safety tests, proof packs, auth scan cleanup. Find existing partial work in `lib/remy/routines/` or worktrees. Complete the gaps: audit logging for routine matches, tenant isolation tests, safety boundary tests. Do NOT rebuild what exists.
- **Read first:** `docs/UNIFIED-BUILD-QUEUE.md` (Communication #1-5), `lib/remy/`, `docs/remy-complete-reference.md`
- **Done when:** Runtime audit logging works, tenant isolation proven, safety tests pass, auth scan clean. Mark Communication #1 as DONE in queue.

### Agent 5: Commitment Analytics Card + Override Taxonomy

- **Model:** haiku
- **Queue ref:** Ulysses #5, #6
- **Task:** Two mechanical items. (A) Commitment Insights Analytics Card: surface override patterns in intelligence hub, follow existing analytics card pattern in `app/(chef)/dashboard/_sections/`. (B) Override Reason Taxonomy: 7-category keyword classifier for free-text override reasons, UI category picker component. Both depend on Commitment Engine Foundation existing as types only (import types, stub data if engine not ready yet).
- **Read first:** `docs/UNIFIED-BUILD-QUEUE.md` (Ulysses #5, #6), `app/(chef)/dashboard/_sections/` (analytics card pattern)
- **Done when:** Analytics card component exists, taxonomy classifier exists, tsc clean.

## Wave 2 (After Wave 1 Verified)

### Agent 6: Day-Of Live Service Mode UI Deepening

- **Model:** opus
- **Queue ref:** Lifecycle #27
- **Task:** Deepen Day-Of live service mode UI. Depends on Event Workspace IA from Wave 1. Build real-time service execution view: current stage indicator, timeline progress, kitchen/service status, guest tracking. Wire into existing `lib/lifecycle/service-tracker-actions.ts` and timeline generator.
- **Read first:** `docs/UNIFIED-BUILD-QUEUE.md` (Lifecycle #27), `lib/lifecycle/service-tracker-actions.ts`, `lib/lifecycle/timeline-generator-actions.ts`, event workspace from Wave 1
- **Done when:** Live service mode renders in event workspace, shows real execution state, tsc clean.

### Agent 7: Commitment Engine Domain: Pricing Commitments

- **Model:** haiku
- **Queue ref:** Ulysses #7
- **Task:** First domain plugin for commitment engine. Pricing commitments: min $/head floor, margin floor (max food cost %), no-late-discounts (no price cuts within N days). Implements domain plugin interface from Wave 1 foundation. Server actions with auth gate.
- **Read first:** `lib/commitment/` (from Wave 1), `lib/costing/`, `docs/UNIFIED-BUILD-QUEUE.md` (Ulysses #7)
- **Done when:** Pricing commitment domain plugs into engine, server actions work, tsc clean.

### Agent 8: Cross-Domain Edge Wiring (Inquiry + Event to Communication)

- **Model:** haiku
- **Queue ref:** Communication #40, #41
- **Task:** Wire two missing cross-domain edges. (A) `lib/inquiries/` should import from `lib/communication/` so new leads/proposals trigger proactive outreach. (B) `lib/events/` should import from `lib/communication/` so event transitions trigger instant notification (not just 60min CIL scan). Add targeted imports, not wholesale coupling. Follow existing patterns in `lib/cil/scanner-dispatch.ts` for notification dispatch.
- **Read first:** `lib/inquiries/`, `lib/events/`, `lib/communication/`, `lib/cil/scanner-dispatch.ts`
- **Done when:** Inquiry state changes trigger communication actions, event transitions trigger communication actions, tsc clean. Mark both as DONE.

## Verification Protocol

- Each agent runs tsc: `npx tsc --noEmit --skipLibCheck`
- Orchestrator does NOT build. Dispatches, monitors, verifies.
- After Wave 1: full tsc check across codebase
- After Wave 2: full tsc + verify no import cycles between newly-wired domains
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, file existence, no regressions).
5. Only proceed to Wave 2 after Wave 1 fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work, update `docs/UNIFIED-BUILD-QUEUE.md` statuses, push.
8. Update `docs/build-state.md` with final tsc result.
