---
status: "pending"
priority: "low"
category: "uncategorized"
source: "Fred Sirieix"
confidence: "medium"
generated: "2026-04-29T05:58:11.022Z"
---
# Incident Command Workflow:

## Gap
Incident Command Workflow:

## Source
Fred Sirieix

## Confidence
medium (PARTIAL)

## Affected Files
- lib/activity/chef-types.ts
- lib/ai/agent-actions/draft-email-actions.ts
- lib/ai/command-intent-parser.ts

## Search Hints
- incident.command
- command.workflow
- incident
- command
- workflow

## Suggested Approach
Confirm the current codebase state for the affected workflow, then implement the smallest ChefFlow surface that closes this gap without duplicating an existing partial feature.
