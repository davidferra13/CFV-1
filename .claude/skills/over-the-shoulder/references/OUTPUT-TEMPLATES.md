# Output Templates

Use these templates when the user asks for a specific mode. Keep answers compact unless the user asks for a deep pass.

## Feature Review

```md
## Selected Lenses

- Lens - reason - source/card.

## Current Read

- What the feature is trying to become.

## What They Would Notice

- Concrete issues and strengths.

## Mimic Moves

- Source-derived changes to make.

## Rating

- Product:
- UX:
- Architecture:
- Reliability:
- Verification:

## Best Next Move

- One concrete next action.
```

## Build Plan

```md
## Selected Lenses

- Lens - reason - source/card.

## Target Standard

- What this work should feel like when done.

## Build Sequence

1. Tracer bullet.
2. Core workflow.
3. Edge states.
4. Verification/proof.

## Acceptance Criteria

- User-visible proof.
- Data/state proof.
- Runtime proof.

## Cut List

- Tempting work to skip.
```

## Mobile UX Review

```md
## Selected Lenses

- Apple - platform feel/accessibility.
- Airbnb/Cash App/Flighty/etc. - mobile-specific reason.

## Mobile Pass

- Navigation:
- Primary action:
- Thumb reach:
- Text density:
- Empty/loading/error states:
- Motion/feedback:

## Mimic Moves

- Concrete mobile UI changes.
```

## Finance/Tax Review

```md
## Selected Lenses

- QuickBooks/TurboTax/Stripe/etc.

## Money State Model

- Invoice:
- Payment:
- Expense:
- Tax/compliance:
- Reconciliation:

## Trust Gaps

- Ambiguous amounts, missing receipts, weak audit trail, unclear next step.

## Mimic Moves

- Guided questions, review screen, traceable ledger, idempotent payment states.
```

## Reliability Review

```md
## Selected Lenses

- Google SRE/Sentry/Datadog/Cloudflare/etc.

## Reliability Contract

- SLI:
- SLO:
- Error budget:
- Alert:
- Runbook:

## Failure Modes

- What breaks, how users notice, how operators recover.

## Verification

- Tests, logs, browser/runtime proof, monitoring proof.
```

## AI/Agent Review

```md
## Selected Lenses

- OpenAI/Anthropic/Scale/Cursor/etc.

## Model Contract

- What the model may do.
- What deterministic code must own.
- What human approval is required.

## Eval Plan

- Golden tasks:
- Bad cases:
- Regression checks:
- Human review loop:
```
