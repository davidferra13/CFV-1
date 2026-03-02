# Ollama Backpressure — Load Management & Concurrency Control

> **Umbrella term for the entire system:** BACKPRESSURE — how ChefFlow prevents AI overload, queues concurrent requests, and degrades gracefully under high demand.

---

## What Is Backpressure?

**Backpressure** is the system's ability to handle demand that exceeds its capacity. It's the opposite of an overload crash.

When multiple users ask Remy questions simultaneously:

```
User 1: "Optimize my menu" ──┐
User 2: "Calculate portions"  ├──> [QUEUE] ──> [Ollama] ──> User N gets response
User 3: "Analyze my costs"    │   (backpressure)
User 10: "Draft a proposal" ──┘
```

**Without backpressure:** All 10 requests hit Ollama at once → GPU overwhelmed → all fail
**With backpressure:** Requests queue up → Ollama processes 1-2 at a time → all eventually succeed

### Three Components of Backpressure

1. **Queuing** — Put requests in order, don't process all at once
2. **Concurrency limits** — Only N tasks run simultaneously
3. **Feedback to callers** — Tell users "your request is #7, wait 30 seconds" instead of failing silently

ChefFlow implements all three via `lib/ai/queue/`.

---

## Architecture — How It Works

### The Dual-Slot Queue (`lib/ai/queue/worker.ts`)

```typescript
┌─────────────────────────────────────────┐
│         Task Queue (Database)           │
│  100+ pending tasks waiting for a slot  │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
    ┌────────────┐       ┌────────────┐
    │ PC Slot    │       │ Pi Slot    │
    │ (Running)  │       │ (Running)  │
    └────────────┘       └────────────┘
        ↓                     ↓
   [Ollama PC]           [Ollama Pi]
   qwen3:7b              qwen3:4b
```

Two **independent processing slots** (PC + Pi):

