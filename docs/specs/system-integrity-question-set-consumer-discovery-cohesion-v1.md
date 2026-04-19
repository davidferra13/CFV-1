# System Integrity Question Set: Consumer Discovery & Cross-User Cohesion V1

> **Date:** 2026-04-19
> **Scope:** Every surface, flow, and data boundary where non-chef users interact with ChefFlow. Forces full specification of consumer discovery, guest experience, operator acquisition, post-event lifecycle, directory cohesion, and cross-boundary data integrity.
> **Method:** Deep MemPalace mining (293K+ drawers), full codebase audit (78+ public pages), spec contradiction analysis, cross-boundary flow tracing.
> **Philosophy:** The system works well today. This audit finds cohesion gaps between working parts, not broken parts. Even "unrelated" features get examined for missed connections.

---

## Scoring Key

| Status          | Meaning                                           |
| --------------- | ------------------------------------------------- |
| **PASS**        | Fully built, verified, no gaps                    |
| **PARTIAL**     | Built but incomplete, degraded, or disconnected   |
| **FAIL**        | Not built, broken, or dead-ending                 |
| **INTENTIONAL** | Deliberately not built, with documented rationale |
| **DEFERRED**    | Discussed, specced, or partially built but paused |

---

## Domain 1: Unified Discovery (The Core Gap)

> **Context:** Three separate discovery systems exist (`/chefs`, `/nearby`, `/hub/circles`) serving overlapping consumer intents. The `/eat` spec proposes unifying them but is unbuilt. MemPalace reveals the vision: "This isn't 'find a private chef.' This is 'find food experiences.'"

| #    | Question                                                                                                                                           | Status      | Evidence                                                                                                                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1  | Can a consumer search across chefs AND food businesses AND community circles in a single query?                                                    | **FAIL**    | Three separate data models (`chefs`, `directory_listings`, `hub_groups`), three separate query functions, no unified search. Each surface has its own search.                                                |
| 1.2  | Does a unified discovery feed exist that blends all three data sources?                                                                            | **FAIL**    | `getConsumerDiscoveryFeed()` specced in `consumer-first-discovery-and-dinner-planning-expansion.md` but never built. No file at `lib/public-consumer/discovery-actions.ts`.                                  |
| 1.3  | When a consumer lands on the homepage with the intent "I want to eat something good tonight," does the UX guide them to an answer within 3 clicks? | **PARTIAL** | Homepage has `HomepageSearch` + category tiles linking to `/chefs?serviceType=X`. Gets to chef list in 2 clicks. But no "tonight" urgency, no availability-aware results, no food-type discovery path.       |
| 1.4  | Is the relationship between `/chefs`, `/nearby`, and `/hub/circles` self-evident to a first-time visitor?                                          | **FAIL**    | All three live under "Hire a Chef" dropdown. Labels ("Browse Chefs", "Food Directory", "Dinner Circles") describe what they ARE, not what the consumer WANTS. No mental-model bridge.                        |
| 1.5  | Can a consumer filter by dietary restriction across ALL discovery surfaces simultaneously?                                                         | **FAIL**    | `/chefs` has dietary filter (7 categories). `/nearby` has no dietary filter. `/hub/circles` has no dietary filter. No cross-surface filtering.                                                               |
| 1.6  | Does `/eat` exist as the consumer-first entry point?                                                                                               | **FAIL**    | No `app/(public)/eat/` directory exists. Spec ready, zero code.                                                                                                                                              |
| 1.7  | Does a "craving-led" or "occasion-led" discovery flow exist?                                                                                       | **FAIL**    | All discovery is schema-led (filter dropdowns). No "What's the occasion?" or "What are you in the mood for?" entry point. Homepage categories are service types, not cravings/occasions.                     |
| 1.8  | When a consumer searches "Italian food near me," do results include BOTH private chefs AND nearby restaurants?                                     | **FAIL**    | `/chefs` returns Italian chefs. `/nearby` returns Italian restaurants. No single surface returns both. Consumer must search two places.                                                                      |
| 1.9  | Is there a single search component on the homepage that routes based on intent?                                                                    | **PARTIAL** | `HomepageSearch` exists on homepage but routes only to `/chefs` with location/service params. Does not route to `/nearby` or `/hub/circles` based on intent.                                                 |
| 1.10 | When zero results appear, does the system cross-link to the other two surfaces?                                                                    | **PASS**    | `/chefs` zero-result shows "Browse food directory" link to `/nearby` + waitlist. `/nearby` secondary entries link to `/chefs` and `/hub/circles`. `PublicSecondaryEntryCluster` covers all surfaces.         |
| 1.11 | Does the consumer mental model require understanding ChefFlow's internal taxonomy?                                                                 | **FAIL**    | Yes. Consumer must know that "Browse Chefs" = private chefs only, "Food Directory" = restaurants/trucks/bakeries (no private chefs), "Dinner Circles" = social groups. No surface explains this distinction. |

**Domain 1 Score: 1 PASS, 2 PARTIAL, 8 FAIL = 11.1% (2/18 points)**

---

## Domain 2: Chef Directory (`/chefs`) Completeness

> **Context:** Most polished consumer surface. Rich dietary/credential data in DB but not fully surfaced in search.

| #    | Question                                                                                           | Status      | Evidence                                                                                                                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Can a consumer filter chefs by specific allergen-safe capability (e.g., "tree nut allergy safe")?  | **PARTIAL** | `allergy_aware` filter exists in `lib/directory/utils.ts:221-250` but only umbrella "allergy aware", no specific allergen filtering. Matches if `dietary_specialties` contains "allergy" or "allergen" text.                       |
| 2.2  | Does the chef directory expose dietary specialization data from DB?                                | **PARTIAL** | `chef_dietary_specializations` table does NOT exist. DietaryTrustStrip shows on individual profiles but not on directory tiles. Directory filter uses 7 broad categories, not specific specializations.                            |
| 2.3  | Do chef tiles show real portfolio photos, or mostly placeholders?                                  | **PARTIAL** | Tiles show `hero_image_url` or `profile_image_url` if set. Most chefs likely have placeholders since profile population depends on individual chef effort. Quality gate exists on full profile (bare profiles show "Coming Soon"). |
| 2.4  | When a consumer searches by location, does geocoded distance sorting work across state boundaries? | **PASS**    | `resolvePublicLocationQuery` in `lib/geocoding/public-geocoding.ts` geocodes any text query. Distance calculated via lat/lon comparison. State boundaries irrelevant to distance math.                                             |
| 2.5  | Does the waitlist capture notify when a matching chef joins?                                       | **FAIL**    | `WaitlistCapture` component captures location + email into `availability_waitlist` table. No evidence of notification trigger when new chef signs up matching that location. Write-only.                                           |
| 2.6  | Can a consumer see a chef's upcoming public/ticketed events from their profile?                    | **FAIL**    | Profile page (`app/(public)/chef/[slug]/page.tsx`, 757 lines) has no section fetching or rendering upcoming events. Events only accessible via direct `/e/[shareToken]` links.                                                     |
| 2.7  | Do chef profiles expose menu samples or dish names?                                                | **FAIL**    | No menu preview, dish names, or course listings on profile. Cuisine type chips only (e.g., "Italian", "French"). Menu info only appears on event share pages.                                                                      |
| 2.8  | Is Google review score shown on directory tile or only full profile?                               | **PARTIAL** | Tile shows ChefFlow internal `avg_rating` + `review_count` when available. `google_review_url` is fetched but only displayed on full profile via `ChefProofSummary`. Google score itself not aggregated into tile rating.          |
| 2.9  | When `preferred_inquiry_destination = 'website_only'`, does tile CTA link externally?              | **PASS**    | `app/(public)/chefs/page.tsx` respects `preferred_inquiry_destination`. When website_only, primary CTA links to chef's website URL.                                                                                                |
| 2.10 | Does chef directory support map-based browsing?                                                    | **FAIL**    | Grid-only layout (`grid gap-8 sm:grid-cols-2 lg:grid-cols-3`). No map component, no Mapbox/Leaflet/Google Maps.                                                                                                                    |
| 2.11 | Does availability calendar show price range for context?                                           | **FAIL**    | `app/(public)/availability/[token]/page.tsx` shows only available/unavailable days. No price info anywhere on this page.                                                                                                           |
| 2.12 | Does each chef profile have sufficient JSON-LD for Google rich results?                            | **PASS**    | Dynamic FoodService JSON-LD with aggregate ratings, BreadcrumbList JSON-LD, OG metadata with images. Sufficient for rich results.                                                                                                  |

