# Spec: Public Booking Routing and Source Truth

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`, `docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md`
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date                 | Agent/Session | Commit |
| ------------- | -------------------- | ------------- | ------ |
| Created       | 2026-04-03 01:17 EDT | Codex         |        |
| Status: ready | 2026-04-03 01:17 EDT | Codex         |        |

---

## Developer Notes

### Raw Signal

The developer asked for the most intelligent next move, in the correct order, after the research and survey passes. The work must fully understand the current system first, respect constraints, execute in dependency order, verify itself, prevent regressions, and leave the builder with full context instead of chat-memory fragments.

The website also has to stay aligned with the actual product. The developer has been explicit that AI should not drift into fake culinary claims or recipe-generation messaging. Public positioning can talk about admin, workflow, follow-up, and operations help. It cannot imply ChefFlow is replacing the chef's craft.

The underlying fear is clear: a future builder could flatten very different intake paths into one generic "book a chef" story, overpromise what happens after form submit, and accidentally make the website less honest than the real system.

### Developer Intent

- **Core goal:** Give the builder one exact spec that keeps public booking lanes distinct, preserves real source truth, and aligns website copy and routing with the actual workflow engine.
- **Key constraints:** Do not collapse `/book`, `/chef/[slug]/inquire`, embed, Wix, kiosk, and instant booking into one fake funnel. Do not add a login gate. Do not add new DB tables or destructive schema work. Do not let public AI copy drift beyond admin and operations help.
- **Motivation:** Website conversion and trust now depend on correctly describing real downstream behavior, not on adding more generic landing-page copy.
- **Success from the developer's perspective:** A builder can implement the next website routing and copy changes without guessing what each intake lane means, what records it creates, or what the site is allowed to promise.

---

## What This Does (Plain English)

This spec makes ChefFlow's public website tell the truth about how booking actually works. `/book` becomes the clearly-labeled matched-chef lane, public chef inquiry remains the single-chef planning lane, instant booking stays a distinct event-first transaction path, and the write paths preserve explicit provenance so later analytics and UI decisions do not have to reverse-engineer intent from `channel: 'website'` alone.

---

## Why It Matters

The current product already has real continuity from public site to client, inquiry, and event records, but the public story still flattens different workflows into one generic promise. That creates trust risk, routing confusion, and bad downstream analytics even though the backend is already more capable than the website copy suggests.

---

## Current-State Summary

Today the homepage and nav already route traffic into both `/book` and chef-directory browsing, but the labels still imply a simpler story than the actual system. `/book` currently promises that ChefFlow will match a buyer with vetted chefs in the area, while the page and form helper copy stay fairly generic about fan-out and direct outreach. [app/(public)/page.tsx:236-258](<app/(public)/page.tsx:236>) [app/(public)/book/page.tsx:21-40](<app/(public)/book/page.tsx:21>) [app/(public)/book/\_components/book-dinner-form.tsx:454-459](<app/(public)/book/_components/book-dinner-form.tsx:454>)

The single-chef inquiry experience is already a stronger, more structured planning lane. It collects date, time, address, guest count, budget shape, allergies, and notes, then calls `submitPublicInquiry()` and tells the buyer the named chef will review the request. [app/(public)/chef/[slug]/inquire/page.tsx:112-123](<app/(public)/chef/[slug]/inquire/page.tsx:112>) [components/public/public-inquiry-form.tsx:233-277](components/public/public-inquiry-form.tsx:233) [components/public/public-inquiry-form.tsx:377-563](components/public/public-inquiry-form.tsx:377)

On the backend, these flows are materially different. Open booking fans out across matched chefs and seeds separate inquiry and event records per chef. Public inquiry creates one inquiry, Dinner Circle, draft event, and follow-on automation chain under a single chef. Embed inquiry is similar to public inquiry but marks embed provenance and preserves UTM fields. Instant booking creates client, inquiry, draft event, and Stripe checkout, but is a payment-coupled lane with its own `booking_source` metadata. [app/api/book/route.ts:107-279](app/api/book/route.ts:107) [lib/inquiries/public-actions.ts:203-368](lib/inquiries/public-actions.ts:203) [app/api/embed/inquiry/route.ts:225-338](app/api/embed/inquiry/route.ts:225) [lib/booking/instant-book-actions.ts:144-177](lib/booking/instant-book-actions.ts:144) [lib/booking/instant-book-actions.ts:397-476](lib/booking/instant-book-actions.ts:397)

---

## Files to Create

| File                                             | Purpose                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `lib/public/intake-lane-config.ts`               | Shared lane identifiers, public labels, "what happens next" copy, and provenance-derivation helpers for website use |
| `components/public/intake-lane-expectations.tsx` | Reusable trust block that explains how each public lane works without duplicating copy across pages                 |
| `tests/unit/intake-lane-config.test.ts`          | Verifies lane classification precedence and copy-safe AI boundary flags                                             |

---

## Files to Modify

| File                                                 | What to Change                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(public)/page.tsx`                              | Make the primary public split explicit: matched-chef request versus browse-and-inquire. Keep operator CTA secondary.                             |
| `app/(public)/book/page.tsx`                         | Reframe `/book` as the matched-chef lane, not a single-chef booking claim. Add a short expectations block under the hero or form.                |
| `app/(public)/book/_components/book-dinner-form.tsx` | Update helper copy and success state so buyers understand their request is shared only with matched chefs, and matched chefs reach out directly. |
| `app/(public)/chef/[slug]/inquire/page.tsx`          | Add a clear single-chef planning expectations block near the form or proof card.                                                                 |
| `components/public/public-inquiry-form.tsx`          | Update intro and success messaging so the buyer knows this goes to one chef, not a marketplace fan-out.                                          |
| `components/navigation/public-header.tsx`            | Update nav labels or CTA hierarchy so `/book` reads as a matched-chef lane, not a generic catch-all.                                             |
| `components/navigation/public-footer.tsx`            | Keep footer link labels aligned with the same routing story used in the header and homepage.                                                     |
| `app/api/book/route.ts`                              | Standardize open-booking provenance with an explicit canonical lane key in `unknown_fields` and keep existing `utm_medium='open_booking'`.       |
| `lib/inquiries/public-actions.ts`                    | Write a canonical lane key for single-chef public inquiry into `unknown_fields`.                                                                 |
| `app/api/embed/inquiry/route.ts`                     | Write a canonical lane key for embed inquiry while preserving existing `embed_source` and UTM fields.                                            |
| `app/api/kiosk/inquiry/route.ts`                     | Write a canonical lane key for kiosk inquiry.                                                                                                    |
| `lib/booking/instant-book-actions.ts`                | Write a canonical lane key for instant booking on the inquiry record so analytics do not have to infer it only from events.                      |
| `lib/wix/process.ts`                                 | Align the existing Wix `submission_source` field with the shared lane enum exported by `lib/public/intake-lane-config.ts`.                       |

