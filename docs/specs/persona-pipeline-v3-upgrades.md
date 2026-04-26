# Persona Pipeline v3 Upgrades - Build Spec

> **Purpose:** Turn the persona pipeline from "discovers gaps and writes reports nobody reads" into a closed-loop autonomous product improvement engine.
> **Date:** 2026-04-26
> **Status:** SPEC READY - awaiting Codex execution

---

## Problem Statement

The pipeline works end-to-end but has three bottlenecks:

1. **40% false positive rate.** Ollama flags features as "missing" that already exist in the codebase. The validator catches this _after_ wasting inference time and polluting build plans with noise.
2. **Dead letter box.** 57 build task specs sit in `system/persona-build-plans/` unread. One made it to Codex. The pipeline produces plans that never become code.
3. **Low throughput toward stated goal.** 19 personas in 2 days vs goal of 1000+. No unattended overnight mode. Each run requires manual invocation.

---

## Upgrade Architecture (4 Tasks)

### Task 1: Codebase-Aware Analyzer (False Positive Killer)

**File:** `devtools/persona-analyzer.mjs`

**What:** Before calling Ollama, scan the codebase for known features and inject a "What Already Exists" section into the prompt. If the analyzer knows `lib/tickets/actions.ts` exists before it runs, it won't flag "no ticketing system."

**How:**

1. Import or inline the `KNOWN_BUILT_FEATURES` registry from `devtools/persona-batch-synthesizer.mjs` (lines 129-147). This is an array of `{ pattern, files }` objects mapping regex patterns to codebase file paths.

