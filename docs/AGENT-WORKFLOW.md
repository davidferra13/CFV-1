# ChefFlow Agent Workflow Standard

This document defines the professional workflow that every Claude Code agent working on this project must follow. It is referenced from `CLAUDE.md` and applies to all agents — solo or parallel.

---

## Before Starting Any Work

1. **Check the branch** — confirm you are on the right feature branch, not `main` directly
2. **Check git status** — understand what's already staged or modified before touching anything
3. **Check migration timestamps** — run `glob supabase/migrations/*.sql` before creating any migration file. Your timestamp must be strictly higher than the highest existing one.

---

## Health Check Commands

Run these to verify the project is in good shape. Both must pass before merging to `main`.

```bash
# TypeScript — must exit 0 with zero errors
npx tsc --noEmit --skipLibCheck

# Production build — must exit 0
npx next build
```

If bash is broken (common on Windows), use Node:
```js
// Save as a temp script, run with: node __check.js
const {spawnSync} = require('child_process');
const root = process.cwd();
const r = spawnSync('cmd', ['/c', 'npx tsc --noEmit --skipLibCheck 2>&1'], {cwd: root, encoding: 'utf8'});
console.log('EXIT:', r.status, '| ERRORS:', (r.stdout.match(/error TS/g)||[]).length);
```

---

## After Completing Work

1. **Run the health checks above** — both must pass
2. **Commit your work** — do not leave files untracked
3. **Write a doc** — every code change gets a `.md` in `docs/` explaining what changed and why (per CLAUDE.md rule)
4. **Do not push to main directly** — work on feature branches

---

## Migration Safety Protocol

This is critical. Multiple agents run concurrently and can create timestamp collisions.

1. Run `glob supabase/migrations/*.sql` and find the highest timestamp
2. Your new file timestamp must be **strictly higher** — never equal, never guessed
3. Never write `DROP TABLE`, `DROP COLUMN`, `DELETE`, or `TRUNCATE` without explicit user approval
4. All migrations must be additive by default
5. After pushing a migration, regenerate `types/database.ts`:

```js
// Regenerate types after migration (save as temp script)
const {spawnSync} = require('child_process');
const fs = require('fs');
const r = spawnSync('cmd', ['/c', 'npx supabase gen types --lang=typescript --project-id luefkpakzvxcsqroxyhz'], {
  maxBuffer: 15*1024*1024, encoding: 'buffer'
});
const out = (r.stdout || Buffer.alloc(0)).toString('utf8');
if (out.includes('export type')) {
  fs.writeFileSync('types/database.ts', out);
  console.log('types/database.ts regenerated:', out.length, 'bytes');
} else {
  console.log('FAILED — output did not contain types');
}
```

---

## Merging to Main

Only merge when:
- [ ] `tsc --noEmit --skipLibCheck` exits 0
- [ ] `next build` exits 0
- [ ] All work is committed (no untracked files that matter)
- [ ] `types/database.ts` is current with the remote schema

Merge command (fast-forward only — never force merge):
```bash
git checkout main
git merge --ff-only feature/your-branch
```

---

## Parallel Agent Rules

When multiple agents are running simultaneously:

- Each agent works on an isolated domain — avoid editing the same files as other agents
- Never assume a migration timestamp is safe without checking the filesystem first
- Never use `git add -A` without reviewing what will be staged (check for env files)
- The `types/database.ts` file is auto-generated — if two agents regenerate it simultaneously, the last write wins. Coordinate if possible.

---

## Priority Order After Any Big Work Session

1. Run health checks (tsc + build)
2. Commit all untracked work
3. Regenerate `types/database.ts` if migrations were applied
4. Merge to `main` if health checks pass
5. Update `CLAUDE.md` memory if any new patterns were established

---

## Key Commands Reference

| Task | Command |
|---|---|
| TypeScript check | `npx tsc --noEmit --skipLibCheck` |
| Production build | `npx next build` |
| Regenerate types | see Migration Safety section above |
| Check migrations | `glob supabase/migrations/*.sql` |
| Merge to main | `git checkout main && git merge --ff-only feature/branch` |
| Git status summary | `git status --short` |
