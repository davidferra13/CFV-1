# Website Routing and Source Analytics Builder Handoff

Date: `2026-04-03`
Status: active handoff for the next website-routing builder
Purpose: give the next builder one clean read order and execution order for the website-routing and source-truth slice without depending on dirty foundational docs or chat memory

Primary companion docs:

- `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`
- `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`
- `docs/specs/p0-public-booking-routing-and-source-truth.md`
- `docs/specs/p1-source-provenance-and-conversion-analytics-correction.md`

---

## Short Answer

The next builder should not redesign the website broadly and should not keep doing raw research.

The correct next sequence is:

1. preserve the current public proof and inquiry baseline
2. implement the P0 public-booking routing and source-truth spec
3. implement the P1 source-provenance analytics correction
4. only then move into adjacent trust slices such as dietary trust or post-event proof loops

This is the narrowest correct path that turns the research into executable work.

---

## Why This Handoff Exists

The canonical website cross-reference is useful, but it is already dirty in the working tree and still treats this slice as partly research-backed. The funnel-truth memo then established the missing fact pattern:

- ChefFlow does not have one public funnel
- `/book` and `/chef/[slug]/inquire` are not the same story
- analytics currently under-measure that distinction

This handoff turns that into one builder-safe packet.

---

## Current Truths The Builder Must Start From

1. The homepage already has a meaningful dual-CTA structure: `/book` plus browse chefs. [app/(public)/page.tsx:236-258](<app/(public)/page.tsx:236>)
2. `/book` is already the matched-chef lane, not a single-chef lane. [app/(public)/book/page.tsx:31-34](<app/(public)/book/page.tsx:31>) [app/api/book/route.ts:167-279](app/api/book/route.ts:167)
3. `/chef/[slug]/inquire` is already the strongest single-chef planning lane in the product. [app/(public)/chef/[slug]/inquire/page.tsx:112-123](<app/(public)/chef/[slug]/inquire/page.tsx:112>) [components/public/public-inquiry-form.tsx:233-277](components/public/public-inquiry-form.tsx:233)
4. Embed inquiry, Wix, kiosk, and instant booking already exist and must not be flattened into generic website traffic. [app/api/embed/inquiry/route.ts:225-338](app/api/embed/inquiry/route.ts:225) [lib/wix/process.ts:16-199](lib/wix/process.ts:16) [app/api/kiosk/inquiry/route.ts:90-198](app/api/kiosk/inquiry/route.ts:90) [lib/booking/instant-book-actions.ts:144-177](lib/booking/instant-book-actions.ts:144)
5. Source analytics currently group mostly by `channel`, and completed conversion counts are effectively broken. [lib/partners/analytics.ts:89-165](lib/partners/analytics.ts:89)

---

## Canonical Read Order

Read these in this exact order before writing code:

1. `docs/build-state.md`
2. `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`
3. `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`
4. `docs/specs/featured-chef-public-proof-and-booking.md`
5. `docs/specs/public-chef-credentials-showcase.md`
6. `docs/specs/p0-public-booking-routing-and-source-truth.md`
7. `docs/specs/p1-source-provenance-and-conversion-analytics-correction.md`

Only after those:

8. `docs/specs/p1-allergy-and-dietary-trust-alignment.md`
9. `docs/specs/post-event-trust-loop-consolidation.md`

---

## Exact Execution Order

### Phase 0

Preserve the baseline.

- Do not rebuild public proof from scratch.
- Do not force a clean worktree.
- Do not treat `/book` as a generic marketing page.

### Phase 1

Implement `docs/specs/p0-public-booking-routing-and-source-truth.md`.

Done means:

- public routing language tells the truth
- source provenance is written explicitly on inquiries
- the site does not overclaim shared behavior across lanes

### Phase 2

Implement `docs/specs/p1-source-provenance-and-conversion-analytics-correction.md`.

Done means:

- analytics show real intake lanes
- completed counts are no longer zero by accident
- referral-performance percentages are not multiplied incorrectly

### Phase 3

Only after Phases 1 and 2 are complete, resume adjacent trust work:

- allergy and dietary trust alignment
- post-event trust-loop consolidation

That ordering matters because public trust copy and later proof loops should sit on truthful routing and truthful measurement first.

---

## What The Builder Must Not Do

- Do not collapse `/book`, `/chef/[slug]/inquire`, embed, Wix, kiosk, and instant book into one funnel.
- Do not promise the same follow-up or collaboration path from every lane.
- Do not let public AI copy drift into recipe generation or chef replacement claims.
- Do not rewrite analytics around stale `app/api/v2/inquiries` assumptions.
- Do not change `lib/analytics/custom-report-enhanced-actions.ts` in the provenance-fix pass.
- Do not broaden this into a full homepage redesign.

---

## What Remains After This Packet

If the builder executes both new specs exactly as written, the next unresolved slices are:

1. instant-book dietary persistence
2. Wix event-seeding decision
3. kiosk phone-only identity cleanup
4. post-event review-request reconciliation

Those are separate, real follow-on tasks. They are not blockers for the routing-and-measurement packet.

---

## Completion Condition

This handoff is doing its job when the next builder can answer these questions without guessing:

1. What is `/book`, exactly?
2. What is the difference between `/book` and `/chef/[slug]/inquire`?
3. Where should the next code changes happen first?
4. How should source analytics classify website-origin demand after the routing spec lands?
5. What adjacent problems are explicitly out of scope for this pass?

If those answers are clear, the builder has enough context to execute cleanly and in order.
