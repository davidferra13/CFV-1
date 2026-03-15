# Food Discovery Execution Framework

Date: 2026-03-15
Status: Build directive
Scope: Immediate discovery phase through release

## 1. Strategic Framework

### Core objective

Turn the discovery research into a repeatable build system that improves ChefFlow's public discovery surface without breaking the product's current thesis:

- no commission marketplace
- no restaurant/POS pivot in the immediate phase
- discovery must strengthen the operating system, not fork from it

### Operating thesis

ChefFlow should build the strongest discovery experience for independent food operators that are poorly served by mainstream search and opt-in marketplaces:

- private chefs
- caterers
- event dining operators
- venue-linked chefs
- pop-ups / experience-led operators

### Insight-to-build decision loop

Every future discovery build must pass five gates before implementation starts.

1. Demand relevance
   - Which user search task does this solve?
   - Which query class does it improve: private chef, catering, at-home dining, pop-up, venue-linked partner?
   - What failure in current search behavior are we fixing?
2. Supply leverage
   - Does the feature improve claimability, profile quality, response reliability, or provider conversion?
   - Does it help ChefFlow-owned operators more than generic listing products do?
3. Ecosystem fit
   - Does it reuse existing ChefFlow systems: public profile, inquiry intake, booking, partner graph, analytics, admin moderation?
   - If not, reject or redesign.
4. Legal/data viability
   - Is the data first-party, open-data-safe, or contractually usable?
   - If rights or usage are unclear, do not ship.
5. Measurable lift
   - What metric moves?
   - What is the control/baseline?

### Required artifact per discovery feature

Every discovery build ticket should include:

- target query class
- target user
- target provider archetype
- reused system components
- required schema changes
- measurable success metric
- release and rollback impact

### Product management cadence

Use a fixed four-stage loop for discovery work:

1. Validate
   - coverage audit
   - user task evidence
   - provider evidence
2. Build
   - additive schema
   - UI/API integration
   - analytics wiring
3. Verify
   - functional QA
   - security and RLS review
   - release smoke
4. Learn
   - funnel analysis
   - zero-result analysis
   - claim completion and inquiry conversion review

### Strategic rule set for future builds

Apply these rules proactively:

- Prefer claimable supply over scraped supply.
- Prefer additive discovery metadata over separate products.
- Prefer workflow-connected quality signals over vanity ranking.
- Prefer metro-and-query-class completeness metrics over broad "comprehensive" claims.
- Prefer first-party inquiry conversion over marketplace mediation.

## 2. Immediate Development Priorities

Immediate phase means extending the current `/chefs` and `/chef/[slug]` surfaces into a stronger discovery funnel using the schema that already exists.

### Priority 0: Discovery profile foundation

Objective:
Make the public directory index the right provider attributes instead of relying mostly on chef bio plus partner locations.

Build:

1. Activate `chef_marketplace_profiles` as the canonical public discovery profile.
2. Add chef-facing management UI for:
   - cuisine types
   - service types
   - price range
   - min / max guest count
   - service area city / state / radius
   - accepting inquiries
   - next available date
   - lead time days
   - hero image
   - gallery
   - highlight text
3. Backfill a profile record for every existing chef with a public slug.
4. Generate and maintain `searchable_text` from chef core data plus marketplace profile data.

Why first:

- The table already exists.
- Public read RLS already exists.
- The current directory cannot rank or filter with enough precision until this profile data is actually populated and used.

Acceptance criteria:

- every publicly listed chef has a `chef_marketplace_profiles` row
- public directory queries can filter on at least cuisine, service type, price range, and inquiry availability

### Priority 1: Directory query and ranking upgrade

Objective:
Upgrade `/chefs` from a simple profile list into a structured search surface for high-intent discovery.

Build:

1. Extend `lib/directory/actions.ts` to join `chef_marketplace_profiles`.
2. Replace current text filtering with a ranked server-side query using:
   - profile completeness
   - exact service-area match
   - service type match
   - inquiry availability
   - freshness of discovery profile
   - existing founder override only where explicitly intended
