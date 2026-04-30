# Spec: Sticky Notes Intake Layer

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** `docs/specs/universal-intake-pipeline.md`, `docs/specs/autonomous-v1-builder-contract.md`
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                    | Date             | Agent/Session | Commit |
| ------------------------ | ---------------- | ------------- | ------ |
| Created                  | 2026-04-30 11:55 | Codex         |        |
| Status: ready            | 2026-04-30 11:55 | Codex         |        |
| Claimed                  | 2026-04-30 12:24 | Codex         |        |
| Build completed          | 2026-04-30 12:31 | Codex         |        |
| Unit tests passed        | 2026-04-30 12:31 | Codex         |        |
| Sticky commands verified | 2026-04-30 12:32 | Codex         |        |
| Type check passed        | 2026-04-30 12:33 | Codex         |        |
| Status: verified         | 2026-04-30 12:33 | Codex         |        |

---

## Developer Notes

### Raw Signal

The developer uses Simple Sticky Notes on the PC 24/7. The notes are not casual reminders. They contain quick ideas, directives, fragments, old behaviors, current operating rules, personal material, and high-value ChefFlow guidance. The current failure is that notes are static. They accumulate without lifecycle, duplicates, stale material, or attachment to the project. Some notes are valuable but never reach ChefFlow. Others reflect old behavior and should not keep influencing the system.

Deletion is not the solution. Preservation with structure is the solution. Every past and future note should be captured, classified, attached to the system, and then activated, deferred, or archived. Most notes relate to ChefFlow. The rest are personal and must be separated automatically. The developer wants to be able to say "organize everything" and have Codex resolve the note pile into structured, actionable outputs.

The goal is to turn Sticky Notes from passive clutter into an active, self-organizing input layer that feeds the system in real time.

### Developer Intent

- **Core goal:** Convert Simple Sticky Notes into a governed local intake layer that Codex can read, classify, attach, and act on.
- **Key constraints:** Never mutate or delete the Sticky Notes database. Preserve raw note history. Separate ChefFlow from personal material. Do not let notes directly modify code, skills, specs, queues, or project rules without review. Do not ingest recipe IP into AI generation paths.
- **Motivation:** Sticky Notes are currently the developer's fastest capture surface, but the project loses value because those notes are disconnected from Codex, skills, specs, and builder queues.
- **Success from the developer's perspective:** A future command can sync notes, classify every item, show what matters now, attach durable directives to skills or specs, park stale material, separate personal notes, and preserve everything with a visible lifecycle.

---

## Continuity Preflight

| Question                            | Answer                                                                                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuity decision                 | attach                                                                                                                                                                                                                                            |
| Canonical owner                     | New internal owner: `docs/specs/sticky-notes-intake-layer.md`, implemented under `devtools/sticky-notes/*`, `system/sticky-notes/*`, and the existing agent intake or builder governance surfaces.                                                |
| Existing related routes             | No user-facing route in V1. Existing `/clients/intake` is client onboarding and must not own this work.                                                                                                                                           |
| Existing related modules/components | `devtools/external-guidance-intake.mjs`, `devtools/agent-learning-inbox.mjs`, `devtools/codex-build-bridge.mjs`, `system/intake/`, `.claude/skills/skill-garden/SKILL.md`, `system/canonical-surfaces.json`.                                      |
| Recent overlapping commits          | Recent docs added `autonomous-v1-builder` and `chef-command-plane` canonical owners. This spec attaches note intake to those governance paths instead of making a new product surface.                                                            |
| Dirty or claimed overlapping files  | Worktree was dirty before this task: `docs/simulation-history.md`, `docs/simulation-report.md`, `docs/stress-tests/REGISTRY.md`, `docs/sync-status.json`, `public/sw.js`, `tsconfig.next.json`, and a deleted log. This spec does not touch them. |
| Duplicate or orphan risk            | High if "intake" routes to client intake or if notes become another raw backlog. Mitigation: create a dedicated canonical owner and require lifecycle classification before any action.                                                           |
| Why this is not a duplicate         | Universal intake handles manually submitted items. Autonomous V1 builder handles approved build queues. Skill-garden handles durable agent behavior. None currently syncs Simple Sticky Notes from `Notes.db`.                                    |
| What must not be rebuilt            | Do not replace client intake, Remy memory, CIL, autonomous builder queues, skill-garden, or the universal intake dashboard. Add Sticky Notes as a source adapter and lifecycle layer.                                                             |

