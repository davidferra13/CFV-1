# Build Spec: Dashboard Interactivity

**Priority:** P1 (pipeline must work first, but this makes it usable)
**Files to modify:** `devtools/persona-inbox-server.mjs`
**Files read (not modified):** `system/persona-batch-synthesis/score-history.json` (if exists), `system/persona-pipeline-state.json`
**Test:** Open `http://127.0.0.1:3977/` in browser, verify all interactions work

---

## Problem

The persona pipeline dashboard at localhost:3977 is 90% read-only. The Findings, Personas, and Build Queue sections display data but offer zero actions. Users can't re-analyze a persona, mark a build task done, trigger the pipeline, filter results, or distinguish "no data" from "API error." This spec adds the minimum viable interactivity.

---

## Change 1: Action Buttons on Persona Cards

**Section:** Persona Gallery (rendered by `renderPersonas()`, ~line 825)

Add a "Re-analyze" button to each persona card. When clicked, POST to a new endpoint that re-queues the persona for analysis.

### New server endpoint

```
POST /api/reanalyze
Body: { "slug": "kai-donovan" }
```

**Server logic:**

1. Find the persona source file. Search `Chef Flow Personas/Completed/` and `Chef Flow Personas/Uncompleted/` for a filename containing the slug.
2. If not found, return `{ error: "Persona source file not found for slug" }`.
3. Spawn `node devtools/persona-analyzer.mjs <filepath>` as a child process (non-blocking, same pattern as `runPipeline`).
4. Return `{ status: "queued", slug }`.

### Client UI

Add a small "Re-analyze" button in each `.persona-card` `.card-head` div, next to the score. Style it like existing buttons (small, ghost variant). On click:

```js
await postJson('/api/reanalyze', { slug: p.slug })
statusEl.textContent = 'Re-analysis queued for ' + p.name
```

**Important:** Use `event.stopPropagation()` on the button click so it doesn't toggle the card open/close.

---

## Change 2: Mark Build Tasks Done

**Section:** Build Queue (rendered by `renderBuildTasks()`, ~line 840)

Add a checkmark button on each task row. When clicked, move the task file to a `completed/` subfolder.

### New server endpoint

```
POST /api/complete-task
Body: { "path": "system/persona-build-plans/kai-donovan/task-1.md" }
```

**Server logic:**

1. Validate path starts with `system/persona-build-plans/` and ends with `.md`.
2. Create `system/persona-build-plans/{slug}/completed/` if it doesn't exist.
3. Move the file from `{slug}/task-N.md` to `{slug}/completed/task-N.md`.
4. Return `{ status: "completed", path }`.

**Update `readBuildTaskFiles()`:** Skip files in `completed/` subdirectories. Add a count of completed tasks to the response.

### Client UI

Add a small checkmark button (unicode checkmark or text "Done") on each `.task-row`, left of the severity badge. On click:

```js
await postJson('/api/complete-task', { path: t.path })
await refreshState()
```

Show completed count in the Build Queue section header: "Build Queue (3 pending, 2 done)".

---

## Change 3: Run Pipeline Button

**Section:** Pipeline Monitor (`#pipelineSection`, ~line 656)

The pipeline section currently has only an Expand/Collapse button. Add a "Run Pipeline" button that triggers `npm run personas:orchestrate:once`.

### Client UI

Add button next to "Expand" in the `.pipeline-head` div:

```html
<button id="runPipeline" style="margin-right:8px">Run Pipeline</button>
```

On click:

```js
$('runPipeline').onclick = async () => {
  try {
    const r = await postJson('/run-pipeline', {})
    statusEl.textContent = r.pipeline || 'Pipeline started'
    await refreshState()
  } catch (e) {
    statusEl.textContent = e.message
  }
}
```

The server already has a mechanism for running the pipeline via `runPipeline()`. Wire the button to POST `/run-pipeline` (which may already exist, or create it if not). The key constraint: don't start a second pipeline if one is already running.

---

## Change 4: Error Visibility

**Current problem:** `refreshState()` (line 861) uses `.catch(() => null)` and `.catch(() => [])` for API calls. If any endpoint returns 500, the section silently shows empty state. The `/state` fetch has no `.catch()` at all, causing unhandled promise rejections every 3.5s if the server is unreachable.

### Fix

Replace the Promise.all block:

```js
async function refreshState(options = {}) {
  let stateRes, synthData, personaList, taskList;
  try {
    [stateRes, synthData, personaList, taskList] = await Promise.all([
      fetch('/state').then(r => r.json()),
      fetch('/api/synthesis').then(r => r.json()),
      fetch('/api/personas').then(r => r.json()),
      fetch('/api/build-tasks').then(r => r.json()),
    ]);
  } catch (err) {
    statusEl.textContent = 'Connection error: ' + err.message;
    netDot.classList.add('offline');
    netText.textContent = 'Error';
    return;
  }
  // rest of function unchanged
```

Add per-section error indicators. If `synthData` is null or has an `.error` property, show:

```html
<div class="empty warn">Failed to load synthesis data. Check server logs.</div>
```

instead of "No synthesis data yet. Run the pipeline to generate findings."

Same for personas and build tasks: distinguish "none found" from "load failed."

---

## Change 5: Filter and Sort Controls

### Persona Gallery

Add a sort toggle above the gallery grid:

```html
<div style="margin-bottom:8px">
  Sort: <button id="sortScore" class="btn-sm active">Score</button>
  <button id="sortName" class="btn-sm">Name</button>
</div>
```

The sort is client-side. Store the persona list in a variable and re-render on toggle:

```js
let personaData = []
function renderPersonas(list) {
  personaData = list || []
  // ... existing render logic
}
$('sortScore').onclick = () => {
  personaData.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
  renderPersonas(personaData)
}
$('sortName').onclick = () => {
  personaData.sort((a, b) => a.name.localeCompare(b.name))
  renderPersonas(personaData)
}
```

### Build Queue

Add a severity filter:

```html
<div style="margin-bottom:8px">
  Filter: <button id="filterAll" class="btn-sm active">All</button>
  <button id="filterHigh" class="btn-sm">HIGH</button>
  <button id="filterMedium" class="btn-sm">MEDIUM</button>
</div>
```

Filter is client-side, re-renders the task list with filtered data.

---

## Change 6: Score Trend Display

If `system/persona-batch-synthesis/score-history.json` exists (created by the re-score spec), show trend indicators on persona cards.

### New server endpoint

```
GET /api/score-history
```

Returns the contents of `score-history.json` or `[]` if not found.

### Client UI

In `renderPersonas()`, for each persona, check if score-history has multiple entries for that slug. If so, show a delta indicator:

- Score went up: green arrow up + delta (e.g., "+12")
- Score went down: red arrow down + delta
- No history: no indicator

Place the delta next to the score number in the card header.

---

## Change 7: Mobile Table Fix

**Section:** Priority Categories table in Findings

Wrap the `<table class="cat-table">` in a scrollable container:

```html
<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
  <table class="cat-table">
    ...
  </table>
</div>
```

One line of CSS prevents the table from breaking the layout on narrow screens.

---

## CSS Additions

Add these styles for new elements:

```css
.btn-sm {
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid #d1c9b8;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
.btn-sm.active {
  background: #1f2933;
  color: #fff;
  border-color: #1f2933;
}
.btn-sm:hover {
  background: #e8e0d0;
}
.delta-up {
  color: #22863a;
  font-size: 12px;
  margin-left: 4px;
}
.delta-down {
  color: #cb2431;
  font-size: 12px;
  margin-left: 4px;
}
.reanalyze-btn {
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid #d1c9b8;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  margin-left: 8px;
}
.reanalyze-btn:hover {
  background: #e8e0d0;
}
.task-done-btn {
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border: 1px solid #d1c9b8;
  border-radius: 3px;
  background: transparent;
  margin-right: 8px;
}
.task-done-btn:hover {
  background: #d4edda;
}
```

Dark mode variants for all new classes in the `@media (prefers-color-scheme: dark)` block.

---

## Acceptance Criteria

1. Clicking "Re-analyze" on a persona card shows "Re-analysis queued" in status bar
2. Clicking checkmark on a build task removes it from the list and increments "done" counter
3. "Run Pipeline" button starts the pipeline (log expands, pulsing indicator)
4. When server is unreachable, dashboard shows "Connection error" instead of blank sections
5. Sort toggles re-order persona cards by score or name
6. Severity filter shows only matching build tasks
7. Priority Categories table scrolls horizontally on mobile (< 600px width)
8. All new buttons work in dark mode

---

## What NOT to change

- Do NOT modify API data shapes (add fields, don't change existing ones)
- Do NOT modify other devtools scripts
- Do NOT modify production code
- Do NOT add npm dependencies or external CDN resources
- Keep all changes in the single `persona-inbox-server.mjs` file
- Preserve the warm/cream design language
