# Google Entity and SEO Foundation Audit

**Date:** 2026-05-14
**Domain:** app.cheflowhq.com
**Stack:** Next.js 14 (App Router), Auth.js v5, Drizzle/PostgreSQL, Stripe, self-hosted

---

## 1. Executive Summary

ChefFlow has a solid SEO foundation for an early-stage product. Dynamic sitemap, robots.txt, structured JSON-LD components, canonical URL helpers, OG/Twitter metadata, and a `buildMarketingMetadata()` utility are all in place. The chef profile pages have rich structured data (FoodService schema with aggregate ratings, offer catalogs, breadcrumbs). Compare pages, cuisine pages, and directory listings also carry structured data.

The primary gaps are:

1. **Token-based pages missing noindex.** At least 10 token-gated public pages (proposal, share, tip, worksheet, feedback, guest-feedback, review, view, availability, menu) carry no `robots: noindex` metadata. These expose private event/client data to crawlers.
2. **No dedicated search-intent landing pages** for high-value queries like "private chef software," "chef CRM," or "menu costing tool."
3. **Incomplete schema coverage.** WebSite and Organization JSON-LD exist on the homepage only. No WebApplication schema on the pricing page. No FAQPage schema on the FAQ page itself (only on compare detail pages).
4. **robots.txt has coverage gaps.** Several token-based and private-data paths are not explicitly disallowed.
5. **Missing `pricing` page in sitemap.** The /pricing static route is absent from the sitemap STATIC_ROUTES array.

The product entity is recognizable but not yet strongly established. Google can see ChefFlow as a SoftwareApplication and Organization, but the entity graph is shallow (no founder Person schema, no social `sameAs` links, no Google Business Profile connection).

---

## 2. Current State Findings

### What exists and works well

| Asset                                 | Status                                                                                                            | Location                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------- |
| `robots.ts`                           | Good. Dynamic, typed. Disallows protected paths, allows public paths, throttles aggressive bots.                  | `app/robots.ts`                           |
| `sitemap.ts`                          | Good. Dynamic with DB queries for chefs, nearby listings, ingredients, cuisine, compare pages. Timeout-protected. | `app/sitemap.ts`                          |
| JSON-LD components                    | 6 components: Organization, SoftwareApplication, WebSite, FAQPage, Breadcrumb, generic JsonLd.                    | `components/seo/json-ld.tsx`              |
| `buildMarketingMetadata()`            | Centralized OG/Twitter/canonical builder. Used on most public pages.                                              | `lib/site/public-site.ts`                 |
| Root layout metadata                  | Title template (`%s                                                                                               | ChefFlow`), manifest, icons, OG defaults. | `app/layout.tsx` |
| Homepage JSON-LD                      | Organization + SoftwareApplication + WebSite all rendered.                                                        | `app/(public)/page.tsx`                   |
| Chef profile JSON-LD                  | FoodService type with offer catalog, aggregate ratings, breadcrumbs, areaServed.                                  | `app/(public)/chef/[slug]/page.tsx`       |
| Nearby listing JSON-LD                | FoodEstablishment/Restaurant/Bakery with address, hours, geo.                                                     | `app/(public)/nearby/[slug]/page.tsx`     |
| Cuisine page JSON-LD                  | Present with breadcrumbs.                                                                                         | `app/(public)/cuisines/[slug]/page.tsx`   |
| Services page JSON-LD                 | Present with breadcrumbs.                                                                                         | `app/(public)/services/page.tsx`          |
| Compare pages JSON-LD                 | FAQPage + Breadcrumb + SoftwareApplication on each comparison.                                                    | `app/(public)/compare/[slug]/page.tsx`    |
| SEO validation framework              | `lib/site/public-route-seo.ts` with snapshot/expectation types and automated checks.                              | `lib/site/public-route-seo.ts`            |
| Route policy (single source of truth) | `lib/auth/route-policy.ts` defines all public, protected, admin, API paths.                                       | `lib/auth/route-policy.ts`                |
| Middleware auth guards                | Auth.js wrapper redirects unauthenticated users from protected paths to signin.                                   | `middleware.ts`                           |
| Blocked ingredient middleware         | Returns 404 + `x-robots-tag: noindex, nofollow` for non-publishable ingredient slugs.                             | `middleware.ts`                           |

### Key metrics

- **~82 public page files** in `app/(public)/`
- **~70 pages** have metadata exports (`generateMetadata` or `export const metadata`)
- **~107 chef-protected paths**, ~30 client-protected paths, 6 staff paths, 1 partner, 1 vendor, 1 admin
- **20+ static routes** in sitemap, plus dynamic chef, nearby, ingredient, cuisine, and compare routes
- **6 JSON-LD component types** available

---

## 3. Route/Indexability Matrix

### Category A: Marketing/SEO Pages (SHOULD index)

