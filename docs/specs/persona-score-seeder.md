# Build Spec: Score History Seeder

> Codex task. Create ONE new file. No modifications to existing files.

## What This Does

Creates `devtools/persona-score-seeder.mjs` - reads all existing stress test reports from `docs/stress-tests/`, extracts scores, and writes them to `system/persona-batch-synthesis/score-history.json`. This seeds the regression guard's baseline data WITHOUT running Ollama. Zero cost.

## File To Create

`devtools/persona-score-seeder.mjs`

## CLI Interface

```
node devtools/persona-score-seeder.mjs              # seed from all reports
node devtools/persona-score-seeder.mjs --dry-run    # print what would be written
node devtools/persona-score-seeder.mjs --force      # overwrite existing history
```

## Algorithm

### Step 1: Check Existing History

Read `system/persona-batch-synthesis/score-history.json` if it exists.

- If it exists and `--force` is NOT passed: print "Score history already exists with N entries. Use --force to overwrite." and exit 0.
- If it exists and `--force` IS passed: proceed (will overwrite).
- If it doesn't exist: proceed.

### Step 2: Scan Reports

Read all files matching `docs/stress-tests/persona-*.md`. For each file:

1. Parse the filename: `persona-{slug}-{YYYY-MM-DD}.md`
   - Regex: `/^persona-(.+)-(\d{4}-\d{2}-\d{2})\.md$/`
   - Extract `slug` and `date`
2. Read the file content
3. Extract score using this pattern (same as persona-batch-synthesizer.mjs):
   ```js
   function extractScore(text) {
     // Pattern 1: ## Score: N/100
     const m1 = /##\s*(?:\d+\)\s*)?Score[:\s]*\**(\d+)\s*\/\s*100\**/i.exec(text)
     if (m1) return parseInt(m1[1], 10)
     // Pattern 2: **N / 100** or **N/100**
     const m2 = /\*\*(\d+)\s*\/\s*100\*\*/i.exec(text)
     if (m2) return parseInt(m2[1], 10)
     return null
   }
   ```
4. If score is null, skip with a warning

### Step 3: Build History Array

Create an array of objects:

```json
[
  { "slug": "kai-donovan", "date": "2026-04-25", "score": 35 },
  { "slug": "leo-varga", "date": "2026-04-25", "score": 68 },
  ...
]
```

Sort by date ascending, then slug ascending.

### Step 4: Write Output

If `--dry-run`:

- Print the array as formatted JSON to stdout
- Print summary to stderr: "Would write N entries for N personas"

Otherwise:

- Create directory `system/persona-batch-synthesis/` if needed
- Write `score-history.json` with the array
- Print to stderr: "Seeded score history with N entries for N personas"

## Output Format (stderr)

```
[score-seeder] Scanning docs/stress-tests/...
[score-seeder] Found 19 reports
[score-seeder]   kai-donovan (2026-04-25): 35/100
[score-seeder]   leo-varga (2026-04-25): 68/100
[score-seeder]   000-wp1-reliability-test-chef (2026-04-26): 0/100
...
[score-seeder] Seeded score history with 19 entries for 19 personas.
```

## Implementation Rules

1. This is a NEW standalone file. Do NOT modify any existing files.
2. Use only Node.js built-in modules: `fs`, `path`, `url`
3. ROOT is resolved from `__dirname` up one level
4. Use `#!/usr/bin/env node` shebang
5. Progress output goes to stderr. In dry-run mode, JSON goes to stdout.
6. If no reports found, print "No stress test reports found in docs/stress-tests/" and exit 1
7. If a report has no extractable score, print a warning and skip it (do not exit)
8. Do NOT call any Ollama API or run any child processes. This script reads files only.

## Do NOT

- Import from any other devtools script
- Modify any existing file
- Add npm dependencies
- Call Ollama or any external API
- Run child processes
- Touch any file outside `docs/stress-tests/` (read) and `system/persona-batch-synthesis/score-history.json` (write)
