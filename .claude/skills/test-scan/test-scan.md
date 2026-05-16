---
name: test-scan
description: Scans all routes and features, cross-references against existing tests, updates docs/test-coverage-blueprint.md. Runs end-of-session or on demand. Reports 3-line summary to context.
triggers:
  - /test-scan
  - end of build session when tests were affected
  - after large feature additions
---

# Test Coverage Scanner

## Purpose

Scan the codebase, map all routes/features to existing tests, update `docs/test-coverage-blueprint.md`, and report a compact summary. Prevents retesting what already passes and surfaces untested gaps.

## Workflow

### 1. Gather Current State

Run these commands (use context-mode batch or bash):

```bash
# All routes by portal
find app -name "page.tsx" | sed 's|/page.tsx||' | sort > /tmp/all-routes.txt

# All test files
find tests -name "*.spec.ts" -o -name "*.test.ts" | grep -v node_modules | sort > /tmp/all-tests.txt

# Routes added since last scan (git)
git diff --name-only $(git log --format=%H --since="last scan date" | tail -1)..HEAD -- "app/**/page.tsx" > /tmp/new-routes.txt

# Tests added since last scan
git diff --name-only $(git log --format=%H --since="last scan date" | tail -1)..HEAD -- "tests/**" > /tmp/new-tests.txt
```

### 2. Cross-Reference

For each route domain (top-level folder under each portal):

- Count routes in that domain
- Search `tests/` for files mentioning that domain (grep filename patterns)
- Classify: COVERED (unit + e2e), PARTIAL (one layer), CRAWL-ONLY (coverage test visits it), UNTESTED

### 3. Detect Gaps

A route has a **critical gap** if:

- It handles money (finance/, invoices/, payments/, billing/) AND has no unit test
- It mutates data (has a server action) AND has no integration test
- It's a lifecycle stage (inquiries/, events/, proposals/) AND has no journey test
- It was added in the last 7 days AND has no test of any kind

### 4. Update Blueprint

Edit `docs/test-coverage-blueprint.md`:

- Update "Last scan" date
- Update Summary counts
- Update Coverage by Portal tables
- Update Critical Gaps section
- Add to Test Run History

### 5. Report (3 lines max to context)

```
Test scan complete. 932 routes, 813 tests.
New since last scan: +X routes, +Y tests.
Critical gaps: [list top 3 untested areas]
```

## Do NOT

- Run actual tests (this is a SCAN, not a test runner)
- Read every test file (match by filename pattern)
- Produce more than 5 lines of output to conversation
- Pollute context with the full route list

## Integration with Build Workflow

When Claude or Codex builds a feature:

1. Feature gets built
2. Agent checks: does this domain appear in the blueprint?
3. If YES: note existing coverage, skip redundant tests
4. If NO: add domain to blueprint with UNTESTED status
5. End of session: `/test-scan` updates everything

## Quick Mode

If invoked with `--quick`:

- Only scan routes added in last 7 days
- Only check if those specific routes have corresponding tests
- Skip full domain rollup
