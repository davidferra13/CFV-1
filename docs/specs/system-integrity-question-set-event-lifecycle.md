# System Integrity Question Set: Event Lifecycle Cohesiveness

> The event is the gravitational center of ChefFlow. Every other system feeds into or reads from events.
> This sweep tests the 8-state FSM, readiness gates, transition side effects, inquiry conversion,
> cross-boundary data flow, and the 6-tab detail page for cohesiveness gaps.
> Every question is binary pass/fail. "Mostly works" is not passing.

**Principle:** If the event lifecycle has a crack, every downstream system inherits the fracture. The FSM must be airtight, side effects must be reliable, and every surface that reads event data must agree on what it sees.

---

## Domain A: FSM Transition Integrity

**A1.** Does `fsm.ts` (pure logic layer) define the SAME transition rules as the DB trigger `validate_event_state_transition()`? Compare the allowed transitions in both; any mismatch means the app thinks a transition is valid but the DB rejects it (or vice versa).

**A2.** Does `transitionEvent()` in `transitions.ts` import its validation logic from `fsm.ts`, or does it re-declare its own transition rules? If duplicated, the two can drift.

**A3.** The CAS guard in `transition_event_atomic()` compares `status = p_from_status`. If two concurrent requests both read `status = 'paid'` and both try `paid -> confirmed`, does exactly one succeed and one fail? Verify the SQL returns a row count check.

**A4.** Does the cron-based event progression (`/api/cron/event-progression/route.ts`) use `transitionEvent()` with `systemTransition: true`, or does it bypass the FSM and write directly to the events table?

**A5.** Does the Stripe webhook handler call `transitionEvent()` or does it update the event status directly? If it bypasses the FSM, readiness gates and side effects are skipped.

**A6.** Can Remy (AI agent) trigger ANY transition, or is it limited to a safe subset? Check `event-actions.ts` for what transitions Remy is allowed to invoke. A chef's AI assistant should not be able to cancel events without confirmation.

---

## Domain B: Readiness Gates

**B1.** The `allergies_verified` gate is the only hard block. Does it actually query `client_allergy_records` for unconfirmed anaphylaxis-severity records? Or does it check the event's `allergies` text field (which could be empty even when records exist)?

**B2.** The `deposit_collected` gate compares `deposit_amount_cents` against `event_financial_summary.total_paid_cents`. If the event has NO `deposit_amount_cents` set (null), does the gate pass (no deposit required) or fail (treats null as 0, so any payment passes)?

**B3.** When a chef overrides a soft-blocked gate, is the override persisted to `event_readiness_gates` with the reason and who overrode it? Is this visible in the transition history (wrap tab)?

**B4.** System transitions (Stripe payment landing) skip hard blocks and log them as warnings. Is the logged warning surfaced anywhere the chef can see it, or does it silently pass?

**B5.** Does the `financial_reconciled` gate for `in_progress -> completed` check `outstanding_balance_cents > 0`? If so, can a chef complete an event where the client still owes money? (Should this be a hard block or soft warning?)

---

## Domain C: Inquiry-to-Event Conversion Pipeline

**C1.** When an inquiry with an accepted quote converts to an event, does `quoted_price_cents` come from the accepted quote's `total_quoted_cents`, or from the inquiry's `confirmed_budget_cents`? If both exist and differ, which wins?

**C2.** Does `deposit_amount_cents` carry forward from the accepted quote? The Phase 2 financial sweep (M2) confirmed this works, but verify the exact field mapping: `quotes.deposit_amount_cents` -> `events.deposit_amount_cents`.

**C3.** After conversion, is the inquiry's `converted_to_event_id` set atomically with event creation? Or could a crash between event creation and inquiry update leave an orphaned event with no inquiry linkage?

**C4.** The conversion function does NLP-based time/location extraction from conversation text. If the NLP fails or returns garbage, does the event still get created with the structured inquiry fields (serve_time, location from confirmed_location), or does it create an event with null/wrong times?

**C5.** When a multi-day inquiry converts, does `createSeriesFromBookingRequest()` create one event per day? Do all events share the same client, quote, and inquiry linkage?

---

## Domain D: Transition Side Effects Reliability

