# ChefFlow V1 - Unification Plan

Generated: 2026-03-26

## Target State

After execution:

- **One directory:** `C:\Users\david\Documents\CFv1`
- **One command:** `npm run dev` (port 3100)
- **One deployment:** `git push` to GitHub, then direct deploy from CFv1 (no rsync copies)
- **One instruction file:** `CLAUDE.md` (simplified)
- **All features visible** in the UI through unified navigation
- **No abandoned scaffolds, temp files, or duplicate directories**

## Decisions (Final, Non-Negotiable)

| Decision                         | Choice                          | Rationale                                                                      |
| -------------------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| Canonical directory              | `CFv1`                          | Only directory with active git repo                                            |
| Beta/prod directories            | **DELETE**                      | Redundant copies, zero users, no value                                         |
| CFv1-refine                      | **DELETE**                      | Stale (Mar 21), nav work can be cherry-picked if needed                        |
| CFv1-openclaw-\*                 | **DELETE**                      | Abandoned experiment                                                           |
| CFv1-archive                     | **DELETE**                      | 556KB of old docs, git history preserves everything                            |
| CFv1.7z                          | **DELETE**                      | Archive of unknown vintage                                                     |
| src-tauri/                       | **DELETE**                      | 2.6GB Rust build for unused desktop wrapper                                    |
| android/, ios/                   | **DELETE**                      | Unused Capacitor scaffolds                                                     |
| pages/                           | **DELETE**                      | Legacy Pages Router (3 files, app uses App Router)                             |
| worker/                          | **DELETE**                      | Unused edge worker scaffold                                                    |
| messages/, i18n/                 | **DELETE**                      | Unused i18n (English-only app)                                                 |
| plans/                           | **MOVE** to docs/archive/plans/ | Historical planning, may have reference value                                  |
| Heap snapshot                    | **DELETE**                      | 5.1GB one-time debug artifact                                                  |
| .next-dev-pw-\*                  | **DELETE**                      | 31 stale Playwright temp dirs                                                  |
| tmp\__._                         | **DELETE**                      | 66 stale temp files                                                            |
| backup-\*.sql                    | **DELETE**                      | Old DB backups in root (git has history)                                       |
| Build/dev/tsc logs               | **DELETE**                      | Stale artifacts                                                                |
| mission-control.log              | **DELETE**                      | 79MB stale log                                                                 |
| AGENTS.md                        | **DELETE**                      | Redundant with CLAUDE.md                                                       |
| Multi-env scripts                | **DELETE**                      | deploy-beta.sh, deploy-prod.sh, rollback-\*.sh, start-beta.ps1, start-prod.ps1 |
| .env.local.beta, .env.local.prod | **DELETE**                      | No separate environments                                                       |
| Supabase SDK                     | **REMOVE** from package.json    | Only used in 2 non-production files, replace with postgres.js                  |
| Cloudflare Tunnels               | **KEEP for now**                | Single tunnel for app.cheflowhq.com pointing to :3100                          |

## Execution Plan

### Phase A: Kill Satellite Directories (~30GB freed)

These directories are outside CFv1 and can be deleted without affecting the running app.

```
DELETE: C:\Users\david\Documents\CFv1-beta\
DELETE: C:\Users\david\Documents\CFv1-prod\
DELETE: C:\Users\david\Documents\CFv1-refine\
DELETE: C:\Users\david\Documents\CFv1-openclaw-clone\
DELETE: C:\Users\david\Documents\CFv1-openclaw-sandbox\
DELETE: C:\Users\david\Documents\CFv1-archive\
DELETE: C:\Users\david\Documents\CFv1.7z
```

Stop the beta (port 3200) and prod (port 3300) Node processes first.

### Phase B: Clean CFv1 Artifacts (~8GB freed)

Remove build artifacts, temp files, and debug snapshots inside CFv1.

```
DELETE: src-tauri/            (2.6GB Rust build cache)
DELETE: android/              (408KB unused Capacitor)
DELETE: ios/                  (302KB unused Capacitor)
DELETE: pages/                (3KB legacy Pages Router)
DELETE: worker/               (8KB unused edge worker)
DELETE: messages/             (32KB unused i18n)
DELETE: i18n/                 (4KB unused i18n)
DELETE: Heap.*.heapsnapshot   (5.1GB debug artifact)
DELETE: mission-control.log   (79MB stale log)
DELETE: chefflow-watchdog.log (556KB stale log)
DELETE: .next-dev-pw-*        (31 stale Playwright temp dirs)
DELETE: tmp_*.*               (66 stale temp files)
DELETE: backup-*.sql          (9 old DB backups)
DELETE: build-*.log, dev-*.log, tsc-*.log (stale build logs)
```

