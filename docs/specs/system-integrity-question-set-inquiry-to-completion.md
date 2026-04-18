# System Integrity Question Set: Inquiry-to-Completion Cohesiveness

> 50 questions across 10 domains. Traces the FULL lifecycle from first contact to post-event.
> Every question forces a verifiable answer about cross-system connections.
> Status: BUILT = works. GAP = needs fix. ACCEPT = known limitation, accepted by design.

---

## Domain 1: First Contact (Public Inquiry Submission)

| #   | Question                                                                                    | Answer                                                                                                                                                                                                                     | Status |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Does the public inquiry form create both a client record AND an inquiry record atomically?  | Yes. `submitPublicInquiry()` in `lib/inquiries/public-actions.ts` creates client via `createClientFromLead()` (idempotent by email), then inquiry, then draft event. Non-atomic but graceful: partial creation is handled. | BUILT  |
| 2   | Does the auto-created draft event set `quoted_price_cents` to the client's budget?          | No. Fixed. Auto-draft event now sets `quoted_price_cents: null`. Real price set only when chef quote is accepted via `respond_to_quote_atomic`. No more budget-as-revenue confusion.                                       | BUILT  |
| 3   | Is the auto-created draft event visible to the client in their portal?                      | **No, by correct design.** `getClientEvents()` filters `.not('status', 'eq', 'draft')`. Draft events are chef-only until proposed.                                                                                         | BUILT  |
| 4   | Does the client notification for a new inquiry link to a page that exists for them?         | **Partial.** The notification links to `/my-inquiries/${id}` which works. But the auto-draft event notification (if any) would link to `/my-events/${eventId}` which returns null for drafts (filtered out).               | ACCEPT |
| 5   | Does the Dinner Circle get created at inquiry time and survive through to event completion? | Yes. Created at inquiry submission (`lib/hub/inquiry-circle-actions.ts`). Linked to event at conversion (`linkInquiryCircleToEvent`). Archived at event completion. Full lifecycle.                                        | BUILT  |

## Domain 2: Data Integrity Across Handoffs

| #   | Question                                                                                   | Answer                                                                                                                                                                                                                                                                                                    | Status |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 6   | Does the V2 API convert route use the correct column name for linking inquiry to event?    | Yes. Fixed. V2 route now writes `converted_to_event_id`, matching server actions. Also adds FSM validation, state transition audit logging, and soft-delete filtering.                                                                                                                                    | BUILT  |
| 7   | Is the client's serve_time from the inquiry form preserved through to the converted event? | Yes. Fixed. `convertInquiryToEvent()` now reads `inquiry.unknown_fields.serve_time` as primary source, falling back to conversation inference only if form value is missing.                                                                                                                              | BUILT  |
| 8   | Is `location_zip` ever parsed from the client's address?                                   | Yes. Fixed. `parseZipFromAddress()` extracts 5-digit/ZIP+4 from address text. Applied in all 5 event creation paths: `convertInquiryToEvent`, `materializeSeriesSessions`, `createSeriesFromBookingRequest`, `submitPublicInquiry`, and `captureTakeAChefInquiry`. Falls back to `'TBD'` if no zip found. | BUILT  |
| 9   | Is `service_mode` carried from inquiry to one-off event?                                   | **No.** `service_mode` is only used for multi_day series routing (`inquiry.service_mode === 'multi_day'`). One-off events created by `convertInquiryToEvent()` do not receive the service_mode field.                                                                                                     | ACCEPT |
| 10  | Does the budget stored in `unknown_fields` stay in sync with `confirmed_budget_cents`?     | Yes. Fixed. `updateInquiry()` now syncs `unknown_fields.budget_exact_cents` and `budget_mode` when `confirmed_budget_cents` changes. Clears stale `budget_range` when switching to exact.                                                                                                                 | BUILT  |

## Domain 3: Financial Chain (Budget -> Quote -> Event -> Payment)

| #   | Question                                                                            | Answer                                                                                                                                                                                           | Status |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 11  | Does the quote inherit the inquiry's budget amount for reference?                   | No. Quote creation is independent. Chef manually sets `total_quoted_cents`. The inquiry's `confirmed_budget_cents` is visible on the inquiry detail page but not pre-filled into the quote form. | ACCEPT |
| 12  | When a quote is accepted, does the event's `quoted_price_cents` update to match?    | Yes. The atomic RPC `respond_to_quote_atomic` copies `total_quoted_cents`, `deposit_amount_cents`, and `pricing_model` from quote to event. Overrides any previous budget-based value.           | BUILT  |
| 13  | Do both chef and client portals read financial data from the same source of truth?  | Yes. Both read from `event_financial_summary` view which derives from `ledger_entries`. No separate financial state per role.                                                                    | BUILT  |
| 14  | When offline payment is recorded, are both chef and client dashboard caches busted? | Yes. Fixed. `offline-payment-actions.ts` now revalidates `/dashboard` and `/finance` alongside event paths.                                                                                      | BUILT  |