| Route                        | Sitemap                 | robots.txt Allow | Metadata        | JSON-LD                        | Status               |
| ---------------------------- | ----------------------- | ---------------- | --------------- | ------------------------------ | -------------------- |
| `/` (homepage)               | Yes                     | Yes              | Yes             | Org + SoftwareApp + WebSite    | OK                   |
| `/book`                      | Yes                     | Yes              | Yes             | None                           | Missing JSON-LD      |
| `/chefs`                     | Yes                     | Yes              | Yes             | Yes (ItemList)                 | OK                   |
| `/chef/[slug]`               | Yes (dynamic)           | Yes              | Yes (dynamic)   | FoodService + Breadcrumb       | OK                   |
| `/chef/[slug]/inquire`       | Yes (dynamic)           | Implicit         | Yes             | Unknown                        | Needs audit          |
| `/chef/[slug]/store`         | Yes (dynamic)           | Implicit         | Yes             | Unknown                        | Needs audit          |
| `/chef/[slug]/gift-cards`    | Yes (dynamic)           | Implicit         | Yes             | Unknown                        | Needs audit          |
| `/services`                  | Yes                     | Yes              | Yes             | Yes + Breadcrumb               | OK                   |
| `/how-it-works`              | Yes                     | Yes              | Yes (manual OG) | None                           | Missing JSON-LD      |
| `/for-operators`             | Yes                     | Yes              | Yes             | Unknown                        | Needs audit          |
| `/for-operators/walkthrough` | Yes                     | Implicit         | Yes             | Unknown                        | Needs audit          |
| `/pricing`                   | Not in sitemap          | Implicit         | Yes             | FAQPageJsonLd used             | Missing from sitemap |
| `/faq`                       | Yes                     | Yes (implicit)   | Yes             | Generic JsonLd (not FAQPage)   | Needs FAQPageJsonLd  |
| `/compare`                   | Yes                     | Yes              | Yes             | Unknown                        | Needs audit          |
| `/compare/[slug]`            | Yes (dynamic)           | Yes              | Yes (dynamic)   | FAQ + Breadcrumb + SoftwareApp | OK                   |
| `/about`                     | Yes                     | Yes              | Yes             | None                           | Missing JSON-LD      |
| `/trust`                     | Yes                     | Yes              | Yes             | Generic JsonLd                 | OK                   |
| `/contact`                   | Yes                     | Yes              | Yes             | None                           | Missing JSON-LD      |
| `/nearby`                    | Yes                     | Yes              | Yes             | Unknown                        | Needs audit          |
| `/nearby/[slug]`             | Yes (dynamic)           | Yes              | Yes (dynamic)   | FoodEstablishment              | OK                   |
| `/nearby/collections`        | Yes                     | Implicit         | Yes             | Unknown                        | Needs audit          |
| `/nearby/collections/[slug]` | Yes (dynamic)           | Implicit         | Yes             | Unknown                        | Needs audit          |
| `/ingredients`               | Yes                     | Implicit         | Yes             | Unknown                        | Needs audit          |
| `/ingredients/[category]`    | Yes (dynamic)           | Implicit         | Yes             | Unknown                        | Needs audit          |
| `/ingredient/[id]`           | Yes (dynamic, filtered) | Implicit         | Yes             | Unknown                        | Needs audit          |
| `/cuisines/[slug]`           | Yes (static)            | Implicit         | Yes             | Breadcrumb + custom            | OK                   |
| `/marketplace-chefs`         | Yes                     | Yes              | Yes             | Unknown                        | Needs audit          |
| `/hub`                       | Yes                     | Implicit         | Yes             | Unknown                        | Needs audit          |
| `/cannabis/public`           | Yes                     | Yes              | Yes             | Unknown                        | Needs audit          |
| `/gift-cards`                | Yes                     | Implicit         | Yes             | Unknown                        | Needs audit          |
| `/eat`                       | Not in sitemap          | Implicit         | Yes             | Unknown                        | Missing from sitemap |
| `/customers`                 | Not in sitemap          | Disallowed       | Yes             | Unknown                        | Intentional          |
| `/privacy`                   | Yes                     | Yes              | Yes             | None                           | OK (legal page)      |
| `/terms`                     | Yes                     | Yes              | Yes             | None                           | OK (legal page)      |
| `/beta`                      | Not in sitemap          | Implicit         | Yes             | Unknown                        | OK if intentional    |
| `/partner-signup`            | Not in sitemap          | Yes              | Yes, noindex    | None                           | OK (noindex correct) |
| `/demo`                      | Not in sitemap          | Implicit         | Unknown         | Unknown                        | Needs review         |

### Category B: Token-Based Private Pages (MUST NOT index)

