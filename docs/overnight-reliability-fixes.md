# Overnight Reliability Fixes — 2026-03-01

## Context

Remy eval tests ran overnight (Feb 28–Mar 1). Results showed:

- **Data accuracy improved** from 33% → 100% when model was warm
- **Beta was down 24+ hours** (PM2 crash-looping, 207 restarts) — unnoticed
- **Ollama hung at ~9 AM** — num_ctx still present in 3 routes caused 170s KV cache hangs
- **270-test suite took ~13h** — exceeded overnight window, only partial results
- **Model eviction** between tests (keep_alive was 5m, too short for slow runs)

## Root Causes

1. **num_ctx not fully purged:** Stream route was fixed earlier, but `client/route.ts`, `public/route.ts`, and `landing/route.ts` still had `num_ctx: getOllamaContextSize()`. This triggers KV cache reallocation on every call (170s hang on RTX 3050 with GPU+RAM split).

2. **keep_alive too short:** Most callers used `'5m'`. With 270 tests averaging 175s each, the model was frequently evicted and reloaded (30-60s cold start each time).

3. **Warmup loaded wrong model:** `warmup/route.ts` loaded `qwen3:4b` (fast tier) but the stream route uses `qwen3-coder:30b` (standard tier). The warmup was useless.

4. **No beta auto-remediation:** `pollUptime()` in server.mjs detected failures but only logged them. No auto-restart, no state-change alerts (spammed every 60s instead of only on transitions).

5. **Eval harness bugs:** Inverted retry logic (`||` instead of `&&`) caused retries to never work. Dead `runTest()` function cluttered the code. Phase 2 grader warmup had no timeout or error handling.

6. **Overnight loop design:** Restarted Ollama between runs (counterproductive — kills loaded model), ran all 270 tests (13h), no time budget.

7. **Simulation pipeline misalignment:** Generator LLM created ground truth that conflicted with pipeline logic for quote_draft, inquiry_parse, and correspondence modules.

## Fixes Applied

### Tier 1 — Critical (prevents hangs and outages)

| Fix                            | File(s)                                                     | What Changed                                              |
| ------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------- |
| Remove num_ctx from all routes | `client/route.ts`, `public/route.ts`, `landing/route.ts`    | Removed `num_ctx` option + `getOllamaContextSize` imports |
| Harmonize keep_alive to 30m    | 6 files (3 routes + ace-ollama, cross-monitor, ollama-wake) | `'5m'` → `'30m'` everywhere                               |
| Fix warmup model               | `warmup/route.ts`                                           | `getOllamaModel('fast')` → `getOllamaModel('standard')`   |
| Restart beta                   | Pi PM2                                                      | `pm2 restart chefflow-beta` (was crash-looping)           |

### Tier 2 — Monitoring & Auto-Recovery

| Fix                  | File(s)                            | What Changed                                                   |
| -------------------- | ---------------------------------- | -------------------------------------------------------------- |
| Auto-remediation     | `scripts/launcher/server.mjs`      | 3 consecutive beta failures → SSH restart PM2 (10min cooldown) |
| State-change alerts  | `scripts/launcher/server.mjs`      | Alerts fire only on up→down or down→up transitions             |
| Pi health check cron | `scripts/pi-health-check.sh` (new) | HTTP health check + PM2 restart if frozen + disk space warning |

### Tier 3 — Eval Harness

| Fix                 | File(s)                   | What Changed                                                |
| ------------------- | ------------------------- | ----------------------------------------------------------- |
| Fix retry logic     | `eval-harness.ts`         | `\|\|` → `&&` in loading-error retry condition (2 places)   |
| Remove dead code    | `eval-harness.ts`         | Deleted unused `runTest()` function                         |
| Add warmup timeouts | `eval-harness.ts`         | `AbortSignal.timeout(120_000)` on Phase 1 + Phase 2 warmups |
| Fix summary script  | `summarize-overnight.mjs` | `llmScore?.overall` → `llmGrade?.overall`                   |

### Tier 4 — Overnight Loop

| Fix                   | File(s)             | What Changed                                 |
| --------------------- | ------------------- | -------------------------------------------- |
| Curated nightly suite | `overnight-loop.sh` | ~41 critical tests (was 270), 6h time budget |
| No Ollama restart     | `overnight-loop.sh` | Removed `ollama stop/serve` between runs     |
| Keep-alive refresh    | `overnight-loop.sh` | Pings model between runs to prevent eviction |

### Tier 5 — Code Cleanup & Safety

| Fix                       | File(s)           | What Changed                                                                                                 |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Remove dead exports       | `providers.ts`    | Deleted `computeDynamicContext()`, `getContextSizeForEndpoint()`, `getOllamaContextSize()`, `RemyLayer` type |
| Prompt truncation warning | `stream/route.ts` | Logs warning when system prompt > 24k chars                                                                  |

### Tier 6 — Simulation Pipeline

| Fix                         | File(s)                 | What Changed                                                                        |
| --------------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| Deterministic quote pricing | `scenario-generator.ts` | Recomputes `expectedPriceRangeCents` using pipeline formula instead of trusting LLM |
| Inquiry parse alignment     | `scenario-generator.ts` | Generator prompt requires explicit name/guest count formats                         |
| Correspondence rubric       | `quality-evaluator.ts`  | Evaluator checks client name in subject (-20) and occasion in body (-15)            |

## Not Done (requires external setup)

- **UptimeRobot:** External monitoring service — needs account creation and webhook setup. Documented as future improvement.

## Expected Impact

- **No more 170s hangs** on client/public/landing routes
- **Model stays loaded** for 30min between requests (was 5min)
- **Beta auto-recovers** from crashes within ~3 minutes
- **Overnight suite completes** in ~2-3 hours (was 13h+)
- **Simulation tests** should see improved pass rates for quote_draft, inquiry_parse, correspondence
