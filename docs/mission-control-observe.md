# Mission Control — Observe Panel (Live Feed Hub)

> **Added:** February 2026
> **Keyboard shortcut:** `=` key
> **Concept:** Unified Observability Dashboard / Multiplexed Log Stream

## What This Is

The **Observe** panel is a real-time log aggregation dashboard inside Mission Control. It shows every live feed that makes ChefFlow run — all in one place, all at once. Instead of having 5 terminal windows open watching different processes, you open one panel and see everything.

This concept is known in the industry as:

- **Live Tail** — following a log stream as it arrives in real time (from `tail -f`)
- **Centralized Logging** — aggregating multiple log sources into one view
- **Multiplexed Log Stream** — merging N named streams into one wire protocol with source tags
- **Observability Dashboard** — the broader enterprise term (Grafana, Datadog, Kibana)

## Architecture

### Transport: Server-Sent Events (SSE)

The panel uses a single SSE connection (`GET /api/livefeed`) that multiplexes all 5 log sources into one stream. Each message is tagged by source:

```
event: log
data: {"source":"dev","level":"info","message":"Ready on port 3100","ts":1709001234}

event: log
data: {"source":"beta","level":"error","message":"ECONNREFUSED","ts":1709001235}
```

SSE was chosen over WebSocket because:

- Log streaming is one-way (server → client)
- SSE has built-in automatic reconnection
- The `EventSource` browser API is 3 lines of code
- No upgrade handshake, works through any proxy

### Log Sources (5)

| Source     | How It's Tailed                                        | Color            |
| ---------- | ------------------------------------------------------ | ---------------- |
| **DEV**    | Secondary listener on `devServerProcess.stdout/stderr` | Cyan `#38bdf8`   |
| **OLLAMA** | PowerShell `Get-Content -Wait` on Ollama's server.log  | Purple `#a855f7` |
| **BETA**   | SSH to Pi: `pm2 logs chefflow-beta --raw` (streaming)  | Green `#22c55e`  |
| **TUNNEL** | SSH to Pi: `journalctl -u cloudflared -f` (streaming)  | Amber `#fbbf24`  |
| **SYSTEM** | Mission Control's own metrics (heap usage, every 10s)  | Gray `#94a3b8`   |

### Lifecycle

- Tailing processes are **lazy** — they only start when the first client connects to `/api/livefeed`
- When the last client disconnects, all tailing processes are killed
- This prevents orphaned SSH sessions or PowerShell processes

### Performance

- **Buffer cap:** 5,000 entries max, trims 500 oldest when exceeded
- **Batched DOM writes:** Uses `requestAnimationFrame` pattern
- **ANSI stripping:** All ANSI escape codes stripped server-side before sending
- **SSE heartbeat:** `ping` event every 15 seconds to prevent connection timeout

## UI Design

The panel follows the **Unified Stream with Source Badges** pattern (used by Grafana, Dozzle, Datadog):

- All sources flow into one chronological list
- Each row has a Grafana-style **colored level bar** on the left edge (3px)
- Source badge in each row (color-coded)
- Timestamp in HH:MM:SS format

### Controls

- **Source toggle buttons** — click to show/hide individual sources
- **Level filter** — dropdown: All, Info+, Warn+, Error Only
- **Text search** — filter by keyword
- **Pause/Resume** — stops auto-scroll, shows "N new lines" badge
- **Clear** — empties the log
- **Smart auto-scroll** — scrolls with new content, pauses when you scroll up, shows resume badge

## Files Modified

- `scripts/launcher/server.mjs` — Added live feed infrastructure:
  - `feedEvent()` — broadcasts a log entry to all SSE clients
  - `startLiveFeedTaps()` — spawns tailing processes for all 5 sources
  - `stopLiveFeedTaps()` — kills all tailing processes
  - `GET /api/livefeed` — SSE endpoint with backfill + heartbeat
  - Dev server tap hook in `startDevServer()`

- `scripts/launcher/index.html` — Added:
  - Nav item (satellite emoji, "Observe" label)
  - Full panel HTML with filter bar + log body
  - 200 lines of JavaScript for SSE client, filtering, auto-scroll, DOM management

## Keyboard Shortcuts (Updated)

| Key     | Panel                 |
| ------- | --------------------- |
| `1`-`9` | Home through Feedback |
| `0`     | Infra                 |
| `-`     | Blueprint             |
| `=`     | **Observe** (new)     |
| `\`     | System Reference      |

## Design References

Built from studying:

- **Dozzle** — SSE-based Docker log viewer (closest reference)
- **Grafana Loki** — log panel with level bars and source badges
- **Datadog Live Tail** — real-time log streaming UX
- **tmux** — terminal multiplexer concept (multiple panes in one view)
