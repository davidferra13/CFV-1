# Client Consumer Next-Action Lifecycle Operating System

> Status: spec-ready, not fired
> Priority: P0
> Created: 2026-05-22
> Canonical queue target: Client Dashboard / Client Portal -> Public Discovery / Consumer Experience

## Raw Request

The developer asked:

> name eveything a client aka consumer can do. does a client aka consumer knowto and capotilzed on when they should be doing things

After the capability audit and practical-question pass, the developer asked:

> BUILD everything spec and add to the queue

This spec preserves that intent: build the system that makes every client or consumer state resolve to the correct action, timing, surface, fallback, and proof.

## Product Thesis

ChefFlow already has many client and consumer capabilities. The product gap is not just missing pages. The gap is inconsistent action timing: clients can often do the right thing, but ChefFlow does not yet guarantee that every client state tells them what to do, when to do it, why it matters, and what happens if they cannot act.

The system must converge public consumer discovery, token portal flows, authenticated client portal flows, guest flows, hub/circle flows, and post-event retention into one lifecycle action contract.

## Canonical Contract

Every client/consumer lifecycle state must resolve through this shape:

```text
client state -> one primary action -> one supporting action -> one fallback -> one proof surface
```

The source of truth should be a canonical action/readiness layer, extending the existing `client-work-graph`, `journey-steps`, action graph, notification, rail, and discovery registries rather than duplicating next-action logic inside individual pages.

## Personas

- Public consumer: hungry, browsing, comparing, planning, learning about chefs, not yet authenticated.
- Token client: received a portal/intake/quote/contract/payment link and needs a narrow trusted flow.
- Authenticated client/host: owns bookings, household memory, guest coordination, payments, preferences, referrals, and retention actions.
- Event guest: sees only scoped guest/event/circle/menu/feedback surfaces.
- Household member: participates in planning and preference capture with scoped visibility.
- Assistant/delegate: may have view, planning, communication, approval, or payment permissions.
- Chef: needs privacy-safe client action status and recovery signals.
- Admin/support: needs auditable recovery visibility without becoming a backdoor for private data.

## Existing Building Blocks

Use and extend these before adding new systems:

- `lib/client-work-graph/types.ts`
- `lib/client-work-graph/build.ts`
- `lib/client-work-graph/actions.ts`
- `lib/events/journey-steps.ts`
- `lib/action-graph/bookings.ts`
- `components/client-dashboard/client-universal-rail.tsx`
- `lib/discovery/registries/client-rail-registry.ts`
- `app/(client)/my-bookings/page.tsx`
- `app/(client)/my-events/[id]/page.tsx`
- `app/(client)/my-events/[id]/live/page.tsx`
- `app/(client)/my-inquiries/[id]/page.tsx`
- `app/(client)/my-quotes/[id]/page.tsx`
- `app/(client)/book-now/page.tsx`
- `app/(client)/browse-dates/page.tsx`
- `app/(public)/eat/page.tsx`
- `app/(public)/chef/[slug]/page.tsx`
- `app/client/[token]/**`
- `app/intake/[token]/**`
- `app/(public)/event/[eventId]/guest/[secureToken]/**`
- `app/(public)/hub/**`

Related specs and queue items:

- `docs/specs/consumer-experience-continuity-confidence-memory-recovery-swarm-spec.md`
- `docs/audits/client-portal-gap-analysis.md`
- `docs/specs/system-integrity-question-set-client-portal.md`
- `BQ-20260521T235151Z-consumer-experience-continuity-confidence-memory-recovery-sy`
- `BQ-20260522T010330Z-canonical-client-action-opportunity-matrix`
- `BQ-20260522T005916Z-client-relationship-moment-capitalization-radar`
- `BQ-20260522T010008Z-client-peace-of-mind-dashboard`
- `BQ-20260522T010024Z-chef-needs-client-action-requests`
- `BQ-20260522T010025Z-client-never-worry-promise-map`

## Lifecycle / Action Matrix

