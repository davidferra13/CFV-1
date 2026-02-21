# Build: Ollama Relationship Overhaul

**Date:** 2026-02-21
**Branch:** feature/scheduling-improvements
**Scope:** Privacy compliance, reliability, performance, observability

---

## What Changed

This build implements a comprehensive overhaul of ChefFlow's relationship with Ollama, the local AI inference server. The changes span privacy compliance, error handling, performance optimization, and observability.

---

## Phase 1: Privacy Compliance

### 1A. Fixed 3 Confirmed Privacy Leaks

Three modules were sending private client data to Google Gemini (cloud) instead of keeping it local via Ollama:

| File                                  | Data That Was Leaking                                             | Fix                                       |
| ------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `lib/events/parse-event-from-text.ts` | `client_name`, `quoted_price_cents`, `deposit_amount_cents`       | Swapped `parseWithAI` → `parseWithOllama` |
| `lib/ai/chat-insights.ts`             | Client messages, allergies, budget mentions, conversation context | Swapped `parseWithAI` → `parseWithOllama` |
| `lib/gmail/classify.ts`               | `knownClientEmails` array + email body                            | Swapped `parseWithAI` → `parseWithOllama` |

All three now properly throw `OllamaOfflineError` if Ollama is down — data never leaves the machine.

### 1B. Fixed 5 Borderline Privacy Leaks

Five modules used direct `GoogleGenAI` SDK calls with client PII embedded in prompts. All converted to `parseWithOllama` with proper Zod schemas:

| File                           | Data That Was Leaking                                                     | Fix                                                         |
| ------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `lib/ai/followup-draft.ts`     | Client name, dietary restrictions, allergies, vibe notes                  | Full rewrite to `parseWithOllama` + `FollowUpDraftSchema`   |
| `lib/ai/gratuity-framing.ts`   | Client name, event financials (`quoted_price_cents`, `amount_paid_cents`) | Full rewrite to `parseWithOllama` + `GratuityFramingSchema` |
| `lib/ai/copilot-actions.ts`    | Client names joined to recent events                                      | Full rewrite to `parseWithOllama` + `CopilotResponseSchema` |
| `lib/ai/contract-generator.ts` | Client PII (name, email, phone) + address + financials                    | Full rewrite to `parseWithOllama` + `ContractSchema`        |
| `lib/ai/staff-briefing-ai.ts`  | Guest names, allergens, client vibe notes, staff names                    | Full rewrite to `parseWithOllama` + `StaffBriefingSchema`   |

### 1C. Fixed Misleading "Cloud Mode" Badge

**Before:** When Ollama was offline, the badge showed "Cloud Mode" in amber — implying data was routing to the cloud. But since `parseWithOllama` hard-fails (never falls back to Gemini), nothing actually routes to cloud. The badge was lying.

**After:** Badge now shows **"Local AI Offline"** in red, with tooltip: "Private AI features are unavailable. Start Ollama to restore." Added a new blue "Loading Model" state for when Ollama is running but the model hasn't loaded yet.

**File:** `components/dashboard/ollama-status-badge.tsx`

### 1D. Created Privacy Routing Audit Map

**New file:** `lib/ai/privacy-audit.ts`

A single source of truth mapping every AI module to its required provider (`ollama` or `gemini`), model tier, and data sensitivity level. 26 Ollama-routed modules, 18 Gemini-routed modules documented. Used by the simulation system and future audits.

---

## Phase 2: Reliability & Error UX

### 2A. Granular Error Codes

**File:** `lib/ai/ollama-errors.ts`

`OllamaOfflineError` now carries a typed `code` field:

- `not_configured` — OLLAMA_BASE_URL not set
- `unreachable` — Connection refused / network error
- `timeout` — Request timed out
- `model_missing` — Model not found on Ollama server
- `empty_response` — Ollama returned no content
- `invalid_json` — Response not parseable
- `validation_failed` — Zod validation failed after repair
- `unknown` — Catch-all

Added `getOllamaErrorHelp(code)` function returning user-friendly help text per error code.

### 2B. Model-Ready Health Check + GPU Detection

**File:** `lib/ai/ollama-health.ts`

Health check now:

- Verifies the configured model is actually in the Ollama model list (`modelReady: boolean`)
- Detects GPU offloading via `/api/show` endpoint (`gpuLayers`, `totalLayers`)
- Badge displays "Local . 340ms . GPU" vs just "Local . 340ms"

### 2C. Adaptive Polling

**File:** `components/dashboard/ollama-status-badge.tsx`

Polling intervals now adapt to state:

- Online: 60s (reduce load)
- Offline: 10s (detect recovery faster)
- Consecutive failures: exponential backoff up to 120s

### 2D. Warmup on Server Start

**File:** `lib/simulation/auto-schedule.ts`

During the existing 45-second startup delay, a tiny test prompt (`{"status":"ok"}`) is sent to Ollama to force the model into memory. The first real user request is dramatically faster. 2-minute timeout for cold model loads. Non-blocking — failures never propagate.

---

## Phase 4: Performance

