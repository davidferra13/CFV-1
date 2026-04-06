# ChefFlow Public Pages Inventory

> Complete inventory of every public-facing surface on cheflowhq.com that does not require authentication.
> Last updated: 2026-04-05

---

## Summary

| Category                                       | Count                         |
| ---------------------------------------------- | ----------------------------- |
| Marketing / Information                        | 14 pages                      |
| Legal / Policy                                 | 3 pages (+1 alias)            |
| Consumer Discovery                             | 9 pages                       |
| Token-Gated Experiences                        | 11 pages                      |
| Hub / Social                                   | 3 pages                       |
| Cannabis                                       | 2 pages                       |
| Gift Cards                                     | 2 pages                       |
| Partner / Venue                                | 3 pages                       |
| Auth (pre-login)                               | 9 pages                       |
| Kiosk                                          | 3 pages                       |
| Staff / Demo / Survey                          | 5 pages                       |
| Utility (unsubscribe, reactivate, short links) | 4 pages                       |
| Error Boundaries                               | 4 files                       |
| SEO Infrastructure                             | 3 files                       |
| Embed System                                   | 3 files                       |
| **Total**                                      | **78 public-facing surfaces** |

---

## 1. Marketing / Information Pages

### Homepage `/`

- **File:** `app/(public)/page.tsx`
- **Description:** Landing page. Hero with "Find a private chef near you," search bar, featured chefs grid (6 cards pulled live from directory), trust signals (free, no middleman, zero commission, vetted).
- **SEO:** Title, description, OG, Twitter, keywords, canonical. JSON-LD: Organization, SoftwareApplication, WebSite.
- **Theme:** Dark
- **Data:** Dynamic (fetches discoverable chefs, sorted by featured)
- **Components:** `HomepageSearch`, `FeaturedChefCard`, `OrganizationJsonLd`, `SoftwareApplicationJsonLd`, `WebSiteJsonLd`

### About `/about`

- **File:** `app/(public)/about/page.tsx`
- **Description:** "Ops for Artists." Mission statement, consumer vs operator value props, 4 principles (Free, Zero commission, 100% private, Self-hosted), origin story ("Built by a chef, for chefs"), dual CTA.
- **SEO:** Title, description, OG, canonical
- **Theme:** Dark
- **Data:** Static

### Services `/services`

- **File:** `app/(public)/services/page.tsx`
- **Description:** 6 service categories (Private Dinners, Catering, Meal Prep, Weddings, Corporate Dining, Cooking Classes). Each card links to `/chefs?serviceType=X`. Bottom CTA to `/book`.
- **SEO:** Title, description, OG, canonical
- **Theme:** Dark
- **Data:** Static

### How It Works `/how-it-works`

- **File:** `app/(public)/how-it-works/page.tsx`
- **Description:** 3-step process (Search, Connect, Enjoy) with expanded detail. Trust signals section (4 items). Dual CTA (Book + Browse).
- **SEO:** Title, description, OG, canonical
- **Theme:** Dark
- **Data:** Static

### For Operators `/for-operators`

- **File:** `app/(public)/for-operators/page.tsx`
- **Description:** Operator landing page. "The operating system for food operators." 4 principles strip (Free/Self-hosted/Zero commission/100% private), 4 research-backed pain point cards (invisible labor, food cost tracking, client LTV, seasonality) with ChefFlow solutions, 8-capability numbered grid (Clients, Events, Menus & Food Costing, Finances, Recipes, Inventory & Vendors, Staff, AI Assistant), origin story section, Get Started Free CTA.
- **SEO:** Title, description, OG, canonical
- **Theme:** Dark (hero-glow effect)
- **Data:** Static

### Marketplace Chefs `/marketplace-chefs`

- **File:** `app/(public)/marketplace-chefs/page.tsx`
- **Description:** For chefs already on booking platforms. Positions ChefFlow as the business layer behind marketplace demand. Growth stack sidebar, platform-vs-ChefFlow comparison, 4-step operator workflow.
- **SEO:** Title, description, OG, canonical. Analytics tracking via `PublicPageView`.
- **Theme:** Dark
- **Data:** Static

### FAQ `/faq`

- **File:** `app/(public)/faq/page.tsx`
- **Description:** 24 FAQs organized into 3 categories (For Clients, Running a Food Business, Using ChefFlow) with jump links. Covers hiring a chef, pricing, food costing (yield factors, Q-factor, actual vs. theoretical), business growth, seasonality, client lifetime value, platform features, migration, and security.
- **SEO:** Title, description, OG, canonical. JSON-LD: FAQPage schema with all 24 questions.
- **Theme:** Dark
- **Data:** Static

