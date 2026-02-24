# Ollama Control Panel — Standalone Desktop Tool

**Date:** 2026-02-24
**Branch:** `feature/risk-gap-closure`

## What Changed

### 1. Confirmed Admin-Only Gating (already in place)

The `OllamaStatusBadge` component was already gated behind `{isAdmin && ...}` in all three render locations in `chef-nav.tsx` (lines 523, 565, 1075). Non-admin users never see the AI infrastructure controls. This works on localhost, beta, and production identically.

### 2. New: Standalone Ollama Control Panel (`scripts/ollama-control.mjs`)

A self-contained Node.js tool that provides the same Ollama management UI **without needing the ChefFlow app running**. This solves the lockout scenario — when localhost:3100, beta, or production are all down, the developer can still manage Ollama endpoints.

#### Why It Exists

Sometimes the developer gets locked out of all web interfaces simultaneously (dev server crash, beta down, deployment issue). When that happens, the in-app `OllamaStatusBadge` is unreachable. This tool runs independently on port 9999 and talks directly to Ollama's HTTP API — no Next.js, no Supabase, no auth required.

#### How It Works

- **Runs on:** `http://localhost:9999`
- **Launch:** `npm run ollama` or `node scripts/ollama-control.mjs`
- **Dependencies:** None (pure Node.js, zero npm packages)
- **Auto-opens:** Browser launches automatically on start

#### Features

| Action          | What It Does                                                                           |
| --------------- | -------------------------------------------------------------------------------------- |
| **Ping**        | Hits `GET /api/tags` on the Ollama endpoint to check if it's alive                     |
| **Wake**        | Starts Ollama service (PowerShell `Start-Service` on Windows, `systemctl` on Linux/Pi) |
| **Restart**     | Stops + starts Ollama (full cycle)                                                     |
| **Load Model**  | Sends empty `POST /api/generate` to preload the configured model into memory           |
| **Kill**        | Force-stops Ollama process (extra button not in the web badge)                         |
| **Wake All**    | Wakes both PC and Pi in parallel                                                       |
| **Refresh All** | Re-pings both endpoints                                                                |

#### UI

- Dark theme matching ChefFlow's design
- Two-column grid: PC card + Pi card
- Each card shows: online/offline status, latency, model name, model readiness, loaded models list
- Global status bar: green (all healthy), amber (degraded), red (offline)
- Toast notifications for action results
- Auto-refreshes every 15 seconds

#### How It Bypasses the App

The in-app badge routes through:

1. Browser → `localhost:3100/api/ai/health` → Next.js route → Ollama

The standalone tool routes:

1. Browser → `localhost:9999` → Ollama directly (PC: `localhost:11434`, Pi: `10.0.0.177:11434`)

No Next.js in the chain. If the app is dead, this still works.

#### Configuration

Reads from environment variables (same as the app):

- `OLLAMA_BASE_URL` — PC endpoint (default: `http://localhost:11434`)
- `OLLAMA_PI_URL` — Pi endpoint (default: `http://10.0.0.177:11434`)
- `OLLAMA_MODEL` — PC model (default: `qwen3-coder:30b`)
- `OLLAMA_PI_MODEL` — Pi model (default: `qwen3:8b`)

#### SSH to Pi

Wake/restart/kill on the Pi uses `ssh pi` (the alias from `~/.ssh/config`). Same mechanism as the app's `ollama-wake.ts`.

## Files Changed

| File                         | Change                         |
| ---------------------------- | ------------------------------ |
| `scripts/ollama-control.mjs` | New — standalone control panel |
| `package.json`               | Added `"ollama"` script        |

## How to Use

```bash
# From anywhere in the project
npm run ollama

# Or directly
node scripts/ollama-control.mjs
```

Browser opens automatically to `http://localhost:9999`.

## Relationship to In-App Badge

| Feature              | In-App Badge          | Standalone Tool           |
| -------------------- | --------------------- | ------------------------- |
| Admin-only           | Yes (`isAdmin` check) | N/A (local tool, no auth) |
| Requires app running | Yes                   | No                        |
| Ping                 | Yes                   | Yes                       |
| Wake                 | Yes                   | Yes                       |
| Restart              | Yes                   | Yes                       |
| Load Model           | Yes                   | Yes                       |
| Kill                 | No                    | Yes (extra)               |
| Auto-refresh         | Adaptive (10s–120s)   | Fixed 15s                 |
| Port                 | 3100 (app)            | 9999                      |
