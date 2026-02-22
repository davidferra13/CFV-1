# Fix: Ollama Model Stuck in RAM After Idle

**Date:** 2026-02-22
**Branch:** feature/risk-gap-closure

## Problem

After completing 5 legitimate AI inference requests (~6:49–6:56am), the Ollama model (`qwen3-coder:30b`) stayed loaded in RAM at **15.7 GB** for over 2.5 hours despite `OLLAMA_KEEP_ALIVE=5m0s`. The model should have unloaded at ~7:01am.

### Root Causes

1. **`/api/show` in health check may reset keep_alive timer** — `ollama-health.ts` called `POST /api/show` on every poll cycle to detect GPU layers. This model-specific endpoint may have been resetting Ollama's idle timer, preventing unload.

2. **Double-polling Ollama `/api/tags`** — Two independent systems both polled `/api/tags`:
   - The dashboard `OllamaStatusBadge` (every 30–60s via `/api/ollama-status`)
   - The AI queue worker's `llm-router.ts` (every 30s via `refreshIfStale()`)
   - Combined: Ollama was getting hit every ~15 seconds

3. **No explicit `keep_alive` on chat requests** — Ollama chat calls relied on server-side `OLLAMA_KEEP_ALIVE` env var. Per-request `keep_alive` is more reliable and overrides any server-side timer bugs.

## Fixes Applied

### 1. Explicit `keep_alive: '5m'` on ALL Ollama chat requests

Ensures Ollama starts its unload countdown per-request, regardless of server config.

**Files changed:**

- `lib/ai/parse-ollama.ts` — both primary and repair chat calls
- `lib/ai/ace-ollama.ts` — text generation call
- `app/api/remy/stream/route.ts` — both streaming chat calls
- `app/api/remy/public/route.ts` — public Remy streaming
- `app/api/remy/client/route.ts` — client Remy streaming

### 2. Removed `/api/show` from health check

GPU layer detection was removed from `ollama-health.ts`. The `POST /api/show` endpoint touches model state and may reset the keep_alive timer. The badge now shows online/offline and latency only — sufficient for monitoring.

**File changed:** `lib/ai/ollama-health.ts`

### 3. Reduced polling frequency

- `llm-router.ts`: health check cooldown increased from 30s → 60s
- `ollama-status-badge.tsx`: initial poll interval changed from 30s → 60s (matches `POLL_ONLINE`)
- GPU label removed from badge (no longer available without `/api/show`)

**Files changed:**

- `lib/ai/llm-router.ts`
- `components/dashboard/ollama-status-badge.tsx`

## Expected Behavior After Fix

1. Ollama model loads when an AI feature is used
2. After 5 minutes with no chat requests, the model unloads (~16 GB freed)
3. Health checks (`GET /api/tags`) continue at ~60s intervals but do NOT prevent unload
4. No more `/api/show` calls that might reset the timer
