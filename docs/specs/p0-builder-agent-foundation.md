# Spec: Builder Agent Foundation

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-02 17:10 | Codex         |        |
| Status: ready | 2026-04-02 17:10 | Codex         |        |
| Status: in-progress | 2026-04-30 18:11 | Codex | pending |
| Status: verified | 2026-04-30 18:28 | Codex | pending |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer asked for a deep analysis of the Claude Code leak discussion, then repeatedly pulled the conversation back to one practical question: what should ChefFlow actually do with this? The useful takeaway was not the leak drama. It was that strong coding agents appear to be built from layered memory, tool wrappers, shell reliability, audit trails, and background maintenance. The developer wanted direct project leverage, not commentary.

The thread then shifted to repo navigation and source-of-truth clarity. The developer wanted exact next steps, then asked for all of it to be done in one pass. That means two things:

- clean up the repo guidance so future agents know where truth lives
- turn the research into a concrete builder-agent foundation spec instead of leaving it as discussion

The developer also pushed toward obtaining leaked source, then accepted the lawful boundary once it was clear the value is the architecture pattern, not the proprietary implementation. The builder-agent work must therefore use lawful, repo-native inputs only.

### Developer Intent

- **Core goal:** Build an internal ChefFlow builder-agent foundation that improves autonomous execution quality, safety, and continuity inside this repo.
- **Key constraints:** No leaked code, no public-facing autonomy in phase 1, no deceptive AI behavior, no hidden writes, no DB dependency for agent state, and no drift away from ChefFlow's privacy-first and operator-first goals.
- **Motivation:** The repo already has the seeds of an orchestration-based agent system in `CLAUDE.md`, `MEMORY.md`, `docs/specs/README.md`, `docs/session-log.md`, `docs/build-state.md`, and Mission Control. The developer wants those pieces turned into a deliberate system.
- **Success from the developer's perspective:** A builder can implement a narrow, safe first slice that adds layered memory, execution journals, loop/frustration detection, and release hygiene checks without inventing a parallel product or leaking private data.

---

## What This Does (Plain English)

This spec defines the first internal-only builder-agent runtime for ChefFlow. It does not build a public AI feature. It creates a file-based agent foundation that can read the repo's canonical memory and docs, log its work in an execution journal, detect loops and frustration signals, and run guarded maintenance checks against the codebase and release surface.

---

## Why It Matters

ChefFlow already depends on strong operational guidance, but that guidance lives in scattered files and human habit. This spec turns those patterns into a buildable internal system so autonomous work becomes more consistent, more auditable, and less fragile.

---

## Current-State Summary

The repo already contains the ingredients of a builder-agent system, but not a unified runtime:

- `CLAUDE.md` is the policy layer and operating contract.
- `MEMORY.md` is the durable product and founder context.
- `docs/specs/README.md` defines planner and builder operating prompts.
- `docs/session-log.md` and `docs/build-state.md` already function as run history and health memory.
- `scripts/launcher/server.mjs` already has repo scanning and activity APIs via `scanCodebase()` and `getActivitySummary()` at lines `7905` and `151`, and exposes them through `/api/manual/scan` and `/api/activity/summary` at lines `7830` and `7885`.
- `docs/AGENT-WORKFLOW.md` already encodes anti-loop and multi-agent execution discipline.

What is missing:

- no canonical memory index across these sources
- no append-only execution journal for autonomous runs
- no shared loop detector or frustration detector for agent execution
- no release-hygiene scanner focused on source maps, secrets, and internal-only artifacts
- no builder-agent runtime entrypoint that ties the above together

---

## Files to Create

| File                                          | Purpose                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| `lib/builder-agent/types.ts`                  | Shared types for memory records, task runs, journal entries, and risks          |
| `lib/builder-agent/memory-index.ts`           | Builds a normalized index from `CLAUDE.md`, `MEMORY.md`, `docs/`, and `memory/` |
| `lib/builder-agent/execution-journal.ts`      | Append-only journal writer and reader for agent runs                            |
| `lib/builder-agent/loop-guard.ts`             | Detects repeated failed actions and triggers stop conditions                    |
| `lib/builder-agent/frustration-signals.ts`    | Detects user/system friction signals from task text and run outcomes            |
| `lib/builder-agent/release-hygiene.ts`        | Scans for source maps, secret-like files, debug artifacts, and banned outputs   |
| `scripts/builder-agent/run.mjs`               | Main internal CLI entrypoint for builder-agent dry runs and live runs           |
| `scripts/builder-agent/maintenance.mjs`       | Scheduled maintenance runner for drift, stale specs, and release hygiene        |
| `memory/builder-agent/README.md`              | Explains the builder-agent memory layout and what belongs there                 |
| `memory/builder-agent/index/manifest.json`    | Current memory-index manifest with source fingerprints                          |
| `memory/builder-agent/journal/.gitkeep`       | Holds append-only run journals                                                  |
| `tests/unit/builder-agent-memory.test.ts`     | Verifies memory indexing and canonical-source precedence                        |
| `tests/unit/builder-agent-loop-guard.test.ts` | Verifies stop conditions after repeated failures                                |
| `tests/unit/builder-agent-hygiene.test.ts`    | Verifies release-hygiene detection                                              |

---

## Files to Modify

| File                          | What to Change                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `package.json`                | Add scripts for builder-agent run, dry-run, and maintenance                                     |
| `CLAUDE.md`                   | Reference the builder-agent runtime, memory precedence, and guardrail expectations              |
| `docs/specs/README.md`        | Add the builder-agent workflow entrypoints and clarify launcher vs library prompts              |
| `docs/session-log.md`         | Builders continue logging entries, plus reference builder-agent run ids where applicable        |
| `docs/build-state.md`         | Note whether builder-agent maintenance checks passed when they are part of a run                |
| `scripts/launcher/server.mjs` | Add optional internal API endpoints for builder-agent status once the file-based runtime exists |

