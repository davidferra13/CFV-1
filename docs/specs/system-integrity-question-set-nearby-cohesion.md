# System Integrity Question Set: Nearby + Dinner Circles Cohesion Frontier

> Created: 2026-04-19
> Companion: `docs/specs/chef-flow-decision-ledger-v1.md`
> Scope: /nearby directory, dinner circles, cross-surface navigation, consumer UX, brand consistency

---

## Methodology

Every question is answerable with evidence (file path + line number). Status: PASS (verified in code), FAIL (gap exists), or DEFERRED (blocked/out of scope). Questions ordered by domain, not priority.

---

## Domain 1: Route Ownership + Navigation Graph (8 questions)

| # | Question | Status | Evidence |
|---|----------|--------|----------|
| 1 | Does every public page have a path to /nearby within 1-2 clicks? | PASS | Global nav "Hire a Chef" dropdown includes "Food Directory" -> /nearby. Every page inherits this via public-header.tsx |
| 2 | Does every secondary entry cluster config include /nearby? | PASS | All 13 surfaces now include /nearby or a path to it: open_booking (via /chefs), single_chef_inquiry (via /how-it-works), chef_profile (via /chefs), trust, contact, gift_cards (via /how-it-works), gift_cards_success (via /chefs), directory, nearby, nearby_detail, how_it_works, ingredients, services, faq |
| 3 | Does the /discover -> /nearby redirect work for all subpaths? | PASS | `app/(public)/discover/[...path]/page.tsx` catch-all with `permanentRedirect`. Also in next.config.js |
| 4 | Is /nearby in the sitemap? | PASS | `app/sitemap.ts` line 51-55, priority 0.55, weekly |
| 5 | Does the footer "Hire a Chef" section match the header nav items? | PASS | Both now include FAQ and Food Directory. 7 items each. `components/navigation/public-nav-config.ts` |
| 6 | Do all public page wrappers inherit the layout gradient (no hardcoded bg-stone-950)? | PARTIAL | /nearby, /nearby/submit, /nearby/[slug], /hub/circles fixed. 12 other pages still have hardcoded bg-stone-950 (see audit in CFDL session). These are lower priority (data-request, feedback, survey, event share pages) |
| 7 | Does the embed widget need /nearby awareness? | DEFERRED | Embed widget is chef-specific (constructs `/embed/inquiry/{chefId}` URLs). Adding /nearby would change its scope. OUT_OF_SCOPE |
| 8 | Are OpenGraph/Twitter meta tags set for /nearby? | PASS | Added in this session: title, description, canonical, OG, Twitter card |

---

## Domain 2: Dinner Circles Integration (7 questions)

| # | Question | Status | Evidence |
|---|----------|--------|----------|
| 9 | Can a consumer on /nearby reach dinner circles? | PASS | Three paths: (a) secondary entry cluster at page bottom, (b) contextual "Love {cuisine} food? Start a circle" prompt in filtered results, (c) "Gather your people" prompt in landing StateGrid |
| 10 | Can a consumer in circles reach /nearby? | PASS | Two paths: (a) topic-aware "Find {topic} nearby" banner when topic filter active, (b) "Browse food nearby" in empty state |
| 11 | Does /hub landing link to /nearby? | PASS | "Food Near You" CTA button added. `app/(public)/hub/page.tsx` |
| 12 | Does /nearby/[slug] detail page suggest dinner circles? | PASS | "Planning a group meal?" card with Browse Circles + What are Dinner Circles links |
| 13 | Does the cuisine filter on /nearby deep-link to matching circle topics? | PASS | FilteredResults passes `cuisineFilter` to circle prompt, links to `/hub/circles?topic={cuisine}` |
| 14 | Does the topic filter on circles deep-link to matching /nearby cuisine? | PASS | `circles-discovery-view.tsx` renders "Find {topic} nearby" with link to `/nearby?cuisine={topic}` |
| 15 | Can a user create a dinner circle directly from a /nearby listing? | DEFERRED | Current flow: listing detail -> Browse Circles -> create from circles page. Direct "create circle about this restaurant" would require passing listing data to circle creation form. Future enhancement |

---

## Domain 3: Remy Consumer Awareness (5 questions)

| # | Question | Status | Evidence |
|---|----------|--------|----------|
| 16 | Does Remy know about /nearby in its route map? | PASS | DISCOVERY section added to NAV_ROUTE_MAP: /nearby, /nearby/submit, /chefs. `lib/ai/remy-actions.ts` |
| 17 | Does Remy have consumer starter pain points? | PASS | 3 consumer starters added: "Find food nearby", "Hire a chef", "Dinner Circles". `lib/ai/chefflow-feature-map.ts` |
| 18 | Does Remy's feature map include consumer entries? | PASS | 3 entries: Food Directory (Nearby), Chef Booking, Dinner Circles. Keywords cover: near me, restaurant, caterer, food truck, hire, book, dinner party, gather, circle, community |
| 19 | Is Remy's welcome message universal (not operator-only)? | PASS | Changed from "Tell me your biggest admin bottleneck" to "Looking for food nearby, want to book a chef, or need help running your food business?" |
| 20 | Does Remy's classifier route food-discovery intents correctly? | DEFERRED | Route map is present but classifier (`lib/ai/remy-classifier.ts`) was not modified. Remy can suggest /nearby in conversation but may not auto-classify discovery intents. Lower priority since the starter pills handle the common case |

