# Devtools Core Loop Hardening

> Build spec for fixing HOPE and ARCH to make the devtools system actually functional.

## Context

The `devtools/` and `system/` directories contain a local multi-agent development system (HOPE, WISH, ARCH). An audit found three critical defects that make the system non-functional:

1. HOPE uses `npm run build` as validation, which takes 10-15 min on this codebase and always times out (9 min limit)
2. ARCH extracts signals per-scope-path instead of per-task, creating 3-6x signal noise from a single failure
3. ARCH produces knowledge artifacts that nothing reads; HOPE never consults them

## Files to Modify

| File                     | Change                                                   |
| ------------------------ | -------------------------------------------------------- |
| `devtools/hope/hope.mjs` | Validation gate, failed cap, ARCH feedback, file locking |
| `devtools/arch/arch.mjs` | Signal aggregation fix                                   |

## Changes

### 1. HOPE: Fix validation gate

In `generateInitialTasks()` (line ~249), change validation from:

```js
validation: ["npm run typecheck", "npm run build"],
```

to:

```js
validation: ["npx tsc --noEmit --skipLibCheck"],
```

In `generateFailureFollowUp()` (line ~273), same change:

```js
validation: ["npx tsc --noEmit --skipLibCheck"],
```

Also update `DEFAULT_TASKS` comment and `GUARDRAILS_FILE` default text to reflect that typecheck is the primary gate. `npm run build` is too slow to be a validation gate in a 20-second loop.

### 2. HOPE: Cap the failed array

Add a constant:

```js
const MAX_FAILED = 20
```

At the end of `cycle()`, after `writeJson(TASKS_FILE, tasks)`, add rotation:

```js
if (tasks.failed.length > MAX_FAILED) {
  const archivePath = join(SYSTEM_DIR, 'archive')
  mkdirSync(archivePath, { recursive: true })
  const overflow = tasks.failed.splice(0, tasks.failed.length - MAX_FAILED)
  const archiveFile = join(
    archivePath,
    `failed-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  )
  writeFileSync(archiveFile, JSON.stringify(overflow, null, 2), 'utf8')
  writeJson(TASKS_FILE, tasks)
}
```

### 3. HOPE: Read ARCH knowledge before task selection

In `cycle()`, after loading tasks and before `selectTask()`, read ARCH knowledge:

```js
const knowledge = readJson(join(SYSTEM_DIR, 'knowledge.json'), null)
```

In `selectTask()`, accept knowledge as a second parameter. If an anti-pattern exists whose scope matches a candidate task's scope, deprioritize that task (add 10 to its priority). This is soft influence, not a hard block.

```js
function selectTask(tasks, knowledge) {
  if (tasks.in_progress) return tasks.in_progress
  const antiPatterns = knowledge?.anti_patterns ?? []
  const candidates = tasks.pending
    .filter((task) => !task.blocked && validateTaskShape(task))
    .map((task) => {
      const matchesAntiPattern = antiPatterns.some((ap) =>
        task.scope.some((s) => s.includes(ap.scope?.replace(/^\//, '') ?? ''))
      )
      return { ...task, effective_priority: task.priority + (matchesAntiPattern ? 10 : 0) }
    })
  candidates.sort(
    (a, b) =>
      a.effective_priority - b.effective_priority || a.created_at.localeCompare(b.created_at)
  )
  return candidates[0] ?? null
}
```

### 4. HOPE: Add file locking for tasks.json

Add a simple lock mechanism using a `.lock` file:

```js
const LOCK_FILE = join(SYSTEM_DIR, 'tasks.lock')
const LOCK_TIMEOUT_MS = 10000

function acquireLock() {
  const deadline = Date.now() + LOCK_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' })
      return true
    } catch {
      // Lock held by another process; spin briefly
      const start = Date.now()
      while (Date.now() - start < 100) {
        /* busy wait */
      }
    }
  }
  return false
}

function releaseLock() {
  try {
    unlinkSync(LOCK_FILE)
  } catch {
    /* already released */
  }
}
```

Wrap the tasks read/write section of `cycle()` in `acquireLock()`/`releaseLock()`. Add `unlinkSync` to the imports.

### 5. ARCH: Fix signal aggregation

In `extractSignals()` (line ~300), the current code iterates tasks and creates a signal per scope path per failure kind. Change it to aggregate by task ID:

**Current (wrong):**

```js
for (const task of context.tasks) {
  const scopes = Array.isArray(task.scope) && task.scope.length > 0 ? task.scope : ['system']
  const areas = [...new Set(scopes.map(areaFromScope))]
  // ... creates one signal per area
  for (const area of areas) {
    if (task.arch_status === 'failed') {
      addSignal(signals, { kind: 'failure', topic: ..., area, ... })
    }
  }
}
```

**Fixed:**

```js
for (const task of context.tasks) {
  const scopes = Array.isArray(task.scope) && task.scope.length > 0 ? task.scope : ['system']
  const primaryArea = areaFromScope(scopes[0])
  const taskText = normalize(
    [
      task.title,
      task.expected_outcome,
      task.failure_reason,
      JSON.stringify(task.validation ?? ''),
    ].join(' ')
  )

  if (task.arch_status === 'failed') {
    addSignal(signals, {
      kind: 'failure',
      topic: taskText.includes('timeout') ? 'validation timeout' : 'task failure',
      area: primaryArea,
      evidence: [`${task.id}: ${task.failure_reason || task.title || 'failed task'}`],
      sources: ['system/tasks.json'],
    })
  }

  if (task.arch_status === 'completed') {
    addSignal(signals, {
      kind: 'completion',
      topic: task.type || 'task completion',
      area: primaryArea,
      evidence: [`${task.id}: ${task.title || 'completed task'}`],
      sources: ['system/tasks.json'],
    })
  }
}
```

One task = one signal = one area (primary scope path). Not N signals for N scope paths.

## Validation

After changes:

1. `node devtools/hope/hope.mjs --once --dry-run` completes without timeout
2. `node devtools/arch/arch.mjs --once` produces knowledge without duplicate signals
3. No product code is modified
4. `system/tasks.json` structure is unchanged (same schema)

## Out of Scope

- EYES executable (separate spec)
- Supervisor/orchestrator script (separate spec)
- WISH changes (WISH works correctly as-is)
- Product code changes
