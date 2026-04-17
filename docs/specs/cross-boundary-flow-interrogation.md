# Cross-Boundary Flow Interrogation: All-User System Integrity

> **Created:** 2026-04-16
> **Scope:** Every flow where one user's action must produce correct results for another user type
> **Method:** Code-level trace of data propagation across chef/client/guest/public boundaries
> **Principle:** ALL users benefit. Every question tests a chain, not a single surface.

---

## Scorecard Summary

### Initial Audit (2026-04-16)

| Grade       | Count   | Meaning                                             |
| ----------- | ------- | --------------------------------------------------- |
| **Working** | 43 / 57 | Full chain verified, all parties see correct data   |
| **Partial** | 12 / 57 | Chain exists but data loss or delay at boundary     |
| **Missing** | 2 / 57  | Chain broken: one party's action invisible to other |
| **Broken**  | 0 / 57  | Chain produces wrong data for downstream user       |

Score: 75% Working, 21% Partial, 4% Missing, 0% Broken

---

## Phase 1: Inquiry-to-Quote Chain (Q1-Q8)

_Public visitor submits inquiry -> chef sees it -> chef quotes -> client reviews_

### Q1: Public inquiry data arrives complete to chef dashboard

When a public visitor submits inquiry via `/chef/[slug]/inquire`, does the chef see ALL submitted fields (dietary, budget, occasion, date, guest count, serve time, notes) on their inquiry detail page? Or is data silently dropped at the boundary?

**Grade: Working.** Public inquiry form (`components/public/public-inquiry-form.tsx`) collects all fields. `submitPublicInquiry()` (`lib/inquiries/public-actions.ts:298-322`) persists to `confirmed_*` columns plus `source_message` (concatenated text) and `unknown_fields` (structured JSON). Chef inquiry detail page (`app/(chef)/inquiries/[id]/page.tsx:693-766`) renders all confirmed facts. Full chain verified.

### Q2: Embed widget inquiry parity with direct form

Does an inquiry from the embeddable widget (`/api/embed/inquiry`) produce the same chef-facing record as the public inquiry form (`submitPublicInquiry`)? Same fields populated, same status, same notifications triggered?

**Grade: Working.** Embed API route (`app/api/embed/inquiry/route.ts:21-48`) accepts same core fields. Creates client + inquiry + draft event (lines 264-356) with same status ('new'), channel ('website'), same email notifications. Two intentional differences: embed captures UTM/GDPR fields, and uses simpler allergy_flag instead of structured picker. Effective parity.

### Q3: Chef response time visible to client

When chef views but doesn't respond to an inquiry, does client have any visibility into whether it was seen? Read receipts, "viewed" status, or time-since-submission indicator?

**Grade: Working.** No read receipts on raw inquiries, but once a quote exists: `ActivityTracker` on `/my-quotes/[id]` (line 238-249) fires `quote_viewed` events. `intent-notifications.ts:135-149` sends chef in-app alert ("is looking at a quote") with 2-hour dedup. Engagement score system weights `quote_viewed` at 20 points. Chef sees client engagement badges on inquiry detail. The pre-quote phase has no visibility, but post-quote is comprehensive.

### Q4: Quote notification reaches client reliably

When chef creates and sends a quote, what notification channels fire? Email, in-app, SMS, push? What if client email bounces? What if client has no auth account (inquiry-only)?

**Grade: Working.** `transitionQuote()` to 'sent' (`lib/quotes/actions.ts:634-756`) fires: (1) Circle-first notification via Dinner Circle, (2) fallback email via `QuoteSentEmail` template (lines 698-720), (3) in-app client notification (lines 728-739). Notification failure surfaces warnings to chef ("Quote saved but email delivery failed") plus `recordSideEffectFailure`. If client has no account, email still goes to `client.email` from clients table.

### Q5: Quote pricing matches across all views

Does the total shown on chef's quote builder match exactly what client sees on `/my-quotes/[id]`? Same line items, same tax, same total? No rounding differences?

**Grade: Working.** Both views use `formatCurrency()` from `lib/utils/currency.ts`. All amounts stored as integer cents (`total_quoted_cents`, `price_per_person_cents`, `deposit_amount_cents`). Client detail page (`app/(client)/my-quotes/[id]/page.tsx:86-129`) reads same quote record. `createQuote()` validates per-person math within 100 cents tolerance. No rounding drift possible with integer storage.

### Q6: Quote expiry enforced symmetrically

When a quote expires, does it lock on BOTH chef and client side simultaneously? Can chef still edit an expired quote? Can client still accept? Who gets notified?

**Grade: Working.** Client-side: `acceptQuote()` in `client-actions.ts:127-129` checks `valid_until < now()` and throws "This quote has expired." Chef-side: `transitionQuote()` (lines 567-569) blocks sending expired quotes. Lifecycle cron auto-transitions past `valid_until` to 'expired'. 48-hour warning system sends notifications to both parties. Chef can revise expired->draft (`VALID_TRANSITIONS` line 29) for re-editing.

### Q7: Declined quote feedback reaches chef

When client declines a quote, does chef see the decline + reason? Is there a feedback mechanism or just a status change?

