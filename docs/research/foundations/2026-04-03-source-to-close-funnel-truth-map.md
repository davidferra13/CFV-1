# Source-to-Close Funnel Truth Map

Date: `2026-04-03`
Status: complete
Purpose: give the next builder one evidence-backed map of how ChefFlow actually captures demand, creates operational records, and feeds public trust today, so future website and workflow changes compose with the real system instead of flattening it into one fake funnel

Primary companion docs:

- `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`
- `docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md`
- `docs/research/foundations/2026-04-03-platform-intelligence-evidence-gaps-and-spec-corrections.md`
- `docs/system-behavior-map.md`
- `docs/build-state.md`

---

## Short Answer

The current product already has a real source-to-close system. It does not have one single intake funnel.

Seven truths matter most:

1. Public intake is split across materially different lanes: open booking, single-chef inquiry, embed inquiry, kiosk inquiry, Wix form ingestion, instant checkout, and chef-created internal inquiries.
2. Open booking is a fan-out lane. It can create separate clients, inquiries, and draft events across multiple matched chefs, not one shared lead record. `app/api/book/route.ts:107-279`
3. Public chef inquiry and embed inquiry are the most complete planning lanes today. They create the client, inquiry, Dinner Circle, draft event, state transition, and follow-on automation hooks. `lib/inquiries/public-actions.ts:183-380`, `app/api/embed/inquiry/route.ts:225-338`
4. Wix is not equivalent to the other website lanes. It is a staged, asynchronous, inquiry-first pipeline with Gmail dedup and AI parsing, and it does not currently auto-create a draft event or Dinner Circle. `app/api/webhooks/wix/route.ts:82-121`, `lib/wix/process.ts:16-199`
5. Instant booking is its own lane. It creates the client, inquiry, event or event series, and Stripe checkout session immediately, but it does not create a Dinner Circle or trigger the richer inquiry-side automation stack shown in the planning flows. `lib/booking/instant-book-actions.ts:78-491`
6. Post-event trust is only partly unified. The newer trust loop uses `post_event_surveys` and can promote consented survey responses into public reviews, but the lifecycle cron still sends a separate direct Google review ask from `events.review_request_sent_at`. `lib/post-event/trust-loop-actions.ts:228-383`, `lib/post-event/trust-loop-actions.ts:410-652`, `app/api/scheduled/lifecycle/route.ts:964-1063`
7. One inquiry API surface is not trustworthy as a canonical builder foundation. The `app/api/v2/inquiries` routes still write schema-stale field names and conversion semantics that do not match the current `inquiries` table shape. `app/api/v2/inquiries/route.ts:17-93`, `app/api/v2/inquiries/[id]/route.ts:17-98`, `app/api/v2/inquiries/[id]/convert/route.ts:24-60`, `lib/db/migrations/schema.ts:16508-16558`

The builder implication is simple:

- do not design around one generic "website lead"
- do not merge planning inquiry, marketplace fan-out, and instant checkout into one copy or one backend assumption
- do not claim one unified trust loop until the duplicate review-request path is reconciled

---

## Why This Exists

The prior research passes established that ChefFlow still has underused internal evidence. The highest-leverage missing synthesis was the real source-to-close map.

Without this document, a builder is likely to make one of five mistakes:

1. treat all website capture as one lane because several routes write `channel: 'website'`
2. assume every inquiry path creates the same downstream records
3. treat instant booking as just a faster inquiry flow
4. treat Wix ingestion as if it were synchronous with the public website forms
5. assume public proof and review requests already run through one fully consolidated trust loop

This file fixes that by mapping the actual code paths and schema anchors.

---

## Canonical Data Objects

These are the objects that define the real funnel.

### 1. `clients`

`createClientFromLead` is the shared idempotent helper for several non-authenticated lanes. It creates one tenant-scoped client per unique email, returns the existing client when found, and stores source on the client record. `lib/clients/actions.ts:591-663`

### 2. `inquiries`

`inquiries` is the canonical lead record. It holds channel, confirmed event facts, source message, follow-up requirements, service mode, UTM fields, and `converted_to_event_id`. `lib/db/migrations/schema.ts:16508-16558`

