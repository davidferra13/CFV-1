# Spec: Saturation Tracking Core

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (5 new files)

## Timeline

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-25 23:00 | Opus session  |        |
| Status: ready | 2026-04-25 23:00 | Opus session  |        |

---

## Developer Notes

### Raw Signal

"How can dev + Anthropic (or other agents) creating cheflowhq.com benefit from saturation tracking? We have saturation tracking with the persona testing, so that we don't repeat our steps and keep doing the same stuff."

### Developer Intent

- **Core goal:** One command produces a dashboard showing what's been covered across specs, audits, tests, and sessions, so agents and developer stop re-covering ground.
- **Key constraints:** Scripts only. Zero product code changes. Zero new dependencies. Must work on Windows (Node.js + git bash).
- **Motivation:** 280 specs, 16 audits, 67 session digests, 535+ conversations. No unified view = circular motion.
- **Success from the developer's perspective:** Run two commands, get a markdown report showing coverage gaps, stale audits, and where effort should go next.

---

## What This Does (Plain English)

Creates Node.js scripts in `devtools/saturation/` that scan existing project artifacts (specs, audits, stress tests, session digests, git history) and produce a saturation report at `saturation-tracking/REPORT.md`. The report shows spec status distribution, audit freshness with decay indicators, persona test coverage, session topic frequency, and a file attention heatmap. A JSON registry at `saturation-tracking/registry.json` stores the raw data for programmatic use.

## Why It Matters

Agents (Codex, Claude Code) frequently re-cover the same ground because there's no unified view of what's done. The developer loses time re-orienting. Saturation tracking gives every agent and the developer a single dashboard to see coverage gaps before planning next work.

---

## Files to Create

| File                                | Description                                   |
| ----------------------------------- | --------------------------------------------- |
| `devtools/saturation/populate.mjs`  | Scans project artifacts, writes registry.json |
| `devtools/saturation/report.mjs`    | Reads registry.json, generates REPORT.md      |
| `devtools/saturation/constants.mjs` | Shared constants (statuses, thresholds, etc.) |
| `saturation-tracking/registry.json` | Generated output: master tracking data (JSON) |
| `saturation-tracking/REPORT.md`     | Generated output: human-readable dashboard    |

## Files to Modify

**NONE.** This spec creates new files only. Do NOT modify any existing files. Do NOT touch package.json.

## Database Changes

**NONE.** No database involvement whatsoever.

---

## Data Model

### registry.json Structure

```json
{
  "generated_at": "2026-04-25T23:00:00.000Z",
  "specs": {
    "total": 0,
    "by_status": {
      "draft": 0,
      "ready": 0,
      "in-progress": 0,
      "built": 0,
      "verified": 0,
      "unknown": 0
    },
    "by_priority": { "P0": 0, "P1": 0, "P2": 0, "P3": 0, "unknown": 0 },
    "items": []
  },
  "audits": {
    "total": 0,
    "fresh": 0,
    "aging": 0,
    "stale": 0,
    "items": []
  },
  "personas": {
    "tested": 0,
    "defined": 0,
    "research_cataloged": 0,
    "unique_gaps": 0,
    "saturation": "unknown"
  },
  "sessions": {
    "total": 0,
    "date_range": { "earliest": null, "latest": null },
    "top_topics": []
  },
  "file_heatmap": []
}
```

Each `specs.items[]` entry:

```json
{ "file": "docs/specs/example.md", "status": "draft", "priority": "P1", "complexity": "medium" }
```

Each `audits.items[]` entry:

```json
{
  "file": "docs/zero-hallucination-audit.md",
  "date": "2026-04-20",
  "files_changed_since": 14,
  "decay": "stale"
}
```

Each `sessions.top_topics[]` entry:

```json
{ "word": "circles", "count": 12 }
```

Each `file_heatmap[]` entry:

```json
{ "file": "app/(chef)/layout.tsx", "commits": 45 }
```

---

## Implementation Details

### constants.mjs