**Grade: Working.** Client decline flow (`quote-response-buttons.tsx:100-118`) shows optional `Textarea` for reason. Passed to `rejectQuote(quoteId, rejectReason)` -> `respond_to_quote_atomic` RPC. `notifyChefOfQuoteRejected()` (lines 421-475) sends in-app notification and email with reason. Chef quote detail (lines 287-293) renders `rejected_reason` in red card. Reason also propagates to webhook dispatches.

### Q8: Multi-quote scenario clarity

If chef sends multiple quotes for same event (revisions), does client see clear version history? Does accepting V2 automatically supersede V1? What happens to the event if V1 was already linked?

**Grade: Working.** `reviseQuote()` (`lib/quotes/actions.ts:1055-1115`) creates new quote with `version: currentVersion + 1` and `previous_version_id`, marks original `is_superseded: true`. `getQuoteVersionHistory()` walks the chain. Client list shows revision and superseded badges. Edge case: two independent (non-revision) quotes for same inquiry - accepting one does not auto-expire other. Design choice, not bug.

---

## Phase 2: Contract-to-Payment Chain (Q9-Q15)

_Chef sends contract -> client signs -> payment processed -> both see confirmation_

### Q9: Contract fields sync from quote

When contract is generated from an accepted quote, do ALL quote fields (line items, total, event details, dietary notes) carry through? Or are some fields re-entered/lost?

**Grade: Partial.** Contract generated from event data, not quote directly. `generateEventContract()` (`lib/contracts/actions.ts:224-347`) pulls `quoted_price_cents`, `deposit_amount_cents`, `occasion`, `guest_count`, `location_*` from events table. Only 8 merge fields (lines 49-58): client_name, event_date, quoted_price, deposit_amount, cancellation_policy, occasion, guest_count, event_location. **Gap: quote line items, dietary notes, allergies, and special requests are NOT carried into the contract merge fields.** AI contract generator (`lib/ai/contract-generator.ts`) pulls more data but is a separate code path.

### Q10: Signature confirmation reaches both parties

After client signs contract, does chef get real-time notification? Does client get email confirmation? Is the signed document accessible to both?

**Grade: Partial.** `signContract()` (`lib/contracts/actions.ts:441-529`): chef receives in-app notification (line 501-509) and email (line 515, `sendContractSignedChefEmail`). **Gap: client receives NO email confirmation of their signature.** Function returns `{ success: true }` to browser and revalidates paths (line 484-485) so client sees updated status on refresh, but no email receipt of their legally binding signature.

### Q11: Payment receipt visible to both chef and client

After Stripe payment processes, do both chef (on event detail money tab) and client (on my-events) see the same payment amount, same timestamp, same status?

**Grade: Working.** Both sides read from `event_financial_summary` view. Chef: `EventDetailMoneyTab` shows `total_paid_cents`, `total_refunded_cents`, `outstanding_balance_cents`. Client: `lib/events/client-actions.ts:116` queries same view, mapping to same fields. Client page (`app/(client)/my-events/[id]/page.tsx:337-407`) displays Total, Amount Paid, Balance Due. Stripe webhook revalidates both `/events/{id}` and `/my-events/{id}`.

### Q12: Payment failure communication

If payment fails (declined card, insufficient funds), who gets notified? Chef? Client? Both? What's the retry path? Is the event left in a coherent state?

**Grade: Working.** `handlePaymentFailed` (`app/api/webhooks/stripe/route.ts:1008-1101`): chef gets in-app notification (lines 1024-1042) with error code. Client gets in-app notification (lines 1044-1062) plus dedicated email (`sendPaymentFailedEmail`, lines 1066-1091) with retry link to `/my-events/{id}/pay`. No ledger entry written for failed payments. Event stays in prior state.

### Q13: Refund visibility chain

When chef initiates a refund, does client see the refund status? Does the refund amount match on both sides? Does the ledger entry appear for both?

**Grade: Working.** Two refund paths, both visible. Stripe refund: `initiateRefund()` (`lib/cancellation/refund-actions.ts:133-280`) calls Stripe API, triggers `charge.refunded` webhook. Handler writes ledger entry (line 1200), notifies chef in-app (lines 1279-1299), notifies client in-app (lines 1301-1317), sends client refund email (lines 1319-1349). Offline refund writes ledger directly and sends client email. Both result in client-visible records in Payment History.

### Q14: Deposit vs full payment clarity

If event uses deposit (partial payment), do both chef and client see the same breakdown: deposit paid, remaining balance, due date? Or does one side show total and the other shows deposit?

**Grade: Working.** Both sides display deposit as distinct field. Chef: `EventDetailMoneyTab` shows "Deposit Amount" alongside Quoted Price, Amount Paid, Balance Due. Client: `app/(client)/my-events/[id]/page.tsx:393-404` shows "Deposit Amount" when `deposit_amount_cents > 0`. Stripe webhook differentiates deposit vs full via `payment_type` metadata. `event_financial_summary` computes outstanding balance from ledger entries.

### Q15: Payment status drives correct event state

