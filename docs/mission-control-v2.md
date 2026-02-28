# Mission Control V2 — Feature Expansion

**Date:** 2026-02-27
**Branch:** `feature/risk-gap-closure`
**Files:** `scripts/launcher/server.mjs`, `scripts/launcher/index.html`

---

## Summary

Added 19 new features to Mission Control, expanding it from a strong ops dashboard (A- grade) to a comprehensive DevOps command center. All features are implemented in the existing server.mjs + index.html architecture — no new dependencies.

---

## Features Added

### 1. Desktop Notifications

- Browser Notification API integration
- Requests permission on first load
- Triggers on 12 event patterns: deploy success/fail, beta down, build errors, backup complete, rollback, etc.
- Hooked into existing SSE stream — zero extra polling

### 2. Uptime History (24h Rolling)

- Polls beta/prod/Pi every 60 seconds
- Stores results in `docs/uptime-history.json` (rolling 24h window)
- Computes uptime percentage and downtime windows per system
- 3-column grid on Infra panel: Beta / Prod / Pi with percentage + detail

### 3. Git Diff Viewer

- Added to Git panel: inline diff with stat summary
- Color-coded: green for additions, red for deletions, blue for headers
- Expandable full diff content with toggle button
- Auto-loads when switching to Git panel

### 4. npm Audit / Dependency Health

- Endpoint: `GET /api/audit/npm` — runs `npm audit --json` and parses output
- UI: Severity breakdown (critical/high/moderate/low) with color-coded badges
- "Run Audit" button for on-demand scanning

### 5. Bundle Size Tracking

- `POST /api/bundle/capture` — reads `build-manifest.json` + measures `.next/` directory size
- `GET /api/bundle/size` — returns capture history from `docs/bundle-size-history.json`
- UI: Current size, delta from previous, route count, "Capture Now" button
- Gustav tool: `bundle/capture` for AI-triggered captures after builds

### 6. Environment Variable Comparison

- `GET /api/env/compare` — reads `.env.local` and `.env.local.beta`, compares keys only (never values)
- UI: Table showing key presence across Dev vs Beta environments
- Color-coded: green checkmark = present, red X = missing

### 7. Scheduled DB Backups

- Daily at 3:00 AM — scheduled via native `setTimeout` (no node-cron dependency)
- Runs `supabase db dump --linked > backups/backup-YYYYMMDD-HHMMSS.sql`
- 7-day retention: automatically deletes oldest files when count > 7
- `POST /api/backup/now` — trigger manual backup
- `GET /api/backup/status` — list existing backups with metadata
- UI: Integration Health card showing backup count, schedule, and manual trigger

### 8. Error Aggregation

- In-memory error buffer (500 events max) from all feedEvent() calls
- `GET /api/errors/top` — top 5 errors in last hour, grouped by normalized message
- Normalization strips UUIDs, paths, numbers for better grouping
- UI: Error card with count, last seen timestamp

### 9. Rollback History

- Append-only log at `docs/rollback-history.json`
- Automatically logged when `rollbackBeta()` succeeds
- `GET /api/rollback/history` — full log
- UI: Timestamped list on Infra panel

### 10. Migration SQL Viewer

- `GET /api/migration/sql/:filename` — reads migration SQL file content
- Enhanced migration list: modal with "Show SQL" buttons for each migration
- Replaces old `alert()` with styled overlay showing full SQL

### 11. Supabase Connection Health

- `GET /api/supabase/health` — pings Supabase REST API with latency measurement
- UI: Status dot (green/red) + latency in milliseconds + health badge

### 12. Blueprint Panel

- **No changes needed** — already contains real 6-phase roadmap content (not a placeholder)
- Verified compliance with Zero Hallucination Law 3

### 13. SSL/Certificate Monitoring

- `GET /api/ssl/check` — checks cert expiry for 3 domains: cheflowhq.com, app.cheflowhq.com, beta.cheflowhq.com
- Uses PowerShell `System.Net.Security.SslStream` on Windows
- UI: Grid of domain cards with days-until-expiry, color-coded by urgency

### 14. Cloud Cost Tracking

- Added 5th summary card to Expenses panel: "Cloud Services" (aggregates cloud-services category)
- Vercel billing API does not expose cost data publicly — cloud costs tracked via manual expense entries
- Category already existed in dropdown — now surfaced in summary

