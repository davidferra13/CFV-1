# Automated Calling and Texting Gap Spec Packet

Status: spec-only, queue-ready, not queued, not implemented.

Date: 2026-05-21

Scope: full automated calling/texting gap set for ChefFlow communications. This packet preserves Build Queue First rules. It is intended to be converted into build queue items later, but no queue item is created by this document.

Hard product rule: AI voice must not call clients. Voice automation remains vendor, venue, staff, equipment, and business-contact only unless a future explicit product decision changes that rule. Client-facing voice in this packet is policy-only.

## Wave Plan

### Wave 1 - Source Audit

Agent lanes:

- SMS/Twilio inbound and outbound lane: read `lib/sms/send.ts`, `lib/sms/auto-ack.ts`, `lib/sms/triage-gate.ts`, `lib/sms/remy-draft.ts`, `lib/sms/triage-actions.ts`, `lib/communication/pipeline.ts`, `lib/communication/managed-ingest.ts`, `lib/communication/managed-channels.ts`, `app/api/webhooks/twilio/route.ts`, `app/api/comms/sms/route.ts`, `app/api/scheduled/messages/route.ts`, and SMS/consent migrations.
- Calling/vendor voice lane: read `lib/calling/twilio-actions.ts`, `lib/calling/auto-resolve.ts`, `lib/calling/batch-caller.ts`, `app/api/calling/*`, `components/calling/*`, sourcing/call metrics migrations, and calling support modules.
- Notifications/scheduled messages/automation lane: read scheduled cron, communication pipeline, notification delivery logs, delivery reconciliation, DLQ/idempotency/cron/webhook migrations, and side-effect failure recording.
- UI/action surfaces/settings lane: read `components/communication/*`, `components/calling/*`, `components/settings/sms-bridge-panel.tsx`, `/inbox`, `/communication`, `/settings/communication`, `/settings/communications`, `/culinary/call-sheet`, navigation, consent, approval queue, and action center files.

Ownership boundaries:

- All audit agents are read-only.
- Only the lead writes this packet.
- Future implementation lanes must not concurrently edit the same files.
- Future DB migrations must be additive and reconcile existing tables before introducing new ones.

User roles affected:

- Chef: primary operator for inbox, scheduled SMS, approval, vendor calling, settings, consent, recovery.
- Client: recipient of approved SMS and portal/email communications; never recipient of AI voice calls under current rule.
- Guest: may be SMS recipient only when event/guest consent and scope allow; no AI voice calls.
- Admin: reviews platform health, failures, feature flags, policy configuration, and cross-tenant audits through admin-gated surfaces only.
- Staff/vendor: vendor, venue, staff, or business contacts may receive AI voice calls when chef-owned data, feature flags, and calling rules allow.
- Public: no access to tenant communications or calling controls.

Data ownership rules:

- Tenant data must be scoped by `tenant_id = user.tenantId` or `chef_id = user.tenantId`.
- Server actions must call `requireChef()`, `requireAdmin()`, or the correct role guard before data access.
- API and webhook routes must authenticate using Twilio signatures, `verifyCronAuth`, bridge tokens, webhook signatures, or explicit auth middleware.
- Route params, draft IDs, thread IDs, event IDs, vendor IDs, and scheduled message IDs must never be trusted without tenant scoping.
- UI hiding is not a security boundary.

Security/compliance risks:

- SMS consent and opt-out enforcement is not currently centralized at send time.
- Some webhook and cron paths use admin clients and must compensate with explicit tenant filters.
- Scheduled message delivery currently has no atomic claim and can double-send under overlapping cron.
- Some migrations enable RLS without visible policies, and one migration disables RLS broadly; future builds must verify live DB RLS state before closeout.
- Supplier voice has a strong policy rule against client calls, but Quick Call can dial arbitrary numbers and needs a business-contact eligibility guard before broader automation.

Verification approach for future builds:

- Static source check: every new route/action uses role guards and tenant filters.
- DB check: new migrations are additive, RLS/policies are present or explicitly service-only, and enum/check constraints match code.
- Unit and integration tests: send eligibility, consent, idempotency, Twilio signature handling, provider status reconciliation, queue transitions, and role denial.
- Runtime smoke: canonical app URL `http://localhost:3100`, hard refresh affected route, check browser console/network/server logs.
- Finish gate: proof pack with acceptance evidence, wiring proof, runtime proof, verification output, and partial-work notes before moving any future queue item to done.

## Source Audit Summary

Current communication architecture already has useful primitives:

- Inbound SMS/Twilio routes exist at `app/api/webhooks/twilio/route.ts` and `app/api/comms/sms/route.ts`.
- Managed channel resolution and tenant-owned Twilio credentials exist in `lib/communication/managed-channels.ts`.
- Canonical communication ingestion exists in `lib/communication/pipeline.ts` and `lib/communication/managed-ingest.ts`.
- Delivery reconciliation exists in `lib/communication/delivery-reconciliation.ts`.
- SMS triage metadata and Remy SMS drafts exist in `database/migrations/20260517000001_sms_triage_metadata.sql` and `database/migrations/20260517200400_sms_draft_responses.sql`.
- Chef approval actions for SMS drafts exist in `lib/sms/triage-actions.ts`.
- The main communication UI is `/inbox`, rendered by `app/(chef)/inbox/page.tsx` and `components/communication/communication-inbox-client.tsx`.
- Voice vendor calling exists in `lib/calling/twilio-actions.ts`, `lib/calling/batch-caller.ts`, `lib/calling/auto-resolve.ts`, `app/api/calling/*`, and `app/(chef)/culinary/call-sheet/page.tsx`.
- Notification logs, scheduled messages, side-effect failures, DLQ, and automation idempotency tables exist in migrations.

Confirmed cross-cutting gaps:

- Scheduled SMS is explicitly not implemented in `app/api/scheduled/messages/route.ts`; due SMS messages remain scheduled.
- Scheduled message processing lacks atomic claim semantics.
- Scheduled recipient lookup currently needs stricter tenant scoping.
- SMS send paths do not share a single consent, opt-out, approval, and provider-state boundary.
- Remy drafts are approval-only but lack richer thread/event/client/compliance context.
- SMS auto-ack is non-atomic, thinly guarded, and can run from webhook context without clear service-role/tenant behavior.
- Auto-resolve queues unresolved ingredients but has no durable consumer that calls vendors.
- Batch calling and sourcing sessions do not close from Twilio webhook results.
- Communication side effects often fail console-only instead of recording structured recovery entries.
- Consent/control-plane UX is missing from current communication settings.
- Approval queue/action center primitives exist but no consolidated communication approval inbox was found.

## Shared Build Constraints

- Reuse `sendManagedTwilioMessage()` for tenant-owned outbound SMS whenever possible.
- Keep `sendSms()` as legacy/system fallback only after a documented compliance gate.
- Do not duplicate `communication_events`, `conversation_threads`, `notification_delivery_log`, `side_effect_failures`, `ai_calls`, `supplier_calls`, `sourcing_sessions`, `sms_triage_metadata`, `sms_draft_responses`, `scheduled_messages`, or existing approval/action-center tables.
- Add companion tables only when existing tables cannot represent the state safely.
- Every automated outbound client SMS requires consent and approval rules. Marketing SMS requires explicit opt-in. Transactional SMS must still honor STOP/opt-out suppression where legally required.
- No automated client-facing SMS unless policy allows it and chef approval rules are satisfied.
- No AI client voice calls unless a future explicit product decision changes the current hard rule.

## Spec 1 - SMS Scheduled Sending Completion

Raw problem statement: `scheduled_messages` supports `channel='sms'`, but the scheduled cron only sends email and explicitly leaves SMS pending. Due SMS messages can loop forever and cannot reconcile Twilio delivery state.

Product goal: Let chefs schedule SMS messages that are delivered once, through tenant-managed Twilio credentials, with consent checks, provider status reconciliation, and clear failure recovery.

User roles:

- Chef: can create, view, edit before send, cancel, and inspect delivery/failure for their own scheduled SMS.
- Client: can receive approved transactional SMS if contact/consent rules allow; can opt out where supported.
- Guest: can receive only event-scoped SMS where guest consent and event context allow.
- Admin: can view operational failures and aggregate delivery health through admin-only tooling.
- Staff/vendor: not the target for this client scheduled SMS spec unless future vendor SMS channel is explicitly added.
- Public: no access.

Who can see/use/create/edit/delete:

