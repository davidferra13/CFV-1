# Exact Build: Communication-Driven Event OS

## Purpose

This is the exact target build for ChefFlow if communication is the operational source of truth.
It is designed to be executed by a development team against the current codebase.

This document answers:

1. What this architecture is called.
2. What to build, in what order.
3. What must change from current implementation to reach near-perfect autonomy.

## Correct Vocabulary

Use these terms with engineering teams:

- Event Sourcing: system truth is an append-only stream of events.
- CQRS: command writes are separated from read projections.
- Process Manager (Saga): orchestrates multi-step workflows across domains.
- Outbox Pattern: reliable event dispatch after DB commit.
- Projection: read models derived from events for UI/API.
- Policy Engine: deterministic rules that produce recommended/auto actions.
- Human-in-the-Loop (HITL): required approvals at defined control points.
- Idempotency: repeated commands/events produce one effective outcome.

## Current Baseline (Already Strong)

Existing building blocks to keep:

- Communication ingestion pipeline and triage data model:
  - `lib/communication/pipeline.ts`
  - `lib/communication/actions.ts`
  - `supabase/migrations/20260222000002_communication_triage.sql`
- Gmail classification and ingestion:
  - `lib/gmail/classify.ts`
  - `lib/gmail/sync.ts`
  - `lib/gmail/historical-scan.ts`
- Event lifecycle FSM + atomic transition RPC:
  - `lib/events/fsm.ts`
  - `lib/events/transitions.ts`
  - `supabase/migrations/20260320000001_atomic_transition_and_dlq.sql`
- Financial event sourcing (append-only ledger):
  - `lib/ledger/append.ts`
  - `lib/ledger/compute.ts`
  - `supabase/migrations/20260215000003_layer_3_events_quotes_financials.sql`
- Reliability primitives:
  - `lib/mutations/idempotency.ts`
  - `lib/resilience/retry.ts`
  - `supabase/migrations/20260320000003_dlq_tables.sql`

## Gaps Blocking "Perfect"

1. Communication state is still mutable.
2. No universal transactional outbox for cross-domain side effects.
3. Integration pipeline normalizes events but does not deeply project into all core domains.
4. Copilot autonomy is intentionally narrow.
5. Some transitions are validated in app code before DB write, but DB-side compare-and-set is not complete.

## Target Architecture

```text
Inbound adapters (Gmail, Wix, web forms, SMS, DM, staff, manual log)
  -> Canonical Event Envelope
  -> Append to domain_event_log (immutable)
  -> Outbox row in same transaction
  -> Event bus worker dispatch
  -> Process managers (Lead, Inquiry, Quote, Event, Payment, Follow-up, Staffing)
  -> Command handlers (idempotent)
  -> Aggregate stores (current state tables)
  -> Projection builders (inbox, dashboards, analytics, next actions)
  -> Policy engine + autonomy gates
  -> Actions (notify, draft, escalate, auto-advance, schedule)
```

## Core Event Envelope (Canonical Contract)

Every event across the platform must conform:

- `event_id` (uuid, immutable)
- `tenant_id` (uuid)
- `aggregate_type` (`communication_thread`, `inquiry`, `quote`, `event`, `invoice`, `payment`, `client`, `staff`, `integration`)
- `aggregate_id` (uuid/text)
- `event_type` (string, versioned, e.g. `communication.message_received.v1`)
- `occurred_at` (timestamptz)
- `recorded_at` (timestamptz default now)
- `causation_id` (uuid nullable)
- `correlation_id` (uuid nullable)
- `actor_type` (`chef`, `client`, `system`, `staff`, `integration`)
- `actor_id` (uuid/text nullable)
- `source` (`gmail`, `website_form`, `manual`, `wix`, `stripe`, etc.)
- `idempotency_key` (text nullable, unique by tenant)
- `payload` (jsonb)
- `schema_version` (int)

## Required New Data Model

Add these tables:

