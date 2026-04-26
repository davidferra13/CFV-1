# Build Spec: Pipeline Reliability + Re-score

**Priority:** P0 (nothing else matters if the pipeline can't complete)
**Files to modify:** `devtools/persona-validator.mjs`, `devtools/persona-orchestrator.mjs`, `devtools/persona-planner.mjs`, `package.json`
**Files to create:** `devtools/persona-rescore.mjs`
**Test command:** `npm run personas:orchestrate:once`

---

## Problem

The v2 persona pipeline has an **83% failure rate**. Of 6 personas processed:

- 5 failed validation (all for missing `business_reality`)
- 1 passed analysis but planner crashed (`planned_at: null`)
- Synthesizer is never called automatically
- No mechanism to re-score after building features

The pipeline dead-ends. This spec fixes all four issues.

---

## Fix 1: Expand Validator Noun List

**File:** `devtools/persona-validator.mjs`, function `detectBusinessReality` (lines 30-37)

**Root cause:** The regex only matches digits before a narrow noun list. Personas that say "4 kitchens", "3 markets", "weekly dinners" (no digit), "6 venues", "10 courses" all score 0 and get rejected.

**Current code:**

```js
const businessTerms =
  /\b\d+[\s,]*(?:clients?|events?|locations?|employees?|guests?|seats?|retainers?|dinners?|drops?|restaurants?|outlets?|staff|people|assistants?|cooks?)\b/gi
```

**Change to:**

```js
const businessTerms =
  /\b\d+[\s,]*(?:clients?|events?|locations?|employees?|guests?|seats?|retainers?|dinners?|drops?|restaurants?|outlets?|staff|people|assistants?|cooks?|kitchens?|markets?|venues?|courses?|trucks?|classes?|meals?|orders?|deliveries?|menus?|recipes?|families?|accounts?|services?|batches?|products?|stores?|pop-ups?)\b/gi
```

Also add a secondary pattern for written-out numbers:

```js
const writtenNumbers =
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|dozen|several|multiple|few|many|hundreds?|thousands?)\s+(?:clients?|events?|guests?|dinners?|kitchens?|venues?|courses?|meals?|orders?|services?|batches?|products?|stores?)\b/gi
const writtenMatches = content.match(writtenNumbers) || []
return businessMatches.length + moneyMatches.length + writtenMatches.length
```

**Acceptance criteria:**

- Re-validate the 5 failed personas from `system/persona-pipeline-state.json`: brandon-cole, lena-brooks, caleb-monroe, sofia-delgado should now pass `business_reality` detection
- arthur-klein may still fail (missing 3 sections) and that's OK
- Run: `node devtools/persona-validator.mjs "Chef Flow Personas/Uncompleted/Chef/brandon-cole-integration.txt"` and confirm it passes

---

## Fix 2: Debug and Fix Planner Crash

**File:** `devtools/persona-planner.mjs`

**Root cause:** The orchestrator shows `planned_at: null` for maya-rios, meaning `runPlanner` (orchestrator line 221-225) threw. The planner calls `process.exit(1)` via `fail()` on:

- Line 320-321: report file not found
- Line 329: no gaps parsed (expects `### Gap N:` or numbered bold items)
- Line 270: Ollama not reachable
- Line 373: uncaught error

**Debug steps:**

1. Run the planner directly on maya's report and capture the error:
   ```
   node devtools/persona-planner.mjs docs/stress-tests/persona-maya-rios-cannabis-pastry-chef-micro-2026-04-25.md 2>&1
   ```
2. If gap parsing fails (line 329), the issue is likely the gap regex not matching the report format. Check what `parseGaps()` does and ensure it handles the canonical format (`### Gap N: Title` + `**Severity:** HIGH`).
3. If Ollama connectivity fails, that's environmental, not a code bug.

**Required fix (regardless of specific error):** Add better error logging to `runPlanner` in the orchestrator (line 221-225). Currently it's:

```js
function runPlanner(reportPath, model, ollamaUrl) {
  const cmd = `node devtools/persona-planner.mjs "${reportPath}"` + ...;
  execSync(cmd, { stdio: 'pipe', timeout: 180000 });
}
```

Change the catch in the orchestrator (lines 346-350) to capture and log stderr:

```js
} catch (err) {
  const stderr = err.stderr ? err.stderr.toString().trim() : err.message || 'Unknown error';
  console.log(`[orchestrator] PLANNER FAILED for ${persona.filename}: ${stderr}`);
  // Still falls through to record as processed with planned_at: null
}
```

**Acceptance criteria:**

- Running `node devtools/persona-planner.mjs docs/stress-tests/persona-maya-rios-cannabis-pastry-chef-micro-2026-04-25.md` produces task files in `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/`
- OR if it fails, the error message is clear and logged

---

## Fix 3: Auto-trigger Synthesizer from Orchestrator

**File:** `devtools/persona-orchestrator.mjs`

**Root cause:** The orchestrator runs analyzer and planner but never calls `persona-batch-synthesizer.mjs`. Synthesis must be run manually via `npm run personas:synthesize`.

**Change:** After the main processing loop completes (after the `for` loop in `runCycle`), add:

```js
// Stage 3: Synthesize (aggregate findings across all reports)
if (state.processed.length > 0) {
  console.log(`[orchestrator] Running batch synthesis...`)
  try {
    execSync('node devtools/persona-batch-synthesizer.mjs', {
      stdio: 'inherit',
      timeout: 60000,
      cwd: ROOT,
    })
    console.log(`[orchestrator] Synthesis complete.`)
  } catch (err) {
    console.log(`[orchestrator] Warning: synthesis failed - ${err.message}`)
  }
}
```

Place this AFTER the processing loop ends but BEFORE the state file is written.

**Acceptance criteria:**

- Running `npm run personas:orchestrate:once` processes personas AND produces updated `system/persona-batch-synthesis/saturation.json`
- If synthesis fails, it logs a warning but the orchestrator still exits cleanly

---

## Fix 4: Re-score Command

**File to create:** `devtools/persona-rescore.mjs`

**Purpose:** Re-run the analyzer on an existing persona to see if building features improved the score. Track score history.

**Usage:**

```
node devtools/persona-rescore.mjs --slug kai-donovan
node devtools/persona-rescore.mjs --slug kai-donovan --model gemma3:4b
```

**Logic:**

1. Find the original persona source file. Check `Chef Flow Personas/Completed/` and `Chef Flow Personas/Uncompleted/` for a file matching the slug.
2. Run `persona-analyzer.mjs` on that file. The analyzer already handles writing the report to `docs/stress-tests/`.
3. After analysis completes, read the new report, extract the score.
4. Append to `system/persona-batch-synthesis/score-history.json`:
   ```json
   [
     { "slug": "kai-donovan", "date": "2026-04-26", "score": 35 },
     { "slug": "kai-donovan", "date": "2026-04-27", "score": 52 }
   ]
   ```
5. Run the synthesizer to update saturation.json.

**Add npm script to package.json:**

```json
"personas:rescore": "node devtools/persona-rescore.mjs"
```

**Acceptance criteria:**

- `npm run personas:rescore -- --slug maya-rios-cannabis-pastry-chef-micro` re-analyzes Maya, writes a new report (overwriting the old one), and appends the new score to score-history.json
- score-history.json is valid JSON and accumulates entries over time

---

## End-to-End Acceptance Test

After all 4 fixes, this sequence should work without errors:

```bash
# 1. Process queued personas (validate, analyze, plan, synthesize)
npm run personas:orchestrate:once

# 2. Verify outputs exist
cat system/persona-pipeline-state.json  # should show processed entries
ls system/persona-build-plans/           # should have task files
cat system/persona-batch-synthesis/saturation.json  # should be updated

# 3. Re-score a persona after hypothetical code changes
npm run personas:rescore -- --slug kai-donovan
cat system/persona-batch-synthesis/score-history.json  # should have entry
```

---

## What NOT to change

- Do NOT modify the analyzer prompt template or output format
- Do NOT modify production code (lib/, app/, components/)
- Do NOT modify the dashboard (persona-inbox-server.mjs)
- Do NOT delete v1 pipeline files
- Do NOT run `drizzle-kit push` or touch the database