Continuity scan evidence: `system/agent-reports/context-continuity/20260430T155245Z-sticky-notes-intake-layer-simple-sticky-notes-notes-db-codex-organize-everything.json`.

The scanner matched `client-intake` because of the generic keyword "intake." That is a false owner for this feature. The same false-positive pattern is already documented in the autonomous builder spec at `docs/specs/autonomous-v1-builder-contract.md:53`. The correct owner is internal agent intake and governance.

### Current-State Summary

- Simple Sticky Notes stores data in `C:\Users\david\Documents\Simple Sticky Notes\Notes.db`. The observed schema has `NOTES` with fields including `ID`, `STATE`, `CREATED`, `UPDATED`, `DELETED`, `STARRED`, `NOTEBOOK`, `TITLE`, `DATA`, and `TEXT`. The database currently has 78 note rows, 67 active rows, 11 inactive rows, 5 deleted rows, and 3 starred rows. Evidence: read-only `sqlite3` inspection during this planner session.
- `system/intake/` already exists with raw intake subdirectories, but it is locally excluded from git. Evidence: `.git/info/exclude:8` and `docs/specs/universal-intake-pipeline.md:80`.
- The universal intake spec already routes submitted ideas, bugs, features, notes, and critiques into `system/intake/*` and processed outputs into `system/intake/processed/*`. Evidence: `docs/specs/universal-intake-pipeline.md:63`, `docs/specs/universal-intake-pipeline.md:78`, `docs/specs/universal-intake-pipeline.md:103`, `docs/specs/universal-intake-pipeline.md:119`.
- The autonomous builder contract already says infinite ideas are allowed, but only a small number become active work, while everything else is captured, classified, and parked. Evidence: `docs/specs/autonomous-v1-builder-contract.md:32`.
- The autonomous builder contract already defines file-based internal queues for approved, parked, research, blocked, override, receipt, and claim records. Evidence: `docs/specs/autonomous-v1-builder-contract.md:114`.
- Skill-garden already owns durable developer behavior and external guidance. Evidence: `.claude/skills/skill-garden/SKILL.md:3`, `.claude/skills/skill-garden/SKILL.md:14`, `.claude/skills/skill-garden/SKILL.md:53`, `.claude/skills/skill-garden/SKILL.md:123`.
- `devtools/external-guidance-intake.mjs` already classifies external guidance into `AGENTS.md`, `skill-garden`, workflow skills, persona material, findings triage, or manual review. Evidence: `devtools/external-guidance-intake.mjs:17`, `devtools/external-guidance-intake.mjs:21`, `devtools/external-guidance-intake.mjs:27`, `devtools/external-guidance-intake.mjs:37`, `devtools/external-guidance-intake.mjs:55`.
- ChefFlow already uses `better-sqlite3`, `tsx`, Node's built-in test runner, and Zod, so the implementation can stay inside the existing toolchain. Evidence: `package.json:47`, `package.json:354`, `package.json:372`, `package.json:382`.
- Project rules require swarm-safe edits, commits after writes, one AI provider, no em dashes, and honest failure states. Evidence: `CLAUDE.md:14`, `CLAUDE.md:15`, `CLAUDE.md:66`, `CLAUDE.md:81`, `CLAUDE.md:144`, `CLAUDE.md:145`, `CLAUDE.md:146`.

---

## What This Does (Plain English)

This builds a local intake pipeline for Simple Sticky Notes. It reads the Sticky Notes SQLite database read-only, snapshots every note, detects changes, classifies notes into ChefFlow or personal categories, attaches ChefFlow material to the correct project destination, and produces reviewable reports and action queues. The developer can run one command, such as `npm run sticky:organize`, and Codex gets a structured map of what to activate, defer, archive, or keep private.

## Why It Matters

The developer's fastest capture tool is currently outside the system. ChefFlow loses high-signal direction because notes stay in a passive pile. This makes Sticky Notes a governed input source without allowing raw notes to mutate the app unchecked.

---

## Operating Model

### Lifecycle

Every note must move through this lifecycle:

```text
discovered
  -> captured
  -> normalized
  -> classified
  -> attached
  -> activated | deferred | archived | personal | restricted | needs_review
```

No note may skip `captured`. No note may become `activated` without a destination and review status.

### Classification Taxonomy

