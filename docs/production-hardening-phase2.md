# Production Hardening — Phase 2

**Date:** 2026-02-28
**Branch:** `feature/risk-gap-closure`

## What Changed

### 1. All `withAiFallback` Callers Now Wire `source` Through

Every `withAiFallback` call site in the codebase now destructures and passes the `source` field (`'formula' | 'ai'`) to the caller via `_aiSource`.

**18 call sites across 8 files:**

| File                                 | Calls |
| ------------------------------------ | ----- |
| `lib/ai/carry-forward-match.ts`      | 1     |
| `lib/ai/contract-generator.ts`       | 1     |
| `lib/ai/expense-categorizer.ts`      | 1     |
| `lib/ai/gratuity-framing.ts`         | 1     |
| `lib/ai/prep-timeline-actions.ts`    | 1     |
| `lib/ai/staff-briefing-ai.ts`        | 1     |
| `lib/ai/tax-deduction-identifier.ts` | 1     |
| `lib/ai/draft-actions.ts`            | 10    |

**Pattern applied uniformly:**

```typescript
// Before:
const { result } = await withAiFallback(formulaFn, aiFn)
return result

// After:
const { result, source } = await withAiFallback(formulaFn, aiFn)
return { ...result, _aiSource: source }
```

**Verification:** `grep 'const { result } = await withAiFallback'` returns zero matches across the entire codebase.

### 2. AI Layer Test Suite

Created `tests/unit/ai-layer.test.ts` — 22 tests across 4 sections:

| Section | Module                | Tests                                                                                                                                                                |
| ------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A       | `ai-metrics.ts`       | 7 — increment, custom amounts, avgLatency, p95, tier distribution, MAX_LATENCY_SAMPLES eviction, empty state nulls                                                   |
| B       | `ollama-errors.ts`    | 4 — constructor, inferErrorCode (timeout, unreachable), getOllamaErrorHelp coverage                                                                                  |
| C       | `with-ai-fallback.ts` | 7 — formula-only when disabled, AI when enabled, fallback on generic error, fallback on OllamaOfflineError, metric increment, source correctness, formulaOnly helper |
| D       | `providers.ts`        | 4 — isOllamaEnabled true/false, getOllamaModel per tier, getOllamaConfig defaults                                                                                    |

**Run:** `node --test --import tsx tests/unit/ai-layer.test.ts`
**All 22 pass.**

### 3. `resetAiMetrics()` Added to ai-metrics.ts

Exported `resetAiMetrics()` function clears all counters, latencies, and tier counts. Used for test isolation between test cases. Also exported `MAX_LATENCY_SAMPLES` constant for eviction testing.

### 4. Backup SQL Files — Already Clean

Audit confirmed all 6 `backup-*.sql` files are already gitignored and NOT tracked by git. No action needed.

## What This Does NOT Do

- Does not touch `@ts-nocheck` files (audited — all 78 are safe)
- Does not create a separate beta database
- Does not build Mission Control AI dashboard
- Does not deploy Pi operations scripts (deferred — requires SSH access)

## Files Changed

- `lib/ai/carry-forward-match.ts` — wire source
- `lib/ai/contract-generator.ts` — wire source
- `lib/ai/expense-categorizer.ts` — wire source
- `lib/ai/gratuity-framing.ts` — wire source
- `lib/ai/prep-timeline-actions.ts` — wire source
- `lib/ai/staff-briefing-ai.ts` — wire source
- `lib/ai/tax-deduction-identifier.ts` — wire source
- `lib/ai/draft-actions.ts` — wire source (10 calls) + `_aiSource` on DraftResult
- `lib/ai/ai-metrics.ts` — add `resetAiMetrics()`, export `MAX_LATENCY_SAMPLES`
- `tests/unit/ai-layer.test.ts` — new (22 tests)
