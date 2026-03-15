# Food Discovery Strategy And Research Plan

Date: 2026-03-15
Status: Recommendation
Owner: Product / Research / Data Platform

## Executive Summary

The discovery fragmentation thesis is directionally correct, but the proposed promise of "every restaurant, private chef, and all other food-related services" is not a simple product expansion. It is a data acquisition, rights-management, entity resolution, trust, moderation, and coverage-measurement program.

ChefFlow should not launch with a broad "food near me for everything" ambition. The stronger wedge is narrower and already aligned with the repo's existing thesis:

1. Start with independent, hard-to-discover food providers that mainstream platforms cover poorly or only on an opt-in basis: private chefs, caterers, event dining operators, pop-ups, and venue-linked food experiences.
2. Use an owned, no-commission, claimable directory model rather than a marketplace model that conflicts with ChefFlow's current product positioning.
3. Treat restaurants as a later adjacency, not the opening bet. Restaurant discovery is already heavily indexed, operationally different, and more likely to pull ChefFlow toward reservations, POS, and local-search competition.

The right near-term objective is not "be exhaustive for all food." It is:

Make ChefFlow the best place to discover qualified independent food-service providers in target segments and target metros, with measurable coverage and better task completion than the current patchwork.

## Why The Broad Thesis Needs Narrowing

### 1. The repo's own research supports discovery pain, but not a generic marketplace pivot

ChefFlow's market synthesis shows two true things at once:

- Fragmentation is real. Chefs are still operating across Google Docs, QuickBooks, text, Venmo, Instagram, and spreadsheets. See `docs/research-synthesis-all-archetypes.md`.
- A commission marketplace conflicts with the core value proposition. The same synthesis explicitly warns against building a marketplace because commissions are hated and because ChefFlow's moat is the operating system for independent food professionals, not a rent-extracting middleman.

The repo already leans toward a middle path:

- `docs/research-synthesis-all-archetypes.md` says not to build a marketplace, but later allows "marketplace-adjacent features" such as a public chef directory.
- The live product already reflects that compromise:
  - Public chef directory at `/chefs`
  - Approval-gated directory standards
  - Public pages positioning ChefFlow as the business layer behind marketplaces, not a replacement for them

That means the correct strategic question is not "should ChefFlow become Uber Eats for everything?" It is "what discovery layer can ChefFlow add without breaking its anti-commission, operator-owned thesis?"

### 2. Current platform behavior validates fragmentation, but also shows why broad aggregation is hard

Current official platform documentation points to a clear pattern:

- Google local results are ranked, not exhaustive. Google says local results are mainly based on relevance, distance, and prominence, and that business/profile data is compiled from public web data, licensed third-party data, user contributions, and Google interactions.
- Google Business Profile APIs are not a public exhaustiveness shortcut. Google restricts them to listings a user owns or is authorized to manage, limits content storage, and explicitly forbids use of GoogleLocations for lead generation or analysis.
- Google Maps Platform terms are hostile to building a Google-powered master directory. Google's published Maps Platform terms have explicitly prohibited using the core services in a listings or directory service, and also prohibit displaying Places content with a non-Google map.
- Yelp is also not an unrestricted canonical graph. Yelp's business model is built around free claimed pages, organic search visibility, and paid "Sponsored Results." Its Places API trial plans are rate-limited, and higher access requires review against Yelp's terms and display requirements. Its Data Ingestion API is reserved for contracted partners.
- Uber Eats is opt-in merchant supply, not an exhaustive inventory. Merchants must sign up, pay fees, and operate within Uber's delivery coverage model. Visibility inside Uber Eats is also affected by service quality programs like Top Eats.
- OpenTable is a participating network, not a full restaurant universe. OpenTable says it serves 60K+ restaurants, bars, wineries, and venues worldwide and charges for seated guests booked through the network.
- Take a Chef is similarly opt-in. It markets both sides of a participation network, with chefs joining the platform and guests booking from that enrolled supply.

The implication is simple:

You cannot legally or operationally bootstrap a universal food-service directory by "combining Google, Yelp, Uber Eats, and others" as if they were neutral raw datasets. They are ranked products, opt-in merchant networks, and rights-constrained APIs.

### 3. Open map data helps, but only solves the base inventory problem

There is now a viable open-data foundation for place discovery:

- Overture's Places dataset contains more than 64 million places and is openly usable.
- Overture exposes rich attributes such as websites, socials, emails, phones, addresses, categories, operating status, and per-property source provenance.
- Overture's GERS IDs were created specifically to reduce the cost of joining datasets and resolving entities across sources.

This is important, but incomplete.

Open place data can help with:

- Base inventory for restaurants, venues, and conventional brick-and-mortar food businesses
- Canonical IDs
- Category normalization
- Address and source provenance

Open place data does not solve:

- Private chefs who do not operate from public storefronts
- Service-area businesses with weak public listing presence
- Trust, quality, or verification
- Real availability
- Booking intent
- "This business still exists and actually offers this service here"

That means the platform needs a dual model:

- Open-data-backed place graph where licensing allows
- First-party claim, verification, and workflow-connected profiles for independent providers

## Strategic Recommendation

### Recommendation: Build an owned independent-food discovery graph, not a universal food meta-index

The viable path is:

1. Keep ChefFlow's anti-commission operating-system thesis intact.
2. Expand discovery only in segments where ChefFlow can create a meaningfully better product than search engines and marketplaces.
3. Measure completeness by segment and metro, not with a vague global promise of "everything."

### Recommended wedge

Prioritize discovery for:

- Private chefs
- Catering chefs
- Private dining experience chefs
- Wedding / event food operators
- Venue-linked independent chefs
- Pop-ups and experience-based dining operators

Do not prioritize first:

- Full restaurant discovery
- Reservations at scale
- Delivery marketplaces
- POS-linked restaurant workflows
- Generic "food near me" for every category

### Why this wedge is correct

It fits the repo's evidence:

- These are the exact archetypes ChefFlow already ranks highest in `docs/research-synthesis-all-archetypes.md`.
- The existing public product already supports a chef directory and marketplace-adjacent positioning without requiring a commission marketplace.
- The provider side is closer to ChefFlow's system of record, which means ChefFlow can win by combining discovery with actual operating data, not by copying directory mechanics.

It also fits the external constraints:

- Mainstream platforms do not offer a reliable, unrestricted dataset for this category.
- Open map data is better for places than for service-area independents.
- Opt-in provider onboarding is acceptable here because the real supply gap is precisely among businesses that are not well represented elsewhere.

## Product Thesis Revision

### Replace this promise

"One place where a user can find every restaurant, private chef, and all other food-related services."

### With this promise

"The best place to discover qualified independent food-service providers that mainstream search and marketplace products cover inconsistently."

This matters because the first promise is unverifiable and legally risky. The second is defensible, specific, and measurable.

## Technology And Roadmap Direction

### Phase 0: Strategy Validation

Objective:
Confirm that the independent-provider wedge is both real and winnable before building a larger graph.

Build:

- Coverage audit framework by metro and service segment
- Canonical provider schema
- Source-provenance model
- Claim and approval workflow using the existing directory pattern

Decision gate:

- If ChefFlow cannot materially outperform baseline search behavior for private-chef and catering discovery in 2-3 metros, stop the expansion before broadening scope.

### Phase 1: Owned Provider Graph

Objective:
Turn the current chef directory into the first layer of a broader independent-food graph.

Build:

- Canonical entity model:
  - provider
  - operator profile
  - service area
  - offerings
  - cuisines
  - event types
  - trust signals
  - source records
  - claim state
  - verification state
- Provider claim flow
- Approval and moderation tools
- Search and filter primitives around:
  - location
  - service type
  - cuisine
  - event type
  - budget band
  - verification level
- Deep linking from directory -> inquiry -> ChefFlow workflow

Use existing ChefFlow assets instead of inventing a new product surface:

- `/chefs`
- directory approval gating
- inquiry flow
- partner venue relationships

### Phase 2: Open Place Layer For Adjacent Supply

Objective:
Add a base graph for adjacent public food businesses where open data gives enough legal and technical headroom.

Build:

- Overture-backed place ingestion for selected categories
- GERS-based source joining
- Confidence-scored deduplication
- Source provenance and freshness metadata

Important constraint:

This phase should support adjacency and context, not trigger a restaurant-reservations pivot.

Example uses:

- Venue adjacency
- local partner discovery
- culinary cluster pages
- concierge / host discovery pages

### Phase 3: Decision On Broader Public Discovery

Objective:
Decide whether to expand beyond the independent-provider wedge.

Only continue if:

- coverage quality is proven
- moderation cost is acceptable
- claim conversion is healthy
- trust signals work
- the business model still does not require commissions