### 3. `events`

`events` is the execution shell. Many public-facing flows seed draft events immediately, even before the chef has fully qualified the job. The table also carries `booking_source`, `review_request_sent_at`, and the rest of the event lifecycle state. `lib/db/migrations/schema.ts:24646-24810`

### 4. `event_state_transitions`

Whenever a path auto-creates a draft event, it should also append an `event_state_transitions` row. This is the current immutable event-lifecycle audit backbone for auto-created events. `lib/db/migrations/schema.ts:769-799`

### 5. Sidecar evidence tables

These tables matter because some lanes are not direct client-to-inquiry writes.

- `wix_submissions` stages asynchronous website form submissions and tracks `pending`, `processing`, `completed`, `failed`, and `duplicate`. `lib/db/migrations/schema.ts:24042-24087`
- `gmail_sync_log` is used to deduplicate Wix form emails against inbound Gmail sync. `lib/db/migrations/schema.ts:3481-3512`
- `device_events` logs kiosk-device actions separately from inquiry and event creation. `lib/db/migrations/schema.ts:3727-3750`

---

## Intake Lanes

### 1. Open booking, public marketplace fan-out

**Entry point**

- `app/api/book/route.ts`

**What it does**

- matches chefs by location, service type, and guest count
- caps fan-out at 10 chefs, with a founder first-dibs exception
- creates or finds a client separately inside each matched chef tenant
- creates an inquiry per chef
- tries to auto-create a draft event per chef
- appends an event transition when the event is created
- sends chef email notifications
- sends one client acknowledgment email

Primary evidence: `app/api/book/route.ts:107-279`

**What it does not do**

- it does not create a Dinner Circle
- it does not call the richer inquiry automations and Remy hooks shown in the single-chef inquiry flow
- it does not create one global lead record across all matched chefs

**Builder implication**

This is not the same story as "I am inquiring with Chef X." It is a lead-distribution lane. Public copy, analytics, and routing must keep that distinction visible.

---

### 2. Public chef inquiry, single-chef planning lane

**Entry point**

- `lib/inquiries/public-actions.ts`

**What it does**

- rate-limits by IP and email
- resolves chef slug and checks whether the chef is accepting inquiries
- creates or reuses a client
- creates an inquiry with budget mode, service mode, schedule request, allergies, and source context
- auto-creates a Dinner Circle and first message
- sends a client acknowledgment email
- auto-creates a draft event
- appends an event transition and links `converted_to_event_id`
- fires automations
- enqueues Remy reactive scoring
- sends push notification

Primary evidence: `lib/inquiries/public-actions.ts:57-380`

**Builder implication**

This is currently the strongest public planning path. If the builder needs a model for "structured inquiry with low friction and real continuity," this is the best existing canonical lane.

---

### 3. Embed inquiry, partner-site or external-site planning lane

**Entry point**

- `app/api/embed/inquiry/route.ts`

**What it does**

- creates an inquiry under `channel: 'website'`
- marks `unknown_fields.embed_source = true`
- preserves UTM fields
- creates a draft event
- writes `dietary_restrictions` and `allergies` onto the event
- appends an event transition and links `converted_to_event_id`
- auto-creates a Dinner Circle
- sends a client acknowledgment email
- fires automations

Primary evidence: `app/api/embed/inquiry/route.ts:225-338`

**Builder implication**

This is website-origin demand, but not same-domain demand. Any future source analytics or routing model must keep embed as a distinct provenance layer even though it shares the same `channel` enum value as other website-origin paths.

---

### 4. Kiosk inquiry, on-site quick capture

**Entry point**

- `app/api/kiosk/inquiry/route.ts`

**What it does**

- supports device-token-based intake
- uses a generated placeholder email when only a phone number exists
- creates a client, inquiry, and draft event
- appends an event transition and links `converted_to_event_id`
- logs a `device_events` row with device, staff, and IP context
- sends a push notification

Primary evidence: `app/api/kiosk/inquiry/route.ts:90-198`

**Material limitation**