### Contact `/contact`

- **File:** `app/(public)/contact/page.tsx`
- **Description:** Contact form with business hours. Fetches support info from owner identity. Lazy-loaded `ContactForm` component.
- **SEO:** Title, description, OG, canonical
- **Theme:** Dark header, but **contact form skeleton uses light theme classes** (`loading-bone-light`)
- **Data:** Dynamic (support info, business hours)
- **Issue:** Light-themed loading skeleton in dark layout

### Trust Center `/trust`

- **File:** `app/(public)/trust/page.tsx`
- **Description:** Security baseline, data handling, directory standards, operational support. Policy references (Privacy, Terms, security email, support email).
- **SEO:** Title, description, OG, canonical. JSON-LD: WebPage schema.
- **Theme:** Dark
- **Data:** Static

### Compare Hub `/compare`

- **File:** `app/(public)/compare/page.tsx`
- **Description:** Index of comparison guides (ChefFlow vs spreadsheets, vs CRM, etc.). Cards with "Open guide" links.
- **SEO:** Title, description, OG, canonical. JSON-LD: CollectionPage schema.
- **Theme:** Dark
- **Data:** Static (from `COMPARE_PAGES` config)

### Compare Guide `/compare/[slug]`

- **File:** `app/(public)/compare/[slug]/page.tsx`
- **Description:** Individual comparison guide. Content varies by slug.
- **SEO:** Dynamic metadata from comparison config
- **Theme:** Dark

### Customers `/customers`

- **File:** `app/(public)/customers/page.tsx`
- **Description:** Intentionally empty. States "We have not published customer stories yet." No fabricated testimonials. noindex/nofollow.
- **SEO:** Title, description, OG, canonical. robots: noindex. JSON-LD: CollectionPage.
- **Theme:** Dark
- **Data:** None (deliberately)

### Customer Story `/customers/[slug]`

- **File:** `app/(public)/customers/[slug]/page.tsx`
- **Description:** Individual customer story page (reserved for future real stories)
- **Theme:** Dark

### Beta / Early Access `/beta`

- **File:** `app/(public)/beta/page.tsx`
- **Description:** Early access signup with capacity counter. Shows spots remaining, progress bar, operator benefits (3 cards), best fit list, beta program details. `BetaSignupForm` component.
- **SEO:** Title, description, OG
- **Theme:** Dark
- **Data:** Dynamic (signup count from `getBetaSignupCount()`)

### Beta Thank You `/beta/thank-you`

- **File:** `app/(public)/beta/thank-you/page.tsx`
- **Description:** Confirmation page after beta signup submission
- **Theme:** Dark

---

## 2. Legal / Policy Pages

### Privacy Policy `/privacy`

- **File:** `app/(public)/privacy/page.tsx`
- **Description:** Full 11-section privacy policy. Covers: information collection, usage, third-party providers (PostgreSQL, Stripe, Resend), retention, user rights (GDPR-style), cookies, security, children's privacy, changes, contact.
- **SEO:** Title, description, canonical
- **Theme:** **Light** (white bg, stone-900 text)
- **Issue:** Inconsistent with dark app theme
- **Last updated:** March 1, 2026

### Privacy Policy (Alias) `/privacy-policy`

- **File:** `app/(public)/privacy-policy/page.tsx`
- **Description:** Duplicate/alias route for `/privacy`

### Terms of Service `/terms`

- **File:** `app/(public)/terms/page.tsx`
- **Description:** Full 16-section ToS. Sections 1-3 server-rendered (above fold), sections 4-16 lazy-loaded via `TermsExtendedSections`. Covers: acceptance, service description, accounts, usage, content ownership, payments, disclaimers, liability, termination, governing law, etc.
- **SEO:** Title, description, canonical
- **Theme:** **Light** (white bg, stone-900 text)
- **Issue:** Inconsistent with dark app theme
- **Last updated:** March 1, 2026

---

## 3. Consumer Discovery Pages

### Chef Directory `/chefs`

- **File:** `app/(public)/chefs/page.tsx`
- **Description:** Full chef directory with advanced filtering. 8 filter types (query, state, cuisine, service type, dietary, price range, partner type, accepting only). Sort by featured/rating/distance/name. Paginated grid.
- **SEO:** Title, description, OG, canonical. JSON-LD: ItemList with up to 50 chef entries.
- **Theme:** Dark
- **Data:** Dynamic (fetches all discoverable chefs with filters)
- **Components:** `ChefHero`, `DirectoryFiltersForm`, `DirectoryResultsTracker`, `ChefTile`

