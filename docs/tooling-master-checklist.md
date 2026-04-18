# Tooling Master Checklist

> Living document. Updated every time skills, hooks, agents, or infrastructure change.
> Last updated: 2026-04-17

---

## Custom Skills (25)

| #   | Command               | Purpose                                        | Built        | Tested                          | Verdict |
| --- | --------------------- | ---------------------------------------------- | ------------ | ------------------------------- | ------- |
| 1   | `/morning`            | Daily briefing: build, servers, Pi, priorities | 2026-04-17   | Script deps verified            | Ship    |
| 2   | `/status`             | Mid-task context recovery                      | 2026-04-17   | Pure git, no deps               | Ship    |
| 3   | `/ship`               | Git add + commit + push                        | Pre-existing | Battle-tested                   | Ship    |
| 4   | `/close-session`      | Session close-out + logs                       | Pre-existing | Battle-tested                   | Ship    |
| 5   | `/pre-flight`         | Pre-build checks                               | Pre-existing | Battle-tested                   | Ship    |
| 6   | `/feature-closeout`   | tsc + build + commit + push                    | Pre-existing | Battle-tested                   | Ship    |
| 7   | `/health`             | Quick system health check                      | Pre-existing | Battle-tested                   | Ship    |
| 8   | `/verify`             | Full verification protocol                     | Pre-existing | Battle-tested                   | Ship    |
| 9   | `/builder`            | Full Builder Gate                              | Pre-existing | Battle-tested                   | Ship    |
| 10  | `/planner`            | Full Planner Gate                              | Pre-existing | Battle-tested                   | Ship    |
| 11  | `/research`           | Full Research Gate                             | Pre-existing | Battle-tested                   | Ship    |
| 12  | `/debug`              | 4-phase systematic debugging                   | Pre-existing | Battle-tested                   | Ship    |
| 13  | `/tdd`                | Test-Driven Development                        | Pre-existing | Battle-tested                   | Ship    |
| 14  | `/audit`              | Thread completeness audit                      | Pre-existing | Used this session               | Ship    |
| 15  | `/soak`               | Software aging pipeline                        | Pre-existing | File confirmed                  | Ship    |
| 16  | `/hallucination-scan` | Zero Hallucination audit                       | Pre-existing | Battle-tested                   | Ship    |
| 17  | `/pi`                 | Pi health + OpenClaw status                    | 2026-04-17   | SSH best-effort by design       | Ship    |
| 18  | `/pipeline`           | Pricing pipeline audit                         | 2026-04-17   | Script verified (1.1M products) | Ship    |
| 19  | `/compliance`         | Rule violation scan                            | 2026-04-17   | Script verified (4 categories)  | Ship    |
| 20  | `/backup`             | Database backup (pg_dump)                      | 2026-04-17   | Script verified (dump created)  | Ship    |
| 21  | `/first-principles`   | Structured reasoning before building           | 2026-04-17   | Pure reasoning, no deps         | Ship    |
| 22  | `/5-whys`             | Root cause analysis                            | 2026-04-17   | Pure reasoning, no deps         | Ship    |
| 23  | `/review`             | Code review before /ship                       | 2026-04-17   | Pure git diff, no deps          | Ship    |
| 24  | `/document`           | Sync living docs after code changes            | 2026-04-17   | Pure git + doc editing          | Ship    |
| 25  | `/heal-skill`         | Self-repair broken skills                      | 2026-04-17   | Reads/edits skill files         | Ship    |

---

## Hooks (5)

| #   | Hook                   | Trigger                  | Purpose                                                          | Tested                |
| --- | ---------------------- | ------------------------ | ---------------------------------------------------------------- | --------------------- |
| 1   | `build-guard.sh`       | PreToolUse (Bash)        | Block builds during multi-agent lock                             | Pre-existing          |
| 2   | `destructive-guard.sh` | PreToolUse (Bash)        | Block rm -rf, DROP, git reset --hard, push --force, drizzle push | 6/6 patterns verified |
| 3   | `ts-dirty-flag.sh`     | PostToolUse (Edit/Write) | Flag TS files dirty for session-end tsc                          | Pre-existing          |
| 4   | `notify.sh`            | Notification             | Desktop notification on long tasks                               | Pre-existing          |
| 5   | `session-cleanup.sh`   | SessionEnd               | Clean temp state                                                 | Pre-existing          |

---

## Agents (3)

| #   | Agent        | Model     | Purpose                              |
| --- | ------------ | --------- | ------------------------------------ |
| 1   | Haiku Worker | Haiku 4.5 | Cheap mechanical tasks               |
| 2   | Opus Advisor | Opus 4.6  | Hard architecture/security decisions |
| 3   | QA Tester    | Inherited | Playwright UI verification           |

