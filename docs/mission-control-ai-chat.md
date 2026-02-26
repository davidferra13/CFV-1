# Gustav — Mission Control AI Chat Bot

**Added:** 2026-02-26
**Files:** `scripts/launcher/server.mjs`, `scripts/launcher/index.html`

## What It Is

A conversational AI assistant embedded in the Mission Control launcher dashboard. It can answer questions AND execute any launcher action via natural language.

## How It Works

### Architecture

```
User types message
  → Browser sends POST /api/chat { message, history }
  → Server picks best Ollama (PC first, Pi fallback)
  → Server builds system prompt with live status + tool list
  → Server streams Ollama response as NDJSON tokens
  → Server parses <action> tags from full response
  → Server executes actions using existing handler functions
  → Server sends action results + done signal
  → Browser displays streaming text + action result cards
```

### UI

- **Floating Action Button (FAB)** — bottom-right corner, terracotta gradient, robot emoji
- **Status dot** — green when Ollama is available, red when offline
- **Chat drawer** — 400x520px overlay panel, opens over any tab
- **Message bubbles** — user (terracotta), bot (dark card with streaming glow)
- **Action result cards** — monospace cards with green/red border showing execution results
- **Quick action buttons** — "Status check", "Start dev", "Push branch", "Deploy beta"

### Keyboard Shortcuts

- `Ctrl+/` — toggle chat drawer
- `Escape` — close chat (or close confirm dialog if chat is closed)
- Number keys `1-6` still switch tabs (disabled when typing in chat input)

## Backend

### New API Endpoint

**`POST /api/chat`** — streaming chat with Ollama

Request:

```json
{
  "message": "deploy to beta",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Response: NDJSON stream (one JSON object per line)

```
{"type":"token","content":"Deploying"}
{"type":"token","content":" to"}
{"type":"token","content":" beta..."}
{"type":"action_results","results":[{"action":"beta/deploy","ok":true,"result":{"ok":true,"message":"Deploy started"}}]}
{"type":"done","fullResponse":"Deploying to beta...\n<action>beta/deploy</action>","actions":["beta/deploy"]}
```

### Tool Registry

14 actions available:

| Action            | Description              |
| ----------------- | ------------------------ |
| `dev/start`       | Start local dev server   |
| `dev/stop`        | Stop local dev server    |
| `beta/restart`    | Restart beta (PM2)       |
| `beta/deploy`     | Deploy to beta           |
| `beta/rollback`   | Rollback beta            |
| `ollama/pc/start` | Start Ollama on PC       |
| `ollama/pc/stop`  | Stop Ollama on PC        |
| `ollama/pi/start` | Start Ollama on Pi       |
| `ollama/pi/stop`  | Stop Ollama on Pi        |
| `git/push`        | Push current branch      |
| `build/typecheck` | Run tsc                  |
| `build/full`      | Run next build           |
| `status/all`      | Get all service statuses |
| `status/git`      | Get git info             |

### Tool Calling

The LLM uses tag-based tool calling: `<action>action/name</action>`. The server regex-parses these from the complete response and executes them sequentially. Results are sent as a separate `action_results` chunk.

### Ollama Fallback

1. Try PC Ollama first (`localhost:11434`, `qwen3-coder:30b`)
2. If PC offline, try Pi (`10.0.0.177:11434`, `qwen3:8b`)
3. If both offline, return 503 error

## Error Handling

| Scenario              | Behavior                                      |
| --------------------- | --------------------------------------------- |
| No Ollama available   | 503 JSON error, FAB dot red                   |
| Ollama timeout (120s) | AbortController fires, error shown inline     |
| Action failure        | Individual action fails, others still execute |
| Unknown action tag    | Logged as warning, error card shown           |
| Network error         | "Connection error" shown in chat bubble       |

## Configuration

Constants in `server.mjs`:

```javascript
CHAT_CONFIG = {
  maxHistoryMessages: 20, // Context window
  maxTokens: 1024, // Max response length
  timeoutMs: 120_000, // Overall timeout
}
```

## System Prompt

The system prompt is built dynamically with:

- Live status of all 5 services + git info
- Complete list of available actions with descriptions
- Personality: "Gustav" — direct, efficient mission control operator
- Full authority: no confirmation dialogs, immediate execution
