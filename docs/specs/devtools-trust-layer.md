# Build Spec: HOPE/WISH/ARCH/EYES Trust Layer

**Status:** Ready to build
**Priority:** P1 (blocks confidence in autonomous dev loop)
**Estimated scope:** ~400 lines across 3 files

---

## Problem

The HOPE/WISH/ARCH/EYES devtools pipeline works, but there is no way to prove it works beyond manual observation. The system generates patches in dry mode, runs validation, extracts patterns, and produces assessments, but:

1. No automated test proves the pipeline end-to-end
2. No test proves individual components (WISH intake, HOPE task selection, ARCH signal extraction, EYES metrics)
3. The only validation is "look at localhost:3200 and see green numbers"
4. Regressions can silently break the pipeline with no alert

## Architecture (What Exists)

Six files compose the system:

| File                         | Purpose                                                                        | Lines |
| ---------------------------- | ------------------------------------------------------------------------------ | ----- |
| `devtools/hope/wish.mjs`     | Parses `system/wish.md` checklist, deduplicates, creates HOPE tasks            | 333   |
| `devtools/hope/hope.mjs`     | Selects task from queue, generates dry/apply patches, validates, logs          | 642   |
| `devtools/arch/arch.mjs`     | Reads logs/tasks/diffs, extracts patterns/anti-patterns/decisions              | 772   |
| `devtools/eyes/eyes.mjs`     | Reads tasks/logs, generates metrics/efficiency/value assessments               | 238   |
| `devtools/wish-to-codex.mjs` | Converts unchecked wishes into Codex-ready spec files in `system/codex-queue/` | 231   |
| `devtools/wish-ui.mjs`       | HTTP server (port 3200) serving dashboard + API for all subsystems             | 657   |
| `devtools/codex-review.mjs`  | Discovers codex/\* branches, typechecks via worktree, generates review report  | 273   |

State lives in `system/`:

- `wish.md` (checklist), `tasks.json` (queue), `log.md` (bounded log), `mode.txt`, `goal.txt`
- `guardrails.md`, `steering.md`, `map.json`, `knowledge.json`
- `metrics.md`, `efficiency.md`, `value.md`, `patterns.md`, `decisions.md`, `anti_patterns.md`
- `diffs/` (generated patches), `codex-queue/` (generated specs)

Data flow: `wish.md -> WISH -> tasks.json -> HOPE -> diffs/ + log.md -> ARCH -> knowledge.json -> EYES -> metrics/efficiency/value`

Supervisor (`run.mjs`) orchestrates: WISH -> HOPE -> ARCH (every Nth cycle) -> EYES (every Nth cycle), logs each cycle.

## What to Build

### 1. Unit Test Suite (`devtools/tests/unit.test.mjs`)

Pure function tests extracted from each module. No filesystem, no child processes. Test the logic, not the I/O.

**From `wish.mjs`:**

- `parseChecklist()`: empty input, single item, multiple statuses, items outside `## Ideas` section ignored, inline comments preserved
- `normalize()` / `slugify()`: edge cases (empty, special chars, long strings)
- `isDuplicateIdea()`: exact match, substring match, normalized match, non-duplicate
- `inferScope()`: keyword match (pricing -> lib/pricing), no match -> default scope
- `taskFromIdea()`: output shape matches HOPE task schema (all required fields present)
- `titleFromIdea()`: truncation at 74 chars, comment stripping

**From `hope.mjs`:**

- `validateTaskShape()`: valid task passes, missing fields fail
- `selectTask()`: picks lowest priority, respects blocked flag, anti-pattern penalty
- `movePendingToProgress()`: moves task, doesn't duplicate
- `generateInitialTasks()`: pricing feature detected, fallback when not
- `generateFailureFollowUp()`: timeout vs non-timeout title, scope is always devtools
- `buildDryPatch()`: output is valid unified diff format
- `preEditValidation()`: missing scope paths detected

**From `arch.mjs`:**

