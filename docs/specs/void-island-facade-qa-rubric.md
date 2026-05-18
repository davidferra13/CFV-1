# Void, Island, Facade QA Rubric

This rubric turns `docs/specs/failure-rubric.md` into a build closeout checklist. Use it for product surfaces before a queue item is moved to `done`.

## When To Apply

Apply this rubric when a queue item adds, changes, verifies, or claims completion for a user-facing page, route, workflow, background outcome, dashboard, automation surface, or decision-support panel.

It is optional for pure infrastructure work only when the proof pack explicitly says there is no user-facing product surface.

## Pass/Fail Definitions

| Failure | Fails When                                                                                           | Passes When                                                                                                           | Evidence Required                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Void    | The user takes an action or waits on a process and receives no visible proof that anything happened. | The user sees status, result, next action, history, or recovery within the relevant workflow.                         | Screenshot or route note showing visible state, plus the event/action/result path that produced it.    |
| Island  | Useful data exists but is not connected at the point where the user needs it.                        | Related records are linked and surfaced in the decision view.                                                         | Data wiring note naming source records, joins/selectors/actions, and where the connected data appears. |
| Facade  | A page, card, nav item, or button exists but does not complete the promised job.                     | The surface performs the core loop expected from the mirrored product category, including empty/loading/error states. | Runtime proof showing the core loop, plus edge-case notes for empty, partial, and failure states.      |

## Proof-Pack Requirements

Every product-surface proof pack should include these checks under the existing headings:

## Acceptance Evidence

- Name the mirrored domain and the promised user job.
- State whether Void, Island, and Facade checks pass.
- Include at least one edge case exercised or intentionally deferred with reason.

## Wiring Proof

- Name the files, server actions, API routes, DB queries, or static sources that power the surface.
- For tenant data, identify the auth gate and tenant filter.
- For derived intelligence, identify the source signal and the consuming UI.

## Runtime Proof

- Cite the canonical route checked on `http://localhost:3100`, unless the item is docs-only.
- Include screenshot, recording, or explicit manual route check.
- State console, network, and server-log result for the affected route when applicable.

## Verification Output

- List focused commands, tests, type checks, or smoke checks.
- For UI work, include mobile proof when the queue item or finish check requires it.
- Keep failing checks in the proof pack and block the item instead of marking it done.

## Partial Work Notes

- Name every remaining Void, Island, or Facade risk.
- Link follow-up queue items if the risk is intentionally deferred.

## Domain Probes

Use at least one probe from the mirrored domain that matches the changed surface.

| Domain                | Probe Question                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| CRM / clients         | Can the chef see last contact, upcoming work, money, dietary notes, and next action without rebuilding the relationship mentally?         |
| Events / booking      | Does the event surface show current status, payment/menu/prep readiness, and the next required action before the chef hunts through tabs? |
| Recipes / culinary    | Does the recipe show yield, cost, scaling, allergens, provenance, and event usage where menu decisions happen?                            |
| Finance               | Can the chef trust what is paid, owed, overdue, profitable, and reconciled without exporting to another tool?                             |
| Proposals / quotes    | Can the chef see draft/sent/viewed/accepted/declined state, linked event/client, value, last activity, and follow-up need?                |
| Kitchen ops           | Does the chef get a consolidated, time-sequenced prep or service view for the relevant event or day?                                      |
| Inventory / shopping  | Can the chef generate or inspect what to buy from event/menu/recipe demand, with inventory subtraction and vendor/store grouping?         |
| Staff                 | Does the surface answer who is assigned, available, unconfirmed, and costly for upcoming work?                                            |
| Marketing / email     | After sending or scheduling, can the chef see delivery/send history and the linked client or campaign result?                             |
| Pipeline / sales      | Does the surface show stage, value, age, next action, stale risk, and forecast instead of redirecting to another product promise?         |
| Calendar / scheduling | Are prep time, travel time, conflict risk, blocked dates, and availability truth visible at booking and planning time?                    |
| Guests / loyalty      | Are visit history, dietary restrictions, preferences, spend/tier, and next hospitality action surfaced during planning?                   |

## Queue Closeout Rule

Do not move a product-surface item to `done` when:

- Any required proof-pack heading is missing.
- Runtime proof only says the page exists.
- Data wiring proof names no source of truth.
- A button, card, or nav item is visible but unwired.
- Empty, loading, error, or partial-data states are unknown.
- The surface still forces the chef to leave ChefFlow to complete the promised job.

When a rubric failure remains, move the item to `blocked` with the specific failure type and create or link a follow-up queue item.
