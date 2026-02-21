# Build: Auto-Simulation Closed Loop

## What Changed

The Simulation Lab quality loop now runs automatically — no user needs to navigate to `/dev/simulate` or press a button. The app schedules and triggers itself.

## Why

The simulation catches AI module regressions before they reach clients. But that only works if it actually runs. Manual triggering meant it got skipped when busy. The closed loop removes that dependency entirely.

## How It Works

### Startup Scheduling (`instrumentation.ts`)

Next.js 14 runs `instrumentation.ts` once when the Node.js server process starts. This registers the scheduler:

```
app starts → instrumentation.ts → scheduleSimulation()
  → waits 45s (warmup)
  → hits /api/scheduled/simulation/check
  → if tenants are due → hits /api/scheduled/simulation
  → repeats every 6 hours
```

The 45-second warmup ensures the server is fully ready before the first self-request.

### Due Check (`/api/scheduled/simulation/check`)

Lightweight endpoint — just checks whether any tenant's last simulation run was more than 7 days ago. Returns `{ dueFor: string[] }`. No simulation work happens here.

### Simulation Run (`/api/scheduled/simulation`)

Full simulation run. Authenticated via `CRON_SECRET`. Runs all 6 modules × 2 scenarios per module per tenant. Results stored in `simulation_runs` and `simulation_results`. Fine-tuning examples collected automatically.

- Accepts GET or POST
- POST can scope to `{ tenantIds: string[] }` to run for specific tenants only
- Falls back to all chefs if no body provided

### Core Runner (`lib/simulation/simulation-runner.ts`)

The simulation logic was extracted from `simulation-actions.ts` into a standalone module with no `'use server'` directive. This means it can be imported by both:

- `simulation-actions.ts` — the server action (UI button, requires admin session)
- `app/api/scheduled/simulation/route.ts` — the cron route (no session, uses CRON_SECRET)

`simulation-actions.ts` is now a thin wrapper that calls `runSimulationInternal(user.tenantId!, config)` after verifying admin auth.

## New Files

| File                                          | Purpose                                                   |
| --------------------------------------------- | --------------------------------------------------------- |
| `lib/simulation/simulation-runner.ts`         | Core sim logic, no auth, accepts tenantId                 |
| `lib/simulation/ollama-client.ts`             | Ollama client using node:http — no undici headers timeout |
| `lib/simulation/auto-schedule.ts`             | Self-scheduling loop — HTTP self-calls every 6h           |
| `instrumentation.ts`                          | Next.js startup hook that registers the scheduler         |
| `app/api/scheduled/simulation/route.ts`       | GET/POST endpoint, CRON_SECRET auth                       |
| `app/api/scheduled/simulation/check/route.ts` | Lightweight due-check — returns which tenants need a run  |

## Modified Files

| File                                   | Change                                     |
| -------------------------------------- | ------------------------------------------ |
| `lib/simulation/simulation-actions.ts` | Now delegates to `runSimulationInternal()` |

## On-Demand Manual Trigger

The route works as a manual trigger too — no browser needed:

```bash
# Trigger immediately (all due tenants)
curl -X POST http://localhost:3000/api/scheduled/simulation \
  -H "Authorization: Bearer $CRON_SECRET"

# Check who's due without triggering
curl http://localhost:3000/api/scheduled/simulation/check \
  -H "Authorization: Bearer $CRON_SECRET"
```

## What "Fixes Itself" Means

The simulation surfaces failures in `simulation_results` with a `failures[]` array explaining what went wrong. The Simulation Lab UI at `/dev/simulate` shows these results with per-module pass rates. The loop:

1. **Identifies** which modules are failing and why
2. **Collects** high-quality examples (score ≥ 90) into `fine_tuning_examples`
3. **Shows** per-module pass rate trends over time

Actual prompt changes still require a human — per the AI policy, the system surfaces insights but the chef (or developer) makes canonical changes.

## Env Vars Required

- `CRON_SECRET` — already used by all 20 other scheduled routes; must be set in `.env.local`
- `NEXT_PUBLIC_APP_URL` or `NEXTAUTH_URL` — used to construct the self-call URL; defaults to `http://localhost:3000` if neither is set (correct for local dev)

## Ollama Client: No Headers Timeout

The simulation uses a custom `makeOllamaClient()` from `lib/simulation/ollama-client.ts` rather than a plain `new Ollama({ host })`. This is required for large local models.

**Problem:** Node.js 18+ uses undici for `global fetch()`, which enforces a 30-second `headersTimeout`. With large models (30B+) running on CPU, Ollama takes >30 seconds to start sending a response — undici kills the connection with `UND_ERR_HEADERS_TIMEOUT` before any data arrives.

**Fix:** `makeOllamaClient()` provides a custom `fetch` backed by `node:http`/`node:https`. These modules have no built-in headers timeout. The connection stays open as long as Ollama is responding.

This fix applies to all three simulation inner files: `scenario-generator.ts`, `pipeline-runner.ts`, and `quality-evaluator.ts`.

## Schedule

Checks every 6 hours. Runs the full simulation if the last run for any active tenant was more than 3 days ago. With `qwen3-coder:30b` on CPU, a full run can take 1–4 hours. Results are written to the database and `docs/simulation-report.md` as they complete.
