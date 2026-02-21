# ChefFlow — Persistent Always-On Auto-Start

**Feature:** ChefFlow dev server runs permanently in the background, starts automatically on every Windows login, and restarts itself within 5 seconds if it ever stops for any reason.

---

## What Changed

### New Files

| File                    | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `chefflow-watchdog.ps1` | Infinite restart loop — the core of the persistent system |
| `install-autostart.ps1` | Task Scheduler registration + immediate start             |
| `install-autostart.bat` | Double-click launcher for the setup script                |
| `stop-chefflow.bat`     | Intentional, clean shutdown                               |

### How It Works

```
Windows Login
  └─ Task Scheduler → chefflow-watchdog.ps1 (hidden, no window)
       └─ Watchdog loop: starts "npm run dev" (hidden)
            └─ Server running at http://localhost:3100
            └─ Server exits for ANY reason
                  └─ Wait 5 seconds → restart automatically
                  └─ Logged to chefflow-watchdog.log
```

The watchdog runs **silently** — no console window appears. Everything happens invisibly in the background. The only sign ChefFlow is running is that `http://localhost:3100` works.

---

## One-Time Setup

**Double-click `install-autostart.bat`** — that's it.

It will:

1. Register a Windows Task Scheduler task called "ChefFlow Server"
2. Configure it to fire at every login, run hidden, never time out
3. Start ChefFlow immediately (no reboot needed)
4. Print confirmation that it's running

You only need to do this once. After that, ChefFlow starts automatically on every login.

---

## Daily Use

**Nothing.** ChefFlow is always running. Open `http://localhost:3100` any time.

### To stop ChefFlow intentionally

Double-click **`stop-chefflow.bat`**. It:

- Ends the watchdog (so it won't restart)
- Kills any remaining Node process on port 3100
- Prints confirmation

### To restart after a manual stop

- Double-click **`start-chefflow.bat`** for a one-off session (watchdog won't restart it if you close the window)
- Or double-click **`install-autostart.bat`** again to re-enable the persistent watchdog

### Log file

`chefflow-watchdog.log` in the project root. Contains timestamps of every start, stop, and restart. Rotates automatically at 1 MB.

---

## Why a Watchdog Instead of Just Task Scheduler?

Task Scheduler's "restart on failure" only handles task-level failures (process exit codes). It doesn't handle the common case of closing a terminal window. The watchdog loop inside PowerShell catches **every** exit regardless of cause:

- You closed the terminal: watchdog restarts in 5 s
- Node crashed with an error: watchdog restarts in 5 s
- Windows killed the process for memory pressure: watchdog restarts in 5 s
- You ran `taskkill` on node.exe manually: watchdog restarts in 5 s

The only way to stop it is `stop-chefflow.bat`, which ends the watchdog itself first.

---

## Architecture Connection

```
This feature builds on the existing PWA setup (docs/build-pwa-local-always-on.md):
  - Dev server still binds to 0.0.0.0:3100 (all network interfaces)
  - PWA install still works (Chrome install icon in address bar)
  - Phone/tablet access still works via local IP
  - Session persistence (60-day refresh token) unchanged

The persistent watchdog is an infrastructure layer below the app itself.
The app code is completely unchanged.
```
