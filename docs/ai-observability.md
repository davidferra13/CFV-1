# AI Observability — ChefFlow V1

**Implemented:** 2026-02-28
**Status:** Complete (5 improvements shipped)

## What Changed

ChefFlow's AI layer (local Ollama) had excellent safety architecture (6-layer guardrails, formula-first pattern, privacy-by-design) but zero observability — no structured logs, no metrics, no error reporting, no source transparency in the UI. Five improvements fix this.

## 1. Structured AI Logger

**Before:** `console.log('[ollama] Parsed successfully with qwen3:30b (2400ms)')`
**After:** Machine-parseable JSON logs via `lib/logger.ts` with scope `ai`.

Every AI call now logs:

- Model name and tier
- Duration (ms)
- Cache hit/miss
- Repair pass attempted/succeeded
- All errors with full context

**Files changed:**

- `lib/logger.ts` — added `ai: createLogger('ai')` singleton
- `lib/ai/parse-ollama.ts` — replaced 5 `console.log/warn` calls with `log.ai.info/warn/error`
- `lib/ai/with-ai-fallback.ts` — replaced 2 `console.log/warn` calls

**In development:** Pretty-prints like `[INFO] [ai] Parsed successfully rid=abc123 (2400ms)`
**In production:** JSON lines suitable for log aggregation (Axiom, Logtail, Datadog, etc.)

## 2. AI Metrics Counters

In-memory counters tracking AI subsystem health. Same pattern as `lib/activity/observability.ts`.

**Metrics tracked:**
| Metric | What it measures |
|--------|-----------------|
| `ai.call.success` | Successful AI parse completions |
| `ai.call.failure` | All AI failures (any cause) |
| `ai.call.cache_hit` | Responses served from in-memory cache |
| `ai.call.repair_attempted` | Zod validation failed, repair pass triggered |
| `ai.call.repair_succeeded` | Repair pass produced valid output |
| `ai.call.timeout` | Hard timeout exceeded (default 60s) |
| `ai.call.offline` | Ollama unreachable at configured URL |
| `ai.fallback.to_formula` | `withAiFallback` fell back to formula |

**Derived rates (from `getAiMetrics()`):**

- `cacheHitRate` — cache efficiency
- `repairRate` — how often the model produces invalid JSON
- `errorRate` — overall failure rate
- `avgLatencyMs` / `p95LatencyMs` — latency distribution (last 200 samples)
- `tierDistribution` — breakdown of fast/standard/complex tier usage

**File:** `lib/ai/ai-metrics.ts` (~60 lines)

**Usage:**

```typescript
import { getAiMetrics } from '@/lib/ai/ai-metrics'
const metrics = getAiMetrics()
// { totalCalls: 47, errorRate: 0.02, avgLatencyMs: 1800, p95LatencyMs: 4200, ... }
```

## 3. Sentry AI Error Reporting

Every `OllamaOfflineError` is now reported to Sentry via the existing `reportAppError()` fire-and-forget reporter. No new dependencies.

**What Sentry receives:**

- Error type: `OllamaOfflineError`
- Tags: `category: 'ai'`, `action: 'parseWithOllama'`, `error_code` (from OllamaOfflineError)
- Context: model name, base URL, timeout value

**Error codes reported:**

- `not_configured` — `OLLAMA_BASE_URL` not set
- `unreachable` — Ollama not responding
- `timeout` — call exceeded hard timeout
- `model_missing` — requested model not pulled
- `empty_response` — Ollama returned nothing
- `invalid_json` — response wasn't valid JSON
- `validation_failed` — repair pass couldn't fix schema violations

**File:** `lib/ai/parse-ollama.ts` — `reportAppError()` added before every `throw OllamaOfflineError`

## 4. Allergen Confidence Display

`allergen-risk.ts` already returned `confidence: 'high' | 'medium' | 'low'` but the UI showed it as plain gray text. Now:

- **Color-coded:** green (high), amber (medium), red (low)
- **"(unverified)" label** on low-confidence safe results
- **Source badge** showing Formula or AI

**File:** `components/ai/allergen-risk-panel.tsx`

## 5. AI Source Badge

A reusable `<AiSourceBadge>` component that shows whether a result came from deterministic formula or local AI.

- **Formula:** gray `Cpu` icon + "Formula" text
- **AI:** violet `FlaskConical` icon + "AI" text

**Integrated into 3 key panels:**

- Allergen Risk Panel
- Pricing Intelligence Panel
- Temperature Safety Panel

**Files:**

- `components/ai/ai-source-badge.tsx` — the component
- `lib/ai/allergen-risk.ts` — passes `_aiSource` through
- `lib/ai/pricing-intelligence.ts` — passes `_aiSource` through
- `lib/ai/temp-log-anomaly.ts` — passes `_aiSource` through

## What This Does NOT Do

- Does NOT add cloud LLM fallbacks (privacy rule respected)
- Does NOT build a Mission Control AI dashboard (metrics function is ready when UI is built)
- Does NOT change OllamaOfflineError class or error codes (well-designed already)
- Does NOT modify allergen formula logic (only changes how confidence is displayed)
- Does NOT fix the `@ts-nocheck` files (separate scope)

## Future Work

- **Mission Control AI Dashboard:** `getAiMetrics()` is ready — just needs a UI panel in the launcher
- **Remaining `withAiFallback` callers:** 8 more server actions still discard `source` (draft-actions, expense-categorizer, gratuity-framing, etc.) — can be wired up incrementally
- **Prompt versioning:** Track which system prompt version produced each result
- **Rate limiting persistence:** Move in-memory rate limits to Redis/file for cross-restart persistence