1. `domain_event_log` (append-only)
2. `event_outbox` (pending, dispatched, failed, dead)
3. `event_inbox` (consumer dedup for handlers)
4. `automation_action_log` (append-only action history)
5. `projection_checkpoint` (last processed event per projector)

Constraints:

- `domain_event_log`: no update/delete policies and immutability trigger.
- `event_outbox`: inserted in same transaction as aggregate change/event append.
- unique `(tenant_id, idempotency_key)` when present.

## Domain Event Taxonomy (Minimum)

### Communication

- `communication.message_received.v1`
- `communication.message_sent.v1`
- `communication.thread_linked.v1`
- `communication.thread_unlinked.v1`
- `communication.followup_due.v1`
- `communication.followup_snoozed.v1`
- `communication.thread_resolved.v1`

### Inquiry

- `inquiry.created.v1`
- `inquiry.status_changed.v1`
- `inquiry.converted_to_quote.v1`
- `inquiry.converted_to_event.v1`

### Quote

- `quote.created.v1`
- `quote.sent.v1`
- `quote.accepted.v1`
- `quote.rejected.v1`
- `quote.expired.v1`

### Event

- `event.created.v1`
- `event.status_changed.v1`
- `event.schedule_changed.v1`
- `event.cancelled.v1`

### Finance

- `invoice.created.v1`
- `payment.captured.v1`
- `payment.failed.v1`
- `payment.refunded.v1`
- `ledger.entry_appended.v1`

### Automation

- `automation.recommendation_created.v1`
- `automation.action_executed.v1`
- `automation.action_blocked.v1`
- `automation.action_failed.v1`

## Command Model (Write Side)

Every mutation becomes a command with:

- `command_id`
- `command_type`
- `tenant_id`
- `actor`
- `idempotency_key`
- `preconditions`
- `payload`

Examples:

- `LinkCommunicationToInquiry`
- `MarkCommunicationResolved`
- `CreateInquiryFromMessage`
- `SendQuote`
- `TransitionEventState`
- `RecordPayment`
- `ScheduleFollowUp`

Rule: command handlers must emit domain events, never directly mutate projection tables.

## Process Managers (Saga Orchestration)

Implement deterministic managers that consume events and issue commands:

1. Lead Intake Manager
   - From `communication.message_received.v1` where intent=inquiry
   - Emits `CreateInquiry` if no open inquiry exists.
2. Inquiry Follow-up Manager
   - Creates timers, escalations, reminders, and overdue signals.
3. Quote Expiry Manager
   - Moves quote to expired, notifies chef/client according to policy.
4. Event Payment Manager
   - Tracks unpaid balances vs event date, emits risk actions.
5. Staffing Manager
   - Flags unassigned service roles before event readiness cutoff.

## Projection Set (Read Side)

Keep/extend projection tables and views:

1. `communication_inbox_items` (already present) from event stream.
2. `pipeline_board_projection` (lead -> inquiry -> quote -> event funnel).
3. `event_readiness_projection` (gates, blockers, override history).
4. `revenue_projection_daily` and `profit_projection_event`.
5. `ops_next_actions_projection` (single prioritized queue).
6. `client_360_projection` (messages, events, payments, loyalty summary).

Projection rules:

- Rebuildable from `domain_event_log`.
- Never treated as authoritative truth.
- Include `last_event_id` for traceability.

## Reliability Rules (Non-Negotiable)

1. At-least-once delivery with idempotent handlers.
2. Outbox dispatch with backoff and max-attempt dead-letter.
3. Consumer inbox dedup (`event_inbox`) per handler.
4. Dead letter queue with replay tooling.
5. Every automation action emits `automation.*` event.
6. Side effects must reference `correlation_id` and `causation_id`.

## Security and Governance

1. Tenant isolation on all new tables via RLS.
2. Immutable audit log for all status/financial transitions.
3. HITL gates for high-risk actions:
   - refunds
   - cancellations after payment
   - menu/allergy overrides
   - contract sends
4. Explainability metadata required for all automated actions:
   - rule id
   - confidence
   - inputs summary
   - policy version

## Exact Rollout Plan

