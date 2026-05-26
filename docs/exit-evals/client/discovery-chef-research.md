# Exit Eval: Client / DISCOVERY & CHEF RESEARCH

> **Wave 2** | 7 scenarios | Role: CLIENT
> **Evaluator mode:** Solo (batch) | All scenarios marked `NEEDS-DEVELOPER-REVIEW`
> **Date:** 2026-05-25

---

## Scenario #1: Search for a private chef from scratch

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why client leaves:** The client has no awareness that ChefFlow exists. They are trying to answer the question "Can I hire someone to cook a private dinner at my home, and how do I find them?" This is a demand-generation problem, not a product problem. The operational gap is that the client's mental model starts with Google/Instagram/TikTok, not with a platform they have never encountered.

**Context ChefFlow has:**

- Full public chef directory at `/chefs` with location, cuisine, service type, dietary, price range, and experience filters
- `/eat` consumer discovery feed with intent-based browsing (tonight, weekend, dinner_party, meal_prep, etc.)
- `/services` and `/services/[slug]` landing pages for each service type (private dinners, catering, meal prep, weddings, cooking classes)
- `/cuisines/[slug]` landing pages per cuisine type
- Homepage with SEO-optimized metadata, structured data (Organization, WebSite, ItemList JSON-LD)
- Featured chef spotlight, seasonal ingredient signals, avatar strips of real chefs
- `WaitlistCapture` component for zero-result locations
- Chef profile pages with full Schema.org Person/FoodService structured data

**Data source?** No. This is a demand capture problem, not a data source problem.

**Client-collaborative angle:** Referral links exist (`client_referrals` table, `lib/referrals/client-referral-actions.ts`). When existing clients refer friends, the "search from scratch" exit partially disappears because the friend lands directly in ChefFlow. Hub groups and share-chef functionality (`/my-hub/share-chef`) also bridge this.

**Physical reality:** Screen-based. Mobile search is the primary entry for this audience.

**Compounding:** High. Every SEO landing page, every cuisine page, every service page compounds over time as Google indexes them. Chef profiles with structured data compound as the directory grows.

**Solution design:**

- Expand programmatic SEO: generate `/chefs/near/[city-state]` location landing pages from existing directory data (chefs already have `service_area_city` and `service_area_state`)
- Add `LocalBusiness` structured data to city-level pages for Google local pack eligibility
- Build `/private-chef/[city]` vanity URLs that redirect to filtered `/chefs?location=` results
- Ensure every chef profile page has `SameAs` links to their social profiles for entity disambiguation in search

**Where it appears:**

- Google/Bing search results (SEO landing pages)
- `/chefs` directory (existing)
- `/eat` discovery feed (existing)
- `/services/[slug]` service type pages (existing)
- `/cuisines/[slug]` cuisine pages (existing)

**What remains as permanent exit:**
Client will always start from Google, Instagram, TikTok, or word-of-mouth. ChefFlow cannot control the initial awareness moment. What ChefFlow can do is appear in search results for high-intent queries ("private chef near me", "hire a chef for dinner party [city]").

**Priority:** Very high frequency (every new client) x Medium effort (programmatic page generation) = HIGH
**Spec needed?** Yes (location landing page SEO spec)

---

## Scenario #2: Ask friends for chef recommendations

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable

**NEEDS-DEVELOPER-REVIEW**

**Why client leaves:** Trust for a high-intimacy service (someone cooking in your home) starts in social circles. The client texts friends, posts in Facebook/neighborhood groups, or asks at dinner parties. The operational need is social validation from people they already trust, not from a platform.

**Context ChefFlow has:**

- Client referral system with tracking (`lib/referrals/client-referral-actions.ts`, `client_referrals` table with lifecycle stages: referred, inquired, booked, completed)
- Hub groups where friends can share chefs (`/my-hub/share-chef`, `/hub/g/[groupToken]`)
- `PublicFollowHandoff` component on chef profiles with "Save chef" and "Ask for updates" CTAs
- `SaveChefButton` for shortlisting (`consumer_saved_chefs` table)
- Referral rewards via loyalty points system
- Share-ready chef profile URLs with OG metadata (title, description, image) for rich link previews in iMessage/WhatsApp

**Data source?** No. Social trust is interpersonal, not data-driven.

**Client-collaborative angle:** Strong. When a friend asks "know a good private chef?", an existing ChefFlow client should be able to share a link that carries context. The chef profile pages already render rich OG metadata for social previews. Hub groups (`/hub`) allow friend-to-friend chef sharing. The referral system tracks whether the referred person signs up and books.

