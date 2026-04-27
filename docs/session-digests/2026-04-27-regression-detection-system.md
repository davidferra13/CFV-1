# Session Digest: Regression Detection System Build

**Date:** 2026-04-27
**Branch:** `feature/weather-visibility-analysis`
**Agent:** Claude Opus 4.6 (main session)
**Duration:** Full session
**Files changed:** 158 uncommitted (51 from this session's regression work + prior branch state)

---

## What Was Done

Built a complete 5-layer, 19-script regression detection system from scratch. The system prevents, detects, traces, and auto-recovers regressions caused by 10+ parallel AI agents editing the codebase simultaneously.

## Why This Was Built

The developer observed "massive regression at random points in the build." Despite CLAUDE.md containing rules like "never destroy other agents' work," agents kept breaking things because rules without enforcement are suggestions. This session shifted from instruction-based to mechanism-based regression prevention.

The developer initially proposed a long prompt ("ZERO REGRESSION / FULL SYSTEM ACCOUNTABILITY") to paste into agent contexts. Analysis showed 90% of it was already in CLAUDE.md. The 10% that was new (recovery logic, structured output format) was better served by executable scripts than more prose. The developer agreed and said "do it."

---

## Complete System Inventory

### Layer 1: Registry Check (curated critical features)

| File                               | Purpose                                                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/regression-registry.json` | 241 checkpoints: 47 routes, 12 API routes, 22 critical files, 53 server action exports, 6 infrastructure exports, 20 schema tables |
| `scripts/regression-check.sh`      | Verifies all registry entries exist. `--quick` (162 checks, ~2s) or full (241 checks + semantic delegation)                        |

### Layer 2: Semantic Analysis (content-level regressions)

| File                             | Purpose                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/regression-semantic.sh` | 4 checks: auth gate audit, no-op detection, empty handler detection, hardcoded financial values. Runs inside `regression-check.sh` full mode |

### Layer 3: Snapshot Diffing (auto-detect everything, zero maintenance)

| File                                | Purpose                                                                                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/regression-snapshot.sh`    | `--capture` snapshots all 791 pages, 345 API routes, 4776 exports, 682 tables. `--diff` compares current state to baseline. Tracked in git so all agents share it |
| `scripts/.regression-snapshot.json` | Current baseline (captured this session)                                                                                                                          |

### Layer 4: Prevention and Recovery

| File                                 | Purpose                                                                                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/regression-blast-radius.sh` | Takes a file path, shows all direct importers (with transitive 1-level), all exported symbol usage, risk level (LOW/MED/HIGH/CRIT). Tested: `lib/events/actions.ts` = 72 dependents, CRITICAL |
| `scripts/regression-recover.sh`      | `--scan` finds recoverable files from git history. `--recover` restores them. `--dry-run` previews. Warns on intentional deletions                                                            |
| `scripts/regression-fragile.sh`      | Analyzes 30-day git churn, cross-references session logs, detects yo-yo files (deleted+re-added). `--auto-watch` populates watchlist from CRIT/HIGH files. Currently: 9 files on watchlist    |
| `scripts/regression-dead-imports.sh` | Scans 3810 files for imports pointing to non-existent modules. Currently clean (0 dead imports)                                                                                               |

### Layer 5: Monitoring and Forensics

| File                                                               | Purpose                                                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/regression-watcher.sh` + `scripts/regression-watcher.mjs` | Live file monitor using Node.js `fs.watchFile` (5s polling). Watches 89 critical files. Checks exports on modification. Alerts to terminal + `.watcher-alerts.log` |
| `scripts/regression-health-probe.sh`                               | HTTP probes critical routes when server is running. Catches 500s. Graceful skip when server down                                                                   |
| `scripts/regression-trend.sh`                                      | Appends JSONL data point each session (page count, API count, export count, table count, status). `--show` displays trend table with deltas                        |
| `scripts/regression-session-log.sh`                                | `--record` captures session file changes. `--trace <file>` shows which sessions touched it. `--blame` cross-references regressions with sessions                   |
| `scripts/regression-dashboard.sh`                                  | Generates self-contained HTML dashboard with status banner, vitals, trend chart, regressions, sessions, fragile files. Dark theme                                  |

### Integration and Meta

| File                                 | Purpose                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/regression-codex-specs.sh`  | Generates Codex-compatible repair specs from regression data. 150 specs generated (auth gates, no-ops, empty handlers, fragile files). `--list`, `--clean`               |
| `scripts/regression-self-test.sh`    | 6 test cases verifying the detection system itself works. Simulates file deletion, export removal, snapshot drift, dead imports, recovery, blast radius. **6/6 passing** |
| `.claude/skills/regression/SKILL.md` | `/regression` slash command - unified entry point for all 10 modes                                                                                                       |
| `.husky/pre-commit`                  | Fragile file warning + quick regression check. Blocks commit on regression                                                                                               |
| `.husky/pre-push`                    | tsc --noEmit + full regression check + snapshot diff. Blocks push on failure                                                                                             |

### Data Files (generated, some tracked)

| File                                | Tracked          | Purpose                               |
| ----------------------------------- | ---------------- | ------------------------------------- |
| `scripts/.regression-snapshot.json` | YES              | Blessed baseline for all agents       |
| `scripts/.regression-trend.jsonl`   | YES              | Trend data over time                  |
| `scripts/.fragile-watchlist.json`   | YES              | Auto-populated fragile file watchlist |
| `scripts/.session-changes.jsonl`    | NO (.gitignored) | Local session forensics               |
| `.regression-report.md`             | NO (.gitignored) | Current regression report             |
| `.regression-semantic-report.md`    | NO (.gitignored) | Semantic check findings               |
| `.regression-fragile-report.md`     | NO (.gitignored) | Fragile file analysis                 |
| `.regression-dashboard.html`        | NO (.gitignored) | HTML dashboard                        |
| `scripts/.watcher-alerts.log`       | NO               | Watcher alert history                 |

---

## Enforcement Chain

```
Developer writes code
    |
    v
git commit
    |-> .husky/pre-commit
    |   |-> Fragile file WARNING (non-blocking, <1s)
    |   |-> regression-check.sh --quick (blocking, ~2s)
    |   |-> Secret scanner (blocking)
    |   |-> lint-staged (blocking)
    |
    v
git push
    |-> .husky/pre-push
    |   |-> tsc --noEmit --skipLibCheck (blocking, ~30-60s)
    |   |-> regression-check.sh full (blocking, ~15s)
    |   |-> regression-snapshot.sh --diff (blocking, ~5s)
    |
    v
Session start (session-briefing.sh)
    |-> regression-check.sh --quick (reported in briefing)
    |-> regression-trend.sh --log (data point appended)
    |
    v
On-demand
    |-> /regression (skill - any mode)
    |-> regression-watcher.sh (background sentinel)
    |-> regression-dashboard.sh (visual status)
```

---

## Key Decisions and Tradeoffs

1. **Node.js for JSON parsing, not jq or sed**: Windows Git Bash lacks `grep -P` (Perl regex) and `jq`. All JSON parsing uses `node -e` since Node is guaranteed in this project. First attempt used sed/grep and failed spectacularly with nested JSON.

2. **Registry is manual, snapshot is automatic**: Registry (`regression-registry.json`) requires adding entries when features ship but provides curated, high-signal checks. Snapshot auto-discovers everything but can't distinguish "intentionally removed" from "accidentally deleted." Both are needed.

3. **Pre-commit is quick (2s), pre-push is thorough (60s+)**: tsc is too slow for pre-commit but catches broken imports that file-existence checks miss. Pre-push is the point of no return.

4. **Semantic checks are advisory in pre-commit, blocking in pre-push**: 210 existing semantic findings (auth gates, no-ops) would block every commit if enforced immediately. They're informational until the tech debt is addressed via Codex specs.

5. **Watchlist auto-populated from fragile analysis**: Rather than manually flagging files, `--auto-watch` runs the churn analysis and adds CRIT/HIGH files automatically. Currently 9 files. Manually-added entries are preserved separately.

6. **Trend data tracked in git, session data gitignored**: Trends need to be visible across agents (shared baseline). Session forensics are local debugging tools.

7. **Self-test validates the system**: `regression-self-test.sh` simulates 6 real regression scenarios and verifies detection works. This prevents the regression system itself from silently breaking.

---

## Current Codebase Vitals (at time of writing)

- **Pages:** 791
- **API routes:** 345
- **Server action exports:** 4,776
- **Schema tables:** 682
- **Registry checks:** 241 (all passing)
- **Snapshot baseline:** captured 2026-04-27T18:04:38Z
- **Dead imports:** 0
- **Fragile files (CRIT):** 9 on watchlist
- **Semantic findings:** 210 failures, 34 warnings (tech debt, not new regressions)
- **Self-test:** 6/6 passing
- **Codex repair specs:** 150 generated in `docs/specs/auto-repair/`

---

## Files Modified in This Session (regression system only)

### Created (19 files)

```
scripts/regression-registry.json
scripts/regression-check.sh
scripts/regression-semantic.sh
scripts/regression-snapshot.sh
scripts/regression-dead-imports.sh
scripts/regression-health-probe.sh
scripts/regression-trend.sh
scripts/regression-session-log.sh
scripts/regression-recover.sh
scripts/regression-blast-radius.sh
scripts/regression-fragile.sh
scripts/regression-watcher.sh
scripts/regression-watcher.mjs
scripts/regression-dashboard.sh
scripts/regression-codex-specs.sh
scripts/regression-self-test.sh
scripts/.regression-snapshot.json
scripts/.regression-trend.jsonl
.claude/skills/regression/SKILL.md
```

### Modified (4 files)

```
.husky/pre-commit          (added fragile warning + regression check)
.husky/pre-push            (created: tsc + full check + snapshot diff)
scripts/session-briefing.sh (added regression check + trend log sections)
.gitignore                 (added regression report files)
CLAUDE.md                  (added Regression Detection section)
```

### Generated (not committed, gitignored or ephemeral)

```
scripts/.fragile-watchlist.json
scripts/.session-changes.jsonl
.regression-report.md (only when regressions exist)
.regression-semantic-report.md
.regression-fragile-report.md
scripts/.regression-dashboard.html
docs/specs/auto-repair/*.md (150 specs)
```

---

## Recovery Instructions

### To resume this work:

1. Branch is `feature/weather-visibility-analysis` with 158 uncommitted files
2. All regression scripts are functional and tested (self-test: 6/6)
3. Nothing is broken - the system is additive (no existing code was modified except hooks and briefing)

### To verify the system works:

```bash
bash scripts/regression-self-test.sh        # 6/6 must pass
bash scripts/regression-check.sh            # full check, 241 checks
bash scripts/regression-snapshot.sh --diff  # should show no changes
bash scripts/regression-trend.sh --show     # shows data points
```

### To use day-to-day:

```bash
/regression                  # quick check (via skill)
/regression full             # deep scan
/regression blast <file>     # before deleting anything
/regression recover          # after detecting regression
/regression dashboard        # visual status
```

### To maintain:

- Add entries to `scripts/regression-registry.json` when shipping new critical features
- Run `bash scripts/regression-snapshot.sh --capture` after milestones and commit the snapshot
- Run `bash scripts/regression-fragile.sh --auto-watch` periodically to update watchlist
- Run `bash scripts/regression-codex-specs.sh` to regenerate repair specs after fixing issues

---

## Immediate Next Steps

1. **Commit and push** all regression system files on this branch
2. **Merge to main** when ready (all checks passing)
3. **Run `--auto-watch` on a schedule** (add to morning briefing or cron)
4. **Process the 150 Codex repair specs** - these represent real tech debt (missing auth gates, no-op returns) that should be fixed
5. **Train other agents** - the pre-commit/pre-push hooks enforce automatically, but agents should know about `/regression blast <file>` before deleting things

---

## What This Does NOT Cover

- Runtime regression testing (Playwright still needed for UI behavior)
- Database schema drift detection (existing `verify-database.ts` handles this separately)
- Performance regression (no load testing integration)
- Visual regression (no screenshot diffing)
- Cross-branch regression (snapshot is per-branch; merging could introduce regressions from other branches)
