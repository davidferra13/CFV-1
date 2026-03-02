# Ollama Stress Testing — Complete Guide

> **Production-Grade Concurrency Testing**
>
> Comprehensive suite for verifying the AI queue handles concurrent load, failure scenarios, and sustained usage without breaking.

---

## Quick Start

```bash
# Basic sanity check (5 concurrent users, 30 seconds)
npm run test:stress:ollama

# High load (20 concurrent users, 60 seconds)
npm run test:stress:ollama:high

# Sustained load (2 hours, real-world usage patterns)
npm run test:stress:ollama:sustained

# Failure scenario (Ollama dies mid-test, queue must recover)
npm run test:stress:ollama:failure
```

---

## What Each Test Does

### 1. Basic Test (5 concurrent, 30 seconds)

**When to run:** Before every feature release
**Purpose:** Sanity check — does the queue work at all?

```
Requests: 5 concurrent, arriving in waves
Load pattern: Bursty (realistic user behavior)
Task mix: Public + Chef + Client + Background
Expected: 100% success, p95 < 2 seconds
```

**Result interpretation:**

- ✅ **PASS**: Success rate > 95%, p95 < 2s
- ❌ **FAIL**: Anything else means the queue is broken

### 2. High Load Test (20 concurrent, 60 seconds)

**When to run:** Before production deployment
**Purpose:** Will it handle a traffic spike?

```
Requests: 20 concurrent, arriving in waves
Load pattern: Bursty with higher intensity
Task mix: Multiple types, varied complexity
Expected: Success > 90%, p95 < 5 seconds
```

**Result interpretation:**

- ✅ **PASS**: Success > 90%, p95 < 5s
- ⚠️ **WARN**: Success 80-90%, p95 5-10s (degraded but working)
- ❌ **FAIL**: Success < 80% (queue is overwhelmed)

### 3. Sustained Load Test (8 concurrent, 2 hours)

**When to run:** After major queue/model changes
**Purpose:** Does it stay stable over time? Memory leaks? Thermal issues?

```
Requests: 8 concurrent, constant stream
Load pattern: Steady state with noise
Task mix: All types equally
Duration: 7200 seconds (2 hours)
Expected: Success > 95% maintained for full duration
```

**Result interpretation:**

- ✅ **PASS**: Consistent success > 95% throughout
- ⚠️ **WARN**: Success starts 95% but drops to 80-90% by end (memory leak?)
- ❌ **FAIL**: Success degrades significantly after 30+ minutes

### 4. Failure Scenario Test (15 concurrent, 60 seconds, Ollama dies at 30s)

**When to run:** Before deployment (CRITICAL)
**Purpose:** Queue gracefully handles Ollama crashes, doesn't cascade

```
Requests: 15 concurrent, constant
Load pattern: Ramping up
At 30 seconds: Ollama killed (pkill -9 ollama)
Expected: Queue queues, once Ollama restarts, catches up
```

**Result interpretation:**

- ✅ **PASS**: Queue survives, most requests eventually succeed
- ⚠️ **WARN**: Some requests fail but queue doesn't cascade
- ❌ **FAIL**: Massive cascade of failures, queue never recovers

---

## Test Architecture

### What's Being Tested

```
Client Requests
    ↓
[Authentication] — validates agent credentials
    ↓
[Request Dispatch] — sends async HTTP requests
    ↓
[Queue System] — lib/ai/queue/*
    ├─ PC Slot (interactive + fast background)
    └─ Pi Slot (heavy background)
    ↓
[Ollama] — qwen3 models
    ↓
[Response] — measured latency, captured result
```

### Task Types Tested

| Type          | Endpoint               | Priority  | Complexity           |
| ------------- | ---------------------- | --------- | -------------------- |
| `remy_public` | `/api/remy/public`     | ON_DEMAND | Medium (generic)     |
| `remy_chef`   | `/api/remy/chat`       | ON_DEMAND | High (context-aware) |
| `remy_client` | `/api/remy/client`     | REACTIVE  | Low (structured)     |
| `background`  | `/api/remy/background` | BATCH     | High (analysis)      |

Each wave of requests includes all four types to test mixed workload behavior.

### Load Patterns

**Basic:** Bursty waves

```
Users 1-5    ■■■■■
Users 6-10       ■■■■■
Users 11-15          ■■■■■
Users 16-20             ■■■■■
```