- Chefs can see and manage only their own `scheduled_messages` rows scoped by `chef_id`.
- Admin can inspect failures with `requireAdmin()` through admin surfaces.
- Clients/guests cannot create/edit scheduled sends.
- Hard delete should remain unavailable; cancel should set status.

Who must never see/use it:

- Other chefs, unrelated clients/guests, public users, and staff/vendor users outside the tenant.

Data ownership and tenant boundary:

- `scheduled_messages.chef_id` owns the record.
- Recipient lookup must scope clients by `tenant_id` or `chef_id`; never select `clients` by ID alone under an admin client.
- Any generated `communication_events` row must use `tenant_id = chef_id`.

Current state in code:

- `database/migrations/20260401000073_communication_scale_features.sql` defines `scheduled_messages` with `channel IN ('email', 'sms', 'app')`.
- `app/api/scheduled/messages/route.ts` is cron-authenticated with `verifyCronAuth()` and monitored by `runMonitoredCronJob()`.
- The route sends only `email` via `sendEmail()` and leaves SMS/app channels pending.
- `lib/communication/managed-channels.ts` has `sendManagedTwilioMessage()` with provider SID and status callback support.
- `app/api/webhooks/twilio/route.ts` reconciles Twilio status callbacks against outbound `communication_events.external_id`.

Desired user flow:

1. Chef schedules an SMS from the communication UI or a future approval action.
2. System validates recipient ownership, SMS eligibility, quiet hours/policy, and consent.
3. Cron atomically claims due SMS messages.
4. System sends through `sendManagedTwilioMessage()`.
5. System creates or updates canonical outbound `communication_events` with provider SID, provider name, managed address, recipient address, and pending/sent status.
6. Twilio status callback updates canonical delivery state.
7. Chef sees sent, delivered, failed, or retry-needed state in inbox/communication health.

Backend scope:

- Add an atomic claim step for due scheduled messages, using a new status such as `sending` or a leased `claimed_at/claim_id` field.
- Implement SMS send branch in `app/api/scheduled/messages/route.ts`.
- Create or update an outbound `communication_events` row with `external_id = providerMessageId`.
- Reconcile send success/failure through `lib/communication/delivery-reconciliation.ts`.
- Record structured failures with `recordSideEffectFailure()` or a comms DLQ when send or reconciliation fails.
- Resolve schema/code mismatch around `scheduled_messages.status='draft'` if future UI relies on drafts.

Frontend/action surface scope:

- Show scheduled SMS state wherever scheduled messages are surfaced, likely `/communication`, `/inbox`, or the unified approval inbox from Spec 10.
- Add cancel, edit-before-send, retry failed, and view delivery details actions.
- Add warning states for missing Twilio setup, missing consent, invalid recipient phone, and opt-out.

Database/schema changes if needed:

- Add `sending`, `retrying`, or `needs_review` to `scheduled_messages.status`, or add claim columns without changing the status enum.
- Add provider metadata columns if not already representable: `provider_name`, `provider_message_id`, `communication_event_id`, `last_attempt_at`, `attempt_count`, `next_retry_at`.
- Add indexes for due claimed work by `chef_id`, `status`, `scheduled_for`, and `next_retry_at`.

API/server action changes if needed:

- Update scheduled message actions to validate channel-specific fields and tenant ownership.
- Keep cron protected by `verifyCronAuth()`.
- If adding retry/cancel actions, require `requireChef()` and scope by `chef_id`.

Notification/SMS/Twilio behavior:

- Use tenant-managed Twilio via `sendManagedTwilioMessage()`.
- Preserve Twilio SID for callback reconciliation.
- Do not fall back to global `sendSms()` for scheduled client SMS.
- Respect quiet hours and rate limits where policy applies.

Consent/compliance requirements:

- Block marketing/promotional scheduled SMS without explicit opt-in.
- Honor STOP/withdrawn opt-out state.
- Record consent basis and policy class on the send attempt.
- Never send automated client SMS unless policy and chef approval rules allow it.

Failure modes and recovery behavior:

- Overlapping cron must not double-send.
- Missing Twilio config: mark `needs_review` or failed with visible error, no repeated hot loop.
- Transient Twilio/network failure: retry with backoff and max attempts.
- Permanent invalid recipient or opt-out: block send, mark failed/blocked with visible reason.
- Provider callback missing: expose pending status with stale status warning.

Acceptance criteria:

- Due SMS scheduled messages are sent once and only once.
- Each sent SMS produces a canonical outbound communication event with provider SID.
- Twilio status callbacks update delivery state.
- Failed/blocked SMS is visible to the chef with retry or corrective action.
- Email behavior is not regressed.

Security acceptance criteria:

- Cron route requires `CRON_SECRET`.
- Recipient lookup is tenant-scoped.
- Retry/cancel/edit actions require `requireChef()`.
- No URL-guessing access to another chef's scheduled messages.
- Twilio callbacks are signature-validated.
- Rate limits and consent checks run before send.

Verification steps:

- Unit test SMS due message claim prevents duplicate sends under concurrent cron.
- Unit test tenant-scoped recipient lookup.
- Integration test mocked `sendManagedTwilioMessage()` success creates provider metadata.
- Integration test failed Twilio response records visible failure.
- Webhook test signed status callback reconciles outbound event.
- Static `rg` check that scheduled SMS does not call legacy `sendSms()`.

Suggested build queue item title: Complete scheduled SMS sending with delivery reconciliation.

Suggested product domain/module: Communications / Scheduled Messages / SMS.

Dependencies and blockers:

- Consent policy boundary from Spec 9.
- Observability/recovery primitives from Spec 8.
- Schema decision for `scheduled_messages.status`.

Recommended swarm lane/wave for future implementation: Wave A foundation and scheduled send backend; Wave B UI state and retry controls; Wave C delivery reconciliation and verification.

## Spec 2 - SMS Auto-Triage Scoring Upgrade

Raw problem statement: SMS triage priority is a minimal keyword/client/length heuristic and does not account for event timing, safety, money, cancellation, dietary risk, VIP/client relationship, SLA, or thread history.

Product goal: Prioritize inbound SMS so chefs see urgent, risky, revenue-critical, or time-sensitive messages first, with explainable scoring and no duplicate triage system.

User roles:

- Chef: sees ranked SMS triage and reasons.
- Client/guest: indirectly benefits from faster response; cannot see internal scoring.
- Admin: can inspect aggregate scoring failures or policy defects if admin-gated.
- Staff/vendor: no access unless future delegated inbox roles are defined.
- Public: no access.

Who can see/use/create/edit/delete:

- Chef can see/use scoring in their tenant inbox.
- System creates/updates triage scores.
- Chef may manually override priority if future UI adds it.
- Admin can inspect system-wide issues only through admin gates.

Who must never see/use it:

- Clients, guests, vendors, public users, and other tenants.

Data ownership and tenant boundary:

- Store in `sms_triage_metadata` scoped by `tenant_id`.
- Thread context must join `conversation_threads`, `communication_events`, `clients`, `events`, and `inquiries` only with matching tenant.

Current state in code:

- `lib/sms/triage-gate.ts` computes priority using urgent keywords, known client, and content length.
- `lib/communication/pipeline.ts` calls `createSmsTriage()` for inbound SMS.
- `sms_triage_metadata` stores `priority`, `triage_state`, `client_context`, and escalation metadata.
- `/inbox` and `components/communication/sms-triage-card.tsx` surface SMS drafts but do not expose full scoring reasons.

Desired user flow:

1. SMS arrives through Twilio and the communication pipeline.
2. Scoring engine evaluates message, sender, client relationship, open events/inquiries, dates, money, dietary/allergy, cancellation, and unresolved commitments.
3. Inbox groups and sorts by severity and reason.
4. Chef can approve, reply, snooze, escalate, or mark done.
5. Scoring reasons remain auditable.

Backend scope:

- Replace `computePriority()` with an explainable scorer that returns score, severity, reason codes, and context signals.
- Keep existing `sms_triage_metadata`; add JSON reason fields if needed.
- Avoid AI-only scoring unless deterministic guardrails exist. If AI is used later, deterministic safety keywords must still win.
- Record scoring failure through `side_effect_failures`.

Frontend/action surface scope:

- Surface reason badges in `/inbox` and SMS draft cards.
- Add filters for critical/high/normal/low SMS.
- Show stale/escalated indicators from `sms_triage_metadata`.

Database/schema changes if needed:

- Add `score numeric`, `severity text`, `reason_codes text[]`, `scoring_context jsonb`, and `last_scored_at` to `sms_triage_metadata`.
- Fix `triage_state` enum/check mismatch so code and schema agree, including rejected/dismissed behavior.
- Ensure RLS/policies exist for `sms_triage_metadata`.

API/server action changes if needed:

- No public API required.
- If manual override is added, use `requireChef()` and tenant-scope by thread/draft.

Notification/SMS/Twilio behavior:

- No direct outbound SMS from scoring.
- Scoring may trigger internal chef notification only through existing notification pipeline.

Consent/compliance requirements:

- Scoring can inspect consent state for routing, but must not send SMS.
- Store only necessary context, avoiding excessive PII in scoring JSON.

Failure modes and recovery behavior:

- Scoring failure must not block ingestion.
- Missing context should produce lower confidence, not cross-tenant lookups.
- Stale scoring should be visible or recalculated when key context changes.

Acceptance criteria:

- Inbound SMS receives priority plus reason codes.
- Critical safety/time-sensitive messages sort above low-priority messages.
- Known client/event context improves ranking.
- Chef can understand why a message is prioritized.
- No duplicate triage table/system is created.

Security acceptance criteria:

- All scoring queries tenant-scoped.
- No frontend-only security.
- No public exposure of scoring context.
- Any admin view uses `requireAdmin()`.

Verification steps:

- Unit tests for keyword, allergy, cancellation, event-today, payment, VIP/known client, unknown sender, and low-priority cases.
- Integration test inbound SMS populates score/reasons.
- RLS/policy verification for `sms_triage_metadata`.
- Static check no unscoped client/event query was added.

Suggested build queue item title: Upgrade SMS auto-triage scoring with explainable priority reasons.

Suggested product domain/module: Communications / SMS Triage.

Dependencies and blockers:

- Schema fix for `sms_triage_metadata.triage_state`.
- Consent/status signals from Spec 9 improve scoring but should not block MVP scoring.

Recommended swarm lane/wave for future implementation: Wave A scorer and schema; Wave B inbox badges/filters; Wave C tests and RLS proof.

## Spec 3 - Remy SMS Draft Engine Context Upgrade

Raw problem statement: Remy SMS drafts use deterministic templates and limited context. Drafts lack thread history, prior promises, event/menu/intake state, calendar availability, consent signals, and compliance constraints.

Product goal: Produce safer, more useful SMS drafts for chef approval by grounding responses in the current thread, client/event/inquiry data, policies, and consent state.

User roles:

- Chef: reviews, edits, approves, or rejects Remy drafts.
- Client/guest: receives only chef-approved SMS unless a future policy explicitly allows automation.
- Admin: can inspect safety failures or model/policy settings through admin-only surfaces.
- Staff/vendor/public: no access to client SMS drafts.

Who can see/use/create/edit/delete:

- System creates draft suggestions.
- Chef can see/edit/reject/approve drafts in their tenant.
- Admin can inspect platform incidents only with `requireAdmin()`.
- Drafts should be soft-resolved/expired, not hard-deleted.

Who must never see/use it:

- Clients, guests, vendors, public users, and unrelated tenants.

Data ownership and tenant boundary:

- `sms_draft_responses.tenant_id` owns draft rows.
- `thread_id`, `client_id`, `event_id`, and `inquiry_id` joins must be tenant-scoped.
- Draft context must avoid storing more PII than needed.

Current state in code:

- `lib/sms/remy-draft.ts` builds context from chef name, client full name, recent events, open inquiries, sender phone, and message length.
- `lib/sms/triage-actions.ts` handles approve/edit/reject with `requireChef()` and tenant scoping.
- `components/communication/sms-triage-card.tsx` displays original SMS, draft, confidence, category, and approve/edit/reject.
- `approveSmsDraft()` sends through managed Twilio first but discards provider SID and falls back to legacy `sendSms()`.

Desired user flow:

1. Inbound SMS creates a draft with context summary and confidence.
2. Chef sees why the draft was generated and what context it used.
3. Chef can edit or approve.
4. Approved draft sends through managed Twilio, logs canonical outbound event, and reconciles delivery.
5. Rejected or expired drafts remain auditable.

Backend scope:

- Expand context builder to include last N thread messages, last outbound promise, active event/inquiry status, dietary/allergy flags, client preferences, scheduled commitments, calendar availability signals, and consent state.
- Keep deterministic safety rules for cancellation, allergies, money, refunds, legal, alcohol/cannabis, and same-day event issues.
- Add draft policy metadata: allowed automation class, requires chef approval, blocked reason, context completeness, and confidence.
- Remove or gate global `sendSms()` fallback in draft approval.
- Persist provider message ID and delivery reconciliation on approval.

Frontend/action surface scope:

- Add context chips/reason panel to SMS draft cards.
- Add "blocked until consent", "needs manual review", "urgent", and "low confidence" visible states.
- Add retry or resend only after failed delivery and only with consent still valid.

Database/schema changes if needed:

- Add RLS/policies for `sms_draft_responses` if absent.
- Add columns such as `context_version`, `policy_flags`, `blocked_reason`, `communication_event_id`, `provider_message_id`, and `expires_at`.
- Add index on pending drafts by tenant/priority if needed.

API/server action changes if needed:

- Extend `approveSmsDraft()` to create canonical outbound `communication_events` with provider metadata.
- Add expiration/escalation action or cron if stale drafts should auto-expire.
- All actions require `requireChef()` and tenant scoping.

Notification/SMS/Twilio behavior:

- Draft creation does not send SMS.
- Approved drafts use tenant-owned Twilio only.
- Twilio status callbacks update outbound event and draft delivery state.

Consent/compliance requirements:

- Draft may be created even when send is blocked, but UI must show blocked reason.
- No automated client-facing send without chef approval.
- No marketing/promotional SMS without opt-in.
- STOP/withdrawn opt-out blocks approval send.

Failure modes and recovery behavior:

- Context lookup failure produces lower-confidence draft or no draft, with structured failure log.
- Twilio send failure keeps draft unresolved or failed with retry.
- Delivery callback mismatch is logged to webhook/failure observability.

Acceptance criteria:

- Draft context includes thread and relevant client/event/inquiry data.
- Chef sees context and confidence before approval.
- Approval creates provider-trackable outbound event.
- Blocked consent or opt-out state prevents sending.
- Rejection/dismissal state matches DB constraints.

Security acceptance criteria:

- Draft queries tenant-scoped.
- `sms_draft_responses` RLS/policies verified.
- No draft ID URL guessing can send another tenant's SMS.
- No frontend-only approval gate.

Verification steps:

- Unit tests for context builder with known client, unknown sender, open inquiry, upcoming event, allergy/cancellation, opt-out.
- Server action tests for approve/edit/reject tenant denial.
- Mock Twilio approval test verifies provider SID persistence.
- Static check no legacy `sendSms()` fallback remains for approved client drafts unless policy-gated.

Suggested build queue item title: Upgrade Remy SMS drafts with context, policy flags, and delivery tracking.

Suggested product domain/module: Communications / Remy / SMS Drafts.

Dependencies and blockers:

- Consent send boundary from Spec 9.
- Delivery tracking from Spec 1 or shared transport work.
- Observability from Spec 8.

Recommended swarm lane/wave for future implementation: Wave A context and schema; Wave B approval send integration; Wave C UI context panel and tests.

## Spec 4 - SMS Auto-Ack Guardrails

Raw problem statement: SMS auto-ack is a fire-and-forget helper with thin configuration, non-atomic dedupe, unclear service-role behavior from webhook context, no consent/quiet-hours guard, and no robust recovery trail.

Product goal: Make SMS auto-ack safe, tenant-scoped, consent-aware, deduped, policy-bound, observable, and easy for chefs to control.

User roles:

- Chef: enables/disables auto-ack, configures message, sees ack status.
- Client/guest: may receive transactional acknowledgement if policy and consent allow.
- Admin: may inspect failures/system abuse through admin-only views.
- Staff/vendor/public: no access to auto-ack controls.

Who can see/use/create/edit/delete:

- Chef can manage their own auto-response settings.
- System can send one eligible ack per inbound thread/window.
- Admin can inspect aggregate failures.

Who must never see/use it:

- Other tenants, public users, clients as control users, and vendors unless a separate vendor ack policy is created.

Data ownership and tenant boundary:

- `auto_response_config.chef_id` and `sms_triage_metadata.tenant_id` are the boundary.
- Dedup checks must include both `tenant_id` and `thread_id`.

Current state in code:

- `lib/sms/auto-ack.ts` checks `auto_response_config.enabled`, checks `sms_triage_metadata.ack_sent_at` by `thread_id`, sends through legacy `sendSms()`, and upserts `ack_sent_at`.
- `lib/communication/pipeline.ts` triggers auto-ack non-blocking after inbound SMS.
- `auto_response_config` exists in `database/migrations/20260401000066_communication_foundation.sql`.

Desired user flow:

1. Chef enables auto-ack and configures message/policy.
2. Inbound SMS arrives.
3. System checks consent/opt-out, quiet hours, recent ack, emergency exclusions, and managed Twilio availability.
4. If eligible, system sends exactly one ack and records it.
5. If blocked or failed, chef can see why when reviewing the thread.

Backend scope:

- Use admin/service client explicitly where webhook context requires it, but keep tenant filters.
- Move dedupe to an atomic upsert/claim pattern.
- Send through tenant-managed Twilio via `sendManagedTwilioMessage()`.
- Record `communication_events` outbound ack with provider SID.
- Add policy flags for ack category and suppressed reason.

Frontend/action surface scope:

- Add auto-ack status and last ack reason to SMS triage/thread detail.
- Improve settings in `/settings/communication` or reconciled `/settings/communications`.
- Show test/send preview, quiet hours, max frequency, and opt-out suppression state.

Database/schema changes if needed:

- Add auto-ack policy columns to `auto_response_config`: `sms_ack_enabled`, `sms_ack_template`, `sms_ack_min_interval_minutes`, `sms_ack_quiet_hours_behavior`, `sms_ack_requires_known_contact`.
- Add ack provider metadata to `sms_triage_metadata` or link to outbound `communication_event_id`.
- Ensure `triage_state` values include ack-only states without conflicting with draft states.

API/server action changes if needed:

- Settings actions require `requireChef()` and tenant scoping.
- No public auto-ack API.
- Twilio inbound route remains signed.

Notification/SMS/Twilio behavior:

- Ack is transactional only.
- Use tenant Twilio.
- Persist provider SID.
- Rate limit per sender/thread/tenant.

Consent/compliance requirements:

- STOP/withdrawn opt-out suppresses ack unless legal counsel/product policy explicitly permits a one-time compliance reply.
- Ack copy must not be promotional.
- Include business identity where appropriate.

Failure modes and recovery behavior:

- Duplicate inbound webhook retry must not duplicate ack.
- Missing Twilio config records suppressed state.
- Failed send records failure and leaves thread visible.
- DB failure after Twilio success must be captured as critical side-effect failure.

Acceptance criteria:

- Auto-ack sends once per eligible thread/window.
- Auto-ack is tenant-scoped and consent-aware.
- Chef can configure and inspect ack behavior.
- Failures are visible and structured.

Security acceptance criteria:

- Twilio inbound is signature-validated.
- All DB writes include tenant ID.
- No frontend-only settings enforcement.
- Rate limits protect ack loops.

Verification steps:

- Unit tests for dedupe, disabled config, opt-out, unknown contact, quiet hours, invalid phone.
- Integration test inbound SMS sends one ack under duplicate webhook.
- Mock Twilio failure records structured failure.
- Static check legacy `sendSms()` is not used for auto-ack client delivery.

Suggested build queue item title: Harden SMS auto-ack with consent, dedupe, and managed Twilio delivery.

Suggested product domain/module: Communications / SMS Auto-Ack.

Dependencies and blockers:

- Consent engine from Spec 9.
- Observability from Spec 8.
- Delivery reconciliation shared with Spec 1.

Recommended swarm lane/wave for future implementation: Wave A policy/schema and dedupe; Wave B send/reconciliation; Wave C settings and thread UI.

## Spec 5 - Auto-Resolve Queue to Actual Vendor Calling Loop

Raw problem statement: Auto-resolve identifies unresolved ingredients and inserts rows into `auto_resolve_queue`, but no migration defining that table and no durable consumer were found. The loop does not reach actual vendor calls.

Product goal: Convert unresolved ingredient detection into durable, rate-limited, chef-controlled vendor calling work that reuses existing calling, sourcing, and batch-call systems.

User roles:

- Chef: configures auto-resolve, reviews/approves call plan, sees results.
- Staff/vendor: vendors may receive calls only as business contacts.
- Client: may see downstream sourcing status only if chef shares it; never receives AI voice call.
- Admin: can inspect job health and feature flags.
- Guest/public: no access.

Who can see/use/create/edit/delete:

- Chef can see and manage their tenant's auto-resolve targets and call plan.
- System creates queue entries from upcoming event scans.
- Chef or policy can approve execution.
- Admin can inspect system health.

Who must never see/use it:

- Other tenants, clients as call initiators, guests, public users.

Data ownership and tenant boundary:

- Auto-resolve rows must be keyed by `tenant_id` or `chef_id`.
- Events, menus, ingredients, vendors, `ai_calls`, and `supplier_calls` must all be scoped to the same chef.

Current state in code:

- `lib/calling/auto-resolve.ts` scans upcoming events, resolves ingredients, and attempts to insert `auto_resolve_queue` rows.
- `app/api/calling/auto-resolve/route.ts` runs `autoResolveAll()` behind `verifyCronAuth()`.
- `lib/calling/batch-caller.ts` can create batch call plans and execute calls.
- `lib/calling/twilio-actions.ts` has manual supplier/ad-hoc call primitives.
- `app/(chef)/culinary/call-sheet/page.tsx` is the current voice hub.

Desired user flow:

1. Cron scans upcoming events.
2. Unresolved ingredients become durable auto-resolve queue entries.
3. Chef sees a proposed vendor calling plan grouped by vendor/ingredient/event.
4. Chef approves or policy auto-approves vendor/business-contact calls within limits.
5. System executes calls serially or in controlled batches.
6. Results update queue rows, sourcing/session state, vendor signals, and event readiness.

Backend scope:

- Define or reconcile a durable queue table if missing, or map to existing `sourcing_sessions`/`sourcing_session_candidates`.
- Add consumer that turns pending queue rows into batch call plans using `createBatchCallPlan()`.
- Respect supplier calling feature flag, active hours, daily limits, vendor rate limits, and no-client-voice rule.
- Link queue entries to `ai_calls`, `supplier_calls`, `sourcing_sessions`, and event IDs.
- Make idempotency explicit to avoid repeated calls for the same event/ingredient/vendor.

Frontend/action surface scope:

- Add auto-resolve queue panel to `/culinary/call-sheet`, event prep/readiness, or unified approval inbox.
- Actions: approve plan, skip vendor, mark resolved manually, retry failed, view result.

Database/schema changes if needed:

- Add `auto_resolve_queue` only if existing `sourcing_sessions` cannot cover it. Fields: `tenant_id`, `event_id`, `ingredient_name`, `vendor_id`, `status`, `priority`, `approval_status`, `ai_call_id`, `supplier_call_id`, `attempt_count`, `next_attempt_at`, `last_error`, timestamps.
- Add unique idempotency index for tenant/event/ingredient/vendor while active.
- Add RLS/policies aligned with ChefFlow tenant model.

API/server action changes if needed:

- Cron remains `verifyCronAuth()`.
- Chef actions to approve/skip/retry require `requireChef()`.
- Calling execution uses existing server actions/helpers, not client-side direct API.

Notification/SMS/Twilio behavior:

- Voice calls only vendors/business contacts.
- Chef may receive SMS/push alert for failed/unresolved call if configured.
- No client SMS/voice side effect unless separate approved communication item exists.

Consent/compliance requirements:

- Vendor/business contact call policy and active-hours controls apply.
- No client or guest phone numbers can enter the call queue.
- Call recording/transcript disclosure policy should match existing voice system.

Failure modes and recovery behavior:

- No vendors found: queue item stays needs_manual_sourcing.
- Daily limit reached: defer with next attempt.
- Vendor no-answer/busy: retry policy or escalate to chef.
- Twilio failure: mark failed with retry or manual action.
- Missing queue table: future implementation must create additive migration first.

Acceptance criteria:

- Auto-resolve creates durable work that can be consumed.
- Approved queue rows initiate real vendor calls through existing calling system.
- Queue rows close when calls complete or are skipped.
- No duplicate calls for same active target.
- Client phone numbers are excluded.

Security acceptance criteria:

- Cron authenticated.
- Queue reads/writes tenant-scoped.
- Vendor IDs validated against chef ownership.
- URL guessing cannot expose or mutate another tenant's queue.
- Explicit role/contact allow-list blocks client voice.

Verification steps:

- Static `rg "auto_resolve_queue|sourcing_sessions|supplier_calls|ai_calls"` confirms one chosen durable path.
- Unit tests for idempotent queue creation.
- Integration test auto-resolve -> queue -> approved call -> result close.
- Test client/contact type rejection.
- Runtime smoke on `http://localhost:3100/culinary/call-sheet`.

Suggested build queue item title: Wire auto-resolve queue into durable vendor calling execution.

Suggested product domain/module: Calling / Auto-Resolve / Vendor Sourcing.

Dependencies and blockers:

- Queue table decision: new `auto_resolve_queue` vs existing `sourcing_sessions`.
- Vendor calling closed loop from Spec 6.
- Client voice policy from Spec 7 remains hard block.

Recommended swarm lane/wave for future implementation: Wave A schema/idempotency; Wave B queue consumer; Wave C call-sheet/action surface; Wave D verification.

## Spec 6 - Vendor Calling Closed-Loop Execution, Retry, Summarize, Escalate

Raw problem statement: Vendor calling can place calls and receive Twilio webhooks, but batch calls, sourcing sessions, retries, summaries, and escalations are not one durable closed loop.

Product goal: Make vendor calling a closed operational workflow from planned call to result, retry, summary, vendor signal update, and escalation.

User roles:

- Chef: initiates/approves calls, monitors progress, sees summaries, retries/escalates.
- Staff/vendor: business contacts receive calls and may provide responses.
- Client: may receive chef-approved status summaries through non-voice channels only.
- Admin: inspects platform failures/costs/abuse.
- Guest/public: no access.

Who can see/use/create/edit/delete:

- Chef can manage calls for their tenant.
- System can create/update call lifecycle rows.
- Admin can inspect cross-tenant operational health with `requireAdmin()`.
- Vendors receive calls but cannot access internal call records unless a future vendor portal is built.

Who must never see/use it:

- Other tenants, clients as AI-call recipients, public users.

Data ownership and tenant boundary:

- `supplier_calls.chef_id`, `ai_calls.chef_id`, `sourcing_sessions.chef_id`, and vendor records must all match the chef.
- Twilio callbacks use admin client but must resolve to existing scoped call records.

Current state in code:

- `lib/calling/twilio-actions.ts` places supplier, delivery, and venue calls with feature flag, active hours, daily limits, and duplicate guards.
- `app/api/calling/status/route.ts`, `gather/route.ts`, and `recording/route.ts` validate Twilio signatures.
- `lib/calling/batch-caller.ts` creates batch plans and sets in-memory batch state.
- `gather/route.ts` does not process `batch=1` through `getBatchState()`/`advanceBatchState()`.
- `sourcing-session-actions.ts` has session/candidate concepts, but result update is not wired to Twilio webhook completion.
- `vendor_call_metrics` exists but has RLS policy risk using `auth.uid() = chef_id`.

Desired user flow:

1. Chef or auto-resolve creates a call plan.
2. Calls execute within limits.
3. Each call records transcript, recording, extracted data, and provider status.
4. Results update supplier calls, AI calls, sourcing session candidates, vendor metrics, price points, and event readiness.
5. Failed/no-answer calls retry according to policy or escalate to chef.
6. Chef sees a concise summary and next action.

Backend scope:

- Make batch gather actually iterate all batch ingredients or remove batch mode until durable.
- Wire Twilio completion into sourcing candidates and session counters.
- Add retry policy: max attempts, retry delay, no-answer/busy behavior, vendor cooldown.
- Add durable escalation records or action-center/approval items for unresolved failures.
- Update vendor metrics consistently after call outcomes.
- Add role allow-list in gather/status handling so unknown/client-like roles cannot fall through to vendor availability.

Frontend/action surface scope:

- Call sheet should show in-progress, retry scheduled, failed, escalated, summarized, and completed states.
- Sourcing sessions should close automatically from real webhook results.
- Add summary cards and escalation actions: retry, text chef, call manually, mark resolved, skip vendor.

Database/schema changes if needed:

- Add retry fields to `ai_calls` or companion table: `attempt_number`, `max_attempts`, `next_retry_at`, `escalation_status`, `summary`, `closed_loop_status`.
- Reconcile `ai_calls.role` check constraint with roles used in code.
- Add/update RLS policies for calling tables.
- Add indexes for active calls by chef/status/next_retry_at.

API/server action changes if needed:

- Twilio webhook routes remain signature-validated.
- Retry worker route, if added, uses `verifyCronAuth()`.
- Chef retry/skip actions use `requireChef()` and tenant scoping.

Notification/SMS/Twilio behavior:

- Voice calls only business contacts.
- Chef alerts can use SMS/push/email if configured and consent/prefs allow.
- Twilio callback failures are recorded and do not cause retry storms.

Consent/compliance requirements:

- Business-contact call policy applies.
- No client AI voice.
- Recording/transcript handling must be visible and consistent with legal readiness.
- Rate limits and active hours must apply to retries as well as first attempts.

Failure modes and recovery behavior:

- No answer/busy: retry or escalate based on policy.
- Partial batch result: preserve completed ingredient results and continue/escalate remaining.
- Session counter mismatch: repair job or reconciliation action.
- Provider callback missing: stale call detector.
- Twilio API failure: fail with retry/backoff and visible reason.

Acceptance criteria:

- Batch calls either fully work or are disabled from claiming batch behavior.
- Sourcing session candidates update from Twilio outcomes.
- Retry/escalation policy is durable.
- Summaries are visible in call log/session/event context.
- Vendor metrics update.

Security acceptance criteria:

- All actions require chef/admin auth as appropriate.
- Call records scoped by chef.
- Twilio callbacks signed.
- Role allow-list blocks unknown/client roles.
- Client phone numbers cannot be dialed by AI voice.

Verification steps:

- Unit tests for role allow-list and no-client-contact rejection.
- Integration test batch call with two ingredients closes both.
- Integration test no-answer retry/escalation.
- Integration test sourcing candidate completion from gather/status callback.
- DB migration test for `ai_calls.role` allowed values and RLS.
- Runtime smoke on `/culinary/call-sheet`.

Suggested build queue item title: Close vendor calling loop with retry, summaries, and escalation.

Suggested product domain/module: Calling / Vendor Voice / Sourcing Sessions.

Dependencies and blockers:

- Auto-resolve queue path from Spec 5.
- Observability from Spec 8.
- Voice policy guard from Spec 7.

Recommended swarm lane/wave for future implementation: Wave A role/schema/closed-loop state; Wave B batch/session webhook wiring; Wave C retry/escalation; Wave D UI and proof.

## Spec 7 - Client-Facing Voice Policy Decision

Raw problem statement: ChefFlow has a strong current rule that AI voice never calls clients, but there is no single product policy artifact defining what client-facing voice is, what remains forbidden, and what future approval would be required to change it.

Product goal: Create a policy decision/spec that preserves the hard no-AI-client-call rule, clarifies allowed client communication channels, and defines the future decision gate without implementing client voice.

User roles:

- Chef: understands current voice limitations and allowed client channels.
- Client: protected from AI voice calls under current policy.
- Guest: protected from AI voice calls under current policy.
- Admin: owns feature flags and future policy approval.
- Staff/vendor: business-contact voice remains allowed under calling policy.
- Public: no access.

Who can see/use/create/edit/delete:

- This is a product policy spec, not a user feature.
- Admin may manage future feature flags if a future policy changes.
- Chef may see explanatory settings copy if needed.

Who must never see/use it:

- No user can initiate AI client voice calls under current policy.
- No public route exposes voice controls.

Data ownership and tenant boundary:

- No new client voice data should be created.
- If policy UI is added, settings remain chef/admin scoped.

Current state in code:

- `lib/calling/twilio-actions.ts`, `app/api/calling/gather/route.ts`, `app/api/calling/inbound/route.ts`, and `app/(chef)/culinary/call-sheet/page.tsx` document the no-client-call rule.
- `ai_calls.contact_type` allows vendor, venue, unknown, not client in the inspected migration.
- No outbound client voice initiator was found.
- Quick Call UI can dial arbitrary numbers, creating a risk if a chef enters a client number.

Desired user flow:

1. Chef sees voice hub copy and controls that frame voice as vendor/business-contact only.
2. If chef tries to call a known client number via Quick Call or future automation, server blocks it.
3. Product/admin has a written decision gate before any client voice feature is designed.

Backend scope:

- Add explicit server-side business-contact allow-list/deny-client guard to voice initiation paths.
- Add role allow-list in Twilio gather/status paths.
- Add static policy document or ADR if not already present.