- **PC Slot:** Handles interactive Remy chat + fast background tasks
- **Pi Slot:** Handles heavy background work (doesn't block user chat)
- Each slot claims one task at a time from the queue
- Slots are isolated — PC failure doesn't affect Pi

### Circuit Breaker Per Slot

If a slot has 5 consecutive failures:

- It **pauses processing** for 30 seconds
- Allows time for Ollama to recover (OOM, network hiccup, etc.)
- Then resumes

```typescript
// In worker.ts
if (slot.consecutiveFailures >= OLLAMA_GUARD.MAX_CONSECUTIVE_FAILURES) {
  slot.backoffUntil = new Date(Date.now() + OLLAMA_GUARD.FAILURE_BACKOFF_MS)
  // Pauses this slot until backoffUntil
}
```

### Interactive Lock (Remy Chat Priority)

When a user is actively typing to Remy:

- **PC Slot pauses** background work
- **Remy gets full GPU** for instant responses
- Pi continues processing in the background
- User sees <1 second response times even when queue is full

```typescript
// Remy acquires the lock on message
acquireInteractiveLock() // PC slot pauses
// ... wait for Remy response ...
releaseInteractiveLock() // PC slot resumes when user's done
```

### Guards & Timeouts

| Guard                | What                               | Where         |
| -------------------- | ---------------------------------- | ------------- |
| **Per-slot backoff** | Pause if too many failures         | worker.ts:481 |
| **Interactive lock** | Pause PC when user typing          | worker.ts:261 |
| **Call timeout**     | Kill Ollama request if >30s        | worker.ts:396 |
| **Task timeout**     | Fail task if handler exceeds limit | worker.ts:405 |
| **Cooldown**         | 500ms between tasks (thermal)      | worker.ts:455 |
| **Health check**     | Only process if endpoint healthy   | worker.ts:281 |

---

## Monitoring — Self-Awareness (`lib/ai/queue/monitor.ts`)

The queue **watches itself** continuously:

### Metrics Tracked

- **Success rate** — alert if < 80%
- **Response time** — alert if 3× baseline (anomalies)
- **Queue depth** — alert if > 50 pending
- **Failure types** — which tasks are breaking?
- **Consecutive failures** — triggers circuit breaker

### Reports Generated

**Every hour:** `data/remy-stats/daily-summary-YYYY-MM-DD.json`

```json
{
  "window": "24h",
  "totalTasks": 487,
  "successRate": 0.98,
  "avgDurationMs": 2300,
  "failedTaskTypes": ["aar_generator"],
  "alerts": ["Slow tasks: aar_generator (6450ms avg)"]
}
```

**Per-task stats:** `data/remy-stats/task-performance.json`

```json
{
  "chef_event_recap": {
    "count": 127,
    "avgMs": 1800,
    "failRate": 0.02,
    "retryRate": 0.05
  }
}
```

### Alerts Surfaced to Chef

If the queue health goes **degraded** or **critical**:

- Banner appears in Remy drawer
- Admin sees alerts in Mission Control
- No silent failures

---

## Testing — Stress Test Suite

### Basic Stress Test (5 concurrent)

```bash
npm run test:stress:ollama
```

Runs for 30 seconds with 5 simultaneous requests. Good for sanity check.

### High-Load Test (20 concurrent)

```bash
npm run test:stress:ollama:high
```

Runs for 60 seconds with 20 simultaneous requests. Tests breaking point.

### Custom Parameters

```bash
STRESS_CONCURRENCY=50 STRESS_DURATION=120 npm run test:stress:ollama
```

- `STRESS_CONCURRENCY` — how many requests in parallel
- `STRESS_DURATION` — how long to run (seconds)

### What the Test Does

1. Signs in as agent
2. Spawns N concurrent Remy requests
3. Each request asks: "Give me a quick summary of what a private chef does"
4. Monitors:
   - Response times (p50, p95, p99, max)
   - Success/timeout/error rates
   - Throughput (requests/second)
   - Failure types

### Report Output

```
========== STRESS TEST REPORT ==========
Results: 142 success, 0 timeout, 0 error
Success rate: 1.0
Latency (p95): 2840ms
Throughput: 2.4 req/s

Recommendations:
✅ Queue system is handling load well. Ready for production testing.

Full report: data/stress-reports/ollama-stress-1709567234567.json
=========================================
```

---

## Interpretation — What Do The Numbers Mean?

### Success Rate > 95%?

✅ **Good.** Normal user load won't break it.

### Success Rate 80-95%?

⚠️ **Degraded.** Some users will see failures. Need to:

- Reduce max concurrent requests
- Upgrade model (faster inference)
- Scale to Pi (add second Ollama endpoint)

### Success Rate < 80%?

❌ **Critical.** Most requests fail. Immediate action needed:

- Check Ollama health: `curl http://localhost:11434/api/tags`
- Check system resources: RAM/CPU/GPU
- Increase timeouts temporarily: `CALL_TIMEOUT_MS` in `lib/ai/queue/types.ts`
- Reduce concurrency limit: `MAX_CONCURRENT_TASKS`

### P95 Latency > 5 seconds?

⚠️ Users will wait. Not ideal but acceptable for background tasks.

### P95 Latency > 10 seconds?

❌ Users abandon. Need optimization:

- Check model size (7B vs 13B)
- Check if GPU is being used: `nvidia-smi` during test
- Check if tasks are queued behind long-running jobs

### Timeouts > 0?

⚠️ At least some requests exceeded the timeout limit (30s). Increase if acceptable, or optimize task definition.

---

## Configuration — Tuning Parameters

### In `lib/ai/queue/types.ts`

```typescript
export const OLLAMA_GUARD = {
  // How often to check for new tasks
  POLL_INTERVAL_MS: 500,

  // Kill request if it takes longer than this
  CALL_TIMEOUT_MS: 30_000,

  // How many consecutive failures before circuit breaker
  MAX_CONSECUTIVE_FAILURES: 5,

  // How long to pause after hitting circuit breaker
  FAILURE_BACKOFF_MS: 30_000,

  // Rest between tasks (prevents thermal throttling)
  COOLDOWN_MS: 500,
}
```

### Tuning Strategy

**If success rate is low:**

1. Increase `CALL_TIMEOUT_MS` to 60_000 (give Ollama more time)
2. Increase `FAILURE_BACKOFF_MS` to 60_000 (longer cooldown)
3. Decrease `MAX_CONCURRENT_FAILURES` to 3 (fail faster, recover sooner)

**If latency is high:**

1. Decrease `COOLDOWN_MS` to 200 (process faster)
2. Decrease `CALL_TIMEOUT_MS` to 15_000 (timeout sooner, let retries happen)
3. Check model selection — is it using fast or standard?

**For production (live users):**

1. `POLL_INTERVAL_MS: 250` (more responsive)
2. `CALL_TIMEOUT_MS: 45_000` (generous, don't fail fast)
3. `FAILURE_BACKOFF_MS: 60_000` (long recovery window)
4. `COOLDOWN_MS: 300` (thermal protection)

---

## Real-World Scenarios

### Scenario 1: 3 Concurrent Users (Normal Day)

```
User 1: [req-----] (2.3s)
User 2:      [req-----] (2.1s)
User 3:           [req-----] (2.4s)

Result: All happy. p95 = 2.4s
```

Queue handles this easily. No backpressure needed.

### Scenario 2: 15 Concurrent Users (Marketing Spike)

```
Requests 1-5:   [req-----]
Requests 6-10:        [queue waiting...]
Requests 11-15:            [queue waiting...]

After 5s:
Requests 6-10:  [req-----]
Requests 11-15: [queue waiting...]

After 10s:
Requests 11-15: [req-----]

Result: All succeed, but wait. p95 = 5s, some p99 = 10s
Queue delivers backpressure. Users see slower but reliable.
```

### Scenario 3: 50 Concurrent Users (System Overload)

Without backpressure:

```
❌ All crash
Ollama: OOM → killed
```

With backpressure:

```
PC Slot: [req] [req] [req] ... max 5 active
Pi Slot: [req] [req] [req] ... max 5 active
Queue: 40 waiting...

Results:
- 20 succeed in 10s
- 20 succeed in 25s
- All eventual success
- p95 = 20s, p99 = 25s
```

Queue trades latency for reliability. Users wait, but don't lose data.

---

## Deployment Checklist

Before going live, verify:

- [ ] Run `npm run test:stress:ollama` — success rate > 98%
- [ ] Run `npm run test:stress:ollama:high` — success rate > 90%
- [ ] Check `data/remy-stats/` for any failures in the last 24h
- [ ] Confirm Pi is configured (if dual-slot needed): `echo $OLLAMA_PI_URL`
- [ ] Monitor Ollama during peak usage: `nvidia-smi` (PC) + SSH to Pi
- [ ] Set up alerting for `queueHealth === 'critical'`
- [ ] Document your SLA: "p95 latency < X seconds", "success rate > Y%"

---

## Troubleshooting

### "All requests timeout"

1. Is Ollama running? `curl http://localhost:11434/api/tags`
2. Is GPU available? `nvidia-smi` shows memory?
3. Increase timeout: `CALL_TIMEOUT_MS: 60_000`

### "Queue is huge (100+ pending), nothing processing"

1. Check if any task handler is broken: Look at `data/remy-stats/task-performance.json`
2. Is PC slot locked by Remy? Try closing Remy and restarting worker
3. Check circuit breaker state: `startWorker()` logs should show if paused

### "High success rate but slow (p95 = 15s)"

1. Model is too big for GPU. Try smaller model or 4B on Pi
2. System is CPU-throttled. Check temperatures: `vcgencmd measure_temp` (Pi)
3. Increase cooldown is masking the real problem — investigate task definition

### "Works in-house but fails on beta/prod"

1. Pi may be OOM — check: `ssh pi 'free -h'`
2. Network latency — test: `ping 10.0.0.177` (Pi) should be <5ms
3. Different model on Pi — check `.env.local.beta` has correct model names
4. Check if Ollama is masking on Pi: `grep OLLAMA /etc/environment` on Pi

---

## Further Reading

- **Queue implementation:** `lib/ai/queue/` — worker, monitor, actions, types
- **Model selection:** `lib/providers/` — which model for which endpoint
- **Task routing:** `lib/ai/llm-router.ts` — how tasks pick their endpoint
- **Incident reporting:** `lib/incidents/` — tracks failures and anomalies
