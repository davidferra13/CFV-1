# Dual-LLM System Improvements

**Date:** 2026-02-22
**Branch:** feature/risk-gap-closure

---

## Summary

Seven improvements to the PC + Raspberry Pi dual-LLM system. The core goals:
eliminate redundant health checks, prevent GPU contention, handle cold starts,
and add failover so Remy doesn't die when one endpoint goes down.

---

## What Changed

### 1. Unified Health Checks (was: 3 systems pinging independently)

**Before:** The llm-router, cross-monitor, and Remy's `resolveRemyEndpoint()` each
independently pinged Ollama endpoints. Up to 6 pings/minute per endpoint.

**After:** `resolveRemyEndpoint()` is deleted. Remy now calls `routeForRemy()` in
the llm-router, which uses cached health state. The cross-monitor continues its
deep health checks (liveness + readiness + load) and refreshes the router's cache.
One health system, everyone reads from it.

**Files:** `app/api/remy/stream/route.ts`, `lib/ai/llm-router.ts`

### 2. Load-Aware Routing (was: alive-or-dead only)

**Before:** Routing was binary — endpoint responds to `/api/tags` = healthy. If the
PC was mid-background-task and you opened Remy, both would compete for the same GPU.

**After:** Before routing, Remy checks:

- `isSlotBusy('pc')` — is the background worker currently processing on the PC?
- `getEndpointSnapshot('pc')?.activeGeneration` — is Ollama actively generating?

If the PC is busy and the Pi is available, Remy routes to the Pi. No GPU contention.

**Files:** `app/api/remy/stream/route.ts`, `lib/ai/queue/worker.ts` (new `isSlotBusy()`),
`lib/ai/cross-monitor.ts` (new `getEndpointSnapshot()`)

### 3. Bidirectional Contention Prevention (was: one-way interactive lock)

**Before:** `acquireInteractiveLock()` told the background worker "don't use the PC."
But it didn't tell Remy "the PC is already running a background task — wait or use Pi."
If you opened Remy right as a background task started, they'd collide on the GPU.

**After:** Remy checks the worker slot state BEFORE choosing an endpoint. If the PC
slot is busy, Remy proactively routes to the Pi instead of blindly hitting the PC.

**Files:** `app/api/remy/stream/route.ts`

### 4. Model Preloading (was: log-only detection)

**Before:** The cross-monitor detected `modelReady: false` (endpoint online, model not
loaded) and logged "will be pulled on next use." The first real request ate a 5-15s
cold-start penalty.

**After:** When the cross-monitor detects an online endpoint with no model loaded, it
sends a preload request (`POST /api/generate` with empty prompt + `keep_alive: 5m`).
The model loads proactively so the first real request is fast.

**Files:** `lib/ai/cross-monitor.ts`

### 5. Dynamic Context Window (was: always max)

**Before:** Every Remy call requested `num_ctx: 12288` on PC (or 8192 on Pi) regardless
of actual input size. Ollama allocates VRAM proportional to `num_ctx`.

**After:** `computeDynamicContext()` sizes the context window based on actual input:

- Estimates tokens at ~4 chars/token
- Adds 512-token safety buffer + 2048 response headroom
- Rounds up to nearest 1024 for Ollama efficiency
- Clamps to [2048, max] so it never exceeds the configured limit

For a short "hi" message with typical system prompt (~15K chars), this requests ~7168
instead of 12288 — saving ~5K tokens of VRAM allocation.

**Files:** `lib/ai/providers.ts` (new `computeDynamicContext()`), `app/api/remy/stream/route.ts`

### 6. Connection Failover (was: single attempt, then error)

**Before:** If the chosen endpoint was down, Remy showed an error. The user had to
retry manually.

**After:** If the primary endpoint fails BEFORE any tokens are sent (ECONNREFUSED,
timeout), Remy automatically tries the other endpoint. The user sees a brief pause,
not an error. If failure is mid-stream (tokens already flowing), the error propagates
normally — we can't seamlessly switch models mid-response.

**Files:** `app/api/remy/stream/route.ts` (both question and mixed paths)

### 7. Bug Fix: Question Path Missing Culinary Profile

**Found during this work:** The question path called `buildRemySystemPrompt(context, memories)`
without passing `culinaryProfile` or `favoriteChefsList`. The mixed path passed them
correctly. This meant Remy in question mode didn't know about the chef's food identity
or culinary heroes. Fixed — question path now passes all four arguments.

**Files:** `app/api/remy/stream/route.ts`

---

## Files Modified

| File                           | Change                                                                      |
| ------------------------------ | --------------------------------------------------------------------------- |
| `lib/ai/queue/worker.ts`       | Added `isSlotBusy()` export                                                 |
| `lib/ai/queue/index.ts`        | Added `isSlotBusy` to barrel exports                                        |
| `lib/ai/cross-monitor.ts`      | Added `getEndpointSnapshot()` + model preloading                            |
| `lib/ai/providers.ts`          | Added `computeDynamicContext()`                                             |
| `lib/ai/llm-router.ts`         | Added `routeForRemy()` + `getModelForEndpoint` import                       |
| `app/api/remy/stream/route.ts` | Rewrote routing for question + mixed paths, deleted `resolveRemyEndpoint()` |

---

## How to Test

1. **Load-aware routing:** Start a background AI task, then open Remy. Check server
   logs — Remy should route to Pi when PC slot is busy.

2. **Failover:** Stop Ollama on the PC, send a Remy message. It should fall back to
   Pi automatically (check logs for `[remy] pc failed — falling back to pi`).

3. **Model preloading:** Restart Ollama (model unloaded), wait 30s for cross-monitor
   poll. Check logs for `[cross-monitor] [L2] model-preload` — model should load
   before any user request.

4. **Dynamic context:** Send a short message, check Ollama logs for `num_ctx` value —
   it should be less than the configured max (12288 on PC).

5. **Culinary profile in question mode:** Set up a culinary profile in Settings, ask
   Remy a question. Remy should reference your food identity (previously only worked
   in mixed mode).
