---
name: validation-gate
description: Check user-validation evidence before building new ChefFlow features. Use when a task proposes new product surface, backlog expansion, persona-driven features, survey or Wave-1 operator validation, launch readiness, "validation phase", "no new features without feedback", or when old findings show the team is building without real user evidence.
---

# Validation Gate

Use this skill to decide whether Codex should build, plan, validate, or block a proposed ChefFlow change.

## Pricing Release Exception

Do not use this skill as the primary answer to "what is stopping ChefFlow from release" unless the user explicitly asks about go-to-market, surveys, onboarding, or operator feedback. For ChefFlow release readiness, first route to `pricing-reliability`.

The current existential release gate is whether the pricing data engine can let chefs price real menus from system-owned ingredient data with honest source, freshness, confidence, local coverage, fallback, and quote-safety labels. If that is not proven, surveys or two-week operator trials do not make the app release-ready.

## Core Rule

Do not let backlog pressure masquerade as user validation. A feature idea can be urgent, but Codex must say what evidence supports building it now.

## Evidence Levels

Classify the strongest evidence for the requested work:

- `real-user`: real chef, client, buyer, vendor, staff, or operator feedback from direct use.
- `launched-survey`: Wave-1 or other survey launched, responses collected, and findings available.
- `dogfood`: actual ChefFlow workflow walk-through against the current app.
- `persona-synthesis`: persona pipeline finding, useful but not real market proof.
- `developer-intent`: David explicitly wants it, valid direction but not external validation.
- `spec-only`: written spec with no user proof.
- `stale-memory`: old memory or docs conflict with newer evidence.
- `no-evidence`: no proof beyond "it sounds useful."

## Decision

Use this decision table:

| Evidence            | Default action                                               |
| ------------------- | ------------------------------------------------------------ |
| `real-user`         | Build or plan, depending on risk                             |
| `launched-survey`   | Build or plan the highest-supported gap                      |
| `dogfood`           | Fix broken or partial workflows first                        |
| `persona-synthesis` | Run `findings-triage` and validate against code before build |
| `developer-intent`  | Plan or build only if scope is small or explicitly requested |
| `spec-only`         | Use `planner` or `evidence-integrity` before build           |
| `stale-memory`      | Resolve the stale source before acting                       |
| `no-evidence`       | Do not build; propose validation step                        |

## Exceptions

The validation gate does not block:

- Security fixes.
- Privacy or compliance fixes.
- Financial correctness fixes.
- Bugs, regressions, broken production flows, or type errors.
- Work the developer explicitly assigns despite missing validation.
- Internal agent/skill/process improvements that reduce future error.

Even for exceptions, state that the work is an exception and why.

## Wave-1 Survey Rule

Old findings say Wave-1 operator survey launch is a V1 gate and that validation phase has been declared without enough real feedback.

When a request touches launch readiness, validation, or prioritization unrelated to pricing:

1. Check for current survey evidence in `docs/product-blueprint.md`, `docs/autodocket.md`, `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`, and recent session notes.
2. If the survey is not launched or analyzed, treat launch/distribution as a `developer-action` unless the user asks Codex to prepare the code path.
3. Do not recommend large new features as the next best move when the validation gate itself is unclosed.
4. Prefer actions that produce evidence: survey launch prep, dogfood, persona-build validation, or customer workflow tests.

## Output Format

```text
VALIDATION GATE

REQUEST: [what is being considered]
EVIDENCE: [classification]
DECISION: [build | plan | validate first | blocked | exception]

WHY:
- [short evidence-based reason]

NEXT STEP:
- [smallest useful action]
```

## Closeout

If this skill changes the next action from build to validation, say so plainly. If the developer overrides the gate, proceed but record that the build is developer-directed rather than externally validated.
