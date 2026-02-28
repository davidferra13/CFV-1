# Client Remy Quality Testing

Architecture doc for the Client Remy AI response quality test suite.

## Overview

This test suite sends 100 real client-facing prompts to the Client Remy endpoint (`/api/remy/client`), through real Ollama inference (qwen3:30b), timing and evaluating every response. No mocks, no Playwright, no browser — direct HTTP calls with SSE stream parsing.

## Architecture

```
client-quality-runner.mjs (self-contained)
  ├── Authentication (Supabase client login)
  ├── SSE Stream Parser (inline)
  ├── Prompt Sender (HTTP POST → SSE read)
  ├── Evaluator (keyword, timing, tone, privacy)
  └── Report Generator (JSON benchmark + Markdown report)
```

### Key Differences from Chef Remy Suite

| Aspect       | Chef Remy                                  | Client Remy                         |
| ------------ | ------------------------------------------ | ----------------------------------- |
| Endpoint     | `/api/remy/stream`                         | `/api/remy/client`                  |
| Auth         | Chef role (agent account)                  | Client role (e2e client account)    |
| Model        | qwen3:30b (via classifier + router)        | qwen3:30b (direct, `standard` tier) |
| Commands     | Yes (task DAG, nav, commands)              | No (conversation only)              |
| SSE events   | token, intent, tasks, nav, done, error     | token, done, error                  |
| Request body | message + currentPage + recentPages + etc. | message + history                   |
| Rate limit   | Admin bypass (no limit)                    | Client rate limit (12/min)          |

## Files

| File                                                    | Purpose                              |
| ------------------------------------------------------- | ------------------------------------ |
| `tests/remy-quality/prompts/client-prompts.json`        | 100 prompts with evaluation criteria |
| `tests/remy-quality/harness/client-quality-runner.mjs`  | Self-contained runner                |
| `tests/remy-quality/benchmarks/{timestamp}-client.json` | JSON benchmark output                |
| `tests/remy-quality/reports/{date}-client-quality.md`   | Markdown report with full responses  |

## Prompt Categories (100 total)

| Category               | IDs    | Count |
| ---------------------- | ------ | ----- |
| Booking & Inquiries    | 1-15   | 15    |
| Dietary & Allergies    | 16-30  | 15    |
| Menu & Food Questions  | 31-50  | 20    |
| Guest Count Changes    | 51-57  | 7     |
| Pricing & Payments     | 58-70  | 13    |
| Event Day Logistics    | 71-85  | 15    |
| Communication & Status | 86-92  | 7     |
| Post-Event & Rebooking | 93-100 | 8     |

## Evaluation Criteria

Each response is evaluated on:

1. **Request Success** — HTTP 200, SSE stream completes
2. **Min Length** — At least 20 characters (not empty/truncated)
3. **Max Length** — Under 3000 characters (concise)
4. **Timing** — Under 120 seconds total
5. **Must Contain** — At least one expected keyword present (case-insensitive)
6. **Must Not Contain** — No error strings (`error`, `offline`, `undefined`, `null`, `NaN`, etc.)
7. **Tone Check** — No robotic phrases (`As an AI`, `I cannot`, `I'm just a language model`)
8. **Privacy** — No internal data leaks (`tenant_id`, `entity_id`, `supabase`, `profit margin`, etc.)
9. **No Thinking Leak** — No `<think>` tags from qwen3's thinking mode

## Authentication

Uses the e2e client test account from `.auth/seed-ids.json`:

- Email: `e2e.client.{suffix}@chefflow.test`
- Password: from seed file
- Role: `client` (NOT chef, NOT admin)

Auth follows the Supabase cookie pattern from `scripts/test-remy.mjs`:

1. Sign in via `@supabase/supabase-js`
2. Build `sb-{projectRef}-auth-token` cookie with base64url-encoded session JSON
3. Send cookie with every request

## Rate Limiting

Client Remy has a 12/min rate limit (unlike chef which has admin bypass). The runner paces requests at ~9/min (6.5 second delay between requests) to stay safely under the limit.

Total expected runtime: ~11 minutes for 100 prompts (6.5s delay × 100 = ~10.8 min + inference time).

## Running

```bash
# Prerequisites:
# 1. Dev server running on port 3100
# 2. Ollama running with qwen3:30b loaded
# 3. Client test account seeded

npm run test:remy-quality:client
```

## Output

### JSON Benchmark

Saved to `tests/remy-quality/benchmarks/{timestamp}-client.json` with:

- Summary stats (pass rate, avg timing, token counts)
- Per-prompt results with full response text, timing, evaluation checks

### Markdown Report

Saved to `tests/remy-quality/reports/{date}-client-quality.md` with:

- Summary table
- Category breakdown
- Failures section with details
- Every single response printed in full with timing

## Pass/Fail Threshold

The runner exits with code 1 if pass rate drops below 70%. This is a quality gate — below 70% indicates systemic issues with the client endpoint.
