# Remy Parsing Fix - April 4, 2026

## Problem

All AI parsing (inquiry smart fill, recipe parsing, brain dump, etc.) stopped working around March 30, 2026. Every `parseWithOllama` call hit the 60-second timeout and threw `OllamaOfflineError`.

## Root Cause

The default model (`qwen3-coder:30b`, 19GB) was too large for the RTX 3050 (6GB VRAM). When loaded, it split between GPU VRAM and system RAM. This GPU/RAM split caused inference to hang indefinitely. The Ollama process stayed alive and responded to API health checks (`/api/tags`), but all inference requests (`/api/chat`) hung forever.

The 30b model had only 3.5GB of its 19.2GB in VRAM (18% GPU offload). GPU utilization was 14% while VRAM was 93% full. The model was loaded but could not actually run inference.

## What Was NOT the Problem

- The code in `parse-ollama.ts` is correct (schema, prompt, Zod validation all fine)
- The `discussed_dishes` field IS in both the schema and the system prompt
- The `think: false` parameter works correctly
- No code changes were needed

## Fix

1. **Killed and restarted Ollama** (the process was stuck at the OS level)
2. **Set all model tiers to `qwen3:4b`** in `.env.local`:
   ```
   OLLAMA_MODEL=qwen3:4b
   OLLAMA_MODEL_FAST=qwen3:4b
   OLLAMA_MODEL_COMPLEX=qwen3:4b
   ```

## Results

- `qwen3:4b` runs inference in 5-9 seconds (vs infinite hang for 30b)
- Full inquiry parsing produces correct structured JSON with all fields
- Budget conversion ($800 = 80000 cents), dietary restrictions, discussed dishes all extracted correctly

## When to Re-enable 30b

When `OLLAMA_BASE_URL` points to a cloud GPU endpoint with sufficient VRAM (24GB+), override the model vars back to the 30b variants. The code already supports this via env var overrides.

## Affected Files

- `.env.local` - added OLLAMA_MODEL, OLLAMA_MODEL_FAST, OLLAMA_MODEL_COMPLEX
- `docs/product-blueprint.md` - updated exit criteria, known issues, queue
- No code changes required