### Phase 0: Contracts and Event Catalog

- Add canonical event envelope types in `lib/events/types.ts`.
- Define `event_type` constants and schema versioning.
- Add conformance tests for event payload shape.

### Phase 1: Event Log + Outbox Foundation

- Create migrations for:
  - `domain_event_log`
  - `event_outbox`
  - `event_inbox`
  - immutability triggers
- Add `appendDomainEvent()` library.
- Add `recordCommand()` and command audit.

### Phase 2: Communication Domain Migration

- Keep current tables for compatibility.
- Write-through strategy:
  - existing communication actions still run
  - also append canonical domain events
- Replace mutable status semantics with event-derived status projection.

### Phase 3: Outbox Dispatcher + Handler Runtime

- Build scheduled worker:
  - claims pending outbox rows
  - dispatches to registered handlers
  - writes consumer dedup inbox
  - retries and DLQ on exhaustion
- Add observability metrics:
  - lag
  - retries
  - handler failure rate
  - dead-letter volume

### Phase 4: Process Managers

- Implement managers in this order:
  1. Lead Intake
  2. Inquiry Follow-up
  3. Quote Expiry
  4. Payment Risk
- Route results into existing Copilot recommendation tables for continuity.

### Phase 5: Autonomy Levels (Production Safety)

- Level 0: observe only (recommendations only)
- Level 1: safe draft actions (draft messages, reminders)
- Level 2: bounded auto-actions (internal notifications, timers, low-risk transitions)
- Level 3: high-trust automations behind explicit tenant opt-in

### Phase 6: Full Rebuild and Verification

- Rebuild all projections from scratch from `domain_event_log`.
- Verify parity against current state tables.
- Run replay tests for at least 90 days of historical data.

## Definition of Done (Exact)

System is considered "exact build complete" when:

1. Every user-visible business state can be explained by replaying domain events.
2. Every side effect is traceable to an outbox-dispatched event.
3. Every handler is idempotent and replay-safe.
4. Every projection can be dropped and rebuilt deterministically.
5. All automation actions are logged with policy + causation metadata.
6. High-risk actions have HITL gates with override reasons.
7. Recovery from failure requires replay, not manual DB surgery.

## Team Structure and Responsibilities

Recommended team split:

1. Platform Team (2 devs)
   - event log, outbox, dispatcher, idempotency, replay tooling
2. Domain Team (2 devs)
   - communication/inquiry/quote/event command handlers + process managers
3. Product Surface Team (2 devs)
   - projections, inbox/dashboard UX, action center, explainability UI
4. QA + Data Reliability (1-2 engineers)
   - replay tests, migration validation, failure injection, SLO tracking

## Testing Strategy

Must-have suites:

1. Event contract tests (schema + version compatibility)
2. Command idempotency tests
3. Process manager determinism tests
4. Projection rebuild parity tests
5. Outbox retry and DLQ tests
6. Tenant isolation and RLS tests
7. End-to-end golden path from inbound email to completed event/payment

## SLOs for This Architecture

- Inbox ingestion latency p95: < 30s
- Outbox dispatch latency p95: < 15s
- Duplicate command side effects: 0 tolerated
- Projection drift incidents: 0 tolerated
- Auto-action misfire rate: < 0.5%
- DLQ unresolved > 24h: 0 critical items

## Practical Notes for This Repo

1. Keep current feature flags (`COMM_TRIAGE_ENABLED`, `OPS_COPILOT_ENABLED`) while dual-running old/new flows.
2. Start with communication domain because data volume and business leverage are highest.
3. Do not rewrite financial ledger pattern; it is already the best reference implementation in this codebase.
4. Add DB-level compare-and-set enforcement in transition RPCs where possible.
5. Treat integrations as adapters that emit canonical events, not as business logic owners.

## Final Statement

This architecture does not make the chef replaceable.
It makes operations observable, deterministic, and automatable.
Creative output (menus, taste, hospitality, brand voice) remains chef-authored.
Operational execution becomes event-driven, testable, and progressively autonomous.
