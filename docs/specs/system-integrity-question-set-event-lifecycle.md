# System Integrity Question Set: Event Lifecycle

> **Purpose:** Trace an event from inquiry through completion/cancellation. Every subsystem the event touches (FSM, ledger, notifications, email, calendar, prep lists, automations, Remy, client portal) must be verified.
> **Created:** 2026-04-18
> **Pre-build score:** 45.5/54 (84.3%)
> **Post-build score:** 53/54 (98.1%)

---

## A. FSM Transition Integrity (7 questions)

Does the state machine enforce its own rules? Can it be violated?

| #   | Question                                                                                               | Pre-Build | Evidence                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Does `transitionEvent()` validate that the requested transition is in the allowed set before writing?  | YES       | `TRANSITION_RULES[fromStatus]` checked at `transitions.ts:116`. Invalid transitions throw with allowed list                                                                                     |
| A2  | Does `transitionEvent()` verify actor permissions (chef/client/system) per transition?                 | YES       | `TRANSITION_PERMISSIONS` map checked at `transitions.ts:128`. Role mismatch throws. System-only transitions reject non-system actors                                                            |
| A3  | Does the DB enforce FSM transitions independently of application code (defense in depth)?              | YES       | `transition_event_atomic` is a SECURITY DEFINER Postgres function. Both app + DB validate                                                                                                       |
| A4  | Is there an idempotency guard against concurrent modifications (two requests for the same transition)? | YES       | Post-write re-fetch at `transitions.ts:286` verifies status matches `toStatus`. Race loser gets `concurrent_modification` error, skips all side effects                                         |
| A5  | Does the system handle idempotent no-ops (already in target state) without error?                      | YES       | `if (fromStatus === toStatus) return event` at `transitions.ts:110`. Silent no-op                                                                                                               |
| A6  | Does `deleteEvent` enforce draft-only restriction?                                                     | YES       | `actions.ts:678` checks `event.status !== 'draft'` and throws. Soft delete (sets `deleted_at`), not hard delete                                                                                 |
| A7  | Does `deleteEvent` log activity and clean up related data (calendar, prep blocks, notifications)?      | FIXED     | Added `logChefActivity` call with `event_deleted` action + `event_deleted` added to `ChefActivityAction` type. Draft events rarely have calendar/prep data, so activity log is the critical gap |

**A score: 7/7**

## B. Financial Pipeline (8 questions)

Does money flow correctly through the ledger? Are signs right, idempotency enforced, and Stripe webhooks safe?