---

## MCP Servers (4)

| #   | Server     | Purpose                                        |
| --- | ---------- | ---------------------------------------------- |
| 1   | Playwright | Browser control, screenshots, UI testing       |
| 2   | GitHub     | Issues, PRs, branch file reads                 |
| 3   | Postgres   | Read-only DB queries                           |
| 4   | MemPalace  | Semantic search across 535+ past conversations |

---

## Ideas Evaluated

### Built

| Idea                           | Source                    | Date       |
| ------------------------------ | ------------------------- | ---------- |
| `/first-principles`            | TACHES repo               | 2026-04-17 |
| `/5-whys`                      | TACHES repo               | 2026-04-17 |
| `/heal-skill`                  | TACHES repo               | 2026-04-17 |
| `/review`                      | serpro69/claude-toolbox   | 2026-04-17 |
| `/document`                    | serpro69/claude-toolbox   | 2026-04-17 |
| `/morning`                     | Internal need             | 2026-04-17 |
| `/status`                      | Internal need             | 2026-04-17 |
| `/pi`                          | Internal need             | 2026-04-17 |
| `/pipeline`                    | Script promotion          | 2026-04-17 |
| `/compliance`                  | Script promotion          | 2026-04-17 |
| `/backup`                      | Script promotion          | 2026-04-17 |
| Destructive command guard hook | claude-code-hooks-mastery | 2026-04-17 |

### Deferred (revisit later)

| Idea                                  | Source                    | Why deferred                                                                    |
| ------------------------------------- | ------------------------- | ------------------------------------------------------------------------------- |
| PostToolUse auto-typecheck            | claude-code-hooks-mastery | ts-dirty-flag already flags; full tsc after every edit too slow on this machine |
| Token/cost dashboard (ccxray)         | Community                 | HTTP proxy setup needed. Not urgent on Max plan                                 |
| claude-mem auto session memory        | thedotmack                | MemPalace + manual digests + MEMORY.md covers it                                |
| claude-graph-memory                   | amarodeabreu              | Overlaps MemPalace, no clear advantage                                          |
| claude-memory-compiler                | coleam00                  | Interesting but current system works                                            |
| Trail of Bits security skills         | trailofbits               | Security audit done 2026-03-29. Revisit before launch                           |
| `/review` -> `/ship` chain flag       | Audit finding             | Nice-to-have. Manual sequence works                                             |
| PostToolUse docs-dirty nudge          | Audit finding             | Would auto-remind about /document. Low priority                                 |
| `/debug` calling `/5-whys` internally | Audit finding             | Both work independently                                                         |
| Hook input jq hardening               | Audit finding             | jq may not be on PATH on Windows. Grep works                                    |
| Auto-generated skill registry         | Audit finding             | Would eliminate CLAUDE.md manual skill list sync                                |

### Skipped (evaluated, not worth it)

| Idea                        | Source        | Why skipped                                                  |
| --------------------------- | ------------- | ------------------------------------------------------------ |
| Self-generating meta-skills | TACHES repo   | Unnecessary complexity. /heal-skill covers practical need    |
| Eisenhower Matrix command   | TACHES repo   | /first-principles + decision framework covers prioritization |
| Inversion thinking command  | TACHES repo   | /5-whys covers reverse reasoning                             |
| TypeScript-powered hooks    | johnlindquist | Bash works. TS adds build step for no gain                   |
| Serena LSP integration      | serpro69      | Already have LSP MCP configured                              |

---

## Known Limitations (Accepted)

| #   | Limitation                                                      | Impact | Why accepted                                           |
| --- | --------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| 1   | Destructive guard uses regex, variable indirection could bypass | Low    | CLAUDE.md rules are primary layer; hook is backup wall |
| 2   | Pi SSH times out off home network                               | None   | Best-effort by design, /morning moves on after 5s      |
| 3   | /review has no truncation for 200+ file diffs                   | Low    | Rare scenario                                          |
| 4   | CLAUDE.md skill list requires manual sync                       | Low    | Structural fix deferred                                |
| 5   | /heal-skill can edit disable-model-invocation skills            | Low    | Only runs on explicit user invocation                  |

---

## Compliance Scan Snapshot (2026-04-17)

- 4 violation categories found
- 91 'use server' files exporting non-async values
- Not new; pre-existing technical debt

## Pipeline Snapshot (2026-04-17)

- Products: 1,131,294 (188% of 600K target)
- Stores: 197,145
- Prices: 2,637,649
- Mapping coverage: 100%
- Null results: 2.7% (target: 0%)
