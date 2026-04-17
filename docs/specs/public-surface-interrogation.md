# Public Surface Interrogation Protocol

> **Purpose:** 40 high-leverage questions that expose every failure point in what a first-time visitor (chef or consumer) experiences on cheflowhq.com. Each question either proves the surface works or reveals exactly where it breaks conversion, trust, or comprehension. Ordered by impact: conversion killers first, polish last.
>
> **Scope:** Only the public-facing surface. No auth-gated pages. Two personas: Chef (operator evaluating software) and Consumer (person seeking culinary experience).
>
> **Principle:** Every question is binary pass/fail. "Looks fine" is not a passing answer. If the answer requires judgment, the question is not specified enough.

---

## Coverage Map

| Q    | Title                                    | Persona  | Domain        | Status | Priority |
| ---- | ---------------------------------------- | -------- | ------------- | ------ | -------- |
| PS1  | Homepage Identity Split                  | Both     | Conversion    | SPEC   | P0       |
| PS2  | Operator Path Discoverability            | Chef     | Navigation    | SPEC   | P0       |
| PS3  | Zero-Chef Directory State                | Consumer | Dead End      | SPEC   | P0       |
| PS4  | Booking Form Friction                    | Consumer | Conversion    | SPEC   | P0       |
| PS5  | Operator Proof Gap                       | Chef     | Trust         | SPEC   | P0       |
| PS6  | Revenue Model Transparency               | Both     | Trust         | SPEC   | P0       |
| PS7  | Mobile First-Touch                       | Both     | Responsive    | SPEC   | P0       |
| PS8  | Geographic Coverage Dead End             | Consumer | Dead End      | SPEC   | P0       |
| PS9  | Chef Profile Inquiry Friction            | Consumer | Conversion    | SPEC   | P1       |
| PS10 | Homepage Hero Image Absence              | Consumer | Emotion       | SPEC   | P1       |
| PS11 | For-Operators to Signup Continuity       | Chef     | Conversion    | SPEC   | P1       |
| PS12 | About Page Linkage                       | Both     | Navigation    | SPEC   | P1       |
| PS13 | Page Load Performance (LCP)              | Both     | Performance   | SPEC   | P1       |
| PS14 | SEO Structural Completeness              | Both     | SEO           | SPEC   | P1       |
| PS15 | Booking Form Submission Feedback         | Consumer | UX            | SPEC   | P1       |
| PS16 | Directory Sort Default Relevance         | Consumer | UX            | SPEC   | P1       |
| PS17 | Chef Card Information Density            | Consumer | UX            | SPEC   | P1       |
| PS18 | Trust Page Substance                     | Consumer | Trust         | SPEC   | P1       |
| PS19 | Cross-Page CTA Consistency               | Both     | Navigation    | SPEC   | P1       |
| PS20 | Public Nav Information Architecture      | Both     | Navigation    | SPEC   | P1       |
| PS21 | Dinner Circles Value Proposition Clarity | Consumer | Conversion    | SPEC   | P2       |
| PS22 | Services Page Redundancy                 | Consumer | Navigation    | SPEC   | P2       |
| PS23 | Contact Page Utility                     | Both     | Conversion    | SPEC   | P2       |
| PS24 | FAQ Completeness                         | Both     | Trust         | SPEC   | P2       |
| PS25 | Chef Profile Empty States                | Consumer | Dead End      | SPEC   | P2       |
| PS26 | Ingredient Pages Public Value            | Consumer | Navigation    | SPEC   | P2       |
| PS27 | Dark Theme Readability                   | Both     | Accessibility | SPEC   | P2       |
| PS28 | Footer Link Audit                        | Both     | Navigation    | SPEC   | P2       |
| PS29 | Booking Thank-You Page Conversion        | Consumer | Conversion    | SPEC   | P2       |
| PS30 | Orphan Public Routes                     | Both     | Navigation    | SPEC   | P2       |
| PS31 | Social Proof Density                     | Consumer | Trust         | SPEC   | P2       |
| PS32 | Chef Signup Friction                     | Chef     | Conversion    | SPEC   | P2       |
| PS33 | Public Error Boundary                    | Both     | Resilience    | SPEC   | P2       |
| PS34 | Canonical URL Consistency                | Both     | SEO           | SPEC   | P3       |
| PS35 | Open Graph Image Coverage                | Both     | SEO           | SPEC   | P3       |
| PS36 | JSON-LD Structured Data                  | Both     | SEO           | SPEC   | P3       |
| PS37 | Accessibility (a11y) Baseline            | Both     | Accessibility | SPEC   | P3       |
| PS38 | Cookie Consent / Privacy Signal          | Both     | Legal         | SPEC   | P3       |
| PS39 | Newsletter Signup Dead End               | Both     | Conversion    | SPEC   | P3       |
| PS40 | Public Page Response Codes               | Both     | Resilience    | SPEC   | P3       |