```js
export const SPEC_STATUSES = ['draft', 'ready', 'in-progress', 'built', 'verified']

export const DECAY_THRESHOLDS = {
  fresh: { maxDays: 7, maxChanges: 10 },
  aging: { maxDays: 30, maxChanges: 30 },
  // anything beyond aging thresholds = stale
}

export const SKIP_WORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'over',
  'page',
  'fix',
  'build',
  'spec',
  'update',
  'session',
  'proof',
  'closeout',
  'handoff',
  'agent',
  'codex',
])
```

### populate.mjs

**Imports:** Only `node:fs`, `node:path`, `node:child_process`. Import constants from `./constants.mjs`.

**Main function flow (sequential steps):**

#### Step 1: Scan specs

```
- Read all filenames from docs/specs/ using readdirSync
- Filter to .md files, exclude _TEMPLATE.md and README.md
- For each file:
  - Read first 20 lines using readFileSync (read whole file, split, take first 20)
  - Parse Status: match line against /Status:\s*(.+)/i, trim, lowercase
    - If no match, default to "unknown"
    - Map common variants: "in progress" -> "in-progress"
  - Parse Priority: match line against /Priority:\s*(P\d)/i
    - If no match, default to "unknown"
  - Parse Complexity: match line against /complexity:\s*(\w+)/i
    - If no match, default to "unknown"
  - Push to items array
- Tally by_status and by_priority from items
```

#### Step 2: Scan audits

```
- Read all filenames from docs/ using readdirSync
- Filter to .md files containing "audit" (case-insensitive)
- For each file:
  - Try to extract date from filename: match against /(\d{4}-\d{2}-\d{2})/
  - If no date in filename, get git date:
    execSync('git log -1 --format=%aI -- "docs/<filename>"', { encoding: 'utf-8' })
    Take first 10 chars (YYYY-MM-DD)
  - If we have a date, count files changed since:
    execSync('git log --since="<date>" --name-only --pretty=format:"" -- "app/" "lib/" "components/"', { encoding: 'utf-8' })
    Split by newline, filter empty, deduplicate with Set, count
  - Classify decay:
    - Calculate days since audit: (Date.now() - new Date(date)) / 86400000
    - fresh: days <= 7 AND changes <= 10
    - aging: days <= 30 AND changes <= 30
    - stale: everything else
  - Push to items array
- Count fresh/aging/stale totals
```

#### Step 3: Read persona data

```
- Check if docs/stress-tests/REGISTRY.md exists (existsSync)
- If not, set all persona fields to 0/null and skip
- If yes, read the file
- Parse with regex:
  - Count rows in "Persona Registry" table (lines starting with | that have a # column with a number)
    That count = "defined"
  - Count rows where Score column is NOT "--" and NOT empty = "tested"
  - Count rows in "Research-Only Personas" table = "research_cataloged"
  - Count rows in "Gap Inventory" table = "unique_gaps"
  - Look for line matching /Saturation estimate:\s*\*?\*?(\w+)/i
    If not found, estimate from tested count:
      <3 = "LOW", 3-10 = "MEDIUM", 10-20 = "HIGH", >20 = "SATURATED"
```

#### Step 4: Scan session digests

```
- Check if docs/session-digests/ exists
- If not, set sessions to empty and skip
- Read all filenames using readdirSync, filter to .md (exclude README.md)
- Count total
- Find earliest and latest by sorting filenames (they start with YYYY-MM-DD)
- Extract topic slugs:
  - Match filename against /\d{4}-\d{2}-\d{2}-\d{6}-(.+)\.md/
  - If match, take capture group, split on hyphens
  - For each word, skip if in SKIP_WORDS set or length < 3
  - Increment word count in a Map
- Sort Map entries by count descending, take top 20
```

#### Step 5: File attention heatmap

```
- Run: execSync('git log --since="30 days ago" --name-only --pretty=format:"" -- "app/" "lib/" "components/"', { encoding: 'utf-8' })
- Split by newline, filter empty strings
- Count occurrences of each file path in a Map
- Sort descending by count, take top 20
```

#### Step 6: Write output

