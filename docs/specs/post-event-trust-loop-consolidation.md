# Spec: Post-Event Trust Loop Consolidation

> **Status:** verified
> **Priority:** P1
> **Depends on:** `featured-chef-public-proof-and-booking.md` (verified 2026-04-02), `public-chef-credentials-showcase.md` (verified 2026-04-02), existing `service-lifecycle-intelligence.md`
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                           | Date                 | Agent/Session | Commit |
| ------------------------------- | -------------------- | ------------- | ------ |
| Created                         | 2026-04-02 19:52 EDT | Codex         |        |
| Status: ready                   | 2026-04-02 19:52 EDT | Codex         |        |
| Dependency verification cleared | 2026-04-02 20:51 EDT | Codex         |        |
| Type check passed               | 2026-04-03 00:03 EDT | Codex         |        |
| Unit test passed                | 2026-04-03 00:03 EDT | Codex         |        |
| Build passed                    | 2026-04-03 00:03 EDT | Codex         |        |
| Browser verification passed     | 2026-04-03 00:03 EDT | Codex         |        |
| Status: verified                | 2026-04-03 00:03 EDT | Codex         |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A builder reading a spec without this section is building blind._

### Raw Signal

The thread moved from broad media research into one specific product conclusion: trust is not just a public profile problem. It is a loop.

The strongest repeated signal across operator research, hospitality research, and the curated media batch was:

1. trust and proof win the first booking
2. smooth follow-up and remembered preferences win the second booking
3. reviews, rebooking, and referrals are not separate features. They are one operating loop

The developer then asked for the most intelligent next move, in order, with full context and no duplication. A code-and-spec audit showed that public proof work is already largely built. The next unresolved gap is the post-event trust loop, because the current system has multiple overlapping survey, feedback, review-request, and testimonial paths.

### Developer Intent

- **Core goal:** Give the builder one clean post-event trust slice to build after public proof verification, without inventing another review or survey system.
- **Key constraints:** Do not expand into marketplace behavior, social growth, or broad loyalty work. Do not duplicate existing public proof specs. Do not let client post-event reviews bypass the canonical public review feed. Do not break guest feedback flows.
- **Motivation:** The repo already contains the ingredients for thank-you, survey, review, and repeat-intent capture, but they are fragmented across legacy and newer paths. The builder needs a single ordered plan.
- **Success from the developer's perspective:** After the public proof stack is verified, one builder can consolidate the post-event trust loop so the system knows whether follow-up happened, whether satisfaction was captured, whether a public review was appropriately requested, and whether repeat intent is visible for future service.

### Execution Translation

#### Requirements

- Public proof verification must happen before new post-event trust work changes what the public profile shows.
- The client post-event survey path must have one canonical table, one canonical public route, and one chef-facing dashboard path.
- The canonical survey path must support satisfaction-first review gating.
- Positive, consented client feedback must feed the existing public review aggregation system instead of creating a new parallel testimonial silo.
- Follow-up state must remain event-scoped and visible in existing accountability and queue surfaces.

#### Constraints

- Do not build a fourth survey model.
- Do not route primary client post-event reviews through `testimonials`.
- Do not collapse guest feedback into the client post-event survey path.
- Do not broaden this into a loyalty, referral, or seasonal marketing automation spec.
- Do not touch the already-built public proof UI beyond dependency verification or narrow integration points explicitly named here.

#### Behaviors

- `post_event_surveys` becomes the canonical client post-event survey record.
- `/feedback/[token]` becomes the canonical client-facing post-event survey route.
- `/surveys` becomes the canonical chef-facing survey dashboard route.
- `event_surveys`, legacy `/feedback` pages backed by `surveys`, and testimonial-request tokens stop being the primary client trust loop.
- Positive, consented survey results should promote into the public review feed via `client_reviews` or another feed source already consumed by `lib/reviews/public-actions.ts`, not by inventing a new public renderer.

---

## What This Does (Plain English)

This spec consolidates ChefFlow's post-event trust loop into one canonical path:

1. thank the client
2. capture satisfaction
3. request a public review only when appropriate
4. surface repeat intent for future service

It does not build a new loyalty program or a new marketing engine. It cleans up an already-important operating loop so the system can reliably turn good events into trust, proof, and repeat business.

---

## Why It Matters

Current research is consistent:

