# Research: Client Relationship Closure and Blocking

> **Date:** 2026-04-27
> **Question:** What are current companies doing when a long-running service relationship ends because one party moves away, the relationship goes bad, or the provider needs to prevent future work?
> **Status:** complete

## Origin Context

The developer asked whether ChefFlow is ready for a real private chef scenario: a chef has worked with a client for a long time, then the relationship ends because one party moves away, or because the relationship soured. The follow-up request was to research current market patterns, then write build specs and parallel-agent prompts so the gap can be closed deliberately.

## Summary

Market leaders do not treat relationship closure as the same thing as dormancy. They separate historical record retention, future booking prevention, portal and message access, cancellation or refund handling, and transition documentation. ChefFlow currently has pieces of this, but no policy matrix tying them together: `dormant` still means re-engage, portal access can remain live, event creation does not guard against closed relationships, and the handoff email exists but has no caller.

## External Market Findings

### Scheduling Platforms

**Acuity Scheduling: hard client ban.** Acuity lets operators ban clients by email. The ban prevents scheduling, rescheduling, canceling online, package purchases, subscription or gift-certificate purchases, and automated follow-up messages. It also supports a custom message shown when the banned client tries to schedule. Source: Acuity Scheduling Help, "Banning clients from scheduling online", lines 21-33. <https://help.acuityscheduling.com/hc/en-us/articles/16676918445965-Banning-clients-from-scheduling-online>

**Square Appointments: cancellation policy and payment protection.** Square treats cancellation/no-show handling as a financial workflow. Operators can enforce cancellation policies at their discretion, clients are notified by email including the operator note, declined cards require direct follow-up, canceled and no-show appointments are visibly labeled in the client record, and accepted prepaid appointments require direct contact for later changes. Source: Square Support, "Manage booking cancellations and prepayment policies", lines 159-175. <https://squareup.com/help/us/en/article/5493-set-a-custom-cancellation-policy-with-square-appointments>

**Cliniko: archive keeps records and blocks new appointments.** Cliniko archives patients so they are hidden from active reports and cannot have appointments added, while keeping their details. Permanent deletion is a separate, safeguarded flow and removes records. Source: Cliniko Help, "Archive or delete a patient", lines 33-57 and 71-79. <https://help.cliniko.com/en/articles/1024082-archive-or-delete-a-patient>

**Jane App: discharge plus online-booking disable.** Jane distinguishes inactive or discharged profiles from malicious booking behavior. It says there is no direct universal ban because people can create another profile, but operators can mark the profile discharged and disable online booking; suspected malicious booking is escalated to privacy/security. Source: Jane App, "Marking a Patient as Inactive", lines 133-136. <https://jane.app/guide/marking-a-patient-as-discharged-or-deceased>

### Service CRMs

**Jobber: archive is not access revocation.** Jobber lets a provider archive a client so they no longer appear as active, while retaining requests, quotes, jobs, billing history, and client hub access. It also has permanent delete, which removes associated work and cannot be undone. Source: Jobber Help, "Client Basics", lines 288-293, 319-325, 353, and 384-388. <https://help.getjobber.com/hc/en-us/articles/115009450867-Client-Basics>

**HubSpot: deletion has compliance tiers.** HubSpot separates restorable deletion from permanent deletion. Analytics can remain anonymized, files and activities have different retention behavior, and permanent deletion affects recovery and privacy obligations. Source: HubSpot Knowledge Base, "Understand restorable and permanent contact deletions", lines 86-90 and 150-168. <https://knowledge.hubspot.com/privacy-and-consent/understand-restorable-and-permanent-contact-deletions>

### Support and Marketplace Platforms

**Zendesk: suspension blocks new interaction but handles existing conversations deliberately.** Suspended end users cannot sign in, create tickets, receive notifications, or create phone tickets in all-channel mode. New requests route to a suspended view. Active tickets are not immediately cut off until the ticket moves to pending, on-hold, solved, closed, or an agent ends the related session. Source: Zendesk Help, "Understanding and allowing user suspension", lines 26-45. <https://support.zendesk.com/hc/en-us/articles/8009733465370-Understanding-and-allowing-user-suspension>

**Airbnb: blocking allows active-trip communication.** Airbnb blocking prevents future profile viewing, direct messaging, and future bookings, but if there is an upcoming or active reservation, messages can continue before, during, and for up to two weeks after the reservation to preserve necessary trip-related communication. It also pairs blocking with reporting. Source: Airbnb Help, "Block an Airbnb user", lines 25-42. <https://www.airbnb.com/help/article/4046>

**OwnerRez: direct-channel guest ban.** OwnerRez bans problematic guests on the hosted website by email and/or phone, shows a booking message, and states that it cannot ban guests on listing channels such as Airbnb, Booking.com, and Vrbo. Source: OwnerRez Support, "Banned Guests", lines 1568-1572 and 1599-1603. <https://www.ownerrez.com/support/articles/banned-guests>

## ChefFlow Current-State Evidence