Does `paid` status on the payment correctly advance the event FSM for both users? Can the event get stuck between quote-accepted and paid if payment webhook is delayed?

**Grade: Working.** `handlePaymentSucceeded` webhook (lines 424-1001) calls `transitionEvent({ eventId, toStatus: 'paid', systemTransition: true })` at line 671. FSM allows `accepted->paid` by system/chef. Transition is atomic via `transition_event_atomic` RPC. If transition fails, ledger entry preserved and audit trail inserted with `requires_manual_review: true`. Idempotent: already-paid returns as no-op. Edge case of payment on cancelled event triggers auto-refund.

---

## Phase 3: Event Lifecycle Chain (Q16-Q25)

_Event created -> both manage -> countdown -> execution -> completion_

### Q16: Event detail parity between chef and client

Same event viewed by chef (`/events/[id]`) and client (`/my-events/[id]`). Are date, time, guest count, location, dietary, menu ALL consistent? Or do stale caches show different values?

**Grade: Working.** Both pages query same `events` table. Chef uses `getEventById()` (`lib/events/actions.ts:308`) with `SELECT *`, client uses `getClientEventById()` (`lib/events/client-actions.ts:69`) also `SELECT *`. Both read financials from `event_financial_summary` view. Both are server components with no `unstable_cache`. Client gets real-time updates via `EventStatusWatcher` SSE component. Intentional difference: chef sees 50+ panels, client sees focused subset.

### Q17: Guest count change propagation

When client requests guest count change (Q42 from client audit), does chef's event detail update immediately? Does it trigger menu/pricing recalculation? Does the financial summary recalculate?

**Grade: Working.** Client-initiated: `requestGuestCountUpdate()` (`lib/events/client-actions.ts:274`) updates `events.guest_count`, sends chat message, creates chef notification. Chef-initiated: `requestGuestCountChange()` (`lib/guests/count-changes.ts:38`) updates count, auto-recalculates `quoted_price_cents` for per-person pricing (line 127-133), applies surcharge for <72hr changes, inserts audit record. Minor gap: `cost_needs_refresh` flag not set, so menu cost snapshot does not auto-refresh.

### Q18: Menu changes visible to client

When chef updates the menu for an event, does client see the updated menu on their event detail? Real-time or next page load? Is there a notification?

**Grade: Working.** `notifyClientOfMenuEdit()` (`lib/menus/editor-actions.ts:15`) sets `menu_modified_after_approval = true` on event and creates client notification (`menu_updated_after_approval`). Client event page (`app/(client)/my-events/[id]/page.tsx:456-477`) checks flag and displays amber "Your chef updated the menu" alert. Menu approval workflow also posts to Dinner Circle via `circleFirstNotify`.

### Q19: Event cancellation visible to all parties

When chef cancels an event, does client get notified (email + in-app)? Do guests with RSVP links get notified? Is the refund initiated? What does each party's UI show?

**Grade: Partial.** Chef cancellation: `cancelEvent()` (`lib/events/transitions.ts:1283`) triggers email to both client and chef (lines 863-884), client notification (lines 547-558), Dinner Circle post, SSE broadcast, Google Calendar deletion. **Gap: RSVP'd guests are NOT notified.** No code in cancellation flow queries `event_guests` or `event_shares` to notify attendees. Guests would only see updated status if they visit the share page.

### Q20: Event status transitions visible to client

When chef moves event through FSM (proposed -> accepted -> paid -> confirmed -> in_progress -> completed), does client see each transition? Or only certain ones?

**Grade: Working.** `transitionEvent()` (`lib/events/transitions.ts:470-558`) sends client notifications for every meaningful transition: proposed (line 483), paid (508), confirmed (495), in_progress (519), completed (534), cancelled (547). Each includes `actionUrl` to client event page. SSE broadcast on line 332 sends `status_changed` to `client-event:{id}` channel. Transactional emails sent for proposed, confirmed, in_progress, completed, cancelled.

### Q21: Location/time change propagation

If chef changes event location or time after client confirmed, does client see the update? Get notified? Does the countdown page update? Do guest portals update?

**Grade: Partial.** `updateEvent()` (`lib/events/actions.ts:386`) restricted to `draft` or `proposed` status only (line 408). After acceptance, chef cannot update location/time through this function. Pre-acceptance: changes revalidate path (`revalidatePath('/my-events/{id}')` line 532) but **no notification sent to client**. Post-acceptance: no mechanism exists for amendments. Guest portal reads live event data so pre-acceptance changes propagate.

### Q22: Dietary restriction propagation chain

Client sets dietary restrictions on profile. Inquiry inherits them (Q15 fix). Event inherits from inquiry. Menu should respect them. Does the FULL chain work? Chef profile -> client profile -> inquiry -> event -> menu planning?

**Grade: Working.** Chain: (1) Client provides dietary at inquiry (`confirmed_dietary_restrictions`). (2) Inquiry-to-event conversion (`lib/inquiries/actions.ts:347`) copies to `events.dietary_restrictions`. (3) Event creation (`lib/events/actions.ts:172-174`) falls back to `client.dietary_restrictions`. (4) Guest RSVP dietary flows through `event_guests` with per-guest fields. (5) Chef event detail calculates `dietaryComplexity` from guest profiles, displays `AllergenRiskPanel`. (6) Menu planning uses `dietary_conflicts` flag. Full chain connected.

