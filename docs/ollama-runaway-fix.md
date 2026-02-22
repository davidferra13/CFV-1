# Ollama Runaway Fix — Hard Timeouts & Abort Controls

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`
**Commit:** `812078c`

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
2. **No AbortController on client-side fetch** — once fired, the request was unstoppable
3. **No cancel button** — the user had no way to stop a runaway request from the UI
4. **No timeout on the pre-stream setup phase** — `classifyIntent()` + `loadRemyContext()` could block indefinitely

## Fixes Applied

### 1. `lib/ai/parse-ollama.ts` — Hard timeout on every Ollama call

- Added `withTimeout()` wrapper that rejects after 30s (default)
- Applied to both the main `ollama.chat()` call AND the repair pass
- Timeout is configurable via `options.timeoutMs`
- Throws `OllamaOfflineError` with reason `'timeout'` — caught cleanly by all callers

### 2. `app/api/remy/stream/route.ts` — Server-side streaming timeout

- Added `OLLAMA_STREAM_TIMEOUT_MS = 45_000` (45 seconds)
- Both QUESTION and MIXED streaming paths now check an `AbortController` signal on every chunk
- If Ollama hangs mid-stream, the timeout fires and the SSE stream closes with a clean error
- Added 20s timeout on the pre-stream setup phase (`classifyIntent` + `loadRemyContext` + `loadRelevantMemories`)

### 3. `components/ai/remy-drawer.tsx` — Client-side abort + cancel UI

- Added `AbortController` to the `fetch('/api/remy/stream')` call
- 60s client-side hard timeout (belt + suspenders with the server-side 45s)
- **Closing the drawer aborts the in-flight request** — no more zombie requests
- Added "Cancel" button during the pre-streaming loading phase
- Added "Stop generating" link during active streaming
- Abort/timeout errors show a friendly message, not a scary error

## Timeout Layering

| Layer             | Timeout        | What it protects                                              |
| ----------------- | -------------- | ------------------------------------------------------------- |
| `parseWithOllama` | 30s per call   | Classifier, command parser, repair pass                       |
| Pre-stream setup  | 20s total      | `classifyIntent` + `loadRemyContext` + `loadRelevantMemories` |
| SSE streaming     | 45s            | `ollama.chat({ stream: true })` in QUESTION and MIXED paths   |
| Client fetch      | 60s            | Entire round-trip from browser to server                      |
| Cancel button     | User-initiated | Manual abort at any time                                      |
| Drawer close      | Automatic      | Abort when user closes Remy                                   |

## How to Test

1. Open Remy, send a message that Ollama might choke on
2. Watch for the "Cancel" button appearing during loading
3. Click "Cancel" — should immediately stop with a friendly message
4. Close the drawer while Remy is thinking — should abort silently
5. If Ollama hangs for >30s, the request auto-cancels with a timeout message

## Files Changed

- `lib/ai/parse-ollama.ts` — `withTimeout()`, timeout on main call + repair pass
- `app/api/remy/stream/route.ts` — streaming timeout, pre-stream timeout
- `components/ai/remy-drawer.tsx` — AbortController, cancel button, abort-on-close