---

## Database Changes

None.

This spec uses existing fields:

- `inquiries.channel`
- `inquiries.unknown_fields`
- `inquiries.utm_source`
- `inquiries.utm_medium`
- `inquiries.utm_campaign`
- `inquiries.converted_to_event_id`
- `events.booking_source`

No migration is required for the first routing and source-truth slice.

---

## Data Model

### Canonical Public Lane Keys

The new shared config should define these route-level lane ids:

- `open_booking`
- `public_profile_inquiry`
- `embed_inquiry`
- `kiosk_inquiry`
- `wix_form`
- `instant_book`

These are application-level constants, not new database enums.

### Write-Time Provenance Rules

Every touched intake writer should preserve provenance on the `inquiries` record using existing fields:

- keep `channel` as-is when it reflects the coarse channel contract already used elsewhere
- write `unknown_fields.submission_source` with one of the canonical lane keys above
- preserve existing lane-specific markers that already matter:
  - `unknown_fields.open_booking`
  - `unknown_fields.embed_source`
  - `utm_medium='open_booking'`
  - `events.booking_source`

### UI Truth Rules

The website must describe each lane according to the records it actually creates:

- `open_booking`: matched-chef fan-out, multiple chefs may receive the request, matched chefs contact directly
- `public_profile_inquiry`: one named chef receives the request and reviews it directly
- `instant_book`: price-backed event-first flow with checkout, not just another inquiry form
- `embed_inquiry`, `kiosk_inquiry`, `wix_form`: out of the main website CTA story, but still part of shared provenance vocabulary

