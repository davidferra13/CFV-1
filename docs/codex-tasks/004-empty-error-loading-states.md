# CODEX TASK: empty-error-loading-states

## Objective

Audit all page-level data-fetching components under `app/(chef)/` for missing empty states, error states, and loading states. Add them where missing. This is the single biggest UX polish gap.

## Branch

codex/empty-error-loading-states

## Context

Many pages fetch data and render lists or cards. When the fetch returns empty, errors, or is in-flight, users should see appropriate feedback. The Zero Hallucination Rule (CLAUDE.md) requires: failed loads show error states (not `$0.00` or empty arrays), and non-functional features never appear functional.

## Files You May INSPECT (read-only)

- `app/(chef)/**/page.tsx` (all chef pages)
- `components/` (existing component patterns)
- `CLAUDE.md` (project rules)

## Files You May MODIFY

- `app/(chef)/**/page.tsx` (add missing states)
- `app/(chef)/**/_components/*.tsx` (add missing states to page-level components)
- `components/ui/empty-state.tsx` (if it exists, reuse it; if not, create ONE shared component)

## Files You Must NOT Touch

- `middleware.ts`
- `lib/auth/`
- `lib/db/schema/`
- `database/migrations/`
- `app/layout.tsx`
- `CLAUDE.md`
- Server action files (do not change data fetching logic)

## Requirements

1. Scan every `page.tsx` under `app/(chef)/`. For each page that fetches data:
   - **Empty state:** If data array is empty, show a helpful message (not a blank page). Use an icon + text + optional action button pattern.
   - **Error state:** If the fetch fails or returns an error, show an error message with a retry option. Never show `$0.00` or an empty table on error.
   - **Loading state:** If using Suspense or startTransition, ensure a loading.tsx or Skeleton exists. If the page uses server-side data fetching only (no client fetch), loading state may not be needed.

2. Reuse existing empty/error state components if they exist. Search for `empty-state`, `no-data`, `error-boundary` in the codebase first.

3. Keep messages concise and professional. Examples:
   - Empty: "No events yet. Create your first event to get started."
   - Error: "Could not load events. Please try again."
   - Do NOT use emojis.

4. Count: pages checked, missing states found, states added.

## Constraints

- No em dashes in any strings
- No OpenClaw in user-visible strings
- Do not change data fetching logic; only add UI states around existing data
- Do not add features; only add missing feedback states
- Prioritize the 6 pillar routes: events, quotes/proposals, recipes, clients, invoices/finance, calendar

## Expected Output

- All pillar routes have empty, error, and loading states
- Additional routes fixed as time permits
- One shared empty-state component if none exists

## Verification Commands

```bash
npx tsc --noEmit --skipLibCheck
git status --short
```

## Success Criteria

- [ ] tsc passes
- [ ] 6 pillar routes all have empty + error states
- [ ] Report includes count of pages checked and states added
- [ ] No blank pages on empty data
- [ ] git status is clean

## Rollback

```bash
git checkout main
git branch -D codex/empty-error-loading-states
```

## Report Format

When complete, output:

- Branch name and commit hash
- Pages audited: X
- Missing states found: X
- States added: X
- Pillar coverage: events/quotes/recipes/clients/finance/calendar (Y/N each)
- tsc result
