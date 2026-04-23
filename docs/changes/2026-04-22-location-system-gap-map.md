# Location System Gap Map (Pre-Change)

Date: 2026-04-22
Scope: `C:\Users\david\Documents\CFv1`

## Verified Reuse Already In Place

1. The database already has an additive normalized location layer. `partner_locations` now carries structured public metadata (`experience_tags`, `best_for`, `service_types`) and `chef_location_links` exists for chef-specific public relationship, visibility, feature, and sort metadata. See [database/migrations/20260422000020_location_experience_layer.sql](/C:/Users/david/Documents/CFv1/database/migrations/20260422000020_location_experience_layer.sql:5) and [lib/db/schema/schema.ts](/C:/Users/david/Documents/CFv1/lib/db/schema/schema.ts:1886).

2. Canonical location taxonomy and public read-model types already exist in one place. The option sets, labels, relationship types, and `PublicChefLocationExperience` type are centralized in [lib/partners/location-experiences.ts](/C:/Users/david/Documents/CFv1/lib/partners/location-experiences.ts:1).

3. The public chef profile already builds a normalized `locationExperiences` collection from showcase partners plus `chef_location_links`, then returns it from `getPublicChefProfile()`. See [lib/profile/actions.ts](/C:/Users/david/Documents/CFv1/lib/profile/actions.ts:61) and [lib/profile/actions.ts](/C:/Users/david/Documents/CFv1/lib/profile/actions.ts:235).

4. The chef public profile already renders location cards through a shared component. See [app/(public)/chef/[slug]/page.tsx](/C:/Users/david/Documents/CFv1/app/(public)/chef/[slug]/page.tsx:461) and [components/public/location-experience-showcase.tsx](/C:/Users/david/Documents/CFv1/components/public/location-experience-showcase.tsx:37).

5. Public inquiry already propagates location selection into inquiry creation and draft-event creation. The inquiry page resolves `searchParams.loc`, the form submits `referral_partner_id` and `partner_location_id`, and the public action writes both onto the inquiry and auto-created draft event. See [app/(public)/chef/[slug]/inquire/page.tsx](/C:/Users/david/Documents/CFv1/app/(public)/chef/[slug]/inquire/page.tsx:82), [components/public/public-inquiry-form.tsx](/C:/Users/david/Documents/CFv1/components/public/public-inquiry-form.tsx:339), and [lib/inquiries/public-actions.ts](/C:/Users/david/Documents/CFv1/lib/inquiries/public-actions.ts:323).

6. Downstream event creation paths already preserve partner/location foreign keys beyond the public inquiry path. Manual inquiry conversion copies `referral_partner_id` and `partner_location_id` into events, and recurring-series materialization does the same. See [lib/inquiries/actions.ts](/C:/Users/david/Documents/CFv1/lib/inquiries/actions.ts:1675) and [lib/booking/series-materialization.ts](/C:/Users/david/Documents/CFv1/lib/booking/series-materialization.ts:219).

7. Discovery already ingests partner-location text into search and location resolution. The search haystack includes partner/location names, addresses, descriptions, and structured tags, and location filtering geocodes partner-location coverage points. See [lib/directory/utils.ts](/C:/Users/david/Documents/CFv1/lib/directory/utils.ts:169) and [lib/directory/location-search.ts](/C:/Users/david/Documents/CFv1/lib/directory/location-search.ts:19).

## Gaps

1. Public location navigation still ends at a booking redirect, not a public location detail surface. Location cards generate `/chef/${profileSlug}/locations/${location.id}/book`, and the existing route only validates/logs/redirects. There is no public detail page in the current implementation path. See [components/public/location-experience-showcase.tsx](/C:/Users/david/Documents/CFv1/components/public/location-experience-showcase.tsx:72) and [app/(public)/chef/[slug]/locations/[locationId]/book/route.ts](/C:/Users/david/Documents/CFv1/app/(public)/chef/[slug]/locations/[locationId]/book/route.ts:28).

2. Public location read models are duplicated instead of shared. `getPublicChefProfile()` has a private `buildPublicLocationExperiences()` mapper, `getShowcasePartners()` separately fetches and shapes showcase partner/location data, and `getDiscoverableChefs()` maps `partner_locations` into a different directory type. This creates three public-facing slices over the same entities. See [lib/profile/actions.ts](/C:/Users/david/Documents/CFv1/lib/profile/actions.ts:61), [lib/partners/actions.ts](/C:/Users/david/Documents/CFv1/lib/partners/actions.ts:1309), and [lib/directory/actions.ts](/C:/Users/david/Documents/CFv1/lib/directory/actions.ts:24).

