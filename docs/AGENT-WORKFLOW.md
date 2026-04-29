# ChefFlow Agent Workflow Standard

This document defines the professional workflow that every Claude Code agent working on this project must follow. It is referenced from `CLAUDE.md` and applies to all agents - solo or parallel.

---

## Before Starting Any Work

Create an agent claim before editing files:

```bash
node devtools/agent-start.mjs --prompt "..." --owned "path,other-path"
```

The command creates both a flight record and a branch-scoped file ownership claim.

1. **Check the branch** - confirm you are on the right feature branch, not `main` directly
2. **Check git status** - understand what's already staged or modified before touching anything
3. **Check git log** - run `git log --oneline -10` to see what other agents may have already committed
4. **Check migration timestamps** - run `glob database/migrations/*.sql` before creating any migration file. Your timestamp must be strictly higher than the highest existing one.
5. **Check for in-progress work on your target files** - if another agent has already modified a file you plan to edit, read it first to avoid clobbering their work

---

## Health Check Commands

Run these to verify the project is in good shape. Both must pass before merging to `main`.

**IMPORTANT: Do NOT run these during a multi-agent session.** See the Multi-Agent section below.

```bash
# TypeScript - must exit 0 with zero errors
npx tsc --noEmit --skipLibCheck

# Production build - must exit 0
npx next build --no-lint
```

If bash is broken (common on Windows), use Node:

```js
// Save as a temp script, run with: node __check.js
const { spawnSync } = require('child_process')
const root = process.cwd()
const r = spawnSync('cmd', ['/c', 'npx tsc --noEmit --skipLibCheck 2>&1'], {
  cwd: root,
  encoding: 'utf8',
})
console.log('EXIT:', r.status, '| ERRORS:', (r.stdout.match(/error TS/g) || []).length)
```

---

## After Completing Work

1. **Commit your work** - do not leave files untracked
2. **Write a doc** - every code change gets a `.md` in `docs/` explaining what changed and why (per CLAUDE.md rule)
3. **Do not run the build unless you are the only agent** - see Multi-Agent section
4. **Do not push to main directly** - work on feature branches

---

## Migration Safety Protocol

This is critical. Multiple agents run concurrently and can create timestamp collisions.

1. Run `glob database/migrations/*.sql` and find the highest timestamp
2. Your new file timestamp must be **strictly higher** - never equal, never guessed
3. Never write `DROP TABLE`, `DROP COLUMN`, `DELETE`, or `TRUNCATE` without explicit user approval
4. All migrations must be additive by default
5. After pushing a migration, regenerate `types/database.ts`:

```js
// Regenerate types after migration (save as temp script)
const { spawnSync } = require('child_process')
const fs = require('fs')
const r = spawnSync(
  'cmd',
  ['/c', 'npx drizzle-kit introspect --lang=typescript --project-id luefkpakzvxcsqroxyhz'],
  {
    maxBuffer: 15 * 1024 * 1024,
    encoding: 'buffer',
  }
)
const out = (r.stdout || Buffer.alloc(0)).toString('utf8')
if (out.includes('export type')) {
  fs.writeFileSync('types/database.ts', out)
  console.log('types/database.ts regenerated:', out.length, 'bytes')
} else {
  console.log('FAILED - output did not contain types')
}
```

---

## Multi-Agent Parallel Work Rules

This project frequently runs 10+ agents simultaneously. These rules prevent lost work, duplicated effort, and wasted tokens.

### Build guard - the hard rule

**Never run `npx tsc --noEmit` or `npx next build` when other agents may be running.**

When multiple agents each try to build simultaneously:

- They corrupt `.next/` by writing to it concurrently
- They compete for port 3100
- Every build fails with environmental errors unrelated to your code
- Each agent retries → infinite loop → hundreds of wasted tokens per agent

A PreToolUse hook (`.claude/hooks/build-guard.sh`) enforces this when `.multi-agent-lock` exists:

```bash
touch .multi-agent-lock   # enables the guard before launching agents
rm .multi-agent-lock      # disables guard - now safe to build
```

**Your job as a concurrent agent: implement, commit, and stop. The developer runs one clean build after all agents finish.**

### File conflicts - don't clobber other agents' work

- Create or verify an agent claim before editing files: `node devtools/agent-start.mjs --prompt "..." --owned "path,other-path"`
- If you start without a claim, the pre-commit hook warns after lint-staged when staged files are not covered by an active claim. The warning is advisory during rollout and does not block commits.
- If your claim branch no longer matches the current branch, stop and push only your own commit to a separate feature branch ref instead of publishing unrelated work.
- Before editing any file, run `git status` and `git diff HEAD -- <file>` to see if another agent already modified it
- Read the current state of a file before making changes - never overwrite based on what you expected it to say
- If two agents were both asked to touch the same file, one of you should check the other's commit first
- For large files (actions, components), read the whole thing - another agent may have added functions you'd accidentally delete

### Duplicate work - check before implementing

- Run `git log --oneline -20` at the start of your session
- If a commit message describes work overlapping with your task, read it and adjust - don't implement the same thing twice
- If you find the feature you were asked to build is already partially done, build on it, don't replace it

### Generated files - last write wins, coordinate

- `types/database.ts` is auto-generated - if two agents regenerate it simultaneously, one version is lost
- Only regenerate `types/database.ts` after your migration has been pushed and no other agent is currently pushing migrations
- Never manually edit `types/database.ts`

### Destructive git operations - never in parallel sessions

- Never run `git reset --hard`, `git stash`, `git checkout .`, or `git clean -f`
- Never delete `.next/` while other agents might be reading it
- Never `git add -A` without reviewing what will be staged (check for env files, lock files, generated output)
- If you see unexpected files in git status that you didn't create - leave them alone, they may be another agent's work

### What to do when you finish

1. `git add` the specific files you changed (never `-A`)
2. `git commit` with a clear message describing your scope
3. Write your `docs/` file
4. Report what you did and stop - do not wait for a build result

---

## Merging to Main

Only merge when all agents have finished and the guard is off:

- [ ] `rm .multi-agent-lock` (if active)
- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] `npx next build --no-lint` exits 0
- [ ] All work is committed (no untracked files that matter)
- [ ] `types/database.ts` is current with the remote schema

Merge command (fast-forward only - never force merge):

```bash
git checkout main
git merge --ff-only feature/your-branch
```

---

## Priority Order After Any Big Work Session

1. Remove the build lock: `rm .multi-agent-lock`
2. Run health checks (`npx tsc --noEmit --skipLibCheck` then `npx next build --no-lint`)
3. Commit all untracked work
4. Regenerate `types/database.ts` if migrations were applied
5. Merge to `main` if health checks pass
6. Update `CLAUDE.md` memory if any new patterns were established

---

## Key Commands Reference

| Task                 | Command                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| TypeScript check     | `npx tsc --noEmit --skipLibCheck`                                                                         |
| Production build     | `npx next build --no-lint`                                                                                |
| Regenerate types     | see Migration Safety section above                                                                        |
| Check migrations     | `glob database/migrations/*.sql`                                                                          |
| Check recent commits | `git log --oneline -20`                                                                                   |
| See file changes     | `git diff HEAD -- <file>`                                                                                 |
| Enable build guard   | `touch .multi-agent-lock`                                                                                 |
| Disable build guard  | `rm .multi-agent-lock`                                                                                    |
| Merge to main        | `git checkout main && git merge --ff-only feature/branch`                                                 |
| Git status summary   | `git status --short`                                                                                      |
| Start agent claim    | `node devtools/agent-start.mjs --prompt "..." --owned "path,other-path"`                                  |
| Check agent claim    | `node devtools/agent-claim.mjs check --claim path --owned "path,other-path"`                              |
| Finish agent record  | `node devtools/agent-finish.mjs --record path --owned "path,other-path" --used skill --validations check` |
