# Spec: Operational Reassurance And What Happens Next

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** `p0-public-booking-routing-and-source-truth.md` (ready), `smart-input-autocomplete.md` (verified), `p1-buyer-education-and-pre-decision-guidance.md` (ready)
> **Estimated complexity:** medium (8-10 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-03 17:05 | Codex         |        |
| Status: ready | 2026-04-03 17:05 | Codex         |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A builder reading a spec without this section is building blind._

### Raw Signal

- Proceed with the most intelligent decisions on my behalf, in the correct order.
- Before taking action, fully understand the current system, constraints, and context.
- Plan briefly, then execute in a dependency-aware sequence, ensuring all prerequisites exist before advancing.
- Continuously verify your work, confirm alignment with the system, and prevent regressions.
- Bring everything to a clear, structured, and complete state so the builder agent has full context and can execute cleanly, in order.
- We need to synthesize all research into a cross-reference document so the work can guide implementation or modification of the current website build and improve performance and user experience.

### Developer Intent

- **Core goal:** turn the next research-backed website gap into a builder-ready slice that reduces buyer anxiety by explaining what happens next on the real public booking and inquiry paths.
- **Key constraints:** keep reassurance tied to actual route behavior; do not flatten open booking, single-chef inquiry, and instant booking into one generic story; do not widen this into policy/legal rewrites, booking-routing redesign, or a full navigation pass; do not duplicate the lane-config and provenance work already defined in `p0-public-booking-routing-and-source-truth.md`.
- **Motivation:** the current site already says useful trust things, but they are fragmented and partly route-agnostic. The research says buyers need operational reassurance before inquiry and again after submission, and the source-to-close map proves those flows are materially different.
- **Success from the developer's perspective:** a builder can add route-aware reassurance and confirmation blocks to the public booking surfaces cleanly, using one canonical copy/config model and without promising support, cancellation, payment, or follow-up behavior that the product does not actually implement.

---

## What This Does (Plain English)

This spec adds a route-aware reassurance layer on top of the public lane model already defined in `p0-public-booking-routing-and-source-truth.md`.

After this is built:

- `/book` explains what open booking actually does
- `/chef/[slug]/inquire` explains what a direct chef inquiry does
- `/book/[chefSlug]` explains the difference between inquiry-first and instant-book flows
- confirmation states and thank-you surfaces explain what just happened and what happens next
- public profile CTA sections and the Trust Center stop being isolated trust islands and start reinforcing the real process

This is not a booking-routing rewrite. It is a truth-aligned reassurance pass that extends the existing lane-truth packet into pre-submit, post-submit, and thank-you messaging.

---

## Why It Matters

The competitive memo already identifies this as the next missing website layer. It says the current reassurance is fragmented across the trust page, book flow, inquiry form, and general product FAQ, and that the buyer journey still lacks one strong surface explaining what happens after submission, when contact is shared, who handles payment and when, and what happens if plans change (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:613`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:649`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:651`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:670`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:676`).

The repo already has honest but scattered reassurance:

- `/book` says the flow is free to submit, no obligation, and chefs contact directly (`app/(public)/book/page.tsx:32`, `app/(public)/book/page.tsx:33`, `app/(public)/book/page.tsx:55`, `app/(public)/book/page.tsx:65`, `app/(public)/book/page.tsx:75`)
- the open-booking form says matched chefs typically respond within 24 hours and that user data is shared only with matched chefs (`app/(public)/book/_components/book-dinner-form.tsx:455`, `app/(public)/book/_components/book-dinner-form.tsx:458`)
- the single-chef inquiry form says the chef will review details and reply within 24 hours (`components/public/public-inquiry-form.tsx:340`, `components/public/public-inquiry-form.tsx:342`)
- the chef-specific booking route already has distinct instant-book deposit copy versus inquiry-first reply copy (`app/book/[chefSlug]/booking-page-client.tsx:47`, `app/book/[chefSlug]/booking-page-client.tsx:51`, `app/book/[chefSlug]/booking-page-client.tsx:52`, `components/booking/booking-form.tsx:782`, `components/booking/booking-form.tsx:788`, `components/booking/booking-form.tsx:789`)

But the source-to-close truth map proves these are not the same product story. Public intake is split across open booking, single-chef inquiry, and instant booking, and the builder is explicitly warned not to design around one generic "website lead" (`docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:23`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:33`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:114`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:270`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:429`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:432`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:433`).

There is already a broader ready spec for lane distinctions, provenance, and public route truth in `docs/specs/p0-public-booking-routing-and-source-truth.md` (`docs/specs/p0-public-booking-routing-and-source-truth.md:40`, `docs/specs/p0-public-booking-routing-and-source-truth.md:64`, `docs/specs/p0-public-booking-routing-and-source-truth.md:70`). This spec stays narrower on purpose: it consumes that lane model and extends it into better operational reassurance and confirmation UX.

This spec closes that gap without pretending the system is more unified than it is.

---

## Files to Create

| File                                             | Purpose                                                                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `components/public/intake-lane-confirmation.tsx` | Shared post-submit and post-payment confirmation block that consumes the lane config created by the P0 routing/source-truth spec |

---

## Files to Modify

| File                                                                                      | What to Change                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/public/intake-lane-config.ts`                                                        | Extend the shared lane config from the P0 routing/source-truth spec with reassurance-copy fields for pre-submit, post-submit, and support/trust handoffs instead of creating a second lane model |
| `components/public/intake-lane-expectations.tsx`                                          | Extend the shared expectations block from the P0 routing/source-truth spec so it can render reassurance-oriented variants cleanly                                                                |
| `app/(public)/book/page.tsx`                                                              | Add an open-booking-specific "what happens next" summary near the hero/form handoff without rewriting the page architecture                                                                      |
| `app/(public)/book/_components/book-dinner-form.tsx`                                      | Replace generic success and reassurance copy with lane-aware open-booking confirmation, privacy, and next-step messaging                                                                         |
| `components/public/public-inquiry-form.tsx`                                               | Add a single-chef inquiry reassurance block before submit and a stronger success state that explains what happens next without overpromising                                                     |
| `app/(public)/chef/[slug]/inquire/page.tsx`                                               | Integrate the single-chef inquiry reassurance module into the existing proof/context layout                                                                                                      |
| `app/(public)/chef/[slug]/page.tsx`                                                       | Add a compact route-aware reassurance strip in the primary CTA area so profile-to-inquiry behavior is clearer before click-through                                                               |
| `app/book/[chefSlug]/booking-page-client.tsx`                                             | Clarify the difference between inquiry-first and instant-book before the user enters details                                                                                                     |
| `components/booking/booking-form.tsx`                                                     | Add lane-aware reassurance beneath submit/deposit actions and tighten instant-book payment wording around what is confirmed now versus later                                                     |
| `app/book/[chefSlug]/thank-you/page.tsx`                                                  | Replace generic thank-you copy with distinct inquiry-first versus instant-book next-step messaging and support/trust handoffs                                                                    |
| `app/(public)/trust/page.tsx`                                                             | Add a concise buyer-facing process summary or handoff so support and trust expectations connect to the public booking journey                                                                    |
| `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md` | Mark operational reassurance as spec-backed and update builder sequencing                                                                                                                        |

---

## Database Changes

None.

---

## Data Model

This spec adds no schema. It extends the typed lane/config model already defined by `p0-public-booking-routing-and-source-truth.md`.

Use a shape such as:

```ts
type ProcessStep = {
  title: string
  body: string
}

type PublicProcessLaneReassurance = {
  audienceLabel: string
  preSubmit: {
    heading: string
    commitmentNote: string
    privacyNote?: string
    paymentNote?: string
    supportNote?: string
    steps: ProcessStep[]
  }
  postSubmit: {
    heading: string
    summary: string
    steps: ProcessStep[]
    primaryCtaLabel?: string
    primaryCtaHref?: string
    secondaryCtaLabel?: string
    secondaryCtaHref?: string
  }
  faq?: Array<{
    question: string
    answer: string
  }>
}
```

Key rules:

1. **Do not create a second lane system.** Reuse the lane ids and shared lane config from the P0 routing/source-truth spec.
2. **Lane-specific truth only.** Every reassurance block must map to one real route behavior, not to a made-up "default inquiry flow."
3. **Open booking is fan-out.** `/book` must say the request goes to matched chefs near the event location. It must not imply one single chef thread or one globally shared lead record.
4. **Single-chef inquiry is direct.** `/chef/[slug]/inquire` must say the details go directly to that chef. It must not borrow matched-chef language.
5. **Instant book is payment-backed.** `instant_book` must say deposit due now, Stripe checkout, and booking confirmation after payment. It must not reuse inquiry-first "not a confirmed reservation" language.
6. **No fictional protections.** Do not promise replacements, refunds, cancellation outcomes, or dispute handling beyond current truthful, public-facing expectations.
7. **Support can be visible without being magical.** Support/trust links are allowed, but they must not imply a 24/7 concierge or marketplace-like replacement team unless that system exists.
8. **Deeper category education stays in the buyer-guide spec.** These modules answer operational questions briefly; they do not replace the `how-it-works` guide system.

---

## Server Actions

No new write actions.

Use current route results and current lane config only.

Implementation rule:

- Do not add new backend funnel behavior in this slice. The reassurance layer should consume existing route outcomes such as `matched_count`, success state, and booking mode, not redesign them.

---

## UI / Component Spec

### Shared Reassurance Pattern

Reuse the lane config and expectations component from `p0-public-booking-routing-and-source-truth.md`, and add one shared confirmation component with a `lane` prop and a `mode` prop:

- `mode="pre_submit"` for CTA-adjacent blocks
- `mode="post_submit"` for success states and thank-you screens

The component should render:

1. short heading
2. 2-4 route-specific process steps
3. commitment note
4. privacy/payment/support note when applicable
5. small handoff CTA to `/trust`, `/contact`, `/chefs`, or the current lane's next best action

### Lane 1: Open Booking (`/book`)

Pre-submit block should explain:

1. request is sent to matched chefs near the selected location
2. matched chefs contact the client directly if there is a fit
3. this is free to submit and not a confirmed booking
4. no payment is due at request stage

Post-submit block should explain:

1. how many chefs received the request
2. confirmation email was sent
3. browse-chef fallback or contact fallback if no one matched
4. quote/payment discussion happens only after a chef engages

### Lane 2: Single-Chef Inquiry (`/chef/[slug]/inquire`)

Pre-submit block should explain:

1. details go directly to this chef
2. the chef reviews and replies within the current stated response window
3. inquiry does not commit the client to payment
4. if there is a fit, the next stage is menu, pricing, and event details

Post-submit block should explain:

1. inquiry reached this chef
2. reply timing expectation
3. no payment due at inquiry stage
4. where to go for trust/support questions if needed

### Lane 3: Chef Booking Inquiry-First (`/book/[chefSlug]` with `bookingModel="inquiry_first"`)

Pre-submit block should explain:

1. date selection starts a direct booking request with this chef
2. request is not confirmed yet
3. the chef follows up before pricing/payment are finalized
4. this lane is different from instant book

Post-submit or thank-you state should explain:

1. request received
2. reply timing expectation
3. no payment processed yet
4. next stage is chef response and quote/details alignment

### Lane 4: Instant Book (`/book/[chefSlug]` with `bookingModel="instant_book"`)

Pre-submit block should explain:

1. selected date is being confirmed through a deposit-backed booking
2. payment goes through Stripe
3. deposit confirms the booking
4. remaining balance and chef follow-up happen after checkout

Post-submit or thank-you state should explain:

1. deposit processed
2. booking confirmed
3. receipt/confirmation email sent
4. chef follows up with event details and next steps

### Profile CTA Area

`app/(public)/chef/[slug]/page.tsx` should gain a compact reassurance row near the primary CTA area:

- direct route note for inquiry
- no-commitment note for inquiry-first actions
- trust/support link or microcopy

This must stay compact. It is a bridge into the reassurance layer, not a full FAQ section.

### Trust Page

The trust page should gain a small "booking process and support expectations" section or handoff:

- where support questions go
- that booking and inquiry routes have different next-step behavior
- link into `/book`, the buyer-guide hub, or `/contact`

Do not turn the Trust Center into a duplicate FAQ page.

---

## Edge Cases and Error Handling

| Scenario                                                                            | Correct Behavior                                                       |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Builder uses one generic reassurance block on every route                           | Stop. Each public lane needs its own truthful config                   |
| Open booking with `matched_count === 0` still says chefs will contact directly      | Replace with no-match fallback language and browse/contact handoff     |
| Instant-book lane still says "not a confirmed reservation" after deposit            | Fix the copy; instant book is payment-backed and confirmed on success  |
| Single-chef inquiry says "matched chefs" anywhere                                   | Fix the copy; that is only true for open booking                       |
| Trust page starts promising cancellation/replacement outcomes not implemented today | Remove the promise and keep the copy at truthful support/process level |
| Builder widens this into a full legal/policy rewrite                                | Stop. This spec is presentation and explanation only                   |
| Builder applies the reassurance module to external chef website CTAs                | Keep it attached to ChefFlow-owned paths only                          |

---

## Verification Steps

1. Confirm `/book` shows an open-booking-specific "what happens next" block before submit.
2. Submit `/book` in a happy-path dev scenario and confirm the success state explains:
   - matched chefs received the request
   - no booking is confirmed yet
   - next-step expectation
3. Confirm the no-match open-booking state does not pretend a chef will reply.
4. Confirm `/chef/[slug]/inquire` shows a direct-chef reassurance block before submit.
5. Submit a single-chef inquiry and confirm the success state says the chef reviews and replies, without matched-chef language or payment language.
6. Confirm `/book/[chefSlug]` in `inquiry_first` mode says the request is not confirmed yet and that the chef follows up before pricing/payment are finalized.
7. Confirm `/book/[chefSlug]` in `instant_book` mode says deposit via Stripe confirms the booking and remaining balance comes later.
8. Confirm `/book/[chefSlug]/thank-you?mode=instant` uses instant-book confirmation language.
9. Confirm the public chef profile CTA area includes a compact reassurance bridge into the inquiry path.
10. Confirm the Trust Center now has a concise booking-process/support handoff without turning into a duplicate FAQ page.
11. Confirm no reassurance block promises one unified post-event review loop, guaranteed replacement, or policy behavior not already supported.
12. Confirm the website cross-reference now treats this lane as spec-backed.

---

## Out of Scope

- Booking-routing matrix or intake-lane redesign
- Unifying open booking, single-chef inquiry, Wix, and instant booking behavior in code
- Changing cancellation, refund, dispute, or replacement policy logic
- Rewriting support operations or SLA policy
- Full navigation and CTA continuity redesign
- Replacing buyer-education guide pages
- Review-loop reconciliation or post-event trust-loop consolidation

---

## Notes for Builder Agent

- This slice is about explanation quality, not backend behavior changes.
- Start from the shared lane model in `p0-public-booking-routing-and-source-truth.md`; do not invent parallel lane ids or duplicate lane components here.
- Use the source-to-close truth map as the hard boundary: if the copy implies a shared downstream behavior the code does not have, the copy is wrong.
- Keep instant-book language distinct. It is a public booking lane and should not be left behind or mislabeled as inquiry-first.
- If you hit a route behavior that the reassurance copy cannot honestly explain, stop and surface it instead of papering over it with generic trust language.
- This spec should reduce buyer uncertainty before and after action, not turn the site into a legal/policy encyclopedia.

---

## Spec Validation

### 1. What exists today that this touches?

- `/book` already promises direct contact, free submission, and no obligation, but it does not yet explain the full downstream flow in one place (`app/(public)/book/page.tsx:32`, `app/(public)/book/page.tsx:33`, `app/(public)/book/page.tsx:55`, `app/(public)/book/page.tsx:65`, `app/(public)/book/page.tsx:75`).
- The open-booking form already has a success state, reply-time microcopy, and privacy copy (`app/(public)/book/_components/book-dinner-form.tsx:152`, `app/(public)/book/_components/book-dinner-form.tsx:167`, `app/(public)/book/_components/book-dinner-form.tsx:455`, `app/(public)/book/_components/book-dinner-form.tsx:458`).
- The single-chef inquiry form already has a direct success state and minor operational hints (`components/public/public-inquiry-form.tsx:340`, `components/public/public-inquiry-form.tsx:342`, `components/public/public-inquiry-form.tsx:380`, `components/public/public-inquiry-form.tsx:453`, `components/public/public-inquiry-form.tsx:562`).
- The public chef inquiry page already pairs the form with proof and contact fallback (`app/(public)/chef/[slug]/inquire/page.tsx:109`, `app/(public)/chef/[slug]/inquire/page.tsx:449`).
- The public chef profile already has a primary CTA area where a reassurance bridge can live (`app/(public)/chef/[slug]/page.tsx:588`, `app/(public)/chef/[slug]/page.tsx:592`, `app/(public)/chef/[slug]/page.tsx:605`, `app/(public)/chef/[slug]/page.tsx:619`, `app/(public)/chef/[slug]/page.tsx:644`).
- The chef-specific booking route already distinguishes inquiry-first and instant-book behavior in copy, but only lightly (`app/book/[chefSlug]/booking-page-client.tsx:47`, `app/book/[chefSlug]/booking-page-client.tsx:51`, `app/book/[chefSlug]/booking-page-client.tsx:52`, `components/booking/booking-form.tsx:782`, `components/booking/booking-form.tsx:788`, `components/booking/booking-form.tsx:789`, `app/book/[chefSlug]/thank-you/page.tsx:19`, `app/book/[chefSlug]/thank-you/page.tsx:23`).
- The Trust Center already exposes support and response-target details, but not as a booking-process layer (`app/(public)/trust/page.tsx:40`, `app/(public)/trust/page.tsx:41`, `app/(public)/trust/page.tsx:49`, `app/(public)/trust/page.tsx:147`, `app/(public)/trust/page.tsx:150`).

### 2. What exactly changes?

- Extend the shared lane config and expectations UI from `p0-public-booking-routing-and-source-truth.md`.
- Apply route-aware reassurance blocks to `/book`, `/chef/[slug]/inquire`, `/book/[chefSlug]`, and the public chef profile CTA area.
- Strengthen post-submit and thank-you states so they explain what just happened and what happens next.
- Add a concise buyer-facing process/support handoff on the Trust Center.
- Update the website cross-reference so this lane is no longer research-only.

### 3. What assumptions are you making?

- **Verified:** the competitive memo explicitly calls for buyer-facing FAQ modules on `/book`, public chef profiles, and inquiry pages, plus a concise "what happens next" block near the main CTA and again after form submission (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:670`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:672`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:673`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:674`).
- **Verified:** the memo also says payment/deposit, cancellation, rescheduling, and replacement expectations should only be explained where truthful (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:675`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:676`).
- **Verified:** the source-to-close map says public intake is split across different lanes and explicitly warns builders not to design around one generic website lead (`docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:23`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:33`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:429`).
- **Verified:** the broader lane ids, provenance, and route-truth packet already exists in `p0-public-booking-routing-and-source-truth.md`, so this slice should extend it rather than recreate it (`docs/specs/p0-public-booking-routing-and-source-truth.md:40`, `docs/specs/p0-public-booking-routing-and-source-truth.md:64`, `docs/specs/p0-public-booking-routing-and-source-truth.md:70`).
- **Unverified but fenced:** the long-term product decisions around unified cancellation, replacement, review-loop, or instant-book follow-on behavior are not settled, so this spec avoids claims that require those decisions first.

### 4. Where will this most likely break?

1. A builder may recreate a second lane config instead of extending the existing P0 booking-routing lane model.
2. A builder may reuse one reassurance block everywhere and erase real lane differences.
3. A builder may accidentally promise support, cancellation, or replacement outcomes beyond what the current product supports.
4. A builder may forget the public `/book/[chefSlug]` route and leave instant-book copy inconsistent.
5. A builder may widen the slice into a general booking-routing or legal-policy redesign.

### 5. What is underspecified?

- Exact copy tone can follow the current public visual language, but the lane model, required surfaces, and no-fiction rules remove the risky ambiguity.
- The exact support/trust CTA target can be `/trust` or `/contact` depending on page context, as long as it stays truthful and lightweight.

### 6. What dependencies or prerequisites exist?

- Preserve the current structured booking and inquiry input flow from `smart-input-autocomplete.md`.
- Build on `p0-public-booking-routing-and-source-truth.md` for lane ids, route truth, and shared expectations UI.
- Preserve the buyer-guide architecture from `p1-buyer-education-and-pre-decision-guidance.md`; these reassurance blocks complement it and should link into it when deeper education is needed.
- Use the source-to-close truth map to keep lane definitions honest.

### 7. What existing logic could this conflict with?

- The existing P0 booking-routing and source-truth packet, if a builder duplicates lane ids or shared components instead of extending them.
- Current generic reassurance copy in `/book`, the public inquiry form, and the chef-specific booking route, if a builder patches one path and leaves the others drifted.
- Later booking-routing matrix work, if a builder tries to solve routing and copy simultaneously.
- Later post-event trust-loop work, if a builder implies one already-consolidated review/request system.

### 8. What is the end-to-end data flow?

1. Visitor lands on one of the public booking lanes.
2. The page resolves the lane-specific reassurance config.
3. The visitor sees route-specific commitment/privacy/payment expectations before acting.
4. After submit or payment, the route renders lane-specific confirmation messaging tied to the actual route result.
5. The visitor is directed into the next truthful step: wait for matched chefs, wait for this chef, confirm booking receipt, browse chefs, or contact support/trust resources.

### 9. What is the correct implementation order?

1. Land or confirm the shared lane config and expectations component from `p0-public-booking-routing-and-source-truth.md`.
2. Extend that shared lane model with reassurance and confirmation fields.
3. Apply the open-booking reassurance model to `/book` and its success state.
4. Apply the single-chef inquiry reassurance model to `/chef/[slug]/inquire` and its form success state.
5. Apply the inquiry-first versus instant-book split to `/book/[chefSlug]`, `components/booking/booking-form.tsx`, and the thank-you page.
6. Add the compact profile CTA reassurance bridge.
7. Add the small Trust Center process/support handoff.
8. Update the website cross-reference.

### 10. What are the exact success criteria?

- `/book` explains open-booking next steps truthfully before and after submit.
- `/chef/[slug]/inquire` explains direct-chef inquiry next steps truthfully before and after submit.
- `/book/[chefSlug]` clearly distinguishes inquiry-first from instant-book behavior.
- `app/book/[chefSlug]/thank-you/page.tsx` reflects route-specific next-step behavior.
- Public chef profile CTA area includes a compact reassurance bridge.
- Trust page now connects support expectations to the booking journey.
- The website cross-reference treats this lane as spec-backed and sequences remaining gaps correctly.

### 11. What are the non-negotiable constraints?

- No generic one-flow reassurance model.
- No unsupported cancellation/refund/replacement promises.
- No backend funnel redesign in this slice.
- No legal/policy rewrite.
- No navigation overhaul.

### 12. What should NOT be touched?

- Inquiry/write-path behavior itself.
- Review-loop reconciliation logic.
- Broader booking-routing or intake-lane redesign.
- The buyer-guide content system beyond light cross-links.
- Header/footer-wide navigation hierarchy.

### 13. Is this the simplest complete version?

Yes. It turns the next research-backed website trust gap into a concrete implementation slice without pulling in policy engines, routing redesign, or full public-site re-architecture.

### 14. If implemented exactly as written, what would still be wrong?

- The product would still need a later booking-routing matrix spec if the team wants to unify or further separate intake lanes structurally.
- Navigation and CTA continuity would still remain a separate website spec.
- Alternate entry-point visibility and site-level proof freshness would still remain later follow-up work.

---

## Final Check

This spec is production-ready for a builder handoff as the follow-on reassurance layer after the broader P0 booking-routing/source-truth packet. The remaining uncertainty is structural policy and funnel unification, not the reassurance layer itself. The implementation is safe because it improves clarity while staying inside current route truth.
