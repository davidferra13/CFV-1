# Build Spec: Codex Prompt Generator

> Codex task. Create ONE new file. No modifications to existing files.

## What This Does

Creates `devtools/persona-codex-prompter.mjs` - reads the prioritized build plans from `system/persona-batch-synthesis/build-*.md` and `system/persona-batch-synthesis/priority-queue.json`, then generates scoped, Codex-safe prompts for each build plan. Outputs them to `system/codex-prompts/`.

This automates the manual work of reading build plans and writing Codex handoff prompts.

## File To Create

`devtools/persona-codex-prompter.mjs`

## CLI Interface

```
node devtools/persona-codex-prompter.mjs                    # generate prompts for top 5 by priority
node devtools/persona-codex-prompter.mjs --top 3            # top 3 only
node devtools/persona-codex-prompter.mjs --category recipe-menu  # specific category
node devtools/persona-codex-prompter.mjs --all              # all categories
node devtools/persona-codex-prompter.mjs --dry-run          # print to stdout, don't write files
```

## Algorithm

### Step 1: Load Priority Data

Read `system/persona-batch-synthesis/priority-queue.json`. This is a JSON file with a `queue` array of gap objects. Each has: `title`, `from`, `from_name`, `severity`, `description`, `search_hints`, `likely_built`, `category`, `personas`, `priority_score`.

Also read `system/persona-batch-synthesis/saturation.json` to get `priority_ranking` (array of `{ category, priority_score, count, avg_severity }`).

### Step 2: Select Categories

Based on CLI flags, select which categories to generate prompts for:

- Default: top 5 from `priority_ranking` (excluding `uncategorized`)
- `--top N`: top N categories
- `--category X`: only category X
- `--all`: all categories with count > 0

### Step 3: For Each Category, Load Build Plan

Read `system/persona-batch-synthesis/build-{category}.md`. Parse out:

- The "Individual Gaps" section (numbered list of gaps with search hints)
- The "Existing Build Tasks" section (list of file paths)
- The "Acceptance Criteria" section

### Step 4: Search Codebase for Relevant Files

For each gap's search hints (`grep_terms`), do a simple recursive file search in `lib/`, `app/`, `components/` to find files that might be relevant. Use the same `quickGrep` pattern used in the orchestrator:

```js
function quickGrep(pattern, dirs, maxResults) {
  const results = []
  function walk(dir) {
    if (results.length >= maxResults) return
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (results.length >= maxResults) return
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (['node_modules', '.next', '.git', 'system', 'docs'].includes(entry.name)) continue
        walk(full)
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        try {
          const content = readFileSync(full, 'utf8')
          if (pattern.test(content)) {
            results.push(relative(ROOT, full).replace(/\\/g, '/'))
          }
        } catch {}
      }
    }
  }
  for (const d of dirs) {
    const absDir = join(ROOT, d)
    if (existsSync(absDir)) walk(absDir)
  }
  return results
}
```

For each gap, build a regex from the first 3 grep_terms (join with `|`) and search. Collect up to 5 matching files per gap.

### Step 5: Generate Prompt

For each category, generate a prompt file using this EXACT template:

```
# Codex Prompt: {Category Label}
# Priority: {rank} of {total} | Severity: {avg_severity} | Personas: {count}
# Generated: {ISO date}

## Prompt (copy-paste to Codex)

---

Read the build plan at system/persona-batch-synthesis/build-{category}.md for full context.

You are fixing gaps in ChefFlow (a Next.js chef operations platform) for the "{Category Label}" category.

### Gaps to Address (in priority order)

{For each gap, numbered:}
{N}. **{gap.title}** (from {gap.from_name}, {gap.severity})
   {gap.description}
   Relevant files: {comma-separated list of found files, or "search needed" if none found}

### Constraints

- Only modify files in lib/, app/, components/, or types/
- Do NOT modify database migrations, schema files, or drizzle config
- Do NOT modify any devtools/ scripts
- Do NOT modify CLAUDE.md or any docs/ files
- Do NOT add new npm dependencies
- All monetary values are in cents (integers)
- All new server actions need: auth gate, tenant scoping, input validation, error propagation
- Use existing patterns from nearby files as reference
- If a gap requires database changes, SKIP IT and note it in a comment at the top of the file

### Files You May Need

{Deduplicated list of all relevant files found across all gaps}

### Existing Build Tasks (reference only)

{List of existing task file paths from the build plan, or "None"}

### Testing

After implementation, verify with:
- npx tsc --noEmit --skipLibCheck (must pass)
- Manually check that modified files still export correctly

---

## Acceptance Criteria

{Numbered list from build plan}
```

### Step 6: Write Output

Write each prompt to `system/codex-prompts/{category}.md`.

Also write an index file `system/codex-prompts/INDEX.md`:

```
# Codex Prompt Queue
Generated: {date}

| # | Category | Priority | Gaps | Prompt |
|---|----------|----------|------|--------|
| 1 | Recipe Menu | 27 | 9 | [recipe-menu.md](recipe-menu.md) |
| 2 | Dosing Cannabis | 21 | 7 | [dosing-cannabis.md](dosing-cannabis.md) |
...
```

## Implementation Rules

1. This is a NEW standalone file. Do NOT modify any existing files.
2. Use only Node.js built-in modules: `fs`, `path`, `url`
3. ROOT is resolved from `__dirname` up one level
4. Create `system/codex-prompts/` directory if it doesn't exist
5. Use `#!/usr/bin/env node` shebang
6. If priority-queue.json doesn't exist, print error and exit 1
7. If a build plan file doesn't exist for a category, skip it with a warning
8. The quickGrep timeout should be reasonable - limit to 5 results per gap, stop walking after 500 files total
9. Print progress to stderr, keep stdout clean
10. Category label is derived by replacing hyphens with spaces and title-casing: `recipe-menu` -> `Recipe Menu`

## Do NOT

- Import from any other devtools script
- Modify any existing file
- Add npm dependencies
- Run any shell commands or child processes
- Read files outside of `system/`, `lib/`, `app/`, `components/`, `types/`
