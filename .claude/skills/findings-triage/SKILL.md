---
name: findings-triage
description: Normalize old and new ChefFlow findings into safe action classes before planning or building. Use when processing docs/autodocket.md, persona batch synthesis, regression reports, audit findings, memory backlog, build queues, "proceed improving using findings", or any mixed list containing specs, gaps, partial implementations, contradictions, stale entries, developer-only blockers, security items, or persona-generated product demands.
---

# Findings Triage

Use this before building from mixed findings. The goal is to prevent Codex from treating every finding as an immediate code task.

## Source Order

For V1 proof and execution, use the V1 governor source hierarchy first. This is not discovery. It is triage into cannot-fail proof, governed queue execution, or V2 parking.

Primary truth sources:

1. `docs/product-blueprint.md`
2. `docs/v1-v2-governor.md`
3. `docs/specs/v1-control-plane.md`
4. `docs/project-definition-and-scope.md`
5. `docs/definition-of-done.md`
6. `docs/build-state.md` and `docs/session-log.md`

Then prefer these proof and execution sources:

1. Cannot-fail contract specs for pricing, money, intake, allergies, event spine, client truth, public trust, no fake UI, and release proof.
2. `system/v1-builder/approved-queue.jsonl`, `request-ledger.jsonl`, `blocked.jsonl`, `parked-v2.jsonl`, `claims/*.json`, and `receipts/*.json`.
3. System integrity question sets, `docs/app-complete-audit.md`, zero-hallucination, server-action, security, and comprehensive QA audits.
4. Project maps and feature inventories under `project-map/` and `docs/feature-*.md`.
5. Code truth under `app/`, `components/`, `lib/`, `database/migrations/`, `types/`, `scripts/`, and `public/embed/chefflow-widget.js`.
6. Validation sources under `tests/`, `test-results/`, screenshots, regression reports, validation ledgers, and Playwright auth evidence.
7. Persona and market sources only when they reveal a cannot-fail gap after codebase validation.

For older mixed findings work, prefer these sources when present:

1. `docs/autodocket.md`
2. `system/persona-batch-synthesis/priority-queue.json`
3. `system/persona-batch-synthesis/synthesis-*.md`
4. `system/persona-batch-synthesis/validation.json`
5. `system/regression-reports/`
6. `docs/anthropic-*.md`
7. `docs/research/`
8. `docs/specs/`

Use `evidence-integrity` when sources disagree or claim green, healthy, verified, failed, stale, or blocked states.

## V1 Filter

Classify a finding as V1 only if it proves or repairs trust, money, safety, pricing, state continuity, completion, or release proof for the independent chef operating loop.

Park as V2 when the finding adds breadth, polish, niche behavior, scale, marketplace expansion, or power-user convenience without blocking V1 proof.

Do not build directly from execution sources until `v1-governor` has classified the work. Do not build directly from persona or market sources unless code truth confirms a cannot-fail gap.

## Classification

Classify each finding before acting:

- `spec-ready`: a spec exists, is ready, and needs a builder pass.
- `spec-contradiction`: spec status conflicts with timeline, code, or current behavior.
- `unbuilt-memory`: behavior exists only in memory, notes, or conversations.
- `partial-implementation`: code exists but is unwired, unreachable, incomplete, or unsafe.
- `security-critical`: tenant, auth, API trust, secrets, destructive data, or public exposure risk.
- `financial-critical`: ledger, billing, pricing, invoice, costing, tax, payment, or money accuracy risk.
- `hallucination-risk`: UI or docs claim more than the code proves.
- `developer-action`: blocked on David, hardware, accounts, credentials, DNS, repo settings, or artifact dumps.
- `validation-gate`: validation phase, Wave-1 survey, real user feedback, or launch-readiness evidence controls whether work should proceed.
- `host-integrity`: Windows host, scheduled task, watchdog, tunnel, port, launcher, focus, or zombie-process finding.
- `stale-entry`: old memory or docs conflict with newer code or current evidence.
- `persona-demand`: persona-generated gap that still needs codebase validation.
- `quick-win-candidate`: additive, independent, under 30 minutes, no schema, no auth, no billing.
- `needs-planner`: important but underspecified or too risky to build directly.
- `reject`: off-domain, duplicate, unsafe, recipe-generation request, or not ChefFlow-relevant.

## Action Mapping

After classification, route:

| Class                    | Next action                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `spec-ready`             | Use `builder` only after checking dependencies and dirty tree state                  |
| `spec-contradiction`     | Use `evidence-integrity`, then patch the spec or report uncertainty                  |
| `unbuilt-memory`         | Use `planner` before build unless it is clearly a quick win                          |
| `partial-implementation` | Inspect code, then use `builder` or `debug`                                          |
| `security-critical`      | Stop for explicit approval if auth, tenant trust, secrets, or DB risk is unclear     |
| `financial-critical`     | Stop for explicit approval if schema, ledger, billing, or money semantics change     |
| `hallucination-risk`     | Use `hallucination-scan` and fix claims or disable surfaces                          |
| `developer-action`       | Report as blocked; do not fake progress                                              |
| `validation-gate`        | Use `validation-gate`; build only if evidence or explicit override supports it       |
| `host-integrity`         | Use `host-integrity`; inspect read-only first and require approval before disruption |
| `stale-entry`            | Update the source of truth only when evidence is current                             |
| `persona-demand`         | Use `persona-build` validation before coding                                         |
| `quick-win-candidate`    | Use `quick-wins` filters, then build only if verified                                |
| `needs-planner`          | Write or repair a spec with `planner`                                                |
| `reject`                 | Document why it is not actionable                                                    |

## Safety Filters

Never build directly from a finding when it:

- Requires a migration, unless the developer approved the full SQL first.
- Touches auth, tenant scoping, billing, Stripe, ledger, or generated database types.
- Depends on a live server, build, deployment, or long-running process the user did not approve.
- Requires killing, restarting, starting, registering, or unregistering host processes or scheduled tasks without approval.
- Is generated by persona synthesis and not validated against the actual codebase.
- Is developer-only work such as DNS, repo privacy, Mac hardware, artifact dumping, or account setup.
- Expands product scope while the validation gate is unclosed and no explicit override exists.
- Could cause AI to generate recipes or chef creative IP.

## Output Format

```text
FINDINGS TRIAGE

SOURCE: [file or group]
PROCESSED: [count]

ACTIONABLE NOW:
- [class] [finding] -> [next skill/action]

NEEDS PLANNING:
- [class] [finding] -> [missing decision/evidence]

BLOCKED ON DEVELOPER:
- [finding] -> [specific human action]

STALE OR CONTRADICTORY:
- [finding] -> [conflict and proof needed]

REJECTED:
- [finding] -> [reason]
```

## Closeout

If triage creates build tasks or specs, keep them additive and cite the original source. If triage only updates skills, validate the changed skills and commit just those files.
