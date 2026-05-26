# Exit Eval: Guest / PUBLIC DISCOVERY & TRUST VALIDATION

> Wave 4 | 7 scenarios | Role: GUEST
> Evaluator mode: Solo (NEEDS-DEVELOPER-REVIEW)
> Date: 2026-05-25

---

## Scenario #1: Search for private chefs before landing on ChefFlow

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** The guest has an unmet need (private chef for an event) and begins their journey on Google, Bing, or social search. Discovery begins outside any product because the guest does not yet know ChefFlow exists. The decision is "who can I hire?" and the action is a general search query.

**Context ChefFlow has:**

- Full chef directory at `/chefs` with structured data (JsonLd FoodService schema)
- SEO metadata: title, description, keywords ("hire private chef", "private chef near me", etc.)
- Sitemap (`app/sitemap.ts`) includes homepage, `/book`, `/chefs`, `/services`, individual chef profiles, cuisine pages, compare pages, nearby listings, ingredient pages
- BreadcrumbList and FoodService structured data on each chef profile page
- Service-area and pricing info in schema markup for Google rich results
- Compare pages (`/compare/honeybook`, etc.) targeting competitive search queries

**Data source?** No. Search engines are the distribution channel, not a data source ChefFlow can ingest.

**Client-collaborative angle:** None. This is pre-relationship; no Circle or client context exists yet.

**Physical reality:** Screen-first. Guest is on phone/desktop browsing. No special interface needs.

**Compounding:** High. Every SEO investment (structured data, content pages, chef profiles) compounds permanently. Each new chef profile adds a new indexable page.

**Solution design:**

- Already built: JsonLd structured data on chef profiles, directory, services pages
- Already built: sitemap generation covering all public pages
- Already built: compare pages targeting competitive keywords
- Strengthen: local landing pages per metro/state (partially exists via cuisine pages)
- Strengthen: "private chef [city]" intent pages from service type x location combos

**Where it appears:**

- `app/sitemap.ts` (sitemap generation)
- `app/(public)/chef/[slug]/page.tsx` (ChefProfileJsonLd, ChefBreadcrumbJsonLd, generateMetadata)
- `app/(public)/chefs/page.tsx` (directory with SEO metadata and keywords)
- `app/(public)/compare/[slug]/page.tsx` (competitive SEO)
- `app/(public)/services/[slug]/page.tsx` (service intent pages)
- `app/(public)/cuisines/[slug]/page.tsx` (cuisine intent pages)

**What remains as permanent exit:**
Search engines own the discovery funnel. ChefFlow cannot replace Google. The guest will always start externally unless they have a direct link or return visit.

**Priority:** Very high frequency x low incremental effort (infrastructure exists) = P2 maintenance
**Spec needed?** No. SEO infrastructure is already substantial. Incremental local pages are a content task.

---

## Scenario #2: Validate a chef's reputation

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why guest leaves:** The guest found a chef on ChefFlow but needs third-party proof that this chef is good. They leave to check Google Reviews, Yelp, Instagram comments, or the chef's own website. The underlying decision is "can I trust this person in my home with my guests?"

**Context ChefFlow has:**

- Unified review feed aggregating multiple platforms: `lib/reviews/public-actions.ts` (supports Google, Yelp, Airbnb, Facebook, TripAdvisor, Thumbtack, Bark, GigSalad, TaskRabbit, Instagram, TakeAChef, Nextdoor, Angi, Houzz, and more)
- `ReviewShowcase` component displaying star ratings, platform breakdown chips, and individual reviews
- `ChefProofSummary` component with aggregate rating, platform source chips, and Google Review URL link-out
- Trust tier system (`deriveReviewTrustTier`) and link health assessment (`assessReviewSourceUrl`)
- Verified event flag on reviews (proves review ties to a real ChefFlow event)
- Guest testimonials from in-app guest feedback forms
- Work history, achievements, charity impact, credentials panel, and insurance badges
- `DietaryTrustStrip` component for dietary safety signals
- Schema.org AggregateRating in structured data

