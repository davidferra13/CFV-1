# Spec: Featured Chef Public Proof and Booking Upgrade

> **Status:** verified
> **Priority:** P1
> **Depends on:** `featured-chef-links-and-conversion.md`
> **Estimated complexity:** medium (3-8 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event               | Date                 | Agent/Session      | Commit   |
| ------------------- | -------------------- | ------------------ | -------- |
| Created             | 2026-03-31 20:35 EDT | Planner + Research | 630a6474 |
| Status: ready       | 2026-03-31 20:49 EDT | Planner + Research |          |
| Claimed             |                      |                    |          |
| Spike completed     |                      |                    |          |
| Pre-flight passed   |                      |                    |          |
| Build completed     |                      |                    |          |
| Type check passed   | 2026-04-02 20:51 EDT | Codex              |          |
| Build check passed  | 2026-04-02 20:51 EDT | Codex              |          |
| Playwright verified | 2026-04-02 20:51 EDT | Codex              |          |
| Status: verified    | 2026-04-02 20:51 EDT | Codex              |          |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer wants a brand new feature around the Featured Chefs area on the public landing pages. The current featured chef experience is already doing a good job, but it can be built out much better.

The immediate pain is proof and trust. A visitor should be able to see all of a chef's testimonials and reviews more easily, including Google reviews. The developer explicitly called out the Take a Chef chef page and the "what it looks like when you hire a chef" flow as the benchmark for how convincing this should feel. The goal is a page that makes a chef feel hireable right away, not a page that makes the visitor keep hunting for proof.

The developer also wants all of the chef's direct links surfaced properly. They want the feature to stay customizable from the chef side, but not turn into a freeform layout builder. Every featured chef should still start from a strong default presentation. The developer is intentionally asking for help figuring out the right balance between standardized default layout and limited chef-side customization.

### Developer Intent

- **Core goal:** Turn the featured-chef funnel into a proof-first public hiring experience from homepage card to profile to inquiry.
- **Key constraints:** Reuse the live public review source of truth, surface Google/direct links explicitly, keep the layout standardized, and avoid introducing another competing testimonial system or a freeform page builder.
- **Motivation:** The proof already exists in the product, but it is fragmented. The homepage card is too shallow, the inquiry page is too thin, and the chef preview/customization path is not aligned with the public experience.
- **Success from the developer's perspective:** A visitor can move from a featured chef card to a high-confidence public profile and then to an inquiry flow without losing trust context. Chefs can influence that experience through existing profile/branding/content fields, but every chef still gets the same strong default structure.

### Transcript Capture

- The developer wants a brand new feature around the Featured Chefs tab on the public landing pages.
- The visitor should be able to see all testimonials and reviews more easily, not just fragments.
- Google reviews must be part of that proof story.
- The developer pointed to the Take a Chef chef page and the "what it looks like when you hire a chef" experience as the standard for a page that makes a chef feel instantly hireable.
- Direct links need to be surfaced more clearly.
- The current featured-chef experience is already working, but it is underbuilt relative to the proof and conversion potential already in the product.
- The experience must be customizable from the chef side to a degree, but it must still default every featured chef into a strong standardized layout.
- The developer explicitly asked for spec-only work here, not implementation.
- The developer explicitly asked that the raw conversation and reasoning be preserved in the spec so the builder understands why the feature exists, not just what to build.
- The developer explicitly asked that any missing intent, underdeveloped area, or builder-guessing gap be filled in the spec instead of left ambiguous.

### Execution Translation

#### Requirements

- Homepage featured-chef cards must expose clearer public proof entry points.
- The public chef page must remain the canonical full-proof surface.
- The inquiry page must preserve chef credibility/context instead of detaching the form from the proof story.
- Google review links, public website links, and social links must be surfaced only when allowed by existing public-profile controls.
- Client preview must stay aligned with the live public profile so chefs can preview what they are editing.

#### Constraints

- No new testimonial source of truth for this feature.
- No freeform layout builder.
- No fake or placeholder review stats.
- No schema expansion unless the code proves it is necessary.
- No loss of the developer's reasoning in the permanent spec artifact.

#### Behaviors

- Use the live public review aggregator for all public proof surfaces.
- Deep-link homepage proof actions to the canonical public review section rather than cloning a second full review experience onto the homepage.
- Keep ChefFlow/website routing consistent across homepage card, public chef page, and inquiry page.
- Reuse existing chef-controlled settings as the customization layer.

### Gap Check

The original ask had several intentionally rough edges, and this spec closes them rather than leaving them for a builder to guess:

- "See all testimonials and reviews" is translated into a canonical proof strategy: homepage deep-links plus a strengthened public chef page, not a second disconnected review system.
- "Google reviews" is translated into explicit CTA behavior tied to the existing `google_review_url` field.
- "What it looks like when you hire a chef" is translated into an inquiry-page upgrade that keeps proof/context next to the form.
- "Customizable to a degree" is translated into fixed-layout, data-driven customization using existing settings instead of a new layout-builder feature.
- "Anything else I might be missing" is filled in with preview parity, CTA-rule consistency, and a warning against the wrong testimonial system.

---

## What This Does (Plain English)

This upgrade turns Featured Chefs into a stronger public proof and conversion funnel. On the homepage, featured chef cards expose direct proof actions instead of only a passive card plus inquiry button. On the public chef page, reviews, Google links, website links, and inquiry actions are grouped into a clear proof block and the review section becomes a stable destination from the homepage. On the inquiry page, the chef's credibility stays visible while the visitor fills out the form, so the booking flow feels closer to a polished "hire this chef" experience instead of a detached standalone form.

---

## Why It Matters

The codebase already has public review aggregation, social links, website routing preferences, branding controls, and a public chef page, but those trust signals are not surfaced consistently. This spec closes the gap between "we have proof data" and "a guest can actually use that proof to decide to hire."

---

## Files to Create

| File                                       | Purpose                                                           |
| ------------------------------------------ | ----------------------------------------------------------------- |
| `components/public/chef-proof-summary.tsx` | Reusable public proof block for the chef profile and inquiry page |

---

## Files to Modify

| File                                                            | What to Change                                                                                                                                                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/page.tsx`                                         | Upgrade `FeaturedChefCard` to expose direct proof links (`See reviews`, `Google reviews`, `Website` when allowed) and make the primary CTA respect `preferred_inquiry_destination` instead of always forcing `/inquire` |
| `lib/directory/actions.ts`                                      | Extend `DirectoryChef` and `getDiscoverableChefs()` to include `google_review_url`, `show_website_on_public_profile`, and `preferred_inquiry_destination`                                                               |
| `lib/profile/actions.ts`                                        | Expose `google_review_url` through `getPublicChefProfile()` so the public profile and inquiry page can show direct Google review links                                                                                  |
| `app/(public)/chef/[slug]/page.tsx`                             | Add a reusable proof summary block below the hero, add a stable `#reviews` anchor, and keep CTA/link behavior consistent with website visibility and preferred inquiry destination                                      |
| `app/(public)/chef/[slug]/inquire/page.tsx`                     | Replace the narrow single-column shell with a two-column public booking page that keeps chef proof/context visible while the form is being filled out                                                                   |
| `components/public/public-inquiry-form.tsx`                     | Support the upgraded inquiry shell without changing submission semantics; keep the form logic intact and presentation-friendly inside the new layout                                                                    |
| `components/public/review-showcase.tsx`                         | Add a compact/initial-count configuration so the same review component can support a smaller inquiry-page preview and the full public profile view                                                                      |
| `app/(chef)/settings/client-preview/page.tsx`                   | Fetch the same review and availability data used by the public profile so preview parity is real instead of partial                                                                                                     |
| `app/(chef)/settings/client-preview/public-profile-preview.tsx` | Render the new proof summary block, review section, and availability sections so preview matches the public profile more closely                                                                                        |

---

## Database Changes

None.

This feature reuses existing columns and tables:

- `chefs.google_review_url`, `chefs.website_url`, `chefs.show_website_on_public_profile`, `chefs.preferred_inquiry_destination`, `chefs.social_links`, `chefs.show_availability_signals` (`lib/db/schema/schema.ts:19674-19692`)
- `chef_directory_listings.rating_avg`, `chef_directory_listings.review_count`, `chef_directory_listings.featured` (`lib/db/schema/schema.ts:21842-21864`)
- Public review sources:
  - `client_reviews.display_consent` (`lib/db/schema/schema.ts:15247-15268`)
  - `chef_feedback.public_display` (`lib/db/schema/schema.ts:1829-1844`)
  - `external_reviews.source_url` and review payload fields (`lib/db/schema/schema.ts:3566-3581`)
  - `guest_testimonials.is_approved` / `is_featured` (`lib/db/schema/schema.ts:10259-10274`)

Do not add or migrate review tables for this feature.

---

## Data Model

### Public proof source of truth

The canonical public proof feed is `getPublicChefReviewFeed(tenantId)`, which already merges four sources into one public-facing feed:

1. `client_reviews` where `display_consent = true`
2. `chef_feedback` where `public_display = true`
3. `external_reviews`
4. `guest_testimonials` where `is_approved = true`

That behavior is explicitly implemented in `lib/reviews/public-actions.ts:83-129` and the merged stats payload is produced in `lib/reviews/public-actions.ts:224-269`.

### Important existing entities

- **`chefs`**
  - Holds direct public-link controls and branding: `google_review_url`, `website_url`, `show_website_on_public_profile`, `preferred_inquiry_destination`, `portal_*`, `social_links`, `show_availability_signals` (`lib/db/schema/schema.ts:19674-19692`)
- **`chef_directory_listings`**
  - Holds public directory snapshots used for homepage/discovery summaries, including `rating_avg` and `review_count` (`lib/db/schema/schema.ts:21842-21864`)
- **`client_reviews`**
  - Authored client reviews that only become public with `display_consent` (`lib/db/schema/schema.ts:15252-15257`)
- **`chef_feedback`**
  - Chef-logged feedback that only becomes public with `public_display` (`lib/db/schema/schema.ts:1834-1843`)
- **`external_reviews`**
  - Imported external platform reviews, including provider and `source_url` (`lib/db/schema/schema.ts:3569-3577`)
- **`guest_testimonials`**
  - Approved guest testimonials currently used by the live public review feed (`lib/db/schema/schema.ts:10264-10273`)

### Explicit non-goal: testimonial-system consolidation

There is a second `testimonials` table with tokenized request flow (`lib/db/schema/schema.ts:20176-20219`), but the live public chef page does not read from that table today. It reads the unified public review feed from `lib/reviews/public-actions.ts:83-129`. This spec does not attempt to consolidate or replace those systems. The builder must keep the live public proof surfaces wired to `getPublicChefReviewFeed()`.

---

## Server Actions

| Action                                                    | Auth                             | Input                    | Output                                                                                                        | Side Effects                                                                                   |
| --------------------------------------------------------- | -------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `getDiscoverableChefs()` (modified)                       | none (public read)               | none                     | `DirectoryChef[]` plus `google_review_url`, `show_website_on_public_profile`, `preferred_inquiry_destination` | none                                                                                           |
| `getPublicChefProfile(slug)` (modified)                   | none (public read)               | `slug: string`           | Existing public profile shape plus `chef.google_review_url`                                                   | none                                                                                           |
| `getPublicChefReviewFeed(tenantId)` (reused)              | none (public read, admin client) | `tenantId: string`       | `{ reviews, stats }` merged from live public sources                                                          | none                                                                                           |
| `getPublicAvailabilitySignals(tenantId)` (reused)         | none (public read)               | `tenantId: string`       | public availability rows                                                                                      | none                                                                                           |
| `submitPublicInquiry(input)` (reused, unchanged behavior) | none                             | existing inquiry payload | `{ success, inquiryCreated, eventCreated }`                                                                   | creates client, inquiry, draft event, notifications (`lib/inquiries/public-actions.ts:57-381`) |

### No new write paths

This feature is presentation and routing work. It does not introduce any new public write action. The inquiry submission path remains `submitPublicInquiry()` and the current create-client/create-inquiry/create-event flow remains untouched (`lib/inquiries/public-actions.ts:183-381`).

---

## UI / Component Spec

### Page Layout

#### A. Homepage Featured Chef card

Keep the current card structure (hero image, status badge, star badge, service pills, social icons, coverage, CTA) from `app/(public)/page.tsx:164-286`, but add an explicit proof/action row so the card is not only a passive teaser.

Required behavior:

- Keep the existing social icon row.
- Add a compact direct-link row below social icons / above coverage.
- `See reviews`
  - Show only when the card has visible review proof (`avg_rating` and `review_count > 0` already drive the star badge at `app/(public)/page.tsx:171-172,210-218`)
  - Link to `/chef/{slug}#reviews`
- `Google reviews`
  - Show only when `chef.google_review_url` is present
  - Open in a new tab
- `Website`
  - Show only when `chef.website_url` exists and `chef.show_website_on_public_profile === true`
  - Open in a new tab

Primary CTA rules on the card must match the logic already used on the public chef page:

- If `preferred_inquiry_destination === 'website_only'` and website is visible, the primary CTA becomes `Visit website`
- If `preferred_inquiry_destination === 'chefflow_only'`, the primary CTA stays `Start inquiry`
- If `preferred_inquiry_destination === 'both'`, keep `Start inquiry` as the primary CTA and leave `Website` as a secondary direct link when allowed
- If website preference points outward but the website link is missing or hidden, fall back to the internal inquiry route instead of dead-ending the card

#### B. Public chef profile

Keep the current hero, partner showcase, review section, availability section, and CTA block from `app/(public)/chef/[slug]/page.tsx:152-175,447-565`, but add a proof summary block directly below the hero and above the review/partner sections.

`ChefProofSummary` should contain:

- Overall rating and total review count from `reviewFeed.stats`
- Platform/source chips from `reviewFeed.stats.platformBreakdown`
- CTA row:
  - `Read all reviews` -> in-page anchor to `#reviews`
  - `Google reviews` -> `chef.google_review_url` when present
  - `Visit website` -> only when `chef.website_url` exists and `chef.show_website_on_public_profile === true`
  - `Start inquiry` -> only when inquiries are open and the preferred-destination rules allow ChefFlow

Implementation details:

- Add `id="reviews"` to the review section wrapper or review heading block so homepage deep links land on the canonical review feed.
- Keep the existing `ReviewShowcase` as the section renderer for the full feed.
- Do not replace the existing social icon row in the hero. The proof block complements it; it does not absorb it.

#### C. Inquiry page

The current inquiry page is a thin shell around `PublicInquiryForm` with `max-w-2xl` single-column layout (`app/(public)/chef/[slug]/inquire/page.tsx:49-90`). Replace it with a public booking experience that preserves chef context while the guest fills out the form.

Required layout:

- Desktop: two-column shell, `max-w-6xl`
  - Left column: existing `PublicInquiryForm`
  - Right column: sticky proof/context card
- Mobile: context card stacks above the form

The right-side context card must show:

- Chef name, image/logo, tagline/highlight
- Overall rating and total reviews from `getPublicChefReviewFeed()`
- Up to 2 review excerpts using a compact `ReviewShowcase` mode or a narrow excerpt variant backed by the same review feed
- Direct links:
  - Back to profile
  - Google reviews when present
  - Website when allowed
  - Social icons when present
- Availability context:
  - If `show_availability_signals` is enabled and signals exist, show the next 1-3 dates or the next available date summary

Important boundary:

- The form submission behavior does not change. The presentation changes, not the `submitPublicInquiry()` contract.

#### D. Client preview parity

The client preview currently fetches `getPublicChefProfile()` but renders a reduced inline version that stops at partner showcase and CTA (`app/(chef)/settings/client-preview/page.tsx:18`; `app/(chef)/settings/client-preview/public-profile-preview.tsx:244-260`). Update it so chefs can preview the same proof block, reviews section, and availability visibility that the public page now shows.

### States

- **Loading:** Server-rendered pages should use the existing route loading behavior. No fake review stats or placeholder trust numbers.
- **Empty reviews:** Hide `See reviews`, hide the proof stats header, and omit the full review section. If `google_review_url` exists, keep the Google button because that link is still valid proof.
- **No Google review URL:** Do not render a dedicated Google CTA. Individual review cards can still expose `sourceUrl` links when present.
- **No website or hidden website:** Do not render the website CTA anywhere public if `show_website_on_public_profile` is false.
- **Inquiries paused:** Keep the current paused state on the inquiry route, but do not show a dead internal CTA on homepage or public page. Fall back to allowed direct links only.
- **Preview with no reviews or dates:** Match the live hiding rules exactly. Do not invent placeholder reviews just to fill the preview.

### Interactions

- Clicking `See reviews` from a featured chef card deep-links to `/chef/{slug}#reviews`
- Clicking `Google reviews` or `Website` opens a new tab
- Clicking `View all {n} reviews` on the public profile keeps the current `ReviewShowcase` expansion behavior
- Clicking `Start inquiry` goes to `/chef/{slug}/inquire`
- The inquiry page keeps the existing validation and submit flow from `components/public/public-inquiry-form.tsx:149-296`
- No optimistic updates are introduced by this feature

### Default vs Customizable

This feature is intentionally **fixed-layout, data-customized**.

Chefs can already influence the public experience through existing settings:

- `google_review_url`, `website_url`, `show_website_on_public_profile`, `preferred_inquiry_destination`, and `social_links` in My Profile (`app/(chef)/settings/my-profile/chef-profile-form.tsx:30-32,46-59,202-208,282-354`)
- `tagline`, `portal_primary_color`, `portal_background_image_url`, and partner-showcase visibility in Public Profile settings (`components/settings/public-profile-settings.tsx:119-156,193`)
- `showcase image`, `highlight text`, `service types`, and `accepting inquiries` in Discovery Profile settings (`components/settings/discovery-profile-settings.tsx:300-335,416`)

Chefs do **not** get a layout builder in this spec. They cannot reorder sections, choose a different homepage card structure, or choose a per-chef proof-module layout.

---

## Edge Cases and Error Handling

| Scenario                                                                     | Correct Behavior                                                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `google_review_url` exists but `reviewFeed.reviews.length === 0`             | Show the Google reviews button, hide review stats and `See reviews` links            |
| Reviews exist but `google_review_url` is null                                | Keep review proof and full review section; omit the dedicated Google CTA             |
| `website_url` exists but `show_website_on_public_profile = false`            | Hide website CTA on homepage, public profile, and inquiry page                       |
| `preferred_inquiry_destination = website_only` but website is hidden or null | Fall back to internal inquiry CTA rather than rendering no path forward              |
| Inquiry route has reviews but no availability signals                        | Show proof/review context without the date block                                     |
| Builder accidentally uses `testimonials` table for public proof              | Reject as incorrect. Live public proof must keep using `getPublicChefReviewFeed()`   |
| Featured card has no reviews, no Google URL, and no website                  | Card still renders existing hero/social/inquiry structure without fake proof buttons |

---

## Verification Steps

1. Use an existing chef account with `google_review_url`, social links, and a public slug set in My Profile.
2. Visit `/` and verify the Featured Chef card exposes:
   - `See reviews` only when review proof exists
   - `Google reviews` only when `google_review_url` exists
   - `Website` only when website is visible publicly
3. Change `preferred_inquiry_destination` across `both`, `website_only`, and `chefflow_only`; verify the homepage card primary CTA follows the same rule set as the public profile.
4. Click `See reviews` from the homepage and verify it lands on `/chef/{slug}#reviews`.
5. On `/chef/{slug}`, verify the proof summary block shows rating/count/source chips and direct links above the rest of the page.
6. Verify the review section still uses the unified public feed and `View all {n} reviews` expands the full list.
7. Click `Google reviews` and verify it opens a new tab.
8. Click `Start inquiry` and verify `/chef/{slug}/inquire` shows the new two-column context + form layout on desktop and stacked layout on mobile.
9. Submit a test inquiry and verify the form still succeeds without any server-action regressions.
10. Visit `/settings/client-preview` and verify the preview now includes the proof summary block, review section, and availability visibility matching the live public page.
11. Run type check and build.
12. Capture screenshots for homepage card, public profile, inquiry page, and preview parity.

---

## Out of Scope

- Consolidating `guest_testimonials` and `testimonials`
- Adding new review ingestion/sync logic
- Creating a chef-side drag-and-drop layout builder
- Adding public menu builders, portfolio galleries, or commerce flows to match Take a Chef one-for-one
- Changing directory sorting, marketplace approval logic, or review moderation flows
- Rewriting `submitPublicInquiry()` business logic

---

## Notes for Builder Agent

1. The public proof source of truth is `getPublicChefReviewFeed()`, not `getPublicTestimonials()`. The code proving that is `app/(public)/chef/[slug]/page.tsx:160-162,452-462` and `lib/reviews/public-actions.ts:83-129`.
2. Do not put full review payloads on the homepage card. The simplest complete version is to link the card to the canonical review section on the public chef page. This avoids duplicating the entire review feed into the homepage payload and keeps one canonical "all reviews" surface.
3. Mirror the public-profile CTA rules on the homepage card instead of inventing a second set of rules. The public page already computes `hasWebsiteLink`, `preferWebsite`, and `preferChefFlow` at `app/(public)/chef/[slug]/page.tsx:172-174` and uses them in the CTA block at `app/(public)/chef/[slug]/page.tsx:526-575`.
4. Client preview is currently behind the live page. If you only change the live route, chefs will not be able to preview what they are editing. The current mismatch is visible in `app/(chef)/settings/client-preview/page.tsx:18` and `app/(chef)/settings/client-preview/public-profile-preview.tsx:244-260`.
5. `ReviewShowcase` already has the right full-profile behavior, including the stats header and "View all" expansion (`components/public/review-showcase.tsx:66-95,171-208`). Extend it; do not fork a second review component unless you need a very small compact variant.
6. The inquiry flow is presentation-sensitive but behavior-sensitive server-side. Keep `submitPublicInquiry()` intact unless the layout change forces small prop changes. Its current data path creates client, inquiry, event, notifications, and automation hooks (`lib/inquiries/public-actions.ts:183-381`).

---

## Spec Validation (Planner Gate Evidence)

### 1. What exists today that this touches?

- Homepage Featured Chef cards already exist in `app/(public)/page.tsx:164-286`, and the section itself is rendered in `app/(public)/page.tsx:402-430`.
- The public chef page already fetches `getPublicChefReviewFeed()` and `getPublicAvailabilitySignals()` in `app/(public)/chef/[slug]/page.tsx:152-163`, renders social links in `app/(public)/chef/[slug]/page.tsx:270-340`, renders the review section in `app/(public)/chef/[slug]/page.tsx:452-462`, renders availability in `app/(public)/chef/[slug]/page.tsx:467-512`, and renders the current CTA block in `app/(public)/chef/[slug]/page.tsx:515-575`.
- The public inquiry route is currently a single-column wrapper around `PublicInquiryForm` in `app/(public)/chef/[slug]/inquire/page.tsx:49-90`.
- The public inquiry form already has the full data-entry and submission flow in `components/public/public-inquiry-form.tsx:149-296,386-536` and posts to `submitPublicInquiry()` via `lib/inquiries/public-actions.ts:57-381`.
- The public review component already renders review stats and the full expansion behavior in `components/public/review-showcase.tsx:66-95,171-208`.
- `getDiscoverableChefs()` is the data source for homepage/discovery cards and currently returns `website_url` and `social_links`, but not `google_review_url`, `show_website_on_public_profile`, or `preferred_inquiry_destination` (`lib/directory/actions.ts:42-64,80-102,245-258`).
- `getPublicChefProfile()` already returns `show_website_on_public_profile`, `preferred_inquiry_destination`, branding, availability flags, and `social_links`, but not `google_review_url` (`lib/profile/actions.ts:102-127,247-268`).
- The unified public review feed already merges `client_reviews`, `chef_feedback`, `external_reviews`, and `guest_testimonials` in `lib/reviews/public-actions.ts:83-129,224-269`.
- The client preview currently fetches only `getPublicChefProfile()` (`app/(chef)/settings/client-preview/page.tsx:18`) and the preview component stops after partner showcase and CTA (`app/(chef)/settings/client-preview/public-profile-preview.tsx:244-260`).
- Relevant schema already exists in:
  - `chefs` (`lib/db/schema/schema.ts:19674-19692`)
  - `chef_directory_listings` (`lib/db/schema/schema.ts:21842-21864`)
  - `client_reviews` (`lib/db/schema/schema.ts:15247-15268`)
  - `chef_feedback` (`lib/db/schema/schema.ts:1829-1844`)
  - `external_reviews` (`lib/db/schema/schema.ts:3566-3581`)
  - `guest_testimonials` (`lib/db/schema/schema.ts:10259-10274`)
  - dormant `testimonials` (`lib/db/schema/schema.ts:20176-20219`)

### 2. What exactly changes?

- `lib/directory/actions.ts`
  - Add `google_review_url`, `show_website_on_public_profile`, and `preferred_inquiry_destination` to the `DirectoryChef` type and select/mapping path so homepage cards can honor the same direct-link and CTA rules as the public profile (`lib/directory/actions.ts:42-64,86-101,245-253`).
- `app/(public)/page.tsx`
  - Modify `FeaturedChefCard` so it exposes `See reviews`, `Google reviews`, `Website`, and correct CTA routing instead of the current unconditional `/inquire` button (`app/(public)/page.tsx:173-175,244-281`).
- `lib/profile/actions.ts`
  - Add `google_review_url` to the `getPublicChefProfile()` select/return shape so public profile and inquiry can surface a direct Google CTA alongside existing website/social data (`lib/profile/actions.ts:109-127,247-268`).
- `app/(public)/chef/[slug]/page.tsx`
  - Insert a reusable proof summary block between the hero and the lower sections and add a stable `#reviews` anchor around the review block (`app/(public)/chef/[slug]/page.tsx:152-175,452-462,515-575`).
- `app/(public)/chef/[slug]/inquire/page.tsx`
  - Replace the `max-w-2xl` single-column wrapper with a two-column public booking shell and fetch the same public proof data already available elsewhere (`app/(public)/chef/[slug]/inquire/page.tsx:49-90`).
- `components/public/review-showcase.tsx`
  - Add a smaller initial count / compact mode for inquiry-page review excerpts while keeping the full profile behavior intact (`components/public/review-showcase.tsx:171-208`).
- `app/(chef)/settings/client-preview/page.tsx` and `app/(chef)/settings/client-preview/public-profile-preview.tsx`
  - Fetch and render review/availability parity so preview is no longer missing live-only sections (`app/(chef)/settings/client-preview/page.tsx:18`; `app/(chef)/settings/client-preview/public-profile-preview.tsx:244-260`).
- No DB migrations and no review write-path changes.

### 3. What assumptions are you making?

| Assumption                                                                                        | Verified or Unverified                                               | Evidence                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The live public proof source is the unified review aggregator, not the newer `testimonials` table | Verified                                                             | `app/(public)/chef/[slug]/page.tsx:160-162,452-462`; `lib/reviews/public-actions.ts:83-129`; separate `testimonials` table exists at `lib/db/schema/schema.ts:20176-20219`                                                                       |
| The homepage card currently ignores `preferred_inquiry_destination` and public website visibility | Verified                                                             | Card always renders `/chef/{slug}/inquire` at `app/(public)/page.tsx:275-281`; profile page already respects `hasWebsiteLink`, `preferWebsite`, and `preferChefFlow` at `app/(public)/chef/[slug]/page.tsx:172-174,526-575`                      |
| Existing chef-side customization fields are sufficient for v1 and no new settings are required    | Verified for code availability, product choice resolved in this spec | Existing inputs exist in `app/(chef)/settings/my-profile/chef-profile-form.tsx:30-32,46-59,202-208,282-354`, `components/settings/public-profile-settings.tsx:119-156,193`, and `components/settings/discovery-profile-settings.tsx:300-335,416` |
| Some featured chefs may not have `google_review_url` populated in production                      | Unverified data distribution, safe fallback specified                | Field exists in schema at `lib/db/schema/schema.ts:19674`; current save UI exists at `app/(chef)/settings/my-profile/chef-profile-form.tsx:46,202,332-339`; spec hides the button when null                                                      |

### 4. Where will this most likely break?

1. Homepage CTA logic will diverge from the public profile if the builder does not add `show_website_on_public_profile` and `preferred_inquiry_destination` to `DirectoryChef`. The homepage card currently lacks those fields and hardcodes `/inquire` (`lib/directory/actions.ts:42-64,86-101`; `app/(public)/page.tsx:275-281`).
2. A builder could accidentally wire the feature to the wrong testimonial system because both `guest_testimonials` and `testimonials` exist. The live public page uses `getPublicChefReviewFeed()` with `guest_testimonials`, not `getPublicTestimonials()` from the newer flow (`lib/reviews/public-actions.ts:83-129`; `lib/testimonials/testimonial-actions.ts:211-236`; `app/(chef)/testimonials/page.tsx:2-4,12,29`).
3. Preview will stay misleading if only the live route changes. The preview page currently fetches only `getPublicChefProfile()` and the preview component omits reviews and availability (`app/(chef)/settings/client-preview/page.tsx:18`; `app/(chef)/settings/client-preview/public-profile-preview.tsx:244-260`).

### 5. What is underspecified?

- The exact homepage direct-link row copy is now specified as `See reviews`, `Google reviews`, and `Website`, with clear rendering conditions tied to existing fields (`app/(public)/page.tsx:171-175,244-281`; `lib/db/schema/schema.ts:19674-19685`).
- The inquiry upgrade now explicitly uses a two-column layout with a sticky proof/context card instead of vague "make it feel more like Take a Chef." The current thin shell being replaced is `app/(public)/chef/[slug]/inquire/page.tsx:49-90`.
- The source-of-truth ambiguity is eliminated: public proof must read from `getPublicChefReviewFeed()` (`lib/reviews/public-actions.ts:83-129`) and not from `getPublicTestimonials()` (`lib/testimonials/testimonial-actions.ts:211-236`).

### 6. What dependencies or prerequisites exist?

- This work depends on the earlier links/conversion foundation already shipped in `docs/specs/featured-chef-links-and-conversion.md:14-20`.
- No migrations are required because all needed columns already exist in `chefs` and `chef_directory_listings` (`lib/db/schema/schema.ts:19674-19692,21842-21864`).
- Public proof rendering depends on the existing unified review feed and current review moderation/public-display flags (`lib/reviews/public-actions.ts:83-129`; `lib/db/schema/schema.ts:1829-1844,10259-10274,15247-15268,3566-3581`).

### 7. What existing logic could this conflict with?

- Homepage CTA behavior currently conflicts with the public-profile CTA rules because the public page already honors website visibility and preferred destination while the card does not (`app/(public)/page.tsx:275-281`; `app/(public)/chef/[slug]/page.tsx:172-174,526-575`).
- Public proof can conflict with the dormant tokenized testimonial flow if the builder uses `lib/testimonials/testimonial-actions.ts` instead of the live unified review feed (`lib/testimonials/testimonial-actions.ts:211-236`; `lib/reviews/public-actions.ts:83-129`).
- Client preview will conflict with live behavior unless it fetches review and availability data in addition to `getPublicChefProfile()` (`app/(chef)/settings/client-preview/page.tsx:18`; `app/(chef)/settings/client-preview/public-profile-preview.tsx:244-260`).

### 8. What is the end-to-end data flow?

**Homepage proof path**

1. Visitor lands on `/`
2. `getDiscoverableChefs()` returns card data (`lib/directory/actions.ts:80-102,245-258`)
3. Featured chef card renders direct proof/actions (`app/(public)/page.tsx:164-286`)
4. Visitor clicks:
   - `See reviews` -> `/chef/{slug}#reviews`
   - `Google reviews` -> external URL
   - `Start inquiry` / `Visit website` -> correct destination based on preference rules

**Public profile proof path**

1. Public route fetches `getPublicChefProfile(slug)` and `getPublicChefReviewFeed(chef.id)` in `app/(public)/chef/[slug]/page.tsx:152-163`
2. `getPublicChefReviewFeed()` queries four review tables and merges/sorts/stats them in `lib/reviews/public-actions.ts:92-129,224-269`
3. Public profile renders proof summary + `ReviewShowcase`
4. Visitor can expand full review list through existing `View all {n} reviews` behavior in `components/public/review-showcase.tsx:184-205`

**Inquiry path**

1. Visitor goes to `/chef/{slug}/inquire`
2. Inquiry route fetches public profile and proof data
3. Page renders context + form
4. Form submits through `submitPublicInquiry()` (`components/public/public-inquiry-form.tsx:251-268`; `lib/inquiries/public-actions.ts:57-381`)
5. Server action creates client, inquiry, and draft event (`lib/inquiries/public-actions.ts:183-325`)

### 9. What is the correct implementation order?

1. Extend public read shapes first:
   - `lib/directory/actions.ts`
   - `lib/profile/actions.ts`
2. Build the reusable proof-summary component
3. Upgrade the public chef page and add the `#reviews` anchor
4. Upgrade the inquiry page shell and compact review rendering
5. Update the homepage card to use the now-available direct-link and CTA fields
6. Bring client preview into parity last so it mirrors the final public behavior
7. Run type check, build, and manual public-route verification

### 10. What are the exact success criteria?

1. Featured chef cards expose `See reviews` when review proof exists.
2. Featured chef cards expose `Google reviews` when `google_review_url` exists.
3. Featured chef cards respect `preferred_inquiry_destination` and `show_website_on_public_profile`.
4. `See reviews` deep-links to the canonical review section on `/chef/{slug}#reviews`.
5. The public chef profile shows a proof summary block above the lower sections.
6. The public review section still renders from `getPublicChefReviewFeed()` and still supports "View all" expansion.
7. The inquiry page shows chef proof/context next to the form on desktop and above it on mobile.
8. Inquiry submission still works with no server-action regressions.
9. Client preview shows the same review and availability sections as the live public page.
10. No new migrations, no new review tables, and no use of the dormant `testimonials` path for this feature.

### 11. What are the non-negotiable constraints?

- Public website visibility must be respected everywhere: if `show_website_on_public_profile` is false, do not expose the website link (`lib/db/schema/schema.ts:19683-19685`; `app/(public)/chef/[slug]/page.tsx:172,551-565`).
- Preferred inquiry routing must stay consistent across homepage and public profile (`app/(public)/chef/[slug]/page.tsx:172-174,526-575`).
- Public proof must keep tenant scoping and public-display boundaries already enforced by the aggregator queries (`lib/reviews/public-actions.ts:94-127`).
- No fake zeros or placeholder review data. `ReviewShowcase` currently returns `null` when there are no reviews (`components/public/review-showcase.tsx:67,182`).
- Do not alter inquiry submission behavior beyond layout integration (`lib/inquiries/public-actions.ts:57-381`).

### 12. What should NOT be touched?

- Do not modify review ingestion/sync logic in `lib/reviews/external-actions.ts` or the `/reviews` dashboard beyond what is already exposed publicly.
- Do not rewrite `submitPublicInquiry()` business logic in `lib/inquiries/public-actions.ts:57-381`.
- Do not change directory sort/completeness behavior in `lib/directory/actions.ts:254-258` or related discovery utilities unless a bug blocks this feature.
- Do not repurpose `lib/testimonials/testimonial-actions.ts` or the `testimonials` table for this feature.
- Do not add a new layout-builder UI to settings pages.

### 13. Is this the simplest complete version?

Yes.

It deliberately avoids:

- a homepage review modal
- a new review-summary table
- testimonial-system consolidation
- a chef-side page builder
- a full Take a Chef clone with public menus/gallery commerce

The simplest complete version is: expose proof links on the homepage, strengthen the canonical public profile, and carry that proof into the inquiry page.

### 14. If implemented exactly as written, what would still be wrong?

1. The homepage still will not show the entire review feed inline. Users will click through to the canonical public profile for full reviews. This is intentional to keep homepage payload and complexity under control.
2. The inquiry experience will feel substantially stronger, but it still will not match Take a Chef's menu/gallery depth because the touched public surfaces do not currently have a structured menu showcase to reuse.
3. Chefs still cannot rearrange sections or choose alternate layouts. The spec intentionally keeps customization at the data/branding level, not the layout level.

---

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

Production-ready for a builder.

The only unverified item is real production fill rate for `google_review_url`, which affects how often the Google CTA appears but does not affect correctness because the fallback is to hide the button when the field is null (`lib/db/schema/schema.ts:19674`; `app/(chef)/settings/my-profile/chef-profile-form.tsx:46,202,332-339`).

> If uncertain: where specifically, and what would resolve it?

No correctness-blocking uncertainty remains. The open product tradeoff is intentional, not accidental: this spec chooses deep-linking to the canonical review section instead of building a homepage review modal. If the developer later wants in-place homepage review browsing, that should be a separate follow-up spec.