- `extractSignals()`: failure signals from failed tasks, completion signals, timeout detection from log text, multi-file change detection
- `buildCandidates()`: first run produces empty, repeated failures produce anti-patterns, evidence threshold respected
- `mergeEntries()`: new entries added, existing entries updated (last_seen bumped, evidence merged), no duplicates
- `areaFromPath()`: app paths, lib paths, unknown paths

**From `eyes.mjs`:**

- `generateMetrics()`: correct counts from task state
- `generateEfficiency()`: 0 attempted -> N/A, 50% completion rate, waste signals triggered at thresholds
- `generateValue()`: reuse detection, pattern/decision counts

**From `wish-to-codex.mjs`:**

- `inferScope()`: keyword matching, confidence levels
- `generateTaskMd()`: output contains all required sections (Objective, Scope, Branch, Guardrails, Acceptance Criteria)
- `slugify()`: length cap, special char removal

**Implementation notes:**

- Import functions directly. Most are currently module-scoped (not exported). The build agent must add named exports to each module for testable functions. Add exports at the bottom of each file: `export { parseChecklist, normalize, ... }` (Node ESM).
- Use Node's built-in `node:test` runner and `node:assert`. Zero dependencies.
- Each test must be independent (no shared mutable state between tests).

### 2. Integration Test (`devtools/tests/integration.test.mjs`)

End-to-end pipeline test using a temporary `system/` directory. Tests the real file I/O and subprocess orchestration.

**Setup:** Create a temp directory, copy/symlink devtools scripts, create minimal state files (wish.md with 2 unchecked items, empty tasks.json, goal.txt).

**Test sequence:**

1. Run `wish.mjs --once --limit 2` -> verify tasks.json has 2 pending tasks, wish.md items marked `[>]`
2. Run `hope.mjs --once --dry-run` -> verify one task completed, diff file exists in diffs/, log.md has entry
3. Run `arch.mjs --once` -> verify knowledge.json updated, run_count incremented, summary exists
4. Run `eyes.mjs` -> verify metrics.md, efficiency.md, value.md all written
5. Run `run.mjs --once` -> verify full supervisor cycle logged with all 4 subsystems
6. Run `wish-to-codex.mjs` -> verify codex-queue/ has spec files with correct structure

**Assertions per step:**

- File exists and is valid JSON/Markdown
- Task state transitions are correct (pending -> in_progress -> completed/failed)
- Log entries contain expected fields (mode, task id, scope, validation)
- No orphaned state (in_progress cleared after completion)
- Dedup works (run wish.mjs again with same items, nothing new queued)

**Cleanup:** Remove temp directory after test.

**Implementation notes:**

- Use `node:test` with `before`/`after` hooks for temp dir lifecycle.
- Set `process.cwd()` override or pass ROOT via env var. Currently ROOT is `process.cwd()`, so `cd` into temp dir or use a wrapper.
- Each subprocess invocation uses `execFileAsync` with the temp dir as cwd.
- Timeout: 30s per test, 120s total.

### 3. Wish UI API Test (`devtools/tests/api.test.mjs`)

Tests the HTTP API layer of wish-ui.mjs.

**Setup:** Start wish-ui.mjs on a random port (use `--port 0` or a high port like 13200). Wait for server ready.

**Tests:**

- `GET /` returns 200 with HTML containing "HOPE / WISH / ARCH / EYES"
- `GET /api/status` returns JSON with tasks, mode, recentLog fields
- `GET /api/wishes` returns array
- `POST /api/wishes` with `{ text: "test idea" }` -> 200, then GET /api/wishes includes new item
- `POST /api/wishes` with empty text -> 400
- `GET /api/queue` returns array
- `GET /api/tasks` returns object with in_progress, pending, completed, failed
- `POST /api/wishes/:index/defer` marks item as deferred
- `GET /api/review` returns null or string

**Do NOT test:**

- `/api/run-cycle` and `/api/run-eyes` (they spawn subprocesses, too slow for API tests; covered by integration test)
- `/api/generate` (spawns wish-to-codex, covered by integration test)

**Implementation notes:**