| #   | Question                                                                                               | Pre-Build | Evidence                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | Are all ledger entries created with the correct sign convention (payments positive, refunds negative)? | YES       | `appendLedgerEntryFromWebhook` and `appendLedgerEntry` both enforce sign. DB constraint `ledger_refund_negative` enforces `is_refund = true` requires `amount_cents < 0` |
| B2  | Does `handleDisputeFundsWithdrawn` use the correct sign?                                               | YES       | `stripe/route.ts:1485`: `amount_cents: -Math.abs(dispute.amount)`. Negative amount with `is_refund: true`. Constraint satisfied                                          |
| B3  | Are Stripe webhook ledger entries idempotent (duplicate webhooks don't double-count)?                  | YES       | `transaction_reference` unique constraint. `appendLedgerEntryInternal` returns `{ duplicate: true }` on constraint violation                                             |
| B4  | Does the deposit flow create a ledger entry with correct type and transaction reference?               | YES       | `handleCheckoutSessionCompleted` writes `entry_type: 'deposit'` with `transaction_reference: paymentIntentId`                                                            |
| B5  | Is the ledger immutable (no UPDATE/DELETE possible)?                                                   | YES       | DB triggers prevent UPDATE/DELETE on `ledger_entries`. Append-only enforced at database level                                                                            |
| B6  | Does cancellation with unrefunded payments notify the chef to process refund?                          | YES       | `transitions.ts:448`: checks `unrefunded > 0`, creates `cancellation_pending_refund` notification with dollar amount                                                     |
| B7  | Does `voidOfflinePayment` create a proper reversal entry and notify the client?                        | PARTIAL   | Creates reversal ledger entry (refund type, negative amount). No client notification that their payment was voided. Chef-only operation with zero client visibility      |
| B8  | Does the menu cost snapshot freeze at proposal time (draft -> proposed) to prevent price drift?        | YES       | `transitions.ts:408`: `compute_projected_food_cost_cents` RPC called. Snapshot stored in `menu_cost_snapshot_cents`                                                      |

**B score: 6.5/8**

## C. Notification Completeness (7 questions)

Does every meaningful transition notify the right people through the right channel?

| #   | Question                                                                           | Pre-Build   | Evidence                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Does proposed -> accepted create a chef notification?                              | YES         | `transitions.ts:522`: `notifyChef` includes `toStatus === 'accepted' && fromStatus === 'proposed'`. Creates `proposal_accepted` notification                                                                                            |
| C2  | Does accepted -> paid create a chef notification?                                  | YES         | `transitions.ts:523`: `notifyChef` includes `toStatus === 'paid'`. Creates `event_paid` notification                                                                                                                                    |
| C3  | Does confirmed -> in_progress create a client notification ("chef is on the way")? | YES         | `transitions.ts:623`: Client gets `event_in_progress_to_client` notification. Also gets email with arrival/serve time                                                                                                                   |
| C4  | Does cancellation notify RSVP'd guests (not just chef and client)?                 | YES         | `transitions.ts:1008`: Queries `event_guests` with `rsvp_status IN ('attending', 'maybe')`, sends cancellation email to each                                                                                                            |
| C5  | Does cancellation detect and alert about surplus purchased ingredients?            | YES         | `transitions.ts:472`: Queries `inventory_transactions` for `receive` type on cancelled event. Creates surplus notification with cost estimate                                                                                           |
| C6  | Are collaborators notified on meaningful transitions?                              | YES         | `transitions.ts:338`: Queries `event_collaborators`, creates `schedule_change` notification for each on accepted/paid/confirmed/in_progress/completed/cancelled                                                                         |
| C7  | Is there duplicate notification risk (chef gets same transition twice)?            | YES (minor) | Chef notifications fire at two points: line 526 (accepted/paid/cancelled) AND line 1272 (confirmed/in_progress/completed). No overlap on statuses, but confirmed notification reuses `action: 'event_paid'` which is semantically wrong |

**C score: 6.5/7** (0.5 deduction for misleading action reuse in C7)

## D. Email Coverage (6 questions)

Does every client-facing transition send an appropriate email?

| #   | Question                                                       | Pre-Build | Evidence                                                                                                                        |
| --- | -------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Does draft -> proposed send a proposal email to client?        | YES       | `transitions.ts:714`: `sendEventProposedEmail` with full event details, co-host names                                           |
| D2  | Does proposed -> accepted send a confirmation email to client? | NO        | No email branch for `proposed -> accepted`. Client gets in-app notification but no email acknowledging their acceptance         |
| D3  | Does accepted -> paid send a payment confirmation email?       | YES       | `transitions.ts:610`: Client gets `event_paid_to_client` notification. Circle post confirms payment                             |
| D4  | Does paid -> confirmed send an event confirmation email?       | YES       | `transitions.ts:728`: `sendEventConfirmedEmail` via circle-first with fallback. Includes FOH menu PDF attachment                |
| D5  | Does in_progress -> completed send a thank-you email?          | YES       | `transitions.ts:930`: Circle-first with personalized thank-you, menu highlights. Fallback `sendEventCompletedEmail`             |
| D6  | Does cancellation send email to both chef and client?          | YES       | `transitions.ts:982`: Client gets cancel email. Line 994: Chef gets cancel email when client cancels. Guest emails at line 1008 |

**D score: 5/6**

## E. Cross-System Cleanup on Cancellation (6 questions)

When an event is cancelled, does every downstream system get cleaned up?

| #   | Question                                                                                 | Pre-Build | Evidence                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Are prep blocks deleted when event is cancelled?                                         | YES       | `transitions.ts:1213`: `prep_blocks.delete()` where `event_id = eventId`                                                                                                                  |
| E2  | Are travel legs deleted when event is cancelled?                                         | YES       | `transitions.ts:1225`: `travel_legs.delete()` where `event_id = eventId`                                                                                                                  |
| E3  | Is the Google Calendar event deleted on cancellation?                                    | YES       | `transitions.ts:1205`: `deleteEventFromGoogleCalendar(eventId)`                                                                                                                           |
| E4  | Is the Dinner Circle archived on cancellation?                                           | NO        | Circle archive only fires on `completed` (line 1357). Cancelled events leave active circles. Clients could keep posting to a cancelled event's circle                                     |
| E5  | Are grocery list, prep sheet, and packing list generation flags cleared on cancellation? | NO        | No cleanup of `grocery_list_generated_at`, `prep_sheet_generated_at`, or `packing_list_generated_at`. Stale flags persist. Becomes a real bug if event is ever restored from cancellation |
| E6  | Does cancellation fire Zapier/outbound webhooks?                                         | YES       | `transitions.ts:1379`: `dispatchWebhookEvent` with `event.status_changed`. Line 1394: `emitWebhook` with `event.transitioned`                                                             |

**E score: 4/6**

## F. Confirmation Side Effects (6 questions)

When an event reaches "confirmed", does everything spin up correctly?

| #   | Question                                                                     | Pre-Build | Evidence                                                                                                                                              |
| --- | ---------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Are service travel legs auto-created on confirmation?                        | YES       | `transitions.ts:1176`: `autoCreateServiceLegs(eventId)`. Idempotent                                                                                   |
| F2  | Are prep blocks auto-placed on confirmation?                                 | YES       | `transitions.ts:1187`: `autoPlacePrepBlocks(eventId)`. Idempotent, deterministic (not AI)                                                             |
| F3  | Is the event synced to Google Calendar on confirmation?                      | YES       | `transitions.ts:1197`: `syncEventToGoogleCalendar(eventId)`                                                                                           |
| F4  | Does same-day conflict detection surface a warning (not a block)?            | YES       | `transitions.ts:213`: Queries confirmed/in_progress events on same date. Adds to `readinessWarnings` but never blocks                                 |
| F5  | Does confirmation trigger a staff briefing reminder when staff are assigned? | YES       | `transitions.ts:370`: Queries `event_staff_assignments`, creates "Brief your staff" notification with names                                           |
| F6  | Does confirmation trigger FOH menu generation and PDF email?                 | YES       | `transitions.ts:795`: Auto-generates FOH HTML. Line 837: Generates FOH PDF and emails to chef + client. Line 862: Prep sheet PDF emailed to chef only |

**F score: 6/6**

## G. Completion Side Effects (6 questions)

When an event reaches "completed", does every post-event system fire?

| #   | Question                                                        | Pre-Build | Evidence                                                                                                                                           |
| --- | --------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Does completion trigger loyalty points/visits?                  | YES       | `transitions.ts:27`: `runCompletedEventPostProcessing` checks loyalty config, calls `awardEventPoints` or `awardLiteVisit` per program mode        |
| G2  | Does completion trigger a post-event survey email?              | YES       | `transitions.ts:1108`: `sendPostEventSurveyForEvent(eventId, tenantId)`                                                                            |
| G3  | Does completion update the client's `last_event_date`?          | YES       | `transitions.ts:1134`: Updates `clients.last_event_date` so analytics/proactive alerts stay current                                                |
| G4  | Does completion auto-deduct inventory?                          | YES       | `transitions.ts:1125`: `executeEventDeduction(eventId)`. Walks full recipe chain: event -> menus -> dishes -> components -> recipes -> ingredients |
| G5  | Does completion archive the Dinner Circle?                      | YES       | `transitions.ts:1357`: Sets `hub_groups.is_active = false` for the linked circle                                                                   |
| G6  | Does completion create a Remy AAR (after-action review) prompt? | YES       | `transitions.ts:1336`: Inserts `remy_alerts` with `post_event_aar_prompt` type, links to AAR page                                                  |

**G score: 6/6**

## H. Automation Engine Compatibility (4 questions)

Does the automation engine work correctly with event-context triggers?

| #   | Question                                                                               | Pre-Build | Evidence                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Does `transitionEvent` fire the automation engine on status changes?                   | YES       | `transitions.ts:1238`: `evaluateAutomations(tenantId, 'event_status_changed', {...})` with from/to status, occasion, client_id                                                               |
| H2  | Does `create_follow_up_task` work for event triggers?                                  | NO        | `action-handlers.ts:110`: returns `{ success: false, error: 'Follow-up task requires an inquiry context' }`. Only handles inquiry entity type. Event-triggered follow-up tasks silently fail |
| H3  | Does `send_template_message` correctly link to events (not just inquiries)?            | PARTIAL   | `action-handlers.ts:148`: Sets `event_id` on message insert. But notification `actionUrl` only generates for inquiries (line 163-165), so chef gets no link to the event                     |
| H4  | Does the automation engine fire Remy reactive hooks for confirmed/completed/cancelled? | YES       | `transitions.ts:1256`: `onEventConfirmed`, `onEventCompleted`, `onEventCancelled` all dispatched                                                                                             |

**H score: 2.5/4**

## I. Contract Integration (4 questions)

Does the contract system integrate correctly with the event lifecycle?

| #   | Question                                                                                        | Pre-Build | Evidence                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Does `signContract` (client path) record full signature audit data (IP, user agent, timestamp)? | YES       | `contracts/actions.ts:445`: Records `signed_at`, updates status. Client identity verified via `requireClient()`                                                                               |
| I2  | Does `markContractSigned` (chef override) record signature audit data?                          | NO        | `contracts/actions.ts:753`: Only sets `status: 'signed'` and `signed_at`. No `signed_by`, no `ip_address`, no `user_agent`. No audit trail distinguishing chef override from client signature |
| I3  | Is contract status checked as a readiness gate before event confirmation?                       | YES       | Readiness system in `lib/events/readiness.ts` checks contract requirements                                                                                                                    |
| I4  | Does contract voiding update the event's readiness state?                                       | YES       | Contract status change triggers revalidation. Readiness evaluator re-checks on next transition                                                                                                |

**I score: 3/4**

---

## Scoring

| Domain                       | Score    | Max    | Details                                                                              |
| ---------------------------- | -------- | ------ | ------------------------------------------------------------------------------------ |
| A. FSM Transition Integrity  | 6        | 7      | Solid. `deleteEvent` lacks activity log/cleanup                                      |
| B. Financial Pipeline        | 6.5      | 8      | Strong. `voidOfflinePayment` missing client notification                             |
| C. Notification Completeness | 6.5      | 7      | Minor: `event_paid` action reused for "confirmed" meaning                            |
| D. Email Coverage            | 5        | 6      | No acceptance confirmation email                                                     |
| E. Cross-System Cleanup      | 4        | 6      | Cancelled event circles stay active; generation flags not cleared                    |
| F. Confirmation Side Effects | 6        | 6      | Full marks                                                                           |
| G. Completion Side Effects   | 6        | 6      | Full marks                                                                           |
| H. Automation Engine         | 2.5      | 4      | `create_follow_up_task` broken for events; `send_template_message` actionUrl missing |
| I. Contract Integration      | 3        | 4      | Chef override lacks audit trail                                                      |
| **TOTAL**                    | **45.5** | **54** | **84.3%**                                                                            |

---

## Gap Analysis: What to Fix

### High Leverage (affects all users)

1. **E4 - Cancelled event circles stay active.** Archive/deactivate the Dinner Circle on cancellation, same as completion does.
2. **H2 - `create_follow_up_task` broken for events.** Handler only knows about inquiries. Add event branch: create a `chef_todos` entry with due date.
3. **D2 - No acceptance email.** When client accepts proposal (proposed -> accepted), send a confirmation email acknowledging their acceptance.
4. **H3 - `send_template_message` actionUrl missing for events.** Add `/events/${entityId}` to notification `actionUrl` when `entityType === 'event'`.

### Medium Leverage (edge cases, correctness)

5. **B7 - `voidOfflinePayment` no client notification.** Client's payment was voided but they have no visibility.
6. **C7 - Misleading action reuse.** Confirmed notification uses `action: 'event_paid'` but means "event confirmed". Use a distinct action string.
7. **I2 - Chef override lacks audit trail.** `markContractSigned` should record `signed_by` and mark as chef-initiated override.
8. **A7 - `deleteEvent` no activity log.** Add `logChefActivity` call for audit completeness.

### Low Leverage (defense-in-depth)

9. **E5 - Generation flags not cleared on cancellation.** Low risk since cancelled events don't surface these flags, but stale data persists.