Phone-only kiosk capture is currently forced through a fake email placeholder to satisfy client identity creation. `app/api/kiosk/inquiry/route.ts:90-104`

**Builder implication**

This lane is operationally useful but lower-trust from an identity and CRM-hygiene perspective. Do not model it as the same data-quality path as email-backed public inquiry.

---

### 5. Wix webhook ingestion, staged async website-form lane

**Entry points**

- `app/api/webhooks/wix/route.ts`
- `lib/wix/process.ts`

**What it does**

- receives the raw Wix payload and stages it into `wix_submissions`
- marks the submission `processing`
- extracts contact info
- deduplicates against `gmail_sync_log` within a time window
- optionally feeds the communication-ingestion layer
- parses the payload with `parseInquiryFromText`
- creates or reuses a client when email exists
- creates an inquiry with `channel: 'wix'`
- logs the raw form into `messages`
- marks the staged submission complete
- creates chef notifications and chef email
- fires automations

Primary evidence: `app/api/webhooks/wix/route.ts:82-121`, `lib/wix/process.ts:16-199`, `lib/wix/process.ts:210-279`

**What it does not currently do**

- it does not auto-create a draft event
- it does not append an event transition
- it does not link `converted_to_event_id`
- it does not create a Dinner Circle

**Builder implication**

Wix is currently an async, review-first intake lane, not a full website-form clone. If the builder wants unified public intake behavior, this divergence needs an explicit decision, not silent assumptions.

---

### 6. Instant checkout, event-first booking lane

**Entry point**

- `lib/booking/instant-book-actions.ts`

**What it does**

- validates chef instant-book setup and Stripe readiness
- computes total and deposit
- creates or reuses a client
- creates an inquiry
- creates a single event or a multi-day series plus sessions
- appends one or many event transitions
- links `converted_to_event_id`
- creates the Stripe Checkout session with payment metadata

Primary evidence: `lib/booking/instant-book-actions.ts:78-491`

**Important distinctions**

- this path is event-first and payment-coupled
- multi-day instant booking also creates `event_series` and `event_service_sessions` after conflict checks. `lib/booking/instant-book-actions.ts:186-392`
- the single-event path writes pricing metadata directly onto the event. `lib/booking/instant-book-actions.ts:393-456`

**Material gaps**

- no Dinner Circle is created in this flow
- no acknowledgment email is sent from this action
- no inquiry-side automation, Remy reactive hook, or push notification is triggered here
- the input accepts `allergies_food_restrictions`, but that field is not persisted onto the inquiry or event in the current implementation. The inquiry insert only stores date, guest count, location, occasion, service mode, and schedule metadata, and the event only receives notes and schedule summaries. `lib/booking/instant-book-actions.ts:151-177`, `lib/booking/instant-book-actions.ts:323-356`, `lib/booking/instant-book-actions.ts:397-426`

**Builder implication**

Do not describe instant booking as just "skip the conversation." It is a distinct booking contract with different downstream behavior and a current dietary-data hole that still needs correction.

---

### 7. Chef-created internal inquiry

**Entry point**

- `lib/inquiries/actions.ts`

**What it does**

- creates an inquiry inside the chef workspace
- auto-links by existing client email when possible
- preserves unlinked lead details in `unknown_fields`
- logs chef activity
- fires automations
- enqueues Remy reactive scoring
- sends push notification
- dispatches Zapier and generic webhooks
- auto-creates a Dinner Circle
- seeds lifecycle detection

Primary evidence: `lib/inquiries/actions.ts:409-628`

**What it does not do at creation time**

- it does not create a draft event in the initial create action

**Builder implication**

This is an operator workspace intake path, not a public lane. It is useful as an operations benchmark, but it should not be mistaken for the public funnel itself.

---

### 8. API v2 inquiry routes, not currently safe as the canonical contract

**Entry points**

- `app/api/v2/inquiries/route.ts`
- `app/api/v2/inquiries/[id]/route.ts`
- `app/api/v2/inquiries/[id]/convert/route.ts`

**Why this is risky**

