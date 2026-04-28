---
status: "pending"
priority: "high"
category: "dosing-cannabis"
source: "Dr. Julien Armand"
confidence: "medium"
generated: "2026-04-28T02:09:12.504Z"
---
# No deterministic dose-curve engine

## Gap
No deterministic dose-curve engine

## Source
Dr. Julien Armand

## Confidence
medium (PARTIAL)

## Affected Files
- lib/ai/ace-ollama.ts
- lib/ai/agent-actions/inquiry-response-actions.ts
- lib/ai/agent-actions/lifecycle-circle-actions.ts

## Search Hints
- deterministic.dose-curve
- deterministic
- dose-curve

## Suggested Approach
Confirm the current codebase state for the affected workflow, then implement the smallest ChefFlow surface that closes this gap without duplicating an existing partial feature.