**Client status is too small for closure.** The database enum only has `active`, `dormant`, `repeat_ready`, and `vip`, and the `clients.status` column defaults to `active`. Evidence: `database/migrations/20260215000001_layer_1_foundation.sql:16`, `database/migrations/20260215000001_layer_1_foundation.sql:130`.

**Dormant currently means inactive, not closed.** The app's next-best-action vocabulary labels dormancy as a re-engagement target. Evidence: `lib/clients/action-vocabulary.ts:108`, `lib/clients/action-vocabulary.ts:110`.

**Chef UI can change status but has no closure workflow.** Client detail renders `ClientStatusBadge`, and the badge only offers active, repeat ready, VIP, and dormant. Evidence: `app/(chef)/clients/[id]/page.tsx:291`, `components/clients/client-status-badge.tsx:24`.

**Event creation ignores closure semantics.** `createEvent()` verifies that the client belongs to the tenant, but it selects only tenant, dietary restrictions, and allergies. It does not check `clients.status`, closure, portal access, or a do-not-book flag. Evidence: `lib/events/actions.ts:250`, `lib/events/actions.ts:257`.

**Client portal token access ignores dormant status.** Magic-link portal access looks up clients by token hash or legacy token and filters `deleted_at`, then checks token validity. It does not check `status = dormant` or any relationship-closure state. Evidence: `lib/client-portal/actions.ts:196`, `lib/client-portal/actions.ts:218`.

**Authenticated client access ignores closure state.** `requireClient()` checks role and entity id only. There is no relationship access policy at auth boundary. Evidence: `lib/auth/get-user.ts:171`, `lib/auth/get-user.ts:180`.

**Portal revocation exists, but it is manual and isolated.** The chef can revoke a portal token from the client detail page, and the server action nulls portal token fields. Evidence: `components/clients/portal-link-manager.tsx:155`, `lib/client-portal/actions.ts:340`.

**Cancellation and handoff pieces already exist.** Client cancellation and cancellation-request pathways exist, and network handoffs exist for `lead`, `event_backup`, and `client_referral`. Evidence: `lib/events/client-actions.ts:282`, `lib/events/client-actions.ts:325`, `lib/network/collab-actions.ts:164`.

**Chef transition email is built but unwired.** `sendChefTransitionEmail()` exists and validates negative/availability phrasing in the personal note, but repository search found no caller outside its own file. Evidence: `lib/email/send-chef-transition.ts:47`.

## Product Pattern to Adopt

ChefFlow should model relationship closure as a policy state, not a renamed client status:

| Mode            | Meaning                                      | Booking                        | Portal                                      | Outreach                   | Active Events                            | History             |
| --------------- | -------------------------------------------- | ------------------------------ | ------------------------------------------- | -------------------------- | ---------------------------------------- | ------------------- |
| `transitioning` | Amicable move-away or handoff                | allowed only for closure tasks | allowed                                     | allowed with chef approval | continue                                 | retained            |
| `closed`        | Relationship over, no new work               | blocked                        | optional read-only or revoked               | blocked except manual note | finish or cancel explicitly              | retained            |
| `do_not_book`   | Soured relationship or risk                  | blocked                        | revoked unless active event requires access | blocked                    | active-event-only channel until resolved | retained            |
| `legal_hold`    | Dispute, chargeback, threat, safety incident | blocked                        | revoked or restricted                       | blocked                    | staff-only review                        | retained and locked |

This matches the market pattern:

- Acuity and OwnerRez prove the need for explicit booking block and user-facing block message.
- Airbnb and Zendesk prove that active commitments need a controlled communication exception instead of immediate total silence.
- Cliniko, Jobber, and HubSpot prove that record retention, archive, and deletion must be separate choices.
- SimplePractice and Jane prove that discharge/closure documentation is part of professional service practice, not just a CRM label.
- Square proves that cancellation/refund handling belongs in the closure flow when money is involved.

## Gaps and Unknowns

- We need developer approval before any migration file is created. The recommended data model is additive, but it still changes the database.
- I did not run browser verification because this was a triage and research task, not implementation.
- I did not inspect the live database for existing client statuses, because the code path evidence was enough to identify the product gap.
- Build health was checked with `npx.cmd tsc --noEmit --skipLibCheck`; it exited 0 with no tail output. No production build was run because the user requested docs and specs, not a build.

## Recommendations

1. **Needs a spec:** Add an append-only `client_relationship_closures` table and closure-policy helper. Do not overload `dormant`.
2. **Needs a spec:** Add server actions to close, reopen, revoke portal, block new booking, and create a closure timeline event.
3. **Needs a spec:** Guard event creation, portal token access, authenticated client portal routes, client table actions, Remy client actions, re-engagement suggestions, and automated outreach.
4. **Needs a spec:** Add a client detail closure panel that surfaces active events, outstanding balance, active portal token, handoff availability, and cancellation/refund status before closure.
5. **Needs discussion:** Decide whether `closed` clients can keep read-only portal access to past invoices and paid event summaries. Market precedent supports both choices, but active-event communication exceptions should be explicit.