- clients expect follow-up within 24 to 48 hours
- they do not want a public review ask before being asked whether they were satisfied
- repeat business depends on remembered experience, not just one successful night

ChefFlow already has strong public-proof work and strong internal event infrastructure. The gap is that the system still behaves like several half-connected post-event products instead of one trustworthy loop.

---

## Current-State Summary

### What is already true

- Public proof is already largely built in the live public experience:
  - `app/(public)/page.tsx`
  - `app/(public)/chef/[slug]/page.tsx`
  - `app/(public)/chef/[slug]/inquire/page.tsx`
  - `components/public/chef-proof-summary.tsx`
  - `components/public/chef-credentials-panel.tsx`
- The public profile already uses a unified public review feed via `lib/reviews/public-actions.ts`.
- Event completion and post-event operations already exist in multiple places:
  - `lib/events/transitions.ts`
  - `components/events/close-out-wizard.tsx`
  - `components/events/post-event-outreach-panel.tsx`
  - `lib/queue/providers/post-event.ts`
  - `lib/dashboard/accountability.ts`

### What is fragmented today

There is not one post-event client trust system. There are several overlapping ones:

1. `event_surveys`
   - Used by `lib/surveys/actions.ts`
   - Powers `/survey/[token]`
   - Powers the chef-facing `/surveys` dashboard

2. `post_event_surveys`
   - Used by `lib/communication/survey-actions.ts`
   - Duplicated again in `lib/feedback/surveys-actions.ts` and `lib/feedback/surveys.ts`
   - Powers `/feedback/[token]`
   - Already stores richer fields such as `dish_feedback`, `review_request_eligible`, and `review_request_sent_at`
   - Already feeds repeat-client intelligence and Remy context

3. Legacy `surveys` route usage
   - `app/(chef)/feedback/page.tsx`
   - `app/(chef)/feedback/dashboard/page.tsx`
   - These pages still query `surveys`, which is not the canonical modern path

4. `testimonials`
   - `components/testimonials/review-request-manager.tsx`
   - `lib/testimonials/testimonial-actions.ts`
   - Token-based client review request flow
   - Useful as a testimonial management tool, but wrong as the primary post-event client trust loop

5. `guest_feedback` and `guest_testimonials`
   - Separate guest-level feedback path
   - Already participates in the public review feed
   - Should remain separate from the client post-event survey path

6. `client_satisfaction_surveys`
   - Referenced by some intelligence helpers
   - Not currently the primary product-facing survey workflow

### Operational consequence

The repo currently has enough post-event pieces to look complete while still being operationally ambiguous:

- queues and accountability track `follow_up_sent` and `review_link_sent` on `events`
- survey capture is split between at least two live client survey systems
- public proof aggregates from `client_reviews`, `chef_feedback`, `external_reviews`, and `guest_testimonials`
- the manual testimonial flow does not naturally align with the canonical public proof stack

That ambiguity is the gap this spec closes.

---

## Canonical Decisions

### 1. Public proof verification comes first

Before building more post-event trust logic, verify the already-built public trust stack using the existing verification queue:

- `docs/specs/featured-chef-public-proof-and-booking.md`
- `docs/specs/public-chef-credentials-showcase.md`
- `docs/research/built-specs-verification-queue.md`

Reason:

- the public profile and inquiry pages are already the place where review proof lands
- preview parity may still lag the live public profile
- building more post-event review mechanics before verifying the public proof destination risks chasing the wrong target

### 2. `post_event_surveys` becomes canonical

Use `post_event_surveys` as the primary client post-event survey model because it is already the richer trust-loop structure:

- event-scoped
- token-addressable
- supports satisfaction and open text
- supports dish-level feedback
- supports `review_request_eligible`
- already feeds repeat-client intelligence and AI context

`event_surveys` should not remain a parallel live system for the same workflow.

### 3. `/feedback/[token]` becomes canonical for client post-event surveys

Use the existing `app/(public)/feedback/[token]/page.tsx` path as the canonical client survey route.

`/survey/[token]` should be migrated or redirected out of the primary trust loop.

### 4. `/surveys` becomes canonical for the chef dashboard

Use the existing `/surveys` route as the chef-facing survey dashboard, but migrate it to the canonical `post_event_surveys` data path.

Legacy `/feedback` chef routes should be redirected or retired. They currently read from a stale `surveys` source and confuse the system.