These routes still write fields such as `client_name`, `client_email`, `event_date`, `guest_count`, `message`, `source`, `converted_event_id`, and `status: 'converted'`, while the current `inquiries` schema is centered on `client_id`, `confirmed_*`, `source_message`, and `converted_to_event_id`, and the enum shown in `VALID_TRANSITIONS` does not include `converted`. `app/api/v2/inquiries/route.ts:17-93`, `app/api/v2/inquiries/[id]/route.ts:17-98`, `app/api/v2/inquiries/[id]/convert/route.ts:24-60`, `lib/inquiries/actions.ts:51-59`, `lib/db/migrations/schema.ts:16508-16558`

**Builder implication**

Until this slice is audited or retired, do not build new funnel logic on top of these routes.

---

## Cross-Lane Truth

Three groups exist today.

### Group A, synchronous inquiry-plus-event lanes

- open booking
- public chef inquiry
- embed inquiry
- kiosk inquiry

These create the inquiry immediately and attempt to seed a draft event immediately.

### Group B, staged inquiry-first lane

- Wix ingestion

This creates the inquiry after async processing and currently stops short of auto-creating an event.

### Group C, event-first payment lane

- instant checkout

This creates the inquiry and event immediately, then hands off to Stripe.

### Group D, operator-only inquiry lane

- chef-created internal inquiry

This is not a public path and should stay modeled separately.

---

## Public Proof And Trust Loops

### 1. New trust loop, survey-led path

The newer trust loop does three things:

- sends a post-event survey at `/feedback/[token]`
- stores survey state and completion in `post_event_surveys`
- can promote eligible, consented responses into `client_reviews`

Primary evidence: `lib/post-event/trust-loop-actions.ts:228-383`

The chef-facing trust state and survey summaries also reconcile whether a public review has already been shared. `lib/post-event/trust-loop-actions.ts:410-652`

### 2. Public proof aggregation

The public chef review feed already merges:

- `client_reviews`
- public `chef_feedback`
- `external_reviews`
- approved `guest_testimonials`

Primary evidence: `lib/reviews/public-actions.ts:79-252`

### 3. External review freshness

External review freshness is handled by a cron-auth route that calls `syncAllActiveExternalReviewSources`. `app/api/scheduled/reviews-sync/route.ts:1-16`

### 4. Legacy parallel review ask

The lifecycle cron still sends its own direct Google-style review request off completed events with `review_request_sent_at IS NULL`, then stamps `events.review_request_sent_at` after sending. `app/api/scheduled/lifecycle/route.ts:964-1063`

**Builder implication**

Public proof is partly unified, but review-request initiation is not yet fully consolidated. Any builder working on trust copy, post-event routing, or proof freshness needs to decide whether the event-level cron path survives, gets folded into the trust loop, or becomes an explicit fallback.

---

## Current Breakpoints

These are the places where the system is real, but not yet cleanly unified.

### 1. Shared `channel: 'website'` is not enough to distinguish provenance

Open booking, public chef inquiry, embed inquiry, and instant checkout all touch website-origin demand, but they are not the same operational path. Provenance currently lives in route context, `unknown_fields`, UTM values, and `booking_source`, not just `channel`.

### 2. Side effects are inconsistent across lanes

Dinner Circle creation exists for public chef inquiry, embed inquiry, and chef-created internal inquiry, but not for open booking, kiosk, Wix, or instant checkout. `lib/inquiries/public-actions.ts:250-268`, `app/api/embed/inquiry/route.ts:308-328`, `lib/inquiries/actions.ts:586-603`

### 3. Event seeding is inconsistent

Public chef inquiry, embed inquiry, kiosk, and instant booking seed events. Wix does not. Open booking seeds many draft events across matched chefs. `lib/inquiries/public-actions.ts:287-325`, `app/api/embed/inquiry/route.ts:268-306`, `app/api/kiosk/inquiry/route.ts:143-178`, `app/api/book/route.ts:246-279`, `lib/wix/process.ts:151-199`

### 4. Intake completeness is inconsistent

Instant booking accepts allergy input but does not persist it. Kiosk can generate placeholder client emails. Open booking stores less structured follow-on context than the richer inquiry flows. `lib/booking/instant-book-actions.ts:33-47`, `lib/booking/instant-book-actions.ts:151-177`, `app/api/kiosk/inquiry/route.ts:90-104`, `app/api/book/route.ts:153-236`

