# Build Spec: Full Pipeline Runner

> Codex task. Create ONE new file. No modifications to existing files.

## What This Does

Creates `devtools/persona-pipeline-full.mjs` - a single command that chains all pipeline stages in order. Right now you run 5 separate commands manually. This script runs them all.

## File To Create

`devtools/persona-pipeline-full.mjs`

## CLI Interface

```
node devtools/persona-pipeline-full.mjs                           # full cycle
node devtools/persona-pipeline-full.mjs --skip-generate           # skip persona generation
node devtools/persona-pipeline-full.mjs --skip-rescore            # skip regression guard
node devtools/persona-pipeline-full.mjs --generate-count 3        # generate 3 personas (default: 0)
node devtools/persona-pipeline-full.mjs --dry-run                 # print what would run, don't execute
```

## Pipeline Stages (in order)

The script runs these stages sequentially. Each stage is a child process. If a stage fails, log the error and continue to the next stage (do not abort the pipeline).

### Stage 1: Targeting Report

```
node devtools/persona-targeting.mjs
```

Always runs. Print output to stdout. This is informational only.

### Stage 2: Generate (optional)

```
node devtools/persona-targeting.mjs --execute --count {N}
```

Only runs if `--generate-count N` is passed and N > 0. Default is 0 (skip).

### Stage 3: Orchestrate (analyze + plan)

```
node devtools/persona-orchestrator.mjs --once
```

Always runs. This processes any new personas in Uncompleted/.

### Stage 4: Synthesize

```
node devtools/persona-batch-synthesizer.mjs
```

Always runs. Aggregates all reports into saturation.json.

### Stage 5: Build Receipt

```
node devtools/persona-build-receipt.mjs
```

Always runs. Records what was built since last commit.

### Stage 6: Regression Guard (optional)

```
node devtools/persona-regression-guard.mjs --smart --dry-run
```

Only runs if `--skip-rescore` is NOT passed. Uses `--smart` mode by default. Uses `--dry-run` unless `--rescore-live` is explicitly passed.

If `--rescore-live` is passed, run without `--dry-run`:

```
node devtools/persona-regression-guard.mjs --smart
```

## Output Format

Print a header before each stage and a status after:

```
================================================================
[1/6] TARGETING REPORT
================================================================
... (output from persona-targeting.mjs) ...
[OK] Targeting complete.

================================================================
[2/6] GENERATE PERSONAS (skipped: --generate-count not set)
================================================================

================================================================
[3/6] ORCHESTRATE (analyze + plan)
================================================================
... (output from persona-orchestrator.mjs) ...
[OK] Orchestration complete.

... etc ...

================================================================
PIPELINE COMPLETE
================================================================
Stages run: 5/6
Stages skipped: 1 (generate)
Stages failed: 0
Duration: 45s
```

## Implementation

```js
#!/usr/bin/env node

import { execSync } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

function parseArgs(argv) {
  const opts = {
    skipGenerate: true, // default: skip generation
    skipRescore: false,
    generateCount: 0,
    rescoreLive: false,
    dryRun: false,
  }

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--skip-generate') opts.skipGenerate = true
    else if (arg === '--skip-rescore') opts.skipRescore = true
    else if (arg === '--generate-count' && argv[i + 1]) {
      opts.generateCount = parseInt(argv[++i], 10) || 0
      if (opts.generateCount > 0) opts.skipGenerate = false
    } else if (arg === '--rescore-live') opts.rescoreLive = true
    else if (arg === '--dry-run') opts.dryRun = true
  }

  return opts
}

function header(step, total, title) {
  console.log('')
  console.log('================================================================')
  console.log(`[${step}/${total}] ${title}`)
  console.log('================================================================')
}

function runStage(command, opts) {
  if (opts.dryRun) {
    console.log(`[dry-run] Would run: ${command}`)
    return { ok: true, skipped: false }
  }

  try {
    execSync(command, { stdio: 'inherit', cwd: ROOT, timeout: 600000 })
    return { ok: true, skipped: false }
  } catch (err) {
    console.error(`[FAILED] ${err.message}`)
    return { ok: false, skipped: false }
  }
}

function main() {
  const opts = parseArgs(process.argv)
  const startTime = Date.now()
  const TOTAL = 6
  let ran = 0
  let skipped = 0
  let failed = 0

  // Stage 1: Targeting
  header(1, TOTAL, 'TARGETING REPORT')
  const s1 = runStage('node devtools/persona-targeting.mjs', opts)
  if (s1.ok) {
    ran++
    console.log('[OK] Targeting complete.')
  } else {
    failed++
    ran++
  }

  // Stage 2: Generate
  header(2, TOTAL, 'GENERATE PERSONAS')
  if (opts.skipGenerate || opts.generateCount <= 0) {
    console.log('(skipped: --generate-count not set)')
    skipped++
  } else {
    const s2 = runStage(
      `node devtools/persona-targeting.mjs --execute --count ${opts.generateCount}`,
      opts
    )
    if (s2.ok) {
      ran++
      console.log('[OK] Generation complete.')
    } else {
      failed++
      ran++
    }
  }

  // Stage 3: Orchestrate
  header(3, TOTAL, 'ORCHESTRATE (analyze + plan)')
  const s3 = runStage('node devtools/persona-orchestrator.mjs --once', opts)
  if (s3.ok) {
    ran++
    console.log('[OK] Orchestration complete.')
  } else {
    failed++
    ran++
  }

  // Stage 4: Synthesize
  header(4, TOTAL, 'SYNTHESIZE')
  const s4 = runStage('node devtools/persona-batch-synthesizer.mjs', opts)
  if (s4.ok) {
    ran++
    console.log('[OK] Synthesis complete.')
  } else {
    failed++
    ran++
  }

  // Stage 5: Build Receipt
  header(5, TOTAL, 'BUILD RECEIPT')
  const s5 = runStage('node devtools/persona-build-receipt.mjs', opts)
  if (s5.ok) {
    ran++
    console.log('[OK] Build receipt generated.')
  } else {
    failed++
    ran++
  }

  // Stage 6: Regression Guard
  header(6, TOTAL, 'REGRESSION GUARD')
  if (opts.skipRescore) {
    console.log('(skipped: --skip-rescore)')
    skipped++
  } else {
    const rescoreCmd = opts.rescoreLive
      ? 'node devtools/persona-regression-guard.mjs --smart'
      : 'node devtools/persona-regression-guard.mjs --smart --dry-run'
    const s6 = runStage(rescoreCmd, opts)
    if (s6.ok) {
      ran++
      console.log('[OK] Regression guard complete.')
    } else {
      failed++
      ran++
    }
  }

  // Summary
  const duration = Math.round((Date.now() - startTime) / 1000)
  console.log('')
  console.log('================================================================')
  console.log('PIPELINE COMPLETE')
  console.log('================================================================')
  console.log(`Stages run: ${ran}/${TOTAL}`)
  console.log(`Stages skipped: ${skipped}`)
  console.log(`Stages failed: ${failed}`)
  console.log(`Duration: ${duration}s`)

  process.exit(failed > 0 ? 1 : 0)
}

main()
```

## IMPORTANT

Copy the implementation above EXACTLY. Do not modify it, do not add features, do not refactor it. Write it to `devtools/persona-pipeline-full.mjs` as-is.

## Testing

After creating the file, run:

```
node devtools/persona-pipeline-full.mjs --dry-run
```

Should print all 6 stage headers with `[dry-run] Would run:` for each command.

## Do NOT

- Modify any existing file
- Add npm dependencies
- Import from any other devtools script
- Add error recovery beyond what is specified (log error, continue to next stage)
- Change the stage order
