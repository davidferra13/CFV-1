# Research: Public Chef Credentials Showcase

## Origin Context

The developer described a new public-facing chef feature that is "not exactly like a resume" but still needs to communicate the same trust and professionalism. The ask was to help define a public profile layer that can show a chef's work history, awards, accomplishments, famous people they have cooked for or with, and charity involvement, while still keeping a normal resume available in a tucked-away way for high-end clients who want it.

The deeper intent was not "build a PDF resume viewer." It was "make a chef feel credibly hireable from the public profile, especially for premium private-chef opportunities." The developer also called out future community-impact storytelling such as showing that a chef donates a certain percentage to charity.

## Summary

ChefFlow already has a public chef funnel, but it does not yet have a structured professional credentials layer. The public homepage card, public chef profile, and public inquiry page currently emphasize service, reviews, venues, and inquiry routing, not work history or career proof (`app/(public)/page.tsx:164-287`, `app/(public)/chef/[slug]/page.tsx:152-609`, `app/(public)/chef/[slug]/inquire/page.tsx:30-94`).

Several reusable credibility systems already exist: public reviews, professional achievements, portfolio photos, and charity hours (`lib/reviews/public-actions.ts:89-271`, `lib/professional/actions.ts:46-116`, `lib/events/photo-actions.ts:648-709`, `lib/charity/hours-actions.ts:50-232`). The missing pieces are the actual public CV primitives: work history, safe notable-credit modeling, a public charity pledge field, and a polished private resume path.

## Detailed Findings

### 1. Public-facing chef pages do not currently tell a professional-story timeline

- The homepage `FeaturedChefCard` shows image, availability, rating, service pills, socials, coverage, and an inquiry CTA, but no work history, awards, charity, or credentials teaser (`app/(public)/page.tsx:164-287`).
- The public chef profile fetches only the base chef profile, review feed, and availability, then renders hero, snapshot cards, partner showcase, reviews, availability, and CTA sections (`app/(public)/chef/[slug]/page.tsx:152-609`).
- The inquiry page is still a narrow single-column wrapper around `PublicInquiryForm`, so it also lacks any professional credentials context (`app/(public)/chef/[slug]/inquire/page.tsx:30-94`).

### 2. The current public profile data source does not include credentials content

- `getPublicChefProfile(slug)` exposes the chef's identity, website visibility controls, inquiry routing, theme, social links, merged discovery profile, and showcase partners (`lib/profile/actions.ts:102-273`).
- The returned shape does not include achievements, work history, highlights, portfolio, charity summary, resume metadata, or notable-client credits (`lib/profile/actions.ts:247-272`).
- `getDiscoverableChefs()` similarly powers the homepage cards with identity, website, socials, discovery data, and partners only (`lib/directory/actions.ts:80-268`).

### 3. There are existing chef-managed systems that can be reused

#### Professional achievements

- `professional_achievements` already stores structured career proof with `achieve_type`, title, organization, date, description, outcome, URL, image URL, and `is_public` (`lib/db/schema/schema.ts:4972-5000`).
- Chef CRUD already exists in `lib/professional/actions.ts`, and `listAchievements(publicOnly)` can filter public rows, but it currently requires `requireChef()` and `requirePro('professional')`, so there is no public read action yet (`lib/professional/actions.ts:46-116`).
- The chef-side page is already framed as career milestones and achievements (`app/(chef)/settings/professional/page.tsx:16-34`).

#### Portfolio

- There is a `portfolio_items` table and editor, but that system is chef-private and not currently wired into the public chef page (`lib/db/schema/schema.ts:8118-8141`, `lib/portfolio/actions.ts:51-169`, `app/(chef)/settings/portfolio/page.tsx:12-45`).
- There is also an event-photo-based public portfolio path: `getPublicPortfolio(chefId)` pulls `event_photos` where `is_public = true` and `is_portfolio = true`, generates signed URLs, and returns a public-safe list for `PortfolioShowcase` (`lib/events/photo-actions.ts:667-709`, `components/portfolio/portfolio-showcase.tsx:26-227`).
- The existing public chef profile does not call `getPublicPortfolio()` or render `PortfolioShowcase` (`app/(public)/chef/[slug]/page.tsx:152-609`).

#### Charity impact

