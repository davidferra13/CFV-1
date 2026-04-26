# Pipeline Bugfix: Synthesis Deadlock + Partial Report Handling

> Status: SPEC READY
> Priority: CRITICAL
> Date: 2026-04-26
> Files to modify: devtools/persona-orchestrator.mjs (2 changes), devtools/persona-planner.mjs (1 change)

## Problem

The persona pipeline has never completed a full cycle because of two cascading bugs:

1. **Synthesis deadlock**: `countNewReportsSinceLastSynthesis()` only counts entries where `planned_at` is set. The planner has a 0% success rate, so `planned_at` is always null, so synthesis never triggers. But synthesis reads from `docs/stress-tests/` (analyzer output), not build plans. It does not need the planner to succeed.

2. **Partial reports poison the planner**: When the analyzer fails, it writes a "partial report" with fake gaps like "Analyzer incomplete" and "Manual review required". The planner tries to grep the codebase for keywords from these fake titles, finds nothing useful, and fails. Partial reports should be skipped by the planner entirely.

3. **Synthesis double-gated**: In `runCycle()`, synthesis is gated on `plannedSuccessCount > 0 && newReportsSinceLastSynthesis >= 2`. Since planner always fails, `plannedSuccessCount` is always 0. Synthesis never runs even if the function were fixed.

## Fix 1: devtools/persona-orchestrator.mjs - countNewReportsSinceLastSynthesis

Find this function (around line 316-323):

```js
function countNewReportsSinceLastSynthesis(state) {
  const lastSynthesisAt = state.last_synthesis_at ? Date.parse(state.last_synthesis_at) : 0
  return state.processed.filter((entry) => {
    if (!entry.planned_at) return false
    const analyzedAt = Date.parse(entry.analyzed_at || '')
    return Number.isFinite(analyzedAt) && analyzedAt > lastSynthesisAt
  }).length
}
```

Replace with:

```js
function countNewReportsSinceLastSynthesis(state) {
  const lastSynthesisAt = state.last_synthesis_at ? Date.parse(state.last_synthesis_at) : 0
  return state.processed.filter((entry) => {
    // Count all analyzed entries, not just planned ones.
    // Synthesis reads from docs/stress-tests/ (analyzer output) and does not need build plans.
    const analyzedAt = Date.parse(entry.analyzed_at || '')
    return Number.isFinite(analyzedAt) && analyzedAt > lastSynthesisAt
  }).length
}
```

The only change: remove the `if (!entry.planned_at) return false;` line.

## Fix 2: devtools/persona-orchestrator.mjs - Synthesis gate in runCycle

Find this block (around line 462-464):

```js
  const newReportsSinceLastSynthesis = countNewReportsSinceLastSynthesis(state);
  if (plannedSuccessCount > 0 && newReportsSinceLastSynthesis >= 2) {
```

Replace with:

```js
  const newReportsSinceLastSynthesis = countNewReportsSinceLastSynthesis(state);
  if (processedCount > 0 && newReportsSinceLastSynthesis >= 2) {
```

The only change: replace `plannedSuccessCount` with `processedCount`. Synthesis should trigger when personas are analyzed, not only when plans succeed.

## Fix 3: devtools/persona-planner.mjs - Skip partial reports

Find the `main()` function (around line 317). After `const markdown = readFileSync(fullPath, "utf-8");` (line 325) and before `const gaps = parseGaps(markdown);` (line 326), add a partial report check:

```js
const fullPath = toAbsolute(reportFile)
const markdown = readFileSync(fullPath, 'utf-8')

// Skip partial/incomplete reports - they have fake placeholder gaps
if (/^\*\*Partial:\*\*\s*true/m.test(markdown)) {
  console.log(
    `SKIP: ${reportFile} is a partial report (analyzer did not complete). Skipping planner.`
  )
  process.exit(0)
}

const gaps = parseGaps(markdown)
```

This checks for the `**Partial:** true` marker that the analyzer writes in partial reports (see line 5 of the test report). Exit code 0 so the orchestrator treats it as a non-failure.

## Fix 4: devtools/persona-orchestrator.mjs - Reset stale failures for retry

Add a new CLI flag `--retry-failed` that moves failed entries back into the pending queue.

Find the CLI parsing section (around line 80-110). Add a new case:

```js
      case '--retry-failed':
        opts.retryFailed = true;
        break;
```

Add the default in the opts object (around line 75):

```js
    retryFailed: false,
```

In `runCycle()`, before `const pending = scanPendingFiles(state, opts.file);` (around line 344), add:

```js
if (opts.retryFailed && state.failed.length > 0) {
  console.log(`[orchestrator] Retrying ${state.failed.length} previously failed personas...`)
  // Move failed persona files back to Uncompleted/ if they exist in Failed/
  for (const entry of state.failed) {
    const failedPath = join(
      ROOT,
      'Chef Flow Personas',
      'Failed',
      basename(dirname(entry.source_file)),
      basename(entry.source_file)
    )
    const uncompletedPath = join(ROOT, entry.source_file)
    if (existsSync(failedPath)) {
      const destDir = dirname(uncompletedPath)
      mkdirSync(destDir, { recursive: true })
      try {
        renameSync(failedPath, uncompletedPath)
        console.log(`[orchestrator] Moved back: ${basename(entry.source_file)}`)
      } catch (err) {
        console.log(`[orchestrator] Could not move ${basename(entry.source_file)}: ${err.message}`)
      }
    }
  }
  state.failed = []
  saveState(state)
}
```

Note: `renameSync`, `existsSync`, `mkdirSync`, `dirname`, `basename`, and `join` are already imported at the top of the file.

## Testing

After all 4 fixes are applied:

1. Run `node devtools/persona-orchestrator.mjs --retry-failed --once` to reprocess failed personas with the new model (gemma4:e4b)
2. Check `system/persona-pipeline-state.json` for new processed entries with `analyzed_at` timestamps
3. If >= 2 entries are processed, synthesis should auto-trigger
4. Check `system/persona-batch-synthesis/` for a new synthesis report
5. Partial reports should show `planned_at: null` but NOT cause the orchestrator to fail

## Rules

- ONLY modify the three files listed above
- NEVER touch the main Next.js app (app/, components/, lib/)
- NEVER use em dashes anywhere in the code or comments
- Do NOT change the planner model or analyzer model defaults
- Do NOT modify persona-validator.mjs, persona-generator.mjs, or persona-inbox-server.mjs
- Do NOT delete or modify any existing persona files or state files (except clearing the failed array when --retry-failed is used)