| State                     | Primary Action                                    | Supporting Action                                      | Fallback                               | Surface                                     | Owner         | Proof                    |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- | ------------------------------------------- | ------------- | ------------------------ |
| Hungry / browsing         | Find food, chef, menu, package, or idea           | Filter by craving, occasion, location, dietary, budget | Save/shortlist or browse visually      | `/eat`, `/chefs`, `/discover`               | Consumer      | Public route walkthrough |
| Interested in chef        | Inquire or book                                   | View proof, menu/package, reviews, store/gifts         | Message/inquiry handoff                | Public chef page                            | Consumer      | CTA visibility proof     |
| Planning with others      | Start planning circle or shortlist                | Invite friends, compare options                        | Save plan without booking              | Hub/planning circle                         | Host/friends  | Planning flow proof      |
| Inquiry submitted         | Track request status                              | Review submitted request                               | Edit request or message chef           | `/my-inquiries/[id]`, dashboard             | Chef/client   | Status proof             |
| Waiting on chef           | Know owner, expected response, and next best move | Nudge or adjust scope                                  | Try alternate date/chef or escalate    | Inquiry detail, notification, dashboard     | Chef/system   | Recovery proof           |
| Quote received            | Review and respond                                | Download PDF, ask question                             | Request revision or decline            | `/my-quotes/[id]`, `/my-bookings`           | Client        | Quote CTA/expiry proof   |
| Quote expiring            | Decide before deadline                            | Message chef                                           | Request extension/revision             | Quote page, notifications                   | Client        | Deadline proof           |
| Proposal sent             | Review proposal                                   | Message chef                                           | Decline/cancel where policy allows     | `/my-events/[id]`                           | Client        | Journey action proof     |
| Contract needed           | Sign agreement                                    | Review terms                                           | Message chef/support if blocked        | `/my-events/[id]/contract`                  | Client        | Contract guard proof     |
| Deposit/payment due       | Pay deposit or balance                            | View invoice/receipt                                   | Retry or message chef                  | Pay page, event page, work graph            | Client        | Payment proof            |
| Confirmed, no urgent task | Understand what happens next                      | Add to calendar, open circle, message chef             | Browse details                         | Event page, dashboard                       | System        | Calm-state proof         |
| Menu ready                | Approve, choose, or request revision              | Review dishes/dietary tags                             | Message chef                           | Menu approval/choice routes                 | Client        | Menu action proof        |
| Guest coordination        | Invite guests and track RSVPs                     | Add dietary/accessibility details                      | Manual guest updates                   | Event page, Dinner Circle                   | Host          | RSVP proof               |
| Guest count changes       | Request or review change                          | See pricing/status impact                              | Message chef                           | Event page                                  | Client/chef   | Change state proof       |
| Pre-event details         | Confirm dietary, kitchen, timing, address         | Update profile/household                               | Message chef                           | Pre-event checklist                         | Client        | Checklist proof          |
| Day before                | Review final details and expectations             | Check guest/menu/payment state                         | Message chef                           | Event page, notification, calendar          | Client/system | Reminder proof           |
| Service day               | Watch live status                                 | Message chef if needed                                 | Support escalation only for real issue | `/my-events/[id]/live`, event page          | Chef/system   | Live status proof        |
| In progress               | See current milestone                             | Avoid duplicate messages                               | Message chef if urgent                 | Service Day Live                            | Chef/system   | Runtime proof            |
| Event completed           | View recap, photos, receipt, summary              | Save menu/recipes                                      | Message chef                           | Recap/summary/receipt routes                | Client        | Summary proof            |
| Balance remains           | Pay remaining balance                             | View receipt/invoice                                   | Retry or message chef                  | Work graph, event page, pay page            | Client        | Ledger/payment proof     |
| Review needed             | Leave review                                      | Share public review when available                     | Dismiss/snooze if supported            | Event page, work graph                      | Client        | Review proof             |
| Recipe/menu memory        | View saved recipes/menu archive                   | Request shareable recipe                               | Save event summary                     | `/my-recipes`, summary                      | Client/chef   | Archive proof            |
| Referral moment           | Share chef/referral                               | Track referral reward                                  | Copy chef link                         | `/my-referrals`, `/my-rewards`              | Client        | Referral proof           |
| Rebook moment             | Book this again                                   | Modify date/guests/menu                                | Browse dates                           | Event summary, `/book-now`, `/my-recurring` | Client        | Rebook proof             |
| Gift moment               | Buy/send gift card                                | Share chef                                             | Save for later                         | `/my-gift-cards`, public chef gifts         | Client        | Gift proof               |
| Dormant client            | Return, update preferences, book again            | Browse dates or see new menus                          | Reengagement message                   | Notification/dashboard/email                | System/client | Reengagement proof       |