Frontend/action surface scope:

- Update Voice Hub settings/help copy if needed.
- Quick Call should warn and block known client numbers before server action, but server remains authority.
- Do not build client voice UI.

Database/schema changes if needed:

- No client voice tables.
- Optional: add `contact_type` enforcement or normalized business-contact table references for calls.
- Optional: add audit event for blocked client voice attempt.

API/server action changes if needed:

- Harden `initiateAdHocCall()` and other call initiators to reject known client/guest numbers.
- Ensure webhook `role` allow-list cannot route client-like roles.

Notification/SMS/Twilio behavior:

- Clients continue to receive email/SMS only when consent and approval rules allow.
- No Twilio voice call is placed to client/guest numbers.

Consent/compliance requirements:

- Future client voice would require explicit product decision, consent model, legal review, opt-out, recordings policy, and chef approval. Not in this build.

Failure modes and recovery behavior:

- Known client number entered into Quick Call: block and show reason.
- Unknown number later matched to client: log incident and prevent future calls.
- Attempted role tampering in callback URL: reject/close safely.

Acceptance criteria:

- Policy document clearly states no AI client voice.
- Voice initiation paths reject known client/guest phone numbers.
- No client voice UI is added.
- Business-contact voice remains available.

Security acceptance criteria:

- Server-side guard, not only UI copy.
- Tenant-scoped known-client number lookup.
- Unknown/forged role cannot become client voice.
- Admin-only future feature flag if policy ever changes.

Verification steps:

- Unit test call initiators reject known client/guest numbers.
- Static `rg` for client voice initiator patterns.
- Manual check Quick Call still works for vendor phone and blocks client phone.
- Security review of gather role allow-list.

Suggested build queue item title: Codify and enforce no-AI-client-voice policy.

Suggested product domain/module: Calling / Voice Policy / Safety.

Dependencies and blockers:

- None for policy spec.
- Future client voice remains blocked until separate explicit decision.

Recommended swarm lane/wave for future implementation: Wave A policy doc and guards; Wave B UI copy/block state; Wave C tests.

## Spec 8 - Observability and Failure Recovery for Communications Side Effects

Raw problem statement: Communication side effects often fail in fire-and-forget paths with console logs only. Scheduled sends, SMS triage, Remy drafts, auto-ack, notifications, Twilio callbacks, and channel preference writes need structured failure capture, retries, and operator visibility.

Product goal: Make communications side effects observable, recoverable, and auditable without blocking primary ingestion unnecessarily.

User roles:

- Chef: sees actionable failures that affect their communications.
- Admin: sees system-wide failures, DLQ, webhook mismatches, retry exhaustion.
- Client/guest/vendor: no direct access to internal failures.
- Public: no access.

Who can see/use/create/edit/delete:

- System creates failure records.
- Chef can view tenant-scoped communication failures that affect them.
- Admin can view/dismiss/retry platform failures.
- Retry actions must be explicit and scoped.

Who must never see/use it:

- Other tenants, public users, clients, guests, vendors.

Data ownership and tenant boundary:

- `side_effect_failures.tenant_id`, `communication_events.tenant_id`, `scheduled_messages.chef_id`, `ai_calls.chef_id`, and `notification_delivery_log.tenant_id` define ownership.
- Admin views require `requireAdmin()`.

Current state in code:

- `lib/monitoring/non-blocking.ts` can record `side_effect_failures`.
- `lib/communication/delivery-reconciliation.ts` tracks provider state.
- `notification_delivery_log` exists for notification attempts.
- `webhook_events`, `cron_executions`, DLQ, and automation idempotency migrations exist.
- `lib/communication/pipeline.ts` fires SMS triage, Remy draft, notification, auto-ack, and channel preference side effects with console-only catch handlers.
- Twilio webhook validates signatures but unmatched callbacks are not stored in `webhook_events`.

Desired user flow:

1. Communication event ingests successfully.
2. Non-blocking side effects run with structured wrappers.
3. Failures are recorded with tenant, operation, entity, retryability, and severity.
4. Chef sees tenant-impacting failures when action is needed.
5. Admin can retry/dismiss/diagnose from a central failure surface.

Backend scope:

- Wrap fire-and-forget side effects in a shared comms side-effect runner.
- Record failures to `side_effect_failures`, DLQ, or a purpose-built comms recovery table.
- Add retry classification: transient, permanent, blocked_by_policy, missing_config.
- Log Twilio webhook receipt and unmatched callbacks to `webhook_events` or equivalent.
- Reconcile scheduled messages, notification logs, communication delivery, and call state without duplicating systems.

Frontend/action surface scope:

- Add communication health detail to existing `components/communication/communication-health-panel.tsx`.
- Chef-facing failures should link to affected thread, scheduled message, draft, or call.
- Admin surface should allow dismiss/retry where safe.

Database/schema changes if needed:

- Extend `side_effect_failures` with `retryable`, `retry_count`, `next_retry_at`, `resolved_at`, `resolved_by`, `related_table`, `related_id` if not already sufficient.
- Add indexes for tenant/unresolved/retryable failures.
- Verify RLS/live state for operational tables, especially after broad RLS-disable migration.

API/server action changes if needed:

- Admin retry/dismiss actions require `requireAdmin()`.
- Chef acknowledgment/retry for tenant-scoped failures requires `requireChef()`.
- Retry cron uses `verifyCronAuth()`.

Notification/SMS/Twilio behavior:

- Do not notify clients about internal failures automatically.
- Chef/admin alerts use existing notification preferences.
- Twilio callback retry storms should receive 200 when internal recovery has recorded enough state, where appropriate.

Consent/compliance requirements:

- Failure records must avoid unnecessary full message bodies where PII risk is high.
- Store redacted phone/email when possible.
- Retention/pruning policy for failure logs.

Failure modes and recovery behavior:

- Side-effect failure: record and optionally retry.
- Failure recorder fails: last-resort console error.
- Retry exhaustion: escalate to chef/admin.
- Duplicate webhook: idempotent reconciliation.
- Missing provider event: create unmatched webhook record for diagnosis.

Acceptance criteria:

- SMS triage, Remy draft, auto-ack, notifications, scheduled sends, and Twilio unmatched callbacks produce structured failure records.
- Retryable failures can be retried without duplicate sends.
- Chef/admin can see relevant unresolved failures.
- Existing ingestion remains non-blocking where intended.

Security acceptance criteria:

- Failure views are role-gated.
- Tenant failures are tenant-scoped.
- Sensitive data is redacted.
- Retry actions re-check auth, tenant, consent, and idempotency.

Verification steps:

- Unit test side-effect wrapper records failures.
- Integration test pipeline side-effect failure does not block ingest but creates failure record.
- Test unmatched Twilio status callback is recorded.
- Test admin retry/dismiss requires admin.
- RLS verification for `side_effect_failures`, `notification_delivery_log`, `webhook_events`, and DLQ tables.

Suggested build queue item title: Add structured observability and recovery for communications side effects.

Suggested product domain/module: Communications / Observability / Recovery.

Dependencies and blockers:

- None, but should be early because other specs rely on it.

Recommended swarm lane/wave for future implementation: Wave A failure schema/wrapper; Wave B pipeline and webhook instrumentation; Wave C UI/admin recovery; Wave D tests.

## Spec 9 - SMS Consent, Compliance, and Control-Plane UX

Raw problem statement: Consent records and preference fragments exist, but SMS send paths do not enforce opt-in/opt-out at a single boundary, inbound STOP/HELP handling is missing, and there is no clear chef control-plane UX for SMS compliance.

Product goal: Provide a single SMS compliance control plane and send eligibility boundary that governs scheduled SMS, Remy draft sends, auto-ack, SMS bridge, notifications, and future automations.

User roles:

- Chef: manages SMS settings, sees consent status, resolves blocked sends.
- Client: grants/withdraws consent and can opt out.
- Guest: may grant event-scoped consent where needed.
- Admin: configures platform policy and audits compliance failures.
- Staff/vendor: separate business-contact communication policy if needed.
- Public: no tenant access.

Who can see/use/create/edit/delete:

- Chef can see consent status for their own clients/guests and create internal notes/requests.
- Client/guest can manage their own consent through approved portal flows.
- System can record inbound STOP/HELP and consent events.
- Admin can audit policy and failures.
- Hard delete should not remove consent audit history.

Who must never see/use it:

- Other tenants, public users, unrelated staff/vendors.