### Chef Profile `/chef/[slug]`

- **File:** `app/(public)/chef/[slug]/page.tsx`
- **Description:** Full public chef profile. Hero (avatar, name, tagline, availability, rating), bio, social links, snapshot (service area, guest range, lead time), dietary trust strip, credentials panel, partner showcase, review showcase, availability signals, bottom CTA.
- **SEO:** Dynamic title/description/OG from chef data. JSON-LD: AggregateRating.
- **Theme:** Customizable per chef (primary color, bg color/image). Dark fallback.
- **Data:** Dynamic (chef profile, reviews, credentials, partners, availability)

### Chef Inquiry `/chef/[slug]/inquire`

- **File:** `app/(public)/chef/[slug]/inquire/page.tsx`
- **Description:** Direct inquiry form for a specific chef
- **Theme:** Dark

### Book a Chef `/book`

- **File:** `app/(public)/book/page.tsx`
- **Description:** General booking form. "Tell us about your event." BookDinnerForm component. Trust footer (free, no obligation, direct contact, zero commission).
- **SEO:** Title, description, OG, canonical
- **Theme:** Dark
- **Components:** `BookDinnerForm`

### Discover Directory `/discover`

- **File:** `app/(public)/discover/page.tsx`
- **Description:** Food business directory (restaurants, chefs, caterers, food trucks, bakeries). Landing view shows state grid + popular cities. Filtered view shows paginated listing cards (24/page). Search + 6 filter types.
- **SEO:** Title, description, OG, canonical
- **Theme:** Dark (stone-950)
- **Data:** Dynamic (from `getDirectoryListings`, `getDirectoryStats`)
- **Components:** `DiscoverFiltersForm`, `ListingCard`, `NominationForm`, `StateGrid`, `FilteredResults`
- **Note:** OSM attribution in trust footer

### Discover Listing `/discover/[slug]`

- **File:** `app/(public)/discover/[slug]/page.tsx`
- **Description:** Individual food business profile in the directory

### Discover Enhance `/discover/[slug]/enhance`

- **File:** `app/(public)/discover/[slug]/enhance/page.tsx`
- **Description:** Claim/enhance form for business owners to add photos, menus, verified details

### Discover Submit `/discover/submit`

- **File:** `app/(public)/discover/submit/page.tsx`
- **Description:** Form to submit a new food business listing to the directory

### Discover Unsubscribe `/discover/unsubscribe`

- **File:** `app/(public)/discover/unsubscribe/page.tsx`
- **Description:** Unsubscribe from directory-related communications

---

## 4. Token-Gated Experiences

These pages are public (no auth) but require a valid secure token in the URL. They serve specific workflows between chefs and their clients/guests.

| Route                                  | File                                                        | Purpose                                                              |
| -------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `/proposal/[token]`                    | `app/(public)/proposal/[token]/page.tsx`                    | Client views personalized proposal. Rate-limited (60s/15min window). |
| `/review/[token]`                      | `app/(public)/review/[token]/page.tsx`                      | Post-event review submission                                         |
| `/feedback/[token]`                    | `app/(public)/feedback/[token]/page.tsx`                    | Post-event feedback form                                             |
| `/guest-feedback/[token]`              | `app/(public)/guest-feedback/[token]/page.tsx`              | Guest-specific feedback form                                         |
| `/tip/[token]`                         | `app/(public)/tip/[token]/page.tsx`                         | Tip/gratuity submission (Stripe)                                     |
| `/worksheet/[token]`                   | `app/(public)/worksheet/[token]/page.tsx`                   | Event prep worksheet                                                 |
| `/share/[token]`                       | `app/(public)/share/[token]/page.tsx`                       | Event sharing/memories                                               |
| `/share/[token]/recap`                 | `app/(public)/share/[token]/recap/page.tsx`                 | Detailed event recap                                                 |
| `/view/[token]`                        | `app/(public)/view/[token]/page.tsx`                        | Generic secure content view                                          |
| `/survey/[token]`                      | `app/(public)/survey/[token]/page.tsx`                      | Survey response form                                                 |
| `/availability/[token]`                | `app/(public)/availability/[token]/page.tsx`                | Availability check/booking                                           |
| `/event/[eventId]/guest/[secureToken]` | `app/(public)/event/[eventId]/guest/[secureToken]/page.tsx` | Guest event portal                                                   |

---

## 5. Hub / Social Pages

