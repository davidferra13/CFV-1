# OpenClaw Chat Intercom (Mission Control Integration)

## What Changed

Added the ability to talk to OpenClaw directly from Mission Control, both from the Pixel Kitchen canvas and the OpenClaw panel.

## Components

### 1. Pixel Kitchen Intercom (pixel-kitchen-v2.js)

A pixel art intercom/radio mounted on the upper-right kitchen wall. Features:

- Speaker grille with horizontal lines
- Green/red pulsing LED showing gateway online/offline status
- Orange "TALK" button
- Antenna with signal waves when online
- Clickable: opens the OpenClaw panel Chat tab and focuses the input

The intercom reads `bizData.agentStates.openclawGateway` (polled every 15s from `/api/pixel/data`).

### 2. OpenClaw Panel Chat Tab (index.html)

New "Chat" tab (first tab) in the OpenClaw Activity panel. Contains:

- Welcome screen with quick action buttons (Current work, Roadmap, Progress, Recent commits, Gateway status, Blockers)
- Message display area with user/bot bubbles
- Input bar with Send/Stop buttons
- Separate chat history from Gustav (stored in `ocChatHistory` JS array, not IndexedDB)

### 3. Chat API Endpoint (server.mjs)

`POST /api/openclaw/chat` - Streaming NDJSON endpoint identical in protocol to Gustav's `/api/chat`.

**System prompt** built from:

- `config/openclaw-deploy/SOUL.md` (team identity)
- `config/openclaw-deploy/ROADMAP.md` (current work queue)
- `config/openclaw-deploy/PROGRESS.md` (completed work)
- Live gateway status (SSH check)

**OpenClaw-specific tools** (executed via `<action>` tags in response):

| Tool          | Description                                                     |
| ------------- | --------------------------------------------------------------- |
| `oc/roadmap`  | Fetch live ROADMAP.md from Pi (falls back to local config copy) |
| `oc/progress` | Fetch live PROGRESS.md from Pi                                  |
| `oc/gateway`  | Check gateway service status, PID, uptime                       |
| `oc/logs`     | Last 40 lines of gateway journal logs                           |
| `oc/git-log`  | Last 20 commits from OpenClaw clone                             |
| `oc/git-diff` | Uncommitted changes in clone                                    |
| `oc/files`    | Recent file change activity from watcher                        |
| `oc/restart`  | Restart the OpenClaw gateway service                            |
| `oc/today`    | Today's activity log (last 100 lines)                           |

### 4. Pixel Data Enhancement (server.mjs)

`/api/pixel/data` now includes `agentStates.openclawGateway` (boolean) from SSH check to Pi.

## Architecture

```
Pixel Kitchen (canvas) ──click──> OpenClaw Panel > Chat Tab
                                        │
                                        ▼
                              POST /api/openclaw/chat
                                        │
                                        ▼
                               Ollama (PC or Pi)
                           + OpenClaw system prompt
                           + action execution via SSH
```

Chat is stateless on the server. History is managed client-side in `ocChatHistory` array. No IndexedDB persistence (keeps it simple, conversations are ephemeral operational chats).

## Usage

1. **From Pixel Kitchen:** Click the intercom on the upper-right wall
2. **From OpenClaw panel:** Click the "Chat" tab (first tab)
3. **Quick actions:** Use the preset buttons for common questions
4. **Free text:** Type anything and the OpenClaw team persona responds with context from their SOUL, ROADMAP, and PROGRESS files