## Build Scope

### 1. Canonical Action Model

Build or extend a canonical next-action model that can represent:

- lifecycle state
- actor
- owner
- primary action
- supporting action
- fallback action
- urgency
- time trigger
- reason copy
- deadline or expected response time
- confidence level
- source/provenance
- surface placements
- role visibility
- proof requirements

This model should extend `client-work-graph` where possible and avoid duplicating logic in page components.

### 2. Surface Placement

Every action must be placeable into one or more surfaces:

- public discovery card/profile CTA
- token portal banner/action card
- authenticated client dashboard
- My Bookings action banner
- event detail primary CTA
- event timeline/journey step
- client universal rail
- notification/action URL
- Dinner Circle/hub
- Remy/client assistant suggestion
- email/SMS lifecycle message where appropriate

### 3. Timing Engine

Add explicit timing rules for:

- inquiry submitted but no chef response
- quote sent and quote expiring
- proposal available
- contract signable
- deposit due
- balance due
- menu review available
- guest RSVP pending
- pre-event checklist missing
- day-before confidence check
- service-day live status
- event completed with no review
- recipe/menu archive ready
- rebook/referral/gift/recurring opportunity
- dormant/reengagement period

Timing rules must avoid fake certainty. If ChefFlow does not know something, it should say what is known and who owns the next step.

### 4. Recovery Actions

Define and expose recovery actions for blocked or uncertain states:

- nudge chef
- edit request before lock
- request quote revision
- request extension
- try alternate date
- try alternate chef
- reduce/simplify scope
- retry payment
- regenerate payment link when allowed
- flag menu/dietary concern
- update guest count
- escalate to support
- report service issue after event

Recovery actions must be policy-aware and auditable where they affect commitments, money, guest data, or support.

### 5. Moment Capitalization

Convert high-trust moments into useful client actions without making the UI feel salesy:

- after proposal accepted: add calendar, open circle, invite guests
- after menu approved: share excitement, confirm guests, check dietary
- day before: confirm details and reduce anxiety
- service day: view live status instead of messaging repeatedly
- after event: review, view receipt, save menu, request recipe, refer, rebook, buy gift card, set recurring
- dormant period: browse dates, see new menus/packages, update preferences

### 6. Public Consumer Confidence

For public consumer discovery, add confidence/readiness information where supported by data:

- fit reason
- dietary confidence with no medical guarantees
- price clarity
- availability certainty
- similar-event proof with no PII
- response expectation when available
- fallback path if confidence is weak

### 7. Privacy And Permissions

Every action must carry role visibility rules:

- Public surfaces may show only intentionally public chef/profile/proof/menu/package data.
- Token portals may show only token-scoped quote/intake/contract/payment/event data.
- Authenticated clients may see only their own tenant/client-scoped state.
- Guests may see only scoped guest/event/hub data.
- Delegates may act only within granted permissions.
- Chefs may see only privacy-safe summaries and explicitly shared client/guest/household memory.
- Admin/support access must be runtime-gated and audited.

## Out Of Scope

- Replacing the full client portal.
- Rewriting public discovery.
- Creating a disconnected prototype.
- Moving queue items to done without runtime proof.
- Adding fake AI certainty or unverified promises.
- Exposing private dietary, household, payment, address, invoice, guest, or support data on public surfaces.

## Acceptance Criteria