- `charity_hours` already captures organization name, address, EIN, verified 501(c), service date, hours, and notes (`lib/db/schema/schema.ts:6612-6639`).
- Chef CRUD and summary logic already exist in `lib/charity/hours-actions.ts` (`lib/charity/hours-actions.ts:50-232`).
- The current management page is unexpectedly gated behind both `requireChef()` and `requireAdmin()`, which means the UX is not aligned with the table-level chef ownership model (`app/(chef)/charity/hours/page.tsx:18-21`).
- None of this data is currently rendered on the public chef profile (`app/(public)/chef/[slug]/page.tsx:152-609`).

#### Public reviews

- The live public proof source is already solid: `getPublicChefReviewFeed(tenantId)` merges consented client reviews, public chef feedback, external reviews, and approved guest testimonials into a unified feed and stats payload (`lib/reviews/public-actions.ts:89-271`).
- This means the public credentials feature should not create a second trust-data system for reviews.

### 4. `profile_highlights` exists, but it is the wrong abstraction for this feature

- `profile_highlights` is limited to the categories `events`, `behind_scenes`, `testimonials`, and `press` (`lib/db/schema/schema.ts:8143-8164`, `lib/portfolio/highlight-actions.ts:14-40`).
- The editor is basically a grouped list of title + string items, not a career timeline or credential model (`components/portfolio/highlight-editor.tsx:18-333`).
- The settings page says highlights are for achievements, certifications, press mentions, and awards, but the actual category taxonomy does not match work history, famous collaborations, or charity impact (`app/(chef)/settings/highlights/page.tsx:29-45`).
- I did not find the public chef page actually rendering highlights today (`app/(public)/chef/[slug]/page.tsx:152-609`).

### 5. A private resume is feasible with existing tables, but not already productized

- `chef_documents` already stores document metadata including title, type, summary, source filename, tags, folder, original filename, storage bucket/path, mime type, file size, and links to events, clients, and inquiries (`lib/db/schema/schema.ts:23878-23965`).
- There are existing search and linking helpers for `chef_documents` (`lib/documents/search-actions.ts:56-217`, `lib/documents/link-actions.ts:24-152`).
- The current document import path is AI/import-oriented: `SmartImportHub` can parse a file into a `ParsedDocument` and then save it with `importDocument()` as a `chef_documents` row (`components/import/smart-import-hub.tsx:353-390`, `components/import/smart-import-hub.tsx:520-576`, `lib/documents/import-actions.ts:14-46`).
- I did not find a dedicated "upload a private resume for public-profile clients" flow. The storage model exists, but the actual resume UX does not.

## Gaps

1. There is no structured public work-history model. Nothing in the public profile data flow or current tables cleanly captures role, organization, dates, and narrative chronology for a chef's career (`lib/profile/actions.ts:102-273`, `lib/db/schema/schema.ts:4972-5000`, `lib/db/schema/schema.ts:8143-8164`).
2. There is no safe notable-credit model for "cooked for" / "cooked with" public namedrops. Achievements can approximate this, but there is no dedicated place to represent those credits consistently or carefully.
3. There is no public charity-pledge field for "I donate X percent to charity." Logged hours exist, but a donation percentage or impact statement does not (`lib/db/schema/schema.ts:6612-6639`, `lib/charity/hours-actions.ts:201-232`).
4. There is no polished private-resume workflow. `chef_documents` can store it, but the current system is generic and import-driven, not a clear profile setting (`lib/db/schema/schema.ts:23878-23965`, `components/import/smart-import-hub.tsx:353-390`).
5. `profile_highlights` is likely to tempt a builder into overloading the wrong table. Its taxonomy and editor do not match the requested feature (`lib/db/schema/schema.ts:8143-8164`, `components/portfolio/highlight-editor.tsx:18-333`).

## Recommendations

1. Reuse existing public-proof systems instead of replacing them. Keep reviews on `getPublicChefReviewFeed()`, achievements on `professional_achievements`, portfolio on `getPublicPortfolio()`, and charity totals on `charity_hours`.
2. Add one new structured work-history data model rather than trying to force work history into `profile_highlights` or `professional_achievements`.
3. Treat famous clients and collaborations as chef-entered public credits attached to work-history entries, with explicit public visibility and no automated inference. This respects NDAs and keeps the privacy boundary intentional.
4. Add small public charity fields on the chef profile for percentage/narrative impact, and combine those with existing verified charity-hours summary on the public page.
5. Keep the actual resume private in `chef_documents` and surface only an optional "resume available upon request" note publicly. Do not expose a public resume download in v1.