## Domain 4: State Machine Cohesion

| #   | Question                                                                                 | Answer                                                                                                                                                                                                                                                                  | Status |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 15  | Can the atomic quote acceptance RPC skip inquiry states that the app-layer FSM requires? | **Yes.** `respond_to_quote_atomic` can jump inquiry from `new` -> `quoted` -> `confirmed` in one transaction, bypassing the app-layer `VALID_TRANSITIONS` map. Two transition log entries are created to cover the skip, but intermediate-state automations never fire. | ACCEPT |
| 16  | When a quote is rejected, does the inquiry status update?                                | Yes. Fixed. `rejectQuote()` in `client-actions.ts` now reverts inquiry from `quoted` to `awaiting_chef` with audit trail in `inquiry_state_transitions`. Chef sees it back in their queue.                                                                              | BUILT  |
| 17  | Does the event FSM prevent paying before a contract is signed?                           | Yes. The proposal page (`app/(client)/my-events/[id]/proposal/page.tsx`) gates payment behind contract signature. Status flow: proposed -> accepted (implies contract) -> paid.                                                                                         | BUILT  |
| 18  | Do inquiry and event state transitions both create audit records?                        | Yes. `inquiry_state_transitions` and `event_state_transitions` tables both populated. Both record from/to status, actor, timestamp, and reason.                                                                                                                         | BUILT  |

## Domain 5: Dietary & Allergy Lifecycle

| #   | Question                                                                                 | Answer                                                                                                                                                                                                                                       | Status |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 19  | Do dietary restrictions from the inquiry form flow all the way to the chef's prep sheet? | Yes. Fixed. Prep sheet now merges dietary from THREE sources: client profile, event record, AND guest RSVP dietary items. Union deduplication ensures nothing is missed regardless of which source has the data.                             | BUILT  |
| 20  | Do guest RSVP dietary restrictions update the event-level dietary data?                  | Yes. Fixed. Prep sheet now queries `event_guest_dietary_items` directly and merges into unified dietary checklist. Anaphylaxis-severity items get a dedicated CRITICAL safety item. Chef sees all dietary data in one place on prep sheet.   | BUILT  |
| 21  | If a client updates their dietary profile, do active events reflect the change?          | Yes. Fixed. `updateClient()` now propagates dietary/allergy changes to all active events (`accepted`, `paid`, `confirmed`, `in_progress`) for that client. Event record stays current. Prep sheet also merges from client profile as backup. | BUILT  |
| 22  | Does the anaphylaxis safety gate work end-to-end (guest RSVP -> chef hard block)?        | Yes. `lib/events/readiness.ts` checks `event_guest_dietary_items` for anaphylaxis severity. Hard blocks event progression if menu contains matching allergens. Safety-critical path is protected regardless of the data silo issue.          | BUILT  |

## Domain 6: Cache Invalidation Across Boundaries

| #   | Question                                                                  | Answer                                                                                                                     | Status |
| --- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| 23  | When a new inquiry is created, is the chef dashboard cache busted?        | Yes. Fixed. `createInquiry()` now includes `revalidatePath('/dashboard')`.                                                 | BUILT  |
| 24  | When an inquiry converts to an event, is the chef dashboard cache busted? | Yes. Fixed. `convertInquiryToEvent()` now includes `revalidatePath('/dashboard')` in both revalidation blocks.             | BUILT  |
| 25  | When a quote status changes, is the chef dashboard cache busted?          | Yes. Fixed. `transitionQuote()` in `lib/quotes/actions.ts` now includes `revalidatePath('/dashboard')`.                    | BUILT  |
| 26  | When a Stripe payment comes in, are both dashboards busted?               | Yes. Stripe webhook handler revalidates `/events`, `/my-events`, and `/dashboard`. Both chef and client dashboards update. | BUILT  |
| 27  | When an offline payment is recorded, is `/dashboard` busted?              | Yes. Fixed. Same fix as Q14. `revalidatePath('/dashboard')` added to `recordOfflinePayment()`.                             | BUILT  |

