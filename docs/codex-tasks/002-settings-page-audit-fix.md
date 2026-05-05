# CODEX TASK: settings-page-audit-fix

## Objective

Audit all 54 settings pages for broken links, dead buttons, missing error states, and non-functional UI elements. Fix everything found. This is a polish pass, not a feature build.

## Branch

codex/settings-page-audit-fix

## Context

ChefFlow has 54 configuration pages under `/settings`. Some were built rapidly and may have: buttons that do nothing (no-op onClick), forms that don't save, links to non-existent routes, missing loading states, missing error toasts, or stale labels. The Zero Hallucination Rule (CLAUDE.md) requires that every button does something and every failure is visible.

## Files You May INSPECT (read-only)

- `app/(chef)/settings/` (all settings pages)
- `components/settings/` (settings components)
- `lib/*/` (any lib module for understanding server actions)
- `CLAUDE.md` (project rules)

## Files You May MODIFY

- `app/(chef)/settings/**/*.tsx` (any settings page)
- `components/settings/**/*.tsx` (any settings component)
- Any server action file referenced by settings pages (to fix broken handlers)

## Files You Must NOT Touch

- `middleware.ts`
- `lib/auth/auth-config.ts`
- `lib/db/schema/schema.ts`
- `database/migrations/*`
- `app/layout.tsx`
- `CLAUDE.md`

## Requirements

1. Navigate every settings route. For each one, verify:
   - The page renders without error
   - All buttons have real onClick handlers (no no-ops)
   - All forms call a server action and show success/error feedback
   - All links go to real routes
   - Loading states exist for async operations
   - Error states show real error messages (not `$0.00` or empty arrays)

2. Fix any issues found directly. Do not just report them.

3. If a settings page references a server action that does not exist, create a minimal server action that returns `{ error: "Not yet implemented" }` with a toast. Do NOT create a fake success response.

4. Count and report: pages checked, issues found, issues fixed.

## Constraints

- No em dashes
- No OpenClaw in user-visible strings
- Do not add new features; only fix broken existing UI
- Do not delete any settings pages
- Follow existing toast/feedback patterns (search for `sonner` or `toast` usage)

## Expected Output

- All 54 settings pages render without errors
- No no-op buttons remain
- No dead links remain
- All forms provide feedback on submit

## Verification Commands

```bash
npx tsc --noEmit --skipLibCheck
git status --short
```

## Success Criteria

- [ ] tsc passes
- [ ] Report includes count of pages checked and issues fixed
- [ ] No no-op buttons in settings pages
- [ ] All forms have success/error feedback
- [ ] git status is clean

## Rollback

```bash
git checkout main
git branch -D codex/settings-page-audit-fix
```

## Report Format

When complete, output:

- Branch name and commit hash
- Pages audited: X/54
- Issues found: X
- Issues fixed: X
- Issues deferred (with reason): X
- tsc result
