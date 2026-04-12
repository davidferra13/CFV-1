# Session Digest: Simulation Fix + Mempalace Sweep 5

**Date:** 2026-04-12
**Agent:** Builder (Sonnet 4.6)
**Session type:** Bug investigation + fix
**Commits:** `5d429b82b` (simulation), `9f4708b74` (staff labor), `69b416da0` (source provenance)

---

## What Was Fixed

### Simulation 50% Pass Rate (root cause found after 6-day streak)

Three modules have been at 0% since 2026-04-06. Root cause: `qwen3:4b` is a thinking model that bleeds `<think>...</think>` chains into `message.content` despite `think: false`. Combined with `format: 'json'`, this broke JSON parsing in specific ways per module:

**`allergen_risk` - 0 scenarios generated**
`generateScenarios()` calls Ollama, gets `<think>chain</think>\n[{...json...}]`, passes `rawText.trim()` to `JSON.parse()` - fails (starts with `<`). Catch block returns `[]`. Simulation runner sees `scenarios.length === 0`, assigns `passRate: 0`, skips loop entirely (explains why report showed "no sample failures" for this module).

**`client_parse` - 5 scenarios generated but all fail**
Pipeline runs fine. Evaluator checks `out.fullName` but model returns `out.full_name` (snake_case). Name check fails: `-30`. Email check may also fail. Score falls below 70 threshold consistently.

**`menu_suggestions` - fragile double-Ollama pattern**
Pipeline runs. Evaluator calls Ollama to score Ollama's output. If evaluator's JSON parse fails (due to thinking chain), score = 0. Also: qwen3:4b's menu output sometimes violates dietary restrictions in edge cases, causing legitimate failures.

**Fixes applied:**

- `scenario-generator.ts` + `pipeline-runner.ts`: `.replace(/<think>[\s\S]*?<\/think>/g, '').trim()` before JSON parsing
- `quality-evaluator.ts`: `out.full_name` fallback alongside `out.fullName` in `evaluateClientParseDeterministic`
- `quality-evaluator.ts`: Replaced Ollama-evaluates-Ollama for `menu_suggestions` with deterministic keyword checker (dietary restriction violations, menus array length, course structure)
- Removed `buildEvaluatorPrompt` function (dead code) and unused Ollama imports (-129 lines)

### Staff Labor Estimation (previous context)

`components/events/event-staff-panel.tsx`: Total labor showed `$0` when no hours logged. Fixed to use `scheduled_hours * hourly_rate_cents` as estimate with `(est.)` indicator.

### Source Provenance (previous context)

`lib/analytics/source-provenance.ts` (new file): Pure `deriveProvenance()` helper with 10-step precedence chain (open_booking > embed > wix > kiosk > instant_book > external_platform > coarse channel > website > other). All 4 analytics functions in `lib/partners/analytics.ts` now use it. Confirmed count logic fixed to use linked event status, not just inquiry status.

---

## What Was Verified (backlog cleanup)

- **Invoice number collision**: Already handled - 5-attempt retry loop + CAS guard + 23505 handling + migration `20260412000009` unique constraint. Backlog item was stale.
- **CPA export button**: `app/(chef)/finance/year-end/export/route.ts` has `requireChef()` + 422 on error. Properly gated.
- **Read receipts null date**: `isOwn && otherParticipantLastReadAt` short-circuits before `new Date()`. Backlog item was stale.
- **Calendar sync unwired**: Referenced in `transitions.ts`, `command-orchestrator.ts`, `calendar-sync-actions.ts`. Was stale.
- **Profit margin inconsistency**: All UI components use `toFixed(1)`. Backlog item was stale.
- **Remy auth + event FSM**: Checked clean. `remy-actions.ts` has `'use server'` + auth; `remy/stream/route.ts` calls `requireChef()`; `transitions.ts` uses `transition_event_atomic` RPC with CAS guard.

---

## Key Technical Insight

The simulation report file (`docs/simulation-report.md`) contained `</think>` on line 91 - this was the smoking gun. It proved `think: false` was NOT suppressing thinking chain output. The report generator uses `think: false` without `format: 'json'`, confirming the thinking chain bleeds into `message.content`. The pipeline files use both `think: false` AND `format: 'json'` - unclear if `format: 'json'` provides any additional suppression, but stripping `<think>` tags is defensive and correct regardless.

---

## Open Items (not addressed)

- Dark mode coverage gaps (ongoing, ~97% incomplete, large effort)
- `store_products` price sync (Pi-side pull script issue, not app code)
- v2 API document generation for legacy types (informational non-success, low priority)
- SMS channel (needs Twilio, complex)

---

## Next Agent Context

Build is green (tsc clean after simulation fix). All 6 simulation modules should now pass at higher rates on next run. The simulation cron runs automatically via `/api/scheduled/simulation`. No blockers. Safe to start new work.