```
- Ensure saturation-tracking/ directory exists: mkdirSync('saturation-tracking', { recursive: true })
- Build the registry object matching the schema above
- Write JSON.stringify(registry, null, 2) to saturation-tracking/registry.json
- Print to stdout: "Saturation scan complete. {specs} specs, {audits} audits, {sessions} digests. Written to saturation-tracking/registry.json"
```

**Error handling for ALL git commands:**

```js
function gitExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() }).trim()
  } catch (err) {
    console.warn(`[saturation] git command failed: ${cmd}`)
    return ''
  }
}
```

### report.mjs

**Imports:** Only `node:fs`, `node:path`.

**Main function flow:**

```
- Check if saturation-tracking/registry.json exists
- If not, print "Run populate.mjs first: node devtools/saturation/populate.mjs" and process.exit(1)
- Read and parse registry.json
- Build markdown string (see template below)
- Write to saturation-tracking/REPORT.md
- Print to stdout: "Report written to saturation-tracking/REPORT.md"
```

**REPORT.md template:**

```markdown
# Saturation Report

> Generated: {generated_at}
> Run: `node devtools/saturation/populate.mjs && node devtools/saturation/report.mjs`

---

## Spec Coverage ({total} specs)

| Status      | Count | %      |
| ----------- | ----- | ------ |
| verified    | {n}   | {pct}% |
| built       | {n}   | {pct}% |
| in-progress | {n}   | {pct}% |
| ready       | {n}   | {pct}% |
| draft       | {n}   | {pct}% |
| unknown     | {n}   | {pct}% |

**Completion rate:** {verified_count}/{total} verified ({pct}%)
**Ready to build:** {ready_count} specs waiting for a builder agent

{if ready_count > 20: "Bottleneck: too many specs queued as ready. Prioritize building over speccing."}
{if draft_count > total/2: "Most specs still in draft. Focus on moving drafts to ready, or pruning dead drafts."}

---

## Audit Freshness ({total} audits)

| Audit | Last Run | Changed Files | Decay |
| ----- | -------- | ------------- | ----- |

{for each audit item, one row. Decay column: "fresh", "aging", or "STALE"}

**Fresh:** {fresh_count} | **Aging:** {aging_count} | **Stale:** {stale_count}

{if stale_count > 0: "Action needed: re-run stale audits: {list stale audit filenames}"}

---

## Persona Test Saturation

| Metric               | Value                |
| -------------------- | -------------------- |
| Formally tested      | {tested}             |
| Defined              | {defined}            |
| Research cataloged   | {research_cataloged} |
| Unique gaps found    | {unique_gaps}        |
| **Saturation level** | **{saturation}**     |

{if saturation == "LOW": "Coverage is thin. Run more persona stress tests before shipping."}
{if saturation == "MEDIUM": "Making progress. Prioritize untested persona types (see REGISTRY.md heat map)."}
{if saturation == "HIGH" or "SATURATED": "Good coverage. Shift to depth work on known gaps."}

---

## Session Topic Frequency (from {total} digests)

_Date range: {earliest} to {latest}_

| Topic | Mentions |
| ----- | -------- |

{for each top topic, one row}

{if any topic > 15: "Heavy concentration on '{topic}'. Check if progress is proportional to attention."}

---

## File Attention Heatmap (Last 30 Days)

| File | Commits |
| ---- | ------- |

{for each heatmap entry, one row}

{if any file > 30 commits: "Thrashing risk: {file} has {n} commits in 30 days. Investigate stability."}
{if top file has 3x more commits than #5: "Attention is concentrated. Check if neglected files need review."}

---

## Quick Summary

- **Specs:** {verified}/{total} verified ({pct}%), {ready} ready to build
- **Audits:** {stale_count} stale (need re-run)
- **Personas:** {saturation} saturation ({tested} tested)
- **Sessions:** {total} digests, top topic: {top_topic} ({count})
- **Hottest file:** {top_file} ({commits} commits/30d)
```

**Formatting rules for the generated markdown:**

- Percentages rounded to nearest integer
- No em dashes anywhere (use commas or colons)
- Audit names: strip "docs/" prefix and ".md" extension for readability
- Actionable insights only appear when their condition is true (not as empty placeholders)