| Class                   | Meaning                                                       | Default Destination                                    |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| `chefFlow.directive`    | Durable operating rule, project constraint, or agent behavior | `system/sticky-notes/actions/skill-garden-candidates/` |
| `chefFlow.feature`      | Product idea or missing capability                            | `system/sticky-notes/actions/spec-candidates/`         |
| `chefFlow.bug`          | Broken behavior, regression, or product failure               | `system/sticky-notes/actions/triage-candidates/`       |
| `chefFlow.specFragment` | Partial plan, workflow, UI idea, implementation note          | `system/sticky-notes/actions/spec-fragments/`          |
| `chefFlow.context`      | Background context future agents should know                  | `system/sticky-notes/actions/context-packets/`         |
| `personal.task`         | Personal todo, reminder, schedule, life admin                 | `system/sticky-notes/personal/tasks/`                  |
| `personal.memory`       | Personal note that is not a ChefFlow task                     | `system/sticky-notes/personal/memory/`                 |
| `archive.stale`         | Preserved but no longer active                                | `system/sticky-notes/archive/stale/`                   |
| `archive.duplicate`     | Duplicate or weaker version of another note                   | `system/sticky-notes/archive/duplicates/`              |
| `restricted.private`    | Sensitive content that must not enter project action queues   | `system/sticky-notes/restricted/private/`              |
| `restricted.recipeIp`   | Chef recipe or culinary creative IP                           | `system/sticky-notes/restricted/recipe-ip/`            |
| `needsReview`           | Ambiguous, low confidence, or classification failure          | `system/sticky-notes/review/`                          |

### Attachment Rules

1. `chefFlow.directive` routes to `skill-garden` candidates first. It does not directly edit skills.
2. `chefFlow.feature` routes through context-continuity, then V1 governor classification, before becoming a spec or queue item.
3. `chefFlow.bug` routes to findings triage or debug candidates. It does not become code until a human or builder gate accepts it.
4. `chefFlow.specFragment` attaches to an existing spec when context-continuity finds one. Otherwise it becomes a draft spec candidate.
5. `chefFlow.context` becomes a compact memory packet with source note references.
6. Personal notes never enter ChefFlow queues by default.
7. Restricted notes are preserved, indexed by metadata only, and excluded from AI classification beyond safety labels.
8. Recipe IP is read-only preservation. The classifier must never generate, complete, rewrite, suggest, or expand recipes.

### Real-Time Contract

Codex cannot run as a permanent background daemon in a chat session. The build must therefore provide two reliable modes:

1. **Immediate ingestion:** `npm run sticky:organize` reads the current database and produces the full organized output on demand.
2. **Near-real-time sync:** a Windows Task Scheduler job runs `npm run sticky:sync` every 1 to 5 minutes, or an optional watcher runs locally when explicitly started by the developer.

The watcher is not required for correctness. The command path is the source of truth.

---

## Files to Create

| File                                        | Purpose                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `devtools/sticky-notes/read-db.mjs`         | Read `Notes.db` in read-only mode and return raw rows.                       |
| `devtools/sticky-notes/normalize.mjs`       | Convert rows into stable normalized note records.                            |
| `devtools/sticky-notes/hash.mjs`            | Generate content hashes and detect changes without storing duplicates.       |
| `devtools/sticky-notes/classify.mjs`        | Deterministic and optional Ollama-backed classifier.                         |
| `devtools/sticky-notes/attach.mjs`          | Write classified outputs into action, personal, archive, and review dirs.    |
| `devtools/sticky-notes/organize.mjs`        | One-command orchestrator for sync, classify, attach, and report.             |
| `devtools/sticky-notes/report.mjs`          | Produce human-readable markdown and machine-readable JSON reports.           |
| `devtools/sticky-notes/config.mjs`          | Central config for database path, output roots, and safety thresholds.       |
| `devtools/sticky-notes/scheduler-task.ps1`  | Creates or updates an optional Windows Task Scheduler job.                   |
| `devtools/sticky-notes/README.md`           | Operator notes for commands, outputs, and safety constraints.                |
| `tests/unit/sticky-notes-normalize.test.ts` | Unit tests for timestamp conversion, empty notes, duplicate IDs, and hashes. |
| `tests/unit/sticky-notes-classify.test.ts`  | Unit tests for taxonomy routing, privacy restrictions, and review fallback.  |
| `tests/unit/sticky-notes-attach.test.ts`    | Unit tests for destination writing and no direct project mutation.           |
| `system/sticky-notes/.gitkeep`              | Keeps the local output root discoverable if the root is gitignored later.    |