| Route                                  | Has noindex | robots.txt Disallow       | Risk Level           |
| -------------------------------------- | ----------- | ------------------------- | -------------------- |
| `/event/[eventId]/guest/[secureToken]` | YES         | YES (`/event/`)           | Safe                 |
| `/share/[token]`                       | NO          | YES (`/share/`)           | Medium (robots only) |
| `/share/[token]/recap`                 | NO          | Implicit                  | HIGH                 |
| `/proposal/[token]`                    | NO          | Implicit                  | HIGH                 |
| `/review/[token]`                      | NO          | Implicit                  | HIGH                 |
| `/feedback/[token]`                    | NO          | Implicit                  | HIGH                 |
| `/guest-feedback/[token]`              | NO          | Implicit                  | HIGH                 |
| `/tip/[token]`                         | NO          | Implicit                  | HIGH                 |
| `/worksheet/[token]`                   | NO          | Implicit                  | HIGH                 |
| `/view/[token]`                        | NO          | Implicit                  | HIGH                 |
| `/availability/[token]`                | NO          | Implicit                  | HIGH                 |
| `/menu/[token]`                        | NO          | Implicit                  | HIGH                 |
| `/menu-pick/[token]`                   | YES         | Implicit                  | OK                   |
| `/catalog-pick/[token]`                | YES         | Implicit                  | OK                   |
| `/split/[token]`                       | YES         | Implicit                  | OK                   |
| `/staff-portal/[id]`                   | YES         | Implicit                  | OK                   |
| `/cannabis-invite/[token]`             | NO          | YES (`/cannabis-invite/`) | Medium               |
| `/g/[code]`                            | NO          | YES (`/g/`)               | Medium               |
| `/e/[shareToken]`                      | NO          | Implicit                  | HIGH                 |
| `/onboarding/[token]`                  | NO          | Implicit                  | HIGH                 |
| `/book/status/[bookingToken]`          | NO          | YES (`/book/`)            | Medium               |
| `/partner-report/[token]`              | NO          | Implicit                  | HIGH                 |
| `/survey/[token]`                      | NO          | Implicit                  | MEDIUM               |
| `/hub/join/[groupToken]`               | NO          | Implicit                  | MEDIUM               |
| `/hub/me/[profileToken]`               | NO          | Implicit                  | MEDIUM               |
| `/hub/g/[groupToken]`                  | NO          | Implicit                  | MEDIUM               |

### Category C: Protected App Routes (Auth-gated, not crawlable)

All routes in `CHEF_PROTECTED_PATHS`, `CLIENT_PROTECTED_PATHS`, `STAFF_PROTECTED_PATHS`, `PARTNER_PROTECTED_PATHS`, `VENDOR_PROTECTED_PATHS`, and `ADMIN_PATHS` are auth-gated in middleware. Unauthenticated requests redirect to `/auth/signin`. These are safe from crawling by design.

However, several important protected prefixes are missing from robots.txt disallow:

- `/partners`, `/production`, `/proposals`, `/portfolio`, `/ops`, `/notifications`, `/loyalty`, `/marketing`, `/inventory`, `/intelligence`, `/insights`, `/import`, `/leads`, `/locations`, `/vendors`, `/waitlist`, and others.

This is low-risk because middleware blocks access, but defense-in-depth recommends adding them to robots.txt.

---

## 4. Public/Private Risk Map

### CRITICAL: Token Pages Without noindex (Priority 0)

These pages are publicly accessible via URL tokens and contain private data (event details, client names, proposals, financial amounts, menus). Without `noindex` metadata, if a token URL leaks (via referrer headers, shared links, browser extensions), Google can index the content.

**Affected routes (10+):**

- `/proposal/[token]` (client names, pricing, menu details)
- `/share/[token]` and `/share/[token]/recap` (event details, guest info, RSVP data)
- `/review/[token]` (client feedback text)
- `/feedback/[token]` and `/guest-feedback/[token]` (private feedback)
- `/tip/[token]` (payment amounts)
- `/worksheet/[token]` (event prep details)
- `/view/[token]` (document content)
- `/availability/[token]` (chef calendar data)
- `/menu/[token]` (private menu details)
- `/e/[shareToken]` (event share)
- `/onboarding/[token]` (new user data)
- `/partner-report/[token]` (partner performance data)

**Fix:** Add `robots: { index: false, follow: false }` to the metadata export in every token-based page.

### MEDIUM: Hub Token Pages

- `/hub/join/[groupToken]`, `/hub/me/[profileToken]`, `/hub/g/[groupToken]` contain group/profile info behind tokens. Lower sensitivity but should still be noindexed.

### LOW: robots.txt Incomplete Coverage

Many protected route prefixes are not listed in robots.txt. The auth middleware provides the real protection, so this is defense-in-depth only. Adding a broad `/dashboard`, `/admin/`, and all `my-*` paths (already done for some) plus a catch-all approach would improve posture.

---

## 5. Entity Foundation Recommendations