### 4A. Multi-Model Task Routing

**File:** `lib/ai/providers.ts`

Three model tiers for task-complexity routing:

| Tier       | Default Model          | Use Cases                                             |
| ---------- | ---------------------- | ----------------------------------------------------- |
| `fast`     | qwen3:8b (~5GB)        | Classification, sentiment, triage, anomaly detection  |
| `standard` | qwen3-coder:30b (18GB) | Structured extraction, lead scoring, client parsing   |
| `complex`  | qwen3-coder:30b        | Allergen risk, business insights, contract generation |

Configurable via env vars: `OLLAMA_MODEL_FAST`, `OLLAMA_MODEL`, `OLLAMA_MODEL_COMPLEX`.

**File:** `lib/ai/parse-ollama.ts`

`parseWithOllama` now accepts an optional `options` parameter:

```typescript
parseWithOllama(prompt, content, schema, { modelTier: 'fast', cache: true })
```

### 4B. Response Caching

**New file:** `lib/ai/ollama-cache.ts`

In-memory LRU cache for deterministic Ollama calls:

- Keyed by SHA-256 of `(model + systemPrompt + userContent)`
- 5-minute TTL, 100 max entries
- Opt-in per module via `cache: true`

Enabled for: expense categorizer, email classifier, quick sentiment analysis.

### Modules Wired to Fast Tier

| Module                          | Tier | Cache |
| ------------------------------- | ---- | ----- |
| `gmail/classify.ts`             | fast | yes   |
| `sentiment-analysis.ts` (full)  | fast | no    |
| `sentiment-analysis.ts` (quick) | fast | yes   |
| `expense-categorizer.ts`        | fast | yes   |
| `client-portal-triage.ts`       | fast | no    |
| `temp-log-anomaly.ts`           | fast | no    |

---

## Files Changed (Summary)

### Modified (privacy migration)

- `lib/events/parse-event-from-text.ts` — `parseWithAI` → `parseWithOllama`
- `lib/ai/chat-insights.ts` — `parseWithAI` → `parseWithOllama`
- `lib/gmail/classify.ts` — `parseWithAI` → `parseWithOllama` + fast tier + cache

### Rewritten (direct Gemini → Ollama with Zod)

- `lib/ai/followup-draft.ts`
- `lib/ai/gratuity-framing.ts`
- `lib/ai/copilot-actions.ts`
- `lib/ai/contract-generator.ts`
- `lib/ai/staff-briefing-ai.ts`

### Enhanced (reliability + performance)

- `lib/ai/ollama-errors.ts` — Added `code` field + `getOllamaErrorHelp()`
- `lib/ai/ollama-health.ts` — Added `modelReady` + GPU detection
- `lib/ai/parse-ollama.ts` — Added model tier routing + cache integration + granular error codes
- `lib/ai/providers.ts` — Added `ModelTier` type + `getOllamaModel(tier)`
- `components/dashboard/ollama-status-badge.tsx` — Fixed badge text, adaptive polling, model-loading state
- `lib/simulation/auto-schedule.ts` — Added Ollama warmup call

### Wired model tiers

- `lib/ai/sentiment-analysis.ts` — fast tier + cache for quick sentiment
- `lib/ai/expense-categorizer.ts` — fast tier + cache
- `lib/ai/client-portal-triage.ts` — fast tier
- `lib/ai/temp-log-anomaly.ts` — fast tier

### New files

- `lib/ai/ollama-cache.ts` — In-memory LRU response cache
- `lib/ai/privacy-audit.ts` — Module routing audit map (44 modules documented)

---

## How It Connects

- **Privacy contract enforced:** All 26 modules handling private data now route through Ollama. Zero Gemini fallbacks for PII.
- **Status badge reflects reality:** "Local AI Offline" (red) when Ollama is down, not the misleading "Cloud Mode."
- **Performance tiered:** Simple classification tasks use a fast 8B model instead of the 30B model, targeting 5-10x speedup.
- **Caching reduces redundancy:** Identical inputs (re-categorizing same expense, re-classifying same email) return cached results.
- **Warm starts:** First user request after server restart no longer waits for model loading.
- **Observability foundation:** Error codes, GPU detection, and the audit map provide the data layer for future dashboards.

---

## Remaining Roadmap (Future Phases)

- **Phase 3:** Production call logging (`ai_call_log` table), simulation coverage expansion to all 16+ Ollama modules, prompt version tracking
- **Phase 5:** AI quality dashboard at `/settings/ai-quality`
- **Phase 6:** Local vision model for receipt/document OCR
- **Phase 7:** Fine-tuning export pipeline, model evaluation framework

---

## Env Vars (New)

| Variable               | Default                        | Purpose                              |
| ---------------------- | ------------------------------ | ------------------------------------ |
| `OLLAMA_MODEL_FAST`    | `qwen3:8b`                     | Small model for classification tasks |
| `OLLAMA_MODEL_COMPLEX` | (falls back to `OLLAMA_MODEL`) | Large model for multi-step reasoning |

Existing vars unchanged: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`.