The actual note records under `system/sticky-notes/` should be gitignored or locally excluded by default because they may contain private material.

## Files to Modify

| File                                   | What to Change                                                                                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                         | Add `sticky:sync`, `sticky:classify`, `sticky:attach`, `sticky:organize`, `sticky:report`, and `sticky:scheduler`.                                                           |
| `system/canonical-surfaces.json`       | Add `sticky-notes-intake-layer` as an internal canonical owner so scans stop routing this work to `client-intake`.                                                           |
| `.gitignore` or `.git/info/exclude`    | Ensure raw note snapshots, personal outputs, and restricted outputs are not committed. Prefer `.gitignore` only for non-sensitive directory patterns.                        |
| `.claude/skills/omninet/SKILL.md`      | Add a trigger rule: when the user references Sticky Notes, Simple Sticky Notes, `Notes.db`, or "organize everything", load the Sticky Notes intake workflow after it exists. |
| `.claude/skills/skill-garden/SKILL.md` | Add Sticky Notes as a supported external guidance source after the intake workflow exists.                                                                                   |

Skill edits must be validated with `node devtools/skill-validator.mjs omninet skill-garden` and a targeted em dash scan before commit.

---

## Database Changes

None.

This feature must not create PostgreSQL migrations for V1. Sticky Notes is local developer intake, not tenant product data. The implementation reads a local SQLite file and writes local JSON/markdown artifacts.

### Migration Notes

- Do not create a migration.
- Do not write to `Notes.db`.
- Do not run `drizzle-kit push`.

---

## Data Model

### Normalized Note Record

```json
{
  "source": "simple-sticky-notes",
  "sourcePath": "C:/Users/david/Documents/Simple Sticky Notes/Notes.db",
  "noteId": 68,
  "rowKey": "68:46141.9511426389:hash",
  "notebook": "David Ferragamo",
  "title": "New Note (60)",
  "text": "raw note text",
  "textLength": 108,
  "hasRichData": true,
  "state": 1,
  "deletedAt": null,
  "starred": false,
  "createdAt": "2026-04-29T13:27:44-04:00",
  "updatedAt": "2026-04-29T22:49:38-04:00",
  "contentHash": "sha256...",
  "ingestedAt": "2026-04-30T11:55:00-04:00"
}
```

### Classification Record

```json
{
  "noteRef": "simple-sticky-notes:68:sha256...",
  "class": "chefFlow.directive",
  "confidence": 0.91,
  "status": "classified",
  "reasons": ["mentions Codex behavior", "contains durable instruction language"],
  "sensitivity": "normal",
  "canonicalOwner": "skill-garden",
  "nextAction": "review_for_skill_patch",
  "duplicateOf": null,
  "staleReason": null
}
```

### Attachment Record

```json
{
  "noteRef": "simple-sticky-notes:68:sha256...",
  "classification": "chefFlow.directive",
  "destination": "system/sticky-notes/actions/skill-garden-candidates/20260430-115500-note-68.md",
  "status": "deferred",
  "requiresReview": true,
  "mayMutateProject": false
}
```

---

## Server Actions

None for V1.

This is an internal local devtools pipeline. It must not add public routes, chef routes, client routes, or server actions until the local command path proves useful and a separate UI spec is approved.

---

## UI / Component Spec

No app UI in V1.

### Command Output

`npm run sticky:organize` should print:

- database path read
- total notes discovered
- new or changed notes
- unchanged notes
- classification counts
- restricted counts
- personal counts
- activated, deferred, archived, and needs-review counts
- report paths
- top 10 high-value ChefFlow items needing review

### Report Layout

Create `system/sticky-notes/reports/YYYYMMDD-HHMMSS-organize.md` with these sections:

1. Summary
2. High-Value ChefFlow Directives
3. Feature and Spec Candidates
4. Bugs and Regressions
5. Personal Notes Separated
6. Restricted or Sensitive Notes
7. Duplicates and Stale Notes
8. Needs Review
9. Proposed Next Actions

### States

- **Loading:** CLI prints the current phase and elapsed time.
- **Empty:** report says no notes found, not "all clear."
- **Error:** command exits non-zero and writes no activation files for the failed phase.
- **Populated:** report shows real counts and destinations from actual records.

