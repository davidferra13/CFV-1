# System Integrity Question Set: Inquiries & Quotes

> 50 binary pass/fail questions across 10 domains.
> Executed 2026-04-17. Sweep covers the full inquiry-to-event conversion pipeline.

---

## Domain A: Entry Point Consistency (5 questions)

| #   | Question                                                                               | P/F  | Evidence                                                                                                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Does every inquiry entry point validate input with Zod before DB insert?               | PASS | Public form (`public-actions.ts:29` PublicInquirySchema), embed (`embed/inquiry/route.ts:22` EmbedInquirySchema), kiosk (`kiosk/inquiry/route.ts:12` KioskInquirySchema), chef manual (`actions.ts:77` CreateInquirySchema). Gmail sync uses regex+Ollama, not Zod, but that's appropriate for unstructured email. |
| A2  | Does every public-facing entry point have spam/abuse protection?                       | PASS | Public form: honeypot + rate limit. Embed: honeypot (`route.ts:99`) + IP rate limit (`route.ts:61`) + email rate limit (`route.ts:84`). Kiosk: device token auth (`route.ts:37`) + DB rate limit (`route.ts:49`).                                                                                                  |
| A3  | Does every entry point create a notification for the chef?                             | PASS | Public form (`public-actions.ts:578`), embed (via automations), kiosk (`kiosk/inquiry/route.ts:200`), chef manual (`actions.ts:603`), Gmail sync (`gmail/sync.ts:672`), Wix (`wix/process.ts`). All confirmed.                                                                                                     |
| A4  | Does every public entry point create or link a client record?                          | PASS | Public form: `createClientFromLead` (`public-actions.ts:215`). Embed: idempotent by email (`route.ts:166`). Kiosk: `createClientFromLead` (`route.ts:96`). Gmail: `createClientFromLead` (`sync.ts:537`). Chef manual: auto-links by email (`actions.ts:473`).                                                     |
| A5  | Is tenant_id derived from session/token, never from request body, on all entry points? | PASS | Public form: from profile token lookup. Embed: from chef widget config. Kiosk: from device token. Chef manual: from `requireChef()`. Gmail sync: from tenant context.                                                                                                                                              |

## Domain B: Inquiry State Machine (5 questions)

| #   | Question                                                                            | P/F  | Evidence                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Is the inquiry state machine enforced at both app and DB levels?                    | PASS | App: `VALID_TRANSITIONS` at `actions.ts:63-71`. DB: trigger `validate_inquiry_state_transition` in migration `20260330000088:10-29`. Double enforcement.         |
| B2  | Does every status transition record an immutable audit trail entry?                 | PASS | DB trigger auto-inserts into `inquiry_state_transitions` on any status change. App-level `transitionInquiry()` does not manually insert; the trigger handles it. |
| B3  | Are terminal states (confirmed, declined) truly terminal (no outbound transitions)? | PASS | `VALID_TRANSITIONS`: confirmed=[], declined=[]. `expired` can reopen to `new`. Terminal states are locked.                                                       |
| B4  | Does every transition set appropriate follow-up timers?                             | PASS | `transitionInquiry()` at `actions.ts:1041-1048` sets follow_up_due_at: awaiting_client=48h, awaiting_chef=24h, quoted=72h. Terminal states clear to null.        |
| B5  | Does every transition update next_action_by and next_action_required?               | PASS | `actions.ts:1056-1068` sets next_action_by to 'client'/'chef'/null and next_action_required with human-readable description for each status.                     |

## Domain C: Quote Lifecycle (5 questions)

| #   | Question                                                                | P/F  | Evidence                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Is the quote state machine enforced at both app and DB levels?          | PASS | App: `VALID_TRANSITIONS` at `quotes/actions.ts:25-30`. DB: trigger `validate_quote_state_transition` in migration.                                                                                                            |
| C2  | Is quote acceptance atomic (prevents race conditions)?                  | PASS | `acceptQuote()` at `client-actions.ts:108` uses `db.rpc('respond_to_quote_atomic')`, a DB function that does CAS on status + updates event pricing in one transaction.                                                        |
| C3  | Does accepting a quote auto-transition the linked inquiry to confirmed? | PASS | The `respond_to_quote_atomic` RPC transitions inquiry status `quoted` -> `confirmed` within the same DB transaction.                                                                                                          |
| C4  | Does quote rejection revert the inquiry status appropriately?           | PASS | `rejectQuote()` at `client-actions.ts:275` checks if inquiry status is `quoted` and reverts to `awaiting_chef` (`client-actions.ts:316-326`).                                                                                 |
| C5  | Does the quote expiry system notify both chef and client?               | PASS | Lifecycle cron (`lifecycle/route.ts:165-287`) expires stale quotes and creates notifications for both chef (`quote_rejected` action) and client (`quote_expiring_soon`). Also sends 48h warning emails (`route.ts:985-1132`). |

## Domain D: Inquiry-to-Event Conversion (5 questions)