| Route                    | File                                          | Purpose                     |
| ------------------------ | --------------------------------------------- | --------------------------- |
| `/hub/me/[profileToken]` | `app/(public)/hub/me/[profileToken]/page.tsx` | Public profile sharing link |
| `/hub/g/[groupToken]`    | `app/(public)/hub/g/[groupToken]/page.tsx`    | Group hub view              |
| `/hub/join/[groupToken]` | `app/(public)/hub/join/[groupToken]/page.tsx` | Join a group hub            |

---

## 6. Cannabis Pages

| Route                      | File                                            | Purpose                         |
| -------------------------- | ----------------------------------------------- | ------------------------------- |
| `/cannabis/public`         | `app/(public)/cannabis/public/page.tsx`         | Public cannabis service landing |
| `/cannabis-invite/[token]` | `app/(public)/cannabis-invite/[token]/page.tsx` | Cannabis event invitation       |

---

## 7. Gift Cards

| Route                             | File                                                   | Purpose                        |
| --------------------------------- | ------------------------------------------------------ | ------------------------------ |
| `/chef/[slug]/gift-cards`         | `app/(public)/chef/[slug]/gift-cards/page.tsx`         | Purchase gift cards for a chef |
| `/chef/[slug]/gift-cards/success` | `app/(public)/chef/[slug]/gift-cards/success/page.tsx` | Purchase confirmation          |

---

## 8. Partner / Venue Pages

| Route                         | File                                               | Purpose                                |
| ----------------------------- | -------------------------------------------------- | -------------------------------------- |
| `/partner-signup`             | `app/(public)/partner-signup/page.tsx`             | General partner signup form            |
| `/chef/[slug]/partner-signup` | `app/(public)/chef/[slug]/partner-signup/page.tsx` | Partner signup for a specific chef     |
| `/partner-report/[token]`     | `app/(public)/partner-report/[token]/page.tsx`     | Token-gated partner performance report |

---

## 9. Auth Pages (Pre-Login)

These are outside the `(public)` route group but require no authentication.