---

## Server Actions

No new server actions are required.

This spec touches existing public write paths and route handlers:

| Action or Route                  | Auth                | Input                       | Output                                      | Side Effects                                                          |
| -------------------------------- | ------------------- | --------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| `POST /api/book`                 | public              | open-booking form payload   | `{ success, matched_count, message }`       | Creates or reuses client, inquiry, and draft event per matched chef   |
| `submitPublicInquiry()`          | public              | single-chef inquiry payload | `{ success, inquiryCreated, eventCreated }` | Creates client, inquiry, Dinner Circle, draft event, automation hooks |
| `POST /api/embed/inquiry`        | public              | embed payload               | `{ success, inquiryId, circleUrl? }`        | Creates inquiry, draft event, Dinner Circle, and preserves UTM fields |
| `POST /api/kiosk/inquiry`        | public device token | kiosk payload               | `{ success, inquiryId, eventId? }`          | Creates inquiry, draft event, and device event log                    |
| `createInstantBookingCheckout()` | public              | instant-book payload        | `{ url, sessionId, eventId }`               | Creates client, inquiry, event, and Stripe checkout session           |

The new shared helper file should be a plain TypeScript utility, not a server action.

---

## UI / Component Spec

### Page Layout

#### Homepage

Keep the current strong dual-CTA structure, but make the path distinction explicit:

- primary CTA: matched-chef request
- secondary path: browse chefs and choose one
- supporting copy: "Need help finding the right chef?" for `/book`; "Already see someone you like?" for `/chefs`

Do not add more primary CTAs than these two.

#### `/book`

`/book` should clearly read as:

- "Tell us about your event"
- "We share your request only with chefs who match the location and job"
- "Matched chefs reach out directly"
- "Free to submit, no obligation"

Add a short 3-step expectations block via `components/public/intake-lane-expectations.tsx`.

#### `/chef/[slug]/inquire`

This page should clearly read as:

- "You are contacting this chef directly"
- "This is the right path for a planning-heavy or chef-specific request"
- "The chef reviews your details and responds directly"

Keep the proof card and structured form. Do not simplify it into the lighter `/book` pattern.

### States

- **Loading:** existing page-level loading behavior remains unchanged
- **Empty:** not applicable for the public form pages
- **Error:** keep current inline form errors and submission errors; do not show fake success copy
- **Populated:** success states must reinforce the correct lane story

### Interactions

- Clicking homepage primary CTA goes to `/book`
- Clicking chef profile CTA goes to `/chef/[slug]/inquire` unless the chef explicitly prefers website-only routing
- Submitting `/book` should return success copy that matches matched-chef fan-out semantics
- Submitting single-chef inquiry should return success copy that names the chef and confirms direct review
- No public flow in this spec should require login or portal creation before the buyer can start

### Public AI Copy Guardrail

If any touched public copy mentions AI, it must stay inside these boundaries:

- admin help
- inbox and follow-up support
- workflow organization
- operations support

It must not imply:

- recipe generation
- menu creativity replacement
- chef substitution

---

## Edge Cases and Error Handling

