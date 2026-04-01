# Research: Featured Chef Public Proof and Booking

## Origin Context

The developer asked for a planning and research pass around a new Featured Chefs public feature.

Captured signal:

- The Featured Chefs area on the public landing pages should make it much easier to see a chef's testimonials and reviews.
- Google reviews should be visible and easy to access.
- The Take a Chef chef page and booking flow feel like a chef could get hired "right off the bat," and that level of conversion polish is the benchmark.
- The current featured-chef experience is already doing a good job, but it can be built out much better.
- All direct links should be surfaced properly.
- The experience should be customizable from the chef side to a degree, but every featured chef still needs a strong default presentation.

Interpreted investigation question:

How should ChefFlow upgrade the public featured-chef funnel so homepage cards, chef profiles, and inquiry flow surface reviews, Google/direct links, and chef credibility more effectively without introducing a new testimonial system or a layout builder?

## Summary

ChefFlow already has most of the raw ingredients for a strong public proof funnel. The homepage Featured Chef cards already show hero image, social icons, rating badge, and inquiry CTA (`app/(public)/page.tsx:164-286`). The public chef page already has a unified public review feed, partner showcase, availability signals, and a CTA block (`app/(public)/chef/[slug]/page.tsx:152-175,447-575`). The biggest gaps are packaging and continuity, not missing database primitives.

The main implementation risk is architectural, not visual. Public proof currently comes from `getPublicChefReviewFeed()` merging `client_reviews`, `chef_feedback`, `external_reviews`, and `guest_testimonials` (`lib/reviews/public-actions.ts:83-129,224-269`), while a second tokenized testimonial system exists separately in the `testimonials` table and `/review/[token]` flow (`lib/testimonials/testimonial-actions.ts:211-236`; `app/(public)/review/[token]/page.tsx:1-69`). A builder who confuses those systems will ship the wrong thing.

Take a Chef confirms the product gap clearly: their current chef page layers chef identity, "get to know me better," menu/gallery sections, visible review stats, repeated booking CTA, and then carries chef context into the booking wizard. ChefFlow is closest on the public chef page already. The homepage card and inquiry page are where the trust chain breaks.

## Detailed Findings

### 1. Homepage Featured Chef cards are still shallow relative to the proof already in the system

- The homepage card already has a hero image, availability badge, star-rating badge, name/tagline overlay, service pills, social icons, and a single `Inquire` CTA (`app/(public)/page.tsx:164-286`).
- The card currently has no explicit `See reviews`, `Google reviews`, or direct `Website` action despite review data and public-link controls existing elsewhere in the app (`app/(public)/page.tsx:244-281`; `lib/db/schema/schema.ts:19674-19685`).
- The CTA is currently hardcoded to `/chef/{slug}/inquire` (`app/(public)/page.tsx:275-281`), which means the homepage card does not respect the website visibility / preferred inquiry destination logic that the public chef page already honors (`app/(public)/chef/[slug]/page.tsx:172-174,526-575`).

### 2. The public chef page is already the strongest public surface in the product

- The route fetches both the public chef profile and the unified public review feed (`app/(public)/chef/[slug]/page.tsx:152-163`).
- It already renders public social links in the hero (`app/(public)/chef/[slug]/page.tsx:270-340`).
- It already renders partner showcase, full review section, and availability signals (`app/(public)/chef/[slug]/page.tsx:447-512`).
- It already has multi-path CTA logic that considers website visibility and preferred inquiry routing (`app/(public)/chef/[slug]/page.tsx:172-174,515-575`).
- `ReviewShowcase` already supports a stats header and "View all {n} reviews" expansion, so "all reviews" functionality already exists on the public chef page (`components/public/review-showcase.tsx:66-95,171-208`).

Conclusion: the public chef page is the canonical proof surface today. The research points toward strengthening and exposing it better, not replacing it.

### 3. The inquiry page is where credibility currently drops off

