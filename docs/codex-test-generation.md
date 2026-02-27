# Codex Full Test Suite Generation

## What This Is

A comprehensive prompt at `prompts/queue/codex-full-test-suite.md` designed for an autonomous AI coding agent (Codex, Claude Code, or similar) to run overnight and generate unit/integration tests for the entire ChefFlow codebase.

## The Problem

- 896 files in `lib/` with business logic
- 978 unchecked items in `docs/test-coverage-todo.md`
- Only ~21 existing test files covering ~5% of the codebase
- Unit/integration test coverage needs to go from ~5% to ~80%+

## What the Prompt Covers

5 batches of work, ordered by priority:

| Batch | Priority | Scope                                                        | ~Tests |
| ----- | -------- | ------------------------------------------------------------ | ------ |
| 1     | P1       | Auth, security, validation, idempotency                      | ~150   |
| 2     | P1/P2    | Stripe, payments, financial reports, tax                     | ~200   |
| 3     | P3       | Events, inquiries, clients, recipes, menus, scheduling, docs | ~250   |
| 4     | P3/P4    | Loyalty, surveys, automations, notifications, AI, travel     | ~200   |
| 5     | P4/P5    | Analytics, marketing, cannabis, admin, API routes, hooks     | ~150   |

**Total estimated: ~950 new tests across ~60 test files**

## How to Run It

### Option A: Feed to Codex (OpenAI)

1. Open Codex
2. Point it at the repo
3. Paste the prompt from `prompts/queue/codex-full-test-suite.md`
4. Let it run overnight

### Option B: Feed to Claude Code

```bash
# From the project root
claude "Read prompts/queue/codex-full-test-suite.md and execute it. Start with Batch 1."
```

### Option C: Run in parallel (fastest)

Spawn multiple agents, one per batch:

- Agent 1: "Execute Batch 1 from prompts/queue/codex-full-test-suite.md"
- Agent 2: "Execute Batch 2 from prompts/queue/codex-full-test-suite.md"
- Agent 3: "Execute Batch 3 from prompts/queue/codex-full-test-suite.md"
- Agent 4: "Execute Batch 4 from prompts/queue/codex-full-test-suite.md"
- Agent 5: "Execute Batch 5 from prompts/queue/codex-full-test-suite.md"

## Key Constraints in the Prompt

The prompt enforces:

- Node's built-in `node:test` (not Jest/Vitest)
- `node:assert/strict` (not chai/expect)
- ESM imports with `.js` extensions
- Existing factory/mock/test-db helpers
- Extract-and-test pattern for `'use server'` files
- Direct import for pure-logic files
- Commit after each batch

## What Already Exists (Don't Rebuild)

21 test files already exist and pass (436 tests total):

- `tests/unit/events.fsm.test.ts`
- `tests/unit/ledger.compute.test.ts`
- `tests/unit/billing.tier.test.ts`
- `tests/unit/middleware.routing.test.ts`
- `tests/unit/auth.roles.test.ts`
- `tests/unit/ledger.append.test.ts`
- `tests/unit/quote.fsm.test.ts`
- `tests/unit/modules.test.ts`
- `tests/unit/pricing.validation.test.ts`
- `tests/unit/pricing.evaluate.test.ts`
- `tests/unit/validation.schemas.test.ts`
- `tests/unit/activity.merge.test.ts`
- `tests/unit/activity.schemas.test.ts`
- `tests/unit/cannabis-control-packet-engine.test.ts`
- `tests/unit/compute-daily-report.test.ts`
- `tests/unit/daily-report-actions.test.ts`
- `tests/unit/revenue-goals.engine.test.ts`
- `tests/unit/visitor-alert.test.ts`
- `tests/integration/ledger-idempotency.integration.test.ts`
- `tests/integration/rls-policies.integration.test.ts`
- `tests/integration/immutability-triggers.integration.test.ts`

## Verification

After all batches complete:

```bash
npm run test:unit     # All unit tests
npm run test:integration  # Integration tests (needs Supabase creds)
```

Both commands must exit 0 with all tests passing.
