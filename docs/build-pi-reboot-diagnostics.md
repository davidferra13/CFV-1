# Pi Reboot & Network Diagnostics — Added to All Ollama Controls

**Date:** 2026-02-24
**Branch:** `feature/risk-gap-closure`

## Why This Exists

The Raspberry Pi becomes unreachable regularly — SSH times out, Ollama stops responding, builds OOM and freeze the device. When this happens, the existing Wake/Restart buttons are useless because they depend on SSH connectivity. The developer spends hours debugging what's actually wrong (network? SSH? Ollama?) when a simple layered diagnostic would tell them in seconds.

## What Changed

### New Capabilities

| Action        | What It Does                                                                                        | Where It Works                                             |
| ------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Diagnose**  | Tests 3 layers: network TCP → SSH auth → Ollama port. Tells you exactly WHERE the connection fails. | In-app badge, standalone tool, API                         |
| **Reboot Pi** | Sends `sudo reboot` via SSH. Nuclear option for when Pi is frozen but SSH still connects.           | In-app badge (Pi only, when offline), standalone tool, API |

### Diagnose Output Examples

The diagnose action returns a plain-English diagnosis:

- `"Pi is UNREACHABLE on the network (10.0.0.177:22 timed out). Either powered off, disconnected, or IP changed. Walk to the Pi and power-cycle it."`
- `"Pi is on the network but SSH auth failed. Key issue."`
- `"Pi is on the network but SSH service is not running (port 22 refused)."`
- `"Pi is on the network and SSH works, but Ollama is not responding. Try: Reboot Pi or restart Ollama service."`
- `"Pi is fully reachable. Network OK, SSH OK, Ollama responding."`

### Decision Tree (What the Diagnose Button Tells You)

```
Diagnose Pi
├── Network unreachable? → Walk to Pi, power-cycle it
├── SSH refused? → Pi OS is up, sshd is down (rare)
├── SSH auth failed? → Key issue, fix SSH config
├── SSH works but Ollama down? → Use Restart or Reboot Pi button
└── Everything works? → Problem is elsewhere
```

## Files Changed

| File                                           | Change                                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `lib/ai/ollama-wake.ts`                        | Added `rebootPi()`, `networkDiagnosePi()`, `networkDiagnosePc()`, `NetworkDiagResult` type           |
| `app/api/ai/wake/route.ts`                     | Added `reboot` and `diagnose` actions to the API                                                     |
| `components/dashboard/ollama-status-badge.tsx` | Added Diagnose button (all endpoints), Reboot Pi button (Pi only, when offline), `red` color variant |
| `scripts/ollama-control.mjs`                   | Added Diagnose and Reboot Pi buttons, `info` toast type for diagnostic results                       |

## How Network Diagnosis Works (3-Layer Test)

### For Pi:

1. **Layer 1 — Network:** TCP connect to `10.0.0.177:22` with 3s timeout. Uses `Test-NetConnection` on Windows, `nc -z` on Linux.
2. **Layer 2 — SSH:** `ssh pi 'echo ok'` with 8s timeout. Tests authentication and shell access.
3. **Layer 3 — Ollama:** SSH into Pi and `curl localhost:11434/api/tags`. Tests if Ollama is actually running on the Pi itself.

Stops at the first failure and reports exactly what layer failed.

### For PC:

- Just checks if `localhost:11434/api/tags` responds. Reports ECONNREFUSED vs timeout vs HTTP errors.

## Integration Points

- **In-app badge:** Diagnose button appears for every endpoint. Reboot Pi button appears for Pi when it's offline. Both use the existing `/api/ai/wake` API route.
- **Standalone tool:** Same buttons, same logic, but talks directly to the Pi (no Next.js in the chain).
- **API route:** `POST /api/ai/wake` now accepts `action: 'diagnose'` and `action: 'reboot'` in addition to existing actions.
