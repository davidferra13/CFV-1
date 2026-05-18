# Client Void Reassurance

## Deep-Pass Run 2026-05-18

STATUS: fresh
DEPTH: normal
YIELD_TREND: increasing

SURFACED:

- The highest-yield move is not a separate void engine. It is a client reassurance projection over existing `lib/client-work-graph`, `lib/waiting-radar`, `lib/communication/cadence-scheduler.ts`, `lib/events/live-status-actions.ts`, `lib/hub/circle-first-notify.ts`, and `lib/events/post-event-trust-loop-actions.ts`.
- Existing `lib/client-work-graph` already computes client next actions. Reassurance should extend it with status, owner, proof, and uncertainty, not fork another client action model.
- Existing `lib/waiting-radar` already has waiting owner, reason, risk, follow-up, proof route, ranking, and dedupe. Chef-side client void radar should add client-risk source adapters and rank weights, not build another feed.
- Existing cadence messages are not fully state-aware. `cadence-types.ts` contains copy like "Everything is set." That is unsafe when menu, guest count, allergy, logistics, arrival, or payment facts are unresolved.
- Existing day-of status has two partially overlapping paths: token-based `live-status-actions.ts` using `service_executions`, and logged-in client `service-day-live-actions.ts` using event timestamp columns. This needs a unifying client-safe projection before broad UI work.
- Existing Circle lifecycle hook file is explicitly legacy. New lifecycle reassurance should use `circleFirstNotify()` and add idempotency/provenance around notification messages.
- Post-event closure already has canonical trust-loop, leftover, and rebook modules. The gap is a closure projection that tells client and chef what is done, missing, owed, remembered, and next.

LENSES_USED:

- HoneyBook: clientflow lens for proposal, contract, invoice, payment, and next-step clarity. Source basis: HoneyBook proposal and services/contracts/invoices help.
- SevenRooms: guest CRM and memory lens for preference, history, repeat-client context, and relationship continuity. Source basis: SevenRooms guest experience materials.
- Tock and Stripe: commitment-state lens for deposit-backed bookings, payment state machines, idempotency, and no-show ambiguity. Source basis: Tock deposit resources and Stripe Payment Intents docs.
- Google SRE and Sentry: reliability lens for defining what must work, surfacing failures, and proving route/runtime behavior. Source basis: Google SRE book and Sentry docs.
- Matt Pocock / Total TypeScript: type correctness lens for discriminated unions, explicit domain types, and making illegal reassurance states hard to represent. Source basis: Total TypeScript public articles and tips.

EXPERT_VALIDATION:

- Reassurance projection over existing graph/radar/cadence/live/trust modules: endorsed. HoneyBook and SevenRooms would reject splitting the same client journey across unrelated surfaces. Matt Pocock lens flags this as a type-boundary problem, not a copy problem.
- Evidence-labeled reassurance facts: endorsed. Google SRE/Sentry lens rejects rendering inferred or stale facts as confirmed. Tock/Stripe lens rejects mixing interested, pending, deposit paid, and booked states.
- State-aware cadence copy: endorsed with caveat. HoneyBook/Tock lens wants proactive reassurance, but Google SRE lens requires downgrade/skip paths when prerequisite facts are missing.
- Circle-first lifecycle messages via `circleFirstNotify()`: endorsed with caveat. SevenRooms/HoneyBook lens supports shared memory, but Sentry lens flags duplicate-message spam without idempotency.
- Day-of status unification: endorsed with caveat. Tock/Stripe-style commitment clarity matters most on event day, but the two existing live status paths must be reconciled before UI expansion.
- Post-event closure projection: endorsed. SevenRooms lens says repeat business comes from remembered experience; HoneyBook lens says invoice, feedback, and next booking should not feel like separate products.

EXPERT_ADDITIONS:

- Add a `ReassuranceFact` type with `state: confirmed | pending | missing | stale | inferred`, `sourceHref`, `updatedAt`, and `clientSafe` so UI and cadence cannot overstate certainty.
- Add a copy safety gate for cadence and client portal text that refuses phrases such as "everything is set" unless required facts are confirmed.
- Add idempotency keys to Circle reassurance messages, likely in message metadata, keyed by tenant, event/inquiry, notification type, and canonical record version.
- Add a route proof matrix for client-safe reassurance surfaces, not just unit tests: public intake, client event overview, Circle, cadence email preview/send, day-of, post-event.

