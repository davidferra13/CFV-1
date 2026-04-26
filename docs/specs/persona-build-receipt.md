# Build Spec: Persona Build Receipt System

> Codex task. New file only. No modifications to existing files.

## What This Does

Creates `devtools/persona-build-receipt.mjs` - a script that generates a structured JSON receipt after features are built. This closes the open loop in the pipeline: right now the pipeline discovers gaps and queues builds, but has no machine-readable record of what was actually built.

## File To Create

`devtools/persona-build-receipt.mjs`

## How It Works

1. Reads `git diff --name-only HEAD~1` to find files changed in the most recent commit
2. Reads `git log -1 --format=%s` to get the commit message
3. Reads the commit hash from `git rev-parse HEAD`
4. Reads ALL gap reports from `docs/stress-tests/persona-*.md` and extracts gap titles
5. Matches changed files against gap `search_hints.grep_terms` from `system/persona-batch-synthesis/saturation.json` to determine which gaps were likely addressed
6. Writes a receipt JSON to `system/build-receipts/{YYYY-MM-DD}-{commit-short-hash}.json`

## CLI Interface

```
node devtools/persona-build-receipt.mjs
node devtools/persona-build-receipt.mjs --commits 3      # last 3 commits instead of 1
node devtools/persona-build-receipt.mjs --dry-run         # print to stdout, don't write file
```

## Receipt JSON Schema

```json
{
  "generated_at": "2026-04-26T12:00:00.000Z",
  "commit_hash": "abc1234",
  "commit_message": "feat(dietary): add cross-contamination matrix",
  "files_changed": [
    "lib/dietary/cross-contamination-check.ts",
    "components/dietary/matrix-view.tsx"
  ],
  "gaps_likely_addressed": [
    {
      "category": "dietary-medical",
      "gap_title": "Develop Cross-Contamination Matrix",
      "from_persona": "Samantha Green",
      "matched_terms": ["cross-contamination", "matrix"],
      "confidence": "high"
    }
  ],
  "gaps_possibly_addressed": [
    {
      "category": "recipe-menu",
      "gap_title": "Insufficient hidden-risk signaling",
      "from_persona": "Rina Solis",
      "matched_terms": ["cross-contact"],
      "confidence": "low"
    }
  ],
  "unmatched_files": ["components/layout/sidebar.tsx"]
}
```

## Matching Logic

For each gap in `saturation.json` -> `categories` -> each category -> `gaps` array:

- Each gap has `search_hints.grep_terms` (array of strings like `"cross-contamination.matrix"`, `"dosing"`)
- Convert each grep*term's dots to regex `[.\-*/\\s]` for flexible matching against file paths and commit messages
- **High confidence**: 2+ grep_terms match against the combined set of (file paths + commit message)
- **Low confidence**: exactly 1 grep_term matches
- **No match**: 0 terms match (goes to `unmatched_files`)

## Implementation Rules

1. This is a NEW standalone file. Do NOT modify any existing files.
2. Use only Node.js built-in modules: `fs`, `path`, `child_process`, `url`
3. Use `execSync` for git commands with `{ encoding: 'utf-8', cwd: ROOT }` where ROOT is resolved from `__dirname` up one level
4. Create `system/build-receipts/` directory if it doesn't exist (use `mkdirSync` with `{ recursive: true }`)
5. The script must work on Windows (use `path.join`, not hardcoded `/`)
6. Do NOT import from any other devtools scripts. This file is 100% self-contained.
7. Read saturation.json with a try/catch - if it doesn't exist, print a warning and exit gracefully with a receipt that has empty gaps arrays
8. Use `#!/usr/bin/env node` shebang
9. The `--commits N` flag changes `HEAD~1` to `HEAD~N` in the git diff command
10. Print the receipt path to stdout as the last line of output (for piping)

## Testing

After implementation, verify by running:

```
node devtools/persona-build-receipt.mjs --dry-run
```

This should print a valid JSON receipt to stdout based on the latest commit.

## Do NOT

- Import from `persona-pipeline-core.mjs` or any other devtools file
- Modify any existing file
- Add npm dependencies
- Read files outside of `docs/stress-tests/`, `system/persona-batch-synthesis/`, and git commands
- Use `console.error` for progress messages (use `process.stderr.write` to keep stdout clean for JSON in dry-run mode)