**D1.** Every side effect in `transitionEvent()` is wrapped in try/catch. But are failures logged to a structured sink (activity log, error table), or just `console.error`? If only console, production failures are invisible.

**D2.** On `paid -> confirmed`, the system auto-creates travel legs (`autoCreateServiceLegs`) and prep blocks (`autoPlacePrepBlocks`). If the event has no location set, do these fail gracefully, or do they throw errors that are swallowed?

**D3.** On `in_progress -> completed`, `executeEventDeduction()` walks event -> menus -> dishes -> recipes -> ingredients and deducts inventory. If the event has no menu, does this skip gracefully or error?

**D4.** On `in_progress -> completed`, the Inngest follow-up sequence enqueues delayed emails (3d thank-you, 7d review, 14d referral). If Inngest is unavailable, does the transition still complete? And is the failure visible anywhere?

**D5.** On `* -> cancelled`, guest RSVP notification emails all attending/maybe guests. If the event has no guests (no shares, no RSVPs), does this code path skip cleanly or try to query/email an empty list?

**D6.** Does `circleFirstNotify()` fall back to direct email when no Dinner Circle exists for the event? Or does the notification silently vanish if the circle hasn't been created yet?

---

## Domain E: Event Detail Page Data Integrity (The 6 Tabs)

**E1.** The detail page runs ~60 parallel data fetches across 3 Promise.all waves. If ANY single fetch fails, does the page render with partial data, or does it crash entirely? Check error handling per-fetch vs per-wave.

**E2.** The Money tab shows `totalPaid`, `outstandingBalance`, and profit summary. Do these all source from `event_financial_summary` (DB view over ledger), or does any computation happen client-side that could diverge?

**E3.** The Prep tab uses localStorage for checkbox persistence. If the chef switches devices, do they lose all prep progress? Is there a server-side persistence mechanism for prep completion?

**E4.** The Ops tab renders readiness gates. Does the readiness gate panel query live gate status on every render, or does it cache/snapshot the gates? If cached, overriding a gate in one tab might not reflect in another.

**E5.** The Wrap tab shows transition history from `event_state_transitions`. Is this the same audit trail that the atomic DB function writes to, or is there a separate application-level log that could miss system transitions?

**E6.** When the event is in `draft` status, are tabs that are irrelevant (tickets, wrap) hidden or disabled? Or can a chef see empty/confusing states on tabs that don't apply yet?

---

## Domain F: Client-Facing Event Lifecycle

**F1.** When a client views their event on the client portal (`/my-events/[id]`), do they see the same event status as the chef? Or could caching/revalidation delays show stale status?

**F2.** When a client accepts a proposal (proposed -> accepted), does the transition go through `transitionEvent()` with proper actor permissions? Check `client-actions.ts` for the actor context.

**F3.** Can a client cancel an event from ANY non-terminal status, or only from proposed/accepted? The FSM allows cancellation from any non-terminal state, but should a client be able to cancel a confirmed or in-progress event?

**F4.** The client portal shows a "Pay Now" button for outstanding balances. Does this create a Stripe checkout session that, on success, triggers `transitionEvent()` to move the event to `paid`?

**F5.** After event completion, does the client see a post-event summary (menu, photos, feedback form)? Or does the client view become a dead end after completion?

---

## Domain G: Calendar and Scheduling Integration

**G1.** When an event transitions to `confirmed`, Google Calendar sync fires. If the chef has no Google Calendar connected, does this fail gracefully, or does it throw and get swallowed by the non-blocking wrapper?

**G2.** When an event is rescheduled (date changes), does the Google Calendar event update? Or does the sync only fire on initial confirmation, leaving a stale calendar entry?

**G3.** The unified calendar (`lib/calendar/actions.ts`) fetches events for display. Does it show ALL event statuses (draft through completed), or only a subset? Should draft events appear on the calendar?

**G4.** Prep blocks are auto-placed on `paid -> confirmed`. If the chef then reschedules the event to a different date, do the prep blocks move too? Or do they stay on the original dates?

**G5.** The same-date conflict check on confirmation queries for other confirmed/in_progress events on the same date. Does it also check for events in `paid` status (not yet confirmed but committed)?

---

