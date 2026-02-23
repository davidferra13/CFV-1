# Incident Reporting System

**Added:** 2026-02-23
**Status:** Active
**Location:** `lib/incidents/reporter.ts`
**Output:** `data/incidents/` (local, gitignored)

---

## What This Is

A local, file-based incident reporting system that automatically writes human-readable Markdown reports whenever something fails in the AI/LLM infrastructure. Reports are organized into folders on the developer's PC for easy browsing.

**Purpose:** Console logs disappear. These reports don't. When something goes wrong at 2 AM, you can open the `data/incidents/` folder the next morning and see exactly what happened, when, and why.

---

## Folder Structure

```
data/incidents/
├── ollama/                  ← Ollama failures (offline, timeout, model missing)
│   └── 2026-02-23/
│       ├── 14-30-00_ollama-timeout.md
│       └── 14-45-12_ollama-offline.md
│
├── queue/                   ← Queue task failures (dead tasks, worker backoff)
│   └── 2026-02-23/
│       ├── 14-31-00_task-dead-generate-menu-notes.md
│       └── 14-35-00_worker-backoff-pc-slot.md
│
├── circuit-breaker/         ← Circuit breaker state changes
│   └── 2026-02-23/
│       ├── 14-30-05_circuit-open-ollama.md
│       └── 14-31-05_circuit-half-open-ollama.md
│
├── health/                  ← Health check failures (degraded, offline)
│   └── 2026-02-23/
│       └── 14-30-00_ollama-degraded.md
│
├── webhook/                 ← Webhook delivery failures (future)
│   └── ...
│
├── general/                 ← Uncategorized failures
│   └── ...
│
└── _daily/                  ← Daily index files (quick-scan tables)
    └── 2026-02-23.md        ← One-line summary of every incident today
```

### How to Use It

1. **Quick scan:** Open `data/incidents/_daily/2026-02-23.md` — it's a markdown table with every incident from that day, one line each.
2. **Deep dive:** Click into the system folder (e.g., `ollama/2026-02-23/`) and read the full report for a specific incident.
3. **Pattern spotting:** If the same system folder keeps filling up, that system has a recurring problem.

---

## What Gets Reported

| Failure Type             | System Folder      | Severity         | When                                    |
| ------------------------ | ------------------ | ---------------- | --------------------------------------- |
| Circuit breaker trips    | `circuit-breaker/` | error            | Any service hits failure threshold      |
| Circuit breaker recovery | `circuit-breaker/` | info             | Service transitions HALF_OPEN → CLOSED  |
| Queue task failure       | `queue/`           | warning          | Task fails but has retries left         |
| Queue task dead          | `queue/`           | error            | Task exhausts all retries, moves to DLQ |
| Worker slot backoff      | `queue/`           | error            | Worker hits consecutive failure limit   |
| Ollama endpoint down     | `health/`          | warning/critical | Health check finds endpoint unreachable |
| All endpoints offline    | `health/`          | critical         | Both PC and Pi are down                 |

---

## Report Format

Each report is a Markdown file:

````markdown
# ERROR — Ollama Timeout

**Time:** 2026-02-23T14:30:00.000Z
**Severity:** error
**System:** ollama
**Endpoint:** PC (localhost:11434)

## What Happened

Ollama on PC failed: Request timed out after 90000ms

## Error Details

\```
TimeoutError: Request to http://localhost:11434/api/generate timed out after 90000ms
\```

## Context

- **taskId:** abc-123
- **taskType:** generate_menu_notes
- **attempt:** 2
- **maxAttempts:** 3
- **durationMs:** 90000

## Suggested Action

Check if Ollama is running on this machine. Run: ollama list
````

---

## Integration Points

| File                                | What Gets Reported                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `lib/resilience/circuit-breaker.ts` | Every circuit state transition (CLOSED→OPEN, OPEN→HALF_OPEN, HALF_OPEN→CLOSED) |
| `lib/ai/queue/worker.ts`            | Every task failure + worker slot backoff events                                |
| `lib/ai/llm-router.ts`              | Health check degradation (any endpoint goes down)                              |

---

## Design Decisions

1. **Markdown, not JSON** — These are for human reading, not machine parsing. The daily JSON stats in `data/remy-stats/` handle machine-readable metrics.
2. **Non-blocking** — Every `writeIncident()` call is wrapped in try/catch. If disk write fails, it logs to console and moves on. Incident reporting never crashes the app.
3. **No PII** — Reports contain system data only (task types, error messages, durations, endpoint names). No client names, no financial data, no personal information.
4. **Gitignored** — `data/incidents/` is in `.gitignore`. These are machine-local files.
5. **Daily index** — The `_daily/` folder has one file per day with a summary table. Open this first for a quick scan.

---

## Privacy

- Reports contain **zero PII**. Only system/operational metadata.
- Reports never leave the developer's machine.
- The `data/incidents/` folder is gitignored and not deployed.

---

## Future Improvements

- [ ] Email/notification alert when a critical incident is written
- [ ] Admin UI page to browse incidents from the app (`/settings/incidents`)
- [ ] Auto-cleanup of reports older than 30 days
- [ ] Wire into webhook delivery failures (`lib/webhooks/deliver.ts`)
