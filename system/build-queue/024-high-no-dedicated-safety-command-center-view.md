---
status: 'pending'
priority: 'high'
category: 'onboarding-ux'
source: 'Rina Solis'
confidence: 'medium'
generated: '2026-04-27T06:53:59.568Z'
---

# No dedicated safety command center view

## Gap

No dedicated safety command center view

## Source

Rina Solis

## Confidence

medium (PARTIAL)

## Affected Files

- lib/admin/owner-moderation-actions.ts
- lib/gmail/take-a-chef-command-center.ts
- lib/interface/surface-governance.ts

## Search Hints

- safety.command
- command.center
- center.view
- safety
- command
- center

## Suggested Approach

Confirm the current codebase state for the affected workflow, then implement the smallest ChefFlow surface that closes this gap without duplicating an existing partial feature.
