# Ollama Runaway Fix — Hard Timeouts & Abort Controls

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`
**Commits:** `812078c`, `cf8a651`, `b46adc8`

## Problem

When a user sent a message that Ollama couldn't process (e.g., "can I upload a client ledger?"), the system entered an infinite loop:

1. Ollama got stuck trying to generate a response — no timeout existed
2. Ollama consumed 14GB+ RAM and 44%+ CPU, freezing the entire machine
3. Closing the Remy drawer didn't abort the in-flight request
4. Killing Ollama via Task Manager didn't help — reopening the chat re-triggered the stuck request
5. The watchdog script detected Ollama was unhealthy and restarted it, which re-queued the stuck request
6. The user's computer was effectively bricked until the `chefflow-watchdog.ps1` was manually stopped

## Root Causes

1. **No timeout on `ollama.chat()` calls** — both streaming and non-streaming calls could hang forever
2. **No `num_predict` cap** — Ollama could generate infinite tokens on an unanswerable question, consuming all RAM
3. **No AbortController on client-side fetch** — once fired, the request was unstoppable
4. **No cancel button** — the user had no way to stop a runaway request from the UI
5. **No timeout on the pre-stream setup phase** — `classifyIntent()` + `loadRemyContext()` could block indefinitely

## Fixes Applied

### 1. `lib/ai/parse-ollama.ts` — Hard timeout + token cap on every Ollama call

- Added `withTimeout()` wrapper that rejects after 60s (default, generous for 30b model)
- Applied to both the main `ollama.chat()` call AND the repair pass
- Timeout is configurable via `options.timeoutMs`
- Throws `OllamaOfflineError` with reason `'timeout'` — caught cleanly by all callers
- Added `num_predict: 512` (DEFAULT_MAX_TOKENS) on all structured JSON calls — prevents infinite token generation
- Added retry wrapper (max 2 attempts) for transient errors (timeout, network, abort)

### 2. `app/api/remy/stream/route.ts` — Server-side streaming timeout + token cap

- Added `OLLAMA_STREAM_TIMEOUT_MS = 90_000` (90 seconds — generous for long chat responses)
- Added `OLLAMA_STREAM_MAX_TOKENS = 2048` — caps streaming chat responses
- Both QUESTION and MIXED streaming paths now check an `AbortController` signal on every chunk
- If Ollama hangs mid-stream, the timeout fires and the SSE stream closes with a clean error
- Added 45s timeout on the pre-stream setup phase (`classifyIntent` + `loadRemyContext` + `loadRelevantMemories`)
- `num_predict: 2048` passed to all streaming `ollama.chat()` calls

### 3. `components/ai/remy-drawer.tsx` — Client-side abort + cancel UI

- Added `AbortController` to the `fetch('/api/remy/stream')` call
- 120s client-side hard timeout (belt + suspenders with the server-side 90s)
- **Closing the drawer aborts the in-flight request** — no more zombie requests
- Added "Cancel" button during the pre-streaming loading phase
- Added "Stop generating" link during active streaming
- Abort/timeout errors show a friendly message, not a scary error

## Timeout & Token Layering

| Layer              | Timeout / Cap  | What it protects                                              |
| ------------------ | -------------- | ------------------------------------------------------------- |
| `num_predict` JSON | 512 tokens     | Prevents infinite generation on structured/classifier calls   |
| `num_predict` chat | 2048 tokens    | Prevents infinite generation on streaming chat responses      |
| `parseWithOllama`  | 60s per call   | Classifier, command parser, repair pass                       |
| Pre-stream setup   | 45s total      | `classifyIntent` + `loadRemyContext` + `loadRelevantMemories` |
| SSE streaming      | 90s            | `ollama.chat({ stream: true })` in QUESTION and MIXED paths   |
| Client fetch       | 120s           | Entire round-trip from browser to server                      |
| Cancel button      | User-initiated | Manual abort at any time                                      |
| Drawer close       | Automatic      | Abort when user closes Remy                                   |

> Timeouts are deliberately generous for a 30b model on a laptop — normal calls finish in 10-30s.
> These only fire if Ollama is truly stuck, not just thinking.

## How to Test

1. Open Remy, send a message that Ollama might choke on
2. Watch for the "Cancel" button appearing during loading
3. Click "Cancel" — should immediately stop with a friendly message
4. Close the drawer while Remy is thinking — should abort silently
5. If Ollama hangs for >60s (structured) or >90s (streaming), the request auto-cancels with a timeout message

## Files Changed

- `lib/ai/parse-ollama.ts` — `withTimeout()`, timeout on main call + repair pass
- `app/api/remy/stream/route.ts` — streaming timeout, pre-stream timeout
- `components/ai/remy-drawer.tsx` — AbortController, cancel button, abort-on-close