### 5. Public review publication must flow into the existing public review feed

The public chef profile already aggregates review proof through `lib/reviews/public-actions.ts`.

That feed already knows how to read:

- `client_reviews`
- `chef_feedback`
- `external_reviews`
- `guest_testimonials`

Therefore:

- positive, consented client post-event feedback should become a `client_reviews` or equivalent canonical public-review record already consumed by the feed
- the primary client post-event trust loop must not route through `testimonials` as its public display model

### 6. Guest feedback stays separate

Guest feedback and guest testimonials are not the same thing as the client's post-event trust loop. Keep them separate and additive.

---

## Files to Create

| File                                           | Purpose                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `lib/post-event/trust-loop-actions.ts`         | Canonical read/write layer for follow-up state, survey state, review eligibility, and public-review promotion |
| `components/events/post-event-trust-panel.tsx` | Unified event-level panel that shows the 4-step trust loop and exposes the canonical actions                  |
| `tests/unit/post-event-trust-loop.test.ts`     | Verifies canonical-source selection, duplicate-send prevention, and review gating                             |

---

## Files to Modify

| File                                                 | What to Change                                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `lib/events/transitions.ts`                          | Ensure event completion creates or reuses the canonical `post_event_surveys` record and does not dual-write survey systems |
| `lib/communication/survey-actions.ts`                | Keep as the canonical post-event survey data layer or fold its logic into `lib/post-event/trust-loop-actions.ts`           |
| `lib/feedback/surveys-actions.ts`                    | Remove duplication by re-exporting or deleting in favor of the canonical trust-loop actions                                |
| `lib/feedback/surveys.ts`                            | Remove duplication by re-exporting or deleting in favor of the canonical trust-loop actions                                |
| `lib/surveys/actions.ts`                             | Migrate chef and client flows away from `event_surveys` or convert this file into a compatibility wrapper                  |
| `app/(public)/feedback/[token]/page.tsx`             | Keep as canonical public survey route and ensure it reads the canonical model only                                         |
| `components/feedback/post-event-survey-form.tsx`     | Keep as canonical client post-event form and ensure it writes only to the canonical model                                  |
| `app/(client)/survey/[token]/page.tsx`               | Redirect or migrate to the canonical `/feedback/[token]` path                                                              |
| `app/(client)/survey/[token]/survey-form.tsx`        | Remove or convert to compatibility layer if the route is retained temporarily                                              |
| `app/(chef)/surveys/page.tsx`                        | Repoint the chef dashboard to canonical `post_event_surveys` data and richer trust-loop statuses                           |
| `app/(chef)/feedback/page.tsx`                       | Redirect to `/surveys` or rewrite as a thin compatibility page                                                             |
| `app/(chef)/feedback/dashboard/page.tsx`             | Redirect to `/surveys` or rewrite as a thin compatibility page                                                             |
| `app/(chef)/feedback/requests/page.tsx`              | Redirect to canonical survey/trust management surface or update to use canonical state                                     |
| `components/events/post-event-outreach-panel.tsx`    | Replace parallel testimonial ask behavior with canonical trust-loop actions or links                                       |
| `components/events/close-out-wizard.tsx`             | Keep follow-up tracking event-scoped and point the chef toward the unified trust panel after close-out                     |
| `components/testimonials/review-request-manager.tsx` | Stop presenting this as the main client post-event review path                                                             |
| `lib/testimonials/testimonial-actions.ts`            | Retain only for explicit testimonial management, not as the primary post-event client review request flow                  |
| `lib/clients/intelligence.ts`                        | Surface canonical repeat-intent and last-feedback values from the canonical survey source                                  |
| `lib/reviews/public-actions.ts`                      | Add or confirm the canonical promotion path from consented client post-event feedback into the public review feed          |
| `docs/research/built-specs-verification-queue.md`    | Update verification notes only if the public-proof dependency order changes                                                |

---

## Database Changes

None required for the first consolidation slice.

This spec should prefer reuse and retirement over another migration.

Existing tables and fields already cover the minimum viable trust loop:

- `events.follow_up_sent`
- `events.follow_up_sent_at`
- `events.review_request_sent_at`
- `post_event_surveys`
- `client_reviews`
- guest-level feedback tables already used by the public review feed