### 15. Command Palette (Ctrl+K)

- Fuzzy search across 30+ commands: panel navigation, actions, Gustav AI, tools
- Keyboard-driven: arrow keys to navigate, Enter to execute, Escape to close
- Categorized results: Navigation, Actions, Quick Actions
- Includes all panel switches, deploy, rollback, backup, audit, capture, etc.

### 16. Stripe Webhook Health

- `GET /api/stripe/health` — queries `stripe_webhook_events` table via Supabase
- Shows last webhook received, event type, status
- UI: Integration Health card on Infra panel

### 17. Email Delivery Monitoring

- `GET /api/email/health` — pings Resend API for account status
- Shows daily send count, domain count, API availability
- UI: Integration Health card on Infra panel

### 18. Keyboard Shortcut Help Overlay (?)

- Press `?` to toggle translucent overlay showing all shortcuts
- Full reference: 0-9 panel switches, Enter/Escape for chat, Ctrl+K palette
- Close with Escape or clicking outside

### 19. API Rate Limit Monitoring

- `GET /api/api-limits` — returns configured rate limits for 6 API services
- Services: Spoonacular, Kroger, Stripe, Resend, Instacart, MealMe
- Shows tier, daily/monthly limits, configured status
- UI: Grid of API service cards on Infra panel

---

## New API Endpoints

| Method | Path                           | Description                          |
| ------ | ------------------------------ | ------------------------------------ |
| GET    | `/api/uptime`                  | 24h uptime stats for beta/prod/pi    |
| GET    | `/api/errors/top`              | Top 5 errors in last hour            |
| GET    | `/api/rollback/history`        | Rollback history log                 |
| GET    | `/api/git/diff`                | Current git diff (staged + unstaged) |
| GET    | `/api/audit/npm`               | npm audit results                    |
| GET    | `/api/bundle/size`             | Bundle size history                  |
| POST   | `/api/bundle/capture`          | Capture current bundle size          |
| GET    | `/api/env/compare`             | Env var key comparison (dev vs beta) |
| POST   | `/api/backup/now`              | Trigger manual DB backup             |
| GET    | `/api/backup/status`           | List existing backups                |
| GET    | `/api/supabase/health`         | Supabase ping + latency              |
| GET    | `/api/ssl/check`               | SSL cert expiry for all domains      |
| GET    | `/api/stripe/health`           | Stripe webhook health                |
| GET    | `/api/email/health`            | Resend API health                    |
| GET    | `/api/api-limits`              | API rate limit info                  |
| GET    | `/api/migration/sql/:filename` | Migration SQL content                |

---

## New Gustav AI Tools

All 14 new tools are registered in the TOOLS object and accessible via Gustav chat:

`uptime/report`, `errors/top`, `rollback/history`, `git/diff`, `audit/npm`, `bundle/capture`, `bundle/history`, `env/compare`, `backup/now`, `backup/status`, `migration/sql`, `supabase/health`, `ssl/check`, `api-limits`

---

## Data Files

| File                            | Purpose                  |
| ------------------------------- | ------------------------ |
| `docs/uptime-history.json`      | Rolling 24h uptime data  |
| `docs/rollback-history.json`    | Append-only rollback log |
| `docs/bundle-size-history.json` | Build size snapshots     |

---

## Keyboard Shortcuts (Complete)

| Key    | Action                                   |
| ------ | ---------------------------------------- |
| 0-9    | Switch panels (0=Infra, 1=Observe, etc.) |
| Enter  | Focus Gustav chat                        |
| Escape | Close chat/overlay/palette               |
| ?      | Toggle keyboard shortcut help            |
| Ctrl+K | Toggle command palette                   |

---

## Architecture Notes

- **No new dependencies** — all features built with Node.js stdlib + existing patterns
- **Scheduled backups** use native `setTimeout` to calculate ms until next 3 AM — no cron library
- **SSL checks** use PowerShell on Windows (no OpenSSL dependency)
- **Env comparison** shows keys only, never values — security by design
- **Error aggregation** is in-memory only — resets on server restart (by design, not a bug)
- **Uptime polling** starts on server boot, runs every 60s, persists to JSON