**Physical reality:** Screen-based. Share links need to unfurl beautifully in iMessage, WhatsApp, and Facebook Messenger. Current OG images exist.

**Compounding:** High. Every satisfied client becomes a referral node. The referral chain data (`lib/intelligence/referral-chain-mapping.ts`) compounds as the network grows. Each successful referral strengthens the social proof for both the referring client and the chef.

**Solution design:**

- Ensure chef profile share links produce compelling social previews (already partially done with OG metadata)
- Add a "Share this chef" button on chef profile pages that generates a tracked referral link with the referring client's code embedded
- Build post-event share prompts: after a successful event, prompt the client to share the chef with friends via a pre-composed message with referral link
- Surface referral rewards more prominently in the client portal to encourage sharing behavior
- Consider a "Chef Card" shareable image (like a digital business card) that clients can save to camera roll and text to friends

**Where it appears:**

- Chef public profile pages (`/chef/[slug]`) - share button
- Post-event recap page (`/my-events/[id]/recap`) - share prompt
- Client hub (`/my-hub/share-chef`) - existing
- Client referral page (`/my-referrals`) - existing

**What remains as permanent exit:**
The conversation with friends happens in iMessage, WhatsApp, Facebook groups, or in person. ChefFlow will never own that channel. The bridge is making the handoff from "friend recommends" to "lands in ChefFlow" as frictionless as possible with rich, tracked share links.

**Priority:** High frequency (social proof is top-3 decision factor) x Low effort (share infrastructure mostly exists) = HIGH
**Spec needed?** No. Existing infrastructure covers this. Enhancement: post-event share prompt and chef card image generator.

---

## Scenario #3: Browse food inspiration before choosing a chef

**Original classification:** Permanent exit
**Reclassified to:** Permanent

**NEEDS-DEVELOPER-REVIEW**

**Why client leaves:** The client is in "mood shopping" mode. They are not ready to book. They are scrolling Instagram reels of plated dishes, saving Pinterest boards of tablescapes, watching TikTok videos of chef prep. The operational need is visual and emotional inspiration, not information retrieval. They are forming an appetite, not making a decision.

**Context ChefFlow has:**

- `/eat` discovery feed with intent filters (tonight, weekend, dinner_party, visual mode)
- Chef profile pages with portfolio galleries (`PortfolioGallery` component, `getPublicPortfolio`, `getPublicPortfolioEntries`)
- Showcase menus on chef profiles (`getPublicShowcaseMenus`)
- Seasonal spotlight on homepage (`HomepageSeasonalSpotlight`)
- Cuisine pages (`/cuisines/[slug]`) with chef listings per cuisine
- Event recap galleries (when shared by chef)

**Data source?** No. Instagram, TikTok, and Pinterest are content platforms, not data sources. Their value is in the infinite scroll of curated visual content that ChefFlow cannot and should not replicate.

**Client-collaborative angle:** Low. This is an individual browsing behavior. However, when the client saves inspiration images/links elsewhere, ChefFlow could capture that intent later. The `/eat?intent=visual` mode and the planning brief system (`planningBriefFromSearchParams`) could eventually absorb mood signals.

**Physical reality:** Phone screen, couch browsing. Passive consumption. The client is not taking action, they are absorbing atmosphere.

**Compounding:** Low for ChefFlow. The inspiration content lives on social platforms and refreshes constantly. ChefFlow's portfolio galleries compound per-chef as event photos are added, but cannot compete with the volume of social content.

**Solution design:**

- Ensure chef portfolios and event recap galleries are visually rich and easy to browse
- Add cuisine/mood tags to portfolio entries so they surface in `/eat?intent=visual` discovery
- When a client saves a chef or starts an inquiry, capture "inspiration notes" or "mood" as structured data (cuisine preferences, plating style, ambiance)
- Link chef social profiles prominently on their ChefFlow profile (already done: Instagram, TikTok, Facebook, YouTube, Linktree links render on `/chef/[slug]`)

**Where it appears:**

- Chef profile portfolio section (existing)
- `/eat?intent=visual` visual discovery mode (existing)
- Chef social links on profile (existing: Instagram, TikTok, Facebook, YouTube, Linktree)

**What remains as permanent exit:**
Instagram, TikTok, and Pinterest will always own the inspiration browsing moment. ChefFlow's role is to be the destination when inspiration converts to intent. The bridge: chef social links on profiles, and intake flows that capture mood/inspiration context.

**Priority:** High frequency (most clients browse before booking) x High effort (competing with social platforms is futile) = LOW (bridge only)
**Spec needed?** No. Current social link display and portfolio features cover the bridge adequately.