- Use `node:test` and native `fetch` (Node 18+).
- Start server as child process, wait for stdout containing "Running at", then run tests.
- Kill server in `after()` hook.
- Use a fresh temp system/ dir so tests don't pollute real state.

### 4. NPM Script

Add to package.json:

```json
"test:devtools": "node --test devtools/tests/*.test.mjs"
```

### 5. Dashboard Health Indicator

Add a small health check to the wish-ui.mjs dashboard that runs the unit tests on demand.

**New API endpoint:** `GET /api/health` -> runs `node --test devtools/tests/unit.test.mjs --reporter json` and returns `{ pass: true/false, summary: "X/Y tests passed", duration_ms: N }`.

**New UI element:** A small badge next to the title "HOPE / WISH / ARCH / EYES" showing test health. Green checkmark if last health check passed, red X if failed, gray if never run. A "Run Tests" button triggers the health check.

---

## What NOT to Build

- No CI/CD integration (this is a local devtool)
- No coverage reporting (overkill for devtools)
- No snapshot testing (state files are too dynamic)
- No Playwright tests (this is a developer-only dashboard, not user-facing)
- No changes to the core pipeline logic (test what exists, don't refactor it)

## Acceptance Criteria

- [ ] `npm run test:devtools` exits 0 with all tests passing
- [ ] Unit tests cover all pure functions listed above (minimum 40 test cases)
- [ ] Integration test proves full WISH -> HOPE -> ARCH -> EYES pipeline in isolation
- [ ] API test proves wish-ui.mjs serves correct responses
- [ ] Health endpoint returns accurate pass/fail
- [ ] Dashboard shows health badge
- [ ] No changes to existing pipeline behavior (tests are additive only)
- [ ] Each module exports its testable functions without breaking existing CLI usage

## File Changes

| Action | File                                  | What                                                                                                                                                                     |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Create | `devtools/tests/unit.test.mjs`        | ~200 lines, 40+ test cases                                                                                                                                               |
| Create | `devtools/tests/integration.test.mjs` | ~120 lines, 6 pipeline stages                                                                                                                                            |
| Create | `devtools/tests/api.test.mjs`         | ~80 lines, 9 API endpoints                                                                                                                                               |
| Modify | `devtools/hope/wish.mjs`              | Add `export { parseChecklist, normalize, slugify, isDuplicateIdea, inferScope, taskFromIdea, titleFromIdea }` at bottom                                                  |
| Modify | `devtools/hope/hope.mjs`              | Add `export { validateTaskShape, selectTask, movePendingToProgress, generateInitialTasks, generateFailureFollowUp, buildDryPatch, preEditValidation, taskId }` at bottom |
| Modify | `devtools/arch/arch.mjs`              | Add `export { extractSignals, buildCandidates, mergeEntries, areaFromPath, normalize as archNormalize }` at bottom                                                       |
| Modify | `devtools/eyes/eyes.mjs`              | Add `export { generateMetrics, generateEfficiency, generateValue }` at bottom                                                                                            |
| Modify | `devtools/wish-to-codex.mjs`          | Add `export { inferScope, generateTaskMd, slugify as codexSlugify }` at bottom                                                                                           |
| Modify | `devtools/wish-ui.mjs`                | Add `/api/health` endpoint + health badge in HTML                                                                                                                        |
| Modify | `package.json`                        | Add `test:devtools` script                                                                                                                                               |

## Guardrails

- Do NOT modify any existing function logic. Only add exports and tests.
- Do NOT create new state files in the real `system/` directory. Tests use temp dirs.
- Do NOT add npm dependencies. Use `node:test`, `node:assert`, `node:fs`, `node:child_process` only.
- Existing `main()` functions in each module must still work when run as CLI (`node devtools/hope/hope.mjs`). The export additions must not interfere with the `if (import.meta.url === ...)` pattern or the existing top-level `main()` calls. Since these files call `main()` at the top level, the test files must import only the exported functions, not trigger `main()`. Solution: wrap `main()` calls in a guard: `if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) { main() }`. Apply this guard to each modified file.
