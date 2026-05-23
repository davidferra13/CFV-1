# ChefFlow Automated Communications Control Plane Spec Pack

Created: 2026-05-21

## Source Intake

Active feature: ChefFlow automated calling/texting for chef communications, vendor calls, SMS triage, Remy drafts, scheduled messages, and comms approval.

Verdict: useful but partial. The current direction has strong bones, but the product needs a polished control plane, consent ledger, unified approval queue, post-call action extraction, and closed-loop recovery before automated communications become more aggressive.

Competitive references supplied in intake:

- Twilio Messaging Services and messaging policy: compliance resources, opt-out handling, sender identity, delivery status, campaign health.
- OpenPhone/Quo call summaries: shared inbox with calls, texts, transcripts, summaries, and AI reply help in one surface.
- Dialpad AI: call summaries with action items, key moments, and evidence traceability.
- Intercom Fin: AI resolves only where confident and hands off inside an agent workflow.
- HoneyBook automations: lifecycle-triggered automations across inquiry, booking, payment, contract, scheduling, incomplete actions.
- ServiceTitan customer notifications: operational notifications tied to job state, preferences, and timing.
- Klaviyo SMS compliance: quiet hours, frequency caps, consent, and regional rules as product behavior.

## Product North Star

ChefFlow communications should behave like an operating control plane, not a pile of disconnected sends. The chef sees every pending or failed communication action, understands why it exists, knows whether policy permits it, and can approve, edit, retry, dismiss, or escalate from one place.

No client-facing automated SMS should send unless consent, quiet hours, frequency, preference, tenant, and approval policy pass. Remy may draft and prioritize, but the chef remains the accountable sender for low-confidence, money, dietary, schedule-change, and conflict-sensitive communications.

## Required Product Contracts

- Unified approval: SMS drafts, auto-acks, scheduled sends, failed sends, inbound triage, Remy drafts, and call outcomes land in one chef-facing queue.
- Consent ledger: every client/channel has opt-in source, opt-out state, STOP/HELP handling, sender identity, quiet-hours state, frequency state, and delivery failure history.
- Policy gate: automated or scheduled SMS runs through deterministic checks before send.
- Evidence chain: every approval item links to its source thread, call, transcript, recording, delivery log, event, client, vendor, and generated task where applicable.
- Recovery loop: failed sends and failed calls are recoverable through retry, alternate channel, edit-and-resend, or escalation.
- Tenant and role safety: all records are tenant-scoped; all chef/admin/staff/client views use server-side auth gates.
- AI boundary: Remy drafts and ranks, but does not silently make canonical client commitments.

## Spec 1: Unified Communication Approval and Compliance Control Plane

This is the first queue item and the smallest high-leverage batch.

### Goal

Create the chef-facing control plane that merges communication approval, SMS policy checks, scheduled delivery, failed-send recovery, and vendor-call outcomes into one operational surface.

### Scope

- One approval inbox for SMS drafts, auto-acks, scheduled sends, failed sends, and call outcomes.
- SMS consent, quiet-hours, frequency, preference, and eligibility checks before automated or scheduled SMS.
- Scheduled SMS delivery becomes real, subject to policy and approval.
- Proof links back to threads, calls, transcripts, recordings, delivery logs, clients, events, vendors, and tasks.
- Vendor call outcomes become actionable tasks.

### Acceptance

- Chef can see every pending communication action in one place.
- No automated client SMS sends without consent and policy pass.
- Failed sends are recoverable.
- Vendor call outcomes become actionable tasks.
- Every item is tenant-scoped and role-gated.

### Out Of Scope

- AI voice calls to clients.
- Fully autonomous Remy client replies.
- Broad CRM rebuild.
- New duplicate inbox system outside existing communication threads.

## Spec 2: SMS Compliance Center And Channel Health

### Goal

Make SMS compliance visible and inspectable before ChefFlow expands SMS automation volume.

### Scope

- Per-client SMS eligibility: consent source, opt-in time, opt-out state, STOP/HELP state, preferred channel, phone validity, regional eligibility, and quiet-hours status.
- Account/channel health: Twilio configuration, sender identity, messaging service health, delivery failure rate, webhook health, and unresolved provider errors.
- Policy audit log: every allowed, blocked, delayed, or retried SMS records the policy inputs and outcome.
- Operator actions: mark consent source, pause channel, retry verification, export compliance log, and open affected client/thread/event.

### Acceptance

- Chef/admin can inspect why a client is or is not SMS-eligible.
- STOP/HELP and opt-out states block sends deterministically.
- Quiet-hours and frequency caps are enforced from the same policy used by scheduled sends.
- Delivery failures are visible with provider status and recovery path.

## Spec 3: Post-Call Vendor Action Extraction

### Goal

Turn vendor and venue calls into structured ChefFlow work with transcript evidence.

### Scope