2. Add a new function `buildExistingFeaturesContext()` at ~line 280 (before `main()`):

   ```js
   function buildExistingFeaturesContext() {
     const lines = []
     for (const feat of KNOWN_BUILT_FEATURES) {
       for (const f of feat.files) {
         const abs = join(ROOT, f)
         if (existsSync(abs)) {
           lines.push(`- ${feat.pattern.source || feat.pattern}: implemented in ${f}`)
           break
         }
       }
     }
     return lines.length > 0
       ? `\n## Features Already Built in ChefFlow (DO NOT flag these as missing)\n${lines.join('\n')}\n`
       : ''
   }
   ```

3. Also add a dynamic grep scan. After loading the 4 reference docs (lines 308-312), add:

   ```js
   // Dynamic feature scan: grep for common capability indicators
   const capabilityFiles = []
   const capDirs = ['app/(chef)', 'lib', 'components']
   const capPatterns = ['actions.ts', 'page.tsx']
   // Walk capDirs, collect file paths matching capPatterns, limit to 200
   const existingFeatures = buildExistingFeaturesContext()
   const capabilityList = capabilityFiles
     .slice(0, 200)
     .map((f) => `- ${f}`)
     .join('\n')
   ```

4. Inject both into `fullPrompt` at line ~345, right before the persona content:

   ```
   ${existingFeatures}

   ## ChefFlow File Structure (partial - for reference)
   ${capabilityList}
   ```

5. Add a line to the system instruction (line 319 area): `"IMPORTANT: Review the 'Features Already Built' section before scoring. If a capability is listed as already built, do NOT flag it as a gap. Only flag genuinely missing capabilities."`

**Acceptance Criteria:**

- `node --check devtools/persona-analyzer.mjs` exits 0
- The `KNOWN_BUILT_FEATURES` array is defined or imported (not duplicated by hand; copy the array from synthesizer lines 129-147)
- `buildExistingFeaturesContext()` function exists and returns a string
- The prompt string (`fullPrompt`) contains the existing features section before the persona content
- No other behavioral changes to the analyzer

**DO NOT:**

- Change the Ollama call parameters (temperature, model, timeout)
- Change the output format or file paths
- Change the retry logic
- Add npm dependencies
- Modify persona-batch-synthesizer.mjs

---

### Task 2: Gap Priority Scoring Engine

**File:** `devtools/persona-batch-synthesizer.mjs`

**What:** Add a priority score to each gap so the most impactful ones float to the top. Write a ranked queue file that downstream tools can consume.

**How:**

1. Add a new function `scoreGap(gap, categoryData)` after the `aggregate()` function (~line 605):

   ```js
   function scoreGap(gap, categoryData) {
     // Severity weight
     const severityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 }[gap.severity] || 1
     // How many personas independently found this gap
     const personaCount = gap.personas ? gap.personas.length : 1
     // Category frequency (more gaps in category = more systemic)
     const categoryFreq = Math.min(categoryData.count / 5, 1) // cap at 1.0
     // Penalize gaps that are likely false positives (already in KNOWN_BUILT_FEATURES)
     const builtPenalty = gap.likely_built ? 0.2 : 1.0

     return (
       Math.round(severityWeight * personaCount * (1 + categoryFreq) * builtPenalty * 100) / 100
     )
   }
   ```

2. In the `aggregate()` function, after building category stats, add a `likely_built` flag to each gap by checking against `KNOWN_BUILT_FEATURES` (already defined at lines 129-147). For each gap, check if any of its `search_hints` match a known built feature pattern.

3. After aggregation, sort all gaps by priority score descending.

4. In `main()`, after Phase 4 (writing synthesis), add a new output file:

   ```js
   // Phase 4b: Write priority queue
   const priorityQueue = allGaps
     .map((g) => ({ ...g, priority_score: scoreGap(g, categories[g.category]) }))
     .sort((a, b) => b.priority_score - a.priority_score)

   const queuePath = join(SYNTHESIS_DIR, 'priority-queue.json')
   writeFileSync(
     queuePath,
     JSON.stringify({ generated_at: new Date().toISOString(), queue: priorityQueue }, null, 2)
   )
   console.log(
     `  Priority queue: ${priorityQueue.length} gaps ranked -> ${relative(ROOT, queuePath)}`
   )
   ```

**Acceptance Criteria:**

- `node --check devtools/persona-batch-synthesizer.mjs` exits 0
- `scoreGap()` function exists and returns a number
- Running the synthesizer produces `system/persona-batch-synthesis/priority-queue.json`
- The queue JSON has structure: `{ generated_at, queue: [{ ...gap, priority_score }] }` sorted by `priority_score` descending
- No changes to existing output files (synthesis report, build plans, saturation.json)

**DO NOT:**

- Change the 20 category definitions or keyword lists
- Change the existing synthesis report format
- Change the saturation tracking logic
- Add npm dependencies
- Modify any other devtools file

---

### Task 3: Auto-Queue Pipeline Closer (Validation -> Codex Specs)

**File:** `devtools/persona-pipeline-cli.mjs` (add new command) + `devtools/persona-pipeline-core.mjs` (add helper)

**What:** New CLI command `auto-build` that reads `validation.json`, filters to MISSING gaps, generates focused Codex task specs, and writes them to `system/codex-queue/`. This closes the loop: pipeline discovers -> validates -> queues for build.

**How:**

1. **In `devtools/persona-pipeline-core.mjs`**, add and export a new function `generateGapBuildSpec(gap, index)`:
   ```js
   export function generateGapBuildSpec(gap, index) {
     const slug = `gap-${gap.category}-${index}`;
     const date = new Date().toISOString().slice(0, 10);
     const spec = `# Codex Task: Build Missing Feature - ${gap.title}
   ```

## Source

- **Category:** ${gap.category}
- **Severity:** ${gap.severity}
- **Discovered by persona:** ${gap.from}
- **Validation status:** MISSING (no codebase evidence found)

## What to Build

${gap.title}

${gap.description || 'See gap title. Implement the minimum viable version of this capability.'}

## Context

This gap was discovered by the persona pipeline stress-testing ChefFlow with simulated user "${gap.from}".
No existing code was found for this feature during automated codebase validation.

## Guardrails

- All monetary amounts in cents (integers, never floats)
- All DB queries must be tenant-scoped (use \`tenant_id\` or \`chef_id\` from session)
- No em dashes anywhere
- No \`@ts-nocheck\`
- No new npm dependencies without justification
- Server actions need: auth gate, tenant scoping, input validation, error propagation, cache busting
- Do NOT create database migrations. If schema changes are needed, document them in a \`## Schema Changes Needed\` section but do NOT create migration files.
- Do NOT delete or modify existing functionality that is unrelated to this gap.

## Acceptance Criteria

1. The described capability exists and is reachable from the UI (if user-facing) or callable from server code (if backend-only)
2. \`npx tsc --noEmit --skipLibCheck\` passes
3. No regressions in existing functionality

## Branch

\`codex/pipeline-${slug}\`
`;
return { slug, spec, date };
}

````

2. **In `devtools/persona-pipeline-cli.mjs`**, add a new command handler `cmdAutoBuild()`:
```js
async function cmdAutoBuild() {
  const validation = readValidation();
  if (!validation || !validation.gaps) {
    console.log('No validation data. Run: persona-pipeline synthesize && persona-pipeline validate');
    return;
  }

  const missing = validation.gaps.filter(g => g.status === 'MISSING');
  const limit = parseInt(getFlag('limit', '10'), 10);
  const dryRun = hasFlag('dry-run');

  // If priority-queue.json exists, use its ordering
  const queuePath = join(ROOT, 'system/persona-batch-synthesis/priority-queue.json');
  let ranked = missing;
  if (existsSync(queuePath)) {
    const pq = JSON.parse(readFileSync(queuePath, 'utf8'));
    const missingTitles = new Set(missing.map(g => g.title));
    ranked = pq.queue.filter(g => missingTitles.has(g.title));
  }

  const batch = ranked.slice(0, limit);
  console.log(`\n  Auto-build: ${missing.length} MISSING gaps, queuing top ${batch.length}\n`);

  const queueDir = join(ROOT, 'system/codex-queue');
  if (!existsSync(queueDir)) mkdirSync(queueDir, { recursive: true });

  let written = 0;
  for (let i = 0; i < batch.length; i++) {
    const { slug, spec } = generateGapBuildSpec(batch[i], i + 1);
    const outPath = join(queueDir, `${slug}.md`);
    if (existsSync(outPath) && !hasFlag('force')) {
      console.log(`  SKIP ${slug} (already queued, use --force to overwrite)`);
      continue;
    }
    if (dryRun) {
      console.log(`  DRY-RUN would write: ${slug}.md`);
    } else {
      writeFileSync(outPath, spec);
      console.log(`  QUEUED ${slug}.md (${batch[i].severity})`);
      written++;
    }
  }
  console.log(`\n  Done. ${written} specs written to system/codex-queue/`);
  if (!dryRun && written > 0) {
    console.log('  Next: submit with persona-to-codex or manually review specs');
  }
}
````

3. Register the command in the dispatch table (~line 440-458):

   ```js
   'auto-build': cmdAutoBuild,
   'autobuild': cmdAutoBuild,
   ```

4. Add to the help text in `cmdHelp()`.

**Acceptance Criteria:**

- `node --check devtools/persona-pipeline-cli.mjs` exits 0
- `node --check devtools/persona-pipeline-core.mjs` exits 0
- Running `node devtools/persona-pipeline-cli.mjs auto-build --dry-run` prints the gaps it would queue without writing files
- Running `node devtools/persona-pipeline-cli.mjs auto-build` writes `.md` spec files to `system/codex-queue/`
- Each spec file contains: title, category, severity, guardrails, acceptance criteria, branch name
- `--limit N` controls how many gaps to queue (default 10)
- `--force` overwrites existing specs
- Specs that already exist in `system/codex-queue/` are skipped by default

**DO NOT:**

- Auto-submit to Codex (that's persona-to-codex.mjs's job; this just writes specs)
- Modify validation.json or any synthesis output
- Change existing CLI commands
- Add npm dependencies

---

### Task 4: Overnight Unattended Mode

**File:** `devtools/persona-orchestrator.mjs`

**What:** Add `--overnight` flag that chains: generate N personas -> analyze all -> plan all -> synthesize -> validate -> log results. Single command, no human in the loop.

**How:**

1. Add `--overnight` and `--generate-count` to `parseArgs()` (~line 69-156):

   ```js
   overnight: hasFlag('overnight'),
   generateCount: parseInt(getFlag('generate-count', '10'), 10),
   ```

2. Add a new function `runGenerator(count, model, ollamaUrl)` after `runBatchSynthesis()` (~line 343):

   ```js
   function runGenerator(count, model, ollamaUrl) {
     const args = ['devtools/persona-generator.mjs', '--count', String(count), '--spread']
     if (model) args.push('--model', model)
     if (ollamaUrl) args.push('--ollama-url', ollamaUrl)
     const result = spawnSync('node', args, {
       cwd: ROOT,
       stdio: ['ignore', 'pipe', 'pipe'],
       timeout: count * 120000, // 2 min per persona
       encoding: 'utf8',
     })
     if (result.status !== 0) {
       console.error(`[overnight] Generator failed:`, result.stderr?.slice(0, 500))
     }
     return result.status === 0
   }
   ```

3. In `main()` (~line 578), add an overnight branch before the existing `--once`/`--watch` logic:

   ```js
   if (opts.overnight) {
     const logPath = join(ROOT, 'logs', `overnight-${new Date().toISOString().slice(0, 10)}.log`)
     const logLines = []
     const log = (msg) => {
       const line = `[${new Date().toISOString()}] ${msg}`
       console.log(line)
       logLines.push(line)
     }

     log(`Overnight mode: generating ${opts.generateCount} personas, then full pipeline`)

     // Phase 1: Generate
     log('Phase 1/4: Generating personas...')
     const genOk = runGenerator(
       opts.generateCount,
       opts.analyzerModel || opts.model,
       opts.ollamaUrl
     )
     log(genOk ? 'Generation complete' : 'Generation had errors (continuing)')

     // Phase 2: Analyze + Plan (reuse runCycle)
     log('Phase 2/4: Analyzing and planning...')
     opts.once = true
     opts.max = 50 // safety cap
     await runCycle(opts)
     log('Analysis + planning complete')

     // Phase 3: Synthesize (force it regardless of count threshold)
     log('Phase 3/4: Synthesizing...')
     runBatchSynthesis(loadState())
     log('Synthesis complete')

     // Phase 4: Log summary
     const state = loadState()
     log(`Phase 4/4: Summary`)
     log(`  Total processed: ${state.total_personas_processed}`)
     log(`  Total build tasks: ${state.total_build_tasks_queued}`)
     log(`  Failed: ${state.failed.length}`)

     writeFileSync(logPath, logLines.join('\n'), 'utf8')
     log(`Log written to ${relative(ROOT, logPath)}`)
     return
   }
   ```

**Acceptance Criteria:**

- `node --check devtools/persona-orchestrator.mjs` exits 0
- `--overnight` flag is recognized and enters the overnight branch
- `--generate-count N` controls how many personas to generate (default 10)
- The overnight run produces a log file at `logs/overnight-{date}.log`
- If generation fails, the pipeline continues with whatever personas exist
- The existing `--once` and `--watch` modes are unchanged

**DO NOT:**

- Change the existing `runCycle()` logic
- Change state file format
- Remove or alter existing CLI flags
- Add npm dependencies
- Auto-submit to Codex (overnight mode discovers and plans; human reviews before submitting)

---

### Task 5: Convergence Engine (Epoch-Based Re-Run + Build Batching)

**Files:** `devtools/persona-rescore.mjs` (extend) + `devtools/persona-convergence.mjs` (NEW file)

**What:** The pipeline currently runs linearly: analyze once, report, move on. This task makes it circular. It introduces "epochs" (numbered passes over the full persona set), stamps every analysis with the git commit it ran against, batches builds between epochs, and re-runs all personas after each build batch to measure convergence. The loop stops when all personas score above a target threshold (default 90) or score improvement drops below a floor (default 2 points per epoch).

**Important context:** This pipeline isn't just personas. Any text input (ideas, scenarios, feature requests) can go through it. The convergence engine must be input-agnostic; it tracks "inputs" that happen to be persona files.

**How:**

**Part A: Extend persona-rescore.mjs to stamp git commit and support batch mode**

1. Add a helper function to get the current short git commit hash:

   ```js
   function getGitCommit() {
     try {
       return execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: ROOT }).trim()
     } catch {
       return 'unknown'
     }
   }
   ```

2. Modify the score history entry (line 185) to include the git commit:

   ```js
   // BEFORE:
   history.push({ slug: opts.slug, date: today, score })
   // AFTER:
   history.push({ slug: opts.slug, date: today, score, commit: getGitCommit() })
   ```

3. Add a `--all` flag to `parseArgs()` that re-scores every persona in `Chef Flow Personas/Completed/`:

   ```js
   if (argv[i] === '--all') opts.all = true
   ```

4. In `main()`, if `opts.all` is true, collect all persona slugs from `Chef Flow Personas/Completed/` subdirectories, then loop over each slug calling the existing single-slug logic. Print a summary table at the end:

   ```
   [rescore] Batch complete. 19 personas re-scored.
   [rescore]   Improved: 12  |  Unchanged: 5  |  Regressed: 2
   [rescore]   Average score: 67/100 (was 58/100)
   ```

5. Compare each new score to the most recent previous score for that slug in score-history.json to determine improved/unchanged/regressed.

**Part B: New file devtools/persona-convergence.mjs - the epoch orchestrator**

This is a NEW file. Create `devtools/persona-convergence.mjs` (~200-300 lines). It orchestrates the full convergence loop.

**Data structure** - `system/convergence-state.json`:

```json
{
  "version": 1,
  "current_epoch": 3,
  "target_score": 90,
  "min_improvement": 2,
  "epochs": [
    {
      "epoch": 1,
      "started_at": "2026-04-26T...",
      "completed_at": "2026-04-26T...",
      "commit_before": "abc1234",
      "commit_after": "def5678",
      "persona_count": 19,
      "average_score": 58,
      "scores": { "kai-donovan": 62, "elena-ruiz": 55, ... },
      "gaps_found": 86,
      "gaps_built": 0,
      "phase": "complete"
    },
    {
      "epoch": 2,
      "started_at": "2026-04-27T...",
      "commit_before": "def5678",
      "persona_count": 19,
      "average_score": 71,
      "scores": { ... },
      "gaps_found": 52,
      "gaps_built": 34,
      "phase": "building"
    }
  ]
}
```

**CLI interface:**

```
node devtools/persona-convergence.mjs status          # Show current epoch, scores, convergence trend
node devtools/persona-convergence.mjs start-epoch     # Start a new epoch (re-score all personas)
node devtools/persona-convergence.mjs build-batch     # Generate Codex specs for top N gaps from current epoch
node devtools/persona-convergence.mjs close-epoch     # Mark epoch complete, record commit_after, print delta
node devtools/persona-convergence.mjs history         # Show epoch-over-epoch convergence table
```

**Command implementations:**

1. **`status`**: Read `system/convergence-state.json`. Print current epoch number, phase (scoring/building/complete), average score, how many personas above target, improvement since last epoch. If no state exists, print "No epochs yet. Run: start-epoch".

2. **`start-epoch`**:
   - Record `commit_before` via `git rev-parse --short HEAD`
   - Run `node devtools/persona-rescore.mjs --all` (subprocess, inherit stdio)
   - Read score-history.json, pull latest score for each slug
   - Run `node devtools/persona-batch-synthesizer.mjs` (subprocess)
   - Read validation.json for gap counts
   - Save epoch entry to convergence-state.json with phase "scored"
   - Print summary: "Epoch N started. Average: X/100. Y personas below target. Z gaps found."

3. **`build-batch`**:
   - Read current epoch from convergence-state.json (must be phase "scored")
   - Read `system/persona-batch-synthesis/priority-queue.json` if it exists, else read validation.json
   - Filter to MISSING gaps only
   - Take top 10 (or `--limit N`)
   - For each gap, call the `generateGapBuildSpec()` function from `persona-pipeline-core.mjs` (import it)
   - Write specs to `system/codex-queue/`
   - Update epoch phase to "building", record `gaps_built` count
   - Print: "Queued N specs to system/codex-queue/. Build them, then run: close-epoch"

4. **`close-epoch`**:
   - Record `commit_after` via `git rev-parse --short HEAD`
   - Compare `commit_before` vs `commit_after` (if same, warn "No commits since epoch start, scores won't change")
   - Update epoch phase to "complete"
   - Calculate improvement: current avg score minus previous epoch avg score
   - If improvement < `min_improvement`, print: "WARNING: Diminishing returns. Only +N points this epoch. Consider stopping or changing strategy."
   - If all personas >= target_score, print: "CONVERGENCE REACHED. All personas at or above target."
   - Print: "Epoch N complete. Ready for: start-epoch"

5. **`history`**: Print a table:
   ```
   Epoch | Commit      | Avg Score | Delta | Gaps Found | Gaps Built | Phase
   1     | abc1234     | 58/100    | --    | 86         | 0          | complete
   2     | def5678     | 71/100    | +13   | 52         | 34         | complete
   3     | ghi9012     | 84/100    | +13   | 28         | 24         | building
   ```

**Acceptance Criteria:**

- `node --check devtools/persona-rescore.mjs` exits 0
- `node --check devtools/persona-convergence.mjs` exits 0
- Score history entries now include a `commit` field
- `node devtools/persona-rescore.mjs --all` re-scores all completed personas and prints a summary
- `node devtools/persona-convergence.mjs status` works even with no prior state (prints helpful message)
- `node devtools/persona-convergence.mjs start-epoch` creates/updates `system/convergence-state.json`
- `node devtools/persona-convergence.mjs build-batch` writes specs to `system/codex-queue/`
- `node devtools/persona-convergence.mjs close-epoch` records the closing commit and prints convergence metrics
- `node devtools/persona-convergence.mjs history` prints the epoch table
- The convergence state file is valid JSON after every operation

**DO NOT:**

- Auto-submit specs to Codex (write them, don't submit them)
- Delete or modify existing score-history.json entries (only append)
- Change the analyzer, planner, or synthesizer behavior
- Add npm dependencies
- Assume all inputs are "personas" in user-facing text; use "input" or "scenario" where appropriate, but filename conventions can stay as-is

---

### Task 6: Register Convergence Commands in CLI

**File:** `devtools/persona-pipeline-cli.mjs`

**What:** Add `converge` as a top-level CLI command that delegates to `persona-convergence.mjs`. This keeps the single-entry-point CLI pattern.

**How:**

1. Add a new command handler:

   ```js
   async function cmdConverge() {
     const subcommand = args[1] || 'status'
     const allowed = ['status', 'start-epoch', 'build-batch', 'close-epoch', 'history']
     if (!allowed.includes(subcommand)) {
       console.log(`Unknown converge subcommand: ${subcommand}`)
       console.log(`Available: ${allowed.join(', ')}`)
       return
     }
     const cliArgs = ['devtools/persona-convergence.mjs', subcommand, ...process.argv.slice(4)]
     const result = spawnSync('node', cliArgs, {
       cwd: ROOT,
       stdio: 'inherit',
       encoding: 'utf8',
     })
     process.exitCode = result.status || 0
   }
   ```

2. Register in dispatch table:

   ```js
   'converge': cmdConverge,
   'convergence': cmdConverge,
   ```

3. Add to help text:
   ```
   converge [sub]    Convergence engine. Subcommands: status, start-epoch, build-batch, close-epoch, history
   ```

**Acceptance Criteria:**

- `node --check devtools/persona-pipeline-cli.mjs` exits 0
- `node devtools/persona-pipeline-cli.mjs converge status` delegates to `persona-convergence.mjs status`
- Unknown subcommands print the available list
- Existing CLI commands unchanged

**DO NOT:**

- Move any logic into the CLI file; it only delegates to the convergence script
- Change existing commands
- Add npm dependencies

---

## Execution Order

These tasks are **independent** and can be built in parallel by separate Codex agents:

| Task                            | Files Modified                                                   | Risk Level                          |
| ------------------------------- | ---------------------------------------------------------------- | ----------------------------------- |
| 1. Codebase-Aware Analyzer      | `persona-analyzer.mjs` only                                      | Low - additive prompt change        |
| 2. Priority Scoring             | `persona-batch-synthesizer.mjs` only                             | Low - additive output               |
| 3. Auto-Queue Closer            | `persona-pipeline-cli.mjs` + `persona-pipeline-core.mjs`         | Low - new command only              |
| 4. Overnight Mode               | `persona-orchestrator.mjs` only                                  | Medium - new execution path         |
| 5. Convergence Engine           | `persona-rescore.mjs` (extend) + `persona-convergence.mjs` (NEW) | Medium - new file + extend existing |
| 6. CLI Convergence Registration | `persona-pipeline-cli.mjs`                                       | Low - dispatch only                 |

**Dependency note:** Task 6 depends on Task 5 (it delegates to the file Task 5 creates). Task 3 and Task 6 both edit `persona-pipeline-cli.mjs` but in different sections (different command handlers + dispatch entries). If running in parallel, merge carefully. Alternatively, run Task 6 after Task 5.

Task 5's `build-batch` command uses `generateGapBuildSpec` from Task 3. If Task 3 isn't merged yet, Task 5 should inline a simple spec generator as fallback, or Task 5 should run after Task 3.

**Recommended parallel groups:**

- **Group A (fully independent):** Tasks 1, 2, 4
- **Group B (after Group A merges):** Tasks 3, 5
- **Group C (after Task 5):** Task 6

## Post-Build Verification

After all 6 tasks are merged, verify the full convergence loop:

```bash
# 1. Run overnight (generates + analyzes + plans + synthesizes)
node devtools/persona-orchestrator.mjs --overnight --generate-count 5

# 2. Check priority queue exists
cat system/persona-batch-synthesis/priority-queue.json | head -20

# 3. Start first convergence epoch
node devtools/persona-convergence.mjs start-epoch

# 4. Queue build batch
node devtools/persona-convergence.mjs build-batch --limit 5

# 5. (Codex builds specs, commits land)

# 6. Close epoch, check improvement
node devtools/persona-convergence.mjs close-epoch

# 7. View convergence history
node devtools/persona-convergence.mjs history

# 8. Start next epoch (repeat until convergence)
node devtools/persona-convergence.mjs start-epoch
```

This creates the full loop: Generate -> Analyze -> Score -> Build Batch -> Re-Score -> Measure Delta -> Repeat.