---

## TIER 1: CONVERSION KILLERS (P0)

### PS1: Homepage Identity Split

**Question:** Can a first-time visitor identify in under 5 seconds whether this site is for them (consumer seeking chef OR chef seeking software)?

**Current state:** Hero says "Hire a chef who actually does this." The operator path is one nav link ("For Operators") competing with 6 consumer links. A chef visiting cheflowhq.com gets no above-the-fold signal that this platform is also FOR them.

**Pass criteria:**

- Above the fold, both value propositions are visible without scrolling or clicking nav
- A chef can reach /for-operators in 1 click from a visually distinct element (not buried in a dropdown)
- A consumer can reach /book or /chefs in 1 click from a visually distinct element
- The hero does not exclusively address one persona

**Verification:** Playwright screenshot at 1440x900 and 375x812. Check if both CTAs visible above fold. Check if "For Operators" requires dropdown interaction to discover.

**What to build:** Dual-path hero with two clear lanes, or a secondary hero band below fold dedicated to operators.

---

### PS2: Operator Path Discoverability

**Question:** From ANY public page, can a chef reach the operator value proposition in 1 click without opening a dropdown menu?

**Current state:** "For Operators" is a single nav link. On mobile, it is inside the hamburger menu. No persistent footer CTA targets operators. The about page mentions operators but does not link to /for-operators.

**Pass criteria:**

- "For Operators" link visible in the desktop header WITHOUT opening a dropdown
- "For Operators" link visible in the mobile navigation WITHOUT scrolling past consumer links
- Footer contains a clear "I Am a Chef" or equivalent CTA linking to /for-operators
- /about page links to /for-operators

**Verification:** Playwright: check desktop header for visible "For Operators" without hover. Check mobile hamburger for position of operator link. Check footer for operator CTA. Check /about for link to /for-operators.

---

### PS3: Zero-Chef Directory State

**Question:** When a consumer searches /chefs and gets zero results for their location, does the page prevent abandonment?

**Current state:** Zero results shows "No chefs match these filters yet" with a "Book a Chef" CTA and service type chips. No email capture. No "notify me when chefs join your area." Dead conversion path.

**Pass criteria:**

- Zero-result state includes email capture: "Get notified when chefs join [location]"
- Zero-result state shows how many chefs exist on the platform total (social proof: "42 chefs on ChefFlow, expanding to your area")
- Zero-result state offers the booking form as fallback with explanation: "Submit your event details and we will route it to chefs who serve your area"
- The "Reset filters" button is clearly distinguished from "Book a Chef"

**Verification:** Playwright: navigate to /chefs with location filter set to a location with no coverage. Screenshot. Check for email capture form. Check for platform-wide chef count.

**What to build:** Email waitlist capture component for zero-result directory states. Stores email + desired location. Simple DB table: `directory_waitlist(email, location, created_at)`.

---

### PS4: Booking Form Friction

**Question:** Can a consumer complete the /book form in under 90 seconds on first visit?

**Current state:** 12 fields: name, email, phone, location (autocomplete), date, time, guest count, occasion, service type, budget, dietary restrictions, notes. Plus honeypot. That is a lot of commitment before any relationship exists.

**Pass criteria:**