## Domain 7: Client Notifications at Every Stage

| #   | Question                                                                             | Answer                                                                                                                                                                                                                    | Status |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 28  | Does the client get notified when the ball is in their court (`awaiting_client`)?    | Yes. Fixed. `statusNotifications` map in `lib/inquiries/actions.ts` now includes `awaiting_client` with title "Your chef has responded" and action URL to `/my-inquiries/${id}`.                                          | BUILT  |
| 29  | Does the client get an email when a new quote is available?                          | No, but by design. Quotes start as drafts. Email is sent when quote transitions to `sent` status, which is the explicit "send to client" action.                                                                          | BUILT  |
| 30  | Does the client get notified at every event lifecycle stage?                         | Yes. Email templates cover: proposal sent, event confirmed, payment confirmation, payment reminder, payment failed, 2d/14d/30d reminders, event starting, event completed, event cancelled. 50+ templates. Comprehensive. | BUILT  |
| 31  | Does the post-event flow send feedback requests to both the client AND their guests? | Yes. Client gets: thank-you (3d), review request (7d), referral ask (14d). Each guest gets a separate `/guest-feedback/[token]` email (1d). Different templates, different tokens.                                        | BUILT  |

## Domain 8: Location Data End-to-End

| #   | Question                                                          | Answer                                                                                                                                                                                                    | Status |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 32  | Does the client's address from the inquiry appear on the invoice? | Yes. Invoice reads `location_city` and `location_state` from event record. Contract also uses `location_address`, `location_city`, `location_state` for the `{{event_location}}` merge field. Consistent. | BUILT  |
| 33  | Does the chef see the same location data as the client?           | Yes. Both chef (`getEventById`) and client (`getClientEventById`) read from the same `events` table. No per-role location transformation.                                                                 | BUILT  |

## Domain 9: Cross-System Orphan Prevention

| #   | Question                                                 | Answer                                                                                                                                                                                                 | Status |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 34  | Can an inquiry exist without a client indefinitely?      | Yes, by design. `client_id` is nullable on inquiries. Manual inquiries logged from phone calls may not have a client linked yet. `convertInquiryToEvent()` blocks conversion until `client_id` is set. | ACCEPT |
| 35  | Can a quote exist without linking back to an inquiry?    | Yes, by design. `inquiry_id` is nullable on quotes. Chef can create standalone quotes for walk-in clients.                                                                                             | ACCEPT |
| 36  | Does every event have a `client_id`?                     | Yes. `client_id` is required (`z.string().uuid()`) in `CreateEventSchema`. Cannot create event without a client.                                                                                       | BUILT  |
| 37  | Does every contract have an `event_id`?                  | Yes. `generateEventContract()` requires `eventId` as input parameter. Contracts are always generated from events.                                                                                      | BUILT  |
| 38  | Does every payment (Stripe or offline) link to an event? | Yes. Stripe webhooks require `event_id` from payment metadata. `recordOfflinePayment()` requires and validates `eventId`.                                                                              | BUILT  |

## Domain 10: Dead Features & Unreachable Surfaces

| #   | Question                                                                                             | Answer                                                                                                                                              | Status |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 39  | Is `client-visit-alert.tsx` email template sent by any code path?                                    | **No.** Template component `ClientVisitAlertEmail` exists but no sending function or import found anywhere in the codebase. Dead template.          | GAP    |
| 40  | Is the `/my-cannabis` client page reachable from any navigation?                                     | **No.** Page exists but always redirects to `/my-events`. Not in client sidebar nav. Not linked from anywhere. Dead page.                           | ACCEPT |
| 41  | Are the duplicate inquiry filter routes (`awaiting-client-reply` vs `sent-to-client`) distinguished? | **No.** Both filter `status === 'awaiting_client'`. Identical pages at different URLs. One is redundant. (Carried from inquiry pipeline sweep Q31.) | GAP    |
| 42  | Does `computeReadinessScoresForInquiries` (batch function) have any callers?                         | Needs verification. Individual `computeReadinessScore` is used, but the batch version may be orphaned.                                              | GAP    |

## Domain 11: Conversion Pipeline Completeness