3. Add filters to `/chefs` for:
   - cuisine
   - service type
   - budget / price range
   - guest count band
   - accepting inquiries
4. Add zero-result recovery behavior:
   - broadened nearby area suggestion
   - reset recommendations
   - related service type suggestions

Acceptance criteria:

- server returns ranked results deterministically
- zero-result flows are tracked and recoverable
- search quality beats current substring match behavior

### Priority 2: Public profile handoff hardening

Objective:
Make the transition from discovery to inquiry or booking clean and conversion-focused.

Build:

1. Extend `/chef/[slug]` hero and detail sections with discovery metadata from `chef_marketplace_profiles`.
2. Add structured trust signals:
   - inquiry acceptance status
   - next available date
   - guest count fit
   - service types
   - cuisine specialties
3. Normalize CTA routing:
   - `inquire`
   - `book`
   - external website only when the chef explicitly prefers it
4. Add CTA instrumentation for:
   - profile view depth
   - inquiry starts
   - booking starts
   - website handoff

Acceptance criteria:

- profile pages display discovery-fit information before the user must inquire
- CTA events can attribute inquiry starts back to query/filter context

### Priority 3: Admin quality and moderation layer

Objective:
Move from a binary approval toggle to an actual directory operations workflow.

Build:

1. Extend admin directory review with profile completeness indicators.
2. Add verification states:
   - pending
   - approved
   - approved_with_warnings
   - hidden
3. Add internal quality flags:
   - missing service area
   - no inquiry CTA path
   - stale availability
   - missing gallery / hero
   - conflicting partner coverage
4. Add batch revalidation for changed public profiles.

Recommended additive tables:

- `directory_verification_events`
- `directory_quality_flags`

Acceptance criteria:

- admin can distinguish "publicly approved but weak" from "ready to rank highly"
- moderation state is auditable

### Priority 4: Funnel analytics and research feedback loop

Objective:
Use actual usage data to guide future builds instead of intuition.

Build:

1. Extend PostHog events for:
   - filter combinations
   - zero-result cohorts
   - profile-to-inquiry conversion
   - profile-to-booking conversion
   - exit to external website
2. Add `signup_source_page` and `inquiry_source_page` style attribution for public discovery.
3. Publish an internal weekly scorecard for:
   - directory visitors
   - filter use rate
   - zero-result rate
   - profile CTR
   - inquiry conversion

Acceptance criteria:

- each public discovery session can be traced through search -> profile -> inquiry/book intent

### Priority 5: Coverage audit tooling

Objective:
Create the operational discipline to know where the directory is thin before public claims are made.

Build:

1. Internal audit template per metro and query class.
2. Seeded comparison against:
   - Google
   - Yelp
   - Take a Chef
   - direct-web / Instagram discovery
3. Coverage dashboard input stored outside runtime-critical public flows.

This is a product-management and data-ops necessity, not a user-facing feature.

## 3. Technical Build Overview

### Existing architecture to preserve

Platform baseline:

- Next.js 14 App Router
- TypeScript strict mode
- Supabase for Postgres/Auth/RLS/Storage
- Stripe for payment rails
- PostHog for product analytics
- Sentry for error monitoring
- Vercel deployment with release verification and rollback path

Existing discovery-related surfaces:

- public directory: `app/(public)/chefs/page.tsx`
- public chef profile: `app/(public)/chef/[slug]/page.tsx`
- public inquiry handoff: `app/(public)/chef/[slug]/inquire/page.tsx`
- booking entry: `app/book/[chefSlug]/page.tsx`
- admin moderation: `app/(admin)/admin/directory/page.tsx`

Existing server actions / contracts:

- `lib/directory/actions.ts`
- `lib/directory/admin-actions.ts`
- `lib/profile/actions.ts`
- `lib/inquiries/public-actions.ts`
- `lib/booking/instant-book-actions.ts`
- `lib/analytics/posthog.ts`