### Current Entity Signals

ChefFlow currently presents itself to Google as:

1. **Organization** (name, URL, logo, description, founding date, contact point)
2. **SoftwareApplication** (category: BusinessApplication, free pricing, feature list)
3. **WebSite** (with SearchAction pointing to /chefs)

### What is Missing

| Entity Type                                      | Where                              | Why                                                                                                                                                           | Priority              |
| ------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **Person (Founder)**                             | `/about` page                      | Establishes real-person credibility. Google Knowledge Panel signal. Use `sameAs` to link to any public profiles (LinkedIn, etc.).                             | High                  |
| **WebApplication**                               | `/pricing` page                    | More specific than SoftwareApplication for a web-based SaaS. Include `applicationCategory`, `browserRequirements`, `operatingSystem: "Web"`.                  | Medium                |
| **SoftwareApplication** (enhanced)               | Homepage or `/pricing`             | Add `applicationCategory: "BusinessApplication"`, `applicationSubCategory: "Food Service Management"`. Expand `offers` to reflect free/paid tiers accurately. | Medium                |
| **Service** (multiple)                           | `/services` page                   | Each service type (Private Dinners, Catering, Meal Prep, Cooking Classes) should be a separate Service entity.                                                | Medium                |
| **FAQPage**                                      | `/faq` page                        | The FAQ page has extensive Q&A content but uses a generic `JsonLd` import instead of `FAQPageJsonLd`. Swap to the existing component.                         | High (easy)           |
| **BreadcrumbList**                               | All public pages                   | Only cuisine, compare, and services pages have breadcrumbs. Add to all marketing pages for sitelinks and navigation signals.                                  | Medium                |
| **ItemList**                                     | `/chefs`, `/services`, `/cuisines` | Wrap directory listings in ItemList schema for better rich snippet eligibility.                                                                               | Low                   |
| **LocalBusiness** or **Organization** (per chef) | `/chef/[slug]`                     | Currently uses `FoodService` which is valid. Consider adding `provider` with `Person` type for individual chefs.                                              | Low                   |
| Social `sameAs` links                            | Organization schema                | Currently empty array. Add social profiles when available: Instagram, LinkedIn, Twitter/X, Facebook.                                                          | High (when available) |

### Entity Graph Strategy

The goal is to establish ChefFlow as a recognized software entity in Google's Knowledge Graph:

1. **Organization** at root (homepage): name, logo, founder, founding date, social links, contact
2. **SoftwareApplication** on /pricing: detailed feature list, pricing tiers, screenshots
3. **Person** for the founder on /about: name, role, `worksFor` linking back to Organization
4. **WebSite** with SearchAction: already done
5. **Each chef profile** as FoodService/Person: already done well

---

## 6. Search-Intent Page Recommendations

These are high-value search queries where ChefFlow could rank but currently has no dedicated landing page:

| Search Intent                                        | Suggested Route                     | Content Strategy                                                                                               | Priority        |
| ---------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------- |
| "private chef software"                              | `/for-operators` (exists, enhance)  | Already exists. Ensure metadata targets this exact phrase. Add comparison section, feature grid, social proof. | High            |
| "chef CRM" / "chef client management"                | `/for-operators` or new `/chef-crm` | Could be a compare-style page or a section within for-operators.                                               | Medium          |
| "menu costing software" / "food cost calculator"     | New `/menu-costing`                 | Feature-specific landing page showing the costing workflow. Screenshots, methodology, how it works.            | Medium          |
| "private chef near me" / "hire a private chef"       | `/` (homepage, already targets)     | Homepage already targets these. Ensure /chefs also targets location variants.                                  | Already covered |
| "private chef prices" / "how much is a private chef" | `/faq` (partially)                  | FAQ has pricing content. Consider a dedicated `/private-chef-cost-guide` content page.                         | Medium          |
| "catering software"                                  | `/compare` or new page              | Compare pages exist for HoneyBook etc. Ensure "catering software" appears in metadata.                         | Low             |
| "chef booking platform"                              | `/book` or `/how-it-works`          | These pages exist but metadata may not target this phrase specifically.                                        | Low             |
| "cannabis chef" / "infused dining"                   | `/cannabis/public` (exists)         | Already exists. Verify metadata targets relevant search terms.                                                 | Low             |

**Important:** Never create fake testimonials, fabricated usage statistics, or invented case studies for these pages. Use real product capabilities and honest descriptions only.

---

## 7. Technical SEO Findings

### 7.1 Sitemap Issues

1. **Missing `/pricing`** from STATIC_ROUTES. This is a critical marketing page.
2. **Missing `/eat`** from STATIC_ROUTES (if intended to be public and indexable).
3. **Missing `/demo`** from STATIC_ROUTES (if intended for SEO).
4. **Query parameters in sitemap** (`/ingredients/[category]?page=2`) are technically valid but some crawlers handle them poorly. Consider using `rel="next"/"prev"` pagination links on the actual pages as well.

