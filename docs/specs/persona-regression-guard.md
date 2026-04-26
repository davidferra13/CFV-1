# Build Spec: Persona Regression Guard

> Codex task. Create ONE new file. No modifications to existing files.

## What This Does

Creates `devtools/persona-regression-guard.mjs` - a script that re-scores ALL personas (or a filtered set) and compares against their last known scores to detect regressions. If any persona drops more than a threshold, it flags it.

This prevents the scenario where building features for Persona A accidentally regresses Persona B.

## File To Create

`devtools/persona-regression-guard.mjs`

## CLI Interface

```
node devtools/persona-regression-guard.mjs                           # rescore all, compare
node devtools/persona-regression-guard.mjs --threshold 10            # flag drops > 10 points (default: 5)
node devtools/persona-regression-guard.mjs --slug kai-donovan        # rescore one persona only
node devtools/persona-regression-guard.mjs --dry-run                 # compare existing scores only, no new rescore
node devtools/persona-regression-guard.mjs --model gemma4:e4b        # override analyzer model
```

## Algorithm

### Step 1: Load Previous Scores

Read `system/persona-batch-synthesis/score-history.json`. This is an array of objects:

```json
[
  { "slug": "kai-donovan", "date": "2026-04-20", "score": 65 },
  { "slug": "kai-donovan", "date": "2026-04-25", "score": 70 },
  { "slug": "rina-solis", "date": "2026-04-22", "score": 58 }
]
```

Group by slug. For each slug, take the MOST RECENT entry as the baseline score.

### Step 2: Find All Persona Files

Scan `Chef Flow Personas/Completed/` recursively for `.txt` and `.md` files. For each file, derive a slug from the filename:

- Strip extension
- Lowercase
- Replace spaces with hyphens
- Remove non-alphanumeric characters except hyphens

If `--slug` is passed, filter to only that slug.

### Step 3: Rescore (unless --dry-run)

For each persona file found in Step 2, run the existing `persona-rescore.mjs` script:

```
node devtools/persona-rescore.mjs --slug {slug} --model {model}
```

Use `execSync` with `{ encoding: 'utf-8', timeout: 180000, cwd: ROOT }`. The timeout is 3 minutes per persona (Ollama can be slow).

If persona-rescore.mjs fails for a persona, log the error and continue to the next one. Do not abort.

### Step 4: Load New Scores

Re-read `system/persona-batch-synthesis/score-history.json` (it was updated by each rescore call). Group by slug again. For each slug, the most recent entry is the NEW score.

### Step 5: Compare and Report

For each persona:

- `previous_score`: the most recent score from Step 1 (before rescoring)
- `new_score`: the most recent score from Step 4 (after rescoring)
- `delta`: `new_score - previous_score`
- `regressed`: `delta < -threshold` (default threshold is 5)

### Output Format

```
=== Persona Regression Guard ===
Model: gemma4:e4b | Threshold: 5 | Date: 2026-04-26

Results:
  kai-donovan:     70 -> 72 (+2)  [OK]
  rina-solis:      58 -> 55 (-3)  [OK]
  leo-varga:       62 -> 54 (-8)  [REGRESSION]
  noah-kessler:    45 -> 48 (+3)  [OK]
  dr-julien:       (no baseline)  [NEW - score: 40]

Summary:
  Rescored: 5
  Improved: 2
  Stable:   1
  Regressed: 1 (leo-varga)
  New:       1

REGRESSION DETECTED in 1 persona(s). Review before shipping.
```

### Step 6: Write Report

Write the full report to `system/regression-reports/{YYYY-MM-DD}.json`:

```json
{
  "generated_at": "2026-04-26T12:00:00.000Z",
  "model": "gemma4:e4b",
  "threshold": 5,
  "results": [
    {
      "slug": "kai-donovan",
      "previous_score": 70,
      "new_score": 72,
      "delta": 2,
      "status": "improved"
    },
    {
      "slug": "leo-varga",
      "previous_score": 62,
      "new_score": 54,
      "delta": -8,
      "status": "regressed"
    }
  ],
  "summary": {
    "total": 5,
    "improved": 2,
    "stable": 1,
    "regressed": 1,
    "new_baseline": 1
  },
  "regressed_personas": ["leo-varga"]
}
```

### Exit Code

- Exit 0 if no regressions detected
- Exit 1 if any regressions detected (useful for CI gating)

## Implementation Rules

1. This is a NEW standalone file. Do NOT modify any existing files.
2. Use only Node.js built-in modules: `fs`, `path`, `child_process`, `url`
3. ROOT is resolved from `__dirname` up one level
4. Create directories with `mkdirSync({ recursive: true })` as needed
5. The script calls `persona-rescore.mjs` as a child process. It does NOT duplicate the rescore logic.
6. Use `#!/usr/bin/env node` shebang
7. The `--dry-run` flag skips Step 3 entirely. It only loads existing score-history.json and computes deltas between the two most recent entries per slug. If a slug has only 1 entry, it's reported as "NEW" with no delta.
8. Progress output goes to stderr (`process.stderr.write`). Only the final summary goes to stdout.
9. If score-history.json doesn't exist, print "No score history found. Run persona-rescore.mjs first." and exit 1
10. If `Chef Flow Personas/Completed/` doesn't exist, print error and exit 1

## Persona File Discovery

To find persona files in Completed/:

```js
const COMPLETED_DIR = join(ROOT, 'Chef Flow Personas', 'Completed')
// Scan all type subdirectories: Chef, Client, Guest, Vendor, Staff, Partner, Public
const TYPES = ['Chef', 'Client', 'Guest', 'Vendor', 'Staff', 'Partner', 'Public']

for (const type of TYPES) {
  const typeDir = join(COMPLETED_DIR, type)
  if (!existsSync(typeDir)) continue
  const files = readdirSync(typeDir)
  for (const f of files) {
    const ext = extname(f).toLowerCase()
    if (ext !== '.txt' && ext !== '.md') continue
    // derive slug from filename
    const slug = f
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    personas.push({ slug, file: join(typeDir, f) })
  }
}
```

## Do NOT

- Import from any other devtools script
- Modify any existing file
- Add npm dependencies
- Call Ollama directly (use persona-rescore.mjs as the child process)
- Run rescores in parallel (Ollama can only handle one at a time)
- Skip error handling on child process failures (log and continue)