### Target architecture for the immediate phase

#### A. Discovery domain layer

Create a dedicated domain module:

- `lib/discovery/`

Recommended submodules:

- `profile-actions.ts`
- `search-actions.ts`
- `ranking.ts`
- `quality-actions.ts`
- `types.ts`

Role:

- centralize discovery-specific logic now split across directory and profile actions
- keep ranking, filtering, and moderation logic out of page components

#### B. Data model

Use existing tables as the primary graph.

Primary tables:

- `chefs`
- `chef_preferences`
- `chef_marketplace_profiles`
- `referral_partners`
- `partner_locations`
- review/public availability sources already consumed by public profile
- `inquiries`
- `events`

Immediate additive schema recommended:

1. `directory_verification_events`
   - `id`
   - `chef_id`
   - `status`
   - `notes`
   - `verified_by`
   - `verified_at`
2. `directory_quality_flags`
   - `id`
   - `chef_id`
   - `flag_type`
   - `severity`
   - `details`
   - `resolved_at`
3. Optional computed columns or trigger support on `chef_marketplace_profiles`
   - `profile_completeness_score`
   - `freshness_checked_at`
   - refreshed `searchable_text`

Data design rules:

- keep changes additive
- public reads stay RLS-safe
- admin/moderation writes stay server-side
- provider-owned profile edits use chef-authenticated writes only

#### C. Query model

Current directory behavior is page-level in-memory filtering after fetching discoverable chefs.
Immediate phase should move toward server-ranked filtering.

Recommended query pipeline:

1. resolve discoverable chefs
2. join marketplace profile
3. apply hard filters in SQL where possible
4. compute ranking in domain layer
5. return shaped DTOs for page rendering

Ranking inputs:

- service area relevance
- cuisine / service type match
- accepting inquiries
- next available date proximity
- review count / average rating where available
- profile completeness
- partner / venue relevance

#### D. UI component model

Public components to add or update:

- `app/(public)/chefs/_components/directory-filters-form.tsx`
- `app/(public)/chefs/_components/directory-results-tracker.tsx`
- new `app/(public)/chefs/_components/directory-sort-explainer.tsx`
- new `app/(public)/chefs/_components/zero-results-recovery.tsx`
- update chef tiles to include discovery-fit metadata

Chef portal components to add:

- `components/discovery/discovery-profile-form.tsx`
- `components/discovery/discovery-availability-panel.tsx`
- `components/discovery/discovery-preview-card.tsx`

Admin components to add:

- `components/admin/directory-quality-panel.tsx`
- `components/admin/directory-verification-history.tsx`

#### E. Analytics and observability

Keep PostHog as the product analytics layer and add discovery-specific events instead of building a bespoke event pipeline.

Required event coverage:

- search performed
- filters applied
- result set viewed
- zero-result seen
- profile viewed
- inquiry CTA clicked
- booking CTA clicked
- website handoff clicked
- inquiry submitted with source context

Operational monitoring:

- Sentry for runtime failures in public pages and server actions
- PostHog funnels for conversion analysis
- existing release smoke for regression detection

#### F. Security and trust boundaries

Non-negotiable controls:

- public profile reads only from explicitly public-safe data
- no admin-only fields in public DTOs
- no internal partner notes, commission notes, or raw contact data exposed
- additive migrations only
- RLS preserved on all new tables
- server actions handle moderation and write paths

## 4. Integration Plan, Dependencies, And Deployment Protocol

### Integration strategy

This build should integrate into the existing ecosystem in four layers, in this order:

1. Schema
   - extend existing discovery tables
   - add quality / verification tables
2. Domain logic
   - centralize discovery actions in `lib/discovery`
3. Public UI
   - upgrade `/chefs` and `/chef/[slug]`
4. Operations
   - wire admin moderation, analytics, and release verification

### Critical dependencies

#### Application dependencies