### 7.2 robots.txt Issues

1. **Incomplete disallow list.** Only a subset of protected paths are explicitly disallowed. While middleware protects access, explicit disallow prevents wasted crawl budget and avoids soft-404 signals from redirect chains.
2. **Missing disallow for token paths** like `/proposal/`, `/tip/`, `/worksheet/`, `/feedback/`, `/guest-feedback/`, `/review/`, `/view/`, `/availability/`, `/menu/`, `/e/`, `/onboarding/`, `/partner-report/`, `/hub/me/`, `/hub/join/`, `/hub/g/`.
3. **`/book/` is disallowed** but `/book` (no trailing slash) is allowed. This is correct (the index page should be crawlable, sub-paths like `/book/status/[token]` should not). Verify the actual crawl behavior.

### 7.3 Canonical URL Patterns

- `buildMarketingMetadata()` sets `alternates.canonical` automatically. Good.
- Root layout sets OG URL. Good.
- Dynamic pages with `generateMetadata` generally set canonical via `buildMarketingMetadata`. Good.
- **Risk:** Token-based pages that do not use `buildMarketingMetadata` may lack canonical tags. Less important if noindexed, but still good practice.

### 7.4 Metadata Patterns

- Root layout uses title template `%s | ChefFlow`. Good.
- Most marketing pages use `buildMarketingMetadata()` which sets title, description, OG, Twitter, canonical consistently. Good.
- A few pages set metadata manually (e.g., `/how-it-works`, `/pricing`) with slightly different patterns (e.g., `BASE_URL` defined locally instead of using `absoluteUrl()`). Minor inconsistency.

### 7.5 OG/Twitter Image Coverage

- Homepage, about, for-operators use specific social images via `buildMarketingMetadata`.
- Root layout has a default OG image (`/social/chefflow-home.png`).
- Compare pages use a shared OG image.
- **Gap:** Pages not using `buildMarketingMetadata` may rely on the root layout default, which is acceptable but less targeted.

### 7.6 SSR vs CSR

- Public pages are server-rendered (RSC) by default in the App Router. Good for SEO.
- Homepage uses `revalidate = 60` (ISR). Good.
- Services page uses `revalidate = 300`. Good.
- Chefs page uses `dynamic = 'force-dynamic'`. This means no static caching but still SSR. Acceptable, though ISR would be better for crawl performance.
- No evidence of client-only rendering on critical SEO pages.

### 7.7 Core Web Vitals Risks

- `DeferredRootRuntime` loaded with `dynamic(() => ..., { ssr: false })` in root layout. This is a non-blocking client-only load. Good pattern.
- `Playfair_Display` font loaded with `display: 'swap'`. Good for CLS.
- `optimizePackageImports` for icon/chart libraries. Good for bundle size.
- Large page with many server queries (e.g., homepage fetching stats, chefs, seasonal data) could affect TTFB. Mitigated by `revalidate = 60`.

### 7.8 Duplicate/Thin Page Risks

- `/privacy` and `/privacy-policy` both exist as separate routes. Only `/privacy` is in the sitemap. Check if `/privacy-policy` is a redirect or duplicate content. If duplicate, one should redirect 301 to the other.
- `/customers` and `/customers/[slug]` exist but are disallowed in robots.txt. Intentional.
- `/discover/[...path]` is a redirect to `/nearby/*`. Good, uses permanentRedirect (308).
- `/food-directory` redirects to `/ingredients` via stale route redirect (308). Good.

---

## 8. Schema/Structured Data Recommendations

### Per-Route Schema Plan

| Route               | Current Schema                               | Recommended Schema                                      | Data Source                                            | Implementable Now |
| ------------------- | -------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ | ----------------- |
| `/`                 | Organization + SoftwareApplication + WebSite | No changes needed                                       | Static + DB                                            | Already done      |
| `/pricing`          | FAQPageJsonLd (used)                         | Add SoftwareApplication with accurate pricing tiers     | Static config + `SUPPORT_DEFAULT_MONTHLY_AMOUNT_CENTS` | Yes               |
| `/faq`              | Generic `JsonLd` import (not FAQPage)        | Switch to `FAQPageJsonLd` component                     | `FAQ_CATEGORIES` array already structured              | Yes (trivial)     |
| `/about`            | None                                         | Add Person (founder) + Organization                     | `getFounderProfile()`                                  | Yes               |
| `/how-it-works`     | None                                         | Add HowTo or WebPage with step descriptions             | Static `CLIENT_PATHS` array                            | Yes               |
| `/book`             | None                                         | Add WebPage or Service schema                           | Static                                                 | Yes               |
| `/contact`          | None                                         | Add ContactPage or Organization.contactPoint            | Static                                                 | Yes               |
| `/services`         | Breadcrumb + custom                          | Add Service entities for each service type              | `PRIMARY_SERVICES` array                               | Yes               |
| `/chefs`            | ItemList (likely)                            | Ensure ItemList wraps chef cards                        | DB query results                                       | Verify            |
| `/compare`          | None on index page                           | Add ItemList of comparison pages                        | `COMPARE_PAGES` array                                  | Yes               |
| `/trust`            | Generic JsonLd                               | Adequate as-is                                          | Static                                                 | OK                |
| `/chef/[slug]`      | FoodService + Breadcrumb + AggregateRating   | Consider adding `provider: { @type: Person }`           | DB                                                     | Low priority      |
| `/nearby/[slug]`    | FoodEstablishment variants                   | Already good. Consider adding `openingHours` if parsed. | DB (hours field exists)                                | Yes               |
| `/cuisines/[slug]`  | Breadcrumb + custom                          | Already good                                            | Static                                                 | OK                |
| All marketing pages | Varies                                       | Add BreadcrumbList consistently                         | Route path                                             | Yes               |

