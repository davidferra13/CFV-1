# Sticky Notes Promotion Processing - 2026-04-30

## Source

- Manifest: `system/sticky-notes/promotions/latest.json`
- Concrete manifest: `system/sticky-notes/promotions/20260430T164408Z-promotions.json`
- Generated at: `2026-04-30T16:44:08.845Z`
- Processor: Codex, manual governed pass

Raw note bodies remain in ignored local output under `system/sticky-notes/`. This report preserves routing decisions, not private note text.

## Summary

| Metric                                  | Count |
| --------------------------------------- | ----: |
| Promoted packets processed              |    51 |
| Duplicate content groups found          |     5 |
| Unique actionable or reviewable signals |    46 |
| ChefFlow directives                     |    38 |
| ChefFlow bugs or blocker prompts        |     5 |
| ChefFlow feature prompts                |     5 |
| ChefFlow context packets                |     2 |
| ChefFlow spec fragments                 |     1 |

## Processing Decision

The promotion manifest is processed. No raw note directly mutated skills, specs, queues, app code, database schema, or project rules. Every item was either attached to an existing owner, marked as already covered by current operating skills, parked for V1 governor or planner review, or rejected as off-domain or unsafe.

The strongest current signal is not one isolated product feature. It is the operating pattern already captured by `docs/specs/sticky-notes-intake-layer.md` and `docs/specs/autonomous-v1-builder-contract.md`: notes should become governed inputs, then Codex should route work without making David manually re-prompt every step.

## Activated Now

| Note IDs               | Decision                                                                                           | Owner                                                                           | Status                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 34                     | Sticky Notes are the primary fast capture surface and should become an operational input layer.    | `docs/specs/sticky-notes-intake-layer.md`                                       | Activated by the current Sticky Notes intake layer.                       |
| 34, 39, 51, 53         | Codex sessions must read project rules, preserve unrelated dirty work, validate, commit, and push. | `AGENTS.md`, `omninet`, `close-session`, `ship`                                 | Already active in project rules and skills.                               |
| 11, 12, 13, 15         | Old planner, builder, research, and capture prompt templates.                                      | `planner`, `builder`, `research`, `context-continuity`                          | Covered by existing skills. Duplicate note packets archived conceptually. |
| 20, 28, 29, 37, 52, 55 | Full-system audit, decision sequencing, no duplicate builds, and build-ready planning.             | `context-continuity`, `findings-triage`, `v1-governor`, `software-fundamentals` | Covered by current routing loop. No new skill patch needed.               |

## Needs Planner Or Governor

| Note IDs | Classification                                                   | Canonical owner                                                                             | Next action                                                                                                   |
| -------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 43       | V1 support, public discovery SEO gating.                         | `docs/specs/chef-flow-decision-ledger-v1.md`, especially CFDL-025.                          | Build only after a conservative indexability rule is confirmed against data quality.                          |
| 44       | V1 support, mobile public homepage usability.                    | `docs/specs/app-polish-and-completion.md` and `docs/specs/mobile-ux-bugfixes.md`.           | Queue as a focused mobile UX pass. Requires explicit permission to inspect or use any running local server.   |
| 57       | Research, launch-readiness product review.                       | `persona-stress-test`, `persona-build`, `app-polish-and-completion`.                        | Run against actual code and existing persona reports before creating more feature scope.                      |
| 60       | Research or V2, persona archive and generation expansion.        | `persona-inbox`, `persona-generator-and-validator`, `persona-pipeline-v3-upgrades`.         | Attach to persona pipeline. Do not auto-generate public-person profiles without provenance and privacy rules. |
| 63       | Needs planner, system-level sensitive data visibility primitive. | `privacy-data-handling-baseline`, `system-surface-role-classification-foundation`.          | Write a dedicated spec before code because this touches privacy, role visibility, and UI primitives.          |
| 69       | V1 support, inventory and pantry truth.                          | `openclaw-inventory-evolution`, `food-costing-knowledge-system`, `/inventory` app surfaces. | Validate existing inventory movement, counts, demand, and pantry review code before adding new work.          |

## Security, Legal, Or Developer Escalation