- `lib/profile/actions.ts` public chef profile contract
- `lib/directory/actions.ts` discoverable chef contract
- `lib/inquiries/public-actions.ts` public inquiry intake
- `lib/booking/*` booking handoff
- `lib/analytics/posthog.ts` event capture

#### Schema dependencies

- `chefs.slug`
- `chefs.directory_approved`
- `chef_preferences.network_discoverable`
- `referral_partners` and `partner_locations`
- `chef_marketplace_profiles`

#### Platform dependencies

- Supabase migrations and generated types
- Vercel runtime and preview/prod deployments
- PostHog key/host configuration
- Sentry DSN and project configuration

#### Optional later dependency

For Phase 2 open-place ingestion only:

- Overture import jobs
- background processing via cron or Inngest
- object storage for raw ingest snapshots

Do not make this a dependency of the immediate phase.

### Delivery sequence

#### Phase A: validation and schema activation

1. Add additive migrations for quality / verification support.
2. Backfill `chef_marketplace_profiles`.
3. Regenerate Supabase types.
4. Add chef-facing profile editor.

#### Phase B: public discovery upgrade

1. Extend search and ranking actions.
2. Ship new filters and ranking behavior on `/chefs`.
3. Extend `/chef/[slug]` with discovery metadata.
4. Wire funnel attribution to inquiry and booking CTAs.

#### Phase C: admin and analytics hardening

1. Add moderation/quality panels.
2. Add PostHog dashboards and scorecards.
3. Review zero-result and conversion cohorts.

### Deployment protocol

Use the repo's existing release discipline, not an ad hoc launch path.

#### Pre-merge

1. Write additive migrations in `supabase/migrations/`.
2. Run local schema validation.
3. Regenerate `types/database.ts`.
4. Verify RLS on all new tables.
5. Add or update unit/integration coverage for:
   - discovery search shaping
   - moderation actions
   - public profile DTO safety

#### Pre-release verification

Run the existing release gate:

```bash
npm run verify:release
```

This already enforces:

- secrets verification
- typecheck
- strict lint
- critical tests
- full unit suite
- production build
- Playwright smoke against a production server config

#### Database rollout

Use additive push flow:

```bash
npm run supabase:push
npm run supabase:types
```

If using staged rollout, follow the repo's staging discipline:

- local
- staging / preview database
- production database

Do not rely on rollback for bad schema design. Supabase push is effectively one-way. Prevent failure with additive migrations and preflight review.

#### App deployment

Deploy through the existing Vercel path after release verification passes.

Production readiness checks:

- `/chefs` renders with live data
- `/chef/[slug]` renders without leaked internal fields
- inquiry CTA still submits correctly
- booking CTA still resolves correctly
- PostHog events are visible
- Sentry shows no new public-route exceptions

#### Post-deploy smoke

Minimum smoke sequence:

1. open `/chefs`
2. apply filters
3. open a profile
4. click inquiry CTA
5. submit a valid inquiry in non-destructive test mode
6. verify analytics event flow

#### Rollback protocol

Application rollback:

- use Vercel rollback to the previous healthy deployment if public discovery regresses

Schema rollback:

- not a real rollback path
- use forward-fix migrations only

This means public discovery schema must stay additive and tolerant of partially populated data.

### Release gates for this initiative

Do not promote to production unless all are true:

1. Every approved directory chef has a valid public discovery profile row.
2. Public pages degrade safely if profile enrichment fields are missing.
3. Search filters and ranking are analytics-instrumented.
4. Inquiry and booking handoffs still function.
5. No internal-only fields leak in public DTOs.
6. `npm run verify:release` passes.

## Immediate Build Recommendation

Build the first phase as an upgrade to the current directory and public profile system, not as a new standalone product.

That means:

- extend `chef_marketplace_profiles`
- create `lib/discovery`
- upgrade `/chefs`
- harden `/chef/[slug]`
- add moderation and quality operations
- deploy through the existing Supabase/Vercel/PostHog/Sentry pipeline

This is the shortest path to end-to-end delivery that is aligned with both the research and the current codebase.