### Schema Validation Notes

- The `FoodService` type used on chef profiles is recognized by Google but is less common than `FoodEstablishment` or `LocalBusiness`. It is semantically correct for a service provider (vs a physical restaurant).
- The `SoftwareApplication` on homepage uses `price: '0'` which is accurate for the current free tier. When paid tiers launch more formally, update to show tier pricing.
- The `WebSite` SearchAction points to `/chefs?q={search_term_string}`. Verify this actually works as a search endpoint.

---

## 9. Security/Access-Control Findings

### 9.1 Token-Based Data Exposure (CRITICAL)

The most significant finding: token-gated pages serve private data without `noindex` protection. While tokens provide security-through-obscurity, leaked tokens (referrer headers, shared links, browser history sync) could result in Google indexing:

- Client names and event details (via `/proposal/[token]`, `/share/[token]`)
- Financial amounts (via `/tip/[token]`, proposal pricing)
- Private feedback text (via `/feedback/[token]`, `/guest-feedback/[token]`)
- Menu compositions and prep details (via `/worksheet/[token]`, `/menu/[token]`)

**Mitigation:** Add `robots: { index: false, follow: false }` metadata to all token-based pages. This is a code change, not a config change, and must be done per-page.

### 9.2 Middleware Auth Guard (STRONG)

The auth middleware is well-structured:

- `isPublicUnauthenticatedPath()` uses a centralized allowlist
- All other paths require auth; unauthenticated users get redirected to signin (pages) or 401 (API)
- Role-based routing prevents cross-role access (chef can't access client paths, etc.)
- Internal auth headers are stripped on public/skip-auth paths to prevent spoofing

### 9.3 Admin Routes

- `/admin/` is disallowed in robots.txt. Good.
- Admin paths are auth-gated and require admin role. Good.
- No admin content appears to leak into public surfaces.

### 9.4 API Routes

- Many API routes are in `API_SKIP_AUTH_PREFIXES` (webhooks, health, public endpoints). These should not expose private data.
- `/api/` is disallowed in robots.txt. Good.
- Verify that API routes in `API_SKIP_AUTH_PREFIXES` do not expose tenant data without ownership checks. Of particular concern: `/api/remy/public`, `/api/hub-public`, `/api/discovery`, `/api/book`.

### 9.5 Cross-User Data Leakage

- Public chef profiles query by slug and filter `profile_public = true`. Correct.
- Sitemap filters chefs by `profile_public = true` and nearby listings by `claimed`/`verified` status. Correct.
- Ingredient pages filter by `isKnowledgeIngredientPubliclyIndexable()`. Correct.
- The middleware blocks non-publishable ingredient slugs with 404 + noindex header. Correct.

### 9.6 Cannabis Discovery

- `/cannabis/public` is in the sitemap and robots.txt allow list. This is the public discovery surface.
- `/cannabis-invite/[token]` is disallowed in robots.txt. Correct.
- Chef-side cannabis routes (`/cannabis/hub`, `/chef/cannabis/`) are in protected paths. Correct.
- Client-side `/my-cannabis` is in client protected paths. Correct.

---

## 10. Phased Implementation Plan

### Phase 0: Safety Fixes (P0, do first)

**Goal:** Prevent private data from being indexed.

| Task                                                                              | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Risk                | Validation                                                                        |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------- |
| Add `robots: { index: false, follow: false }` to all token-based pages missing it | `app/(public)/proposal/[token]/page.tsx`, `app/(public)/share/[token]/page.tsx`, `app/(public)/share/[token]/recap/page.tsx`, `app/(public)/review/[token]/page.tsx`, `app/(public)/feedback/[token]/page.tsx`, `app/(public)/guest-feedback/[token]/page.tsx`, `app/(public)/tip/[token]/page.tsx`, `app/(public)/worksheet/[token]/page.tsx`, `app/(public)/view/[token]/page.tsx`, `app/(public)/availability/[token]/page.tsx`, `app/(public)/menu/[token]/page.tsx`, `app/(public)/e/[shareToken]/page.tsx`, `app/(public)/onboarding/[token]/page.tsx`, `app/(public)/partner-report/[token]/page.tsx`, `app/(public)/hub/join/[groupToken]/page.tsx`, `app/(public)/hub/me/[profileToken]/page.tsx`, `app/(public)/hub/g/[groupToken]/page.tsx`, `app/(public)/book/status/[bookingToken]/page.tsx` | Low (metadata only) | Crawl each URL, verify `<meta name="robots" content="noindex, nofollow">` in HTML |
| Add token path prefixes to robots.txt disallow                                    | `app/robots.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Low                 | Fetch /robots.txt, verify new disallow entries                                    |
| Check `/privacy-policy` vs `/privacy` for duplicate content                       | Both page files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Low                 | If duplicate, add 301 redirect from one to the other                              |

**Parallel-agent safe:** Yes. Each file is independent. Can assign to multiple agents.

### Phase 1: Crawl/Index Foundation

**Goal:** Complete sitemap and robots coverage.

| Task                                                              | Files                                | Risk | Validation                                |
| ----------------------------------------------------------------- | ------------------------------------ | ---- | ----------------------------------------- |
| Add `/pricing` to STATIC_ROUTES in sitemap                        | `app/sitemap.ts`                     | None | Fetch /sitemap.xml, verify /pricing entry |
| Add `/eat` to STATIC_ROUTES if intended to be indexed             | `app/sitemap.ts`                     | None | Verify                                    |
| Add missing protected path prefixes to robots.txt disallow        | `app/robots.ts`                      | None | Fetch /robots.txt                         |
| Add `/pricing` to robots.txt allow list                           | `app/robots.ts`                      | None | Fetch /robots.txt                         |
| Ensure `/how-it-works` has canonical via `buildMarketingMetadata` | `app/(public)/how-it-works/page.tsx` | Low  | Check canonical tag in rendered HTML      |
| Ensure `/pricing` has canonical via `buildMarketingMetadata`      | `app/(public)/pricing/page.tsx`      | Low  | Check canonical tag                       |
| Add SEO expectations for new routes to `PUBLIC_ROUTE_SEO_CHECKS`  | `lib/site/public-route-seo.ts`       | None | Run SEO validation tests                  |

### Phase 2: Entity/Schema Foundation

**Goal:** Strengthen entity signals for Google Knowledge Graph.

| Task                                                                                     | Files                                | Risk | Validation                             |
| ---------------------------------------------------------------------------------------- | ------------------------------------ | ---- | -------------------------------------- |
| Add Person JSON-LD for founder on `/about`                                               | `app/(public)/about/page.tsx`        | None | Validate with Google Rich Results Test |
| Switch `/faq` from generic `JsonLd` to `FAQPageJsonLd`                                   | `app/(public)/faq/page.tsx`          | None | Validate with Rich Results Test        |
| Add SoftwareApplication JSON-LD to `/pricing`                                            | `app/(public)/pricing/page.tsx`      | None | Validate                               |
| Add social `sameAs` links to Organization JSON-LD when available                         | `components/seo/json-ld.tsx`         | None | Validate                               |
| Add BreadcrumbList to `/about`, `/how-it-works`, `/book`, `/contact`, `/faq`, `/pricing` | Each page file                       | None | Validate                               |
| Add HowTo schema to `/how-it-works`                                                      | `app/(public)/how-it-works/page.tsx` | None | Validate                               |

### Phase 3: Search-Intent Pages

**Goal:** Capture high-value search queries.

| Task                                                                | Files                                  | Risk | Validation                 |
| ------------------------------------------------------------------- | -------------------------------------- | ---- | -------------------------- |
| Enhance `/for-operators` metadata to target "private chef software" | `app/(public)/for-operators/page.tsx`  | None | Check metadata             |
| Consider adding `/menu-costing` landing page                        | New file                               | Low  | Lighthouse, Search Console |
| Consider adding `/private-chef-cost-guide` content page             | New file                               | Low  | Lighthouse                 |
| Ensure compare page metadata targets competitor + category keywords | `app/(public)/compare/[slug]/page.tsx` | None | Check metadata             |

### Phase 4: Public/Private Bridge

**Goal:** Ensure clean separation between indexable and private surfaces.

| Task                                                               | Files                    | Risk   | Validation             |
| ------------------------------------------------------------------ | ------------------------ | ------ | ---------------------- |
| Audit all API routes in `API_SKIP_AUTH_PREFIXES` for data exposure | Various API route files  | Medium | Manual review          |
| Verify `/chefs` search action works (WebSite schema SearchAction)  | `/chefs` page            | None   | Test `?q=` parameter   |
| Add `rel="noopener noreferrer"` to outbound links on token pages   | Token page components    | None   | HTML audit             |
| Consider `Referrer-Policy: no-referrer` header on token pages      | Middleware or page-level | Low    | Check response headers |

### Phase 5: Validation and Monitoring

**Goal:** Ongoing SEO health.

| Task                                                          | Files                          | Risk | Validation                             |
| ------------------------------------------------------------- | ------------------------------ | ---- | -------------------------------------- |
| Submit sitemap to Google Search Console                       | External                       | None | Search Console                         |
| Run Lighthouse SEO audit on all marketing pages               | External                       | None | Score > 90                             |
| Set up Search Console monitoring for indexing issues          | External                       | None | Weekly check                           |
| Validate all JSON-LD with Google Rich Results Test            | External                       | None | No errors                              |
| Expand `PUBLIC_ROUTE_SEO_CHECKS` to cover all marketing pages | `lib/site/public-route-seo.ts` | None | Run tests                              |
| Monitor for indexed token URLs in Search Console              | External                       | None | "URL is not on Google" for token paths |

---

## 11. Parallel-Agent Build Lanes

Phase 0 tasks can be parallelized safely:

**Lane A (noindex fixes):** One agent per batch of token pages. Each file is independent. Add `robots: { index: false, follow: false }` to metadata. ~18 files.

**Lane B (robots.txt):** Single agent. Update `app/robots.ts` disallow list.

**Lane C (sitemap):** Single agent. Add missing routes to `app/sitemap.ts`.

**Lane D (schema):** One agent per page. Add JSON-LD components. Independent file changes.

**Lane E (metadata consistency):** One agent. Audit pages not using `buildMarketingMetadata()` and migrate them.

No lane depends on another. All can run simultaneously.

---

## 12. Validation Checklist

- [ ] All token-based pages have `robots: { index: false, follow: false }` metadata
- [ ] `/sitemap.xml` returns valid XML with all marketing routes
- [ ] `/robots.txt` disallows all protected and token paths
- [ ] `/robots.txt` allows all marketing pages
- [ ] Every marketing page has a unique `<title>` and `<meta name="description">`
- [ ] Every marketing page has canonical URL set
- [ ] Every marketing page has OG title, description, image
- [ ] Every marketing page has Twitter card metadata
- [ ] No duplicate brand suffix in titles (e.g., "Page | ChefFlow | ChefFlow")
- [ ] Homepage renders Organization + SoftwareApplication + WebSite JSON-LD
- [ ] `/faq` renders FAQPage JSON-LD (not generic)
- [ ] `/about` renders Person JSON-LD for founder
- [ ] `/pricing` renders SoftwareApplication JSON-LD and is in sitemap
- [ ] `/chef/[slug]` renders FoodService + Breadcrumb JSON-LD
- [ ] All JSON-LD validates with Google Rich Results Test (zero errors)
- [ ] Lighthouse SEO score >= 90 on homepage, /chefs, /pricing, /faq, /about
- [ ] No private data (client names, event details, financial amounts) appears in any indexed page
- [ ] No fake statistics, fabricated testimonials, or invented usage numbers on any page
- [ ] Auth middleware blocks all protected paths for unauthenticated users
- [ ] `/privacy-policy` either redirects to `/privacy` or has distinct content
- [ ] Token pages include `Referrer-Policy: no-referrer` or `rel="noreferrer"` on outbound links

---

## 13. Open Questions / Data Required

1. **Social profiles:** Does ChefFlow have Instagram, Twitter/X, LinkedIn, or Facebook pages? Needed for `sameAs` in Organization schema.
2. **Google Business Profile:** Does ChefFlow have a Google Business Profile? This strengthens entity recognition significantly.
3. **Google Search Console:** Is the site verified in Search Console? If not, this is step zero for any SEO work.
4. **`/eat` page intent:** Is this meant to be a public discovery surface? Should it be in the sitemap?
5. **`/demo` page intent:** Is this a public-facing demo or internal? Should it be indexed?
6. **`/beta` page:** Is the beta signup still active? If deprecated, consider noindex or redirect.
7. **`/privacy-policy` vs `/privacy`:** Are these the same content? One should redirect to the other.
8. **`/customers` and `/customers/[slug]`:** These are disallowed in robots but publicly accessible. What is the intended audience? If they contain real customer data, they need auth gating or noindex.
9. **Nearby directory visibility:** Memory note says `/nearby` is hidden from public nav (data quality not ready). However it is in the sitemap and robots allow. Is this intentional? Should it be indexed or noindexed until quality improves?
10. **Chef profile count:** How many chefs currently have `profile_public = true`? Thin directory pages (fewer than 3 profiles) may trigger Google thin content signals.
