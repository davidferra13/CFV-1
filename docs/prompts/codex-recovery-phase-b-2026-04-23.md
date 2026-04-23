# Codex Recovery: Phase B - Memory Palace Reconstruction

You are continuing the Codex Recovery process for ChefFlow. Phase A (inventory) is complete. Your job is Phase B only.

---

## MANDATORY FIRST STEPS

1. Read `CLAUDE.md` at the project root. It is the law of this codebase.
2. Run `bash scripts/session-briefing.sh` then `cat docs/.session-briefing.md`.
3. Read the completed Phase A inventory: `docs/changes/2026-04-23-codex-recovery-inventory.md`.
4. Read the full recovery spec for context: `docs/prompts/codex-recovery-2026-04-23.md` (Phase B section specifically).

---

## SITUATIONAL CONTEXT

From April 19 to April 23, Codex (GPT-5.4) worked unsupervised on ChefFlow. Claude Code was offline. Codex produced 7 commits (98 files, +8404/-1398) and 508 uncommitted file changes (+41303/-13799). Phase A inventoried everything and identified:

- **10 work units** (6 committed, 4 uncommitted)
- **~340 orphan files** with no digest attribution
- **25 high-risk files** touching auth, security, finance, public API, and database
- **6 new tables + 5 modified tables** in schema.ts, most WITHOUT migration SQL
- **1 SQL migration** (event columns made nullable)
- A **CRITICAL schema sync gap**: schema.ts defines tables/columns that may not exist in the live database

Zero Memory Palace entries were created during the Codex period. That is what you are fixing.

---

## YOUR TASK: Phase B Only

Create memory entries for each of the 10 work units so future Claude Code sessions inherit full context. Also create one memory entry for the schema sync gap (it is a critical project-level fact).

### Memory file format

Each file goes in the `memory/` directory. Use this exact frontmatter:

```markdown
---
name: [short name]
description: [one-line description, specific enough to judge relevance in future conversations]
type: project
---

[What was built and why]

**Why:** [motivation, constraint, or stakeholder ask that drove this work]

**How to apply:** [how this should shape future suggestions or decisions]

**Depends on:** [other work units or existing systems this relies on]

**Completion status:** [complete/partial, with specifics on what remains]

**Built by:** Codex (April 22-23, 2026). Not reviewed by Claude Code at time of writing.
```

### What to create (11 memory files)

| # | Slug | Work Unit | Source |
|---|------|-----------|--------|
| 1 | `project_privileged_mutation_policy.md` | Privileged mutation policy contract | Commits 1-2 |
| 2 | `project_quote_prefill_unification.md` | Quote draft prefill unification | Commit 3 |
| 3 | `project_client_interaction_ledger.md` | Client interaction ledger | Commit 4 |
| 4 | `project_task_todo_contract_drift.md` | Task-todo contract drift fix | Commit 5 |
| 5 | `project_client_profile_engine.md` | Client profile engine | Commit 6 |
| 6 | `project_operator_walkthrough_lane.md` | Operator walkthrough lane | Commit 7 |
| 7 | `project_canonical_intake_lanes.md` | Canonical intake lanes | Digest only (uncommitted) |
| 8 | `project_ledger_backed_nba.md` | Ledger-backed next best action | Digest only (uncommitted) |
| 9 | `project_tasks_create_path.md` | Tasks create path reliability | Digest only (uncommitted) |
| 10 | `project_public_intent_hardening.md` | Public intent hardening | Digest + 7 new files (uncommitted) |
| 11 | `project_codex_schema_sync_gap.md` | Schema sync gap (critical) | Phase A inventory finding |

### Information sources for each memory

**For committed units (1-6):** Run `git show <hash> --stat` and read the commit message + diff summary. Cross-reference with the Phase A inventory for risk assessment. For Units 1 and 6, also read the Codex session digest at `docs/session-digests/2026-04-22-draft.md` (it covers multiple units).

**For uncommitted units (7-10):** Read the specific Codex session digest:
- Unit 7: `docs/session-digests/2026-04-22-canonical-intake-lane-truth-pack.md`
- Unit 8: `docs/session-digests/2026-04-22-ledger-backed-next-best-action.md`
- Unit 9: `docs/session-digests/2026-04-22-tasks-create-path-reliability.md`
- Unit 10: `docs/session-digests/2026-04-23-public-intent-hardening.md`

**For schema sync gap (11):** Use the Schema Changes section of the Phase A inventory.

### MEMORY.md index update

After creating all 11 files, add entries to `memory/MEMORY.md` under a new section:

```markdown
## Codex Recovery (April 22-23, 2026)
- [Privileged Mutation Policy](project_privileged_mutation_policy.md) - Auth hardening for privileged mutations. Codex, unreviewed.
- [Quote Prefill Unification](project_quote_prefill_unification.md) - ...
[etc. for all 11]
```

### What NOT to put in memory

- File paths or code patterns (derivable from code)
- Git history details (derivable from git log)
- Debugging solutions (the fix is in the code)
- Anything already in CLAUDE.md
- The full file lists from the inventory (they are in the inventory doc)

Focus on: decisions, dependencies, completion status, what remains open, and WHY things were done.

---

## GROUND RULES

1. **Read CLAUDE.md first.** It overrides everything.
2. **No em dashes.** Anywhere. Use commas, semicolons, colons, or separate sentences.
3. **Phase B only.** Do not run compliance scans, fix code, or start Phase C.
4. **Do not edit source code.** The only files you create are memory files and the MEMORY.md update.
5. **Do not delete any existing memory entries.** Add only.
6. **Every memory must cite its source** (commit hash, digest filename, or inventory section).
7. **Mark every entry as "Built by: Codex. Not reviewed by Claude Code."** This is a trust signal for future sessions.

---

## AFTER PHASE B

Report what you created: file count, any entries where you had insufficient information, and any decisions you had to infer rather than read directly from a source. Then stop and wait for developer review before Phase C.

Phase C prompt is at `docs/prompts/codex-recovery-2026-04-23.md` (Phase C section). Do not execute it until told.
