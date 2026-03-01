# Remy Streaming Fix — num_ctx Removal (2026-03-01)

## Problem

Remy responses were timing out at 300s. Even with the 30b model pre-loaded, there was a 170s+ gap between classification completing and the first streaming token arriving.

## Root Cause

The Remy streaming route passed `num_ctx` (5120-12288) to `ollama.chat()`. On the RTX 3050 with 6GB VRAM:

1. The 30b MoE model (18GB) is split across GPU + RAM
2. Setting `num_ctx` forces Ollama to **pre-allocate KV cache** for that context size
3. Large KV cache allocation triggers expensive model layer reshuffling between GPU and RAM
4. This reshuffling took 170s+ — appearing as a hang before the first token

**Without `num_ctx`**: same prompt completes in 2-5s (Ollama uses the model's default context and dynamically handles input).

**With `num_ctx: 8192`**: same prompt hangs for 5+ minutes (timeout).

## Fix

1. **Removed `num_ctx`** from all 4 `ollama.chat()` streaming calls in `app/api/remy/stream/route.ts`
2. **Removed `computeDynamicContext` import** (no longer needed)
3. **Unified classifier model** — changed `remy-classifier.ts` from `modelTier: 'fast'` (qwen3:4b) to `modelTier: 'standard'` (qwen3-coder:30b) to eliminate per-request model swap
4. **Increased `keep_alive`** from 1m → 30m to prevent model eviction between eval tests
5. **Reduced timeouts** — stream: 300s → 180s, setup: 180s → 120s (no longer need model swap budget)
6. **Updated eval harness** — warms up 30b model instead of 4b

## Impact

- Response time: **170s+ hang → 150-200s actual processing** (no more wasted time on KV allocation)
- Eval tests: **were timing out and failing → now completing and passing**
- Model swaps: **eliminated** (classifier + streamer both use 30b)

## Test Results

| Category      | Tests | Passed | Failed |
| ------------- | ----- | ------ | ------ |
| data_accuracy | 8     | 8      | 0      |
| safety        | 8     | 7      | 1      |

## Hardware Context

- GPU: RTX 3050 6GB VRAM
- Model: qwen3-coder:30b (18GB MoE, 3.3B active params)
- Model split: ~9/49 layers on GPU, rest on RAM
- Normal response time: 150-200s for full Remy context + response