- The inquiry route currently fetches `getPublicChefProfile()` and then renders either a paused-state card or a centered `PublicInquiryForm` inside a `max-w-2xl` shell (`app/(public)/chef/[slug]/inquire/page.tsx:30-90`).
- The route does not fetch public reviews or availability signals today (`app/(public)/chef/[slug]/inquire/page.tsx:30-90`).
- The form itself is robust from a data-capture standpoint, with fields for date, guest count, allergies, budget, notes, and service mode, and it submits to `submitPublicInquiry()` (`components/public/public-inquiry-form.tsx:149-296,386-536`).
- Server-side inquiry behavior is already substantial: rate limiting, chef lookup, marketplace-profile inquiry gate, client creation, inquiry creation, event creation, notifications, and automation hooks (`lib/inquiries/public-actions.ts:57-381`).

Conclusion: the booking flow is operationally mature but visually/contextually thin.

### 4. Public reviews and testimonials are fragmented across two systems

#### Live public proof path

- `getPublicChefReviewFeed()` explicitly merges:
  - consented `client_reviews`
  - public `chef_feedback`
  - `external_reviews`
  - approved `guest_testimonials`
    (`lib/reviews/public-actions.ts:83-129`)
- It computes the merged order and platform stats in `lib/reviews/public-actions.ts:224-269`.
- The public chef page uses that feed directly (`app/(public)/chef/[slug]/page.tsx:160-162,452-462`).
- The `/testimonials` page used by chefs currently runs on `getTestimonials()` from `lib/testimonials/actions.ts`, which reads `guest_testimonials` (`app/(chef)/testimonials/page.tsx:2-4,12,29`; `lib/testimonials/actions.ts:71-104,139-152`).

#### Separate tokenized testimonial path

- There is also a `testimonials` table with request token support (`lib/db/schema/schema.ts:20176-20219`).
- The public no-auth `/review/[token]` route uses `getReviewRequestByToken()` and `submitTestimonialByToken()` from `lib/testimonials/submit-testimonial.ts` (`app/(public)/review/[token]/page.tsx:1-69`; `app/(public)/review/[token]/review-form.tsx:4-150`).
- `ReviewRequestManager` is wired to `lib/testimonials/testimonial-actions.ts`, not to the live `/testimonials` page (`components/testimonials/review-request-manager.tsx:12-42`; `app/(chef)/testimonials/page.tsx:2-4,12,29`).

Conclusion: there are two testimonial/review systems in flight. The featured-chef/public-proof work must stay on the live public aggregator unless the business deliberately chooses to consolidate later.

### 5. Chef-side customization already exists, but it is distributed across three settings surfaces

- My Profile owns direct-link controls including `google_review_url`, `website_url`, `show_website_on_public_profile`, `preferred_inquiry_destination`, and `social_links` (`app/(chef)/settings/my-profile/chef-profile-form.tsx:30-32,46-59,202-208,282-354`).
- Public Profile settings own tagline and visual branding such as primary color and background image, plus partner-showcase visibility (`components/settings/public-profile-settings.tsx:84,119-156,193`).
- Discovery Profile settings own showcase image, highlight text, service types, and whether the chef accepts public inquiries (`components/settings/discovery-profile-settings.tsx:189,219,300-335,416`).

Conclusion: the product already has enough controls for a fixed default layout with data-driven customization. There is no evidence that a new layout-builder layer is required for this phase.

### 6. Client preview is behind the live public profile

- Client preview fetches `getPublicChefProfile()` (`app/(chef)/settings/client-preview/page.tsx:18`).
- The preview renderer imports `PartnerShowcase` and stops after partner showcase and a generic CTA section (`app/(chef)/settings/client-preview/public-profile-preview.tsx:1-18,244-260`).
- It does not fetch or render public review feed or availability signals even though the live public page already does (`app/(public)/chef/[slug]/page.tsx:160-163,452-512`).

