# Today Guided Dinner Workspace

**Date:** 2026-09-13  
**Status:** Implementation complete; release verification pending  
**Owner:** ChefFlow

## Problem

Today identified the next task, but still made the chef leave the page and rediscover the right event tool. That preserved navigation and decision work at the exact moment the product should remove it.

## Decision

Keep the existing three-section Today surface and turn its dominant card into the guided dinner workspace.

- Show one human workflow label from the existing 17-stage truth engine.
- Complete missing serve time directly inside the dominant card.
- Send other event work to the exact operational route.
- Keep no more than one dominant action.
- Do not add a table, wizard, navigation layer, or database object.
- Do not send client, circle, webhook, or collaborator communication from the inline serve-time action.

## Route Contract

| Work                         | Destination                |
| ---------------------------- | -------------------------- |
| Core event facts and pricing | `/events/[id]/edit`        |
| Grocery work                 | `/events/[id]/grocery-run` |
| Prep work                    | `/events/[id]/prep-plan`   |
| Equipment                    | `/events/[id]/gear`        |
| Packing                      | `/events/[id]/pack`        |
| Timeline                     | `/events/[id]/schedule`    |
| Travel                       | `/events/[id]/travel`      |
| Service                      | `/events/[id]/service`     |
| Safely unclassified work     | `/events/[id]`             |

## Serve-Time Write Contract

The action:

1. Authenticates the chef and requires a tenant.
2. Rate-limits by authenticated user.
3. Validates UUID and `HH:MM` input.
4. Reads the event through event ID plus tenant ID.
5. Allows only draft, proposed, accepted, paid, or confirmed dinners.
6. Uses status and `updated_at` guards when updating.
7. Confirms the persisted value before returning success.
8. Revalidates Today, Events, event detail, schedule, and calendar.
9. Sends no outbound communication.

## Acceptance

- Today still renders three default sections and one dominant action.
- `Set serve time` renders a time input and save button in the primary card.
- An unconfirmed or failed write stays visible as an inline error.
- Successful writes refresh the priority queue only after database confirmation.
- All other mapped event work uses one `Continue` link to its exact tool.
- The full Queue supports the same serve-time action contract.
