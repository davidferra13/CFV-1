# Skills & Auto-Trigger Reference

> Moved from CLAUDE.md to reduce instruction file size. Referenced by `@docs/CLAUDE-SKILLS-REFERENCE.md`.
> This is lookup data, not behavioral rules. Read when you need skill names or trigger conditions.

## Auto-Trigger Map

| Trigger Condition                    | Skill                            | Why                                       |
| ------------------------------------ | -------------------------------- | ----------------------------------------- |
| **ANY first message (ALWAYS)**       | `context-load` (HOOK-ENFORCED)   | Never start cold. Silent context recovery |
| First message is greeting/open-ended | `/morning`                       | Full briefing when no specific task       |
| Error encountered during work        | `/debug`                         | Root cause before fix                     |
| About to commit/push code            | `/review` (HOOK-ENFORCED)        | Quality gate                              |
| After writing/editing code files     | `/compliance` (HOOK-ENFORCED)    | Rule violations caught early              |
| After code changes to UI/features    | `/document`                      | Living docs stay current                  |
| Bug persists after 2 fix attempts    | `/5-whys`                        | Stop thrashing, find root cause           |
| About to build a feature from spec   | `/builder` (TDD default)         | Full gate procedure, TDD-first            |
| Building any new feature or fix      | `/tdd`                           | Default build method. Red-green-refactor  |
| Writing or reviewing a spec          | `/planner`                       | Full gate procedure                       |
| Investigating a question for report  | `/research`                      | Full gate procedure                       |
| End of session / user says goodbye   | `/close-session`                 | Nothing left uncommitted                  |
| User asks "what's going on" / status | `/status`                        | Structured snapshot                       |
| Build fails or type errors appear    | `/health`                        | Diagnose before guessing                  |
| Hard bug or performance regression   | `/diagnose`                      | 6-phase disciplined diagnosis (Pocock)    |
| After significant code changes       | `/review` then `/ship`           | Ship clean code                           |
| Feature work complete                | `/feature-closeout`              | tsc + build + commit + push               |
| Stress testing or persona simulation | `/persona-stress-test`           | Deterministic audit                       |
| Need to start dev environment        | `/warmup`                        | Server + auth + browser ready             |
| Planning a feature or major change   | `/grill-me`                      | Stress-test plan before building          |
| Planning with domain model impact    | `/grill-with-docs`               | Grill + update CONTEXT.md/ADRs            |
| Breaking work into tasks/issues      | `/to-issues`                     | Vertical-slice issue decomposition        |
| Need higher-level code understanding | `/zoom-out`                      | Module map before diving in               |
| Architecture feels muddy/coupled     | `/improve-codebase-architecture` | Deep module analysis (Ousterhout)         |
| Synthesizing conversation into spec  | `/to-prd`                        | PRD from current context                  |
| New issue/bug report arrives         | `/triage`                        | State machine triage workflow             |
| Creating a new skill                 | `/write-a-skill`                 | Proper structure + progressive disclosure |
| Feature touches Remy-accessible area | `/remy-gate`                     | Ensure Remy write parity                  |
| Feature discussion concluded         | `/audit`                         | Lock down before moving on                |

## Autonomous Behaviors (No Trigger Needed)

| Behavior                     | When                                                             | How                                                                                    |
| ---------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Check server before work** | Before any localhost testing/verification                        | `curl -s localhost:3000`, if down: `bash scripts/services.sh up`                       |
| **Check services on start**  | First message of session                                         | `bash scripts/services.sh status`, kill garbage silently                               |
| **TDD-first (default)**      | When building any new feature, fix, or significant change        | Write test first (RED), implement minimum to pass (GREEN), refactor. Small steps only  |
| **Run tsc after TS edits**   | After completing a logical unit of work (not every edit)         | `npx tsc --noEmit --skipLibCheck`, fix errors before moving on                         |
| **Rebuild if stale**         | Before any UI verification if last build >24h old                | `npm run build -- --no-lint`                                                           |
| **Commit at milestones**     | After completing a feature, fixing a bug, or meaningful progress | Stage + commit with conventional message. Do not batch 20 files                        |
| **Update build-state.md**    | After any successful tsc + build                                 | Write green status, date, commit hash                                                  |
| **Write session digest**     | On session end (auto via `/close-session`)                       | Compact summary of what was done, unfinished items, flags                              |
| **Fix broken things**        | Anytime tsc/build/test fails                                     | Fix it. Do not report it. (per FIX IT DONT REPORT IT memory)                           |
| **Clean imports**            | After editing a file                                             | Remove unused imports. Do not leave stray code                                         |
| **Module placement**         | When creating new files                                          | Put files in correct module directory. Never create stray files at root or wrong level |

## Skill Catalog

### Core Skills