### Interactions

- `sticky:sync` captures only raw normalized snapshots.
- `sticky:classify` reads snapshots and writes classification records.
- `sticky:attach` writes destination files from classification records.
- `sticky:organize` runs all three phases in order.
- `sticky:report` regenerates reports from existing records without rereading the database.

No optimistic UI is involved. No command should print success until output files are written and verified readable.

---

## Edge Cases and Error Handling

| Scenario                                     | Correct Behavior                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `Notes.db` missing                           | Exit non-zero with exact missing path. Do not create empty success reports.       |
| Sticky Notes has the database locked         | Retry read-only connection with backoff, then fail clearly.                       |
| Duplicate `ID` rows                          | Use `noteId + updated + contentHash` as the stable row key.                       |
| Empty `TEXT` but non-empty `DATA`            | Mark as `needsReview.richOnly`; do not discard.                                   |
| Timestamp uses OLE Automation format         | Convert with tested conversion logic, not Unix timestamp parsing.                 |
| Note is deleted in Sticky Notes              | Preserve prior snapshots, mark lifecycle `archive.deleted_source`.                |
| Classifier confidence below threshold        | Route to `needsReview`, never guess an activation path.                           |
| Note contains personal data                  | Route to `personal` or `restricted.private`; exclude from ChefFlow reports.       |
| Note contains recipe or culinary creative IP | Route to `restricted.recipeIp`; do not expand, rewrite, or generate recipes.      |
| Ollama unavailable                           | Deterministic classification runs where possible; ambiguous items go to review.   |
| Output directory contains prior run          | Append a new run directory and update latest index atomically.                    |
| Concurrent scheduler and manual run          | Acquire a lock file. Second run exits with "already running" and no partial work. |
| Report generation fails                      | Keep captured and classified records, mark report failure clearly.                |

---

## Verification Steps

1. Run `npm run sticky:sync`.
2. Verify it opens `C:\Users\david\Documents\Simple Sticky Notes\Notes.db` read-only and writes normalized snapshots under `system/sticky-notes/snapshots/`.
3. Run `npm run sticky:classify`.
4. Verify every snapshot receives exactly one lifecycle classification or `needsReview`.
5. Run `npm run sticky:attach`.
6. Verify ChefFlow directives go to skill-garden candidates, features go to spec candidates, personal notes go to personal outputs, restricted notes go to restricted outputs, and no project files are modified.
7. Run `npm run sticky:organize`.
8. Verify the command is idempotent: unchanged notes do not produce duplicate action files.
9. Add or edit one test note in Simple Sticky Notes, then rerun `npm run sticky:organize`.
10. Verify only that note appears as new or changed.
11. Run `node --test --import tsx tests/unit/sticky-notes-normalize.test.ts tests/unit/sticky-notes-classify.test.ts tests/unit/sticky-notes-attach.test.ts`.
12. Run a targeted em dash scan on changed files.
13. Run `git diff --check -- docs/specs/sticky-notes-intake-layer.md system/canonical-surfaces.json package.json devtools/sticky-notes tests/unit`.

No `next build`, `npm run dev`, server restart, deploy, or database migration is required for this spec.

---

## Out of Scope

- No app UI.
- No public route.
- No client route.
- No PostgreSQL tables.
- No mutation of `Notes.db`.
- No deletion or cleanup of Sticky Notes.
- No automatic skill edits without review.
- No automatic queue promotion without V1 governor classification.
- No AI recipe generation, recipe completion, or culinary IP expansion.
- No cloud sync.
- No production deployment.

---

## Notes for Builder Agent

### Implementation Order

1. Add read-only DB reader and fixture-driven normalize tests.
2. Add OLE Automation timestamp conversion tests.
3. Add content hashing and idempotency index.
4. Add deterministic classifier with privacy and recipe IP guardrails.
5. Add optional Ollama classifier only after deterministic classification is safe. Failure must route to `needsReview`.
6. Add attachment writer that writes only under `system/sticky-notes/`.
7. Add reports.
8. Add package scripts.
9. Add optional scheduler script, but do not register the scheduled task unless the developer explicitly asks.
10. Patch skills and canonical surfaces only after the command path exists and tests pass.

### Exact Commands to Build