---

## Scenario #4: Search for local restaurant alternatives

**Original classification:** Permanent exit
**Reclassified to:** Permanent

**NEEDS-DEVELOPER-REVIEW**

**Why client leaves:** The client is deciding between hiring a private chef and going to a restaurant. This is a format comparison, not a chef comparison. They are weighing convenience, cost, experience quality, and social dynamics. The operational question is "Should we go out, or bring someone in?"

**Context ChefFlow has:**

- `/compare` comparison hub with pages comparing ChefFlow to spreadsheets and CRM tools (operator-focused, not consumer-facing format comparison)
- `/pricing` page with pricing guidance
- `/how-it-works` page explaining the private chef experience
- Per-person cost breakdowns on chef profiles and quotes
- Service type landing pages explaining private dinners, catering, etc.

**Data source?** No. Restaurant search (Google Maps, Resy, OpenTable) is a separate ecosystem. ChefFlow should not index restaurant data.

**Client-collaborative angle:** None directly. The decision is the client's to make between formats.

**Physical reality:** Screen-based research, often on mobile. Comparing per-person costs between a restaurant and a private chef.

**Compounding:** Medium. Educational content about "private chef vs restaurant" compounds as SEO content. Cost comparison data (per-person pricing) compounds as more chefs publish pricing.

**Solution design:**

- Build a consumer-facing "Why a private chef?" or "Private chef vs restaurant" comparison page (SEO content) that captures high-intent queries like "private chef vs restaurant cost", "is a private chef worth it"
- Surface per-person cost breakdowns prominently in discovery (already on chef profiles when pricing is published)
- Position the private chef value proposition clearly in service pages: customization, dietary control, no-commute, privacy, special occasions

**Where it appears:**

- New SEO landing page: `/why-private-chef` or `/compare/restaurant-vs-private-chef`
- `/how-it-works` page (existing, could be enhanced)
- Chef profile pricing section (existing)

**What remains as permanent exit:**
Restaurant search, reservations, and the dining-out experience are entirely separate ecosystems. ChefFlow will never replace Google Maps, Resy, or OpenTable. The only role is education and positioning.

**Priority:** Medium frequency (common comparison for first-time clients) x Low effort (content page) = MEDIUM
**Spec needed?** No. A content page, not a feature spec.

---

## Scenario #5: Compare chefs on marketplace platforms

**Original classification:** Partially reducible (marketplace-style discovery)
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why client leaves:** The client wants to see multiple chef options with visible reviews, pricing, and portfolio. They go to Thumbtack, Take a Chef, Bark, Cozymeal, or Yelp because those platforms aggregate supply and provide comparison infrastructure. The operational need is: "Show me 5 chefs who serve my area so I can pick one."

**Context ChefFlow has:**

- Full chef directory at `/chefs` with multi-filter search (location, cuisine, service type, dietary, price range, partner type, location experience, best-for)
- Full-text search across chef profiles (`getDirectorySearchChefIds`)
- Location-based filtering with geocoding (`resolvePublicLocationQuery`, `filterChefsByResolvedLocation`)
- Chef cards with profile photos, cuisine tags, location, price tier
- `SaveChefButton` for shortlisting chefs
- Review showcase on chef profiles (`ReviewShowcase`, `getPublicChefReviewFeed`)
- Buyer signals on profiles (`getPublicChefBuyerSignals`)
- Chef availability signals (`getPublicAvailabilitySignals`)
- Sort options (featured, newest, etc.)
- Price range filtering with canonical labels
- Structured data (ItemList) for search engine chef listings

**Data source?** Partially. External marketplace reviews (Take a Chef, Thumbtack) could be imported as social proof. `lib/reviews/external-actions.ts` and `lib/reviews/external-sync.ts` exist, suggesting review aggregation infrastructure is partially built.

**Client-collaborative angle:** Low. This is a supply-side discovery problem. The client needs enough chefs listed on ChefFlow to make comparison meaningful.

**Physical reality:** Screen-based comparison shopping. Side-by-side evaluation on desktop or sequential card browsing on mobile.

**Compounding:** Very high. Every chef who joins the directory makes ChefFlow more competitive with marketplace platforms. Every review collected reduces the need to check external review sites. Network effects compound.

**Solution design:**

- Continue growing the chef directory (supply-side growth is the primary lever)
- Build a quote comparison view for clients with multiple proposals in flight (exists at `/my-quotes/compare`)
- Surface external review counts/ratings on chef profiles where available (partially built via `external-sync.ts`)
- Add "Compare" functionality: let clients select 2-3 chefs from directory and see side-by-side profile comparison
- Strengthen review collection: post-event review prompts, review request workflows