**Data source?** Partially. Google Places API could supply live review snippets. Yelp API is restricted. Most platforms do not offer free embed APIs, so ChefFlow ingests reviews manually or through chef-submitted records.

**Client-collaborative angle:** Past clients provide reviews through `/review/[token]` and `/guest-feedback/[token]`. Guests who attend events can leave testimonials that compound the proof library.

**Physical reality:** Screen browsing. No special interface needs.

**Compounding:** Very high. Every review collected stays permanently. A chef with 50 in-app reviews rarely needs external validation. Platform breakdown shows breadth of proof sources.

**Solution design:**

- Already built: multi-platform review aggregation with source labels and trust tiers
- Already built: Google Review URL link-out for guests who still want external verification
- Already built: verified-event badge proving a review ties to a real completed event
- Strengthen: auto-import from Google Places API for chefs who connect their Google Business Profile
- Strengthen: "See on Google" / "See on Yelp" direct links next to source chips so the guest can spot-check without searching

**Where it appears:**

- `app/(public)/chef/[slug]/page.tsx` (ReviewShowcase, ChefProofSummary, structured data)
- `components/public/review-showcase.tsx` (star display, platform breakdown)
- `components/public/chef-proof-summary.tsx` (aggregate proof block)
- `lib/reviews/public-actions.ts` (getPublicChefReviewFeed, platform labels, trust tiers)
- `components/public/chef-credentials-panel.tsx` (insurance, certifications)

**What remains as permanent exit:**
Guests who require seeing the review natively on Google/Yelp (to verify it was not fabricated) will always click through. ChefFlow cannot fully replace the trust signal of reviews living on a third-party platform the guest already trusts. But aggregation reduces the need to search for it.

**Priority:** High frequency x medium effort (API integration) = P1
**Spec needed?** No. The aggregation system is already robust. Google Places auto-import is a single integration enhancement.

---

## Scenario #3: Check a chef's social presence

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why guest leaves:** The guest wants to see the chef's plating style, personality, kitchen vibe, and how recently they posted. Social media provides recency signals ("are they still active?") and aesthetic/personality signals that a static profile cannot replicate.

**Context ChefFlow has:**

- `social_links` stored per chef: Instagram, TikTok, Facebook, YouTube, Linktree
- Social link icons rendered on the chef profile page (lines 1038-1115 of chef profile page)
- `external_long_form_links` for additional links (blogs, press, etc.)
- `sameAs` array in JsonLd structured data includes all social/external links
- `PublicFollowHandoff` component for "Save chef" and "Ask for updates"
- Portfolio gallery with event photos (`PortfolioGallery`, `getPublicPortfolio`, `getPublicPortfolioEntries`)
- Location experience showcase with seasonal photos

**Data source?** No. Social feeds are proprietary and rate-limited. Instagram/TikTok do not offer free embed APIs for profile feeds. oEmbed exists for individual posts but not profile browsing.

**Client-collaborative angle:** None directly. But past event guests who upload photos to Circle galleries or recap pages create an alternative photo library that serves a similar purpose.

**Physical reality:** Screen browsing, scroll-heavy content. The guest expects an Instagram-like visual feed.

**Compounding:** Medium. Social links are static (set once, rarely change). But the portfolio gallery compounds with every event photographed.

**Solution design:**

- Already built: social link icons on chef profile (Instagram, TikTok, Facebook, YouTube, Linktree)
- Already built: portfolio gallery showing real event photos
- Already built: location experience showcase with partner venue photos
- Strengthen: embed latest Instagram posts via oEmbed (individual posts, not full feed)
- Strengthen: "Last posted X days ago" recency signal if Instagram Basic Display API returns anything
- Keep: clear social link-outs with "open in new tab" pattern and browser-back return path

**Where it appears:**

- `app/(public)/chef/[slug]/page.tsx` (social links section, portfolio)
- `components/profile/portfolio-gallery.tsx` (event photo gallery)
- `components/public/location-experience-showcase.tsx` (venue/seasonal photos)
- `lib/chef/profile-actions.ts` (social_links schema and storage)