---

## Edge Cases and Error Handling

| Scenario                               | Correct Behavior                                     |
| -------------------------------------- | ---------------------------------------------------- |
| No specs found in docs/specs/          | Set specs.total = 0, empty items array, continue     |
| Spec has no Status header              | Default to "unknown"                                 |
| Spec has no Priority header            | Default to "unknown"                                 |
| Audit file has no date in filename     | Use git log date. If git fails too, skip that audit  |
| Git command fails or times out         | Log warning to stderr, return empty string, continue |
| REGISTRY.md does not exist             | Set all persona fields to 0, saturation to "unknown" |
| No session digests directory           | Set sessions.total = 0, empty top_topics, continue   |
| registry.json missing when report runs | Print error message, exit with code 1                |
| A file cannot be read (permissions)    | Log warning, skip that file, continue                |

---

## Verification Steps

Run these in order from project root:

1. `node devtools/saturation/populate.mjs`
   - Must exit 0 (no unhandled errors)
   - Must print a summary line to stdout
2. Verify `saturation-tracking/registry.json` exists and is valid JSON
   - `node -e "JSON.parse(require('fs').readFileSync('saturation-tracking/registry.json','utf-8')); console.log('valid')"`
3. Verify registry has `specs.total > 0` (there are 280+ specs in the project)
4. Verify registry has `audits.total > 0` (there are 16+ audit files)
5. `node devtools/saturation/report.mjs`
   - Must exit 0
   - Must print a confirmation line to stdout
6. Verify `saturation-tracking/REPORT.md` exists and contains all 5 section headers:
   - "Spec Coverage"
   - "Audit Freshness"
   - "Persona Test Saturation"
   - "Session Topic Frequency"
   - "File Attention Heatmap"
7. Verify NO files outside `devtools/saturation/` and `saturation-tracking/` were created or modified
8. Run `npx tsc --noEmit --skipLibCheck` from project root. Must still pass (no product code touched)

---

## Out of Scope

- Modifying ANY existing files (product code, devtools, package.json, CLAUDE.md, etc.)
- Database changes
- UI components or pages
- Integration with wish-to-codex pipeline (future: separate spec)
- Integration with morning briefing (future: separate spec)
- Agent work logging convention (future: separate spec)
- File watchers or real-time tracking
- Installing any npm packages

---

## Notes for Builder Agent

1. **This is scripts-only devtools.** You are NOT building product features. Do NOT import from `@/lib`, `@/components`, or any app source code.
2. **Node.js built-ins only:** `node:fs`, `node:path`, `node:child_process`. No external packages. No `glob`, no `chalk`, no nothing.
3. **ESM modules:** All files are `.mjs`. Use `import`, not `require`.
4. **All file paths relative to project root.** Use `process.cwd()` as base. Use `path.join()` for cross-platform compatibility.
5. **Git commands:** Use `child_process.execSync` wrapped in try/catch. Always pass `{ encoding: 'utf-8', cwd: process.cwd() }`. If git fails, log warning and skip.
6. **Do NOT create test files.** No `__tests__`, no `.test.mjs`, no jest, no vitest.
7. **Do NOT modify package.json.** Commands are run directly: `node devtools/saturation/populate.mjs`.
8. **No em dashes** in any generated output. Use commas, colons, or semicolons.
9. **Directory creation:** `saturation-tracking/` may not exist. Create with `mkdirSync(path, { recursive: true })` before writing.
10. **Reference pattern:** The persona stress test registry at `docs/stress-tests/REGISTRY.md` is the gold standard for saturation tracking in this project. The skill definition at `.claude/skills/persona-stress-test/SKILL.md` (lines 330-370) defines the saturation thresholds.
11. **Windows compatibility:** Use `path.join()` for all paths. Do NOT hardcode forward or back slashes. Git commands work fine in the Windows bash shell.
12. **Keep it simple.** No classes, no frameworks, no over-engineering. Plain functions. Readable code. A junior dev should understand every line.
