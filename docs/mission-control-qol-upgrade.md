# Mission Control — Quality of Life Upgrade

**Date:** 2026-02-26
**Branch:** `feature/risk-gap-closure`

## What Changed

Added 8 new mega buttons to the Home panel covering testing, demo data, and health checks — the biggest gaps identified in a QoL audit.

## New Sections Added to Home Panel

### Testing & QA (4 buttons)

| Button              | What it does                                                        | Backend                     |
| ------------------- | ------------------------------------------------------------------- | --------------------------- |
| **Quick Soak Test** | Run 10 memory-leak iterations (~2-3 min incl. build)                | `POST /api/test/soak-quick` |
| **Full Soak Test**  | Run 100 memory-leak iterations (~15 min)                            | `POST /api/test/soak-full`  |
| **Smoke Test**      | Run E2E smoke tests via Playwright                                  | `POST /api/test/e2e`        |
| **Health Check**    | Typecheck + build without committing — shows if code is merge-ready | `POST /api/health/check`    |

### Demo & Setup (4 buttons)

| Button                  | What it does                                                     | Backend                  |
| ----------------------- | ---------------------------------------------------------------- | ------------------------ |
| **Reset Demo Data**     | Clear old demo data and reload fresh (`npm run demo:reset`)      | `POST /api/demo/reset`   |
| **Setup Agent Account** | Create agent test account for UI testing (`npm run agent:setup`) | `POST /api/agent/setup`  |
| **List Migrations**     | Show all DB migration files + latest timestamp                   | `GET /api/db/migrations` |
| **View Test Report**    | Open last Playwright HTML report in browser                      | Opens localhost:9323     |

## New API Endpoints

| Endpoint               | Method | Function                                |
| ---------------------- | ------ | --------------------------------------- |
| `/api/test/soak-quick` | POST   | Quick soak test (build + 10 iterations) |
| `/api/test/soak-full`  | POST   | Full soak test (build + 100 iterations) |
| `/api/test/e2e`        | POST   | E2E tests (body: `{project: "smoke"}`)  |
| `/api/demo/reset`      | POST   | Reset demo data                         |
| `/api/agent/setup`     | POST   | Setup agent test account                |
| `/api/health/check`    | POST   | Typecheck + build (no commit)           |
| `/api/db/migrations`   | GET    | List all migration files                |

## New Gustav Chat Tools

| Tool              | Description                                |
| ----------------- | ------------------------------------------ |
| `test/soak-quick` | Quick soak test (10 iterations)            |
| `test/soak-full`  | Full soak test (100 iterations)            |
| `test/e2e`        | E2E tests (use `test/e2e:smoke` for smoke) |
| `demo/reset`      | Reset demo data                            |
| `agent/setup`     | Setup agent test account                   |
| `health/check`    | Full health check (no commit)              |
| `db/migrations`   | List all migrations                        |

## Home Panel Now Has 7 Sections, 18 Mega Buttons

1. One-Click Pipelines (2): Ship It, Close Out Feature
2. Common Tasks (4): Save Changes, Back Up, Deploy, Check for Errors
3. Maintenance (4): Clear Cache, Install Deps, Update DB Types, Backup DB
4. **Testing & QA (4):** Quick Soak, Full Soak, Smoke Test, Health Check
5. **Demo & Setup (4):** Reset Demo, Agent Setup, List Migrations, Test Report
6. Quick Links (11): Dev App, Dashboard, Events, Clients, etc.
7. Prompt Queue: Shows pending Copilot prompts

## Files Modified

- `scripts/launcher/server.mjs` — 7 new functions + 7 new API routes + 7 new Gustav tools
- `scripts/launcher/index.html` — 2 new sections, 8 new mega buttons, 2 new JS functions
