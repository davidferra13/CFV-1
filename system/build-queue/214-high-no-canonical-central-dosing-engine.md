---
status: "pending"
priority: "high"
category: "dosing-cannabis"
source: "Jordan Hale"
confidence: "medium"
generated: "2026-04-29T05:58:11.219Z"
---
# No canonical central dosing engine

## Gap
No canonical central dosing engine

## Source
Jordan Hale

## Confidence
medium (PARTIAL)

## Affected Files
- lib/action-graph/bookings.ts
- lib/admin/openclaw-health-actions.ts
- lib/ai/chat-insights.ts

## Search Hints
- canonical.central
- central.dosing
- canonical
- central
- dosing

## Suggested Approach
Confirm the current codebase state for the affected workflow, then implement the smallest ChefFlow surface that closes this gap without duplicating an existing partial feature.
