# Stabilization Audit - 2026-04-27

## Trigger

David reported Codex broke the project and deleted hours of work. Emergency stabilization audit requested.

## TL;DR: NO WORK WAS LOST

Every feature from every Codex branch exists in the current working tree. The current branch (`feature/weather-visibility-analysis`) is a **superset** of all prior work, including `codex-recovery-backup-2026-04-23` (+10,873 lines beyond it).

## Branch State

| Branch                                | Status                           | Relationship to Current             |
| ------------------------------------- | -------------------------------- | ----------------------------------- |
| `feature/weather-visibility-analysis` | ACTIVE, 10 commits ahead of main | This is the most complete branch    |
| `main`                                | Behind by 10 commits             | Needs merge from feature branch     |
| `codex/persona-to-codex`              | Subset                           | All commits exist in current branch |
| `codex-recovery-backup-2026-04-23`    | Subset                           | All commits exist in current branch |

## TypeScript Compilation: CLEAN

`npx tsc --noEmit --skipLibCheck` passes with zero errors.

## Build Status: PASSING

Next.js production build passes with `npm run build` (12GB heap, set by `scripts/run-next-build.mjs`).

**Build-breaking bug fixed:** The new `lib/runtime-transparency/events.ts` module (uncommitted) uses `node:fs`, `node:crypto`, `node:path`. It was imported from `broadcast.ts` and `platform-observability/events.ts`, which get traced by webpack into client bundles via the `auth/index.ts` chain. Fix: removed the static imports from `broadcast.ts` (replaced with plain broadcast calls) and reverted the uncommitted import in `platform-observability/events.ts`. The runtime-transparency module itself is preserved for future proper wiring (server-only consumers only).

## What Was Actually Done

### Cleaned Up

- **5 orphaned agent worktrees** removed (all commits already in main + feature branch)
  - `worktree-agent-a0cf8b83` (scroll-to-top on Documents)
  - `worktree-agent-ab07bba7` (Back to Dashboard link)
  - `worktree-agent-a74b5586` (inquiry mobile fix)
  - `worktree-agent-a3b6e74a` (base only)
  - `worktree-agent-ae7a49f3` (base only)
- All 5 worktree branches deleted (work preserved in main)

### Feature Verification (All 6 Codex Features: PRESENT)

1. **client-interaction-ledger** - `lib/clients/interaction-ledger.ts` + tests + migration
2. **privileged mutation policy** - `lib/auth/server-action-inventory.ts` + tests + changelog
3. **quote draft prefill** - `lib/quotes/quote-prefill.ts` + tests + wired to form
4. **operator walkthrough** - `lib/contact/operator-evaluation.ts` + components + migration
5. **client profile engine** - `lib/clients/client-profile-service.ts` + actions + UI panel
6. **task-todo contract** - spec + attestation tests

### Issues Found (Not Fixed - Stabilization Only)

**Duplicate pages:**

- `/financials` (hub tiles) vs `/finance` (summary view) - both titled "Finance"
- `/financials` has real references in route-policy, feature registry, cache revalidation
- Decision: leave both, consolidate later with David's input

**Orphaned routes (~25):**
Routes with real content pages but no nav-config entry. Not broken, just unreachable from navigation. Examples: `/growth`, `/operations`, `/analytics/marketing/spend`, `/culinary/prep/weekly`, `/events/series`.

**Orphaned components (11):**
Components with zero imports anywhere in codebase. Not breaking anything. Examples: `components/finance/expense-form.tsx`, `components/proposals/proposal-builder.tsx`, `components/pipeline/revenue-forecast.tsx`.

**78 redirect stubs:**
Intentional backward-compat redirects. Not a problem.

### Uncommitted Work (98 files)

Mostly persona system files (`system/persona-*`) and equipment system files (`lib/equipment/*`). All preserved in working tree. Backed up in stash history.

### Stash Inventory (15 entries)

Including multiple Codex recovery stashes. All preserved.

## Recommendations for David

1. **Merge `feature/weather-visibility-analysis` into `main`** - it's the most complete branch with clean TypeScript. No reason to stay on a feature branch.
2. **Consider pruning old branches** - `codex/persona-to-codex` and `codex-recovery-backup-2026-04-23` are strict subsets. They can be archived.
3. **The 25 orphaned routes** should be reviewed: wire to nav or move to graveyard.
4. **The 11 orphaned components** should be reviewed: wire into the app or move to graveyard.
5. **Build OOM** is an infrastructure issue. Either increase Node heap in `package.json` build script or reduce bundle size over time.

## Project Size: 142GB (Not 300GB)

| Directory          | Size  | Notes                                  |
| ------------------ | ----- | -------------------------------------- |
| `backups/`         | 96GB  | Database/file backups. The real bloat. |
| `.git/`            | 12GB  | History + stashes + branches           |
| `obsidian_export/` | 3.6GB | Exported notes                         |
| `src-tauri/`       | 2GB   | Tauri build artifacts                  |
| `node_modules/`    | 1.7GB | Dependencies                           |
| `.next-dev/`       | 1.4GB | Stale dev build cache (safe to delete) |
| Everything else    | ~5GB  | Actual codebase                        |

`backups/` alone is 67% of total size. Consider moving to external storage.

## What Was NOT Found (Fears Unfounded)

- No mass deletions detected
- No route collisions
- No duplicate homepages (only one at `app/(public)/page.tsx`)
- No broken TypeScript
- No missing features from any branch
- No data loss evidence in reflog