### Phase C: Remove Multi-Environment Infrastructure

**Delete these files:**

```
DELETE: scripts/deploy-beta.sh
DELETE: scripts/rollback-beta.sh
DELETE: scripts/start-beta.ps1
DELETE: scripts/deploy-prod.sh
DELETE: scripts/rollback-prod.sh
DELETE: scripts/start-prod.ps1
DELETE: .env.local.beta
DELETE: .env.local.prod
DELETE: AGENTS.md
```

**Move historical plans:**

```
MOVE: plans/* -> docs/archive/plans/
DELETE: plans/
```

### Phase D: Simplify CLAUDE.md

Rewrite CLAUDE.md to reflect reality:

- Remove all 3-environment architecture sections
- Remove multi-agent mode section
- Remove deploy-beta / deploy-prod / rollback references
- Remove "ship it" chain (no beta/prod deploy steps)
- Remove beta/prod from key file locations table
- Remove all em-dashes (106 instances)
- Fix references to non-existent files
- Keep: data safety, zero hallucination, implementation patterns, architecture, AI policy
- Add: "Single environment. One command: npm run dev. Deploy: git push + rebuild."

### Phase E: Fix Memory System

- Delete phantom references from MEMORY.md index
- Update to match files that actually exist
- Or: reset MEMORY.md to a clean slate matching current reality

### Phase F: Remove Supabase SDK

- Remove `@supabase/supabase-js` from package.json
- Rewrite `scripts/lib/db.mjs` to use postgres.js directly (already the pattern everywhere else)
- Delete or rewrite `tests/e2e/client_rls_negative.spec.ts` to not depend on Supabase client

### Phase G: Deployment Simplification

**New deployment model:**

- Development: `npm run dev` on port 3100 (unchanged)
- Production: `npm run build && npm start` on port 3100 (or any port)
- External access: Single Cloudflare Tunnel to port 3100 for app.cheflowhq.com
- No separate directories, no rsync, no build-swap scripts

**New "ship it" sequence:**

1. `git add` + `git commit` + `git push`
2. `npm run build` (in place)
3. Restart with `npm start` if serving production build
4. Done.

### Phase H: Feature Surface Verification (Separate Task)

This is a large task that should be done after cleanup:

1. Crawl every nav-config.tsx entry
2. For each: verify the route exists, the page renders, the feature works
3. Identify: broken links, empty pages, orphaned routes
4. Fix or remove everything that doesn't work

This phase is documented here for completeness but requires its own focused session.

## .gitignore Additions

After cleanup, add to .gitignore to prevent re-accumulation:

```
# Build artifacts
*.heapsnapshot
mission-control.log
chefflow-watchdog.log
.next-dev-pw-*
tmp_*.*
backup-*.sql
build-*.log
dev-*.log
tsc-*.log
```

## Final Architecture

```
C:\Users\david\Documents\CFv1\          (THE app, nothing else)
  app/                                   Next.js App Router (all routes)
  components/                            All React components
  lib/                                   All business logic
  database/                              SQL migrations
  scripts/                               Utility scripts (no deploy scripts)
  docs/                                  Documentation
  tests/                                 Test suites
  types/                                 TypeScript types
  public/                                Static assets
  hooks/                                 Git hooks
  memory/                                Agent memory
  .auth/                                 Credentials (gitignored)
  .claude/                               Agent config
  .env.local                             Environment config
  CLAUDE.md                              Project rules (simplified)
  README.md                              Project overview
  package.json                           Dependencies
  next.config.js                         Next.js config
  drizzle.config.ts                      DB config
  middleware.ts                           Auth middleware
  tailwind.config.ts                     Styling
  tsconfig.json                          TypeScript config
```

**Run:** `npm run dev`
**Build:** `npm run build`
**Serve:** `npm start`
**Deploy:** `git push` + rebuild

No ambiguity. No duplication. One app.