3. Discovery is still chef-first rather than location-forward. Current filters only expose cuisine, service type, dietary, price, partner type, and accepting status, while sort modes remain `featured`, `availability`, `partners`, and `alpha`. The card UI reduces locations to coverage text and a `Cooks at ...` sentence instead of a location preview model or location CTA. See [app/(public)/chefs/_components/directory-filters-form.tsx](/C:/Users/david/Documents/CFv1/app/(public)/chefs/_components/directory-filters-form.tsx:340), [lib/directory/utils.ts](/C:/Users/david/Documents/CFv1/lib/directory/utils.ts:306), and [app/(public)/chefs/page.tsx](/C:/Users/david/Documents/CFv1/app/(public)/chefs/page.tsx:113).

4. Attribution is only partially closed. The system records a booking-link click, public inquiry submission, and inquiry-to-draft-event conversion with `referral_partner_id` and `partner_location_id`, but revenue attribution collapses back to generic source provenance labels rather than partner/location, and finance/reporting pages do not surface location attribution. See [app/(public)/chef/[slug]/locations/[locationId]/book/route.ts](/C:/Users/david/Documents/CFv1/app/(public)/chef/[slug]/locations/[locationId]/book/route.ts:73), [lib/inquiries/public-actions.ts](/C:/Users/david/Documents/CFv1/lib/inquiries/public-actions.ts:375), [lib/inquiries/public-actions.ts](/C:/Users/david/Documents/CFv1/lib/inquiries/public-actions.ts:599), [lib/partners/analytics.ts](/C:/Users/david/Documents/CFv1/lib/partners/analytics.ts:171), and [app/(chef)/finance/reporting/revenue-by-event/page.tsx](/C:/Users/david/Documents/CFv1/app/(chef)/finance/reporting/revenue-by-event/page.tsx:19).

5. Partner/location reporting is still shallow at the location level. Partner-level revenue exists, but the location breakdown in the partner contribution report only counts referrals and event volume; it does not break out location-attributed revenue or funnel steps. See [lib/partners/report.ts](/C:/Users/david/Documents/CFv1/lib/partners/report.ts:101) and [lib/partners/actions.ts](/C:/Users/david/Documents/CFv1/lib/partners/actions.ts:518).

6. Public readiness is not location-aware and is not fail-closed beyond basic profile text. The public chef page only hides the profile when bio/tagline content is missing or looks like an email-style name, while `lib/public/chef-profile-readiness.ts` is actually a buyer-signals builder, not a public-readiness gate. No location-specific readiness contract currently blocks incomplete settings from discovery or public rendering. See [app/(public)/chef/[slug]/page.tsx](/C:/Users/david/Documents/CFv1/app/(public)/chef/[slug]/page.tsx:51), [app/(public)/chef/[slug]/page.tsx](/C:/Users/david/Documents/CFv1/app/(public)/chef/[slug]/page.tsx:467), and [lib/public/chef-profile-readiness.ts](/C:/Users/david/Documents/CFv1/lib/public/chef-profile-readiness.ts:4).

7. Partner co-authoring exists only as direct writes, without approval controls. The partner portal can directly update partner profile fields, and there is a direct-write server action for partner location descriptions, but the public-facing portal explicitly says the chef controls visibility and there is no pending-changes queue, approval state, or review workflow. See [app/(partner)/partner/profile/page.tsx](/C:/Users/david/Documents/CFv1/app/(partner)/partner/profile/page.tsx:1), [lib/partners/portal-actions.ts](/C:/Users/david/Documents/CFv1/lib/partners/portal-actions.ts:207), and [lib/partners/portal-actions.ts](/C:/Users/david/Documents/CFv1/lib/partners/portal-actions.ts:242).

8. Partner preview can drift from the real public location surface. The chef-side preview already reuses `LocationExperienceShowcase`, but the partner preview fetches raw nested partner/location records and renders a separate card system that does not use the public location read model. See [app/(chef)/settings/client-preview/public-profile-preview.tsx](/C:/Users/david/Documents/CFv1/app/(chef)/settings/client-preview/public-profile-preview.tsx:327) and [app/(partner)/partner/preview/page.tsx](/C:/Users/david/Documents/CFv1/app/(partner)/partner/preview/page.tsx:14).

9. Existing test coverage is real but narrow for this mission. There is unit coverage for location taxonomy/image fallback and directory utility behavior, but the current verified tests I found do not yet cover a public location detail route, location-forward directory ranking, or partner approval workflow. See [tests/unit/location-experiences.test.ts](/C:/Users/david/Documents/CFv1/tests/unit/location-experiences.test.ts:1) and [tests/unit/directory.discovery-utils.test.ts](/C:/Users/david/Documents/CFv1/tests/unit/directory.discovery-utils.test.ts:1).

## Implementation Direction Implied By The Audit

1. Reuse the existing schema, taxonomy, and attribution columns. Do not introduce parallel location entities.

2. Extract one shared public location read model and consume it from public profile, public location detail, discovery, and previews.

3. Extend existing inquiry/event/partner analytics flows so location attribution stays attached from click through revenue reporting.

4. Add a small, explicit readiness contract for public locations and partner-authored changes so exposure fails closed instead of rendering partial or unreviewed public state.