- **`context-load`** (INTERNAL, hook-enforced) - Silent project context recovery.
- **`/morning`** - Daily briefing: build state, overnight changes, servers, Pi health, priorities.
- **`/status`** - Quick snapshot: branch, uncommitted work, last commit, what's next.
- **`/ship`** - git add + commit + push.
- **`/close-session`** - Stage, commit, push, update session log + build state.
- **`/pre-flight`** - Builder pre-flight check (git status, tsc, next build).
- **`/feature-closeout`** - tsc, build, commit, push.
- **`/review`** - Code review on uncommitted changes. Quality gate before `/ship`.
- **`/compliance`** - Rule violation scan: em dashes, OpenClaw in UI, ts-nocheck exports.
- **`/debug`** - Systematic 4-phase debugging. Root cause before fix.
- **`/5-whys`** - Root cause analysis. Keep asking why.
- **`/tdd`** - Red-green-refactor.
- **`/soak`** - Software aging pipeline.
- **`/hallucination-scan`** - Zero Hallucination audit.
- **`/document`** - Auto-update USER_MANUAL.md and app-complete-audit.md.
- **`/backup`** - pg_dump.
- **`/first-principles`** - Structured reasoning before building.
- **`/heal-skill`** - Self-repair a broken skill.
- **`/warmup`** - Server + auth + browser ready. Usage: `/warmup [account] [port]`.
- **`/remy-gate`** - Remy write parity checklist.
- **`/persona-stress-test`** - Deterministic persona audit.

### Infrastructure Skills

- **`/pi`** - Pi health + OpenClaw status.
- **`/pipeline`** - OpenClaw pricing pipeline audit.

### Matt Pocock Skills

- **`/diagnose`** - 6-phase disciplined bug diagnosis (stricter than `/debug`).
- **`/grill-me`** - Relentless plan interview.
- **`/grill-with-docs`** - Grill + maintain CONTEXT.md/ADRs.
- **`/improve-codebase-architecture`** - Ousterhout deep/shallow module analysis.
- **`/to-issues`** - Break plans into vertical-slice GitHub issues.
- **`/to-prd`** - Synthesize conversation into PRD.
- **`/triage`** - 5-state issue triage machine.
- **`/zoom-out`** - Map modules before diving in.
- **`/write-a-skill`** - Create new skills properly.

### Agent Gates

- **`/planner`** - Full Planner Gate: spec validation with cited evidence.
- **`/builder`** - Full Builder Gate: queue, pre-flight, spike, verification, proof.
- **`/research`** - Full Research Gate: investigation, report format, citations.

**Key rule:** Every claim must cite file paths and line numbers. No citation = not verified.

## Power Tools

All configured in `.claude/mcp.json`.

- **LSP** - go_to_definition, find_references, hover. Use before Grep.
- **Worktrees** - isolated git worktree for risky experiments. No parallel builds.
- **Agent Teams** - bidirectional SendMessage (experimental).
- **CronCreate** - recurring prompts within session.
- **Playwright MCP** - browser control for UI verification.
- **GitHub MCP** - issues, PRs, branch files.
- **Postgres MCP** - read-only DB queries.
- **MemPalace MCP** - search 535+ indexed conversations.

## Brand Names

| Where                  | Name Used           |
| ---------------------- | ------------------- |
| App / UI / page titles | `ChefFlow`          |
| PWA manifest           | `ChefFlow`          |
| Email sender name      | `CheFlow`           |
| package.json           | `chefflow`          |
| Live domain            | `cheflowhq.com`     |
| App subdomain          | `app.cheflowhq.com` |
| Project folder         | `CFv1`              |
| Tagline                | `Ops for Artists`   |

Different names are intentional. Don't "fix" one to match another.

## "Never Ask" Reference

| Never ask this                        | Just do this instead                          |
| ------------------------------------- | --------------------------------------------- |
| "Should I start the server?"          | Check if it's running. If not, start it.      |
| "Should I run tsc?"                   | If you edited TS files, run it.               |
| "Should I commit?"                    | If meaningful work is done, commit it.        |
| "What file should I put this in?"     | Read the module map. Place it correctly.      |
| "Should I fix this type error?"       | Fix it.                                       |
| "Should I update the docs?"           | If you changed UI/features, update them.      |
| "Want me to run the tests?"           | If you changed code, run them.                |
| "Should I check the build?"           | If you're about to ship, check it.            |
| "Where was this discussed before?"    | Check session digests, MemPalace, memory.     |
| "What's the current state of X?"      | Read build-state.md, session-log.md, git log. |
| "Should I clean up imports?"          | Clean them. Always.                           |
| "Is the server on port 3000 or 3100?" | 3000. Always.                                 |
| "Should I push to GitHub?"            | At session end, yes. Always.                  |
| "Which branch?"                       | main, unless told otherwise.                  |

**The test:** "Could I answer this by reading a file, running a command, or checking memory?" If yes, do that.

**Only ask about:** irreversible actions (DB drops, deploys, force pushes), ambiguous product decisions, scope choices.
