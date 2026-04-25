# Codex Morning Review Script

> One script that summarizes what Codex built overnight so the developer can review in 2 minutes.

## Problem

Developer submits Codex tasks before bed. Codex creates branches. Developer wakes up and needs to know: what got built, does it typecheck, how big are the changes, which branches are ready to merge.

Currently this requires manually checking each branch. Needs a single command.

## What to Build

One file: `devtools/codex-review.mjs`

## What It Does

1. Lists all local and remote branches matching `codex/*`
2. For each branch, compares it to `main`:
   - Files changed (count + list)
   - Lines added/removed
   - Commit messages
   - Runs `npx tsc --noEmit --skipLibCheck` on the branch (via temporary worktree)
   - Reports pass/fail
3. Cross-references against `system/codex-queue/` to match branches to original wish items
4. Generates a summary report at `system/codex-review.md`
5. Prints a compact summary to stdout

## Output Format

### stdout (compact)

```
=== Codex Overnight Review ===

  codex/fix-root-page-500         +42 -8   3 files   tsc: PASS   ready
  codex/finish-ticketed-checkout  +187 -23  12 files  tsc: FAIL   needs work
  codex/add-receipt-upload        +95 -4    7 files   tsc: PASS   ready

2/3 branches ready to merge.
Full report: system/codex-review.md
```

### system/codex-review.md (detailed)

```markdown
# Codex Review - 2026-04-25

## codex/fix-root-page-500

- Status: PASS
- Origin: system/codex-queue/fix-root-page-500.md
- Files changed: 3
- Lines: +42 -8
- Commits:
  - abc1234 fix: resolve null reference in public page hero section
- Changed files:
  - app/(public)/page.tsx
  - components/public/hero-section.tsx
  - lib/public/featured-chefs.ts
- Typecheck: passed

## codex/finish-ticketed-checkout

- Status: FAIL
- Origin: system/codex-queue/finish-ticketed-checkout.md
- Files changed: 12
- Lines: +187 -23
- Commits:
  - def5678 feat: add ticket checkout flow
  - ghi9012 fix: stripe integration for tickets
- Typecheck errors:
  - app/(chef)/events/[id]/tickets/page.tsx(34,5): error TS2345: ...
  - lib/events/ticket-actions.ts(12,10): error TS2304: ...
```

## CLI Interface

```
node devtools/codex-review.mjs                  # review all codex/* branches
node devtools/codex-review.mjs --branch codex/fix-root-page-500  # review one branch
node devtools/codex-review.mjs --no-typecheck   # skip tsc (faster, less info)
```

## Implementation

### Branch Discovery

```js
// Get all codex/* branches (local + remote)
const local = await git(['branch', '--list', 'codex/*', '--format=%(refname:short)'])
const remote = await git(['branch', '-r', '--list', 'origin/codex/*', '--format=%(refname:short)'])
```

### Per-Branch Analysis

For each branch:

```js
// Diff stats against main
const diffStat = await git(['diff', '--stat', 'main...' + branch])
const diffNameOnly = await git(['diff', '--name-only', 'main...' + branch])
const log = await git(['log', '--oneline', 'main..' + branch])
```

### Typecheck via Worktree

For typecheck, create a temporary git worktree, run tsc, capture output, remove worktree:

```js
const worktreePath = join(ROOT, `.worktree-review-${slug}`)
await git(['worktree', 'add', worktreePath, branch])
try {
  const result = await runCommand(`npx tsc --noEmit --skipLibCheck`, {
    cwd: worktreePath,
    timeout: 120000,
  })
  // capture result.code and result.stderr for errors
} finally {
  await git(['worktree', 'remove', worktreePath, '--force'])
}
```

**Important:** Do NOT run `npm install` in the worktree. It shares node_modules with the main repo via the worktree mechanism. Just run tsc directly.

### Cross-Reference with Codex Queue

```js
// Match branch name to spec file
const slug = branch.replace('codex/', '').replace('origin/codex/', '')
const specFile = join(ROOT, 'system', 'codex-queue', `${slug}.md`)
const hasSpec = existsSync(specFile)
```

### Verdict Logic

- `PASS` = tsc exits 0, no files outside declared scope
- `FAIL` = tsc errors or files modified outside scope
- `WARN` = tsc passes but scope violations detected
- `ready` = PASS
- `needs work` = FAIL or WARN

## Helpers to Reuse

Copy from `devtools/hope/hope.mjs`:

- `git()` function (lines 136-148)
- `runCommand()` function (lines 398-429)
- `stopProcessTree()` function (lines 381-396)

## What This Does NOT Do

- Does not merge any branches (that's the developer's decision)
- Does not delete branches
- Does not modify product code
- Does not submit new Codex tasks
- Does not run `npm run build` (too slow; tsc is sufficient for review)

## Validation

1. Create a test branch: `git checkout -b codex/test-review main && git checkout main`
2. Run `node devtools/codex-review.mjs` and verify it finds the test branch
3. Verify `system/codex-review.md` is generated with correct format
4. Run with `--no-typecheck` and verify it skips tsc
5. Clean up: `git branch -d codex/test-review`
6. No product code modified