**Sustained:** Constant steady state

```
Users 1-8 ■■■■■■■■ (2 hours)
```

**Failure:** Ramp up, then Ollama dies

```
Users ramp up    ■■■→■■■■■■■■■■■
Ollama dies at 50%   ✗ (recovers when restarted)
```

---

## Interpreting Reports

### Report Location

```
data/stress-reports/ollama-stress-{mode}-{timestamp}.json
```

Example: `ollama-stress-basic-1709567234567.json`

### Report Structure

```json
{
  "timestamp": "2026-03-02T10:15:42.123Z",
  "mode": "basic",
  "config": {
    "concurrency": 5,
    "duration": 30
  },
  "results": {
    "total": 142,
    "successes": 142,
    "retries": 3,
    "timeouts": 0,
    "errors": 0,
    "successRate": 1.0
  },
  "latency": {
    "avgMs": 2100,
    "p50Ms": 1800,
    "p95Ms": 2840,
    "p99Ms": 3200,
    "maxMs": 3500
  },
  "throughput": {
    "requestsPerSecond": 4.7,
    "successesPerSecond": 4.7
  },
  "byTaskType": {
    "remy_public": {
      "count": 36,
      "successRate": 1.0,
      "avgMs": 1900
    },
    "remy_chef": {
      "count": 35,
      "successRate": 1.0,
      "avgMs": 2300
    }
    // ... etc
  },
  "system": {
    "avgGpuPercent": 45,
    "maxGpuMb": 2800,
    "ollamaHealthyPercent": 100
  },
  "sla": {
    "threshold": {
      "successRate": 0.95,
      "p95LatencyMs": 5000,
      "p99LatencyMs": 10000,
      "throughputReqSec": 2.0
    },
    "met": {
      "successRate": true,
      "p95Latency": true,
      "p99Latency": true,
      "throughput": true
    },
    "overallCompliance": "PASS"
  },
  "recommendations": ["✅ Success rate meets SLA", "✅ Latency meets SLA"]
}
```

### Key Metrics to Watch

#### Success Rate

- **> 99%**: Perfect, ready for production
- **95-99%**: Good, acceptable
- **80-95%**: Degraded, needs investigation
- **< 80%**: Critical failure

#### Latency (p95)

- **< 2000ms**: Excellent
- **2-5s**: Good
- **5-10s**: Acceptable but slow
- **> 10s**: Users will abandon

#### P99 vs P95

If p99 is much higher than p95 (tail latency spike):

- Suggests occasional tasks are being delayed
- Check if background jobs are blocking interactive ones
- Verify interactive lock is working: search for "Interactive lock acquired"

#### Per-Task-Type Success Rates

If one task type fails while others succeed:

- That task may be too heavy for the model
- Check model tier selection in `lib/providers/`
- Consider routing to Pi instead of PC

#### GPU Memory Trend

- Constant during test: ✅ Good
- Increasing over time: ⚠️ Possible memory leak
- Maxed out: Cause of slow/failed requests

---

## SLA Thresholds

The test uses these production SLA targets:

```typescript
const SLA = {
  successRate: 0.95, // 95%+ must succeed
  p95LatencyMs: 5000, // p95 under 5 seconds
  p99LatencyMs: 10000, // p99 under 10 seconds
  throughputReqSec: 2.0, // At least 2 requests/second
}
```

**To change SLA for your use case:**

Edit `tests/stress/ollama-concurrency.test.ts`, line ~17:

```typescript
const SLA = {
  successRate: 0.98, // Higher threshold
  p95LatencyMs: 3000, // Tighter latency
  p99LatencyMs: 5000,
  throughputReqSec: 5.0, // Need more throughput
}
```

Then re-run the test. It will tell you if you meet the new SLA.

---

## Common Issues & Fixes

### Issue: High failure rate (< 80% success)

**Check 1: Is Ollama running?**

```bash
curl http://localhost:11434/api/tags
```

Should return list of available models. If not, start Ollama:

```bash
ollama serve
```

**Check 2: Is GPU available?**

```bash
nvidia-smi
```

Look for "GPU Memory" — should have > 2GB free.

**Check 3: Are there competing processes?**

```bash
nvidia-smi  # See what's using GPU
ps aux | grep -i "python\|node\|java"  # Check for other AI tools
```

**Fix:**