**Domain 2 Score: 3 PASS, 3 PARTIAL, 6 FAIL = 37.5% (7.5/20 points)**

---

## Domain 3: Food Directory (`/nearby`) Readiness

> **Context:** Hidden since April 6. 330K+ OSM listings. 99.6% lack photos. Nomination/claim/remove UIs built but commented out. No re-launch threshold defined.

| #    | Question                                                                                            | Status       | Evidence                                                                                                                                                                                                                                                 |
| ---- | --------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | What is the defined data quality threshold for removing `noindex` from detail pages?                | **FAIL**     | No threshold defined anywhere. Decision ledger asks the question but no answer recorded. Purely judgment-based with no criteria.                                                                                                                         |
| 3.2  | What is the defined threshold for re-enabling nomination form?                                      | **FAIL**     | Same as 3.1. Comment says "Hidden until data quality is ready" with no definition of "ready."                                                                                                                                                            |
| 3.3  | What is the defined threshold for re-enabling claim/remove actions?                                 | **FAIL**     | Same pattern. Commented out with no re-enablement criteria.                                                                                                                                                                                              |
| 3.4  | What percentage of listings have photos, cuisine classification, valid city, phone, hours, website? | **DEFERRED** | Photos: ~0.4%. Cuisine beyond "other": unknown without DB query. City="unknown": ~130K of ~330K. Phone/hours/website: unknown. OpenClaw enrichment pipeline responsible but status unclear.                                                              |
| 3.5  | Does `FoodPlaceholderImage` provide sufficient visual quality?                                      | **PARTIAL**  | Gradient placeholder with emoji icon. Better than broken image but not competitive with photo-based directories. Research identified this as the #1 gap.                                                                                                 |
| 3.6  | Does proximity sorting use real distance calculation?                                               | **PASS**     | `lib/discover/actions.ts:186-198` uses squared-Euclidean on lat/lon (Haversine approximation). Comment confirms "sufficient for ranking." Listings without coords sort last.                                                                             |
| 3.7  | Can an operator edit their listing after submission?                                                | **PARTIAL**  | `/nearby/[slug]/enhance` page does NOT exist as a file. `enhanceDirectoryListing` action accepts description, address, phone, menuUrl, hours. But only for claimed listings. Submitters who don't claim can't edit.                                      |
| 3.8  | Does the enhance page allow photo upload?                                                           | **FAIL**     | `enhanceDirectoryListing` accepts text fields only (description, address, phone, menuUrl, hours). No photo upload. Photos handled via admin batch tools only (`scripts/fetch-directory-photos.mjs`).                                                     |
| 3.9  | Is there a running pipeline from OpenClaw enrichment to `directory_listings` updates?               | **DEFERRED** | Enrichment scripts exist on Pi. 514/516 files enriched. But pipeline from Pi enrichment output to production `directory_listings` table updates is unclear.                                                                                              |
| 3.10 | Does the StateGrid create a useful browsing pattern or replicate "database dump"?                   | **PARTIAL**  | StateGrid shows collapsible state codes with counts. Functional but resembles a database index more than a consumer discovery experience. Research specifically flagged "landing page shows state abbreviation grid instead of search-first experience." |
| 3.11 | When a listing is claimed and enhanced, does visual presentation meaningfully improve?              | **PARTIAL**  | Status badge changes (discovered -> claimed -> verified). Description and contact info appear if added. But no photo upload means visual impact is minimal.                                                                                              |
| 3.12 | Is there a feedback loop where consumer interactions inform OpenClaw enrichment priorities?         | **FAIL**     | No consumer interaction tracking (clicks, searches, zero-result queries) feeds into OpenClaw. Outreach queue uses `lead_score` but not consumer demand signals.                                                                                          |

**Domain 3 Score: 1 PASS, 4 PARTIAL, 5 FAIL, 2 DEFERRED = 25% (5/20 points)**

---

## Domain 4: Directory Convergence (Chefs + Nearby + Circles)

> **Context:** Three parallel directory systems with zero data-layer connections.