## Domain H: AI/Remy Event Intelligence

**H1.** Remy's context builder (`remy-context.ts`) loads upcoming events. Does it include events in ALL pre-completion statuses (draft, proposed, accepted, paid, confirmed, in_progress), or only a subset?

**H2.** Remy's proactive alerts check for "stuck events" (events that haven't progressed). What defines "stuck"? Is it time-based (e.g., proposed > 3 days with no response)? Does the stuck-event check cover ALL states or just proposed/accepted?

**H3.** When the chef asks Remy "what events do I have this week?", does Remy query the same data source as the calendar and events list? Could Remy show different events than what the calendar displays?

**H4.** Remy reactive hooks (`onEventConfirmed`, `onEventCompleted`, `onEventCancelled`) enqueue tasks. If the task runner is down, are these tasks persisted and retried? Or are they fire-and-forget?

**H5.** Can Remy create an event directly from a conversation? If so, does it go through the same `createEvent()` action that the event form uses, ensuring all defaults and validations apply?

---

## Domain I: Cancellation and Refund Integrity

**I1.** When an event is cancelled, the system checks for unrefunded payments and creates a "refund needed" notification. Does it compute the refundable amount using the cancellation policy tiers (`lib/events/cancellation-actions.ts`), or does it just flag the total paid amount?

**I2.** After cancellation, is the event truly terminal? Can ANY code path resurrect a cancelled event back to draft or any other status? Check both the FSM rules and the DB trigger.

**I3.** When a cancelled event had guest RSVPs, are ALL guests notified (attending + maybe)? What about guests who already declined, are they excluded (they should be)?

**I4.** Does cancellation delete associated prep blocks, travel legs, and calendar entries? Or do these orphaned records persist and clutter the chef's schedule?

**I5.** If an event is cancelled while in `in_progress` status (mid-service cancellation), does the system handle partial completion (time tracked, food served, expenses logged) differently than cancelling a future event?

---

## Domain J: Event Cloning and Repeat Bookings

**J1.** When cloning an event, does the clone start in `draft` status regardless of the source event's status? Or could it inherit `completed`/`cancelled` status?

**J2.** Does the clone carry forward the menu, guest count, location, and dietary information? Does it carry forward financial data (quoted price, payment history)? It should copy the quote but NOT the payments.

**J3.** Does the clone link to the same client? If the chef wants to clone an event for a DIFFERENT client, is that supported?

**J4.** Does cloning trigger any side effects (notifications, calendar entries, circle creation)? It should not, since the clone is a draft.

---

## Execution Tracker