---

## Database Changes

None.

This phase is file-based and internal. Do not introduce new tables, migrations, or agent-state persistence in Postgres.

---

## Data Model

The builder agent uses local files, not database tables.

### Memory Sources

Canonical precedence order:

1. `CLAUDE.md`
2. `MEMORY.md`
3. `docs/specs/README.md`
4. `docs/session-log.md`
5. `docs/build-state.md`
6. `docs/specs/*.md`
7. `docs/research/*.md`
8. `memory/**/*.md`
9. `prompts/**/*.md`

### Core Records

- **MemoryRecord**
  - `id`
  - `sourcePath`
  - `sourceType` (`policy`, `durable_memory`, `spec`, `research`, `session_log`, `prompt_asset`, `working_memory`)
  - `title`
  - `summary`
  - `tags`
  - `fingerprint`
  - `updatedAt`

- **TaskRun**
  - `runId`
  - `taskText`
  - `mode` (`dry-run`, `live`, `maintenance`)
  - `status` (`planned`, `running`, `blocked`, `completed`, `failed`)
  - `startedAt`
  - `endedAt`
  - `riskLevel`
  - `loopState`

- **JournalEntry**
  - `runId`
  - `timestamp`
  - `phase`
  - `message`
  - `artifacts`
  - `warnings`

- **RiskEvent**
  - `runId`
  - `kind` (`loop`, `privacy`, `release_hygiene`, `destructive_action`, `missing_context`)
  - `severity`
  - `details`

### Storage Format

- index manifest: JSON
- run journal: JSONL or line-delimited JSON
- human-readable summaries: markdown under `memory/builder-agent/`

No agent state should be written to customer-facing tables or surfaced in the product UI in phase 1.

---

## Server Actions

None.

This phase is implemented as internal scripts and library modules only. Do not add Next.js server actions or public API routes for end-user interaction.

---

## UI / Component Spec

There is no public UI in this phase.

### Internal Interface

The only required interface in phase 1 is CLI plus file outputs:

- `npm run builder-agent -- --task "<task>" --dry-run`
- `npm run builder-agent -- --task "<task>" --live`
- `npm run builder-agent:maintenance`

### States

- **Idle:** no active run, last journal and manifest visible on disk
- **Planned:** dry-run created a plan and risk summary without writes outside the agent-memory area
- **Running:** active run is appending journal entries
- **Blocked:** loop guard, risk guard, or missing canonical context stopped the run
- **Completed:** run finished, journal closed, manifest refreshed if indexing changed

### Interactions

- Dry-run must never edit source files. It only reads canonical sources, computes context, and writes journal output under `memory/builder-agent/`.
- Live mode may only proceed if loop guard is clear and no hard-stop risk event is present.
- Maintenance mode runs non-destructive checks only.
- Any write outside `memory/builder-agent/` must be initiated by a separate explicit implementation path, not by the maintenance runner.

---

## Edge Cases and Error Handling

| Scenario                                       | Correct Behavior                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `CLAUDE.md` or `MEMORY.md` missing             | Hard fail. Builder agent cannot proceed without canonical policy and memory     |
| Duplicate or conflicting memory records        | Respect precedence order and log the conflict in the run journal                |
| Repeated failed command plan                   | Trip `loop-guard` after the configured threshold and stop the run               |
| Task text shows strong frustration signals     | Log the signal, switch to conservative mode, shorten plan, and avoid risky work |
| Release-hygiene scan finds source maps/secrets | Mark run blocked until explicitly acknowledged or fixed                         |
| Build lock is active                           | Maintenance can proceed, but any build-or-verify step must stay blocked         |
| Private or customer data is requested          | Refuse indexing that source unless it is already part of approved local memory  |
| Manifest is stale or corrupted                 | Rebuild the index from canonical sources and log the repair                     |

---

## Verification Steps

1. Run `npm run builder-agent -- --task "summarize current builder-agent readiness" --dry-run`.
2. Verify `memory/builder-agent/index/manifest.json` is created and includes canonical sources in the expected precedence order.
3. Verify a run journal is appended under `memory/builder-agent/journal/`.
4. Trigger a synthetic repeated-failure case in the loop-guard unit test and verify the run stops at the configured threshold.
5. Trigger a synthetic frustration case in the detector unit test and verify the output switches to conservative mode.
6. Place a fixture source map or secret-like file in a test fixture directory and verify `release-hygiene` flags it.
7. Run unit tests for the builder-agent modules.
8. Confirm no public routes, DB tables, or customer-facing UI were added.

---

## Out of Scope

- No public-facing builder-agent UI
- No autonomous code writing to production routes in this phase
- No database storage for agent state
- No ingestion of chef/client PII into builder-agent memory
- No Mission Control dashboard integration beyond optional internal status APIs
- No leaked, proprietary, or otherwise unauthorized source material

---

## Notes for Builder Agent

- Reuse the existing repo-native anchors before inventing new infrastructure:
  - `CLAUDE.md`
  - `MEMORY.md`
  - `docs/specs/README.md`
  - `docs/session-log.md`
  - `docs/build-state.md`
  - `docs/AGENT-WORKFLOW.md`
  - `scripts/launcher/server.mjs`
- Keep the first slice file-based and deterministic.
- Favor append-only logs and explicit manifests over opaque caches.
- Do not build a parallel app. This is internal engineering infrastructure.
- If Mission Control integration is added later, use the file-based runtime as the source of truth, not in-memory-only state.
