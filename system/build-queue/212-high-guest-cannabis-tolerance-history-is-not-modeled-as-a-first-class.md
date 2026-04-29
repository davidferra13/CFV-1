---
status: "pending"
priority: "high"
category: "dosing-cannabis"
source: "Jordan Hale"
confidence: "medium"
generated: "2026-04-29T05:58:11.215Z"
---
# Guest cannabis tolerance history is not modeled as a first-class longitudinal safety signal

## Gap
Guest cannabis tolerance history is not modeled as a first-class longitudinal safety signal

## Source
Jordan Hale

## Confidence
medium (PARTIAL)

## Affected Files
- lib/chef/cannabis-actions.ts
- lib/db/migrations/schema.ts
- lib/db/schema/schema.ts

## Search Hints
- guest.cannabis
- cannabis.tolerance
- tolerance.history
- history.modeled
- modeled.longitudinal
- longitudinal.safety
- safety.signal
- guest

## Suggested Approach
Confirm the current codebase state for the affected workflow, then implement the smallest ChefFlow surface that closes this gap without duplicating an existing partial feature.