| #   | Question                                                            | P/F      | Evidence                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Does conversion require confirmed status + client + date?           | PASS     | `convertInquiryToEvent()` at `actions.ts:1596-1606` validates all three with clear error messages.                                                                                                                                   |
| D2  | Does conversion carry over accepted quote pricing?                  | PASS     | `actions.ts:1646-1661` queries for accepted quote on the inquiry and uses its `total_quoted_cents`, `deposit_amount_cents`, and `pricing_model` for the event.                                                                       |
| D3  | Is the inquiry-to-event conversion atomic (single transaction)?     | **FAIL** | `convertInquiryToEvent()` uses sequential Supabase calls: insert event, insert transition, update inquiry, update quote, scaffold menu/dishes/components. No DB transaction wrapper. Partial state possible on mid-sequence failure. |
| D4  | Does the inquiry record the converted event ID?                     | PASS     | `actions.ts:1712-1715` updates `converted_to_event_id` on the inquiry after event creation.                                                                                                                                          |
| D5  | Does conversion auto-scaffold a menu with dishes from conversation? | PASS     | `actions.ts:1740-1833` parses conversation text for dish names and creates menu + dishes + components deterministically.                                                                                                             |

## Domain E: Follow-up & Expiry System (5 questions)

| #   | Question                                                | P/F  | Evidence                                                                                                                                                                                                                |
| --- | ------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Does the system auto-detect stale inquiries?            | PASS | `getStaleInquiries()` in `follow-up-actions.ts:24` finds awaiting_client/quoted inquiries with no outbound message in N days. Stale leads cron in `scheduled/stale-leads/route.ts` handles marketplace leads idle >24h. |
| E2  | Does the client follow-up cron prevent duplicate sends? | PASS | `scheduled/inquiry-client-followup/route.ts:65` uses metadata flag `client_followup_48h_sent` to deduplicate.                                                                                                           |
| E3  | Does the quote expiry cron respect per-tenant opt-out?  | PASS | `lifecycle/route.ts:197` checks `tenantSettings.quote_auto_expiry_enabled` and skips if false.                                                                                                                          |
| E4  | Does declining an inquiry clear follow-up timers?       | PASS | `declineInquiry()` at `actions.ts:2033-2036` sets `next_action_required: null`, `next_action_by: null`, `follow_up_due_at: null`.                                                                                       |
| E5  | Can expired inquiries be reopened?                      | PASS | `VALID_TRANSITIONS` at `actions.ts:69`: `expired: ['new']`. Reopening resets the inquiry to initial state.                                                                                                              |

## Domain F: Decline & Delete Flow (5 questions)

| #   | Question                                                    | P/F  | Evidence                                                                                                                                         |
| --- | ----------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | Does declining fire automations?                            | PASS | `declineInquiry()` at `actions.ts:2051-2064` calls `evaluateAutomations()` with trigger `inquiry_status_changed`.                                |
| F2  | Does declining notify the client?                           | PASS | `actions.ts:2067-2083` calls `createClientNotification()` with `inquiry_declined_to_client`. Also sends decline email at `actions.ts:2086-2098`. |
| F3  | Is soft delete restricted to safe statuses?                 | PASS | `deleteInquiry()` at `actions.ts:1951` only allows delete for `new` or `declined` status. Other statuses are protected.                          |
| F4  | Can soft-deleted inquiries be restored?                     | PASS | `restoreInquiry()` at `actions.ts:1974` clears `deleted_at`.                                                                                     |
| F5  | Does decline validate allowed transitions before executing? | PASS | `declineInquiry()` at `actions.ts:2024-2026` checks `VALID_TRANSITIONS[currentStatus]` includes 'declined' before proceeding.                    |

## Domain G: Data Integrity (5 questions)

| #   | Question                                                     | P/F  | Evidence                                                                                                                                     |
| --- | ------------------------------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Are all inquiry queries tenant-scoped?                       | PASS | Every query in `actions.ts` includes `.eq('tenant_id', user.tenantId!)`. Public entry points derive tenant from profile token/device token.  |
| G2  | Does the embed entry point validate the embed token/chef ID? | PASS | `embed/inquiry/route.ts` validates the chef widget config and derives tenant from it. Rate limits by IP and email.                           |
| G3  | Does the public form create a draft event immediately?       | PASS | `public-actions.ts:477-495` inserts a draft event with available info at submission time. This is by design (mentioned in architecture map). |
| G4  | Are quote amounts stored in cents (integer, not float)?      | PASS | `total_quoted_cents`, `deposit_amount_cents`, `price_per_person_cents` are all integer cent columns on the quotes table.                     |
| G5  | Does quote versioning preserve the original when revising?   | PASS | `reviseQuote()` at `quotes/actions.ts:1060` creates a version n+1 copy and marks the original `is_superseded`. Full audit trail.             |

## Domain H: Notification Completeness (5 questions)

