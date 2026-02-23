# Dual-LLM System — Architecture & Operations Guide

**Date:** 2026-02-22
**Status:** Fully implemented and operational

---

## Overview

ChefFlow now runs two always-available LLM endpoints in an **active-active** configuration:

| Endpoint | Hardware             | Model                     | Role                                         | Reliability                              |
| -------- | -------------------- | ------------------------- | -------------------------------------------- | ---------------------------------------- |
| **PC**   | Windows desktop, GPU | `qwen3-coder:30b` (30B)   | Interactive (Remy chat), high-priority tasks | Unreliable — restarts, sleeps, turns off |
| **Pi**   | Raspberry Pi 5, 8GB  | `qwen3:8b` (8.2B, Q4_K_M) | Background/scheduled tasks, failover         | Always-on — never turns off              |

**Key property:** When the PC is off, the Pi keeps processing background tasks. When the Pi is down, the PC handles everything. When both are up, they process in parallel — **doubling throughput at zero cost**.

---

## Architecture Patterns (from top companies)

| Pattern                      | Source          | Where                                                               |
| ---------------------------- | --------------- | ------------------------------------------------------------------- |
| Active-Active failover       | AWS Multi-AZ    | `lib/ai/llm-router.ts`                                              |
| Circuit breaker (per-slot)   | Netflix Hystrix | `lib/ai/queue/worker.ts`, `lib/ai/cross-monitor.ts`                 |
| Bulkhead isolation           | Netflix         | Worker dual-slot: PC failure ≠ Pi failure                           |
| Work stealing                | Google Borg     | `lib/ai/queue/actions.ts` — idle endpoint grabs the other's tasks   |
| Liveness + Readiness probes  | Kubernetes      | Health API checks `/api/tags` (liveness) + model loaded (readiness) |
| Golden signals               | Google SRE      | Latency, error rate, saturation tracked per endpoint                |
| Exponential backoff + jitter | AWS             | Retry with backoff in `actions.ts`, jitter in polling intervals     |
| Supervisor/watchdog          | Standard        | `chefflow-watchdog.ps1` (PC), `scripts/pi-watchdog.sh` (Pi)         |
| Cross-monitoring             | Google SRE      | PC monitors Pi via HTTP + SSH restart capability                    |
| Graceful degradation         | Netflix         | Badge shows partial status, not just errors                         |

---

## File Map

### Core Infrastructure

| File                      | What                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `lib/ai/providers.ts`     | `getModelForEndpoint()`, `getContextSizeForEndpoint()` — per-endpoint model/context resolution |
| `lib/ai/llm-router.ts`    | Dual-endpoint routing: priority-based PC vs Pi selection with health checking                  |
| `lib/ai/parse-ollama.ts`  | `endpointUrl` + `model` override params for routed Ollama calls                                |
| `lib/ai/cross-monitor.ts` | **NEW** — Cross-monitoring supervisor with health grades and recovery actions                  |

### Queue System (Dual-Slot)

| File                      | What                                                                         |
| ------------------------- | ---------------------------------------------------------------------------- |
| `lib/ai/queue/worker.ts`  | **Upgraded** — Dual-slot processing: PC slot + Pi slot operate independently |
| `lib/ai/queue/actions.ts` | **NEW** — `claimNextTaskForEndpoint()` with work stealing pattern            |
| `lib/ai/queue/types.ts`   | Priority levels, safety constants, worker state types                        |
| `lib/ai/queue/index.ts`   | Barrel exports including new `claimNextTaskForEndpoint`                      |

### API Endpoints

| File                             | What                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `app/api/ai/health/route.ts`     | **NEW** — Dual-endpoint health with liveness + readiness + saturation probes |
| `app/api/ai/monitor/route.ts`    | **NEW** — Cross-monitor supervisor state and recovery log                    |
| `app/api/ollama-status/route.ts` | **Updated** — Now includes Pi status in response                             |
| `app/api/remy/stream/route.ts`   | **Updated** — `resolveRemyEndpoint()` with PC→Pi fallback chain              |

### Dashboard

| File                                           | What                                            |
| ---------------------------------------------- | ----------------------------------------------- | ----------- |
| `components/dashboard/ollama-status-badge.tsx` | **Rewritten** — Dual-endpoint badge: "PC · 45ms | Pi · 120ms" |

### Watchdogs

| File                     | What                                                            |
| ------------------------ | --------------------------------------------------------------- |
| `chefflow-watchdog.ps1`  | **Updated** — Now monitors Pi via HTTP + SSH restart capability |
| `scripts/pi-watchdog.sh` | **NEW** — Pi self-healing cron (runs every 60s on the Pi)       |
| `scripts/pi-ssh.sh`      | SSH helper reading credentials from `.auth/pi.json`             |

### Configuration

| File            | What                                                                |
| --------------- | ------------------------------------------------------------------- |
| `.env.local`    | `OLLAMA_PI_URL=http://10.0.0.177:11434`, `OLLAMA_PI_MODEL=qwen3:8b` |
| `.auth/pi.json` | Pi SSH credentials (gitignored)                                     |

---