| Note IDs | Classification                      | Reason                                                                                                                       | Next action                                                                                         |
| -------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 30       | Security-critical.                  | Role visibility, cross-tenant leakage, privileged surfaces, and hidden implementation detail exposure are release-sensitive. | Route through a security review or dedicated spec. Do not build casually from the note.             |
| 38       | Developer/legal action.             | TAC relationship and lawsuit risk require legal and business judgment.                                                       | Preserve as context. Codex can prepare a factual evidence packet, not provide a legal conclusion.   |
| 65       | Host and swarm capacity governance. | Multi-agent fan-out can overload the local machine and conflict with other agents.                                           | Route through `swarm-governor` or a future host-capacity policy before using large parallel swarms. |

## Rejected Or Non-ChefFlow

| Note IDs | Classification                       | Reason                                                                                                           |
| -------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 23       | Reject for this repo.                | Barcode Buddy is a separate product and should not mutate ChefFlow.                                              |
| 24       | Mixed context, mostly cross-project. | Mentions ChefFlow, Wix, Barcode Buddy, and personal context. Preserve, but do not turn into ChefFlow build work. |
| 52       | Reject for this repo.                | Contains non-ChefFlow system language and does not map to the ChefFlow domain.                                   |
| 58       | Already handled elsewhere.           | References a named spec and agent ownership pattern. Future action should read that spec directly.               |
| 62, 72   | Reference material.                  | Tool or skill inventory notes are useful as context only. Existing project skills are the authoritative surface. |

## Duplicate Groups

The following promoted packets contain duplicate or near-duplicate content and should not create separate work items:

| Duplicate note IDs | Treatment                                                  |
| ------------------ | ---------------------------------------------------------- |
| 11 and 11          | Collapse into one planner prompt template signal.          |
| 12 and 12          | Collapse into one builder prompt template signal.          |
| 13 and 13          | Collapse into one dev-note capture signal.                 |
| 15 and 15          | Collapse into one research or survey material signal.      |
| 31 and 40          | Collapse into one production-system audit and spec signal. |

## Findings Triage

```text
FINDINGS TRIAGE

SOURCE: system/sticky-notes/promotions/latest.json
PROCESSED: 51 promoted packets

ACTIONABLE NOW:
- [unbuilt-memory] Sticky Notes should feed governed project intake -> already activated by Sticky Notes intake layer.
- [stale-entry] Old planner, builder, research, and closeout prompts -> current skills own the behavior.
- [quick-win-candidate] Nearby indexability rule -> attach to CFDL-025, build only after data quality rule review.
- [quick-win-candidate] Homepage mobile cookie and truncation pass -> queue behind V1 governor and verify against current source.

NEEDS PLANNING:
- [security-critical] Role visibility and data exposure hardening -> security spec or review required.
- [needs-planner] Sensitive-data reveal primitive -> dedicated privacy and UI primitive spec required.
- [partial-implementation] Pantry engine idea -> inspect current inventory and pantry code before more scope.
- [research] Persona archive and generation expansion -> persona pipeline owner, provenance rules required.

BLOCKED ON DEVELOPER:
- [developer-action] TAC legal relationship and risk -> requires legal or Founder Authority decision.
- [host-integrity] Large swarm behavior -> requires host-capacity policy before large parallel fan-out.

STALE OR CONTRADICTORY:
- Old direct prompts that say to build everything or verify every environment conflict with current AGENTS hard stops.
- Cross-project notes mentioning Wix or Barcode Buddy are not ChefFlow work unless David creates a separate task.

REJECTED:
- Barcode Buddy production work -> off-domain for this repo.
- Non-ChefFlow trading or broker system language -> off-domain for this repo.
```

## Durable Skill Delta

No skill patch is needed from this pass. The current skill set already covers the promoted operating behavior:

- `omninet` routes Sticky Notes, autonomous build requests, V1 governor checks, context-continuity, and skill-garden.
- `findings-triage` prevents old notes from becoming direct code changes.
- `skill-garden` already treats Simple Sticky Notes as external guidance.
- `autonomous-build-loop` already attaches Sticky Notes to the autonomous builder contract.

The next durable improvement should be a runtime processor that can generate this report automatically from `sticky:promote`, but that is an implementation enhancement, not a required skill change.

## Next Queue

1. Add a `sticky:process` command that turns promoted packets into this kind of safe processing report automatically.
2. Write a dedicated spec for the sensitive-data reveal primitive from note 63.
3. Attach note 43 to public discovery SEO gating under CFDL-025 before implementation.
4. Attach note 69 to existing inventory and pantry surfaces after code inspection.
5. Preserve TAC and legal questions as Founder Authority escalation context, not build work.
