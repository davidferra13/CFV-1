# Wish UI - Local Web Interface

> A tiny standalone web server that gives the developer a browser-based UI for the wish-to-codex pipeline.

## Problem

The developer wants a bookmarkable link with a simple UI to manage ideas and Codex submissions. Currently requires terminal commands and editing markdown files by hand.

## What to Build

Two files:

- `devtools/wish-ui.mjs` - Standalone HTTP server (no Express, just `node:http`)
- Serves a single-page app with inline HTML/CSS/JS (no build step, no dependencies)

## URL

`http://localhost:3200`

Port 3200 (not 3000 which is ChefFlow, not 3100 which is dev server, not 4000 which is OpenClaw Operator).

## UI Layout

One page. Clean, dark theme, monospace font. Three sections stacked vertically:

### Section 1: Add Idea

- Large text input (full width)
- "Add" button
- Pressing Enter also submits
- Adds `- [ ] <text>` to system/wish.md under the Ideas heading

### Section 2: Wish List

- Shows all items from system/wish.md as a visual checklist
- Color coded by status:
  - `[ ]` unchecked = white
  - `[>]` in progress = yellow
  - `[x]` completed = green
  - `[!]` failed = red
  - `[~]` deferred = gray
- Each unchecked item has a small "x" button to mark as deferred
- Shows total counts: "3 pending, 2 queued, 1 done"
- "Generate Specs" button at the bottom that runs wish-to-codex.mjs

### Section 3: Codex Queue

- Lists files in system/codex-queue/
- Each entry shows filename and first line (the title)
- "Copy" button next to each that copies the file contents to clipboard
- Link text: "Paste into Codex" (not a hyperlink, just label text)

### Section 4: Review (if system/codex-review.md exists)

- Renders the review report
- Shows branch name, pass/fail status, file count
- Color coded: green for PASS, red for FAIL

## API Routes

All routes served by the same `node:http` server:

```
GET  /                          -> HTML page (inline, no external files)
GET  /api/wishes                -> JSON array of wish items
POST /api/wishes                -> Add new wish item (body: { text: "..." })
POST /api/wishes/:index/defer   -> Mark item as deferred
POST /api/generate              -> Run wish-to-codex.mjs, return result
GET  /api/queue                 -> List codex-queue files with contents
GET  /api/review                -> Return codex-review.md contents (or null)
```

## Implementation

### Server (devtools/wish-ui.mjs)

```js
#!/usr/bin/env node
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()
const PORT = 3200
const WISH_FILE = join(ROOT, 'system', 'wish.md')
const QUEUE_DIR = join(ROOT, 'system', 'codex-queue')
const REVIEW_FILE = join(ROOT, 'system', 'codex-review.md')
```

### Wish Parsing

Reuse the same checklist parsing logic from `devtools/hope/wish.mjs` (the `parseChecklist` function, lines 125-154). Copy it, don't import.

### HTML

Serve the entire UI as a single inline HTML string from the GET / handler. No external CSS, no external JS, no build step. Everything in one `const html = \`...\`` template literal.

Style guidelines:

- Dark background (#1a1a2e or similar)
- Light text (#e0e0e0)
- Monospace font (system monospace)
- Cards with subtle borders for each section
- Buttons: solid background, no gradients, clear hover state
- Mobile-friendly (works on phone browser too)
- Max-width 800px, centered

### Running wish-to-codex.mjs

The "Generate Specs" button calls POST /api/generate, which runs:

```js
await execFileAsync('node', [join(ROOT, 'devtools', 'wish-to-codex.mjs')], {
  cwd: ROOT,
  timeout: 30000,
})
```

Then refreshes the wish list and queue sections.

### Clipboard Copy

Each codex-queue file has a "Copy" button that uses the Clipboard API:

```js
navigator.clipboard.writeText(content)
```

Show a brief "Copied!" confirmation.

## CLI

```
node devtools/wish-ui.mjs              # start server on port 3200
node devtools/wish-ui.mjs --port 3300  # custom port
```

Print on startup:

```
[wish-ui] Running at http://localhost:3200
```

## What This Does NOT Do

- No authentication (local-only tool, not exposed to internet)
- No database (reads/writes system/ files directly)
- No build step or npm dependencies (pure Node.js)
- No modifications to ChefFlow product code
- Does not submit to Codex (developer copies and pastes manually)
- Does not auto-refresh (developer refreshes the page or clicks buttons)

## Validation

1. Run `node devtools/wish-ui.mjs`
2. Open `http://localhost:3200` in browser
3. Type an idea and click Add - verify it appears in system/wish.md
4. Click Generate Specs - verify files appear in system/codex-queue/
5. Click Copy on a queue item - verify clipboard contains the spec
6. Stop server with Ctrl+C
7. No product code modified
8. No npm dependencies added