**Where it appears:**

- `/chefs` directory (existing, well-built)
- `/my-quotes/compare` (existing for authenticated clients)
- Chef profile pages with review showcase (existing)
- Potential: `/chefs/compare?ids=x,y,z` side-by-side view

**What remains as permanent exit:**
Marketplace platforms (Thumbtack, Take a Chef, Bark, Cozymeal) will continue to exist as aggregators. Clients who discover chefs through those platforms will book through them initially. ChefFlow's role is to capture the relationship post-first-booking and make the directory compelling enough that repeat clients start their search here.

**Priority:** High frequency (every new client compares options) x Medium effort (directory exists, needs growth and comparison features) = HIGH
**Spec needed?** No. The directory infrastructure is strong. Enhancement items: side-by-side compare view and external review surfacing.

---

## Scenario #6: Check a chef's social presence

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable

**NEEDS-DEVELOPER-REVIEW**

**Why client leaves:** The client wants proof of vibe, personality, and real work. A profile page with text and a headshot is not enough. They want to see the chef's Instagram feed (plated dishes, behind-the-scenes prep), TikTok videos (cooking personality), and personal website. The operational need is "Is this person legit, and do I vibe with their style?"

**Context ChefFlow has:**

- Social links rendered on chef profile pages: Instagram, TikTok, Facebook, YouTube, Linktree (`chef.social_links` object, rendered with tracked outbound links)
- Website URL display when chef opts in (`chef.website_url`, `show_website_on_public_profile`)
- Portfolio gallery on chef profiles (`PortfolioGallery`, photos from events)
- Chef proof summary component (`ChefProofSummary`)
- Chef credentials panel (`ChefCredentialsPanel` with work history, achievements, charity impact)
- Dietary trust strip (`DietaryTrustStrip`)
- Review showcase with ratings
- Buyer signals (booking patterns, response times)
- Availability signals (accepting inquiries, last active)
- Social media publishing infrastructure (`lib/social/` with platform adapters for TikTok, Pinterest, etc.)

**Data source?** Partially. Instagram embeds, TikTok embeds, or at minimum verified link badges could be pulled from social APIs. But the primary value is the client browsing the social feed itself, which is not a data source ChefFlow should replicate.

**Client-collaborative angle:** None. This is the client validating the chef independently.