**What remains as permanent exit:**
Guests want to see live social feeds (stories, reels, recent posts). ChefFlow cannot replicate a social timeline. The exit is permanent for "browse their feed," but bridgeable because ChefFlow already provides clear links and an alternative visual proof layer via portfolio.

**Priority:** Medium frequency x high effort (API integration fragile) = P2
**Spec needed?** No. Social links are already visible. oEmbed enhancement is a nice-to-have, not critical.

---

## Scenario #4: Compare private chef against restaurants

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why guest leaves:** The guest has not yet decided on the FORMAT of their dining experience. They are comparing "should I book a private chef or just go to a nice restaurant?" This is a fundamental purchasing decision about the category, not just the provider.

**Context ChefFlow has:**

- Compare pages infrastructure (`lib/marketing/compare-pages.ts`) with structured capability comparison tables
- Existing comparisons: ChefFlow vs HoneyBook, and other software alternatives
- "How it works" page explaining the private dining experience
- Public event pages (`/e/[shareToken]`) showing what a chef event looks like
- Pricing transparency on chef profiles (per-person rates, ranges)
- Service type labels: "Private dinner", "Catering", "Meal prep", "Cook-and-leave"
- FAQ pages with structured data

**Data source?** Partially. Restaurant pricing from Google Maps/Yelp APIs could provide "equivalent restaurant meal = $X vs private chef = $Y" context, but this is complex and fragile.

**Client-collaborative angle:** None. This is a pre-relationship format decision.

**Physical reality:** Screen browsing. Research mode. The guest is weighing options, likely with a browser tab open for each.

**Compounding:** Medium. Educational content about "why private chef vs restaurant" is evergreen. Once written, it serves every future guest making this decision.

**Solution design:**

- Already built: compare pages infrastructure (currently targeting software alternatives)
- Build: "Private Chef vs Restaurant" comparison page at `/compare/restaurants` explaining format differences (personalization, dietary control, convenience, per-person economics at scale, privacy)
- Build: calculator showing "dinner for 8 at [price tier] restaurant = $X; private chef for 8 = $Y" using PIE pricing data
- Strengthen: guest count economics on chef profiles ("from $X/person for parties of 6-12")

**Where it appears:**

- `app/(public)/compare/[slug]/page.tsx` (comparison page framework)
- `lib/marketing/compare-pages.ts` (compare page data structure)
- `app/(public)/how-it-works/page.tsx` (format education)
- `app/(public)/pricing/page.tsx` (pricing education)

**What remains as permanent exit:**
Guests comparing specific restaurants (checking menus, availability, reservations on Resy/OpenTable) will always leave. ChefFlow cannot replace restaurant discovery platforms. But the format-level decision ("is a private chef right for my event?") is reducible with educational content.

**Priority:** Medium frequency x low effort (content page) = P1
**Spec needed?** No. Uses existing compare page infrastructure. A content creation task.

---

## Scenario #5: Research food operators in local directory results

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why guest leaves:** The guest found a food operator on ChefFlow's Nearby directory (`/nearby`) and clicks through to the operator's own website, social profiles, or Google Maps listing to learn more. The Nearby directory lists non-ChefFlow operators, so external profiles are the primary information source.

**Context ChefFlow has:**

- Nearby directory with listing cards showing trust tones (verified, claimed, public, warning, muted)
- `DirectoryListingSummary` type with business type, cuisine, distance, trust signals
- Trust tier presentation system in `listing-card.tsx` (verified > claimed > public > warning > muted)
- External link indicators and website URLs on listings
- Favorite/save button on directory cards (`DirectoryFavoriteButton`)
- Collections system grouping operators by theme
- Unmet demand capture form for areas without coverage
- Submit listing form for operators to claim/add their profile

**Data source?** Partially. Google Places API enrichment powers some listing data. But operator websites, social profiles, and menus are external and cannot be fully ingested without crawling.

**Client-collaborative angle:** None at this stage. The guest is browsing, not yet in a relationship.

**Physical reality:** Screen browsing. Location-aware (map/distance context). Mobile-first for "near me" queries.

**Compounding:** Medium. Directory listings accumulate and improve over time. Trust tiers compound as operators verify/claim profiles.