| Route                        | File                                     | Purpose                                                                                  |
| ---------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/auth/signin`               | `app/auth/signin/page.tsx`               | Sign-in form. Email + password, remember me, open redirect protection, session recovery. |
| `/auth/signup`               | `app/auth/signup/page.tsx`               | Dual-mode signup: chef (public) or client (invitation-gated via `?token=`).              |
| `/auth/client-signup`        | `app/auth/client-signup/page.tsx`        | Dedicated client signup                                                                  |
| `/auth/partner-signup`       | `app/auth/partner-signup/page.tsx`       | Partner (venue) signup                                                                   |
| `/auth/forgot-password`      | `app/auth/forgot-password/page.tsx`      | Password reset request                                                                   |
| `/auth/reset-password`       | `app/auth/reset-password/page.tsx`       | Password reset form (with token)                                                         |
| `/auth/verify-email`         | `app/auth/verify-email/page.tsx`         | Email verification                                                                       |
| `/auth/confirm-email-change` | `app/auth/confirm-email-change/page.tsx` | Confirm email address change                                                             |
| `/auth/role-selection`       | `app/auth/role-selection/page.tsx`       | Post-signup role selection                                                               |

**Theme issue:** `/auth/signup` uses light theme (stone-100 bg) which is inconsistent with the dark app.

---

## 10. Kiosk Pages

| Route             | File                          | Purpose                       |
| ----------------- | ----------------------------- | ----------------------------- |
| `/kiosk`          | `app/kiosk/page.tsx`          | Kiosk landing/main screen     |
| `/kiosk/pair`     | `app/kiosk/pair/page.tsx`     | Device pairing for kiosk mode |
| `/kiosk/disabled` | `app/kiosk/disabled/page.tsx` | Kiosk disabled state          |

---

## 11. Staff / Demo / Survey Pages

| Route                        | File                                     | Purpose                    |
| ---------------------------- | ---------------------------------------- | -------------------------- |
| `/staff-login`               | `app/staff-login/page.tsx`               | Staff member login portal  |
| `/demo`                      | `app/(demo)/demo/page.tsx`               | Demo/sandbox mode          |
| `/beta-survey`               | `app/beta-survey/page.tsx`               | Beta program survey        |
| `/beta-survey/[token]`       | `app/beta-survey/[token]/page.tsx`       | Individual survey response |
| `/beta-survey/public/[slug]` | `app/beta-survey/public/[slug]/page.tsx` | Public survey results      |

---

## 12. Utility Pages

| Route                 | File                                       | Purpose                                                                |
| --------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `/unsubscribe`        | `app/(public)/unsubscribe/page.tsx`        | Email unsubscribe. Inline styles (no Tailwind). Handles `?rid=` param. |
| `/reactivate-account` | `app/(public)/reactivate-account/page.tsx` | Account reactivation for inactive users                                |
| `/g/[code]`           | `app/(public)/g/[code]/page.tsx`           | Short URL redirect handler                                             |

---

## 13. Error Boundaries

| File                         | Scope                      |
| ---------------------------- | -------------------------- |
| `app/not-found.tsx`          | Global 404 page            |
| `app/error.tsx`              | Global error boundary      |
| `app/(public)/not-found.tsx` | 404 within public layout   |
| `app/(public)/error.tsx`     | Error within public layout |

---

## 14. SEO Infrastructure

| File                      | Output                              |
| ------------------------- | ----------------------------------- |
| `app/sitemap.ts`          | `/sitemap.xml` (dynamic)            |
| `app/robots.ts`           | `/robots.txt`                       |
| `app/opengraph-image.tsx` | Default OG image for social sharing |

---

## 15. Embed System

| File                                        | Purpose                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `app/embed/layout.tsx`                      | Minimal layout (no header/footer/nav) for iframe embedding                                              |
| `app/embed/inquiry/[chefId]/page.tsx`       | Embeddable inquiry form                                                                                 |
| `public/embed/chefflow-widget.js`           | Self-contained vanilla JS widget script. Inline styles, no Tailwind. Relaxed CSP (`frame-ancestors *`). |
| `app/api/embed/inquiry/route.ts`            | API endpoint backing the embed form                                                                     |
| `app/api/storage/public/[...path]/route.ts` | Public file serving endpoint                                                                            |

---

## 16. Shared Layout & Navigation

### Public Layout (`app/(public)/layout.tsx`)

- Wraps all `(public)` pages
- Includes: `PublicHeader`, `PublicFooter`, `PresenceBeacon` (anonymous), `PublicMarketResearchEntry`
- Dark theme with ambient glow (3 radial gradient blurs)
- `animate-fade-slide-up` entrance animation on main content

### Public Header (`components/navigation/public-header.tsx`)

- Desktop nav with dropdowns
- Mobile hamburger menu
- Logo links to `/`
- Sign In / Get Started CTAs

### Public Footer (`components/navigation/public-footer.tsx`)

- 4 column layout: Discover, For Operators, Company, Legal
- Newsletter signup
- Social links
- Copyright

### Nav Config (`components/navigation/public-nav-config.ts`)

Navigation structure:

- **Find a Chef** (dropdown): Book `/book`, Browse Chefs `/chefs`, Services `/services`
- **Discover** `/discover`
- **How It Works** `/how-it-works`
- **For Operators** `/for-operators`

---

## Known Issues

### Theme Inconsistencies

These pages use light theme (white/stone-100 bg) while the rest of the app is dark:

| Page               | Route          | Notes                                      |
| ------------------ | -------------- | ------------------------------------------ |
| Privacy Policy     | `/privacy`     | Full light theme                           |
| Terms of Service   | `/terms`       | Full light theme                           |
| Signup             | `/auth/signup` | Light theme for both chef and client modes |
| Contact (skeleton) | `/contact`     | Loading skeleton uses `loading-bone-light` |

### Placeholder Content

| Page           | Route               | Status                                                  |
| -------------- | ------------------- | ------------------------------------------------------- |
| Customers      | `/customers`        | Intentionally empty, waiting for real stories. noindex. |
| Customer Story | `/customers/[slug]` | Reserved for future use                                 |

### SEO Gaps

- Auth pages have no structured data (correct, should not be indexed)
- Contact page has no structured data (could benefit from LocalBusiness schema)

---

## Loading States

Pages with confirmed loading states (`loading.tsx` siblings):

- `/about`
- `/chefs`
- `/compare`
- `/contact`
- `/faq`
- `/trust`
- `/survey`

Pages using Suspense/dynamic loading internally:

- `/contact` (lazy-loaded ContactForm)
- `/terms` (lazy-loaded TermsExtendedSections)
- `/discover` (Suspense-streamed FilteredResults)
- `/beta` (async signup count)

---

## Analytics Integration

Pages with `PublicPageView` tracking:

- `/faq`
- `/trust`
- `/compare`
- `/customers`
- `/beta`
- `/marketplace-chefs`

Pages with `TrackedLink` components:

- `/faq`, `/trust`, `/compare`, `/customers`, `/marketplace-chefs`, `/beta`

---

## Route Policy Reference

All public routes are defined in `lib/auth/route-policy.ts` under `PUBLIC_UNAUTHENTICATED_PATHS`. The middleware (`middleware.ts`) allows these routes to pass through without authentication.