REJECTED:

- New standalone chat or concierge system: rejected. Existing Circle, inbox, notifications, and cadence are the right primitives.
- A generic "client confidence score" shown to the client: rejected. It risks exposing internal anxiety/risk modeling and smoothing uncertainty into fake certainty.
- AI-owned reassurance decisions: rejected. Remy may draft language, but deterministic facts own state.
- New survey or testimonial model for closure: rejected. The post-event trust loop already chose canonical `post_event_surveys` and public review promotion.

ACTED ON:

- Created this deep-pass record.
- Generated build prompts below.

SKIPPED:

- Implementation: not authorized by "fire the queue" or "direct hotfix now".
- Browser verification: no code changes in this pass.
- External browsing: cached source cards were sufficient; no current pricing, policy, or product availability claims were needed.

CROSS_REFS:

- [[client-portal]]: prior token/cadence findings show portal links and cadence content must share one source of truth.
- [[client-messaging]]: existing cadence scheduler and SMS channel work should be extended, not duplicated.
- [[communication]]: dual follow-up and cadence wiring findings are relevant to reassurance dispatch.
- [[events]]: event-risk and cadence integration is directly relevant to state-aware reassurance.
- [[lifecycle]]: trigger/orchestrator gaps affect when reassurance is scheduled.
- [[rail]]: upcoming cadence work should appear in chef-visible surfaces before automatic sends happen.

NEXT TRIGGER: rerun after Wave 1 builds the core reassurance fact projection and route proof matrix, or after cadence/live-status modules change materially.

BEST_NEXT_MOVE: build the core `ReassuranceFact` projection first, then wire client portal, chef radar, cadence, Circle, day-of, and post-event surfaces against it.

BUILD_PROMPTS:

### Wave 1 (Parallel)

#### Agent: reassurance-facts-core

- **Model:** opus
- **Zone:** client-void-reassurance
- **Task:** Build the core client reassurance fact projection. Create a small domain module that produces typed facts for event/inquiry/quote/payment/menu/communication state without creating a parallel feed. Reuse `lib/client-work-graph` and existing action graph logic where possible. Include states for confirmed, pending, missing, stale, and inferred facts, with source route, updated timestamp, and client safety.
- **Read first:** `CONTEXT.md`, `lib/client-work-graph/types.ts`, `lib/client-work-graph/build.ts`, `lib/action-graph/bookings.ts`, `lib/events/journey-steps.ts`, `.agents/build-queue/active/BQ-20260518T035715Z-client-reassurance-state-engine-and-void-detector.md`
- **Expert backing:** HoneyBook and Matt Pocock lenses endorse one typed clientflow projection instead of another action model.
- **Done when:** focused unit tests cover at least six lifecycle states; tenant-sensitive facts carry source routes; no inferred/stale/missing fact can be rendered as confirmed by type shape; `npx tsc --noEmit --skipLibCheck` or repo-focused equivalent is run.
- **Caveats:** Do not let Remy own canonical state. Do not expose chef-only notes, internal risk labels, cost structure, or unrelated tenant data.

#### Agent: reassurance-route-proof-matrix

- **Model:** haiku
- **Zone:** client-void-reassurance
- **Task:** Create a route proof matrix for all client reassurance surfaces and update the relevant queue item notes with exact affected routes, existing modules, and proof requirements. This is a planning/proof artifact only, not implementation.
- **Read first:** `.agents/build-queue/active/BQ-20260518T035715Z-public-intake-reassurance-and-confirmation-truth-layer.md`, `.agents/build-queue/active/BQ-20260518T035715Z-client-portal-what-happens-next-status-strip.md`, `.agents/build-queue/active/BQ-20260518T035716Z-day-of-live-client-status-and-delay-reassurance.md`, `docs/specs/p1-operational-reassurance-and-what-happens-next.md`, `docs/specs/day-of-live-client-status.md`
- **Expert backing:** Google SRE/Sentry lens requires runtime proof per surface before marking client trust work done.
- **Done when:** route matrix names public, client, chef, Circle, email/cadence, day-of, and post-event paths; each has acceptance proof and screenshot/runtime proof requirements; no app code changes.
- **Caveats:** Do not broaden into a general route audit.

#### Agent: circle-reassurance-idempotency-audit