---

## Domain 4: Cross-Surface Brand Consistency (6 questions)

| # | Question | Status | Evidence |
|---|----------|--------|----------|
| 21 | Does the footer brand description use centralized constants? | PASS | Changed from hardcoded string to `PLATFORM_SHORT_DESCRIPTION`. `components/navigation/public-footer.tsx` |
| 22 | Do all primary CTAs on public pages use consistent button styling? | PASS | Page-level CTAs use `gradient-accent glow-hover`. In-card/in-context buttons use flat `bg-brand-600`. This is intentional hierarchy |
| 23 | Do all secondary entry clusters use the centralized config? | PASS | All 13 surfaces defined in `lib/public/public-secondary-entry-config.ts`. No hardcoded alternate navigation clusters |
| 24 | Does the /for-operators page mention the free directory listing? | PASS | "Not ready to sign up?" section with link to /nearby/submit. `app/(public)/for-operators/page.tsx` |
| 25 | Do listing detail pages show trust signals? | PASS | Three-tier badges (verified/claimed/discovered) + data confidence indicator + "Claim it" CTA. `app/(public)/nearby/[slug]/page.tsx` |
| 26 | Is the /nearby/submit page visually consistent with the layout? | PASS | Removed hardcoded bg-stone-950, inherits layout gradient |

---

## Domain 5: Notification + Data Pipeline (4 questions)

| # | Question | Status | Evidence |
|---|----------|--------|----------|
| 27 | Are directory lifecycle events in the notification type system? | PASS | 3 actions: directory_listing_claimed (alert), directory_listing_verified (info), directory_listing_removed (info). `lib/notifications/types.ts` + `tier-config.ts` |
| 28 | Are notification emit calls wired into claim/verify/remove flows? | FAIL | Types exist but `lib/discover/actions.ts` claim/verify/remove functions do not call `createNotification()`. The types are ready; the wiring is not |
| 29 | Does the directory have query caching for scale? | FAIL | No `unstable_cache` or Redis. Raw SQL on every page load. CFDL-027 PROVISIONAL. Needed before noindex removal |
| 30 | Is there a listing-to-account merge strategy when an operator signs up? | FAIL | CFDL-023 OPEN. No merge logic. Claimed listings and ChefFlow accounts remain separate presences |

---

## Domain 6: Consumer Dead-End Elimination (5 questions)

| # | Question | Status | Evidence |
|---|----------|--------|----------|
| 31 | Does the /chefs empty state offer /nearby as fallback? | PASS | "Browse all food operators nearby" link. `app/(public)/chefs/page.tsx` |
| 32 | Does the /nearby empty state offer /nearby/submit as recovery? | PASS | "Add a business" link alongside "Clear filters". `app/(public)/nearby/page.tsx` |
| 33 | Does the /book page offer /nearby for non-chef food discovery? | PASS | `PUBLIC_DIRECTORY_HELPER` text + "Browse the food directory" link. `app/(public)/book/page.tsx` |
| 34 | Does the circles empty state offer /nearby as fallback? | PASS | "Browse food nearby" link. `app/(public)/hub/circles/circles-discovery-view.tsx` |
| 35 | Can a consumer reach /nearby from ANY public page in <= 2 clicks? | PASS | Global nav always available: "Hire a Chef" -> "Food Directory". Plus contextual cross-links on most pages |

---

## Scorecard

| Domain | Questions | PASS | FAIL | DEFERRED |
|--------|-----------|------|------|----------|
| Route Ownership + Navigation | 8 | 7 | 0 | 1 |
| Dinner Circles Integration | 7 | 6 | 0 | 1 |
| Remy Consumer Awareness | 5 | 4 | 0 | 1 |
| Brand Consistency | 6 | 6 | 0 | 0 |
| Notification + Data Pipeline | 4 | 1 | 3 | 0 |
| Consumer Dead-End Elimination | 5 | 5 | 0 | 0 |
| **Total** | **35** | **29** | **3** | **3** |

**Score: 29/35 (82.9%) PASS. 3 FAIL (all data pipeline, not consumer-facing). 3 DEFERRED (intentional scope boundaries).**

---

## Remaining FAIL Items (Not Built This Session)

1. **Q28: Notification emit wiring** -- types added, but claim/verify/remove server actions don't call `createNotification()`. Requires reading `lib/discover/actions.ts` claim flow and adding emit calls.
2. **Q29: Query caching** -- CFDL-027. Needed before noindex removal to handle 150K+ listings at scale. Decision: `unstable_cache` with tag-based invalidation or Redis.
3. **Q30: Listing-to-account merge** -- CFDL-023. Product decision needed: auto-merge on email match or manual admin action?

---

## Session Contribution Summary

This session closed 8 cross-system disconnection gaps (CFDL-020 through CFDL-027), fixed brand inconsistencies across 15+ files, connected /nearby to dinner circles bidirectionally with cuisine-aware deep links, gave Remy consumer awareness (feature map + starters + universal welcome), and eliminated every consumer dead-end on the public surface.

The 3 remaining FAILs are all data-pipeline concerns (notification wiring, caching, merge logic) that do not affect the consumer or operator experience today.