- Required fields are 5 or fewer (name, email, location, date, service type)
- Optional fields are visually de-emphasized (collapsed, lighter styling, or progressive disclosure)
- Form has clear progress indication or is visually sectioned
- "Not sure yet" is a valid answer for budget (already exists), guest count, and occasion
- Form saves draft to sessionStorage on blur (already exists, verify it works)

**Verification:** Playwright: time the form completion with minimal required fields. Screenshot each step. Verify sessionStorage draft persistence by navigating away and back. Verify all selects have a "not sure" default.

**What to build:** Progressive disclosure: show name/email/location/date/service type first. "Tell us more (optional)" expander reveals remaining fields. Reduces visual overwhelm without removing options.

---

### PS5: Operator Proof Gap

**Question:** Does /for-operators contain any visual proof that the software exists and works?

**Current state:** Pure text. Four pain points, eight capability names, one "Get Started Free" CTA. Zero screenshots, zero videos, zero demos, zero testimonials. A chef is asked to create an account based on copy alone.

**Pass criteria:**

- At least 3 screenshots showing real UI (dashboard, menu builder, event lifecycle)
- OR a video/GIF walkthrough (under 30 seconds)
- OR an interactive demo (sandbox account, guided tour)
- At least 1 testimonial or case study from a real operator

**Verification:** Playwright: navigate to /for-operators. Check for `<img>` or `<video>` elements. Check for testimonial/quote sections. If none exist, this is a hard fail.

**What to build:** Screenshot gallery component showing 3-4 real UI screens. Start with static screenshots (cheapest to implement). Can upgrade to interactive demo later.

---

### PS6: Revenue Model Transparency