- **Model:** haiku
- **Zone:** client-void-reassurance
- **Task:** Perform a read-only audit of Circle lifecycle notification paths and write a short implementation note for idempotent reassurance messages through `circleFirstNotify()`. Identify where legacy lifecycle hooks are still called and where production notification types should be extended.
- **Read first:** `docs/agent-contexts/circles-domain.md`, `lib/hub/circle-first-notify.ts`, `lib/hub/circle-lifecycle-hooks.ts`, `lib/hub/types.ts`, `.agents/build-queue/active/BQ-20260518T035715Z-circle-first-lifecycle-reassurance-messages.md`
- **Expert backing:** SevenRooms and Sentry lenses endorse shared relationship memory with provenance and duplicate protection.
- **Done when:** note lists current entry points, missing notification types, proposed idempotency key, client-safe metadata rules, and tests to add. No app code changes unless explicitly fired later.
- **Caveats:** Public token views must remain sanitized.

### Wave 2 (After Wave 1 Verified)

#### Agent: client-status-strip-projection

- **Model:** opus
- **Zone:** client-void-reassurance
- **Task:** Wire the reassurance facts core into a reusable client-safe status strip for client event pages. The strip should answer current state, next chef action, next client action, important date, and last confirmed proof.
- **Read first:** `components/client-portal/lifecycle-timeline.tsx`, `components/client-portal/event-countdown.tsx`, `app/(client)/my-events/[id]/page.tsx`, `app/(client)/my-events/[id]/event-summary/page.tsx`, `app/(client)/my-events/[id]/pre-event-checklist/page.tsx`, `lib/client-work-graph/build.ts`, `docs/intensify/client-void-reassurance.md`
- **Expert backing:** HoneyBook and Airbnb lenses endorse a calm, visible clientflow that reduces uncertainty after action.
- **Done when:** affected client routes show confirmed/pending/missing facts truthfully; mobile screenshots at 390px and 430px have no overflow; browser console/server logs are clean; focused tests/type checks pass.
- **Caveats:** Do not show internal risk scores, chef-only notes, or raw payment/cost internals.

#### Agent: chef-void-radar-adapter

- **Model:** opus
- **Zone:** client-void-reassurance
- **Task:** Extend `lib/waiting-radar` with client reassurance source adapters and ranking weights. The chef-facing panel should show client voids as waiting work, with owner, reason, follow-up, proof route, and recommended action.
- **Read first:** `lib/waiting-radar/types.ts`, `lib/waiting-radar/collect.ts`, `lib/waiting-radar/rank.ts`, `components/waiting-radar/waiting-radar-panel.tsx`, `app/(chef)/dashboard/_sections/client-risk-radar.tsx`, `.agents/build-queue/active/BQ-20260518T035715Z-chef-side-client-void-radar-and-waiting-risk-panel.md`
- **Expert backing:** Linear and Clover-style operations lenses favor one dense, actionable waiting surface over another notification feed.
- **Done when:** waiting radar includes reassurance-derived items, dedupes against existing action-center/operating-loop items, routes to canonical records, preserves tenant scoping, and unit tests cover ranking/dedupe.
- **Caveats:** Normal waiting is not failure. Payment details stay chef-only.

#### Agent: cadence-truth-gate

- **Model:** opus
- **Zone:** client-void-reassurance
- **Task:** Make pre-event cadence copy state-aware by consuming reassurance facts. Replace unconditional certainty copy with truth-gated variants and skip/downgrade behavior when required facts are missing.
- **Read first:** `lib/communication/cadence-scheduler.ts`, `lib/communication/cadence-types.ts`, `lib/email/templates/confidence-cadence.tsx`, `.agents/build-queue/active/BQ-20260518T035715Z-state-aware-pre-event-confidence-cadence.md`, `docs/specs/pre-event-confidence-cadence.md`
- **Expert backing:** Tock/Stripe and Google SRE lenses endorse proactive updates only when the underlying state is true.
- **Done when:** tests prove cadence never says "everything is set" unless menu, guest count, arrival/logistics, payment/booking, and critical dietary facts meet the configured gate; recent manual communication still suppresses duplicates; existing email/SMS paths remain intact.
- **Caveats:** Scheduler timezone behavior and duplicate sends must be verified.

### Wave 3 (After Wave 2 Verified)

#### Agent: day-of-status-unification

