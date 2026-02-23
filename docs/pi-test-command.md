# Admin-Only "Run a Test" Command — Raspberry Pi Health Check

## Date: 2026-02-22

## What Changed

Added an admin-only command in the Remy drawer that forces a request to the Raspberry Pi Ollama endpoint, bypassing the normal PC-first routing. This lets the developer quickly verify the Pi is alive and responding.

## How It Works

1. **Pattern detection** — regex patterns match phrases like "run a test", "test the pi", "ping the pi"
2. **Admin gate** — only triggers for admin users (checked via `isRemyAdmin()`)
3. **Direct Pi call** — skips the PC entirely, pings the Pi's `/api/tags`, then sends a short chat prompt
4. **SSE response** — returns a formatted health report (endpoint, model, ping time, chat response time, total time, and the Pi's actual reply)

## Trigger Phrases

Any of these (case-insensitive) in the Remy drawer:

- "run a test" / "run test"
- "test the pi"
- "ping the pi" / "ping pi"
- "pi test"
- "test raspberry"

Non-admin users typing these phrases will get normal Remy behavior (no interception).

## Error States

| Condition                 | Response                                          |
| ------------------------- | ------------------------------------------------- |
| No `OLLAMA_PI_URL` in env | "Pi Test — FAILED" with setup instructions        |
| Pi unreachable            | "Pi Test — UNREACHABLE" with troubleshooting hint |
| Model error               | Reports the error in the chat response field      |
| Pi healthy                | Full health report table with timing              |

## File Changed

- `app/api/remy/stream/route.ts` — added `PI_TEST_PATTERNS`, `detectPiTestIntent()`, `handlePiTest()`, and interception in POST handler

## Architecture Notes

- Follows the exact same early-interception pattern as `detectMemoryIntent()` — regex match before intent classification
- No new dependencies or imports beyond existing `getOllamaPiUrl` and `getModelForEndpoint` from providers
- No UI changes needed — uses the existing Remy drawer SSE rendering