### Q23: Chef notes vs client-visible notes

Are there fields that chef fills in that client should NOT see (internal notes, cost margins)? And vice versa? Is the boundary correctly enforced?

**Grade: Working.** Events table has: `site_notes`, `access_instructions`, `kitchen_notes`, `location_notes`, `pricing_notes`, `special_requests`. Client page only renders `special_requests` (line 311-314). Internal notes not displayed. Menu `chef_notes` field also not rendered on client view. Minor concern: `getClientEventById()` uses `SELECT *` sending all columns to client, but UI does not render them. Boundary enforced at rendering layer.

### Q24: Completed event triggers for both sides

When event moves to `completed`: does client get review prompt? Does chef get AAR prompt? Do financial summaries update for both? Does loyalty points credit?

**Grade: Working.** `transitionEvent` processes completed (lines 947-1173): Client side: notification (534-545), email with menu highlights via circle-first-notify, post-event survey (`sendPostEventSurveyForEvent` line 949), Inngest follow-up sequence (thank-you 3d, review 7d, referral 14d), `ClientFeedbackForm` + "Book Again" CTA. Chef side: Remy AAR alert (1133-1149), `QuickDebriefPrompt`, loyalty points (53-67), inventory auto-deducted (964-969), variance alerts, hub snapshot. Both financial summaries update via `event_financial_summary` view.

### Q25: Event timeline/activity log parity

If there's an activity timeline on the event, do both chef and client see appropriate entries? Chef sees internal actions, client sees relevant milestones?

**Grade: Partial.** Chef event page calls `getEntityActivityTimeline('event', params.id)` (line 343) showing transitions and mutations with actor labels ("You", "Client", "System"). **Client has NO activity timeline.** Client sees `EventJourneyStepper` (lines 250-275) showing simplified milestones (proposed, accepted, paid, confirmed, completed) derived from `event.transitions`. Chef-side mutations (guest count changes, menu edits, note updates) invisible to client in any chronological view.

---

## Phase 4: Guest Sharing Chain (Q26-Q33)

_Chef/client shares event -> guest gets link -> guest RSVPs -> everyone sees updates_

### Q26: Share link generation and delivery

When sharing is enabled on an event, who controls it (chef, client, or both)? Does the share link go to the right recipients? Does it work without auth?

**Grade: Working.** `createEventShare()` (`lib/sharing/actions.ts:509`) is client-initiated (`requireClient()`), verifies client owns event (line 518). Generates 32-byte crypto token (line 555), 90-day expiry (line 560-561). No auth required for guests - share page at `/share/[token]` is fully public. URL shortening via `shortenUrl()` (non-blocking fallback to full URL). Chef can also create shares via `createEventShareByChef()` (line 663). Both paths auto-create Dinner Circle via `ensureDinnerCircleForEventNonBlocking`.

### Q27: RSVP data flows back to chef

When guest RSVPs (dietary prefs, attendance, +1s), does chef see this on their event detail? Real-time or next load? Does it affect headcount?

**Grade: Working.** `submitRSVP()` (`lib/sharing/actions.ts:2569`) persists all fields to `event_guests` (lines 2671-2700). Non-blocking chef notification created (lines 2746-2774) including allergy-specific food safety alert. `syncGuestCountFromRSVPs()` (line 2798) auto-increases `event.guest_count` if RSVP total exceeds original (never decreases). `revalidatePath('/events/{id}')` (line 2822) ensures chef sees on next load. Hub profile sync also fires.

### Q28: Guest dietary data reaches menu planning

When guest submits dietary restrictions via RSVP, does that data appear in chef's menu planning / shopping list? Or is it silently stored but unused?

**Grade: Partial.** RSVP stores dietary in `event_guests.dietary_restrictions` and `allergies` columns. `syncGuestDietaryItems()` (line 2712) writes structured items to `guest_dietary_items` table. Chef event detail calculates `dietaryComplexity` and shows `AllergenRiskPanel`. **Gap: dietary data is visible on event detail but not automatically pulled into the menu editor or shopping list generator.** Chef must manually cross-reference guest dietary info when planning the menu.

### Q29: RSVP cutoff enforcement for all parties

When RSVP cutoff passes, is the form locked for guests? Does chef see cutoff status? Can chef override? Does client see who RSVPd vs who didn't?

**Grade: Working.** `submitRSVP()` checks `share.rsvp_deadline_at < now` (line 2600-2601) and throws "RSVP submissions are closed." Share page (`app/(public)/share/[token]/page.tsx:41-43`) checks same condition to show `rsvpClosed` state. Chef can update deadline via `UpdateEventShareAdvancedSettingsSchema` (line 204-213) with `rsvp_deadline_at` field. RSVP reminders cron (`app/api/scheduled/rsvp-reminders/route.ts`) sends reminders at configured intervals before deadline.

### Q30: Guest portal shows correct event details

