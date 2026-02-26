# ChefFlow Mission Control

Battle.net-style launcher dashboard for managing all ChefFlow services from one place.

## Quick Start

```bash
# Option 1: npm script (opens in browser)
npm run dashboard

# Option 2: Chrome app mode (feels like a native app)
scripts/launcher/open-dashboard.bat

# Option 3: Silent launch (no console, starts server + opens Chrome)
# Double-click: scripts/launcher/open-dashboard.vbs
```

## What It Controls

| Service         | Status                              | Actions                                 |
| --------------- | ----------------------------------- | --------------------------------------- |
| **Dev Server**  | Online/Offline, latency             | Start, Stop, Open Browser               |
| **Beta Server** | Online/Offline, health details      | Restart, Deploy, Rollback, Open Browser |
| **Ollama PC**   | Online/Offline, loaded models       | Start, Stop                             |
| **Ollama Pi**   | Online/Offline, loaded models       | Start, Stop                             |
| **Git**         | Branch, dirty files, recent commits | Push Branch                             |
| **Build**       | Last result                         | Type Check, Full Build                  |

## Architecture

```
┌─────────────────────────────────────────────┐
│  Dashboard Server (port 41937)               │
│  scripts/launcher/server.mjs                │
│                                             │
│  ├── REST API for all 14 operations         │
│  ├── SSE stream for real-time log output    │
│  └── Serves the HTML dashboard              │
├─────────────────────────────────────────────┤
│  Dashboard UI (index.html)                  │
│  Dark theme, sidebar nav, live status dots  │
├─────────────────────────────────────────────┤
│  System Tray (tray.ps1)                     │
│  Color-coded icon, right-click quick actions│
├─────────────────────────────────────────────┤
│  Desktop Shortcuts (scripts/shortcuts/*.bat)│
│  One-click .bat files for each action       │
└─────────────────────────────────────────────┘
```

## Three Access Methods

### 1. Web Dashboard (port 41937)

The primary interface. Dark theme with real-time status polling every 5 seconds. SSE-connected console shows live output from deploys, builds, etc.

- **URL:** `http://localhost:41937`
- **Keyboard shortcuts:** `1-5` switch panels, `Esc` closes dialogs
- **Chrome app mode:** Use `open-dashboard.bat` to open without browser chrome

### 2. System Tray

Lives in your Windows taskbar. Shows a color-coded icon:

- **Green** = All systems online
- **Yellow** = Some services down
- **Red** = Dashboard server offline

Right-click menu provides quick actions without opening the full dashboard.

### 3. Desktop Shortcuts (.bat files)

Drop these on your desktop or pin to taskbar:

| Shortcut           | What It Does               |
| ------------------ | -------------------------- |
| `start-dev.bat`    | Start dev server           |
| `stop-dev.bat`     | Stop dev server            |
| `restart-beta.bat` | PM2 restart on Pi          |
| `deploy-beta.bat`  | Full deploy to Pi          |
| `push-branch.bat`  | Git push current branch    |
| `status-check.bat` | Print all service statuses |

## Auto-Start

Mission Control auto-starts on Windows login via the existing watchdog chain:

```
Login → chefflow-launcher.vbs
       → chefflow-watchdog.ps1
          → Starts dashboard server (port 41937)
          → Starts system tray icon
          → (also starts Ollama, dev server as before)
```

## API Endpoints

All endpoints are on `http://localhost:41937`. The server only binds to `127.0.0.1` (localhost only, not network-accessible).

| Method | Endpoint               | Description                   |
| ------ | ---------------------- | ----------------------------- |
| GET    | `/api/status`          | All service statuses (JSON)   |
| GET    | `/api/events`          | SSE stream for real-time logs |
| POST   | `/api/dev/start`       | Start dev server              |
| POST   | `/api/dev/stop`        | Stop dev server               |
| POST   | `/api/beta/restart`    | PM2 restart on Pi             |
| POST   | `/api/beta/deploy`     | Full deploy (8-10 min)        |
| POST   | `/api/beta/rollback`   | Rollback to previous build    |
| POST   | `/api/ollama/pc/start` | Start Ollama on PC            |
| POST   | `/api/ollama/pc/stop`  | Stop Ollama on PC             |
| POST   | `/api/ollama/pi/start` | Start Ollama on Pi            |
| POST   | `/api/ollama/pi/stop`  | Stop Ollama on Pi             |
| POST   | `/api/git/push`        | Push current branch           |
| GET    | `/api/git/info`        | Branch, dirty files, commits  |
| POST   | `/api/build/typecheck` | Run tsc                       |
| POST   | `/api/build/full`      | Run next build                |
| GET    | `/api/jobs`            | Running background jobs       |

## File Locations

| What                 | Where                                      |
| -------------------- | ------------------------------------------ |
| API server           | `scripts/launcher/server.mjs`              |
| Dashboard UI         | `scripts/launcher/index.html`              |
| System tray          | `scripts/launcher/tray.ps1`                |
| Chrome launcher      | `scripts/launcher/open-dashboard.bat`      |
| Silent launcher      | `scripts/launcher/open-dashboard.vbs`      |
| Desktop shortcuts    | `scripts/shortcuts/*.bat`                  |
| Watchdog integration | `chefflow-watchdog.ps1` (auto-start block) |
