# Devtools EYES Executable + Supervisor

> Build spec for creating the EYES evaluation script and a single-process supervisor for all devtools.

## Context

The `devtools/` directory contains three tools: HOPE (task execution), WISH (intake), ARCH (knowledge extraction). Two pieces are missing:

1. **EYES** exists only as three hand-written markdown files in `system/`. There is no executable script to regenerate them. Without automation, EYES is a one-time snapshot, not a system.
2. **No supervisor exists.** Each tool must be started in a separate terminal. There is no concurrency protection, no unified cadence, no single entry point.

## Files to Create

| File                     | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `devtools/eyes/eyes.mjs` | Reads system state, generates `metrics.md`, `efficiency.md`, `value.md` |
| `devtools/run.mjs`       | Single-process supervisor that runs HOPE, WISH, ARCH, EYES in sequence  |

## EYES: `devtools/eyes/eyes.mjs`

### Input

Reads (all read-only, never writes to these):

- `system/tasks.json` - task counts, completion/failure rates
- `system/log.md` - activity timeline, validation outcomes
- `system/knowledge.json` - ARCH signal counts, patterns found
- `system/diffs/` - patch artifacts (count and recency)

### Output

Writes three files:

- `system/metrics.md` - raw counts and validation outcomes
- `system/efficiency.md` - cost vs resolution, waste analysis
- `system/value.md` - value assessment of completed vs failed work

### Logic

```js
function generateMetrics(tasks, logEntries, diffs) {
  const completed = tasks.completed?.length ?? 0;
  const failed = tasks.failed?.length ?? 0;
  const pending = tasks.pending?.length ?? 0;
  const inProgress = tasks.in_progress ? 1 : 0;

  // Extract validation outcomes from log entries
  const timeouts = logEntries.filter(e => e.includes("timeout") || e.includes("timed_out")).length;
  const passes = logEntries.filter(e => e.includes("- pass") || e.includes("validation: ok")).length;

  return { completed, failed, pending, inProgress, timeouts, passes, diffCount: diffs.length };
}

function generateEfficiency(metrics, tasks) {
  const totalAttempted = metrics.completed + metrics.failed;
  const completionRate = totalAttempted > 0 ? (metrics.completed / totalAttempted * 100).toFixed(1) : "N/A";
  const timeoutRate = totalAttempted > 0 ? (metrics.timeouts / totalAttempted * 100).toFixed(1) : "N/A";

  // Identify waste: failed tasks that generated follow-ups (net task increase)
  const followUps = (tasks.failed ?? []).filter(t =>
    (tasks.pending ?? []).some(p => p.dependencies?.includes(t.id))
  );

  return { completionRate, timeoutRate, followUpCount: followUps.length, wasteSignals: [] };
}

function generateValue(metrics, tasks, knowledge) {
  // Completed work value assessment
  const completedTasks = tasks.completed ?? [];
  const hasReuse = completedTasks.some(t => /* check if referenced in knowledge patterns */);
  const patternsFound = knowledge?.patterns?.length ?? 0;
  const decisionsFound = knowledge?.decisions?.length ?? 0;

  return { completedTasks: completedTasks.length, patternsFound, decisionsFound };
}
```

### Markdown Rendering

Each file follows the same format as the existing hand-written versions:

- Title with `# EYES ...`
- `Generated: <ISO timestamp>`
- Sections with `##` headers
- Bullet points with `-` prefix
- No prose paragraphs; only structured observations

### CLI

```
node devtools/eyes/eyes.mjs --once       # single run
node devtools/eyes/eyes.mjs              # single run (default --once)
```

EYES always runs once. It does not loop. The supervisor handles scheduling.

### Append to shared log

After generating all three files, append one entry to `system/log.md`:

```
## <timestamp> - eyes assessment

- completed_tasks: N
- failed_tasks: N
- completion_rate: N%
- timeout_rate: N%
- patterns_found: N
- artifacts: system/metrics.md, system/efficiency.md, system/value.md
```

## Supervisor: `devtools/run.mjs`

### Purpose

Single entry point that runs all four tools in sequence within one process. Eliminates concurrency risk (shared files), provides unified cadence, single terminal.

### Execution Order

```
1. WISH  (intake ideas -> tasks)
2. HOPE  (execute one task cycle)
3. ARCH  (extract knowledge from results)  [every Nth cycle]
4. EYES  (evaluate system health)          [every Nth cycle]
```

WISH runs first so new ideas are queued before HOPE picks a task. ARCH and EYES run less frequently (every 5 cycles by default).

### Implementation

```js
#!/usr/bin/env node
import { execFileAsync } from './shared.mjs' // or inline promisify

const DEFAULTS = {
  intervalSeconds: 30,
  archEveryN: 5,
  maxCycles: Infinity,
}

async function runTool(script, args = []) {
  try {
    const { stdout } = await execFileAsync('node', [script, '--once', ...args], {
      cwd: ROOT,
      timeout: 600_000, // 10 min hard cap per tool
    })
    console.log(`[${basename(script)}] ${stdout.trim().split('\n')[0]}`)
    return true
  } catch (err) {
    console.error(`[${basename(script)}] FAILED: ${err.message}`)
    return false
  }
}

async function main() {
  let cycle = 0
  while (cycle < options.maxCycles) {
    cycle++
    console.log(`\n--- cycle ${cycle} ---`)

    await runTool('devtools/hope/wish.mjs')
    await runTool('devtools/hope/hope.mjs', ['--dry-run'])

    if (cycle % options.archEveryN === 0) {
      await runTool('devtools/arch/arch.mjs')
      await runTool('devtools/eyes/eyes.mjs')
    }

    await sleep(options.intervalSeconds * 1000)
  }
}
```

### CLI

```
node devtools/run.mjs                          # run forever, 30s interval
node devtools/run.mjs --once                   # single cycle of all tools
node devtools/run.mjs --interval 60            # 60s between cycles
node devtools/run.mjs --max-cycles 10          # stop after 10 cycles
node devtools/run.mjs --arch-every 3           # run ARCH/EYES every 3rd cycle
```

### Safety

- Sequential execution within one process; no concurrent file access
- 10-minute hard timeout per tool invocation (prevents hangs)
- If any tool fails, log the error and continue to the next tool
- Never runs in apply mode; always passes `--dry-run` to HOPE
- Ctrl+C graceful shutdown (process.on SIGINT)

### Log

The supervisor itself appends one entry per cycle to `system/log.md`:

```
## <timestamp> - supervisor cycle N

- wish: ok | failed
- hope: ok | failed
- arch: skipped | ok | failed
- eyes: skipped | ok | failed
- next_cycle_in: 30s
```

## Validation

1. `node devtools/eyes/eyes.mjs` generates all three .md files with correct content
2. `node devtools/run.mjs --once` runs all four tools in sequence without error
3. `system/log.md` shows entries from all tools in correct order
4. No product code is modified
5. No concurrent file access possible (sequential execution)

## Out of Scope

- Modifications to HOPE or ARCH (separate spec)
- WISH changes (works correctly as-is)
- Product code changes
- Apply mode support in supervisor