- Extract structured call outcomes: price point, item availability, substitution, delivery window, minimum order, account/terms issue, retry recommendation, and confidence.
- Create tasks or queue actions from outcomes: update ingredient price, confirm delivery, retry vendor, notify chef, request quote, or escalate to manual call.
- Attach evidence: transcript segment, summary, recording link when available, call metadata, vendor, event/menu/ingredient references.
- Support chef review, edit, approve, dismiss, or merge duplicate extracted tasks.

### Acceptance

- Vendor call summaries produce actionable tasks instead of passive text-only summaries.
- Each task links back to transcript/recording evidence.
- Low-confidence or conflicting extraction requires chef approval.
- Ingredient/vendor/event state is not mutated without a recorded source and tenant-scoped authorization.

## Spec 4: Lifecycle-Aware Texting

### Goal

Schedule and send operational texts based on client/event lifecycle while respecting consent, preferences, quiet hours, frequency, channel handling, and chef approval policy.

### Scope

- Supported lifecycle triggers: inquiry received, quote sent, deposit unpaid, contract pending, menu pending, event in 48 hours, day-before prep, post-event follow-up, dormant client reactivation.
- Policy-aware scheduling: sends may be approved, delayed for quiet hours, blocked by missing consent, capped by frequency, or redirected to another channel.
- Duplicate-channel protection: do not send SMS if email/in-app/channel already satisfied the same update unless policy allows.
- Chef approval policy: sensitive messages around money, dietary, schedule changes, conflict, cancellation, or low Remy confidence require approval.

### Acceptance

- Scheduled SMS jobs actually send when policy passes.
- Blocked or delayed sends appear in the approval/control plane with reason.
- Lifecycle triggers are tied to event/client state, not loose timers only.
- Message history records trigger, policy result, sender, and delivery outcome.

## Spec 5: Closed-Loop Vendor Calling

### Goal

Move vendor calling from "queued attempt" to an operational loop: call, retry safely, summarize, extract, escalate, and mark ingredient/vendor state with evidence.

### Scope

- Call plans define vendor, purpose, ingredient/event context, allowed retries, retry spacing, active hours, and escalation threshold.
- Outcomes include reached, voicemail, no answer, bad number, unavailable item, confirmed item, confirmed delivery, price received, and needs human follow-up.
- Safe retry policy prevents call storms and respects vendor business hours.
- Successful outcomes feed post-call extraction and communication approval.
- Failed outcomes create recovery actions and keep the unresolved ingredient/vendor state visible.

### Acceptance

- Vendor call loops stop only after success, exhaustion, or explicit escalation.
- Retry attempts and outcomes are visible with timestamps and evidence.
- Ingredient/vendor state is updated only with source proof.
- Failures surface in the unified approval/control plane instead of disappearing.

## Spec 6: Remy Communication Approval Guardrails

### Goal

Constrain Remy to draft, rank, summarize, and recommend while preserving chef approval for sensitive or uncertain client/vendor communications.

### Scope

- Remy drafts include confidence, trigger, policy reason, source evidence, and proposed next action.
- Mandatory approval classes: low confidence, money, dietary, schedule change, cancellation, client conflict, legal/compliance, vendor commitment, and external-send side effects.
- Safe classes may allow auto-ack only when policy permits and the message makes no commitment beyond receipt/status.
- Remy actions write audit rows and appear in the same approval/control plane when pending, sent, blocked, or failed.

### Acceptance

- Remy cannot silently own canonical client communication in sensitive classes.
- Approval state is visible and auditable.
- Chef can edit, approve, deny, or ask Remy to revise a draft.
- Remy draft evidence points to source thread, event, client, call, or lifecycle trigger.

## Fire Order Recommendation

1. Unified Communication Approval and Compliance Control Plane.
2. SMS Compliance Center And Channel Health.
3. Lifecycle-Aware Texting.
4. Post-Call Vendor Action Extraction.
5. Closed-Loop Vendor Calling.
6. Remy Communication Approval Guardrails.

The first item may implement thin versions of several later specs. Follow-on items should deepen the surfaces without creating duplicate inboxes or bypassing the first control plane.

## Verification Expectations

- Run focused unit/integration tests for communication policy, scheduled send, vendor call outcome extraction, and approval item transitions.
- Use the canonical app URL `http://localhost:3100` for UI/runtime proof when fired.
- Exercise happy paths and blocked paths: consent pass, no consent, quiet hours, frequency cap, opt-out, failed delivery, retry, post-call extraction, low-confidence Remy draft.
- Confirm all new pages/routes are registered in `lib/auth/route-policy.ts` and all server actions/API routes use required auth.
- Confirm all tenant data queries include tenant scoping.
- Run `/wiring-audit` after build with communication, lifecycle, Remy, automation, CIL, navigation, Priority Queue, and ledger coverage.
