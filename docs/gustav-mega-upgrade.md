# Gustav (MC Assistant) Mega Upgrade

**Date:** 2026-02-26
**Status:** Complete

## What Changed

### Bug Fix: "Error: Unknown error"

- **Root cause:** Launcher server was running stale code from before the chat endpoint was added. HTML served fresh from disk (shows chat UI), but Node.js server in memory didn't have `/api/chat` route.
- **Fix:** Restarted server. Added `--watch-path=scripts/launcher` to `package.json` so the server auto-restarts on file changes.

### Phase 1: Markdown Rendering

- Added `marked.js` CDN library for markdown parsing
- Bot messages now render: **tables**, `code blocks`, **bold**, _italic_, lists, headings, blockquotes, horizontal rules
- Streaming tokens debounced (100ms) for performance during markdown re-render
- CSS styles for all markdown elements inside chat bubbles (dark theme matched)

### Phase 2: Supabase Query Helper

- `supabaseQuery(endpoint, opts)` — reusable REST API wrapper
- Uses service role key for full access
- Handles encoding, timeouts, error truncation
- Graceful Cloudflare worker error handling

### Phase 3: 11 New Tools (29 total, up from 18)

**Business Data (read-only Supabase queries):**

- `data/events` — Upcoming events with client, date, status, guest count, city
- `data/events-by-status` — Event count breakdown by FSM status
- `data/revenue` — Revenue summary: total revenue, expenses, profit, outstanding balance, avg margin
- `data/clients` — List/search clients (local filtering, bypasses RLS edge cases)
- `data/inquiries` — Open inquiries awaiting response

**Infrastructure Monitoring:**

- `health/app` — App health check (DB latency, Redis, circuit breakers)
- `pi/status` — Pi system vitals: uptime, disk, memory, PM2, systemd services
- `pi/logs` — Recent PM2 logs from beta server

**DevOps:**

- `prod/deployments` — Recent Vercel production deployments
- `test/run` — Run smoke tests or typecheck

**Remy Bridge:**

- `remy/ask` — Proxy business questions to Remy AI (requires dev server)

### Phase 4: Enhanced System Prompt

- Gustav personality refined: senior ops engineer, mission control vibe
- Capability areas documented: DevOps, Git & Build, Business Data, Monitoring, Remy Bridge
- Markdown formatting instructions added
- Financial data formatting rule (cents → dollars)

### Phase 5: Updated Quick Actions

- Welcome screen updated with new capabilities
- Quick action buttons: Status, Revenue, Events, Pi status, Start dev, Deploy beta

### Phase 6: Regex Fix

- Action tag regex updated to support hyphens (`data/events-by-status`)
- Applied to both server.mjs and index.html

## Architecture

```
User → Gustav Chat UI (index.html)
  → POST /api/chat (server.mjs:3200)
    → Ollama qwen3-coder:30b (streaming)
    → Parse <action> tags
    → Execute tools:
      ├── DevOps: spawn/exec local processes
      ├── Business Data: Supabase REST API
      ├── Monitoring: SSH to Pi, HTTP health checks
      └── Remy Bridge: HTTP to localhost:3100
    → Stream NDJSON back to client
```

## Known Limitations

- Client search: Uses local filtering (fetch all → filter in JS) due to Supabase Cloudflare worker crashes on `ilike` filter encoding
- Remy bridge: Requires dev server running on port 3100
- Vercel deployments: Requires `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` in `.env.local`

## Files Modified

- `scripts/launcher/server.mjs` — 11 new tools, Supabase helper, enhanced system prompt
- `scripts/launcher/index.html` — Markdown rendering, updated quick actions, regex fix
- `package.json` — `--watch-path` flag for auto-restart
