# Raspberry Pi Setup — Always-On Ollama

## Why This Was Built

ChefFlow's AI features (receipt parsing, contract drafting, staff briefings, NL event intake, etc.) require Ollama running locally. When Ollama runs only on the developer's laptop, AI features hard-fail the moment the laptop sleeps, closes, or is away from the desk — which happens constantly for a working private chef.

The Raspberry Pi 5 (8GB) runs Ollama 24/7 as a dedicated always-on AI server on the home network. The laptop points to the Pi instead of itself. Result: AI features work regardless of laptop state.

---

## What Changed

### 1. `chefflow-watchdog.ps1`

Previously hardcoded `http://localhost:11434` for Ollama health checks and auto-restart logic. Now:

- Reads `OLLAMA_BASE_URL` from `.env.local` dynamically
- If the URL is a **remote IP** (the Pi): logs a warning when unreachable, does NOT try to start a local Ollama process (can't start the Pi's service from Windows)
- If the URL is **localhost**: existing auto-restart behavior is preserved

This means the watchdog is always consistent with whatever the app is pointed at.

### 2. `app/api/ollama-status/route.ts`

Added `isRemote` boolean to the API response. True when `OLLAMA_BASE_URL` is not localhost/127.0.0.1. This lets the frontend know whether it's talking to a local or remote Ollama instance.

### 3. `components/dashboard/ollama-status-badge.tsx`

- Added `isRemote` to the `OllamaStatus` interface
- When `isRemote` is true: badge shows **"Pi · 120ms"** instead of "Local · 45ms"
- Tooltip changes to: "Running on your Raspberry Pi — data stays on your home network"
- When `isRemote` is false: existing "Local · Xms" behavior unchanged

### 4. `scripts/pi-setup.sh` (new)

One-shot SSH setup script. Run from laptop → SSHes into the Pi → installs Ollama → configures it to listen on all network interfaces (not just localhost) → enables it as a systemd service (auto-starts on boot) → pulls the `qwen3:8b` model.

### 5. `scripts/connect-pi.sh` (new)

Run after `pi-setup.sh`. Takes the Pi's IP address → verifies Ollama is reachable → updates `OLLAMA_BASE_URL` and `OLLAMA_MODEL` in `.env.local` → backs up `.env.local` first. Safe to re-run.

### 6. `.env.local.example`

Added a full Ollama section with comments explaining both laptop and Pi configurations.

---

## Model Difference

| Environment  | Model             | Parameters | Speed  | Quality |
| ------------ | ----------------- | ---------- | ------ | ------- |
| Laptop       | `qwen3-coder:30b` | 30 billion | Slower | Higher  |
| Raspberry Pi | `qwen3:8b`        | 8 billion  | Faster | Good    |

The 8b model handles all ChefFlow AI tasks well. If output quality ever feels insufficient, the next upgrade path is a Mac Mini M4.

---

## How to Switch to Pi (When Pi Arrives)

```bash
# 1. Set up the Pi (run once)
bash scripts/pi-setup.sh

# 2. Point ChefFlow at the Pi
bash scripts/connect-pi.sh 192.168.1.xxx   # use Pi's actual IP

# 3. Restart dev server
# Stop with Ctrl+C, then restart normally

# 4. Verify
# Dashboard badge should show: Pi · [latency]ms (green)
```

---

## How to Switch Back to Laptop

Edit `.env.local`:

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3-coder:30b
```

Restart dev server. Badge will show "Local · Xms" again.

---

## Error Visibility

The existing `OllamaStatusBadge` already handles this:

- **Green "Pi · 120ms"** — Pi is reachable, model is loaded, everything working
- **Blue "Loading Model"** — Pi is up, model is still warming up
- **Red "Local AI Offline"** — Pi is unreachable (powered off, network issue)

The watchdog logs a clear warning to `chefflow-watchdog.log` when the Pi is unreachable, instead of silently trying to start a local Ollama process.

---

## Privacy Note

No change to the privacy model. All AI traffic stays on the local home network — laptop → router → Pi. Data never reaches the internet. The `OllamaOfflineError` hard-fail behavior is unchanged; if the Pi goes down, features fail loudly rather than falling back to cloud AI.