### 5. Analytics currently under-model the funnel

`getSourceDistribution` only counts `inquiries.channel`, which is directionally useful but too coarse for routing truth. `getConversionRatesBySource` even loads event statuses into `eventByInquiry` and then never uses them, so the `completed` metric is not actually computed. `lib/partners/analytics.ts:89-115`, `lib/partners/analytics.ts:121-164`

### 6. One inquiry API surface looks stale

The API v2 inquiry routes still appear to target an older inquiry contract. Builders should not assume those routes reflect the live schema or the public flow truth. `app/api/v2/inquiries/route.ts:17-93`, `app/api/v2/inquiries/[id]/convert/route.ts:24-60`

---

## Canonical Builder Rules

If a builder is changing the website, public booking, trust copy, or intake routing, these rules should govern the work.

1. Treat open booking, single-chef inquiry, embed inquiry, Wix ingestion, and instant checkout as separate product stories.
2. Use `inquiries` as the canonical lead object, but never rely on `channel` alone for source truth.
3. Preserve route-level provenance in analytics and copy, especially `open_booking`, `embed_source`, `utm_*`, `submission_source`, and `booking_source`.
4. Do not promise Dinner Circle or the same follow-up experience from every intake lane until the side effects are actually unified.
5. Treat instant booking as a payment-backed booking contract, not as a mere faster inquiry.
6. Treat Wix as asynchronous, deduped, and review-first until an explicit decision extends it to event seeding.
7. Keep AI language in this slice limited to admin-side parsing, triage, scoring, and automation. The current evidence here is operational AI, not recipe or menu creation. `lib/wix/process.ts:92-120`, `lib/inquiries/actions.ts:523-559`, `lib/inquiries/public-actions.ts:327-368`
8. Do not build on the API v2 inquiry routes until they are reconciled with the current schema and workflow model.
9. Do not claim one unified post-event review system until `events.review_request_sent_at` and the `post_event_surveys` review-request state are explicitly reconciled.

---

## What A Builder Would Get Wrong Without This Map

1. They would collapse `/book` and `/chef/[slug]/inquire` into one generic conversion story.
2. They would assume Wix behaves like the website form, when it is currently staged and asynchronous.
3. They would assume all website-origin lanes create the same collaboration and notification side effects.
4. They would assume instant booking already carries the same trust data as inquiry-first planning.
5. They would measure source quality only by `channel` and miss the real provenance split.
6. They would treat the current trust loop as fully consolidated and accidentally duplicate or suppress review asks.
7. They would risk building on API v2 inquiry contracts that do not match the current schema shape.

---

## Recommended Next Execution Order

If the goal is to improve website performance, trust, and continuity without creating drift, this is the right next order.

1. Write a narrow booking-routing matrix spec that explicitly distinguishes open booking, single-chef inquiry, instant booking, and later corporate or concierge intake.
2. Write a source-analytics correction spec so provenance is measured from real route context, not only `inquiries.channel`.
3. Reconcile the post-event review request split between `post_event_surveys` and the lifecycle cron.
4. Close the intake-parity gaps: instant-book dietary persistence, Wix event-seeding decision, and kiosk phone-only identity handling.
5. Only after those rules exist, revise public copy and routing so the website describes the real downstream behavior accurately.

---

## What Is Still Assumed, Not Yet Verified

These are the remaining decisions, not settled facts.

1. Whether open booking fan-out to multiple chefs is the final desired product behavior or an intermediate demand-capture tactic.
2. Whether Wix should remain inquiry-first for manual review or be upgraded to the same event-seeding path as other website forms.
3. Whether instant booking should gain Dinner Circle and richer follow-on automation, or intentionally remain a leaner transaction lane.
4. Whether the lifecycle cron review ask should survive as a fallback, or be subsumed under the trust-loop system.
5. Whether the API v2 inquiry routes are still in real external use, or are now effectively legacy.

Those are the right next verification questions. Everything else in this document is grounded in current code and schema.