- **Model:** opus
- **Zone:** client-void-reassurance
- **Task:** Unify the client-facing day-of status projection across token-based live status and logged-in client service-day status. Keep one client-safe status contract and ensure delay detection can notify client and nudge chef without duplicate notifications.
- **Read first:** `lib/events/live-status-types.ts`, `lib/events/live-status-actions.ts`, `lib/events/service-day-live-actions.ts`, `lib/events/service-tracker-actions.ts`, `app/(client)/my-events/[id]/page.tsx`, `.agents/build-queue/active/BQ-20260518T035716Z-day-of-live-client-status-and-delay-reassurance.md`
- **Expert backing:** Tock/Stripe commitment lens and Sentry reliability lens both treat day-of certainty as a high-trust path.
- **Done when:** one status contract covers not started, en route, arrived, prepping, cooking, plating, serving, cleanup, complete, and delayed; client notification stages are limited to delay, arrival, and completion; mobile/browser proof is captured.
- **Caveats:** Do not break token access or client auth boundaries.

#### Agent: post-event-closure-projection

- **Model:** opus
- **Zone:** client-void-reassurance
- **Task:** Build a post-event closure projection using existing trust-loop, leftover, invoice/payment, rebook, and preference-memory modules. Present closure state to chef/client without inventing new survey or review models.
- **Read first:** `lib/events/post-event-trust-loop-actions.ts`, `lib/events/leftover-actions.ts`, `lib/events/client-rebook-actions.ts`, `components/client-portal/rebook-button.tsx`, `app/(client)/my-events/[id]/invoice/page.tsx`, `.agents/build-queue/active/BQ-20260518T035716Z-post-event-closure-rebooking-and-leftover-reassurance-harden.md`, `docs/specs/post-event-trust-loop-consolidation.md`
- **Expert backing:** SevenRooms memory lens and HoneyBook clientflow lens endorse closing feedback, invoice, leftovers, and rebooking as one relationship loop.
- **Done when:** completed events show what is paid/owed, feedback status, leftover notes if present, review eligibility through canonical gate, and rebook/share path; low/absent leftover data has truthful empty state; tests and route proof pass.
- **Caveats:** Do not expose chef cost structure or bypass public review consent gates.

### Dispatch Notes

- Total agents: 8
- Estimated tier cost: 1 haiku planning prompt + 1 haiku audit prompt + 6 opus build prompts
- Verification after all waves: focused unit tests per module, `npx tsc --noEmit --skipLibCheck`, affected route checks on `http://localhost:3100`, mobile proof for UI surfaces, `build-queue.mjs finish-check` for fired items.

## Run 2026-05-18

STATUS: partially-mined
DEPTH: normal
YIELD_TREND: stable

### Surfaced

- Shared certainty language drift is wider than the cadence layer. Unsafe "Everything is set" or "on track" phrasing appears in `components/client-portal/event-countdown.tsx`, `lib/templates/pre-event-briefing.ts`, `lib/email/templates/event-confirmed.tsx`, `lib/events/transitions.ts`, `lib/lifecycle/confidence-cadence.ts`, and `lib/communication/cadence-types.ts`. The truth gate should cover all outbound and portal reassurance copy, not just scheduled cadence messages.
- Discovery/rail hooks already exist for cadence and waiting work. `lib/discovery/resolvers/chef/cadence-due-resolver.ts` reads `cadence_schedule`, and `lib/discovery/resolvers/chef/waiting-resolver.ts` wraps waiting radar output. The build move resets from "add cadence as a rail source" to "extend existing resolvers with reassurance facts, missing-fact evidence, and safety gates."
- Active queue overlap is now a build-order risk. The new client-void items overlap older lifecycle, cadence, waiting radar, rail, and universal void island items. Firing should start with shared facts and copy gates before UI panels or additional cadence surfaces.

### Acted On

- Appended this intensify run to keep the zone memory current after the research-to-build extraction.

### Skipped

- New cadence rail source: skipped because cadence already reaches GodMode rail through `cadence-due-resolver.ts`.
- Direct copy sweep: skipped because replacing strings before a shared truth gate would leave the same problem distributed across templates.
- Broad queue grooming: skipped because this run is a zone intensification pass, not a queue grooming pass. The overlap should be handled before firing work.

### Next Trigger

Rerun after the `ReassuranceFact` core and shared truth gate land, or when cadence/live-status/client-portal modules change materially.
