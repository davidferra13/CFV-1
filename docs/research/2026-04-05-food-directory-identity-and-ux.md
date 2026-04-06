# Food Directory Identity & UX Research Report

**Date:** 2026-04-05
**Agent:** Research
**Status:** Complete

---

## Executive Summary

Listing businesses from public data without their consent is legally well-established (First Amendment, ODbL), but the current "Discover" page feels like a scraped database because it lacks the three things that make directories feel consumer-grade: photos (or smart substitutes), a search-first entry point, and a name that communicates intent. This report provides a legal foundation confirming ChefFlow is on solid ground, a ranked list of name options, and specific UX and image strategies drawn from how Airbnb, DoorDash, Yelp, and Google Maps solve these exact problems.

---

## 1. Legal Analysis: Listing Businesses Without Consent

### The Short Answer: You're Fine

Every major directory platform (Yelp, Google Maps, TripAdvisor, Apple Maps) lists businesses without asking permission. This is standard practice, not a legal gray area.

### Legal Precedent

| Case / Principle                  | What It Established                                                                                                                                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spiegelman v. Yelp (2020, CA)** | Businesses cannot use publicity rights or privacy claims to force removal from a review/directory platform. Yelp won on anti-SLAPP grounds. Court: "Yelp's reviews indisputably contribute to public debate and help consumers make informed decisions." |
| **First Amendment**               | Discussing and listing publicly-operating businesses is protected speech. "The business may belong to you, but the discussion about the business belongs to the people having the discussion."                                                           |
| **Public Records Doctrine**       | Business names, addresses, and phone numbers are public records. No privacy interest attaches to information a business voluntarily makes public by operating.                                                                                           |

### OpenStreetMap / ODbL Compliance

ChefFlow's data comes from OpenStreetMap, licensed under the Open Database License (ODbL). Commercial use is explicitly permitted. Requirements:

| Requirement                            | ChefFlow Status                                                                                                                                                                                                                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Attribution**                        | Already present in the trust footer ("Listing data (c) OpenStreetMap contributors") with link to copyright page                                                                                                                                                                           |
| **Link to ODbL**                       | Already present in the trust footer                                                                                                                                                                                                                                                       |
| **Share-alike on derivative database** | AI enrichment (business type classification, cuisine tagging) likely creates a derivative database. The enriched data layer should remain ODbL-compatible if distributed. If only displayed (not offered as a downloadable dataset), this is a "Produced Work" and can be licensed freely |
| **No restriction on commercial use**   | ODbL explicitly allows charging for services built on the data                                                                                                                                                                                                                            |

### What ChefFlow Must Do

1. **Keep the attribution footer** (already done, looks good)
2. **Offer a removal/correction path** (already present via nomination form, but should be more prominent)
3. **Never claim ownership of OSM data** (not an issue currently)
4. **Do NOT offer the enriched database as a bulk download** unless you want share-alike obligations on the AI layer

### What ChefFlow Does NOT Need To Do

- Get consent from businesses before listing them
- Notify businesses they've been listed
- Remove a listing just because a business asks (though doing so voluntarily builds trust)
- Worry about "scraping" claims (this is public OSM data, not scraped from private sites)

### Risk Assessment: LOW

The developer's instinct that it "feels creepy" is a perception problem, not a legal one. The fix is UX, not compliance.

**Sources:**