**Physical reality:** Phone-based browsing. The client taps from the ChefFlow chef profile to Instagram, scrolls the feed, then returns (or doesn't). The round-trip friction is: can they find the social link easily, and does ChefFlow stay in their browser tabs?

**Compounding:** Medium. The chef's social presence is maintained externally. But ChefFlow's portfolio gallery compounds as the chef adds event photos. Verified social links on the profile compound trust over time.

**Solution design:**

- Social links are already prominently displayed on chef profiles (Instagram, TikTok, Facebook, YouTube, Linktree)
- Add Instagram feed preview/embed on chef profile (latest 3-6 posts) to reduce the full exit to a glance
- Add "Verified social" badge when social links are confirmed active (not just stored)
- Ensure social link clicks are tracked (`analyticsName="public_profile_social_instagram"` already exists) so chefs see which platforms drive engagement
- Enrich portfolio galleries: encourage chefs to upload event photos that serve the same vibe-check purpose as Instagram scrolling

**Where it appears:**

- Chef profile page social links section (existing)
- Chef profile portfolio gallery (existing)
- Chef credentials and proof sections (existing)

**What remains as permanent exit:**
Instagram, TikTok, and personal websites will always be the definitive social presence. ChefFlow is not a social platform and should not try to replace the feed. The bridge is: make social links easy to find, track the click, and ensure the ChefFlow profile has enough visual proof that some clients skip the social check entirely.

**Priority:** High frequency (most clients check social before booking) x Low effort (social links already exist, enhancements are incremental) = MEDIUM
**Spec needed?** No. Current social link infrastructure is solid. Enhancement: Instagram preview embed and verified social badge.

---

## Scenario #7: Validate whether ChefFlow serves their area

**Original classification:** Reducible
**Reclassified to:** Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why client leaves:** The client found ChefFlow but is unsure whether there are chefs available in their geographic area. They search Google for "private chef [their city]" or check the chef's website for service area details. The operational need is location confidence: "Will this work where I live?"

**Context ChefFlow has:**

- Location-based search on `/chefs` with geocoding (`resolvePublicLocationQuery`)
- Service area display on chef profiles (`service_area_city`, `service_area_state`, coverage radius)
- State facets and location filtering in directory
- `WaitlistCapture` component on zero-result pages ("We will email you when chefs join your area")
- Homepage location context from saved location cookie (`getServerSavedLocation`)
- Public platform stats showing city count (`cityCoveredCount`)
- Chef coverage display (`getChefCoverage` in directory utils)
- Location error messaging when geocoding fails
- Service type landing pages with location context

**Data source?** No. ChefFlow IS the data source for its own coverage. This is entirely an internal UX and content problem.

**Client-collaborative angle:** None needed. This is a supply visibility problem.

**Physical reality:** Screen-based. Mobile or desktop search. The client needs an instant, clear answer: "Yes, we have chefs in [your area]" or "Not yet, but join the waitlist."

**Compounding:** Very high. Every chef who joins the directory expands coverage. Location landing pages compound in search rankings. Waitlist data reveals demand gaps that inform chef recruitment.

**Solution design:**

- Build programmatic `/chefs/near/[city-state]` or `/private-chef-[city]-[state]` location landing pages that show: (a) number of chefs serving that area, (b) chef cards, (c) service types available, (d) waitlist if zero results
- Add clear service area messaging at the top of the `/chefs` directory when location is detected or entered: "X chefs serve [location]" or "No chefs in [location] yet. Join the waitlist."
- Ensure the homepage hero adapts to detected location (partially done with `serverSavedLocation` preferring local chefs in the featured rail)
- Build a simple "/coverage" or "/areas" page that visualizes which states/cities have active chefs
- Improve the zero-results experience: waitlist capture (already exists), nearby areas with coverage, and a "request a chef" form

**Where it appears:**

- `/chefs` directory with location filter (existing)
- `/chefs?location=[city]` filtered results (existing)
- `WaitlistCapture` on zero-result pages (existing)
- Homepage with location-aware featured chefs (existing)
- New: `/chefs/near/[city-state]` programmatic landing pages
- New: `/coverage` or `/areas` service area map

**What remains as permanent exit:**
Nothing, if built properly. This exit is fully reducible. A client should never need to leave ChefFlow to determine whether it serves their area. The answer is either "yes, here are your chefs" or "not yet, join the waitlist."

**Priority:** High frequency (every new client asks this) x Medium effort (location pages need to be generated, zero-results UX needs polish) = CRITICAL
**Spec needed?** Yes (location landing pages and service area visibility spec)

---

## Batch Summary

| #   | Title                                          | Reclassified To     | Spec Needed?                     |
| --- | ---------------------------------------------- | ------------------- | -------------------------------- |
| 1   | Search for a private chef from scratch         | Partially Reducible | Yes (location SEO landing pages) |
| 2   | Ask friends for chef recommendations           | Bridgeable          | No                               |
| 3   | Browse food inspiration before choosing a chef | Permanent           | No                               |
| 4   | Search for local restaurant alternatives       | Permanent           | No                               |
| 5   | Compare chefs on marketplace platforms         | Partially Reducible | No                               |
| 6   | Check a chef's social presence                 | Bridgeable          | No                               |
| 7   | Validate whether ChefFlow serves their area    | Reducible           | Yes (service area visibility)    |

### Classification Distribution

| Classification      | Count |
| ------------------- | ----- |
| Reducible           | 1     |
| Partially Reducible | 2     |
| Bridgeable          | 2     |
| Permanent           | 2     |

### Key Findings

1. **ChefFlow's discovery infrastructure is already strong.** The `/chefs` directory, `/eat` feed, chef profiles with social links, portfolio galleries, reviews, and structured data provide a solid foundation. Most scenarios are Permanent or Bridgeable, not because ChefFlow is missing features, but because the exit destinations (Google, Instagram, friend conversations, restaurant platforms) are fundamentally different ecosystems.

2. **The biggest reducible gap is location confidence (#7).** A client should never leave ChefFlow to find out if it serves their area. Programmatic location landing pages and improved zero-results UX would close this entirely.

3. **SEO is the primary lever for #1 (discovery from scratch).** ChefFlow already has the structured data and content. The gap is programmatic location-specific landing pages that capture "private chef [city]" search queries.

4. **Social bridge infrastructure exists and works (#2, #6).** Chef profiles render social links (Instagram, TikTok, etc.), referral tracking exists, hub groups support friend-to-friend sharing. Enhancements are incremental, not structural.

5. **All 7 scenarios marked NEEDS-DEVELOPER-REVIEW.** Solo evaluation cannot determine the developer's priorities for SEO investment, social embed preferences, or location page strategy. Developer operational expertise needed for scenarios #1 (SEO priority) and #7 (coverage communication approach).