Guest portal (`/share/[token]`) - does it show current event date, time, location, menu? Or can it show stale data if chef made changes after sharing?

**Grade: Working.** `getEventShareByToken()` (`lib/sharing/actions.ts:2437`) queries live event data every request (no caching). Fetches current `event_date`, `serve_time`, `location_*`, `status` from events table (lines 2460-2470). Menus fetched fresh if `visibility.show_menu` (lines 2499-2506). Guest list fetched fresh if `visibility.show_guest_list` (lines 2509-2515). Page is `force-dynamic` so no stale SSR.

### Q31: Hub group messages visible to right people

In hub/dinner circles, do messages from chef reach all group members? Do member messages reach chef? Is tenant scoping correct (no cross-chef leakage)?

**Grade: Working.** `postHubMessage()` (`lib/hub/message-actions.ts:39`) validates: (1) profile token exists (line 55-61), (2) membership in group (line 64-72), (3) `can_post` permission (line 72). `verifyGroupAccess()` (line 10-20) validates group token matches groupId, preventing IDOR. Groups are scoped by `tenant_id` at creation. Rate limit: 30 messages per 60s per profile token. No cross-tenant leakage path exists since group membership is the access gate.

### Q32: Guest count reconciliation

RSVP guest count (confirmed attendees) vs event guest_count (original booking). Do these reconcile? Does chef see both numbers? Does pricing adjust?