If the builder discovers a true schema gap during implementation, stop and write a follow-up migration note instead of inventing new fields casually.

---

## Canonical Data Model

### Event-level operational state

- `events.follow_up_sent`
- `events.follow_up_sent_at`
- `events.review_request_sent_at`

These remain the canonical accountability flags used by queue and dashboard systems.

### Client post-event satisfaction state

- `post_event_surveys`

This becomes the canonical client post-event survey record.

### Public review publication

- `client_reviews` and the existing public review feed sources used by `lib/reviews/public-actions.ts`

This is where public proof should come from after satisfaction is confirmed and public consent exists.

### Legacy or non-canonical sources

- `event_surveys`
- `surveys`
- `testimonials` for primary client review requests

These are not the canonical client post-event trust-loop records.

### Separate but valid adjacent systems

- `guest_feedback`
- `guest_testimonials`
- `client_satisfaction_surveys` analytics helpers

These may coexist, but they must not confuse the builder into creating a duplicate primary client trust loop.

---

## Server Actions

The builder should expose or consolidate the following action set behind `lib/post-event/trust-loop-actions.ts`:

| Action                            | Auth         | Input                    | Output                                   | Side Effects                                                             |
| --------------------------------- | ------------ | ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------ |
| `getPostEventTrustState()`        | chef         | `{ eventId }`            | full trust-loop state for one event      | none                                                                     |
| `markClientFollowUpSent()`        | chef         | `{ eventId }`            | `{ ok, sentAt }`                         | updates event follow-up flags                                            |
| `sendCanonicalSurveyLink()`       | chef/system  | `{ eventId }`            | `{ ok, surveyId, route }`                | creates or reuses canonical survey and sends link                        |
| `submitCanonicalSurveyResponse()` | token/public | canonical survey payload | `{ ok, reviewEligible, wouldBookAgain }` | updates canonical survey record                                          |
| `promoteSurveyToPublicReview()`   | chef/system  | `{ eventId }`            | `{ ok, reviewId }`                       | writes into the public-review source already consumed by the public feed |
| `getRepeatIntentSummary()`        | chef         | `{ clientId }`           | concise repeat-intent summary            | none                                                                     |

Rules:

- `sendCanonicalSurveyLink()` must be idempotent.
- `promoteSurveyToPublicReview()` must refuse to run when the client was not satisfied or did not consent.
- compatibility wrappers are acceptable during migration, but there must be one canonical internal implementation path.

---

## UI / Component Spec

### 1. Unified Post-Event Trust Panel

Add a single post-event trust panel to the event detail experience.

Suggested placement:

- event overview or wrap-up tab, next to existing close-out and outreach affordances

The panel should show four steps:

1. **Thanked**
   - derived from `events.follow_up_sent`
   - action: mark sent or open the canonical thank-you flow

2. **Feedback captured**
   - derived from canonical `post_event_surveys`
   - show: pending, sent, opened, completed

3. **Public review status**
   - derived from `review_request_eligible`, consent, and public-review promotion state
   - action must stay disabled or hidden until satisfaction and consent requirements are met

4. **Repeat intent**
   - derived from `would_book_again`, recent feedback summary, and existing client intelligence
   - show concise status only, not a marketing automation suite

### 2. Canonical Chef Survey Dashboard

`/surveys` should become the single chef-facing dashboard for client post-event survey status and responses.

It should show:

- sent vs completed
- average overall
- would-book-again signal
- public-review eligibility state
- direct jump back to the event trust panel

### 3. Legacy Route Behavior

- `/feedback`
  - should redirect to the canonical survey/trust management surface
- `/survey/[token]`
  - should redirect to `/feedback/[token]` or act as a temporary compatibility wrapper during migration

Do not keep both live forever.

---

## Implementation Order

This order is mandatory.

### Phase 0: Verify the public proof destination

Completed on 2026-04-02 20:51 EDT. Builders may begin Phase 1.

1. `featured-chef-public-proof-and-booking.md` verified
2. `public-chef-credentials-showcase.md` verified
3. Live public profile and inquiry surfaces confirmed as the canonical public proof destination

Reason:

- there is no point tightening the review loop if the public proof destination is still unverified

### Phase 1: Collapse the client survey source of truth

1. choose `post_event_surveys` as canonical
2. stop dual-path behavior between `event_surveys` and `post_event_surveys`
3. migrate `/surveys` and `/feedback/[token]` onto the same canonical model