| #    | Question                                                                                                | Status      | Evidence                                                                                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | Can a ChefFlow chef claim and link their profile to a `directory_listings` record?                      | **FAIL**    | `directory_listings` has no FK to `chefs`. Claim flow sets `claimed_by_email` but never links to a ChefFlow chef account. Two separate identity systems.                                                       |
| 4.2  | When a chef profile AND nearby listing exist for the same business, does the system detect duplicates?  | **FAIL**    | No dedup logic between `chefs` and `directory_listings`. Different tables, different schemas, no name/location matching.                                                                                       |
| 4.3  | Can a consumer see both private chefs AND restaurants on a single location results page?                | **FAIL**    | `/chefs` shows only ChefFlow chefs. `/nearby` shows only directory listings. No unified results page.                                                                                                          |
| 4.4  | Do community circles reference nearby listings?                                                         | **PARTIAL** | Cross-links exist (April 18-19 fixes): `/nearby` -> circles via secondary entry cluster, circles -> `/nearby` via topic-aware banner. But no data-level connection (circle doesn't link to specific listings). |
| 4.5  | When a circle is created about Italian food, does discovery surface relevant chefs AND nearby listings? | **FAIL**    | Circle topics are freeform text. No structured connection to chef cuisine data or listing cuisine data. Cross-links are generic, not topic-filtered.                                                           |
| 4.6  | Does `/nearby/[slug]` cross-link to ChefFlow chefs who partner at that venue?                           | **FAIL**    | No connection between `directory_listings` and `chef_partner_venues`. Partner venues are a separate system entirely.                                                                                           |
| 4.7  | Is there a unified "food operator" concept bridging authenticated chefs and unauthenticated listings?   | **FAIL**    | Two completely separate data models. `chefs` + `chef_directory_listings` for authenticated users. `directory_listings` for unauthenticated businesses. No shared identity.                                     |
| 4.8  | When an operator signs up after a directory listing, does listing upgrade to full profile?              | **FAIL**    | Onboarding writes TO `chef_directory_listings` but never reads FROM `directory_listings`. No data bridge at signup. Two presences persist.                                                                     |
| 4.9  | Does chef_opportunity_network surface any signal to consumers?                                          | **FAIL**    | `chef-opportunity-network.md` is chef-to-chef only (requires `requireChef()`). No public surface for collaboration data.                                                                                       |
| 4.10 | Could partner venues bridge directories (venue in `/nearby` AND on chef profile)? Is this built?        | **FAIL**    | Not built. Partner venues use `chef_partner_venues` table (chef-specific). No FK or name matching to `directory_listings`. Connection is conceptually possible but zero implementation.                        |

**Domain 4 Score: 0 PASS, 1 PARTIAL, 9 FAIL = 5% (0.5/10 points)**

---

## Domain 5: Booking & Inquiry Flow Integrity

> **Context:** Three entry points (direct inquiry, open booking, embed). Six known parity gaps.

| #    | Question                                                                      | Status      | Evidence                                                                                                                                                                                                       |
| ---- | ----------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1  | After `/book` (open booking), does consumer see which chefs were matched?     | **PARTIAL** | Thank-you page shows "Your request was sent to N chefs in [area]" via `result.message`. Shows count and area but no chef names, profiles, or tracking.                                                         |
| 5.2  | Does open booking create structured allergy records?                          | **PASS**    | `lib/inquiries/public-actions.ts:85-88,224-234`: `parseFreeTextDietary()` + `buildAllergyRecordRows()` upserts into `client_allergy_records`. Applies to both direct and open booking paths.                   |
| 5.3  | Does open booking create a Dinner Circle?                                     | **FAIL**    | `/api/book/route.ts` creates client + inquiry + event per matched chef but does NOT call `createInquiryCircle()`. Direct inquiry does. Embed widget does. Open booking does not.                               |
| 5.4  | Does open booking have dedup protection?                                      | **PASS**    | `lib/inquiries/public-actions.ts:249-268`: Same client + chef + date within 24h detected as duplicate. Returns `{ duplicateOf }`.                                                                              |
| 5.5  | Does open booking have referral tracking?                                     | **FAIL**    | No `referral_source` or UTM param capture in `/api/book/route.ts`. Direct inquiry also lacks this.                                                                                                             |
| 5.6  | Does embed thank-you match native inquiry thank-you?                          | **PARTIAL** | Both show 5-step "What happens next" sequence. But native shows matched chef count/area; embed shows only chef name. Embed lacks `/chefs` browse link. Backend parity is good (circle created, email sent).    |
| 5.7  | Does embed have same rate limiting and honeypot?                              | **PASS**    | `app/api/embed/inquiry/route.ts` has IP rate limit (10/5min), email rate limit (3/hour), honeypot field, HTML stripping. Comparable to native.                                                                 |
| 5.8  | Does inquiry consolidation (TakeAChef parse) have parity with native inquiry? | **FAIL**    | `lib/inquiries/take-a-chef-capture-actions.ts`: No structured allergy records, no Dinner Circle, no client email, no SMS, no automations. Significant parity gap.                                              |
| 5.9  | Is response time tracked with urgency signals?                                | **PARTIAL** | `first_contact_at` recorded on inquiry. SSE broadcast includes `urgent: true` for chef dashboard. But no consumer-facing "typically responds in X hours" display, no elapsed-time urgency.                     |
| 5.10 | Can consumer check inquiry status without logging in?                         | **PARTIAL** | Consumer receives Dinner Circle link in acknowledgment email (for direct inquiry and embed). Can view circle without auth. But open booking creates NO circle, so those consumers have zero status visibility. |
| 5.11 | Does inquiry email contain direct Circle link that works without auth?        | **PASS**    | `lib/email/templates/inquiry-received.tsx:73-84`: "Open your planning space" link to `/hub/g/{circleGroupToken}`. Works without auth (token-based access).                                                     |
| 5.12 | When chef declines, does consumer get notified with alternatives?             | **PASS**    | `lib/inquiries/actions.ts:2109-2148`: In-app notification + decline email sent. Email includes "Browse Available Chefs" CTA with `browseUrl` to `/chefs`.                                                      |

**Domain 5 Score: 5 PASS, 3 PARTIAL, 4 FAIL = 54.2% (11.5/21 points)**

---

## Domain 6: Post-Event Lifecycle (Feedback -> Retention Loop)

> **Context:** Four token-based post-event surfaces. PostActionFooter with "Book Again" added April 18. Loop is only one link deep.

| #    | Question                                                                                       | Status      | Evidence                                                                                                                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | After guest feedback, is there a mechanism to convert guest into direct client?                | **PARTIAL** | PostActionFooter shows "Book Again" link to `/chef/[slug]/inquire`. Guest lead capture at live event (`/g/[code]`) also exists. But no automated "you attended, want your own event?" prompt. Conversion is passive.                            |
| 6.2  | Does "Book Again" pre-fill known client data?                                                  | **FAIL**    | `components/public/post-action-footer.tsx:16-56`: "Book Again" links to `/chef/{slug}/inquire` with no query params. No name, email, dietary pre-fill.                                                                                          |
| 6.3  | After leaving a review, does consumer see chef recommendations?                                | **FAIL**    | Review completion shows thank-you + PostActionFooter with single chef's "Book Again" link. No "other chefs you might like" or recommendation engine.                                                                                            |
| 6.4  | Does tip flow distinguish client (hired chef) from guest (attended)?                           | **FAIL**    | Tip request is linked to event, not to a specific attendee role. PostActionFooter shows same "Book Again" CTA regardless. No role-aware behavior.                                                                                               |
| 6.5  | After event recap, does guest have paths to: book same chef, discover similar, share socially? | **PARTIAL** | Recap has `TestimonialForm` and chef info. "Book Again" via PostActionFooter. No "similar chefs" discovery. No social share buttons.                                                                                                            |
| 6.6  | Does meal board feedback flow into analytics or public scores?                                 | **FAIL**    | `hub_meal_feedback` stays siloed in Dinner Circle. No connection to `lib/analytics/` or `lib/reviews/`. Only triggers chef notification.                                                                                                        |
| 6.7  | When `allowPublicDisplay = true`, does review appear immediately or require approval?          | **PASS**    | `lib/testimonials/submit-testimonial.ts:56` sets `is_public`. But `getPublicTestimonials` requires `is_approved = true` as well. Initial approval status unset, so chef must approve via `approveTestimonial`. Chef controls public visibility. |
| 6.8  | Does system track returning clients and surface rebooking rate as social proof?                | **PARTIAL** | `lib/analytics/client-analytics.ts:7-12,71`: `ClientRetentionStats` with `repeatClients`, `repeatBookingRate` computed from completed events. But chef-facing only (requires `requireChef()`). Not surfaced on public profile.                  |
| 6.9  | After completed event, does guest receive "chefs you might like" recommendation?               | **FAIL**    | No recommendation engine. No post-event email with chef suggestions.                                                                                                                                                                            |
| 6.10 | Is there a "subscribe to chef's events" mechanism for past guests?                             | **FAIL**    | No subscription/mailing list system. Past guests in old circles don't see new circles. MemPalace flagged this explicitly as unresolved.                                                                                                         |

**Domain 6 Score: 1 PASS, 3 PARTIAL, 6 FAIL = 25% (4/16 points)**

---

## Domain 7: Ticketed Events & Public Event Discovery

> **Context:** `/e/[shareToken]` works. Farm dinner co-hosting is real. No public event listing exists.

| #    | Question                                                                | Status       | Evidence                                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7.1  | Can consumer discover upcoming ticketed events without a direct link?   | **FAIL**     | No `/events` page. No event listing anywhere. Events only accessible via share token link distributed manually by chef.                                                                                      |
| 7.2  | Does a public events calendar or listing page exist?                    | **FAIL**     | No `app/(public)/events/page.tsx`. No aggregate events view.                                                                                                                                                 |
| 7.3  | After ticket purchase, does buyer connect to event's Dinner Circle?     | **FAIL**     | Post-purchase confirmation shows chef profile link only. No Dinner Circle link, no circle join, no RSVP. MemPalace flagged this explicitly.                                                                  |
| 7.4  | Does purchase confirmation provide navigation beyond chef profile?      | **PARTIAL**  | `public-event-view.tsx:70-113`: Shows "View {chefName}'s Profile" link and "Powered by ChefFlow" branding. No link to browse more events or other discovery surfaces.                                        |
| 7.5  | Can chef's profile show upcoming public/ticketed events?                | **FAIL**     | Profile page has no event section. No query for upcoming events in profile data loading.                                                                                                                     |
| 7.6  | Does the system prevent ticket overselling?                             | **PASS**     | `event_ticket_types` has `quantity` and sold tracking. Stripe Checkout enforces inventory limits. `sold_count` tracked per type.                                                                             |
| 7.7  | Can a co-host manage event details alongside chef?                      | **PARTIAL**  | `event_collaborators` table exists with `co_host` role and granular permissions (`can_modify_menu`, `can_assign_staff`, etc.). Data model ready. But co-host UI/management surface not verified as built.    |
| 7.8  | Does co-host role exist in data model?                                  | **PASS**     | `database/migrations/20260304000008_chef_collaboration_system.sql:17-58`: `event_collaborators` with `role IN ('primary', 'co_host', 'sous_chef', 'observer')`, default `'co_host'`. Full permissions JSONB. |
| 7.9  | When ticketed event cancelled, do holders get notified and refunded?    | **DEFERRED** | Cancellation flow for regular events exists. Ticket-specific refund automation not verified. Stripe refund would need webhook handling.                                                                      |
| 7.10 | Can past attendees opt in to future event notifications from same chef? | **FAIL**     | No subscription mechanism. No mailing list. No "notify me of future events." Recurring question across MemPalace and audits.                                                                                 |
| 7.11 | Does `/e/[shareToken]` have FoodEvent JSON-LD for Google Events?        | **PASS**     | `app/(public)/e/[shareToken]/page.tsx:74-117`: Full `@type: 'FoodEvent'` JSON-LD with `name`, `startDate`, `location` (Place), `organizer`, `offers` (per ticket type with price/availability).              |
| 7.12 | Can a viewer from forwarded link (`/view/[token]`) request to attend?   | **PASS**     | `ViewerIntentForm` on `/view/[token]` allows requesting to join or booking their own event. Viewer can express intent without being a direct invitee.                                                        |

**Domain 7 Score: 4 PASS, 2 PARTIAL, 5 FAIL, 1 DEFERRED = 41.7% (8.5/20 points)**

---

## Domain 8: Gift Card Discovery & Lifecycle

> **Context:** Works end-to-end for individual chefs. Zero global discoverability.

| #   | Question                                                                     | Status   | Evidence                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 | Can consumer buy a platform-level gift card redeemable with any chef?        | **FAIL** | Only chef-specific gift cards at `/chef/[slug]/gift-cards`. No platform-level gift card concept.                                                                                                           |
| 8.2 | Is there a `/gift-cards` page for browsing chefs for gift purchases?         | **FAIL** | No `app/(public)/gift-cards/page.tsx`. Gift cards only accessible from individual chef profiles.                                                                                                           |
| 8.3 | Does gift card recipient email include link to browse chefs?                 | **FAIL** | `lib/email/templates/incentive-delivery.tsx`: Shows code, value, personal message. No link to `/chefs` or any ChefFlow navigation. Recipient with no context has no discovery path.                        |
| 8.4 | Can gift card be redeemed during booking/inquiry flow?                       | **FAIL** | Inquiry form has no gift card code field. No redemption integration in booking flow. Gift cards exist in loyalty system (`lib/loyalty/client-loyalty-actions.ts`) but require authenticated client portal. |
| 8.5 | Does gift card purchase page show chef's availability?                       | **FAIL** | Gift card page shows chef name, image, and purchase form only. No availability calendar or date suggestions.                                                                                               |
| 8.6 | Are gift cards surfaced on homepage or services page?                        | **FAIL** | Homepage shows chef tiles, search, category tiles. `/services` shows service categories. Neither mentions gift cards.                                                                                      |
| 8.7 | Can gift cards be purchased from `/nearby` detail page for claimed business? | **FAIL** | No gift card integration on `/nearby/[slug]`. Gift cards are exclusive to authenticated ChefFlow chef profiles.                                                                                            |

**Domain 8 Score: 0 PASS, 0 PARTIAL, 7 FAIL = 0% (0/7 points)**

---

## Domain 9: Guest Experience (Event Attendees)

> **Context:** Guests have their own surfaces: RSVP, feedback, lead capture, event portal. Distinct from clients.

| #    | Question                                                                                      | Status          | Evidence                                                                                                                                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1  | Does guest who RSVPs auto-join event's Dinner Circle?                                         | **PARTIAL**     | `JoinHubCTA` appears after RSVP but requires manual click. Not auto-join. Guest must choose to join the circle.                                                                                                                   |
| 9.2  | After RSVPing, does guest receive confirmation email with circle + dietary intake links?      | **PARTIAL**     | RSVP triggers notifications but confirmation email content and circle link presence not verified in email template. Guest portal link (`/event/[id]/guest/[token]`) allows dietary input.                                         |
| 9.3  | Can guest update dietary restrictions after RSVPing?                                          | **PASS**        | `portal-client.tsx:209,522-537`: `dietary_notes` editable when `portal.lifecycle.canEdit` is true. Re-submission allowed until edit cutoff date. Changes propagate to chef's prep data.                                           |
| 9.4  | Does guest lead capture (`/g/[code]`) create a client record convertible to full client?      | **PASS**        | `GuestLeadForm` submits to `captureGuestLead` which creates a `guest_leads` record. Chef dashboard shows leads. Chef can convert to client via inquiry creation.                                                                  |
| 9.5  | After QR scan at live event, does guest see chef's profile and upcoming events?               | **FAIL**        | `/g/[code]` shows chef photo, name, tagline, and lead form only. No profile link, no upcoming events, no portfolio. After submission: thank-you + "Create free account" CTA.                                                      |
| 9.6  | Is guest experience consistent across RSVP link, QR code, ticket purchase, and circle invite? | **FAIL**        | Four different entry points, four different experiences. RSVP: full event details + ExcitementWall + guest list. QR: minimal lead form. Ticket: purchase flow + minimal confirmation. Circle: chat/planning view. No consistency. |
| 9.7  | Does staff portal link to consumer/guest surfaces?                                            | **INTENTIONAL** | Staff portal is purely operational (event briefing, timeline, tasks). No consumer links. This is correct; staff don't need consumer paths.                                                                                        |
| 9.8  | When guest posts on ExcitementWall, does message appear in Dinner Circle?                     | **FAIL**        | `guest_messages` table (ExcitementWall) and `hub_messages` table (Dinner Circle) are completely separate data models. No cross-posting. Two disconnected systems.                                                                 |
| 9.9  | Can guests share photos that appear on chef's portfolio with approval?                        | **PARTIAL**     | `GuestPhotoGallery` on share page allows photo viewing. Guest can upload photos to event. But no pipeline from guest photos to chef's portfolio (`is_portfolio` flag). Chef would need to manually curate.                        |
| 9.10 | Does event recap capture testimonials that flow into public review feed?                      | **PARTIAL**     | `TestimonialForm` on recap inserts into `guest_testimonials` with `is_approved: false`. Requires chef approval to appear publicly. Pipeline exists but requires manual approval step.                                             |

**Domain 9 Score: 2 PASS, 4 PARTIAL, 3 FAIL, 1 INTENTIONAL = 40% (7/17 points)**

---

## Domain 10: Operator Acquisition & Conversion

> **Context:** `/for-operators` is operator landing. User acquisition strategy: "ZERO."

| #     | Question                                                                      | Status   | Evidence                                                                                                                                                                             |
| ----- | ----------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 10.1  | After `/nearby/submit`, what is conversion path to full account?              | **FAIL** | Welcome email has "Preview your listing" button only. No signup CTA. No mention of ChefFlow account. Dead end for operator conversion.                                               |
| 10.2  | Do outreach emails include CTA to sign up for ChefFlow?                       | **FAIL** | Directory invitation: "No ChefFlow branding. No mention of existing listing." (comment in template). Directory claimed: CTA to enhance listing only. Zero signup nudge in any email. |
| 10.3  | Does listing data pre-populate profile on signup?                             | **FAIL** | Onboarding writes TO `chef_directory_listings` but never reads FROM `directory_listings`. Two separate tables, no bridge. Operator starts fresh.                                     |
| 10.4  | Does `/for-operators` address all operator types?                             | **PASS** | "The operating system for private chefs, caterers, and food operators." Capabilities listed cover all types (clients, events, menus, finances, recipes, inventory, staff, AI).       |
| 10.5  | Does `/for-operators/[type]` exist with type-specific value props?            | **FAIL** | Only `app/(public)/for-operators/page.tsx`. No dynamic type variants. Single generic page for all operator types.                                                                    |
| 10.6  | Does the system prompt businesses to claim based on consumer search activity? | **FAIL** | Outreach is admin-initiated batch processing (`requireAdmin()`). No connection to consumer search data. No demand-driven outreach.                                                   |
| 10.7  | Can operator see listing analytics without signing up?                        | **FAIL** | No listing analytics exist at all. No views, clicks, or inquiry tracking on `/nearby` listings.                                                                                      |
| 10.8  | Does `/marketplace-chefs` use ROI calculator data?                            | **FAIL** | Entirely static page with hardcoded arrays. ROI calculator (`lib/marketplace/roi-actions.ts`) requires `requireChef()` auth. Not connected.                                          |
| 10.9  | Is embed widget presented as operator acquisition tool?                       | **FAIL** | Embed widget described as "Add a booking form to your existing website" in chef settings. A retention tool for existing chefs, not an acquisition channel.                           |
| 10.10 | Does partner signup connect to `/nearby` directory?                           | **FAIL** | Partner signup connects partners to individual chefs. No connection to `directory_listings`. Separate systems.                                                                       |

**Domain 10 Score: 1 PASS, 0 PARTIAL, 9 FAIL = 10% (1/10 points)**

---

## Domain 11: SEO & Organic Discovery

> **Context:** Ingredients = SEO asset. Chef profiles have rich JSON-LD. Nearby detail pages noindexed.

| #     | Question                                                                           | Status       | Evidence                                                                                                                                                                                                                                                                                    |
| ----- | ---------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11.1  | Which public pages are currently indexable?                                        | **PASS**     | `app/robots.ts` allows all public routes except `/api/`, `/auth/`, `/beta-survey/`, `/event/`, `/share/`, `/g/`, `/book/`, `/embed/`, `/customers`, and all chef-dashboard routes. Explicit `noindex`: `/nearby/join`. Hub circles: override to `index: true`. Most public pages indexable. |
| 11.2  | Do chef profiles rank for "[chef name] private chef" queries?                      | **DEFERRED** | JSON-LD and metadata are well-structured. Actual ranking not tested. No Search Console data available.                                                                                                                                                                                      |
| 11.3  | Does ingredients encyclopedia drive measurable organic traffic?                    | **DEFERRED** | Rich content with JSON-LD, breadcrumbs, categories. But no analytics data available to measure traffic.                                                                                                                                                                                     |
| 11.4  | When nearby detail pages are indexed, will JSON-LD be sufficient for rich results? | **PASS**     | `app/(public)/nearby/[slug]/page.tsx` generates dynamic Restaurant/FoodEstablishment JSON-LD with name, address, cuisine, price range, phone, URL. Sufficient for rich results.                                                                                                             |
| 11.5  | Do public event pages have FoodEvent JSON-LD for Google Events?                    | **PASS**     | Confirmed: `app/(public)/e/[shareToken]/page.tsx:74-117` has full FoodEvent JSON-LD with offers, location, organizer.                                                                                                                                                                       |
| 11.6  | Is there a comprehensive sitemap.xml?                                              | **PARTIAL**  | `app/sitemap.ts` includes static routes + dynamic chef/ingredient/comparison pages. Omits: `/nearby/submit`, individual `/nearby/[slug]` pages (intentionally, since noindexed), `/hub/circles`.                                                                                            |
| 11.7  | Do FAQ pages use FAQPage JSON-LD correctly?                                        | **PASS**     | FAQ page has FAQPage JSON-LD for featured snippet eligibility.                                                                                                                                                                                                                              |
| 11.8  | When consumer searches "private chef [city]," does ChefFlow appear?                | **DEFERRED** | No Search Console data. Site is live but SEO ranking unknown. No city-specific landing pages.                                                                                                                                                                                               |
| 11.9  | Are there landing pages for high-intent search queries?                            | **FAIL**     | No `/private-chef-boston`, `/catering-near-me`, or similar pages. `/services` exists but generic. No programmatic city pages.                                                                                                                                                               |
| 11.10 | Does ingredients -> chef cross-link create SEO juice flow?                         | **PARTIAL**  | Ingredient pages have `ChefCta` with category-specific copy linking to `/book` and `/chefs`. But links are generic, not filtered by cuisine matching the ingredient. "Browse chefs who specialize in meat" links to unfiltered `/chefs`.                                                    |

**Domain 11 Score: 4 PASS, 2 PARTIAL, 1 FAIL, 3 DEFERRED = 50% (8.5/17 points)**

---

## Domain 12: Privacy & Data Boundaries

> **Context:** Cross-boundary flow audit found potential concerns. All may be intentional but need explicit confirmation.

| #    | Question                                                      | Status      | Evidence                                                                                                                                                                                                                                           |
| ---- | ------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12.1 | Is tip form exposing `eventTotalCents` intentional?           | **PASS**    | Uber-style tip design. Percentage suggestions require knowing the base amount. Industry standard pattern. Intentional.                                                                                                                             |
| 12.2 | Can a chef hide unfavorable external reviews?                 | **FAIL**    | `lib/reviews/public-actions.ts:112-118`: All external reviews returned with no per-review visibility toggle. Chef can deactivate entire source (Google/Yelp) via `active` boolean on `external_review_sources` but cannot hide individual reviews. |
| 12.3 | Is embed UUID-based URL acceptable?                           | **PARTIAL** | UUID not easily guessable but also not revocable. Anyone with the UUID can embed the form indefinitely. Token-based approach with revocation would be more secure. Acceptable for current scale but worth noting.                                  |
| 12.4 | Is the client aware they triggered a visitor alert?           | **FAIL**    | `triggerVisitorAlert` fires when logged-in client views chef profile. Client has no indication they triggered a notification. No consent prompt or disclosure.                                                                                     |
| 12.5 | Does availability calendar reveal too much about schedule?    | **PARTIAL** | Shows 60 days of available/unavailable. Competitor could infer busyness level. But dates alone don't reveal client names, event types, or financial data. Acceptable tradeoff for the booking use case.                                            |
| 12.6 | Is GDPR consent collected for dietary/allergy data?           | **PASS**    | Embed form has `gdpr_consent` field. Native inquiry form collects consent via terms acceptance. Dietary data stored with consent linkage.                                                                                                          |
| 12.7 | Can consumer request deletion via `/data-request`?            | **PASS**    | `/data-request` page exists with form for GDPR right to erasure requests.                                                                                                                                                                          |
| 12.8 | Does `/share/[token]` expose guest list to all token holders? | **PARTIAL** | Guest names and RSVP status visible to all token holders. Chef controls visibility via `event_share_settings`. But if settings allow, any person with the link sees full guest list. Appropriate for event coordination but privacy-sensitive.     |

**Domain 12 Score: 3 PASS, 3 PARTIAL, 2 FAIL = 56.3% (7.5/13 points)**

---

## Domain 13: Cross-Surface Navigation & Dead-End Prevention

> **Context:** `PublicSecondaryEntryCluster` covers 17 surfaces. Cohesion audit was 47.5% before fixes.

| #     | Question                                                                                       | Status      | Evidence                                                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13.1  | What is updated cohesion score after April 18-19 fixes?                                        | **PARTIAL** | Significant fixes: PostActionFooter cross-links added (3 surfaces), PublicSecondaryEntryCluster on ingredients, nearby<->circles bidirectional links. Estimated improvement from 47.5% to ~70%+ but exact recount needed. |
| 13.2  | Does every public page have at least 2 contextually relevant forward paths?                    | **PASS**    | `PublicSecondaryEntryCluster` provides 3 contextual links on every public page. PostActionFooter on all token pages. Header+footer navigation redundant paths.                                                            |
| 13.3  | Can user reach every public surface within 3 clicks from any starting page?                    | **PASS**    | Header dropdown provides 1-click access to all major surfaces. Footer provides 1-click access to all categories. Secondary entries provide 1-click contextual paths. Max 2 clicks to any surface from any page.           |
| 13.4  | Landing on `/ingredients` from organic search, is there a path to "hire a chef who uses this"? | **PASS**    | `ChefCta` component on ingredient detail pages + `PublicSecondaryEntryCluster` linking to `/book` and `/chefs`. Clear forward path.                                                                                       |
| 13.5  | Does "Hire a Chef" dropdown create choice paralysis (7 items)?                                 | **PARTIAL** | 7 items in dropdown: Book, Browse Chefs, Dinner Circles, Services, How It Works, FAQ, Food Directory. Functional but potentially overwhelming. Primary CTA ("Book a Chef") is visually prominent though.                  |
| 13.6  | Is footer link structure optimized for discovery or arbitrary?                                 | **PASS**    | Footer organized by audience: "Hire a Chef" (consumer), "For Operators" (chef), "Resources" (both), "Company" (trust), "Legal". Logical grouping.                                                                         |
| 13.7  | On mobile, does hamburger menu preserve nav hierarchy?                                         | **PASS**    | Standard responsive pattern. Same navigation items, collapsible on mobile.                                                                                                                                                |
| 13.8  | Do 404 pages provide useful navigation?                                                        | **PARTIAL** | Root 404 has 3 buttons (Home, Browse Chefs, Book a Chef). Public-level 404 has only "Go home" link. Inconsistent quality.                                                                                                 |
| 13.9  | When token page's token is expired/invalid, does error page have forward paths?                | **PASS**    | Token pages show clear error messages + PostActionFooter where applicable. Availability page expired token shows clear message.                                                                                           |
| 13.10 | Does `/discover/[...path]` redirect preserve query params?                                     | **PASS**    | `app/(public)/discover/[[...path]]/page.tsx:16-31`: Preserves path segments via `params.path?.join('/')` and query params via `URLSearchParams` iteration. Uses `permanentRedirect` (301).                                |

**Domain 13 Score: 7 PASS, 2 PARTIAL, 0 FAIL = 85% (15/17 points)**

---

## Domain 14: Consumer Account & Continuity

> **Context:** Consumers browse without accounts. Repeat interactions create fragmented identity.

| #    | Question                                                                                   | Status      | Evidence                                                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14.1 | Are two inquiries from same email to different chefs recognized as same person?            | **FAIL**    | `createClientFromLead` is idempotent PER TENANT. Same email creates separate `clients` rows per chef. No cross-tenant consumer identity. Platform-level identity doesn't exist. |
| 14.2 | Does consumer account gain access to past inquiry history?                                 | **PARTIAL** | Client portal (`/my-inquiries`) shows inquiries for that chef-client relationship. But inquiries to OTHER chefs are invisible. No cross-tenant view.                            |
| 14.3 | Can consumer view all Dinner Circles from single dashboard?                                | **PARTIAL** | `/hub/me/[profileToken]` shows group memberships. But requires knowing the profile token. No auth-based "my circles" page. Hub profile is token-based, not account-based.       |
| 14.4 | When gift card recipient creates account, is card associated?                              | **FAIL**    | Gift card stored in `incentives` table linked to tenant. No account-level association. Recipient must manually provide code for redemption.                                     |
| 14.5 | Does "My Hub" aggregate all consumer touchpoints?                                          | **FAIL**    | No unified consumer dashboard. Client portal is per-chef. Hub profile is per-token. Gift cards are per-tenant. No aggregation layer.                                            |
| 14.6 | Can consumer bookmark chefs without account?                                               | **FAIL**    | No bookmark/save/favorite functionality for unauthenticated users. No local storage persistence. No wishlist.                                                                   |
| 14.7 | When consumer RSVPs to multiple events from different chefs, is there unified "my events"? | **FAIL**    | Each RSVP is per-event, per-token. No cross-event view. Guest would need separate tokens for each event.                                                                        |
| 14.8 | Does hub profile serve as adequate consumer identity center?                               | **FAIL**    | Hub profile shows event history and group memberships only. No inquiries, no gift cards, no bookmarks, no cross-chef data. Too limited for consumer identity.                   |

**Domain 14 Score: 0 PASS, 2 PARTIAL, 6 FAIL = 12.5% (1/8 points)**

---

## Domain 15: Monetization Alignment

> **Context:** Free/paid tiers for operators. Consumer monetization effectively zero.

| #     | Question                                                                                    | Status       | Evidence                                                                                                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 15.1  | Does every user type receive clear value today?                                             | **PARTIAL**  | Consumer: browse chefs, submit inquiries (clear value). Guest: RSVP, feedback (clear value). Operator/Chef: full ops platform (clear value). Venue partner: partner showcase (limited value). But consumer value is search-only, no transactional value without booking. |
| 15.2  | Is "no commission" model clearly communicated to consumers?                                 | **PARTIAL**  | `/book` page: "Zero commission" in trust footer. `/how-it-works`: "Keep 100%" in chef section. But not prominently on homepage or chef profiles. Consumer might not realize this is different from marketplace competitors.                                              |
| 15.3  | Does free tier include enough for peer recommendation?                                      | **PASS**     | Free tier is complete standalone utility per `lib/billing/feature-classification.ts`. Solo chef can operate fully. Strong recommendation case.                                                                                                                           |
| 15.4  | Could listing analytics become paid operator feature without violating "no locked buttons"? | **PASS**     | Analytics would be additive (new data, not restricting existing functionality). Consistent with "free path always works" rule. Viable monetization path.                                                                                                                 |
| 15.5  | Is gift card revenue shared or 100% to chef?                                                | **PASS**     | Gift card purchases go to chef's Stripe account. No platform cut in current implementation. 100% to chef.                                                                                                                                                                |
| 15.6  | Could ticketed event processing fees provide platform revenue?                              | **PASS**     | Stripe Checkout already charges processing fees. Platform could add a service fee on top without taking food commission. Architecturally feasible.                                                                                                                       |
| 15.7  | Is voluntary supporter model still active?                                                  | **DEFERRED** | Memory says "tried and reversed." `memory/project_monetization_shift.md` referenced but file needs verification. Current code uses `requirePro()` enforcement. Need to confirm if voluntary path still exists alongside.                                                 |
| 15.8  | Does marketplace ROI calculator clearly motivate paid conversion?                           | **PARTIAL**  | Calculator exists (`lib/marketplace/roi-actions.ts`) and computes savings. But only accessible from authenticated chef dashboard. Not surfaced on `/marketplace-chefs` public page.                                                                                      |
| 15.9  | Are consumer-facing paid features planned or specced?                                       | **FAIL**     | No consumer-facing paid features in any spec or classification map. All consumer surfaces are free. No revenue path from consumers beyond gift cards (which go to chefs).                                                                                                |
| 15.10 | Does pricing page explain value with concrete metrics?                                      | **FAIL**     | No dedicated `/pricing` page found. Billing settings in chef dashboard show plan details but no public-facing pricing comparison page.                                                                                                                                   |

**Domain 15 Score: 4 PASS, 3 PARTIAL, 2 FAIL, 1 DEFERRED = 55% (9.5/17 points)**

---

## Domain 16: Real-World Stress Scenarios

> **Context:** Real private chef business. Farm dinners. These test consumer features under real conditions.

| #     | Question                                                                            | Status       | Evidence                                                                                                                                                                                                                                                                      |
| ----- | ----------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16.1  | Food blogger in Austin: complete journey from landing to booking?                   | **PARTIAL**  | Path: Homepage -> "Browse Chefs" -> filter by Austin location -> chef tile -> profile -> "Inquire" -> form -> submit. Works but: no food photos on most profiles, no menu samples, no "tonight" availability. Journey is functional but not inspiring.                        |
| 16.2  | 6 friends in Boston want farm dinner: can they plan through ChefFlow?               | **FAIL**     | Can search chefs, submit inquiry. But: no public events listing to discover farm dinners, no group planning tools (planning_brief/hub_group_candidates don't exist), no ticketed event discovery, no "farm dinner" filter. Group must rely on one person finding and booking. |
| 16.3  | Guest at farm dinner scans QR, wants to book 3 months later: what's their path?     | **PARTIAL**  | QR scan -> `/g/[code]` -> leave contact info. 3 months later: must remember chef name, search `/chefs` or Google, find profile, submit inquiry. No "chef you met" recall, no saved interaction, no follow-up automation. Lead capture exists but follow-up is manual.         |
| 16.4  | Restaurant owner discovers listing, wants to claim/edit/remove?                     | **FAIL**     | Claim and remove actions are COMMENTED OUT on `/nearby/[slug]`. Owner can submit via `/nearby/submit` (adding, not claiming). Backend claim actions exist but UI is hidden. Owner has no self-service path.                                                                   |
| 16.5  | Corporate planner needs kosher caterer for 200: can they find one?                  | **PARTIAL**  | `/chefs` has `dietary` filter but only broad categories ("religious_diets"). No "kosher" specific filter. Can search, browse, inquire. But no capacity filter (200 people), no certification display, no corporate-specific flow.                                             |
| 16.6  | Consumer buys $200 gift card, friend redeems during booking: full lifecycle?        | **FAIL**     | Purchase works. Recipient gets email with code. But: email has no link to browse chefs. No redemption field on inquiry form. Redemption requires authenticated client portal (`/my-rewards`). Broken lifecycle for new users.                                                 |
| 16.7  | Chef cancels ticketed dinner 48 hours before: what happens?                         | **DEFERRED** | Event cancellation flow exists. Ticket-specific refund automation unclear. Stripe refund handling would need webhook. No evidence of automatic ticket holder notification chain specific to cancellation.                                                                     |
| 16.8  | Repeat client books 4th dinner: does system recognize and streamline?               | **PARTIAL**  | `createClientFromLead` is idempotent by email per tenant, so client record is reused. Past event history accessible to chef. But: inquiry form doesn't pre-fill, no "welcome back" experience, no dietary recall on the booking form.                                         |
| 16.9  | Consumer submits inquiry at 11 PM, no response for 3 days: what's their experience? | **FAIL**     | Consumer gets acknowledgment email + Dinner Circle link at submission. Then: silence. No "your inquiry is being reviewed" status updates. No "chef hasn't responded yet" nudge. No escalation or alternative suggestions after 24/48/72 hours.                                |
| 16.10 | Two chefs claim same nearby listing: how?                                           | **PARTIAL**  | `requestListingClaim` sets `claimed_by_email` but UI is hidden. If both claim (backend), second claim would overwrite first (no conflict detection). No multi-claim handling. Moot since claim UI is disabled.                                                                |

**Domain 16 Score: 0 PASS, 5 PARTIAL, 4 FAIL, 1 DEFERRED = 25% (4.5/18 points)**

---

## Domain 17: Unresolved Visions & Missing Documentation

> **Context:** 7 memory files referenced in MEMORY.md don't exist on disk. Specs referenced but never written.

| #     | Question                                                                      | Status       | Evidence                                                                                                                                                                                                                                                                                                                                                             |
| ----- | ----------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17.1  | Do all memory files referenced in MEMORY.md exist?                            | **FAIL**     | Multiple orphaned references confirmed: `project_food_directory_vision.md`, `project_ephonebook_vision.md`, `project_inquiry_consolidation_vision.md`, `project_farm_dinner_cohost.md`, `project_monetization_shift.md`, `project_platform_vision.md`, `project_public_surface_cohesion.md`. All referenced in MEMORY.md but not found on disk by exploration agent. |
| 17.2  | Does E-Phone Book have a written spec?                                        | **FAIL**     | No spec. Knowledge confidence audit rated it "T3: ASSUMPTION. Vision documented. Nothing built. No market validation." Memory file referenced doesn't exist. Vision is conversation-only.                                                                                                                                                                            |
| 17.3  | Does `ticketed-events-and-distribution.md` spec exist?                        | **FAIL**     | File not found at `docs/specs/ticketed-events-and-distribution.md`. Referenced in MEMORY.md and CLAUDE.md but doesn't exist on disk.                                                                                                                                                                                                                                 |
| 17.4  | Does `system-integrity-question-set-cohosting.md` exist?                      | **FAIL**     | File not found at `docs/specs/system-integrity-question-set-cohosting.md`. Referenced in MEMORY.md but doesn't exist.                                                                                                                                                                                                                                                |
| 17.5  | Is 95% build completeness accurate given consumer discovery gaps?             | **FAIL**     | Blueprint claims 95% but: unified discovery (0%), consumer identity (0%), gift card lifecycle (0%), event discovery (0%), operator conversion (0%). Consumer side is ~30% at best. 95% is accurate only if scoped to chef-side features.                                                                                                                             |
| 17.6  | Are there contradictions between blueprint, project-map, and codebase?        | **FAIL**     | Blueprint: directory "complete." Project-map: "PARTIALLY COMPLETE" with 6 open items. Codebase: nomination/claim/remove commented out, detail pages noindexed. Contradiction confirmed.                                                                                                                                                                              |
| 17.7  | Does app-complete-audit.md reference `/discover` instead of `/nearby`?        | **PARTIAL**  | `discover-directory-polish.md` spec title still says "discover." Some references may persist. Route migration happened after specs written. Redirect handles the URL discrepancy.                                                                                                                                                                                    |
| 17.8  | Is the `/eat` spec still the recommended path forward?                        | **DEFERRED** | Spec at `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md` status: "ready." No subsequent spec supersedes it. But vision may have evolved in undocumented conversations.                                                                                                                                                                         |
| 17.9  | Should E-Phone Book be merged with /nearby, abandoned, or specced separately? | **DEFERRED** | No decision documented. Overlapping concepts. `/nearby` is the embryonic implementation. Needs explicit architectural decision.                                                                                                                                                                                                                                      |
| 17.10 | What is the canonical list of specced-but-unbuilt consumer features?          | **PARTIAL**  | Known unbuilt: `/eat` route, `hub_group_candidates`, `planning_brief`, unified discovery feed, consumer-first planning groups, public events listing, gift card global page, consumer identity system. No single canonical list exists.                                                                                                                              |

**Domain 17 Score: 0 PASS, 2 PARTIAL, 6 FAIL, 2 DEFERRED = 10% (1.5/15 points)**

---

## Domain 18: Cross-Boundary Connections Previously Considered Unrelated

> **Context:** Connections surfaced by cross-referencing seemingly unrelated features.

| #     | Question                                                                                        | Status   | Evidence                                                                                                                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 18.1  | Ingredients -> Chef Discovery: does viewing saffron suggest Persian chefs?                      | **FAIL** | `ChefCta` on ingredient pages has category-specific copy but links to generic `/book` and `/chefs` (unfiltered). No cuisine-matched chef suggestions. Link could trivially add `?cuisine=persian` but doesn't. |
| 18.2  | Gift card recipient -> new user acquisition: is there a referral mechanism?                     | **FAIL** | No referral program. Gift card recipient email has no browse link, no signup prompt beyond the code. Missed acquisition moment.                                                                                |
| 18.3  | Meal board -> consumer menu preview: could public circle meals serve as "what's cooking" proof? | **FAIL** | Meal board data (`hub_meal_board_items`) lives in private circles only. No public aggregation. No "what's cooking" social proof on homepage or directory.                                                      |
| 18.4  | Chef collaboration network -> consumer trust: "endorsed by 5 chefs"?                            | **FAIL** | `chef_opportunity_network` is chef-to-chef only. No public signal of peer endorsement or collaboration count.                                                                                                  |
| 18.5  | Inquiry consolidation -> response time display: "typically responds within X hours"?            | **FAIL** | `avg_response_time_ms` exists in schema but belongs to Remy AI metrics, not inquiry response tracking. No inquiry response time metric exists. Not surfaced on profiles.                                       |
| 18.6  | Partner venues -> location discovery: "find a chef who cooks at [venue]"?                       | **FAIL** | Partner venues shown on chef profiles (`PartnerShowcase`). But no search-by-venue capability. No connection to `/nearby` listings. Venue data is display-only, not searchable.                                 |
| 18.7  | Event recaps -> content marketing: anonymized recaps as SEO content?                            | **FAIL** | Event recap pages (`/share/[token]/recap`) are token-gated and noindex. No anonymized public-facing content generated from events.                                                                             |
| 18.8  | Staff portal -> quality signal: "brings professional team"?                                     | **FAIL** | Staff assignments in `staff_event_assignments`. Not surfaced on public profile. No "professional team" badge or indicator.                                                                                     |
| 18.9  | Worksheet data -> consumer planning guidance: "popular occasions, avg guest counts"?            | **FAIL** | Worksheet data stored per-event. No aggregation pipeline. No public-facing planning guidance derived from real data.                                                                                           |
| 18.10 | Loyalty program -> consumer engagement: any consumer-facing component?                          | **PASS** | Client loyalty system exists at `/my-rewards` with tier progress, rewards, quests, raffles, vouchers. Requires authenticated client portal. Not public-facing but functional for returning clients.            |
| 18.11 | CIL -> consumer personalization: recommendations based on accumulated understanding?            | **FAIL** | CIL Phase 1 spec complete but not built. Even when built, designed for chef-side intelligence. No consumer-facing personalization designed.                                                                    |
| 18.12 | Nearby search patterns -> chef prospecting: demand signals to chefs?                            | **FAIL** | No consumer search tracking on `/nearby`. No demand signal pipeline to chefs. Outreach is admin-batched, not demand-driven.                                                                                    |
| 18.13 | Embed widget adoption -> directory enrichment: widget embeds verify listings?                   | **FAIL** | Embed widget uses chef UUID, not directory listing ID. No connection between embed adoption and `/nearby` listing verification. Separate systems.                                                              |
| 18.14 | Availability signals -> event timing: "best dates to book" recommendation?                      | **FAIL** | Availability data per-chef. No aggregation. No "most chefs available on..." recommendation. Data exists but no consumer-facing intelligence layer.                                                             |

**Domain 18 Score: 1 PASS, 0 PARTIAL, 13 FAIL = 7.1% (1/14 points)**

---

## FINAL SCORING SUMMARY

| Domain                     | Questions | PASS   | PARTIAL | FAIL    | INTENTIONAL | DEFERRED | Raw Score  | %         |
| -------------------------- | --------- | ------ | ------- | ------- | ----------- | -------- | ---------- | --------- |
| 1. Unified Discovery       | 11        | 1      | 2       | 8       | 0           | 0        | 3/18       | 16.7%     |
| 2. Chef Directory          | 12        | 3      | 3       | 6       | 0           | 0        | 7.5/20     | 37.5%     |
| 3. Food Directory          | 12        | 1      | 4       | 5       | 0           | 2        | 5/20       | 25%       |
| 4. Directory Convergence   | 10        | 0      | 1       | 9       | 0           | 0        | 0.5/10     | 5%        |
| 5. Booking & Inquiry       | 12        | 5      | 3       | 4       | 0           | 0        | 11.5/21    | 54.8%     |
| 6. Post-Event Lifecycle    | 10        | 1      | 3       | 6       | 0           | 0        | 4/16       | 25%       |
| 7. Ticketed Events         | 12        | 4      | 2       | 5       | 0           | 1        | 8.5/20     | 42.5%     |
| 8. Gift Card Discovery     | 7         | 0      | 0       | 7       | 0           | 0        | 0/7        | 0%        |
| 9. Guest Experience        | 10        | 2      | 4       | 3       | 1           | 0        | 7/17       | 41.2%     |
| 10. Operator Acquisition   | 10        | 1      | 0       | 9       | 0           | 0        | 1/10       | 10%       |
| 11. SEO & Discovery        | 10        | 4      | 2       | 1       | 0           | 3        | 8.5/17     | 50%       |
| 12. Privacy & Data         | 8         | 3      | 3       | 2       | 0           | 0        | 7.5/13     | 57.7%     |
| 13. Navigation & Dead-Ends | 10        | 7      | 2       | 0       | 0           | 0        | 15/17      | 88.2%     |
| 14. Consumer Account       | 8         | 0      | 2       | 6       | 0           | 0        | 1/8        | 12.5%     |
| 15. Monetization           | 10        | 4      | 3       | 2       | 0           | 1        | 9.5/17     | 55.9%     |
| 16. Stress Scenarios       | 10        | 0      | 5       | 4       | 0           | 1        | 4.5/18     | 25%       |
| 17. Missing Docs           | 10        | 0      | 2       | 6       | 0           | 2        | 1.5/15     | 10%       |
| 18. Cross-Boundary         | 14        | 1      | 0       | 13      | 0           | 0        | 1/14       | 7.1%      |
| **TOTAL**                  | **186**   | **37** | **41**  | **100** | **1**       | **10**   | **96/278** | **34.5%** |

---

## TOP FINDINGS (Ranked by Leverage)

### 1. Consumer Identity Does Not Exist (Domain 14: 12.5%)

No cross-tenant consumer identity. Same email = different person per chef. No unified dashboard, no history, no continuity. Every consumer interaction is isolated. This is the foundation everything else depends on.

### 2. Three Directories, Zero Convergence (Domain 4: 5%)

`/chefs`, `/nearby`, `/hub/circles` are three parallel worlds with zero data connections. No FK between `directory_listings` and `chefs`. No unified search. Consumer must understand ChefFlow's internal taxonomy to use discovery.

### 3. Gift Card Lifecycle is Broken (Domain 8: 0%)

Gift cards work for purchase but dead-end for recipients. No browse link in recipient email. No redemption in booking flow. No platform-level gift card. No global discovery page. Zero of seven questions passed.

### 4. Operator Acquisition is a Dead End (Domain 10: 10%)

Directory listing welcome emails have NO signup CTA. Outreach emails explicitly hide ChefFlow branding. Listing data doesn't pre-populate on signup. No analytics for operators. The directory generates zero operator conversions by design.

### 5. Cross-Boundary Connections are Untapped Gold (Domain 18: 7.1%)

13 of 14 cross-feature connections are FAIL. Ingredients don't link to matched-cuisine chefs. Event recaps don't generate content. Response time isn't tracked. Collaboration isn't visible. Every feature is an island.

### 6. Missing Documentation Creates Phantom Architecture (Domain 17: 10%)

7+ memory files referenced in MEMORY.md don't exist. 2+ specs referenced in CLAUDE.md don't exist. Blueprint claims 95% but consumer side is ~30%. Documentation describes a system that partially doesn't exist.

### 7. Post-Event Loop Doesn't Loop (Domain 6: 25%)

Events end with a single "Book Again" link that doesn't pre-fill data. No recommendations, no subscription, no guest-to-client conversion automation. Meal feedback is siloed. The retention loop is one link, not a loop.

---

## Research Sources

- **MemPalace mining:** 293K+ drawers, 112K compressed entries, 50+ session digests, 20+ memory files
- **Codebase audit:** 78+ public pages, 14 cross-boundary data flows, 30+ specs/research documents
- **Key specs:** `consumer-first-discovery-and-dinner-planning-expansion.md`, `nearby-directory-redesign.md`
- **Key research:** `2026-04-05-food-directory-identity-and-ux.md`, `2026-04-05-food-directory-persona-research-primary.md`
- **Key contradictions:** Blueprint "complete" vs project-map "partially complete." Blueprint 95% vs consumer-side ~30%. `/discover` references persist after `/nearby` rename.
- **Missing files confirmed:** 7 memory project files, 2+ spec files referenced but not on disk
