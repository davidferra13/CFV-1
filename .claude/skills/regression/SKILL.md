---
name: regression
description: Unified regression detection system. Quick check, deep scan, blast radius, auto-recovery, live watcher, dashboard, fragile files, trends, blame, and snapshots. The "am I safe?" command.
user-invocable: true
---

# Regression Detection

Unified entry point for ChefFlow's 14-script regression detection system. Protects against parallel agent drift, deleted files, broken imports, and silent feature loss.

## Argument Parsing

Parse the first argument to determine mode. Default (no args) = quick check.

| Invocation                 | Mode                                             |
| -------------------------- | ------------------------------------------------ |
| `/regression`              | Quick check (default)                            |
| `/regression full`         | Deep scan (everything)                           |
| `/regression blast <file>` | Blast radius on a file                           |
| `/regression recover`      | Scan + auto-recover                              |
| `/regression watch`        | Start live watcher                               |
| `/regression dashboard`    | Generate HTML dashboard                          |
| `/regression fragile`      | Fragile files analysis                           |
| `/regression trend`        | Trend history                                    |
| `/regression blame`        | Cross-reference regressions with session changes |
| `/regression snapshot`     | Capture new baseline                             |

---

## Mode: Quick Check (default, no args)

The "am I safe?" command. Run these three in sequence:

```bash
bash scripts/regression-check.sh --quick
```

```bash
bash scripts/regression-snapshot.sh --diff
```

```bash
bash scripts/regression-trend.sh --show 5
```

Summarize results in this format:

```
REGRESSION CHECK - [timestamp]

Registry:   [PASS/FAIL] - [count] items checked, [count] missing
Snapshot:   [PASS/FAIL] - [count] disappeared since baseline
Trend:      [direction: improving/stable/degrading] over last 5 entries

[If any failures: list missing items]
```

If regressions found, immediately offer: "Regressions detected. Run `/regression recover` to auto-restore, or `/regression full` for deep analysis."

---

## Mode: Full Scan (`full`)

The deep scan. Run all detection scripts in this order:

1. **Registry check:**

   ```bash
   bash scripts/regression-check.sh
   ```

2. **Semantic analysis:**

   ```bash
   bash scripts/regression-semantic.sh
   ```

3. **Snapshot diff:**

   ```bash
   bash scripts/regression-snapshot.sh --diff
   ```

4. **Dead imports:**

   ```bash
   bash scripts/regression-dead-imports.sh
   ```

5. **Health probe** (only if server is running - check port 3000 or 3100 first):

   ```bash
   bash scripts/regression-health-probe.sh
   ```

   Skip with note "Server not running, skipping health probe" if neither port responds.

6. **Log trend:**
   ```bash
   bash scripts/regression-trend.sh --log
   ```

Summarize all results in one consolidated report:

```
FULL REGRESSION SCAN - [timestamp]

Registry:     [PASS/FAIL] - [details]
Semantic:     [PASS/FAIL] - [count] auth gaps, [count] no-ops, [count] empty handlers, [count] hardcoded financials
Snapshot:     [PASS/FAIL] - [count] disappeared
Dead Imports: [PASS/FAIL] - [count] broken imports
Health Probe: [PASS/FAIL/SKIPPED] - [details]
Trend:        logged

TOTAL: [count] issues found
```

If issues found, list them grouped by category and suggest: "Run `/regression recover` to auto-restore missing files, or fix semantic issues manually."

---

## Mode: Blast Radius (`blast <file>`)

Run before modifying or deleting a file. The second argument is the file path.

```bash
bash scripts/regression-blast-radius.sh <file>
```

Read the output and summarize:

- Direct importers (files that import this file)
- Indirect dependents (transitive)
- Risk level (low/medium/high based on dependent count)
- Whether the file is in the regression registry

If high risk (5+ dependents), warn: "This file has [N] dependents. Deletion would break [list]. Consider updating imports first."

---

## Mode: Recover (`recover`)

Scan for regressions and auto-recover missing files from git history.

First, scan:

```bash
bash scripts/regression-recover.sh --scan
```

If recoverable items found, show them and run:

```bash
bash scripts/regression-recover.sh --recover
```

After recovery, re-run the quick check to verify:

```bash
bash scripts/regression-check.sh --quick
```

Report what was recovered and what remains unrecoverable (if any).

---

## Mode: Watch (`watch`)

Start the live file watcher in background.

```bash
bash scripts/regression-watcher.sh
```

Run this in background mode. Report: "Regression watcher started. Monitoring critical files for deletion or suspicious modification. It will alert on changes to registry files."

---

## Mode: Dashboard (`dashboard`)

Generate and open the HTML regression dashboard.

```bash
bash scripts/regression-dashboard.sh --open
```

Report the output file location (`scripts/.regression-dashboard.html`).

---

## Mode: Fragile (`fragile`)

Show fragile file analysis - files with high churn, yo-yo patterns, or regression involvement.

```bash
bash scripts/regression-fragile.sh --analyze
```

Read the output report (`.regression-fragile-report.md`) and summarize:

- Top 5 most fragile files
- Any files on the manual watchlist
- Recommendations for stabilization

---

## Mode: Trend (`trend`)

Show regression trend history.

```bash
bash scripts/regression-trend.sh --show
```

Summarize the trajectory: improving, stable, or degrading. Call out any spikes.

---

## Mode: Blame (`blame`)

Cross-reference current regressions with session changes to identify which session introduced them.

```bash
bash scripts/regression-session-log.sh --blame
```

Summarize which sessions touched which regressed files. If a pattern emerges (one session broke multiple things), call it out.

---

## Mode: Snapshot (`snapshot`)

Capture a new baseline snapshot of the current app surface area.

```bash
bash scripts/regression-snapshot.sh --capture
```

After capture, log the trend:

```bash
bash scripts/regression-trend.sh --log
```

Report: "New baseline captured. [count] routes, [count] API routes, [count] infrastructure files, [count] exports tracked. Trend logged."

Remind: "Commit `scripts/.regression-snapshot.json` so all agents share this baseline."

---

## Rules

- Always run scripts from the project root (`c:\Users\david\Documents\CFv1`).
- Non-zero exit codes mean regressions found, not script failure. Read the output, do not treat exit 1 as an error.
- If a script is missing, skip it and note which one. Never fail the whole skill because one script is absent.
- After any mode that finds issues, always suggest the logical next step (recover, full scan, or manual fix).
- Keep summaries concise. The developer wants a status, not a wall of text.
- The trend direction matters more than individual numbers. Call out patterns.