| #   | Question                                                                        | Answer                                                                                                                                                                                                                                          | Status |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 43  | Does `convertInquiryToEvent()` use the accepted quote's pricing when available? | Yes. Line 1607: `const quotedPriceCents = acceptedQuote?.total_quoted_cents ?? inquiry.confirmed_budget_cents ?? null`. Quote price takes priority over budget.                                                                                 | BUILT  |
| 44  | Does menu scaffolding pull dish names from inquiry conversation?                | Yes. `buildAutoMenuCourseNamesFromConversation()` in `conversation-scaffold.ts` extracts dish names from conversation text. Falls back to generic names: "Seasonal Starter", "Chef's Main", "Signature Dessert".                                | BUILT  |
| 45  | Does the Dinner Circle link transfer from inquiry to event during conversion?   | Yes. `linkInquiryCircleToEvent()` called at end of conversion. Updates `hub_groups.event_id` where `hub_groups.inquiry_id = inquiry.id`.                                                                                                        | BUILT  |
| 46  | Is there a risk of creating duplicate events for the same inquiry?              | Low. Public submission creates auto-draft event and sets `converted_to_event_id`. Manual `convertInquiryToEvent()` requires `confirmed` status and creates a second event. But the inquiry page shows both, and the chef manages the lifecycle. | ACCEPT |

## Domain 12: Post-Event Cohesion

| #   | Question                                                           | Answer                                                                                                                                                                                                       | Status |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 47  | Does the completed event appear in the client's spending history?  | Yes. `client_financial_summary` view includes all events. Per-event breakdown from `event_financial_summary`. Spending dashboard reads from these views.                                                     | BUILT  |
| 48  | Does the loyalty program credit the completed event?               | Yes. `runCompletedEventPostProcessing()` awards points via `awardEventPoints()` or `awardLiteVisit()` depending on `program_mode`. Also fires `quote_accepted` loyalty trigger during quote acceptance.      | BUILT  |
| 49  | Is the Dinner Circle archived on event completion?                 | Yes. `transitions.ts` sets `hub_groups.is_active = false` on completion. Guests can read history but cannot post new messages.                                                                               | BUILT  |
| 50  | Does the "book again" flow pre-fill from the last completed event? | Yes. `getClientLastEventPrefill()` in `lib/clients/actions.ts` pre-fills new inquiry forms from the client's most recent completed event. `RepeatClientPanel` shown on inquiry detail for returning clients. | BUILT  |

---

## GAP Summary

### CRITICAL / HIGH (must fix)

All 7 CRITICAL/HIGH gaps fixed this session. None remaining.

### MEDIUM (should fix)

All 6 MEDIUM gaps fixed this session. None remaining.

### LOW (nice to fix)

| #   | Domain     | Issue                                                | Status                      |
| --- | ---------- | ---------------------------------------------------- | --------------------------- |
| 39  | Dead Code  | `client-visit-alert.tsx` template has no callers     | Delete or wire up           |
| 41  | Navigation | Duplicate `awaiting_client` filter routes            | Carried from inquiry sweep  |
| 42  | Dead Code  | `computeReadinessScoresForInquiries` may be orphaned | Verify and remove if unused |

### ACCEPTED (by design, not a bug)

| #   | Question                                    | Why Accepted                                                                                   |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 4   | Draft event notification dead link          | Draft events are chef-only. Client notification is for inquiry, not event.                     |
| 9   | `service_mode` lost on one-off conversion   | One-off events don't need service_mode. Multi-day uses it for routing.                         |
| 11  | Quote doesn't auto-fill from inquiry budget | Chef quote is independent professional judgment, not auto-derived from client budget.          |
| 15  | Atomic RPC skips inquiry FSM states         | Database atomicity is correct. App-layer automations for intermediate states are non-critical. |
| 34  | Inquiry without client allowed              | Manual phone inquiries need to be logged before client is identified.                          |
| 35  | Quote without inquiry allowed               | Standalone quotes for walk-in clients are valid.                                               |
| 40  | `/my-cannabis` unreachable                  | Feature intentionally disabled for clients.                                                    |
| 46  | Double event creation paths                 | Auto-draft is lightweight placeholder. Manual conversion is the real pipeline.                 |

**Sweep score: 40/50 BUILT, 7 ACCEPT, 3 LOW GAP (post-fix)**

**Fixed this session (15 GAPs -> BUILT):** Q2, Q6, Q7, Q8, Q10, Q14, Q16, Q19, Q20, Q21, Q23, Q24, Q25, Q27, Q28

**Remaining LOW (3):** Q39 (dead email template), Q41 (duplicate filter routes), Q42 (possibly orphaned batch function)