- A canonical next-action contract exists and is used by client dashboard, bookings, event detail, and at least one public/token surface.
- Every lifecycle state in the matrix has a primary action, supporting action, fallback, owner, surface, and proof path.
- The current core states remain intact: quote review, proposal review, contract signing, payment, menu review, checklist, review.
- Waiting states expose owner, expectation, and recovery instead of leaving the client in silence.
- Service Day Live is promoted at the right time and not buried.
- Post-event surfaces show review, receipt, summary, recipe/menu memory, referral, rebook, gift, or recurring actions when applicable.
- Public discovery confidence labels are honest, source-backed, and do not overpromise pricing, availability, or allergy safety.
- Role and privacy visibility are enforced server-side, not only hidden in UI.
- Mobile views at 390px and 430px have no horizontal overflow, clipped buttons, or overlapping text.
- The fired build produces proof for affected routes, browser console/network/runtime state, and focused tests.

## Implementation Prep

Before firing:

1. Run `git status --short` and protect unrelated dirty work.
2. Reconcile this item with related active queue items listed above.
3. Decide whether to fire as one lead-owned item or split into waves.
4. Assign one lead owner for shared contracts, route policy, navigation, rail registries, and tests.
5. Keep lanes non-overlapping if multiple agents are used.

Suggested wave split:

- Wave 0: route/current-state proof matrix and duplicate reconciliation.
- Wave 1: canonical action model, timing rules, privacy contract.
- Wave 2: authenticated client portal integration.
- Wave 3: public/token/guest integration.
- Wave 4: post-event capitalization and dormant reactivation.
- Wave 5: verification, screenshots, proof pack, finish-check.

## Likely Files

- `lib/client-work-graph/types.ts`
- `lib/client-work-graph/build.ts`
- `lib/client-work-graph/actions.ts`
- `lib/events/journey-steps.ts`
- `lib/action-graph/bookings.ts`
- `lib/discovery/registries/client-rail-registry.ts`
- `components/client-dashboard/client-universal-rail.tsx`
- `components/navigation/client-nav.tsx`
- `app/(client)/my-events/page.tsx`
- `app/(client)/my-events/[id]/page.tsx`
- `app/(client)/my-events/[id]/live/page.tsx`
- `app/(client)/my-bookings/page.tsx`
- `app/(client)/my-inquiries/[id]/page.tsx`
- `app/(client)/my-quotes/[id]/page.tsx`
- `app/(public)/eat/page.tsx`
- `app/(public)/eat/_components/*`
- `app/(public)/chef/[slug]/page.tsx`
- `app/client/[token]/**`
- `app/intake/[token]/**`
- `lib/auth/route-policy.ts`
- focused tests under `tests/unit/**` and route/runtime checks under existing Playwright or regression tooling

## Risks

- Duplicating next-action logic across pages.
- Making the UI noisy with too many prompts.
- Treating sales moments as more important than client trust.
- Presenting uncertain data as confirmed.
- Allergy or dietary copy implying medical safety.
- Public or token surfaces leaking private client/guest/household data.
- Admin/support views bypassing runtime gates.
- Dirty workspace collisions with existing public discovery, rail, navigation, and client portal work.

## Verification Requirements

When fired, proof must include:

- `npm run regression:firewall`
- focused unit tests for action ranking, timing rules, privacy visibility, and blocked-state fallbacks
- route proof for public `/eat`, public chef profile, token quote/payment/contract/intake where touched, `/my-bookings`, `/my-events`, `/my-events/[id]`, `/my-events/[id]/live`, `/my-inquiries/[id]`, `/my-quotes/[id]`
- browser proof on canonical `http://localhost:3100`
- screenshots or explicit manual proof for at least desktop and mobile widths
- console/network/server log checks for affected pages
- proof pack with acceptance evidence, wiring proof, runtime proof, verification output, and partial-work notes
- `build-queue.mjs finish-check` before moving done

## Done Definition

This work is done only when a client can enter the product from public discovery, token portal, or authenticated portal and consistently see the right next action, the right timing, the right fallback, and a trustworthy explanation for what ChefFlow knows or does not know.
