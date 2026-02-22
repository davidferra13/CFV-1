# Watchdog Restart Loop Fix — 2026-02-22

## Problem

The ChefFlow watchdog (`chefflow-watchdog.ps1`) was stuck in a restart loop, spawning a new `next dev` process every ~7 seconds. Each process immediately exited because port 3100 was already occupied by an existing dev server. The watchdog interpreted each exit as a crash and restarted — 1,115+ cycles logged.

Additionally, 8 duplicate PowerShell processes accumulated from repeated watchdog spawns.

Two auto-start entries in the Windows Startup folder ensured the broken watchdog relaunched on every login:

- `chefflow-launcher.vbs` — VBScript that silently runs the watchdog
- `start-chefflow.lnk` — shortcut to a deleted `start-chefflow.bat`

## Root Cause

The watchdog had no port-check logic. It blindly launched `next dev -p 3100` regardless of whether the port was already in use. When the dev server was started separately (e.g., from a terminal), the watchdog's spawned process would see the port taken, exit cleanly (code 0), and the watchdog would restart it in a tight 5-second loop.

## Fix

### 1. Port-aware watchdog (`chefflow-watchdog.ps1`)

Added `Test-PortInUse` and `Test-ServerHealthy` functions. Before each launch:

- If port 3100 is already listening → skip launch, sleep 30s, check again
- After a process exits → re-check port before restarting
- If the port is taken after exit → another process claimed it, switch to watch mode

This eliminates the restart loop entirely.

### 2. Desktop launcher (`Desktop\ChefFlow.bat`)

Updated to point to the correct project directory (`C:\Users\david\Documents\CFv1`) and port 3100. Previously pointed to a stale `ChefFlow_MASTER` archive on port 5173.

### 3. Startup folder cleanup

- Removed stale `start-chefflow.lnk` (pointed to deleted bat file)
- Re-added `chefflow-launcher.vbs` with the fixed watchdog

## Files Changed

| File                    | Change                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| `chefflow-watchdog.ps1` | Added port-check before spawning, 30s backoff when port in use         |
| `Desktop\ChefFlow.bat`  | Fixed project path and port                                            |
| Startup folder          | Removed stale `start-chefflow.lnk`, kept fixed `chefflow-launcher.vbs` |

## How It Works Now

- **On login:** `chefflow-launcher.vbs` runs from Startup → spawns watchdog hidden
- **Watchdog checks port 3100:** if already listening, just watches (30s interval)
- **If port is free:** launches `next dev -p 3100 -H 0.0.0.0` hidden
- **If server crashes:** watchdog restarts it after 5s (only if port is free)
- **Desktop shortcut:** `ChefFlow.lnk` → `ChefFlow.bat` → opens browser to localhost:3100 + starts watchdog if not running