If those conditions fail, keep the directory narrow and high quality.

## Research Program

This is the actual work that should be funded next.

### Workstream 1: User-Centric Demand Research

Goal:
Validate where consumers and hosts actually fail today when trying to discover food-service options.

Methods:

- 15-20 semi-structured interviews with:
  - hosts planning dinners, birthdays, and at-home events
  - users who recently searched for a private chef, catering, or event dining
  - hotel concierges, Airbnb hosts, and venue managers who make recommendations
- 2-week search diary with 10-12 participants
- task-based usability benchmark:
  - "Find a private chef for a 10-person anniversary dinner in X city"
  - "Find catering for a 40-person backyard event"
  - "Find a food experience for a bachelorette weekend"

Key questions:

- Where do they start?
- Which platforms do they switch between?
- What is missing at each step?
- Do they care about completeness, trust, speed, booking ease, or inspiration most?
- What information is required before they feel comfortable contacting a provider?

Success metrics:

- task completion rate
- time to first acceptable option
- number of sources used
- percentage of searches abandoned
- self-reported confidence in decision quality

### Workstream 2: Supply-Side Research

Goal:
Validate whether providers will claim, maintain, and trust a ChefFlow discovery presence.

Methods:

- 20-25 interviews across the current highest-priority archetypes:
  - personal/private chef
  - catering chef
  - wedding specialist
  - traveling private chef
  - freelance/gig chef
- 10 follow-up surveys focused on:
  - current lead sources
  - commission tolerance
  - willingness to maintain a profile
  - willingness to expose pricing ranges
  - preferences around direct inquiry vs marketplace mediation

Key questions:

- Which discovery channels bring the best leads now?
- What data would they trust ChefFlow to publish?
- What would make them claim and keep a profile current?
- What would make them refuse?
- Would they tolerate ranking rules tied to response time, completeness, reviews, or verification?

Success metrics:

- claim intent
- willingness to maintain profile freshness
- willingness to route inquiries through ChefFlow
- resistance to commissions and platform lock-in

### Workstream 3: Coverage And Quality Audit

Goal:
Measure where the real discovery gaps are by segment and geography.

Methods:

- Select 6 metros:
  - 2 tier-1 large markets
  - 2 affluent destination / event markets
  - 2 secondary markets
- For each metro, compare at least these source families:
  - Google
  - Yelp
  - Take a Chef
  - OpenTable (restaurant-only where relevant)
  - Uber Eats / delivery apps (restaurant-only where relevant)
  - Instagram / direct-web discovery for independent providers
  - ChefFlow pilot directory

Measure:

- recall against manually assembled ground truth
- precision for each query class
- freshness
- duplicate rate
- contactability
- trust-signal quality

Important:

Do not benchmark "all food" as one category. Benchmark separate query classes:

- private chef
- at-home dining
- catering
- pop-up / supper club
- restaurant
- venue-linked food partner

### Workstream 4: Feasibility And Implementation Research

Goal:
De-risk the data and engineering architecture before broad launch.

Research questions:

- What is the canonical entity model?
- What source hierarchy should resolve conflicts?
- How should service-area businesses be represented?
- How will confidence and freshness be scored?
- What qualifies a provider as verified?
- How will inactive or misleading listings be detected?
- Which categories can be bootstrapped from open data, and which must be claim-first?

Required spike deliverables:

- schema proposal
- source-ingestion matrix
- entity-resolution design
- moderation workflow
- legal / policy review memo
- ranking design draft

## Technical Feasibility Principles

### 1. Separate place entities from provider entities

Restaurants and venues are places.
Private chefs are often operators with service areas, not public storefronts.

Do not force both into the same simplistic schema.

### 2. Store provenance per field

Every public field should know:

- source
- acquisition method
- last verified date
- confidence score
- whether it is user-claimed, open-data-derived, or manually reviewed

Without provenance, the directory becomes impossible to trust or debug.

### 3. Coverage claims must be measurable

Never claim "comprehensive" without a defined denominator.

Use:

- metro
- service category
- confidence threshold
- last-verified threshold

Example:

"Coverage includes 78% of manually validated private-chef providers in Miami at confidence >= 0.9 and freshness <= 90 days."

That is defensible. "Everything near you" is not.

### 4. Ranking must be explicit and auditable

If ChefFlow adds public discovery, ranking should not be a black box.

Recommended ranking inputs:

- claim status
- verification level
- profile completeness
- freshness
- response reliability
- service fit for query
- trust signals
- geographic relevance