## How Task Routing Works

```
User action (e.g., parse inquiry)
  │
  ├─ Priority >= 800 (ON_DEMAND/interactive)
  │   └─ Route to PC (fast GPU, better model)
  │       └─ PC offline? → Fallback to Pi
  │
  └─ Priority < 800 (SCHEDULED/BATCH/background)
      └─ Route to Pi (always-on, offload from PC)
          └─ Pi offline? → Fallback to PC
```

### Work Stealing

When one endpoint is idle and the other has queued tasks:

- PC finishes its work → steals Pi-targeted background tasks (runs them faster)
- Pi finishes its work → steals PC-targeted tasks (keeps progress when PC is off)

This happens automatically via `pickBestCandidate()` in `actions.ts`.

---

## Dual-Slot Worker Architecture

```
┌─────────────────────────────────────────┐
│               Worker Loop                │
│  polls every 3s (POLL_INTERVAL_MS)       │
├──────────────┬──────────────────────────┤
│   PC Slot    │        Pi Slot           │
│              │                          │
│  Claims tasks│  Claims tasks suited     │
│  for PC      │  for Pi                  │
│              │                          │
│  PAUSED when │  ALWAYS RUNNING          │
│  Remy active │  (independent of Remy)   │
│              │                          │
│  Circuit     │  Circuit breaker         │
│  breaker:    │  (independent):          │
│  5 fails →   │  5 fails → 60s backoff  │
│  60s backoff │                          │
└──────────────┴──────────────────────────┘
```

**Key insight:** The interactive lock (Remy chat) only pauses the PC slot. The Pi slot continues processing background tasks because Remy runs on the PC's GPU — there's no contention with the Pi.

---

## Self-Healing Chain

```
Level 0 (Observe):  Log warnings, update health state
Level 1 (Nudge):    Clear hung tasks, re-route to healthy endpoint
Level 2 (Restart):  SSH restart Pi's Ollama / local restart PC's Ollama
Level 3 (Escalate): Dashboard badge shows degraded/offline status
```

### PC Watchdog (`chefflow-watchdog.ps1`)

- Runs as Windows background process
- Checks PC Ollama every ~5 minutes
- Checks Pi Ollama every 30 seconds
- SSH restarts Pi's Ollama after 5 consecutive failures (~2.5 min)
- Circuit breaker: max 2 SSH restarts per hour

### Pi Watchdog (`scripts/pi-watchdog.sh`)

- Installed as cron job, runs every 60 seconds
- Liveness probe: `/api/tags` with 10s timeout
- Readiness probe: checks if `qwen3:8b` model is loaded
- Auto-restarts Ollama via `systemctl restart ollama`
- Auto-pulls missing model
- Circuit breaker: max 3 restarts per hour

---

## Dashboard Badge States

| State           | Display                  | Color |
| --------------- | ------------------------ | ----- |
| Both healthy    | `PC · 45ms │ Pi · 120ms` | Green |
| One degraded    | `PC · 45ms │ Pi Loading` | Amber |
| One offline     | `PC · 45ms │ Pi Off`     | Amber |
| Both offline    | `AI Offline`             | Red   |
| Single-endpoint | `Local · 45ms`           | Green |
| Not configured  | (hidden)                 | —     |

---

## Verifying the System

### Quick Health Check

```bash
# From PC
curl http://10.0.0.177:11434/api/tags   # Pi models
curl http://localhost:11434/api/tags      # PC models

# From the app
GET /api/ai/health     # Both endpoints
GET /api/ai/monitor    # Cross-monitor state
```

### SSH to Pi

```bash
bash scripts/pi-ssh.sh "ollama list"
bash scripts/pi-ssh.sh "systemctl status ollama"
bash scripts/pi-ssh.sh "cat /var/log/chefflow-watchdog.log | tail -20"
```

### Smoke Tests

1. Parse an inquiry → logs show `endpoint=pc` (high priority)
2. Queue a scheduled task → logs show `endpoint=pi` (background)
3. Stop PC Ollama → Remy falls back to Pi (slower but works)
4. Queue 10 tasks → observe 2 processing simultaneously in logs

---

## Configuration

### Environment Variables (`.env.local`)

```env
# PC — primary for interactive tasks
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3-coder:30b

# Pi — secondary for background/scheduled tasks
OLLAMA_PI_URL=http://10.0.0.177:11434
OLLAMA_PI_MODEL=qwen3:8b
```

### Pi Network Info

- IP: `10.0.0.177` (hostname: `raspberrypi.local`)
- SSH: `davidferra@10.0.0.177` (key-based auth, no password needed)
- Credentials: `.auth/pi.json` (gitignored)
- Ollama binds to `0.0.0.0:11434` (accepts network connections)
- Watchdog cron: runs every minute

---

## What's NOT Built Yet (Future)

- **VNC automation** — SSH commands are sufficient for now
- **Pi running Next.js** — Pi is just an Ollama endpoint, not a web server
- **Cloud LLM fallback** — privacy model forbids it
- **Automatic model updates** — manual pull for now
- **Pi metrics dashboard** — cross-monitor API exists, UI not built yet