**Solution design:**

- Already built: trust tier system with visual confidence indicators
- Already built: "Book a Chef" CTA always visible near external operator listings
- Already built: favorite/save functionality for return visits
- Strengthen: show more inline detail (hours, price range, cuisine focus) to reduce need to click out
- Strengthen: "Back to Nearby" return path should be sticky/obvious after external click
- Strengthen: if operator has a ChefFlow chef profile (linked), highlight "Full profile available on ChefFlow"

**Where it appears:**

- `app/(public)/nearby/page.tsx` (directory page)
- `app/(public)/nearby/[slug]/page.tsx` (individual listing detail)
- `app/(public)/nearby/_components/listing-card.tsx` (card with trust tones and external links)
- `app/(public)/nearby/_components/nearby-browse-hubs.tsx` (browse by area)
- `lib/discover/trust.ts` (trust tier logic)

**What remains as permanent exit:**
Non-ChefFlow operators do not have profiles inside ChefFlow. The guest must visit external sites for menus, hours, and booking. This exit is permanent for operators who are not on ChefFlow. For operators who also have a ChefFlow profile, the exit is reducible.

**Priority:** Low frequency (nearby is hidden from public nav) x medium effort = P3
**Spec needed?** No. The bridging pattern (trust indicators + return paths) exists.

---

## Scenario #6: Ask friends whether a chef is worth booking

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why guest leaves:** The guest trusts their social network more than any platform review. They want to text a friend "have you used this chef?" or share the profile in a group chat for opinions. Trust validation is inherently social and happens in existing messaging channels.

**Context ChefFlow has:**

- Public chef profile pages with shareable URLs (clean `/chef/[slug]` paths)
- OpenGraph metadata on chef profiles (title, description, image) for rich link previews in messaging apps
- Twitter card metadata for social sharing
- Guest lead form at `/g/[code]` with QR codes (designed for in-person "I just had this chef" sharing)
- `PublicFollowHandoff` component with save/follow actions
- Public event pages (`/e/[shareToken]`) shareable for past attendees to forward
- Dinner Circle shareable links (group context for friends who attended together)

**Data source?** No. Friend-to-friend trust is a social interaction, not a data source.

**Client-collaborative angle:** Strong. Past event attendees become trust ambassadors. If a friend attended a dinner, their presence in the Circle or their review in the feed IS the social proof. The `/g/[code]` QR flow captures "I was at this dinner and my friend wants to book."

**Physical reality:** Mobile-first. Copy-paste URLs into messaging apps. Rich link previews matter significantly (the guest sees a preview before clicking).

**Compounding:** High. Every shareable link, every OpenGraph preview, and every guest-to-lead conversion builds the word-of-mouth flywheel. The QR guest lead form is the physical-world bridge.

**Solution design:**

- Already built: OpenGraph and Twitter card metadata on all public pages
- Already built: `/g/[code]` guest lead form with QR for in-person referrals
- Already built: clean shareable URLs with no auth tokens in the path
- Strengthen: add explicit "Share this chef" button with native share sheet on mobile
- Strengthen: generate pre-written copy blocks ("I had dinner by [chef] and it was amazing, check them out: [link]")
- Strengthen: after guest feedback submission, offer "Share with a friend who'd love this" with prefilled text

**Where it appears:**

- `app/(public)/chef/[slug]/page.tsx` (generateMetadata with OG/Twitter)
- `app/(public)/g/[code]/page.tsx` (guest lead capture after in-person referral)
- `components/guest-leads/guest-lead-form.tsx` (lead form)
- `components/public/public-follow-handoff.tsx` (save/follow actions)

**What remains as permanent exit:**
The actual conversation ("is this chef worth it?") happens in text/WhatsApp/group chat. ChefFlow cannot replace private messaging. But ChefFlow can make the sharing frictionless and the return path clear.

**Priority:** High frequency x low effort (share button + copy blocks) = P1
**Spec needed?** No. Infrastructure exists. A "Share this chef" native share button is a small UI addition.

---