Data ownership and tenant boundary:

- `consent_records.tenant_id` and client/guest ownership define access.
- `clients.communication_preference` may be read only through tenant-scoped access.
- SMS bridge and Twilio records must map to the chef tenant before consent decisions.

Current state in code:

- `database/migrations/20260517200079_consent_records.sql` creates `consent_records` and enables RLS but inspected migration shows no policies.
- `clients.communication_preference` exists from communication foundation.
- `components/settings/sms-bridge-panel.tsx` exposes SMS Bridge controls but not consent eligibility.
- `app/api/webhooks/twilio/route.ts` and `app/api/comms/sms/route.ts` ingest inbound SMS but no STOP/HELP handling was found.
- `sendManagedTwilioMessage()` and `sendSms()` do not enforce consent themselves.

Desired user flow:

1. Chef opens communication settings/control plane.
2. Chef sees SMS setup, default policy, opt-in status, blocked recipients, recent STOP/HELP events, and eligible send classes.
3. Inbound STOP/HELP is processed automatically and updates consent state.
4. Any outbound SMS path calls one eligibility function before sending.
5. Blocked sends show a clear reason and remediation.

Backend scope:

- Create central SMS eligibility function, for example `assertSmsSendAllowed()` or `getSmsSendEligibility()`.
- Normalize consent classes: transactional, marketing, event reminder, auto-ack, chef notification, vendor/business.
- Process STOP/START/HELP inbound messages before normal triage/draft behavior.
- Add audit log for consent changes.
- Ensure all outbound SMS paths call the eligibility boundary.

Frontend/action surface scope:

- Add SMS compliance panel to reconciled communications settings route.
- Per-client/guest consent indicator in client profile/thread where relevant.
- Blocked-send UI in SMS drafts, scheduled messages, and approval inbox.
- SMS Bridge panel should show eligibility/test status and recent ingest/error log.

Database/schema changes if needed:

- Add policies for `consent_records`.
- Add fields if needed: `channel`, `recipient_phone`, `scope`, `policy_class`, `evidence`, `source_event_id`, `expires_at`, `revoked_reason`.
- Add unique active consent/opt-out indexes by tenant/recipient/channel/class.
- Add audit/append-only consent event table if `consent_records` is not sufficient.

API/server action changes if needed:

- Consent actions require `requireChef()` for chef-side and `requireClient()` or token-scoped access for client portal.
- Twilio inbound routes process STOP/START/HELP with signature validation.
- SMS Bridge ingest honors blocklist and consent policy.

Notification/SMS/Twilio behavior:

- STOP replies suppress future outbound SMS where required.
- HELP may return a compliant help message if policy approves.
- START/UNSTOP may restore eligibility where legally valid.
- Outbound SMS sends record consent basis.

Consent/compliance requirements:

- Marketing/promotional SMS requires explicit opt-in.
- Transactional SMS needs policy classification and opt-out handling.
- No automated client-facing SMS unless policy allows and approval rules are satisfied.
- Retain audit history for opt-in/opt-out changes.

Failure modes and recovery behavior:

- Unknown consent: block or require chef approval depending on policy class.
- Conflicting records: most restrictive state wins.
- Consent lookup failure: fail closed for client-facing sends.
- Inbound STOP processing failure: record critical failure and suppress further sends if possible.

Acceptance criteria:

- Single send eligibility function governs all SMS send paths.
- STOP/HELP/START handling works for signed Twilio inbound.
- Chef can see and remediate blocked SMS sends.
- Consent records are tenant-scoped and auditable.

Security acceptance criteria:

- RLS/policies verified for consent records.
- No other tenant can read consent data.
- Send eligibility runs server-side.
- Twilio inbound forged requests are rejected.
- Rate limits protect public/bridge compatibility routes.

Verification steps:

- Unit tests for consent classes, opt-in, opt-out, unknown, revoked, expired.
- Integration test inbound STOP updates consent and blocks later send.
- Integration test scheduled SMS/draft/auto-ack all call eligibility boundary.
- Browser check settings control plane and blocked-send UI.
- RLS/policy check for `consent_records`.

Suggested build queue item title: Build SMS consent and compliance control plane with send eligibility enforcement.

Suggested product domain/module: Communications / Compliance / SMS Control Plane.

Dependencies and blockers:

- Product/legal decision on transactional vs marketing classes and HELP/STOP copy.
- Route consolidation decision for `/settings/communication` vs `/settings/communications`.

Recommended swarm lane/wave for future implementation: Wave A policy/schema/eligibility; Wave B inbound STOP/HELP; Wave C settings/client UI; Wave D enforcement across send paths.

## Spec 10 - Unified Communication Approval Inbox and Action Surface

Raw problem statement: ChefFlow has separate SMS drafts, triage suggestions, scheduled messages, SMS Bridge, voice call plans, automation approvals, and action-center primitives, but no consolidated communication approval inbox/action surface.

Product goal: Give chefs one role-correct, tenant-scoped approval surface for communication side effects before they send or execute, while reusing existing inbox, approval queue, action center, and communication systems.

User roles:

- Chef: reviews and approves/rejects/edits communication actions.
- Client/guest: may receive approved SMS/email/portal messages; no access to internal approval queue.
- Admin: audits platform policy/failures/admin approvals.
- Staff/vendor: may be targets of approved vendor calls or business communications; no internal approval access by default.
- Public: no access.

Who can see/use/create/edit/delete:

- Chef can see and resolve their tenant approvals.
- System creates approval items from Remy drafts, scheduled sends, auto-resolve call plans, failed sends, and policy blocks.
- Admin can view cross-tenant operational data only through admin-gated views.
- Delete should be replaced by resolve/cancel/expire audit states.

Who must never see/use it:

- Other tenants, clients, guests, vendors, public users.

Data ownership and tenant boundary:

- Approval items must include `tenant_id` or `chef_id`.
- Linked resources must be tenant-verified at read/action time.
- Approving an item must re-check current consent, route ownership, and policy state.

Current state in code:

- `/inbox` is the main communication triage surface and already embeds `SmsTriage`.
- `components/communication/sms-triage-card.tsx` handles SMS draft approve/edit/reject.
- `components/communication/triage-suggestions-section.tsx` has non-durable local apply/dismiss behavior.
- `lib/autonomy/approval-queue-actions.ts`, `lib/autonomy/domains/communication.ts`, and action-center files exist.
- `components/communication/communication-inbox-client.tsx` provides bulk actions and thread workflows.
- Settings and communication surfaces are fragmented across `/communication`, `/settings/communication`, and `/settings/communications`.

Desired user flow:

1. Chef opens Inbox or a dedicated Approval tab.
2. Chef sees all pending communication approvals: SMS drafts, scheduled SMS needing consent/config, auto-ack blocked, vendor call plan approvals, failed/retryable sends, Remy-generated actions.
3. Chef can approve, edit, reject, snooze, assign, retry, or open the source thread/event.
4. Approval action calls the owning domain action and records audit state.
5. Completed approvals disappear from pending but remain auditable.

Backend scope:

- Choose a single durable approval substrate: existing `approval_queue` if viable, otherwise action center task model with explicit communication kind.
- Add adapters that create approval items from SMS drafts, scheduled sends, auto-resolve call plans, failed send retries, and policy-blocked sends.
- Each approval kind maps to an owning action: approve SMS draft, send scheduled SMS, approve vendor call plan, retry failed send, dismiss blocked item.
- Re-check tenant, role, consent, idempotency, and current resource state at approval time.

Frontend/action surface scope:

- Add an approval section to `/inbox` or a reachable `/communication/approvals` page.
- Reuse `SmsTriage` card patterns but normalize action buttons and states.
- Add filters by channel, risk, due time, blocked, retryable, and approval type.
- Link to source thread/event/client/vendor/call plan.
- Reconcile singular/plural communication settings links.

Database/schema changes if needed:

- Prefer existing `approval_queue`/action-center tables.
- Add columns only if missing: `tenant_id`, `domain`, `kind`, `risk_level`, `source_table`, `source_id`, `status`, `payload`, `expires_at`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`.
- Add indexes for tenant/status/kind/due.
- Add RLS/policies.

API/server action changes if needed:

- Approval list and mutations require `requireChef()` and tenant scope.
- Admin actions require `requireAdmin()`.
- Approval execution must call domain-specific server functions, not duplicate send/call logic.

Notification/SMS/Twilio behavior:

- Approval does not automatically bypass consent.
- Approved SMS uses managed Twilio and delivery tracking.
- Approved vendor call uses voice system with no-client guard.
- Notification sends to chef can summarize pending approvals.

Consent/compliance requirements:

- Approval UI must show consent/policy status.
- Approving a blocked item must remain impossible unless the block is resolved.
- No automated client SMS without policy allowance and approval.
- No AI client voice.

Failure modes and recovery behavior:

- Source object changed after approval item created: stale item should refresh or block.
- Approval execution fails: item remains retryable with error.
- Duplicate approval click: idempotent action.
- Consent revoked before approval: block send.

Acceptance criteria:

- One approval surface lists all communication approval types.
- Each item can be acted on or opened at source.
- Approval execution reuses existing domain systems.
- Approval state is durable and auditable.
- Route/nav/settings fragmentation is reconciled or explicitly documented.

Security acceptance criteria:

- Server-side role enforcement on list and mutations.
- Tenant-scoped linked resource validation.
- No frontend-only blocked state.
- URL guessing cannot approve another tenant's item.
- Twilio/webhook/API routes remain independently protected.

Verification steps:

- Unit tests for approval adapters and stale source handling.
- Server action tests for tenant denial and duplicate approval.
- Integration test approve SMS draft from unified inbox sends via existing action.
- Integration test approve vendor call plan respects no-client guard.
- Browser check `/inbox` or new approval route on `http://localhost:3100`.

Suggested build queue item title: Create unified communication approval inbox and action surface.

Suggested product domain/module: Communications / Approval Inbox / Action Center.

Dependencies and blockers:

- Choose approval substrate after inspecting `approval_queue` and action-center schema.
- Consent boundary from Spec 9.
- Voice guard from Spec 7.
- Observability from Spec 8.

Recommended swarm lane/wave for future implementation: Wave A approval substrate/adapters; Wave B UI/action surface; Wave C domain action wiring; Wave D role/security/runtime proof.

## Reconciled Dependencies and Build Order

Recommended implementation order:

1. Observability and failure recovery for communications side effects.
2. SMS consent/compliance/control-plane and send eligibility.
3. Client-facing voice policy enforcement and Quick Call/business-contact guard.
4. SMS scheduled sending completion.
5. SMS auto-ack guardrails.
6. Remy SMS draft context and provider-state upgrade.
7. SMS auto-triage scoring upgrade.
8. Auto-resolve queue to vendor calling loop.
9. Vendor calling closed-loop retry/summarize/escalate.
10. Unified communication approval inbox/action surface.

Reasoning:

- Observability and consent are shared safety foundations for nearly every SMS build.
- Voice policy guard should land before expanding auto-resolve/vendor automation.
- Scheduled SMS and auto-ack need the shared consent/send boundary.
- Approval inbox is most useful after there are multiple mature approval sources to unify.

Shared dependency matrix:

| Spec                  | Depends on                   | Unlocks                               |
| --------------------- | ---------------------------- | ------------------------------------- |
| 1 Scheduled SMS       | Spec 8, Spec 9               | Real scheduled SMS and delivery state |
| 2 Triage scoring      | Schema fix, optional Spec 9  | Better inbox priority                 |
| 3 Remy drafts         | Spec 8, Spec 9               | Safer chef-approved SMS               |
| 4 Auto-ack            | Spec 8, Spec 9               | Safe transactional acknowledgement    |
| 5 Auto-resolve queue  | Spec 7, Spec 8               | Durable vendor call planning          |
| 6 Vendor closed loop  | Spec 5, Spec 7, Spec 8       | Reliable vendor sourcing automation   |
| 7 Client voice policy | None                         | Guardrail for all voice work          |
| 8 Observability       | None                         | Recovery for all comms side effects   |
| 9 Consent UX          | Product/legal copy decisions | SMS send boundary                     |
| 10 Approval inbox     | Specs 3, 5, 8, 9             | Unified action surface                |

## Queue-Ready Item List

1. Complete scheduled SMS sending with delivery reconciliation.
2. Upgrade SMS auto-triage scoring with explainable priority reasons.
3. Upgrade Remy SMS drafts with context, policy flags, and delivery tracking.
4. Harden SMS auto-ack with consent, dedupe, and managed Twilio delivery.
5. Wire auto-resolve queue into durable vendor calling execution.
6. Close vendor calling loop with retry, summaries, and escalation.
7. Codify and enforce no-AI-client-voice policy.
8. Add structured observability and recovery for communications side effects.
9. Build SMS consent and compliance control plane with send eligibility enforcement.
10. Create unified communication approval inbox and action surface.

Do not add these to the build queue until explicitly instructed. When queueing, preserve each raw problem statement and convert each item into goal, scope, acceptance criteria, risks, dependencies, and verification.

## Remaining Open Product Decisions

- Which route is canonical for communication settings: `/settings/communication` or `/settings/communications`?
- Should scheduled messages support a durable `draft` status, or should drafts live elsewhere?
- What exact SMS policy classes are allowed: transactional, reminders, marketing, auto-ack, payment, event-day, guest?
- What exact STOP/HELP/START copy should ChefFlow send?
- Which consent source is canonical: `consent_records`, `clients.communication_preference`, legal marketing consent tables, or a reconciled model?
- Should auto-ack be allowed for unknown senders or only known clients?
- Is auto-resolve allowed to auto-call vendors without chef approval, or should it always create approval items first?
- Should `auto_resolve_queue` be created, or should existing `sourcing_sessions` be the durable queue?
- What retry limits apply for vendor calls by default?
- Should Quick Call require selecting/creating a vendor/business-contact record before dialing?
- Which existing approval substrate is canonical: autonomy `approval_queue`, action center, or inbox-native approval items?
- What data retention/redaction policy applies to transcripts, recordings, SMS bodies, and failure logs?

## Source-Grounding Verification Performed

Read-only audit lanes inspected these real modules and routes:

- SMS/Twilio: `lib/sms/send.ts`, `lib/sms/auto-ack.ts`, `lib/sms/triage-gate.ts`, `lib/sms/remy-draft.ts`, `lib/sms/triage-actions.ts`, `lib/communication/pipeline.ts`, `lib/communication/managed-ingest.ts`, `lib/communication/managed-channels.ts`, `app/api/webhooks/twilio/route.ts`, `app/api/comms/sms/route.ts`, `app/api/scheduled/messages/route.ts`.
- Calling: `lib/calling/twilio-actions.ts`, `lib/calling/auto-resolve.ts`, `lib/calling/batch-caller.ts`, `lib/calling/sourcing-session-actions.ts`, `lib/calling/vendor-rate-limiter.ts`, `lib/calling/batch-state.ts`, `lib/calling/post-call-actions.ts`, `app/api/calling/*`, `components/calling/*`, `app/(chef)/culinary/call-sheet/page.tsx`.
- Automation/observability: `lib/communication/delivery-reconciliation.ts`, `lib/communication/health-metrics.ts`, `lib/monitoring/non-blocking.ts`, `lib/auth/cron-auth.ts`, notification delivery logs, DLQ/idempotency/webhook/cron migrations.
- UI/action surfaces: `app/(chef)/inbox/page.tsx`, `components/communication/communication-inbox-client.tsx`, `components/communication/sms-triage-card.tsx`, `components/communication/communication-health-panel.tsx`, `components/settings/sms-bridge-panel.tsx`, `/communication`, `/settings/communication`, `/settings/communications`, navigation/settings files, consent and approval queue actions.
- Migrations: `20260401000073_communication_scale_features.sql`, `20260401000066_communication_foundation.sql`, `20260401000064_side_effect_failures.sql`, `20260302000005_notification_delivery_log.sql`, `20260421000120_communication_transport_metadata.sql`, `20260421000130_communication_delivery_reconciliation.sql`, `20260410000002_supplier_calls.sql`, `20260411000001_ai_calls_system.sql`, `20260511000001_sourcing_sessions.sql`, `20260511000001_vendor_call_metrics.sql`, `20260515000003_sms_bridge_config.sql`, `20260517000001_sms_triage_metadata.sql`, `20260517200400_sms_draft_responses.sql`, `20260517200079_consent_records.sql`, `20260518000004_vendor_communication_foundation.sql`.

Final source-grounding checks required before firing future builds:

- Every spec references current modules listed above.
- No spec proposes a duplicate system where an existing module can be extended.
- Every route/action/data path includes auth and tenant-scope expectations.
- Every user role has explicit access rules.
- Each future build includes verification steps.
- SMS/client automation is consent-aware.
- Calling remains vendor/business-contact only unless explicitly marked policy-only.