- Kill competing processes
- Reduce model size: edit `lib/providers/getModelForEndpoint()`
- Increase timeout: `CALL_TIMEOUT_MS` in `lib/ai/queue/types.ts`

### Issue: High latency (p95 > 10 seconds)

**Check: Is model too big?**

```bash
# See which model is running
curl http://localhost:11434/api/tags
```

If `qwen3:30b` or `qwen3-coder:30b`:

- 30B models are slow
- Switch to `qwen3:7b` for testing: edit `lib/providers/getModelForEndpoint()`
- Or accept that 30B is slower but more accurate

**Check: Are requests queuing?**

- Look at test output: do requests get queued?
- Expected: first few are fast, later ones wait
- If all are slow equally, model is just slow

**Fix:**

- Use faster model
- Accept that queue is doing its job (slow but reliable)

### Issue: Requests timeout (status = 'timeout')

Means request took > 60 seconds. Either:

1. **Model is overloaded** — Ollama is swapping to CPU
   - Check GPU availability: `nvidia-smi`
   - Reduce concurrent requests
   - Use faster model

2. **Network timeout** — unlikely on localhost
   - Check if dev server crashed: `curl http://localhost:3100`
   - Restart dev server

3. **Ollama deadlock** — rare but possible
   - Kill and restart Ollama: `pkill -9 ollama && ollama serve`

### Issue: Sustained test degrades over 2 hours

**Sign of memory leak.** Debug steps:

1. Check report: does success rate drop steadily?
2. Check GPU memory: does it increase over time?
3. Search logs for errors from specific task types

**If task X leaks memory:**

- Edit `lib/ai/queue/registry.ts` — find task X's handler
- Add `try/finally` to cleanup resources
- Re-run test

---

## Running Full Test Suite

To validate everything before deploy:

```bash
echo "=== Basic sanity check ==="
npm run test:stress:ollama

echo "=== High load scenario ==="
npm run test:stress:ollama:high

echo "=== Failure recovery ==="
npm run test:stress:ollama:failure
```

All three should PASS before production deployment.

For full validation (including sustained):

```bash
npm run test:stress:ollama && \
npm run test:stress:ollama:high && \
npm run test:stress:ollama:failure && \
npm run test:stress:ollama:sustained
```

(Sustained test takes 2 hours.)

---

## Custom Testing

Run with custom parameters:

```bash
# 10 concurrent for 90 seconds
STRESS_CONCURRENCY=10 STRESS_DURATION=90 STRESS_MODE=basic npm run test:stress:ollama

# 30 concurrent (extreme stress)
STRESS_CONCURRENCY=30 STRESS_DURATION=60 STRESS_MODE=basic npm run test:stress:ollama

# Sustained at different concurrency
STRESS_CONCURRENCY=15 STRESS_MODE=sustained npm run test:stress:ollama
```

---

## Integration with CI/CD

Add to `.github/workflows/` for every PR:

```yaml
- name: Stress Test
  run: npm run test:stress:ollama
  timeout-minutes: 2

- name: Upload Stress Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: stress-reports
    path: data/stress-reports/
```

Fail CI if SLA not met:

```yaml
- name: Check SLA
  run: |
    REPORT=$(ls -t data/stress-reports/*.json | head -1)
    COMPLIANCE=$(jq '.sla.overallCompliance' "$REPORT")
    if [ "$COMPLIANCE" != '"PASS"' ]; then
      echo "❌ Stress test SLA not met"
      jq '.sla' "$REPORT"
      exit 1
    fi
```

---

## Deployment Checklist

Before going live:

- [ ] `npm run test:stress:ollama` → PASS
- [ ] `npm run test:stress:ollama:high` → PASS
- [ ] `npm run test:stress:ollama:failure` → PASS
- [ ] Review reports in `data/stress-reports/`
- [ ] All SLA met: ✅ all 4 SLA checks pass
- [ ] No GPU thermal issues (max < 90°C, max GPU% < 85%)
- [ ] No Ollama crashes (Ollama healthy % = 100%)
- [ ] Consistent performance (no degradation mid-test)

---

## Further Reading

- **Backpressure & queue design:** `docs/ollama-backpressure.md`
- **Queue implementation:** `lib/ai/queue/worker.ts`
- **Model selection:** `lib/providers/index.ts`
- **Task routing:** `lib/ai/llm-router.ts`