## Scenario #7: Verify service area manually

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why guest leaves:** The guest is unsure whether the chef will travel to their location. The profile says "Serves [city]" but the guest lives 25 miles away or in an adjacent town. They leave to Google the chef's coverage, check the chef's own website for service area details, or look at maps to estimate distance.

**Context ChefFlow has:**

- Full service area data per chef: `service_area_city`, `service_area_state`, `service_area_zip`, `service_area_lat`, `service_area_lng`, `service_area_radius_miles`
- Location label displayed on profile hero ("Serves [city, state]")
- Travel radius in buyer signals: `travelRadiusMiles` and `travelFeeCents`
- Explicit travel radius messaging: "X miles before added travel fees"
- Travel fee disclosure: "$X published travel fee" or "Travel fees may apply outside the included radius"
- Location search in directory: `lib/directory/location-search.ts` with `filterChefsByResolvedLocation`
- Geo resolution: `lib/geo/public-location.ts` resolves guest location queries
- Service area in JsonLd structured data (`areaServed` with Place type)
- Availability signals (next available date, lead time)

**Data source?** Yes. Geocoding APIs (already used) can determine if a guest's location falls within a chef's service radius. This is a solvable calculation.

**Client-collaborative angle:** The guest provides their event location during inquiry. ChefFlow can pre-qualify fit before the guest even asks.

**Physical reality:** Screen. The guest types an address or zip and wants a yes/no answer.

**Compounding:** High. Once service area is configured, it serves every future guest checking the same chef. Radius + fee data is set once and displayed forever.

**Solution design:**

- Already built: service area display on chef profiles (city, state, radius)
- Already built: travel radius and fee messaging in buyer signals section
- Already built: location-based filtering in directory search
- Build: "Check if I'm in range" widget on chef profile that accepts zip/city and returns yes/no/maybe with travel fee estimate
- Build: on inquiry form, pre-validate location against chef radius before submission and show immediate "This chef serves your area" or "Outside typical range; travel fee may apply"
- Strengthen: show radius on a mini-map or explicit "within X miles of [city]" copy

**Where it appears:**

- `app/(public)/chef/[slug]/page.tsx` (locationLabel, travelRadiusLabel, travelFeeLabel in buyer signals)
- `lib/discovery/profile.ts` (DiscoveryProfile with service_area fields)
- `lib/directory/location-search.ts` (geo filtering logic)
- `lib/geo/public-location.ts` (location resolution)
- `lib/profile/actions.ts` (getPublicChefProfile fetches service area data)

**What remains as permanent exit:**
If ChefFlow builds the "check if I'm in range" widget, no exit remains for this scenario. Guests who want to verify via maps for driving time estimation may still leave, but the core "does this chef come to me?" question is fully answerable in-app.

**Priority:** High frequency x low effort (widget using existing geo data) = P0
**Spec needed?** Yes. A "service area checker" widget on the chef profile is a discrete buildable feature.

---

## NEEDS-DEVELOPER-REVIEW

All 7 scenarios above were evaluated in solo mode without developer input. Scenarios where chef operational knowledge would most change the classification:

- **#4** (Compare vs restaurants): Developer may have strong opinions on how to frame the value proposition and what price comparisons resonate with real prospects.
- **#6** (Ask friends): Developer may know the actual word-of-mouth patterns from 10+ years of private chef work and how referrals actually happen.
- **#7** (Service area): Developer knows how often "am I in range?" kills leads and what the actual coverage communication looks like in practice.

---

## Batch Summary

| #   | Title                                               | Reclassified To     | Spec Needed? |
| --- | --------------------------------------------------- | ------------------- | ------------ |
| 1   | Search for private chefs before landing on ChefFlow | Permanent           | No           |
| 2   | Validate a chef's reputation                        | Partially Reducible | No           |
| 3   | Check a chef's social presence                      | Bridgeable          | No           |
| 4   | Compare private chef against restaurants            | Partially Reducible | No           |
| 5   | Research food operators in local directory results  | Bridgeable          | No           |
| 6   | Ask friends whether a chef is worth booking         | Bridgeable          | No           |
| 7   | Verify service area manually                        | Reducible           | Yes          |