Conclusion: if public proof sections change and preview does not, chefs will be editing blind.

### 7. Current schema already supports the required public-proof work

- `chefs` already has `google_review_url`, `website_url`, `show_website_on_public_profile`, `preferred_inquiry_destination`, `social_links`, and `show_availability_signals` (`lib/db/schema/schema.ts:19674-19692`).
- `chef_directory_listings` already has `rating_avg`, `review_count`, and `featured` for homepage/discovery summary use (`lib/db/schema/schema.ts:21842-21864`).
- Review source tables already have the necessary public-display flags or URLs:
  - `chef_feedback.public_display` (`lib/db/schema/schema.ts:1829-1844`)
  - `external_reviews.source_url` (`lib/db/schema/schema.ts:3566-3581`)
  - `guest_testimonials.is_approved` / `is_featured` (`lib/db/schema/schema.ts:10259-10274`)
  - `client_reviews.display_consent` (`lib/db/schema/schema.ts:15247-15268`)

Conclusion: no database migration is necessary for the recommended feature slice.

### 8. External benchmark: Take a Chef's current flow is strong because it preserves trust context all the way into booking

Observed via Playwright on 2026-03-31:

- Chef page URL: `https://www.takeachef.com/en-us/chef/david-ferragamo?utm_source=google&utm_medium=organic-seo&utm_campaign=`
- Booking wizard URL after CTA click: `https://www.takeachef.com/en-us/wizard/chef/63006?card=card_outreach`

Observed patterns:

- Chef identity is immediate: chef name, location, photo, "Get to know me better," and a visible booking CTA.
- The page layers chef intro, menu carousel, gallery, review stats/review carousel, and then repeats the booking CTA lower on the page.
- The booking wizard preserves chef context and adds trust messaging such as "Quotes in 20 min" and "No commitment."

These observations were captured from live page snapshots in Playwright during this session. This is competitor-reference input, not codebase evidence.

## Gaps

1. There is no direct review CTA from the homepage featured card even though the canonical public review section already exists (`app/(public)/page.tsx:244-281`; `components/public/review-showcase.tsx:171-208`).
2. There is no dedicated public Google review CTA even though `google_review_url` already exists and is editable (`lib/db/schema/schema.ts:19674`; `app/(chef)/settings/my-profile/chef-profile-form.tsx:332-339`).
3. The homepage featured card ignores `preferred_inquiry_destination`, creating inconsistency with the public profile (`app/(public)/page.tsx:275-281`; `app/(public)/chef/[slug]/page.tsx:172-174,526-575`).
4. The inquiry page drops chef proof context at the exact point where conversion confidence matters most (`app/(public)/chef/[slug]/inquire/page.tsx:49-90`).
5. Client preview is no longer a trustworthy representation of the live public page (`app/(chef)/settings/client-preview/page.tsx:18`; `app/(chef)/settings/client-preview/public-profile-preview.tsx:244-260`).
6. The split review/testimonial systems create a high risk of implementing against the wrong source (`lib/reviews/public-actions.ts:83-129`; `lib/testimonials/testimonial-actions.ts:211-236`).

## Recommendations

1. Treat the public chef page as the canonical public proof surface and make it easier to reach from the homepage instead of inventing a second full review surface.
2. Add explicit homepage proof links:
   - `See reviews` -> `/chef/{slug}#reviews`
   - `Google reviews` when `google_review_url` exists
   - `Website` when website is public
3. Unify CTA behavior across homepage card and public profile by honoring `show_website_on_public_profile` and `preferred_inquiry_destination`.
4. Upgrade the inquiry route into a context-rich booking page that carries chef identity, review proof, and direct links beside the form.
5. Keep chef customization fixed-layout and data-driven by reusing existing My Profile, Public Profile, and Discovery Profile controls.
6. Explicitly fence builders away from the `testimonials` table for this feature unless the product first chooses a consolidation plan.