```text
npm run sticky:sync
npm run sticky:classify
npm run sticky:attach
npm run sticky:organize
npm run sticky:report
npm run sticky:scheduler
```

`sticky:scheduler` must only create or update the Windows scheduled task. It must not start a long-running process.

### Safety Bar

- Read `Notes.db` with read-only SQLite mode.
- Do not write raw note content into git-tracked files by default.
- Do not print full note bodies in terminal output.
- Do not classify low-confidence material as actionable.
- Do not let personal or restricted notes reach `system/v1-builder/*`.
- Do not mutate skills, specs, queues, AGENTS, or CLAUDE from raw note content. Write candidates for review.
- Treat old notes as evidence, not instructions, until freshness and lifecycle status are evaluated.

---

## Spec Validation

1. **What exists today that this touches?** `system/intake/` exists and is locally excluded at `.git/info/exclude:8`. Universal intake already writes categories under `system/intake/*` at `docs/specs/universal-intake-pipeline.md:80` through `docs/specs/universal-intake-pipeline.md:84`. Skill-garden owns durable guidance at `.claude/skills/skill-garden/SKILL.md:3`. External guidance intake already classifies text at `devtools/external-guidance-intake.mjs:48`.
2. **What exactly changes?** Future implementation adds `devtools/sticky-notes/*`, tests, package scripts, local `system/sticky-notes/*` outputs, a canonical surface entry, and narrow skill trigger patches.
3. **What assumptions are you making?** Verified: Sticky Notes uses SQLite and the observed `NOTES` schema. Verified: OLE timestamps are required because Unix parsing showed 1970 dates during inspection. Verified: `better-sqlite3` exists at `package.json:372`. Unverified: whether every rich-text-only note can be decoded from `DATA`; V1 routes those to review.
4. **Where will this most likely break?** SQLite locking by the Sticky Notes app, rich-text-only notes with empty `TEXT`, and false classification between personal material and ChefFlow directives.
5. **What is underspecified?** The final approval UX for promoting candidates into real skill or spec edits. This spec intentionally keeps V1 as candidate generation, not automatic mutation.
6. **What dependencies or prerequisites exist?** Existing Node toolchain, local access to `Notes.db`, and no app server. Optional Ollama classification depends on the approved single Ollama-compatible endpoint rule at `CLAUDE.md:66`.
7. **What existing logic could this conflict with?** `client-intake` due keyword collision in `system/canonical-surfaces.json:186` through `system/canonical-surfaces.json:198`; autonomous V1 builder queues if notes bypass governor; skill-garden if directives are applied directly.
8. **What existing work could this duplicate or fragment?** Universal intake and autonomous builder. This spec avoids duplication by making Sticky Notes a source adapter and candidate generator, while preserving existing attachment destinations.
9. **What is the end-to-end data flow?** Sticky Notes row -> read-only SQLite reader -> normalized snapshot -> content hash index -> classifier -> attachment record -> local destination file -> report -> Codex review -> separate reviewed action into skill patch, spec, triage item, memory packet, personal archive, or restricted archive.
10. **What is the correct implementation order?** Reader and normalization first, tests second, classifier third, attachment fourth, report fifth, package scripts sixth, scheduler last.
11. **What are the exact success criteria?** Every note is captured once, changed notes are detected, each note receives a lifecycle class, personal material is separated, restricted material is excluded from action queues, duplicates do not spam outputs, and Codex can answer "organize everything" from structured reports.
12. **What are the non-negotiable constraints?** No `Notes.db` mutation, no database migration, no production deploy, no server restart, no automatic project mutation from raw notes, no recipe generation, no personal leakage into ChefFlow.
13. **What should NOT be touched?** Client intake routes, public booking, Remy UI, CIL storage, ChefFlow production DB, `types/database.ts`, unrelated dirty files, and existing Sticky Notes content.
14. **Is this the simplest complete version?** Yes. V1 is CLI-first, file-based, read-only from source, no app UI, no database migration.
15. **If implemented exactly as written, what would still be wrong?** It will not be truly continuous unless a scheduled task is enabled. It also produces review candidates, not automatic skill/spec edits. That is intentional for safety.

## Final Check

This spec is production-ready for a local internal builder pass. It is not asking the builder to modify product data, run servers, deploy, or create migrations. The only meaningful uncertainty is rich-text decoding from Sticky Notes `DATA`; V1 handles that by preserving such notes and routing them to review instead of pretending they were understood.