- [Spiegelman v. Yelp analysis (Eric Goldman)](https://blog.ericgoldman.org/archives/2020/02/yelp-defeats-businesses-right-to-be-forgotten-claims-spiegelman-v-yelp.htm)
- [Avvo legal Q&A: listing businesses without permission](https://www.avvo.com/legal-answers/can-i-list-business-like-restaurants-on-my-website-5546118.html)
- [ODbL License FAQ (OSM Foundation)](https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ)
- [OSM Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)

---

## 2. UX Recommendations: From Database to Discovery

### What the Best Platforms Do

#### DoorDash: Zero-Friction Entry

- **One input field** replacing the hero: "Enter your address" (not a search bar, an intent declaration)
- Bright food photography as background (not stock, real food close-ups)
- No filters visible on landing. Filters appear after first interaction
- Mobile-first layout stripped of navigation clutter

#### Airbnb: Photo-First Cards

- **Every listing has a photo** (this is the single biggest differentiator)
- Search bar uses "Where, When, Who" structure (progressive disclosure)
- Category icons as horizontal scrollable pills (not dropdowns)
- Trust badges ("Guest Favorite", Superhost) replace star ratings
- White/clean canvas where photography is the only color source

#### Yelp: Progressive Complexity

- Landing shows popular/nearby categories, not a wall of listings
- Search suggests categories as you type (autocomplete drives discovery)
- Filters are horizontal pills, not dropdown selects
- "Claimed" badge with checkmark creates trust hierarchy between listings

### What ChefFlow Should Change

| Current                                                | Problem                                            | Recommended                                                                                                                                 |
| ------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing shows a state grid with abbreviations          | Feels like a database index                        | Show a search bar + popular categories with icons. Reserve the state grid for a "Browse by location" section below                          |
| 5 dropdown `<select>` filters                          | Dropdowns are the least engaging filter pattern    | Horizontal scrollable pills (like Airbnb categories). Dropdowns as secondary "More filters"                                                 |
| No visual hierarchy between listings                   | All cards look the same regardless of data quality | Verified/claimed listings get richer cards. Unclaimed get minimal cards. Create aspiration for operators to claim                           |
| Hero says "Discover great food near you"               | Generic, no personality                            | Show a big search input with smart placeholder text. Rotate examples: "Thai food in Boston", "Caterers near Austin", "Bakeries in Portland" |
| "Add your business" button is small, in results header | Operators miss it                                  | Dedicated "Are you a food business?" banner between results sections                                                                        |

### What ChefFlow Should Keep

- The trust footer explaining data source (good, honest, differentiating)
- The nomination form (rename to "Know a great spot? Tell us")
- Business type pill quick-select (good pattern, just needs icons)
- Suspense streaming for results (good technical choice)
- The card layout with cuisine tags (good information density)

---

## 3. Name Recommendations

"Discover" communicates nothing. It's a verb without context. Here are options ranked by how well they communicate "find food businesses near you" in a single word/phrase.

### Tier 1: Recommended

| Name         | Why                                                                                                                                 | Risk                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **The Menu** | Everyone knows what a menu is. "Check The Menu" is natural language. Implies food, choice, browsing. Pairs well with ChefFlow brand | Low. Broad enough to cover all food business types  |
| **Nearby**   | Communicates locality instantly. "What's Nearby" is a complete thought. Works as nav label and page title                           | Low. Slightly generic but very clear                |
| **Feed**     | Double meaning: food + content feed. Modern, short, memorable. "Browse the Feed" works                                              | Medium. Could be confused with social media content |

### Tier 2: Strong Alternatives

| Name           | Why                                                                     | Risk                                                              |
| -------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Local Eats** | Descriptive, warm, approachable. "Find Local Eats" is immediately clear | Low. Slightly long for a nav label                                |
| **The Table**  | Evocative. Everyone eats at a table. "Find a seat at The Table"         | Medium. Less obviously a directory                                |
| **Feast**      | Energetic, food-forward. "Browse the Feast"                             | Medium. Implies abundance, which is good for millions of listings |
| **Food Map**   | Literal, clear, searchable. Users know exactly what to expect           | Low. Functional but not exciting                                  |

### Tier 3: Functional but Weaker

| Name          | Why                                                                               | Risk                  |
| ------------- | --------------------------------------------------------------------------------- | --------------------- |
| **Directory** | Honest and clear but boring. No personality                                       | No risk, no reward    |
| **Eat**       | Too short, too generic, hard to search for                                        | High ambiguity        |
| **Grub**      | Casual, memorable, but may feel unprofessional for high-end operators             | Medium. Tone mismatch |
| **Food Find** | Already used by an Australian platform (foodfind.com.au). Descriptive but generic | Trademark overlap     |

### Recommendation

Go with **"The Menu"** for the product name and `/menu` or `/the-menu` as the route. It works at every scale:

- Nav label: "The Menu"
- Page title: "The Menu - Find Food Near You"
- Conversational: "Check The Menu for caterers in Boston"
- SEO: "the menu food directory" is highly searchable

If "The Menu" feels too specific to restaurants, **"Nearby"** is the safest alternative.

---

## 4. Image Strategy: Making Listings Feel Alive Without Photos

This is the hardest problem. ~99% of listings will have no photos. Here's what works.

### Strategy: Category-Based Visual System

Instead of leaving a blank gray box, assign each business type a distinct visual treatment.

#### Option A: Gradient + Icon (Recommended, Zero Cost)

Each business type gets a unique gradient background + a simple SVG icon.

| Business Type | Gradient              | Icon             |
| ------------- | --------------------- | ---------------- |
| Restaurant    | Warm amber to orange  | Plate + utensils |
| Private Chef  | Deep burgundy to rose | Chef hat         |
| Caterer       | Teal to emerald       | Serving platter  |
| Food Truck    | Yellow to lime        | Truck silhouette |
| Bakery        | Pink to peach         | Croissant        |
| Meal Prep     | Blue to cyan          | Container stack  |
| Pop-Up        | Purple to violet      | Sparkle/star     |
| Supper Club   | Gold to amber         | Candle/table     |

This is what the current code partially does (showing the first letter of the business name in a stone-colored box). The upgrade is: replace the single letter with a category-specific gradient + icon. Immediately more visual, zero API cost, zero legal risk.

#### Option B: Curated Stock Photo Set (Low Cost)

Purchase 8-10 high-quality food photos (one per business type) from Unsplash Pro or similar. Use them as category defaults. Every bakery without a photo shows the same beautiful bakery shot. Better than gradients, but every unclaimed bakery looks identical.

#### Option C: AI-Generated Category Illustrations (Medium Cost, One-Time)

Use an image generation model to create stylized illustrations for each category. Not photos, not icons, but warm illustrated scenes. Think Airbnb's 3D illustration system but for food categories. This requires one design session, then the assets are static forever.

### What NOT To Do

- **Do not use AI to generate fake photos of specific businesses.** This crosses the "hallucination" line
- **Do not scrape photos from business websites.** Copyright violation
- **Do not leave blank/gray placeholder boxes.** This is what makes it feel like a database
- **Do not show a generic "no image" icon.** Users read this as "broken"

### Implementation Priority

1. **Immediately:** Replace the single-letter placeholder with gradient + category icon (Option A). This is a CSS-only change
2. **Next sprint:** Add a photo_url field that claimed businesses can populate
3. **Later:** Consider Option C for a more polished look

---

## 5. Operator Trust & Claiming Strategy

### The Perception Problem

The "creepy database" feeling comes from operators seeing their business listed without their knowledge. The fix is not removing listings; it's framing the listing as a gift, not surveillance.

### How Yelp and Google Handle This

| Platform        | How Unclaimed Listings Look                                                                                                                                          | Claim Flow                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Yelp**        | Shows basic info, no "claimed" badge. Prominent "Claim this business" CTA. Auto-populated from public data. Reverts to "unclaimed" after 90 days of owner inactivity | Search for your business at biz.yelp.com/claim. Verify via email, phone, or text to the number on record |
| **Google**      | Shows "Own this business?" link in the knowledge panel. Basic info from public sources. No verification badge                                                        | Search at google.com/business. Verify via postcard, phone, email, or video call                          |
| **TripAdvisor** | Shows listing with "Manage this listing" prompt. Less data than claimed listings                                                                                     | Similar email/phone verification                                                                         |

### What ChefFlow Should Build

#### Phase 1: Reframe the Listing (Now)

- Change the "Discovered" badge to something neutral like "Listed" or remove it entirely
- Add a subtle "Is this your business? Claim it for free" link on every unclaimed listing card
- The claim page should lead with benefits: "Add photos, update your hours, respond to inquiries"
- Frame the listing as free marketing: "Your business is already getting visibility. Take control of how it appears"

#### Phase 2: Claim Flow (Next)

1. Operator clicks "Claim this business" on their listing
2. Search/select their listing (or it's pre-selected from the link)
3. Enter business email + phone
4. Verify via email code or phone call to the number on the listing
5. On verification: badge changes to "Claimed", operator gets a basic dashboard to edit info and add photos

#### Phase 3: Verified Tier (Later)

- Claimed businesses that connect a ChefFlow account get the "Verified" badge
- Verified listings appear higher in search results
- Verified listings get richer cards (photos, description, hours)
- This creates a natural upgrade funnel into ChefFlow's operator tools

### Trust Copy (Use This)

**On the listing page (footer or banner):**

> "This listing was compiled from public data sources including OpenStreetMap. Business owners can claim their listing for free to add photos, update details, and connect with customers. Anyone can request a correction or removal at any time."

**On the claim page:**

> "Your business is already listed in our directory, which means customers can find you. Claiming your listing lets you control what they see: add photos, update your hours, highlight your specialties, and respond to inquiries. It's free, and it takes 2 minutes."

---

## 6. Specific Recommendations for ChefFlow Implementation

### Priority 1: Visual Identity (Do First)

- [ ] Rename from "Discover" to "The Menu" (or chosen name). Update route, nav, metadata, OG tags
- [ ] Replace single-letter placeholder with gradient + category icon system
- [ ] Redesign the landing view: big search bar at top, category pills with icons below, popular cities as a secondary section

### Priority 2: Search Experience (Do Second)

- [ ] Replace dropdown `<select>` filters with horizontal scrollable pill buttons (keep business type pills, add cuisine pills)
- [ ] Add search autocomplete suggesting cities, business types, and cuisine as the user types
- [ ] Add rotating placeholder text in search input: "Thai food in Boston...", "Caterers near Austin..."
- [ ] Move state grid into a collapsible "Browse by location" section

### Priority 3: Operator Trust (Do Third)

- [ ] Add "Is this your business? Claim it free" link to every unclaimed listing card
- [ ] Build a `/claim` page with verification flow (email code to business email or phone on record)
- [ ] Create visual hierarchy: Verified > Claimed > Listed (replace "Discovered" language)
- [ ] Add a prominent "Are you a food business?" banner in the results view

### Priority 4: Card Richness (Do Fourth)

- [ ] Claimed listings show photos, hours, and richer descriptions
- [ ] Unclaimed listings show gradient + icon placeholder with "Claim to add photos" prompt
- [ ] Verified listings get a subtle border treatment or "featured" position in results
- [ ] Add a "Visit website" primary action and "Directions" secondary action (already present, good)

### What to NOT Build

- **Rating/review system.** Not now. Yelp's entire legal defense rests on user-generated reviews being protected speech. ChefFlow doesn't have review volume to make this useful, and it adds moderation overhead
- **Automated outreach to unclaimed businesses.** This crosses from "public directory" to "unsolicited contact" and will generate complaints
- **Photo scraping from business websites.** Copyright issue. Let operators upload their own

---

## Sources

- [Spiegelman v. Yelp - Technology & Marketing Law Blog](https://blog.ericgoldman.org/archives/2020/02/yelp-defeats-businesses-right-to-be-forgotten-claims-spiegelman-v-yelp.htm)
- [Avvo: Can I list businesses without permission?](https://www.avvo.com/legal-answers/can-i-list-business-like-restaurants-on-my-website-5546118.html)
- [Avvo: Can Yelp publish your business without consent?](https://www.avvo.com/legal-answers/can-yelp-publish-your-name-and-business-on-there-s-3705212.html)
- [ODbL License & Legal FAQ (OSM Foundation)](https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ)
- [OSM Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)
- [OSM Copyright Page](https://www.openstreetmap.org/copyright)
- [Yelp: Why Claim Your Business Page](https://business.yelp.com/products/business-page/)
- [Yelp: Guide to Claiming Your Page](https://business.yelp.com/resources/articles/ultimate-guide-to-claiming-your-yelp-page/)
- [Google: Unclaimed Business Listings](https://reviewgrower.com/unclaimed-business-on-google/)
- [Airbnb Design System (Figma Community)](https://www.figma.com/community/file/1233410639171582044/airbnb-design-system)
- [How Great Design Was Key to Airbnb's Success](https://passionates.com/how-great-design-key-to-airbnbs-massive-success/)
- [DoorDash / Unbounce Landing Page Analysis](https://unbounce.com/landing-page-examples/best-landing-page-examples/)
- [Eater Restaurant Discovery App Relaunch](https://www.webwire.com/ViewPressRel.asp?aId=352494)
- [Zesty - Local Food Discovery (App Store)](https://apps.apple.com/us/app/zesty-local-food-discovery/id6743326355)
