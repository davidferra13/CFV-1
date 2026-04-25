# Codex Spec: Build Verification Pass

> **Type:** QA. Run checks, fix ONLY build-breaking errors, report results.
> **Risk:** LOW. Only fixes things that prevent compilation.
> **Time:** ~30 minutes.

Read `CLAUDE.md` before starting.

---

## Problem

Multiple Codex agents have added 500+ files without a full build verification. The project typechecks as of last session, but a full `next build` has not been run. We need to know what works and what is broken before building anything new.

---

## What to Do

### Phase 1: Typecheck

```bash
npx tsc --noEmit --skipLibCheck 2>&1
```

If this fails:

- Count the errors
- Categorize: are they in NEW files (from recent Codex work) or EXISTING files?
- Fix type errors ONLY if they are in files that were recently created or modified (timestamp after 2026-04-23)
- Do NOT fix type errors in files that have been stable for weeks

### Phase 2: Build

```bash
npx next build --no-lint 2>&1
```

If this fails:

- Read the full error output
- Identify which files cause the build to fail
- Fix ONLY the minimum changes needed to make the build pass
- Common issues to check:
  - Missing imports (file was deleted or renamed)
  - Missing exports (component renamed but import not updated)
  - Server/client boundary violations ('use server' / 'use client' mismatches)
  - Dynamic import issues

### Phase 3: Migration File Syntax Check

For each migration file in `database/migrations/2026042*.sql` and `database/migrations/2026042*.sql`:

```bash
# Check for basic SQL syntax issues (unmatched parens, missing semicolons)
for f in database/migrations/2026042*.sql database/migrations/2026042*.sql; do
  echo "=== $f ==="
  # Check for IF NOT EXISTS on CREATE TABLE (required for safety)
  grep -c "CREATE TABLE" "$f" && grep -c "IF NOT EXISTS" "$f"
done
```

Flag any CREATE TABLE without IF NOT EXISTS.

### Phase 4: Import Graph Check

Check that all imports in recently created files resolve to real files:

```bash
# Find all new TypeScript files (untracked)
git ls-files --others --exclude-standard '*.ts' '*.tsx' | head -50
```

For each new file, verify its imports point to real files. Focus on:

- `@/lib/*` imports
- `@/components/*` imports
- Relative imports (`./` and `../`)

### Phase 5: Write Report

Create `docs/reports/build-verification-report.md`:

```markdown
# Build Verification Report

Generated: [date]

## Typecheck

- Status: PASS / FAIL
- Error count: [N]
- Errors fixed: [list files and what was fixed]
- Remaining errors: [list if any]

## Build

- Status: PASS / FAIL
- Error count: [N]
- Errors fixed: [list files and what was fixed]
- Remaining errors: [list if any]

## Migration Syntax

- Files checked: [N]
- Issues found: [list]

## Import Resolution

- New files checked: [N]
- Broken imports found: [list file:line -> missing target]

## Summary

- Overall status: GREEN / YELLOW / RED
- GREEN: typecheck + build both pass, no broken imports
- YELLOW: typecheck passes but build fails on fixable issues
- RED: fundamental issues that need architectural decisions

## Files Modified by This Agent

[list every file you changed, with a 1-line description of what you changed]
```

---

## Rules

- Fix ONLY build-breaking errors. Not warnings, not lint issues, not style problems.
- Do NOT add new features or refactor existing code.
- Do NOT modify migration files (the migration audit agent handles those).
- Do NOT run drizzle-kit push or apply migrations.
- Do NOT delete any files.
- If a build error requires an architectural decision (not a simple fix), document it in the report and move on.
- No em dashes anywhere.
- Every file you modify must be listed in the report with what you changed and why.
- If the build already passes with zero changes needed, say so in the report. That is the best outcome.