### Phase 2: Retire stale chef feedback routes

1. remove or redirect `/feedback` chef routes still querying `surveys`
2. ensure the builder does not leave stale routes silently pointing at old tables

### Phase 3: Unify review gating with the public review feed

1. keep satisfaction capture internal first
2. only expose public-review promotion when the client was satisfied and consented
3. route published public proof into the existing `lib/reviews/public-actions.ts` aggregation path

### Phase 4: Surface repeat intent without bloat

1. use the canonical survey result to show `would_book_again` and key takeaways in client intelligence or event wrap-up
2. do not add referral campaigns, loyalty automation, or seasonal nurture logic here

---

## Edge Cases and Error Handling

| Scenario                                                             | Correct Behavior                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Event already has both `event_surveys` and `post_event_surveys` data | Prefer `post_event_surveys` and preserve old data until migration is complete                     |
| Chef tries to send a review request before satisfaction exists       | Block the action and explain why                                                                  |
| Client gives low rating but consents to public display               | Do not auto-promote to public proof; require explicit chef review if any publication path remains |
| Event already marked `follow_up_sent` but no actual survey exists    | Show thank-you as done, survey as pending                                                         |
| Legacy `/feedback` page is visited during migration                  | Redirect cleanly to the canonical route                                                           |
| Guest feedback exists for an event                                   | Keep it additive; do not merge it into the client survey record                                   |
| Public-proof verification finds the live profile is not yet stable   | Stop before altering review-promotion assumptions                                                 |

---

## Out of Scope

- loyalty quests, reward points, or referral bonuses
- seasonal win-back campaigns
- broad CRM marketing automation
- changing the public chef profile design beyond narrow integration points
- merging guest feedback and client feedback into one table
- deleting legacy tables during the first consolidation pass

---

## Builder Traps

1. **Do not treat `/surveys` and `/feedback` as equally current.** They are not.
2. **Do not keep both `/survey/[token]` and `/feedback/[token]` as first-class permanent routes.**
3. **Do not use `testimonials` as the primary event-completion review pipeline.**
4. **Do not assume public proof is missing.** Most of it is already built.
5. **Do not build referral or loyalty automation because the word "rebooking" appears here.**
6. **Do not break guest feedback.** It is a different trust input, not a mistake.
7. **Do not invent another survey table.**

---

## Verification Steps

### Pre-build dependency verification

- Verify the built public proof stack from the verification queue.

### Post-build verification

1. Complete a test event and confirm one canonical post-event survey record exists.
2. Visit `/feedback/[token]` and submit feedback successfully.
3. Visit `/survey/[token]` and confirm redirect or compatibility behavior works as specified.
4. Open `/surveys` and confirm the response appears there from the canonical data source.
5. Open legacy chef `/feedback` routes and confirm they no longer read stale `surveys` data.
6. Confirm that a low-rated survey cannot create a public review request.
7. Confirm that a positive, consented survey can flow into the public review feed without using `testimonials`.
8. Confirm the event detail trust panel shows correct step states.

Verified on 2026-04-03 00:03 EDT:

- Canonical `post_event_surveys` data now powers the chef dashboard and the public feedback route, while `/survey/[token]` is a compatibility redirect to `/feedback/[token]`.
- `/surveys` shows canonical trust-loop state, public-review state, and a direct jump back to `/events/[id]?tab=wrap`.
- Legacy chef `/feedback`, `/feedback/dashboard`, and `/feedback/requests` routes no longer act as separate primary trust-loop surfaces.
- The completed `Q4 Team Celebration` event at `/events/b41902cb-52af-43d0-802a-e836cf04fe89?tab=wrap` renders the unified trust panel, reflects `Tracked as sent`, and links back to the canonical survey dashboard.
- Positive, consented feedback is reflected through canonical public-review state rather than a parallel testimonial silo.
- Review-request gating and duplicate-send protection remain covered by `tests/unit/post-event-trust-loop.test.ts`.

---

## Final Decision

The next builder should not spend time re-specifying public trust UI.

The correct next move, after verifying the already-built public proof specs, is to consolidate the post-event trust loop around one canonical survey system and one canonical public-review destination so ChefFlow can reliably turn good events into remembered trust instead of scattered feedback records.