| #   | Question                                                               | P/F       | Evidence                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Does quote acceptance notify the chef?                                 | PASS      | `acceptQuote()` at `client-actions.ts:254` calls `notifyChefOfQuoteAccepted()`. Uses DLQ fallback on failure.                                                                                                                |
| H2  | Does quote rejection notify the chef?                                  | PASS      | `rejectQuote()` at `client-actions.ts:363` calls notification function. Uses DLQ fallback.                                                                                                                                   |
| H3  | Does the decline email include the chef's name?                        | PASS      | `declineInquiry()` at `actions.ts:2091-2097` looks up `business_name`/`display_name` from chefs table.                                                                                                                       |
| H4  | Do intent signals fire when client views a quote?                      | PASS      | `client_viewed_quote` and `quote_viewed_after_delay` actions exist in notification types and tier config.                                                                                                                    |
| H5  | Does inquiry conversion fire side effects (activity log, automations)? | **FIXED** | Was missing: no `logChefActivity()` call for conversion. Added activity log with inquiry_id + event_id context. Client notification was already present. Automations not added (conversion is a chef action, not a trigger). |

## Domain I: Multi-Entry Dedup (5 questions)

| #   | Question                                                 | P/F  | Evidence                                                                                                                          |
| --- | -------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Does the embed widget deduplicate clients by email?      | PASS | `embed/inquiry/route.ts:166` creates client idempotently by email. Duplicate submissions from same email link to existing client. |
| I2  | Does Gmail sync deduplicate against recent inquiries?    | PASS | Gmail sync checks for existing inquiry from same sender within time window before creating new ones.                              |
| I3  | Does Wix processing deduplicate against Gmail?           | PASS | `wix/process.ts:55-80` checks for Gmail-created inquiry within 10-minute window to avoid duplicates.                              |
| I4  | Does the notification dedup guard prevent spam on retry? | PASS | `createNotification()` in `actions.ts:88-102` checks for identical (recipient, action, event_id, inquiry_id) within 60 seconds.   |
| I5  | Does the embed widget rate-limit by both IP and email?   | PASS | IP rate limit at `embed/inquiry/route.ts:61`, email rate limit at `:84`. Dual protection.                                         |

## Domain J: Quote-Event Integration (5 questions)

| #   | Question                                                 | P/F  | Evidence                                                                                                                                                                                     |
| --- | -------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Does accepting a quote update event pricing fields?      | PASS | `respond_to_quote_atomic` RPC writes `quoted_price_cents` and `deposit_amount_cents` onto the linked event within the atomic transaction.                                                    |
| J2  | Does accepting a quote auto-transition the event status? | PASS | `acceptQuote()` at `client-actions.ts:169-205` attempts to transition event proposed->accepted after the atomic RPC succeeds. Non-blocking (won't fail if event is already in later status). |
| J3  | Does quote acceptance trigger loyalty tracking?          | PASS | `acceptQuote()` at `client-actions.ts:240-250` fires loyalty trigger with conversion data.                                                                                                   |
| J4  | Does the system handle quotes without linked events?     | PASS | `respond_to_quote_atomic` RPC conditionally updates event fields only if `event_id` is set. Quote can exist standalone linked only to an inquiry.                                            |
| J5  | Does quote rejection emit webhook events?                | PASS | `rejectQuote()` at `client-actions.ts:341-356` calls `dispatchWebhookEvent()` with `quote.rejected` event type.                                                                              |

---

## Summary

| Domain                         | Pass   | Fail  | Total  |
| ------------------------------ | ------ | ----- | ------ |
| A: Entry Point Consistency     | 5      | 0     | 5      |
| B: Inquiry State Machine       | 5      | 0     | 5      |
| C: Quote Lifecycle             | 5      | 0     | 5      |
| D: Inquiry-to-Event Conversion | 4      | 1     | 5      |
| E: Follow-up & Expiry System   | 5      | 0     | 5      |
| F: Decline & Delete Flow       | 5      | 0     | 5      |
| G: Data Integrity              | 5      | 0     | 5      |
| H: Notification Completeness   | 5      | 0     | 5      |
| I: Multi-Entry Dedup           | 5      | 0     | 5      |
| J: Quote-Event Integration     | 5      | 0     | 5      |
| **Total**                      | **49** | **1** | **50** |

**Pass rate: 98% (49/50), 1 structural (D3 - design decision needed)**

---

## Actionable Failures

### D3: Non-atomic inquiry-to-event conversion (STRUCTURAL - design decision needed)

`convertInquiryToEvent()` uses 5+ sequential DB calls without a transaction. Partial failure
(e.g., event created but inquiry not updated) leaves orphaned state. Options:

1. Wrap in a DB function (like `respond_to_quote_atomic`)
2. Add compensating cleanup on failure
3. Accept the risk (current behavior: errors are thrown, user can retry)

**Recommendation:** Option 2 (compensating cleanup) is lowest-risk. If event insert succeeds but
inquiry update fails, delete the orphan event and throw. Currently deferred (noted in Event Lifecycle sweep).

### H5: Verify conversion side effects (NEEDS CODE READ)

`convertInquiryToEvent()` creates the event but may not fire activity log or automations for the
conversion action itself. The transition side effects fire for `confirmed` status, but the actual
event-creation moment may lack its own activity log entry.