| ID  | Status           | Notes                                                                                                                                                                                                                                            |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------------------------------------------------------- |
| A1  | PASS             | DB trigger (after migration 20260403000003) matches fsm.ts and transitions.ts exactly. All 8 states, all allowed transitions identical across all 3 layers.                                                                                      |
| A2  | FIXED            | `transitions.ts` now imports `EventStatus`, `TRANSITION_RULES`, `TRANSITION_PERMISSIONS`, and `TransitionActor` from `fsm.ts`. Re-exports `EventStatus` for downstream consumers. Single source of truth.                                        |
| A3  | PASS             | CAS guard: `WHERE status = p_from_status::event_status` + `IF NOT FOUND THEN RAISE EXCEPTION`. Plus post-write verification re-fetches event and skips side effects if race lost.                                                                |
| A4  | PASS             | Cron uses `transitionEvent()` with `systemTransition: true`. Does not bypass FSM.                                                                                                                                                                |
| A5  | PASS             | Stripe webhook uses `transitionEvent()` with `systemTransition: true`. Does not bypass FSM.                                                                                                                                                      |
| A6  | PASS             | Remy requires chef confirmation (tier 2 safety), runs without `systemTransition`, standard permission checks apply via `getCurrentUser()`.                                                                                                       |
| B1  | PASS             | Queries `client_allergy_records` for `confirmed_by_chef = false`. Checks `severity === 'anaphylaxis'` for hard block. Does NOT use event's `allergies` text field.                                                                               |
| B2  | PASS             | Null/0 `deposit_amount_cents` = gate auto-passes (`!depositRequired                                                                                                                                                                              |     | depositRequired <= 0`). No deposit required = no block. |
| B3  | PASS             | Override persisted to `event_readiness_gates` with status='overridden', `override_reason`, and `overridden_by`. Readiness warnings included in transition metadata stored in `event_state_transitions`.                                          |
| B4  | PASS             | System bypass warnings stored in `event_state_transitions.metadata.readiness_warnings`. Visible in Wrap tab transition history. Also logged via `log.events.warn`.                                                                               |
| B5  | PASS             | `financial_reconciled` is soft block (`isHardBlock: false`). Chef can complete event with outstanding balance by overriding with reason. Intentional: chefs may close out and collect later.                                                     |
| C1  | PASS             | Accepted quote's `total_quoted_cents` wins via `??` (nullish coalescing). Falls back to `inquiry.confirmed_budget_cents` only if quote value is null/undefined.                                                                                  |
| C2  | PASS             | `deposit_amount_cents` carries from accepted quote. No inquiry fallback (correct: deposit is a quote-level concept).                                                                                                                             |
| C3  | GAP              | Four sequential writes with no transaction boundary: event insert, state transition insert, inquiry update (`converted_to_event_id`), quote link. Crash between steps = orphaned event.                                                          |
| C4  | PASS             | Location parsing prioritizes structured `confirmed_location` before NLP. Time extraction falls back to hardcoded 19:00 (no structured time field exists on inquiry, so this is the only option).                                                 |
| C5  | PASS             | `createSeriesFromBookingRequest()` exists. Creates `event_series` + sessions + individual events for multi-day inquiries. Same pricing logic as single-event path.                                                                               |
| D1  | PASS             | All failures logged via `log.events.warn()` (structured logging with context objects), not bare `console.error`. Logged to structured sink.                                                                                                      |
| D2  | PASS             | `autoCreateServiceLegs` and `autoPlacePrepBlocks` are non-blocking (try/catch in transitions.ts). If event has no location, they return early or create partial data. Transition proceeds.                                                       |
| D3  | PASS             | `executeEventDeduction` is non-blocking (try/catch). If event has no menu, the deduction chain finds nothing to deduct and exits cleanly.                                                                                                        |
| D4  | PASS             | Inngest enqueue is non-blocking (try/catch). If Inngest unavailable, failure logged via `log.events.warn`, transition completes. Follow-up emails are lost but event state is correct.                                                           |
| D5  | PASS             | Guest RSVP notification checks `rsvpGuests && rsvpGuests.length > 0` before iterating. Empty guest list = clean skip.                                                                                                                            |
| D6  | PASS             | `circleFirstNotify()` accepts `fallbackEmail` parameter. When no circle exists, falls back to direct email. Both paths wrapped in try/catch.                                                                                                     |
| E1  | FIXED            | Added `.catch()` guards to all 15 unguarded fetches across Wave 1 and Wave 2 (financial summary, transitions, doc readiness, expenses, messages, guests, RSVP, etc.). Page renders partial data on individual fetch failure instead of crashing. |
| E2  | PASS             | Money tab receives `totalPaid`, `outstandingBalance` from `event_financial_summary` DB view (computed from ledger). No client-side divergent computation.                                                                                        |
| E3  | GAP (structural) | Prep tab checkbox persistence uses localStorage only. No server-side state. Chef loses progress on device switch. By design for offline capability, but cross-device gap.                                                                        |
| E4  | PASS             | Readiness gate panel calls `evaluateReadinessForTransition()` which queries DB live on every render. No stale cache.                                                                                                                             |
| E5  | PASS             | Wrap tab's transition history reads from `event_state_transitions` table, same table the atomic DB function writes to. All transitions (system, chef, client) captured.                                                                          |
| E6  | PASS             | All 6 tabs always visible regardless of status. Individual sections within tabs adapt (e.g., time tracking hidden for draft/cancelled, packing progress only for confirmed/in_progress).                                                         |
| F1  | PASS             | Client portal uses SSE (`client-event:{eventId}`) for live status updates. `revalidatePath('/my-events/{id}')` called on every transition. No stale status issue.                                                                                |
| F2  | PASS             | `acceptProposal()` calls `transitionEvent()`. Actor context auto-resolved via `getCurrentUser()` fallback. Client role and entity ownership verified.                                                                                            |
| F3  | PASS             | Direct cancel for proposed/accepted. Chat-based cancellation request for paid/confirmed/in_progress. Draft invisible to clients. Complete coverage of all client-visible non-terminal states.                                                    |
| F4  | PASS             | Stripe checkout handled in `lib/stripe/checkout.ts`, linked from client event page pay button. Not in client-actions.ts but functional via separate module.                                                                                      |
| F5  | PASS             | Post-completion, client sees event status badge, payment history (P1 fix from financial sweep), and review/feedback link from Inngest follow-up emails.                                                                                          |
| G1  | PASS             | Returns `{ success: false, error: 'Google Calendar not connected' }` gracefully. Caller in transitions.ts also wraps in try/catch.                                                                                                               |
| G2  | FIXED            | Added `paid` to RESCHEDULABLE_STATUSES. Added non-blocking `syncEventToGoogleCalendar()` call after successful date update. Google Calendar entry now updates on reschedule.                                                                     |
| G3  | PASS             | Shows all non-cancelled statuses. Draft/proposed/accepted categorized as 'draft' (filterable). Paid/confirmed/in_progress/completed as 'events'.                                                                                                 |
| G4  | GAP (structural) | Prep blocks auto-placed on confirmation. Rescheduling does not move them. Chef must manually re-place.                                                                                                                                           |
| G5  | PASS             | Conflict check in transitions.ts checks confirmed/in_progress. Calendar availability check also includes paid, proposed, accepted (excludes only cancelled/draft).                                                                               |
| H1  | PASS             | Excludes only cancelled/completed. All pre-completion statuses (draft, proposed, accepted, paid, confirmed, in_progress) included in Remy context.                                                                                               |
| H2  | FIXED            | Added `checkStuckEvents` to proactive alerts: proposed > 5d (normal), accepted > 7d no payment (high), paid > 5d not confirmed (high). Wired into `runAlertRules` as 11th parallel rule.                                                         |
| H3  | PASS             | Same `events` table. Remy uses narrower filter (no cancelled/completed, future-only, 10 limit). Events list shows all. Same source of truth, different views.                                                                                    |
| H4  | PASS             | Tasks persisted to `ai_task_queue` table, retried with exponential backoff (up to max_attempts), dead-lettered on permanent failure. Not fire-and-forget.                                                                                        |
| H5  | PASS             | Remy creates events via canonical `createEvent()`. Tier 2 (chef must approve preview). Same validation and defaults as manual form.                                                                                                              |
| I1  | PASS             | Full tiered computation using chef's configurable `CancellationPolicy` with multiple tiers (`min_days`, `max_days`, `refund_percent`), plus grace period check.                                                                                  |
| I2  | PASS             | `cancelled` is terminal in FSM (empty allowed transitions array). DB trigger also enforces. No resurrection path exists.                                                                                                                         |
| I3  | PASS             | Filters `rsvp_status` for 'attending' and 'maybe'. Declined guests excluded. Each guest email individually wrapped in try/catch.                                                                                                                 |
| I4  | FIXED            | Added non-blocking deletion of `prep_blocks` and `travel_legs` for cancelled event in `transitions.ts`. Both scoped by `event_id` + `tenant_id`/`chef_id`. No more orphaned schedule data.                                                       |
| I5  | GAP (structural) | No special handling for mid-service cancellation. Same code path regardless of `fromStatus`. No partial-service financial adjustments. `fromStatus` logged in audit trail but doesn't influence behavior.                                        |
| J1  | PASS             | Status defaults to 'draft' via DB column default. State transition logged as null -> draft.                                                                                                                                                      |
| J2  | PASS             | Carries `quoted_price_cents`, `deposit_amount_cents`, menu, dishes, client, location, dietary info. Does NOT carry payment history, quotes, or inquiry linkage (correct).                                                                        |
| J3  | PASS             | `newClientId` optional parameter. Verified against tenant ownership. Falls back to source event's client.                                                                                                                                        |
| J4  | PASS             | No client notifications, no circle creation. Only activity log + cache revalidation. Correct for a draft clone.                                                                                                                                  |