**Grade: Working.** `syncGuestCountFromRSVPs()` (`lib/sharing/actions.ts:147-176`) counts attending guests + plus-ones, updates `event.guest_count` only if RSVP total exceeds original (one-way ratchet - chef's original count is the floor). Chef sees both the booked count and RSVP breakdown on event detail. Pricing adjustment happens via `requestGuestCountChange()` for explicit per-person recalculation.

### Q33: Share token security

Can a guest with token A access event B's data? Is each token scoped to exactly one event share? Rate limited against enumeration?

**Grade: Working.** Each share token is 32-byte crypto random (line 555), scoped to exactly one `event_shares` row. `getEventShareByToken()` queries by token + `is_active = true` (line 2446). Rate limited: 120 requests per 15 minutes per token prefix (line 2438). Token expiry enforced (line 2455-2456). Cancelled events return null (line 2479). Hub message actions also validate group token matches groupId via `verifyGroupAccess()`.

---

## Phase 5: Notification Integrity (Q34-Q42)

_Every mutation that should notify someone - does it?_

### Q34: Inquiry notification completeness

New inquiry -> chef gets: email + in-app + push + SSE. Are ALL channels firing? Which are missing? What if chef is offline?

**Grade: Working.** `submitPublicInquiry()` (`lib/inquiries/public-actions.ts`) fires: (1) email to chef via inquiry notification template (line ~530), (2) in-app notification via `createNotification` (line ~520), (3) push notification via OneSignal `notifyNewInquiry` (line 581-582), (4) Remy reactive enqueue via `onInquiryCreated` (line 560), (5) auto-response to client (line 592). SSE broadcasts via activity log. If chef offline: email + push persist, in-app queued for next load. All channels confirmed.

### Q35: Quote sent notification to client

Quote created + sent -> client gets: email + in-app. Does email contain quote summary or just "you have a quote"? Can client act from email?

**Grade: Working.** `transitionQuote()` to 'sent' (`lib/quotes/actions.ts:634-756`) fires: (1) Circle-first notification via Dinner Circle, (2) `QuoteSentEmail` template (lines 698-720) containing quote summary with total, per-person pricing, and CTA link to `/my-quotes/{id}`, (3) in-app client notification (lines 728-739). Client can click through from email directly to the quote detail page.

### Q36: Event transition notifications

Each FSM transition (8 states) - who gets notified at each? Map every transition to its notification targets.

**Grade: Working.** Full map from `transitionEvent()` (`lib/events/transitions.ts:470-558`):

- draft->proposed: client (in-app + email)
- proposed->accepted: chef (in-app)
- accepted->paid: client (in-app + email), chef (in-app via webhook)
- paid->confirmed: client (in-app + email)
- confirmed->in_progress: client (in-app + email)
- in_progress->completed: client (in-app + email + survey + follow-up sequence), chef (AAR alert)
- any->cancelled: client (in-app + email), chef (in-app)
  All transitions broadcast SSE to `client-event:{id}` channel (line 332).

### Q37: Payment notifications both directions

Payment received -> chef gets in-app + email. Client gets receipt email. Are both happening?

**Grade: Working.** Payment succeeded webhook (`app/api/webhooks/stripe/route.ts:832-846`) fires `sendPaymentConfirmationEmail` to client with amount, payment type, event date, remaining balance, and loyalty tier. Chef receives in-app notification + `sendPaymentReceivedChefEmail`. Client also gets FSM transition notification (paid status). Both sides fully covered.

### Q38: Overdue payment reminders

If payment is overdue, who gets reminded? Chef, client, or both? How frequently? Is there a cap?

**Grade: Working.** Lifecycle cron (`app/api/scheduled/lifecycle/route.ts:420-549`) sends payment reminders at 7d, 3d, and 1d before payment is due. Uses dedup columns (`payment_reminder_7d_sent_at`, `_3d_sent_at`, `_1d_sent_at`) to prevent re-sends. Respects `chef_automation_settings` per tenant and `clients.automated_emails_enabled` per client. Cap: 3 reminders per event (one per cadence). Client receives the reminders. Chef sees the event status.

### Q39: Notification preferences respected

If client disables email notifications (`automated_emails_enabled = false`), are transactional emails (receipts, contracts) still sent? They should be. Only marketing/reminder emails should stop.

**Grade: Partial.** `automated_emails_enabled` checked in lifecycle cron (line 270, 363) for automated reminders. Payment reminders, quote expiry warnings, and re-engagement emails all respect this flag. **Gap: the flag is not checked in `sendEmail()` itself or in `lib/email/notifications.ts`.** Transactional emails (contract sends, quote notifications) fire regardless of the flag, which is correct behavior. But the naming is misleading: it controls lifecycle automation emails only, not all automated emails. Risk: a future developer might check this flag before sending a transactional email, incorrectly blocking it.

### Q40: SSE real-time updates across roles

When chef makes a change to an event, does the client's browser get an SSE update if they're viewing the same event? Cross-role SSE channels?

**Grade: Working.** `transitionEvent()` broadcasts to `client-event:{eventId}` (line 332). Client's `EventStatusWatcher` component subscribes via `useSSE('client-event:{id}')` and auto-refreshes on receipt. The `broadcast()` function in `lib/realtime/sse-server.ts` uses an in-memory EventEmitter bus. `useSSE` in `lib/realtime/sse-client.ts` handles reconnection. Cross-role channels confirmed: chef writes, client reads, same channel name.

### Q41: Duplicate notification prevention

Does the same action ever fire the same notification twice? Email + push + in-app for same event - are they deduplicated or do they stack?

**Grade: Partial.** Email + push + in-app are intentionally separate channels (stacking is expected). For same-channel dedup: `intent-notifications.ts` uses 2-hour dedup window for `quote_viewed` alerts. Lifecycle cron uses `_sent_at` columns for payment reminders. **Gap: general in-app notifications have no dedup mechanism.** If a server action retries (e.g., network timeout with server-side success), the notification could fire twice. No `notification_key` or unique constraint prevents duplicate in-app notifications for the same event+action combination.

### Q42: Notification failure doesn't block action

If email provider is down, does the parent action (create quote, accept event) still succeed? Are notifications non-blocking per architecture?

**Grade: Working.** All notification calls wrapped in `try/catch` with `console.error` logging (architecture pattern from CLAUDE.md). Quote transition: warnings array captures failures (line 745). Inquiry submission: push notification failure logged non-blocking (line 584-586). Event transitions: client notification failure logged as warn (line 561). `recordSideEffectFailure` captures structured failure data for monitoring. Parent action always completes.

---

## Phase 6: Data Consistency Across Views (Q43-Q50)

_Same data, different perspectives - must match_

### Q43: Revenue numbers match across surfaces

Chef dashboard revenue, event detail money tab, financial summary, ledger view. All show same totals? Or do caching/computation differences create discrepancies?

**Grade: Working.** All surfaces derive from ledger. Event-level: `event_financial_summary` DB view (computed from `ledger_entries`). Tenant-level: `getTenantFinancialSummary()` (`lib/ledger/compute.ts:51`) calls `compute_tenant_financial_summary` RPC (DB-side aggregation). Dashboard: `hero-metrics.tsx` reads same tenant summary. No separate caches or parallel computation paths. All amounts in cents, computed at query time.

### Q44: Client lifetime value consistency

Client card on chef side shows lifetime value. Client's own spending dashboard shows lifetime spend. Same number?

**Grade: Partial.** Chef-side: `clients.lifetime_value_cents` column, updated by DB trigger `update_client_lifetime_value_on_ledger_insert()` on ledger inserts. Calls `compute_client_lifetime_value(p_client_id)` PostgreSQL function. Client-side: `getClientSpendingSummary()` (`lib/clients/spending-actions.ts:32`) queries `event_financial_summary` view for all non-draft events, sums `total_paid_cents`. **Gap: different computation paths.** The DB trigger sums ledger entries directly. The client spending action sums from the financial summary view. Both derive from ledger but the trigger runs on INSERT (may lag if entries are modified), while the view is always current. Potential divergence if a ledger entry is voided/corrected after the trigger fired.

### Q45: Event count consistency

Chef dashboard "total events", client list count, financial summary event count. All agree?

**Grade: Working.** Dashboard hero metrics query events table with status filters. Client list count queries same table scoped by `client_id`. Financial summary counts from `event_financial_summary` view which joins events. All source from the same `events` table with tenant scoping. `deleted_at IS NULL` filter applied consistently. No caching layer that could cause drift.

### Q46: Menu displayed correctly in all contexts

Same menu rendered in: chef menu editor, client quote view, client event detail, guest portal, PDF export. Consistent dishes, descriptions, dietary tags?

**Grade: Partial.** All contexts query same `menus` + `menu_items` tables. Chef menu editor has full field access. Client event detail shows menu name + items. Guest portal (`/share/[token]`) fetches menus if `visibility.show_menu` is true (only name, description, service_style - not individual dishes). **Gap: guest portal shows menu metadata but not dish-level items.** PDF export (`lib/pdf/`) pulls from same source. Quote view shows menu if linked. The inconsistency is guest portal showing less detail than other surfaces.

### Q47: Profile data consistency

Chef edits profile -> changes visible on: public profile, embed widget, directory listing, review pages. All synchronized?

**Grade: Working.** All surfaces query `chefs` table directly. Public profile (`app/(public)/chef/[slug]/page.tsx`) fetches by `booking_slug`. Directory listing (`app/(public)/chefs/page.tsx`) fetches all visible chefs. Embed widget queries by `chef_id`. No intermediate cache between profile edits and reads. `revalidatePath` calls in profile update actions ensure SSR pages regenerate. All read same `display_name`, `business_name`, `bio`, `profile_image_url` columns.

### Q48: Timezone handling across boundaries

Chef in EST sets event for 7pm. Client in PST sees... 7pm or 4pm? Guest portal shows what? Is timezone handling explicit or implicit?

**Grade: Partial.** Events schema has `event_timezone` column (`lib/events/actions.ts:57`). Event date stored as date string, serve_time as time string (not UTC timestamp). All views render the stored time as-is: chef sees 7pm, client sees 7pm, guest portal sees 7pm. **Gap: implicit assumption that all parties are in the same timezone as the event.** No timezone conversion happens. No timezone displayed next to times. If client is in PST viewing an EST event, they see "7:00 PM" with no indication it's ET. The `event_timezone` field exists but is not rendered in any view.

### Q49: Currency formatting consistency

All monetary amounts across chef views, client views, emails, PDFs. Same formatting ($1,234.56 vs $1234.56 vs 1234.56)?

**Grade: Working.** Two `formatCurrency()` functions exist: `lib/utils/currency.ts` (simple) and `lib/utils/format.ts` (with locale/currency options). Both use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` producing identical `$1,234.56` format. All amounts stored as integer cents, divided by 100 at display. Email templates use same utility. No raw cent values or alternative formatting paths found.

### Q50: Search/filter results match reality

Chef searches clients, finds 5 results. Client list page shows 5 clients. Deleted clients excluded from both?

**Grade: Working.** Client queries include `deleted_at IS NULL` filter consistently. Chef client list, search, and financial views all apply this filter. Demo clients filtered by `is_demo` flag where appropriate. Soft-delete pattern means records persist for audit but are excluded from active views. No stale search index exists (all queries are live DB reads).

---

## Phase 7: Error Recovery Across Boundaries (Q51-Q57)

_When something breaks for one user, what happens to the others?_

### Q51: Partial inquiry failure

If inquiry creates client record but fails on inquiry insert, is the orphan client visible? Does re-submission create duplicate client?

**Grade: Working.** `createClientFromLead()` (`lib/clients/actions.ts:591`) is idempotent: checks by email+tenant first (line 607-623). If client exists, returns `{ id, created: false }`. Re-submission does NOT create duplicates. If inquiry insert fails after client creation, client record persists as usable orphan (visible in chef's client list). 24-hour dedup guard (lines 233-251) prevents accidental duplicate submissions for same client+chef+date.

### Q52: Quote creation failure rollback

If quote creation fails mid-way (line items saved but total calculation errors), what does chef see? What does client see?

**Grade: Working.** `createQuote()` (`lib/quotes/actions.ts:100`) uses `executeWithIdempotency()` (line 144). Single `.insert().select().single()` call (line 151-181) is atomic at DB level. If insert fails, `UnknownAppError` thrown, no partial record exists. Client sees nothing (quotes are chef-initiated). `UpdateQuoteSchema` includes `expected_updated_at` for optimistic locking with `createConflictError` for CAS protection.

### Q53: Payment webhook out of order

If Stripe sends payment_intent.succeeded before checkout.session.completed, does the system handle it? Or does the event get stuck?

**Grade: Working.** Multiple mechanisms: (1) Ledger idempotency: lines 98-117 check `transaction_reference` (Stripe event ID) against existing entries, skip duplicates. (2) Event transition CAS guard: `transition_event_atomic` PostgreSQL function uses `AND status = p_from_status` preventing concurrent status changes. (3) Race detection (lines 292-319) re-verifies post-transition, skips side effects if another request won. (4) Cancelled event guard (lines 465-504) detects payment on cancelled event, auto-refunds. (5) Failed transition audit trail (lines 977-1001) preserves ledger entry with `requires_manual_review` flag.

### Q54: Database connection failure during event transition

Chef clicks "mark confirmed" but DB is temporarily unreachable. Does the UI show success (lie) or error? Does retry work? Is the transition idempotent?

**Grade: Working.** `transitionEvent()` uses `transition_event_atomic` RPC (line 278), a `SECURITY DEFINER` PostgreSQL function performing UPDATE + INSERT in one transaction. If DB unreachable, RPC throws, caught at line 287-289 with "Failed to transition event status" surfaced to UI. Idempotent: `fromStatus === toStatus` handled as no-op (line 135-137). CAS guard in Postgres function ensures partial-apply+retry either succeeds (status not yet updated) or fails cleanly (already updated).

### Q55: Email bounce handling

Client email bounces on quote notification. Does chef know? Is there a retry? Does the system mark the email as bad? Does it affect future sends?

**Grade: Partial.** Infrastructure exists: `email_suppressions` table (migration 20260415000019). `sendEmail()` (`lib/email/send.ts:151-157`) checks suppression before send, auto-adds bounced addresses on failure (lines 198-203). One retry on transient errors (lines 188-193) with circuit breaker (lines 163-173). Resend webhook handles `email.bounced` events. **Gaps: (1) Resend webhook writes `campaign_recipients.bounced_at` but does NOT insert into `email_suppressions`, so transactional emails may still attempt delivery. (2) Chef has no visibility into which client emails are failing (no in-app notification or UI for suppressed emails).**

### Q56: Concurrent edits

Chef and client both editing the same event (guest count change + menu change simultaneously). Does one overwrite the other? Last-write-wins or conflict detection?

**Grade: Partial.** Event transitions: fully protected via `transition_event_atomic` CAS guard. Event data edits: `UpdateEventSchema` includes `expected_updated_at` (line 95), checked against current value (line 459), throws `createConflictError` on mismatch. Quote updates also have CAS. **Gap: client-side event edits (if client portal omits `expected_updated_at`) degrade to last-write-wins.** Different fields edited simultaneously (chef edits menu, client edits guest count) would not conflict since they touch different columns.

### Q57: Session expiry during multi-step flow

Client is mid-contract-signing when session expires. Does the partially completed signature get saved? Can they resume? Or start over?

**Grade: Working.** Contract signing component stores signature data locally in state (`signatureDataUrl`, `agreed`). `signContract()` (`lib/contracts/actions.ts:441`) uses `requireClient()` which throws on expired session. Client-side `handleSign()` catches error via `setError()`. Resumable: contract stays in `sent`/`viewed` status, client re-authenticates, navigates back, re-draws signature. Optimistic lock `.in('status', ['sent', 'viewed'])` prevents double-signing. No data loss scenario.

---

## Gap Inventory (Partial + Missing)

### Partial (13 items)

| Q   | Phase | Gap                                                                                      | Severity | Fix Effort                                      |
| --- | ----- | ---------------------------------------------------------------------------------------- | -------- | ----------------------------------------------- |
| Q9  | 2     | Contract merge fields missing line items, dietary, allergies                             | Medium   | Medium (add merge fields)                       |
| Q10 | 2     | Client gets no email confirmation of their contract signature                            | Medium   | Low (add email send)                            |
| Q19 | 3     | RSVP'd guests not notified on event cancellation                                         | High     | Medium (query event_guests, send notifications) |
| Q21 | 3     | Post-acceptance event edits blocked; pre-acceptance edits lack client notification       | Low      | Medium (amendment workflow)                     |
| Q25 | 3     | Client has no activity timeline, only simplified journey stepper                         | Low      | Medium (build client timeline)                  |
| Q28 | 4     | Guest dietary data visible on event detail but not pulled into menu editor/shopping list | Medium   | Medium (integrate dietary into menu planning)   |
| Q39 | 5     | `automated_emails_enabled` naming misleading; only controls lifecycle emails             | Low      | Low (rename or document)                        |
| Q41 | 5     | No general dedup for in-app notifications; retries could double-fire                     | Low      | Medium (add notification_key)                   |
| Q44 | 6     | Client lifetime value: trigger-based vs view-based computation could diverge             | Low      | Low (unify to single source)                    |
| Q46 | 6     | Guest portal shows menu metadata but not dish-level items                                | Low      | Low (add items to query)                        |
| Q48 | 6     | Timezone stored but never rendered; implicit assumption all parties same tz              | Medium   | Medium (display timezone)                       |
| Q55 | 7     | Resend bounce webhook does not populate email_suppressions; chef has no visibility       | Medium   | Low (cross-populate + alert)                    |
| Q56 | 7     | Client-side event edits may not pass expected_updated_at for CAS                         | Low      | Low (audit client forms)                        |

### Missing (2 items)

No items graded as Missing. On re-evaluation, all chains have at least partial implementation. The two weakest items (Q19: guest cancellation notification, Q25: client timeline) are graded Partial since the chef/client chain works but the guest chain is absent.

### Priority Fix Order

1. ~~**Q19** (High) - RSVP'd guests not notified on cancellation.~~ **FIXED** (transitions.ts)
2. ~~**Q10** (Medium) - Client signature confirmation email.~~ **FIXED** (contract-signed-client.tsx + contracts/actions.ts)
3. ~~**Q55** (Medium) - Bounce webhook does not populate email_suppressions.~~ **FIXED** (resend/route.ts)
4. **Q9** (Medium) - Contract missing dietary/allergy info. Could cause food safety issues.
5. **Q28** (Medium) - Guest dietary not in menu planning. Same food safety concern.
6. **Q48** (Medium) - Timezone not displayed. Confusion for cross-timezone events.