Do not create a pay-to-rank system. That would directly undercut the current positioning.

### 5. Legal and policy review is not optional

Before building the ingestion layer, review:

- Google Maps Platform terms and Places restrictions
- Google Business Profile API restrictions
- Yelp API terms and display requirements
- Overture licensing by source
- any planned scraping behavior

The rule should be:

If the data cannot be used in a public directory under the source terms, it is not a bootstrap source.

## Recommended 6-Week Investigation Sprint

### Week 1

- finalize scope and query classes
- define target metros
- define canonical research scripts
- define entity schema draft

### Week 2

- run demand-side interviews
- run first supply-side interviews
- begin metro-by-metro coverage audit

### Week 3

- continue interviews
- complete first coverage scorecards
- draft data-source and policy memo

### Week 4

- build lightweight pilot dataset
- test claim / approval flow using current `/chefs` patterns
- run first usability benchmark against current alternatives

### Week 5

- synthesize demand, supply, and coverage findings
- refine roadmap
- estimate moderation and data-ops burden

### Week 6

- make go / no-go call
- either:
  - approve Phase 1 build for independent-provider discovery, or
  - stop the effort and keep the directory narrow

## Decision Gates

Do not greenlight broad buildout unless all of the following are true:

1. In target query classes, ChefFlow can assemble meaningfully better coverage than current user workflows.
2. At least 40% of interviewed providers indicate they would claim and maintain a profile.
3. Consumers show materially better task completion or confidence than the baseline multi-platform search flow.
4. Legal review confirms the planned data sources are usable for the intended public product.
5. Moderation and freshness ops are affordable at the forecasted scale.

If any of those fail, the right move is not "build harder." It is "keep the directory narrow and quality-controlled."

## What ChefFlow Should Not Do Next

Do not:

- promise a universal all-food search engine
- depend on scraping or on rights-constrained API content for a public master index
- expand into restaurant reservations or delivery orchestration as a first move
- create a commission marketplace that conflicts with the operating-system thesis
- measure success only by listing count

## Recommended Next Deliverables

1. A coverage-audit brief for 6 metros and 5 query classes.
2. A supply-side interview synthesis focused on claimability and trust.
3. A canonical entity schema and source-provenance spec.
4. A legal/policy memo covering Google, Yelp, Overture, and any additional planned sources.
5. A build recommendation on whether to scale the current `/chefs` directory into the first independent-food discovery surface.

## Source Notes

Internal repo context:

- `docs/research-synthesis-all-archetypes.md`
- `docs/2026-03-05-marketing-analytics-dashboard-spec.md`
- `ROADMAP.md`
- `app/(public)/chefs/page.tsx`
- `app/(public)/marketplace-chefs/page.tsx`
- `app/(public)/page.tsx`
- `app/(public)/trust/page.tsx`
- `lib/directory/actions.ts`
- `lib/marketplace/platforms.ts`

External primary sources reviewed:

- Google Business Profile Help: local ranking and data sourcing
  - https://support.google.com/business/answer/7091/improve-your-local-ranking-on-google
  - https://support.google.com/business/answer/2721884
- Google Business Profile APIs: overview and policies
  - https://developers.google.com/my-business/content/overview
  - https://developers.google.com/my-business/content/policies
- Google Maps Platform terms
  - https://cloud.google.com/archive/maps-platform/terms-20250303
  - https://cloud.google.com/archive/maps-platform/terms-20250604
- Yelp developer docs and Yelp for Business
  - https://docs.developer.yelp.com/docs/places-rate-limiting
  - https://docs.developer.yelp.com/docs/data-ingestion-api
  - https://docs.developer.yelp.com/docs/places-authentication
  - https://business.yelp.com/products/business-page/
- Uber Eats merchant documentation
  - https://merchants.ubereats.com/us/en/s/signup/
- OpenTable restaurant solutions
  - https://www.opentable.com/restaurant-solutions/here-for/leading-restaurants/
- Take a Chef consumer and chef enrollment pages
  - https://www.takeachef.com/en-us
  - https://www.takeachef.com/en-us/chef/chef-registration
- Overture Maps
  - https://docs.overturemaps.org/guides/places/
  - https://docs.overturemaps.org/schema/reference/places/place/
  - https://overturemaps.org/announcements/2025/overture-maps-launches-gers-a-global-standard-for-interoperable-geospatial-ids-to-drive-data-interoperability/