| Scenario                                                         | Correct Behavior                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/book` produces `matched_count: 0`                              | Success state should explain that no chefs are currently available and optionally route the buyer to browse chefs or contact support. |
| Chef profile uses `preferred_inquiry_destination='website_only'` | Keep the external-website CTA logic intact. Do not force these profiles into ChefFlow inquiry copy.                                   |
| Embed inquiry creates website-origin demand                      | Preserve embed provenance explicitly. Do not let UI or analytics collapse it into generic website traffic.                            |
| Instant book inquiry exists without public-message side effects  | Do not promise the same follow-up behavior as single-chef inquiry until parity is actually built.                                     |
| Builder wants to promise exact response speed                    | Keep wording soft, such as "typically" or "directly", unless a stricter SLA is already verified in code and operations.               |

---

## Verification Steps

1. Open `/` and verify the primary and secondary public paths clearly distinguish matched-chef request versus browse-and-inquire.
2. Open `/book` and verify the hero and expectations block explain matched-chef routing truthfully.
3. Submit `/book` with a valid request and verify the success state says matched chefs will reach out directly.
4. Open a live `/chef/[slug]/inquire` page and verify the page explains this is the direct single-chef planning path.
5. Submit the single-chef inquiry form and verify the success state names the chef and confirms direct review.
6. Inspect the created inquiry records for each touched lane and verify `unknown_fields.submission_source` is set to the canonical lane key.
7. Verify existing special routing still works:
   - `preferred_inquiry_destination='website_only'` profiles stay external
   - embed inquiry still preserves UTM fields
   - instant book still writes `events.booking_source`
8. Search touched public copy and verify there are no public AI claims about recipe generation or chef replacement.

---

## Out of Scope

- source analytics aggregation and dashboard fixes
- instant-book dietary persistence
- Wix event-seeding parity
- kiosk phone-only identity cleanup
- post-event review-loop consolidation
- new DB columns or new enums

---

## Notes for Builder Agent

- Start with the shared lane config and provenance writes before touching copy.
- Keep the change set honest and narrow. This is a routing and truth-alignment slice, not a new marketing redesign.
- Reuse the current proof-heavy single-chef inquiry page. It is already the strongest planning lane in the product.
- Do not modify the already-dirty foundational website research docs in this pass. Use this spec and the companion handoff doc instead.

---

## Spec Validation

1. **What exists today that this touches?**  
   The homepage already exposes `/book` and chef browsing as separate CTAs. [app/(public)/page.tsx:236-258](<app/(public)/page.tsx:236>) The `/book` page already frames a matched-chef request. [app/(public)/book/page.tsx:21-40](<app/(public)/book/page.tsx:21>) The `/book` form already posts to `POST /api/book` and promises matched chefs typically respond. [app/(public)/book/\_components/book-dinner-form.tsx:113-135](<app/(public)/book/_components/book-dinner-form.tsx:113>) [app/(public)/book/\_components/book-dinner-form.tsx:454-459](<app/(public)/book/_components/book-dinner-form.tsx:454>) The single-chef inquiry form already posts through `submitPublicInquiry()`. [components/public/public-inquiry-form.tsx:233-277](components/public/public-inquiry-form.tsx:233) The backend already has distinct write paths for open booking, public inquiry, embed inquiry, kiosk inquiry, Wix, and instant book. [app/api/book/route.ts:107-279](app/api/book/route.ts:107) [lib/inquiries/public-actions.ts:203-368](lib/inquiries/public-actions.ts:203) [app/api/embed/inquiry/route.ts:225-338](app/api/embed/inquiry/route.ts:225) [app/api/kiosk/inquiry/route.ts:90-198](app/api/kiosk/inquiry/route.ts:90) [lib/wix/process.ts:92-199](lib/wix/process.ts:92) [lib/booking/instant-book-actions.ts:144-177](lib/booking/instant-book-actions.ts:144) [lib/booking/instant-book-actions.ts:397-476](lib/booking/instant-book-actions.ts:397)
2. **What exactly changes?**  
   Add one shared lane-config module and one expectations component, then update the touched public surfaces and write paths to use canonical lane ids in `unknown_fields.submission_source`. No DB schema changes. Existing fields such as `utm_medium`, `embed_source`, `open_booking`, and `booking_source` stay intact. [app/api/book/route.ts:223-235](app/api/book/route.ts:223) [lib/inquiries/public-actions.ts:221-240](lib/inquiries/public-actions.ts:221) [app/api/embed/inquiry/route.ts:239-255](app/api/embed/inquiry/route.ts:239) [lib/booking/instant-book-actions.ts:167-177](lib/booking/instant-book-actions.ts:167) [lib/db/migrations/schema.ts:16512-16557](lib/db/migrations/schema.ts:16512)
3. **What assumptions are you making?**  
   Verified: `inquiries.unknown_fields` is already used for route-specific provenance. [app/api/book/route.ts:223-232](app/api/book/route.ts:223) [app/api/embed/inquiry/route.ts:239-250](app/api/embed/inquiry/route.ts:239) [lib/wix/process.ts:148-156](lib/wix/process.ts:148) Verified: `events.booking_source` already exists for instant book. [lib/booking/instant-book-actions.ts:426-476](lib/booking/instant-book-actions.ts:426) [lib/db/migrations/schema.ts:24761-24905](lib/db/migrations/schema.ts:24761) Unverified: the exact final nav label copy the developer prefers. This spec resolves that by requiring semantic distinction, not one mandatory phrase.
4. **Where will this most likely break?**  
   First, provenance can drift if one writer forgets to set the new canonical lane key. The highest-risk files are `app/api/book/route.ts`, `lib/inquiries/public-actions.ts`, and `lib/booking/instant-book-actions.ts` because they all currently write `channel: 'website'` while representing different workflows. [app/api/book/route.ts:205-236](app/api/book/route.ts:205) [lib/inquiries/public-actions.ts:203-241](lib/inquiries/public-actions.ts:203) [lib/booking/instant-book-actions.ts:151-177](lib/booking/instant-book-actions.ts:151) Second, public copy could accidentally overpromise identical follow-up behavior across lanes even though instant book and Wix differ materially from single-chef inquiry. [lib/booking/instant-book-actions.ts:151-177](lib/booking/instant-book-actions.ts:151) [lib/wix/process.ts:151-199](lib/wix/process.ts:151)
5. **What is underspecified?**  
   Without this spec, the builder would have to guess whether `/book` is a marketplace fan-out or a single-chef booking page, what lane names should exist, and where to store them. This spec removes that guesswork by naming the lane ids, listing the exact files to modify, and defining the public-story rules per lane. Supporting evidence: the current public pages are truthful but still generic. [app/(public)/book/page.tsx:31-34](<app/(public)/book/page.tsx:31>) [components/public/public-inquiry-form.tsx:377-381](components/public/public-inquiry-form.tsx:377)
6. **What dependencies or prerequisites exist?**  
   The builder should read the website cross-reference first, then the funnel truth map, then this spec. The verified public proof stack should stay intact while routing copy changes land. [docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:96-128](docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:96) [docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:17-43](docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:17) [docs/specs/featured-chef-public-proof-and-booking.md:1-18](docs/specs/featured-chef-public-proof-and-booking.md:1)
7. **What existing logic could this conflict with?**  
   It could conflict with `preferred_inquiry_destination` behavior on featured-chef cards if the builder tries to force all CTAs through ChefFlow inquiry. [app/(public)/page.tsx:110-120](<app/(public)/page.tsx:110>) It could also conflict with existing embed/Wix provenance markers if the builder replaces them instead of composing with them. [app/api/embed/inquiry/route.ts:239-255](app/api/embed/inquiry/route.ts:239) [lib/wix/process.ts:148-156](lib/wix/process.ts:148)
8. **What is the end-to-end data flow?**  
   Homepage or nav click -> public page (`/book` or `/chef/[slug]/inquire`) -> form submit -> route handler or public action writes client/inquiry/event records -> inquiry carries `channel` plus canonical lane key in `unknown_fields.submission_source` -> website success state reflects the correct lane story. Current flow evidence exists in open booking and public inquiry. [app/(public)/page.tsx:236-258](<app/(public)/page.tsx:236>) [app/(public)/book/\_components/book-dinner-form.tsx:113-135](<app/(public)/book/_components/book-dinner-form.tsx:113>) [components/public/public-inquiry-form.tsx:233-277](components/public/public-inquiry-form.tsx:233) [app/api/book/route.ts:204-279](app/api/book/route.ts:204) [lib/inquiries/public-actions.ts:203-325](lib/inquiries/public-actions.ts:203)
9. **What is the correct implementation order?**  
   First add `lib/public/intake-lane-config.ts`. Second update all touched write paths to set canonical lane keys. Third add the reusable expectations component. Fourth update homepage, nav, `/book`, and single-chef inquiry copy to consume the shared lane config. Fifth run end-to-end verification and inspect created records. This order is required because the UI truth should sit on shared route definitions, not hardcoded strings spread across pages.
10. **What are the exact success criteria?**  
    Success is reached when the public site clearly distinguishes matched-chef request versus direct single-chef inquiry, created records carry canonical lane provenance, and no touched page makes broader AI or workflow promises than the backend supports. Verification evidence lives in the current public surfaces and write paths. [app/(public)/book/page.tsx:31-34](<app/(public)/book/page.tsx:31>) [components/public/public-inquiry-form.tsx:340-343](components/public/public-inquiry-form.tsx:340) [app/api/book/route.ts:223-235](app/api/book/route.ts:223)
11. **What are the non-negotiable constraints?**  
    No destructive schema work. No forced login gate. Preserve tenant scoping and current coarse channel contracts. Keep public AI copy inside the admin and operations boundary, not recipe generation. Existing privacy posture on public forms must remain intact. [lib/db/migrations/schema.ts:16512-16557](lib/db/migrations/schema.ts:16512) [docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md:447-469](docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md:447) [app/(public)/book/\_components/book-dinner-form.tsx:457-458](<app/(public)/book/_components/book-dinner-form.tsx:457>)
12. **What should NOT be touched?**  
    Do not change the verified proof stack, post-event trust-loop code, or instant-book pricing logic in this slice. Do not try to solve instant-book dietary persistence or Wix event seeding here. Those are separate follow-on specs. [docs/specs/post-event-trust-loop-consolidation.md:1-18](docs/specs/post-event-trust-loop-consolidation.md:1) [lib/booking/instant-book-actions.ts:397-476](lib/booking/instant-book-actions.ts:397) [lib/wix/process.ts:151-199](lib/wix/process.ts:151)
13. **Is this the simplest complete version?**  
    Yes. It adds only a shared config, one reusable UI block, targeted copy updates, and provenance writes in existing fields. It does not introduce new tables, new enums, or a wider website redesign.
14. **If implemented exactly as written, what would still be wrong?**  
    The system would still have unresolved parity gaps outside this slice: instant-book dietary persistence, Wix event seeding, kiosk placeholder-email hygiene, and post-event review-loop duplication. Those are real but intentionally left for later specs. [lib/booking/instant-book-actions.ts:151-177](lib/booking/instant-book-actions.ts:151) [lib/wix/process.ts:151-199](lib/wix/process.ts:151) [app/api/kiosk/inquiry/route.ts:90-104](app/api/kiosk/inquiry/route.ts:90) [app/api/scheduled/lifecycle/route.ts:964-1063](app/api/scheduled/lifecycle/route.ts:964)

### Final Check

This spec is ready for builder execution with one minor copy-choice uncertainty only: the exact final public label for the `/book` nav link. That does not affect correctness because the behavioral distinction, touched files, provenance rules, and verification steps are all explicit.
