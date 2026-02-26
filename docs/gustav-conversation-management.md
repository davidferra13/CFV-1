# Gustav Conversation Management System

**Added:** 2026-02-26
**Files:** `scripts/launcher/gustav-storage.js`, `scripts/launcher/index.html`, `scripts/launcher/server.mjs`

## What It Is

A full conversation management system for Gustav (the Mission Control AI). Conversations are saved locally in IndexedDB and organized into projects. Includes search, bookmarks, templates, action log, voice input, and export.

## Vocabulary

| Term              | Meaning                                    |
| ----------------- | ------------------------------------------ |
| **Conversation**  | A single chat session with Gustav          |
| **Project**       | A folder that groups related conversations |
| **Uncategorized** | Default home for unassigned conversations  |
| **Pinned**        | A conversation starred to float to the top |
| **Archived**      | Hidden but not deleted                     |
| **Bookmark**      | A flag on a specific message               |
| **Template**      | A saved starter prompt                     |
| **Action Log**    | Audit trail of all actions Gustav executed |

## Data Model

IndexedDB database: `gustav-conversations` (v1)

### 4 Object Stores

1. **projects** — `{ id, name, icon, createdAt, updatedAt, sortOrder, conversationCount }`
2. **conversations** — `{ id, projectId, title, summary, createdAt, updatedAt, messageCount, bookmarkCount, pinned, archived, templateId }`
3. **messages** — `{ id, conversationId, role, content, actions, actionResults, bookmarked, createdAt }`
4. **templates** — `{ id, name, prompt, projectId, icon, sortOrder, createdAt }`

## Features

### Conversation Persistence

- Every message (user + assistant) is saved to IndexedDB automatically
- Conversations survive page reloads
- Auto-title from first user message (deterministic, no AI)
- Auto-prune: max 500 conversations, 1000 messages each

### Projects

- Create named folders with emoji icons
- Move conversations between projects
- Collapse/expand project groups (persisted in localStorage)

### Smart Auto-Project

- Keyword-based (Formula > AI rule): "deploy" suggests Deployments, "ollama" suggests AI/Ollama, etc.
- Shows a subtle banner after first message: "Move to Deployments? [Yes] [No]"

### Pin / Archive

- Pin conversations to the top of the list
- Archive conversations to hide without deleting
- Archived section collapsed by default

### Bookmarks

- Bookmark individual messages via hover toolbar
- Bookmark count shown on conversation items

### Search

- Full-text search across conversation titles and message content
- Highlighted matching snippets
- Click result to load the conversation

### Action Log

- Chronological log of every action Gustav executed
- Grouped by date
- Click to jump to the source conversation
- Shows success/failure status per action

### Templates

- Save frequently used prompts
- Run a template: creates new conversation + auto-sends the prompt
- Optionally auto-assigns to a project

### Voice Input

- Web Speech API (speech-to-text)
- Click the microphone button in the input area
- Pulsing red animation when listening
- Transcript fills the input field

### Export

- JSON export: full structured data (for backup/import)
- Markdown export: readable document format
- Project export: all conversations in a project as one JSON file

## UI Views

The chat drawer (400x520px) has 5 switchable views:

1. **Chat** — the default message view (enhanced with bookmarks, breadcrumb, voice)
2. **List** — conversation browser with project grouping
3. **Search** — full-text search with results
4. **Action Log** — chronological action audit trail
5. **Templates** — saved prompts with run/edit/delete

## Keyboard Shortcuts

| Shortcut | Action                   |
| -------- | ------------------------ |
| `Ctrl+/` | Toggle chat drawer       |
| `Ctrl+N` | New conversation         |
| `Ctrl+H` | Toggle list view         |
| `Ctrl+F` | Search (when not typing) |
| `Escape` | Go back / close          |

## Storage Architecture

- **All data is local** (IndexedDB in the browser) — privacy by architecture
- **Server is stateless** — no conversation data on the server
- **No sync** — single-tab launcher, no cross-device sync needed
- **Auto-pruning** prevents unbounded growth

## Testing

Run from browser console on the launcher page:

```javascript
GustavStorage.smokeTest()
```

This runs 25 automated tests covering project CRUD, conversation CRUD, messages, bookmarks, pin/archive, move, templates, search, action log, export, auto-title, and auto-suggest.

## Privacy

Follows the same privacy-by-architecture principle as Remy:

- "We don't have your data" > "We promise not to look"
- All conversation data lives in the browser's IndexedDB
- The server relays messages to Ollama and executes actions — it never stores conversation history
- `clearAllData()` wipes everything instantly