**Question:** Can a visitor understand how ChefFlow makes money (or doesn't) within 2 clicks of the homepage?

**Current state:** "Free," "no commission," "no platform fee" appears everywhere. But HOW it is free is never explained. Experienced chefs are skeptical of "free forever" claims from platforms. The supporter/contribution model is not mentioned anywhere on the public surface.

**Pass criteria:**

- /about OR /for-operators OR a dedicated section explains the revenue model
- The explanation is honest and specific (not vague "we believe in free")
- The explanation appears without requiring the visitor to create an account

**Verification:** Playwright: search all public page text content for "how we make money", "revenue", "supporter", "contribution", "business model." Check /about and /for-operators for revenue model explanation.

**What to build:** Add a "How is this free?" section to /for-operators and /about. Two sentences: "ChefFlow is funded by voluntary supporter contributions from chefs who find value in the platform. There is no paywall, no commission, and no feature locked behind a subscription."

---

### PS7: Mobile First-Touch

**Question:** Is the homepage usable and conversion-ready on a 375px-wide screen?

**Current state:** Responsive design exists. Need to verify: hero text is readable, CTAs are thumb-reachable, chef cards don't overflow, search input is usable, hamburger menu works, form inputs are not clipped.

**Pass criteria:**

- Hero headline fully visible without horizontal scroll at 375px width
- Primary CTA ("Book a Chef") is at least 44px tall (touch target)
- Chef cards stack to single column
- No horizontal overflow on any element
- Hamburger menu opens and all links are reachable
- Booking form inputs are full-width and not clipped

**Verification:** Playwright at 375x812 viewport. Screenshot homepage, /chefs, /book, /for-operators. Check for horizontal scroll via `document.documentElement.scrollWidth > document.documentElement.clientWidth`.

---

### PS8: Geographic Coverage Dead End

**Question:** When the directory has zero chefs in a consumer's area, is there a path forward that does not feel like a dead end?

**Current state:** Two surfaces handle this: /chefs zero-result (shows service type chips + book CTA) and /book form (accepts any location). But neither says "we don't have coverage here yet" honestly. The booking form accepts the inquiry but what happens if no chefs match?

**Pass criteria:**

- /book form submission for uncovered areas returns honest feedback: "We don't have chefs in [location] yet. We've saved your request and will notify you when coverage reaches your area."
- The thank-you page after booking does NOT say "chefs will reach out" if zero chefs matched
- There is no silent void where a consumer submits a form and never hears back

**Verification:** Check booking route handler (`app/api/book/route.ts` or server action). Trace what happens when `matched_count === 0`. Check thank-you page copy for conditional messaging based on match count.

**What to build:** Conditional thank-you messaging. If matches > 0: "Matched chefs will reach out within 24-48 hours." If matches === 0: "We don't have chefs in your area yet. Your request is saved and we will reach out when coverage expands."

---

## TIER 2: TRUST & UX (P1)

### PS9: Chef Profile Inquiry Friction

**Question:** Can a consumer message a chef without filling out a full event inquiry form?

**Current state:** Every path to contact a chef goes through `/chef/[slug]/inquire`, which is a structured inquiry form (event details, date, guests, budget). There is no lightweight "Hi, I have a question" path.

**Pass criteria:**

- Chef profile has BOTH: (a) structured inquiry for event booking AND (b) lightweight contact option for questions
- The lightweight option requires only name + email + message (3 fields)
- OR the chef's email/phone is visible on the profile (if the chef opts in)

**Verification:** Navigate to a chef profile. Check for contact options beyond the inquiry form. Check if any chef has direct contact info visible.

**What to build:** "Quick question" form on chef profile: name, email, free-text message. Routes to chef's inbox as a message, not an event inquiry. Lower commitment, higher engagement.

---

### PS10: Homepage Hero Image Absence

**Question:** Does the homepage hero contain any visual content (food photography, chef imagery, event ambiance)?

**Current state:** Hero is text + gradient + CTAs. No images. No food. No warmth. The featured chef cards below have images, but the first thing a consumer sees is a dark gradient with text.

**Pass criteria:**

- Hero section contains at least one high-quality image (food, chef working, dinner scene)
- The image is optimized (WebP/AVIF, responsive srcset, lazy or priority loading)
- The image does not slow LCP below 2.5s

**Verification:** Playwright: screenshot homepage hero. Check for `<img>` or `<Image>` elements within the hero `<section>`. Measure LCP.

**What to build:** Hero background image or side-by-side layout with a curated food/event photo. Use the developer's own portfolio photos from `davidfood/` directory.

---

### PS11: For-Operators to Signup Continuity

**Question:** Does clicking "Get Started Free" on /for-operators land the chef on a page that continues the operator narrative?

**Current state:** CTA links to signup. Signup page says "Manage your chef work, your way" but provides no context about what happens after account creation. The rich narrative from /for-operators (food costing, event lifecycle, client tracking) disappears.

**Pass criteria:**

- Signup page references at least 2-3 capabilities mentioned on /for-operators
- OR signup page has a sidebar/panel with feature highlights
- After signup, the first screen acknowledges the chef is new and shows them where to start

**Verification:** Trace the "Get Started Free" href. Navigate to the destination. Check if any /for-operators content carries forward. Check post-signup first-screen experience.

---

### PS12: About Page Linkage

**Question:** Is the /about page reachable from the homepage within 1 click, and does it link to both /for-operators and /chefs?

**Current state:** /about is in the footer under "Company." Not in the main nav. The about page itself has "Browse Chefs" and "I Am a Chef" CTAs but needs verification.

**Pass criteria:**

- /about is linked from the footer (already true, verify)
- /about contains CTA linking to /for-operators
- /about contains CTA linking to /chefs or /book
- /about page tells the founder story (already true)

**Verification:** Check footer for /about link. Read /about page CTAs. Verify both persona paths are present.

---

### PS13: Page Load Performance (LCP)

**Question:** Do all core public pages load with LCP under 2.5s on a throttled 3G connection?

**Core pages:** `/`, `/chefs`, `/book`, `/for-operators`, `/chef/[slug]`, `/about`, `/how-it-works`

**Pass criteria:**

- LCP < 2.5s on simulated "Slow 3G" for all 7 pages
- No layout shift (CLS < 0.1)
- Time to Interactive < 5s

**Verification:** Lighthouse CI or Playwright with performance tracing. Run against prod build on localhost:3000.

---

### PS14: SEO Structural Completeness

**Question:** Do all public pages have unique `<title>`, `<meta description>`, canonical URL, and Open Graph tags?

**Pass criteria:**

- Every page in `app/(public)/**/page.tsx` exports `metadata` with title, description, openGraph, and alternates.canonical
- No two pages share the same title or description
- All canonical URLs use the production domain (cheflowhq.com), not localhost

**Verification:** Grep all `app/(public)/**/page.tsx` files for `export const metadata`. Check each has title, description, openGraph, alternates.canonical. Check for duplicates.

---

### PS15: Booking Form Submission Feedback

**Question:** After submitting the /book form, does the consumer get immediate, honest feedback about what happens next?

**Pass criteria:**

- Success: immediate redirect to thank-you page with matched chef count
- Success with 0 matches: different messaging (see PS8)
- Error: inline error message, form state preserved, no data loss
- Duplicate submission: prevented (button disabled during submit, or idempotency key)
- Loading state: spinner or disabled button during API call

**Verification:** Playwright: submit the booking form. Check for loading state. Check thank-you page. Submit again quickly to test duplicate prevention. Submit with network error to test error handling.

---

### PS16: Directory Sort Default Relevance

**Question:** Is the default sort order on /chefs optimized for conversion, not arbitrary?

**Current state:** Default sort is "featured" via `sortDirectoryChefs(allChefs, 'featured')`. Need to verify what "featured" means: is it chef completeness score, review count, response rate, or random?

**Pass criteria:**

- Default sort prioritizes: (1) chefs accepting inquiries, (2) chefs with portfolio images, (3) chefs with reviews
- Chefs not accepting inquiries appear last (browsable but not prominently placed)
- Sort logic is documented and intentional, not coincidental

**Verification:** Read `lib/directory/utils.ts` `sortDirectoryChefs('featured')` implementation. Check what signals it uses. Verify the first 3 results on /chefs are high-quality profiles.

---

### PS17: Chef Card Information Density

**Question:** Does each chef card on /chefs provide enough information for a consumer to decide whether to click, without overloading?

**Pass criteria:**

- Each card shows: name, photo (or meaningful placeholder), location, service types (max 2), availability status, one trust signal (reviews or rating)
- Cards do NOT show: bio text, social links, partner venues, cuisine chips (these belong on the profile)
- Card layout is scannable (consumer can evaluate 6 cards in under 10 seconds)

**Verification:** Screenshot /chefs page. Count distinct information elements per card. Check if any card has more than 7 data points visible.

**Current state:** Cards show: photo, availability badge, rating, name, tagline, service types, social links, reviews link, Google reviews link, website link, coverage area, inquiry CTA. That is 12+ elements. Likely overloaded.

---

### PS18: Trust Page Substance

**Question:** Does /trust contain verifiable information, or is it self-attestation?

**Pass criteria:**

- Page contains at least one externally verifiable claim (e.g., "reviewed by X," "Y years in operation," "Z chefs listed")
- Data presented is dynamic (pulled from DB, not hardcoded)
- No claims that cannot be independently verified

**Verification:** Navigate to /trust. Check for hardcoded numbers vs. dynamic counts. Check for external references.

---

### PS19: Cross-Page CTA Consistency

**Question:** Does every public page end with a clear next action, and do all CTAs use consistent language?

**Pass criteria:**

- Every public page has at least one CTA above the fold AND one at the bottom
- "Book a Chef" always links to /book (not sometimes /chefs, sometimes /book)
- "Browse Chefs" always links to /chefs
- "Get Started Free" always links to /auth/signup
- No page ends with only body text and no CTA

**Verification:** Crawl all public pages. Check last visible section for CTA presence. Check CTA label-to-href mapping consistency across pages.

---

### PS20: Public Nav Information Architecture

**Question:** Can a first-time visitor understand the nav structure in under 5 seconds?

**Current state:** Desktop nav has a "Hire a Chef" dropdown with 6 items (Book, Browse, Dinner Circles, Services, How It Works, Food Directory) + "For Operators" + "Ingredients." That is 9 destinations across 3 top-level items, with 6 hidden in a dropdown.

**Pass criteria:**

- Top-level nav has no more than 5 items
- No dropdown contains more than 4 items
- Items are grouped by user intent (finding a chef, learning about ChefFlow, becoming a chef)
- "Ingredients" is justified as top-level or moved to footer

**Verification:** Count nav items. Map each to user intent. Check if "Ingredients" (public ingredient database) belongs in primary nav or is a niche feature better suited to footer.

---

## TIER 3: POLISH & COMPLETENESS (P2)

### PS21: Dinner Circles Value Proposition Clarity

**Question:** Can a consumer understand what "Dinner Circles" means from the homepage card alone?

**Current state:** Homepage says "Shared guest pages for the dinner itself." The /hub page explains more. But "Dinner Circles" is not a term anyone outside ChefFlow knows.

**Pass criteria:**

- Homepage card explains the concept without requiring the visitor to click through
- The name "Dinner Circles" is accompanied by a one-line explanation: "Guest coordination pages for your event"
- Consumer understands this is for THEM (guest), not for chefs

**Verification:** Read the homepage Dinner Circles section copy. Check if a first-time visitor could understand the feature without clicking "Learn about Dinner Circles."

---

### PS22: Services Page Redundancy

**Question:** Does /services provide unique value that /chefs and /how-it-works don't already cover?

**Pass criteria:**

- /services contains information not available on /chefs or /how-it-works
- OR /services is a better entry point for a specific search intent (e.g., "private chef for meal prep")
- If redundant, it should redirect to /chefs or be removed from nav

**Verification:** Read /services content. Compare to /chefs and /how-it-works. Check for unique content.

---

### PS23: Contact Page Utility

**Question:** Does /contact provide a working, monitored communication channel?

**Pass criteria:**

- Contact form submits to a monitored inbox (not a no-op)
- OR contact info (email, phone) is displayed
- Response time expectation is set ("We respond within 24 hours")
- Form has spam protection (honeypot, rate limit, or CAPTCHA)

**Verification:** Read /contact page. Check form submission handler. Verify the destination is monitored.

---

### PS24: FAQ Completeness

**Question:** Does /faq answer the top 5 questions a first-time visitor would ask?

**Minimum questions that must be answered:**

1. How much does a private chef cost?
2. How does the booking process work?
3. Is ChefFlow free?
4. How are chefs vetted/reviewed?
5. What if I need to cancel?

**Pass criteria:**

- All 5 questions are answered clearly
- Answers link to relevant pages (e.g., "How does booking work?" links to /how-it-works)
- No answers contain jargon or assume familiarity with ChefFlow

**Verification:** Read /faq page. Check for each of the 5 questions. Check for jargon.

---

### PS25: Chef Profile Empty States

**Question:** When a chef profile has no portfolio photos, no reviews, no bio, and no partner venues, is the profile still usable and does it not look broken?

**Pass criteria:**

- Empty profile shows meaningful placeholders (not blank white space)
- The inquiry CTA is still visible and functional
- The profile does not look "broken" or "under construction" - it looks like a new chef
- Minimum viable profile: name + service types + location + availability + inquiry CTA

**Verification:** Find a chef with minimal profile data (or create a test scenario). Screenshot the profile. Check for visual gaps, missing sections rendered as blank, or broken layout.

---

### PS26: Ingredient Pages Public Value

**Question:** Do /ingredients and /ingredient/[id] serve a clear purpose for a public visitor?

**Current state:** "Ingredients" is a top-level nav item. These pages show the ingredient database publicly. Is this a consumer feature (recipe inspiration?), a chef recruitment tool (show the depth of our data?), or an SEO play?

**Pass criteria:**

- The page has a clear value proposition for at least one persona
- The page is not a raw data dump
- If the primary value is SEO, the content is structured for search intent (e.g., "how much does saffron cost?")

**Verification:** Navigate to /ingredients and /ingredient/[id]. Assess whether a consumer or chef would find this useful. Check for structured data (schema.org).

---

### PS27: Dark Theme Readability

**Question:** Is all text on public pages readable against the dark background without straining?

**Pass criteria:**

- Body text contrast ratio is at least 4.5:1 (WCAG AA)
- Headings contrast ratio is at least 3:1
- No text uses stone-600 or darker on stone-900/950 background (common fail pattern)
- Links are distinguishable from body text by color, not just underline

**Verification:** Automated contrast checker on rendered pages. Flag any text element below 4.5:1 ratio.

---

### PS28: Footer Link Audit

**Question:** Do all footer links resolve to live, non-error pages?

**Pass criteria:**

- Every `<a>` in the footer returns HTTP 200 (or 301 redirect to a 200)
- No footer link goes to a 404, 500, or blank page
- No footer link goes to a page that says "coming soon" or is visibly incomplete

**Verification:** Extract all footer hrefs. HTTP GET each one. Check response code. Screenshot any non-200 destinations.

---

### PS29: Booking Thank-You Page Conversion

**Question:** Does the /book/[chefSlug]/thank-you page convert the visitor into a deeper relationship?

**Pass criteria:**

- Thank-you page acknowledges the submission with event details echo
- Page offers at least one secondary action: browse more chefs, create an account, share with friends
- Page does NOT just say "Thanks, we'll be in touch" and stop
- If match count is available, it is shown: "3 chefs in your area have been notified"

**Verification:** Submit a booking form. Check thank-you page content. Screenshot. Verify secondary CTAs exist.

---

### PS30: Orphan Public Routes

**Question:** Are there public routes that are not reachable from any navigation element (header, footer, or in-page link)?

**Known candidates from glob:** `/beta`, `/beta/thank-you`, `/cannabis-invite/[token]`, `/cannabis/public`, `/marketplace-chefs`, `/customers`, `/customers/[slug]`, `/compare`, `/partner-signup`, `/data-request`, `/reactivate-account`, `/staff-portal/[id]`

**Pass criteria:**

- Every route in `app/(public)/**/page.tsx` is either: (a) linked from nav/footer, (b) linked from another public page, (c) a token-gated utility page (share, proposal, feedback links sent via email), or (d) intentionally hidden and documented as such
- No orphan routes serve stale/broken/placeholder content

**Verification:** Build a reachability map. Start from homepage, crawl all internal links. Compare to full route list from glob. Flag unreachable routes.

---

### PS31: Social Proof Density

**Question:** How many distinct trust signals does a consumer encounter before reaching the booking form?

**Trust signals:** chef count, review count, "reviewed profiles" badge, "no commission" claim, founder story, partner venues, years of experience, Stripe payment badge

**Pass criteria:**

- Homepage shows at least 3 trust signals before the fold
- /chefs page shows at least 2 trust signals
- /book page shows at least 2 trust signals
- Trust signals use real data (not hardcoded text)

**Verification:** Inventory all trust signals on each page. Check if they use dynamic data or static copy.

---

### PS32: Chef Signup Friction

**Question:** Can a chef create an account in under 60 seconds?

**Pass criteria:**

- Signup form requires 4 or fewer fields (email, password, name, business name)
- No mandatory onboarding flow blocks access after signup (CLAUDE.md rule: no forced onboarding gates)
- Chef lands on a functional dashboard immediately after signup
- At least one "what to do first" nudge exists (not a blocker, a nudge)

**Verification:** Playwright: complete chef signup flow. Time it. Check for blocking onboarding. Screenshot first-load dashboard.

---

### PS33: Public Error Boundary

**Question:** If a public page crashes (server component throws), does the visitor see a branded error page or a raw Next.js error?

**Pass criteria:**

- `app/(public)/error.tsx` exists and renders a branded error state
- `app/(public)/not-found.tsx` exists and renders a branded 404
- Error page includes a "Go home" CTA
- No raw stack traces visible in production mode

**Verification:** Check for error.tsx and not-found.tsx in the (public) layout group. Navigate to a non-existent public route in prod mode. Screenshot.

---

## TIER 4: TECHNICAL FOUNDATION (P3)

### PS34: Canonical URL Consistency

**Question:** Do all canonical URLs use the production domain, and does no page have a canonical pointing to localhost?

**Pass criteria:**

- Every `alternates.canonical` uses `https://cheflowhq.com` or `https://app.cheflowhq.com`
- `NEXT_PUBLIC_APP_URL` is set correctly in production
- No canonical contains `localhost:3000` or `localhost:3100`

**Verification:** Grep all metadata exports for `canonical`. Check the BASE_URL fallback pattern. Verify production env var.

---

### PS35: Open Graph Image Coverage

**Question:** Do all public pages have an og:image set, and does the image URL resolve?

**Pass criteria:**

- Every public page has `openGraph.images` in metadata OR inherits a default from the layout
- The og:image URL returns HTTP 200 and is a valid image
- Image dimensions are at least 1200x630 (Facebook/LinkedIn minimum)

**Verification:** Grep metadata exports for `openGraph.images`. Check layout for default og:image. HTTP GET each image URL.

---

### PS36: JSON-LD Structured Data

**Question:** Does the homepage emit valid JSON-LD for Organization, WebSite, and SoftwareApplication schemas?

**Current state:** Homepage imports `OrganizationJsonLd`, `SoftwareApplicationJsonLd`, `WebSiteJsonLd`. Need to verify they render valid JSON-LD.

**Pass criteria:**

- `<script type="application/ld+json">` present in homepage HTML
- JSON parses without error
- Schema validates against schema.org
- Chef profile pages emit `Person` or `LocalBusiness` JSON-LD

**Verification:** Fetch homepage HTML. Extract JSON-LD scripts. Parse and validate against schema.org.

---

### PS37: Accessibility (a11y) Baseline

**Question:** Do all public pages pass WCAG 2.1 Level AA automated checks?

**Pass criteria:**

- No images without alt text
- All form inputs have associated labels
- All interactive elements are keyboard-navigable
- Skip-to-content link exists
- Focus indicators are visible
- Color contrast meets 4.5:1 for body text, 3:1 for large text

**Verification:** Run axe-core or Lighthouse accessibility audit on all core public pages.

---

### PS38: Cookie Consent / Privacy Signal

**Question:** Does the site set any cookies or tracking before visitor consent?

**Pass criteria:**

- No third-party cookies set on first visit (before any interaction)
- If analytics exist, they are consent-gated or privacy-preserving (no PII)
- Privacy policy is linked from every page (footer)
- Cookie banner appears if any non-essential cookies are used

**Verification:** Open homepage in incognito. Check cookies before any interaction. Check for analytics scripts. Verify privacy policy link in footer.

---

### PS39: Newsletter Signup Dead End

**Question:** Does the footer newsletter signup actually work?

**Pass criteria:**

- Email input + submit button submits to a real handler
- Success shows confirmation message
- Error shows error message
- The email is stored somewhere retrievable (DB table or email service)
- No silent success (form clears without feedback)

**Verification:** Submit the newsletter form with a test email. Check for success feedback. Check backend for storage.

---

### PS40: Public Page Response Codes

**Question:** Do all public pages return HTTP 200 (or appropriate redirect) and not 500?

**Pass criteria:**

- Every `app/(public)/**/page.tsx` route returns 200 when accessed directly
- Dynamic routes with invalid params return 404 (not 500)
- No public page throws an unhandled error on the server

**Verification:** Build a route list from the glob. HTTP GET each route. Log response codes. Screenshot any non-200 responses.

---

## Execution Protocol

### Phase 1: Automated Verification (build tests)

- Write Playwright specs for PS1, PS3, PS4, PS7, PS8, PS15, PS28, PS30, PS40
- These are binary pass/fail and can run in CI

### Phase 2: Manual Audit (screenshot + assess)

- PS5, PS10, PS17, PS20, PS21, PS22, PS26 require human judgment
- Agent screenshots and reports; developer decides action

### Phase 3: Build (fix failures)

- Priority order: P0 first, then P1, then P2, then P3
- Each fix gets its own commit referencing the PS number: `fix(PS3): add waitlist capture to zero-result directory state`

### Phase 4: Regression Protection

- After fixes, add the Playwright spec to prevent regression
- Add the question to the system-integrity-question-set.md coverage map
