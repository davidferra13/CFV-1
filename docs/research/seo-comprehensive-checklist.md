# Research: Comprehensive SEO Checklist for ChefFlow (Next.js)

> **Date:** 2026-03-31
> **Question:** What is the complete, prioritized SEO checklist for a Next.js App Router web application (ChefFlow / app.cheflowhq.com)?
> **Status:** complete

## Summary

ChefFlow already has a solid foundation: `robots.ts`, `sitemap.ts` with dynamic chef profiles, root `metadata` with OG/Twitter tags, a dynamic `opengraph-image.tsx`, JSON-LD components (Organization, SoftwareApplication, FAQ, WebSite, Breadcrumb), security headers (HSTS, CSP, X-Frame-Options), and PWA manifest. The biggest gaps are: no Google Search Console or Bing Webmaster Tools verification active, no `llms.txt` for AI search engines, no IndexNow integration, missing canonical URLs on dynamic pages, no per-page `generateMetadata` on most public routes, and no structured data on chef profile pages (the highest-value SEO pages).

---

## TIER 1: Highest Impact (Do These First)

### 1. Google Search Console Setup

**Status:** Env vars exist in code but values not set.

**What to do:**

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property for `https://app.cheflowhq.com` (URL prefix) AND `cheflowhq.com` (domain)
3. Verify via HTML meta tag (easiest for Next.js): set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in `.env.local` and production env
4. Submit sitemap: `https://app.cheflowhq.com/sitemap.xml`
5. Request indexing of homepage and key pages manually
6. Monitor Coverage report for crawl errors
7. Check Core Web Vitals report after ~28 days of data

**Next.js implementation:** Already handled in `app/layout.tsx:83-95` via the `verification` metadata field. Just needs the env var set.

### 2. Bing Webmaster Tools + IndexNow

**Status:** Env var plumbing exists in code but not set.

**What to do:**

1. Go to [bing.com/webmasters](https://www.bing.com/webmasters)
2. Add site, verify via meta tag (set `NEXT_PUBLIC_BING_SITE_VERIFICATION` in env)
3. Submit sitemap
4. Set up IndexNow for instant indexing when content changes

**Why this matters in 2026:** Bing's index feeds Microsoft Copilot, ChatGPT's search features, and DuckDuckGo. Being indexed in Bing means visibility across all major AI search surfaces.

**IndexNow implementation for Next.js:**

```ts
// app/api/indexnow/route.ts
// POST endpoint that pings Bing/Yandex when pages change
// Trigger after: new chef profile, profile update, new compare page
// GET /{apikey}.txt must return the key (host key file in public/)
```

Key steps:

- Generate an IndexNow API key in Bing Webmaster Tools
- Place `{key}.txt` in `public/` directory
- Create an API route or server action that calls `https://api.indexnow.org/indexnow` with changed URLs
- Call it after chef profile updates, new public pages, etc.

### 3. Canonical URLs on All Public Pages

**Status:** `metadataBase` is set in root layout. No explicit canonical on dynamic routes.

**What to do:** Add `alternates.canonical` to every public page's metadata, especially dynamic routes.

```ts
// In every (public) page.tsx with generateMetadata:
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    alternates: {
      canonical: `https://cheflowhq.com/chef/${params.slug}`,
    },
  }
}
```

**Pages that need canonical URLs (priority order):**

1. `/chef/[slug]` - chef profiles (highest SEO value)
2. `/chef/[slug]/inquire` - inquiry pages
3. `/chef/[slug]/gift-cards` - gift card pages
4. `/chefs` - directory listing
5. `/compare/[slug]` - comparison guides
6. `/faq`, `/trust`, `/contact`, `/privacy`, `/terms`
7. Homepage `/`

### 4. generateMetadata on All Public Dynamic Routes

**Status:** Only `/chef/[slug]`, `/discover/[slug]`, and a few others have `generateMetadata`. Most public pages use static metadata or none.

**What to do:** Every public-facing page should have unique `title` and `description`:

```ts
// Example for /chef/[slug]/page.tsx (if not already done)
export async function generateMetadata({ params }): Promise<Metadata> {
  const chef = await getChefBySlug(params.slug)
  return {
    title: `${chef.businessName} - Private Chef in ${chef.city}`,
    description: `Book ${chef.businessName} for private dining, catering, and events in ${chef.city}. View menus, pricing, and availability.`,
    alternates: { canonical: `https://cheflowhq.com/chef/${params.slug}` },
    openGraph: {
      title: `${chef.businessName} - Private Chef`,
      description: `...`,
      type: 'profile',
    },
  }
}
```

**Rules:**

- Titles under 60 characters
- Descriptions 150-160 characters
- Every dynamic route gets unique metadata (no duplicate titles/descriptions)

### 5. JSON-LD Structured Data on Chef Profiles

**Status:** `OrganizationJsonLd` and `SoftwareApplicationJsonLd` exist but chef profiles (the most valuable SEO pages) have no structured data.

**What to add to `/chef/[slug]`:**

```ts
// Person or LocalBusiness schema for each chef
{
  "@context": "https://schema.org",
  "@type": "FoodService",        // or "CateringBusiness" or "LocalBusiness"
  "name": chef.businessName,
  "description": chef.bio,
  "url": "https://cheflowhq.com/chef/{slug}",
  "image": chef.profileImageUrl,
  "address": {
    "@type": "PostalAddress",
    "addressLocality": chef.city,
    "addressRegion": chef.state
  },
  "areaServed": chef.serviceAreas,
  "priceRange": chef.priceRange,
  "servesCuisine": chef.cuisines,
  "aggregateRating": { ... } // if reviews exist
}
```

**Other JSON-LD to add:**

- `WebSite` with `SearchAction` on homepage (already exists in component, verify it's rendered)
- `BreadcrumbList` on chef profile pages and compare pages
- `FAQPage` on the FAQ page (component exists, verify usage)

### 6. llms.txt for AI Search Engines

**Status:** Does not exist.

**What to do:** Create `public/llms.txt` following the specification from [llmstxt.org](https://llmstxt.org/).

```markdown
# ChefFlow

> ChefFlow is a food services operations platform that connects clients with private chefs, caterers, restaurants, food trucks, and bakeries. Chefs use ChefFlow to manage events, clients, menus, quotes, payments, and kitchen operations. Clients use it to discover, compare, and book food service providers.

## Main Pages

- [Chef Directory](https://cheflowhq.com/chefs): Browse all available chefs by location, cuisine, and service type
- [Compare Services](https://cheflowhq.com/compare): Side-by-side comparisons of food service options
- [FAQ](https://cheflowhq.com/faq): Frequently asked questions about ChefFlow
- [Trust & Safety](https://cheflowhq.com/trust): How ChefFlow protects clients and chefs
- [Contact](https://cheflowhq.com/contact): Get in touch with ChefFlow
- [Partner Signup](https://cheflowhq.com/partner-signup): Join ChefFlow as a chef or food service provider

## For Chefs

ChefFlow is the business operating system built by a chef, for chefs. Every feature is free. Manage your entire operation: events, clients, menus, recipes, food costing, invoices, payments, prep lists, shopping lists, calendar, documents, and staff.

## For Clients

Find and book private chefs, caterers, and food service providers. Browse menus, explore cuisines, request quotes, and manage your events through the client portal.
```

Also consider creating `public/llms-full.txt` with more detailed information about features, pricing (free), and use cases.

**Why:** Anthropic, Stripe, Cloudflare, Vercel, and many others already publish `llms.txt`. AI search engines (Perplexity, ChatGPT, Claude) use it to understand your site. AI search traffic converts 5x better than Google traffic (14.2% vs 2.8% conversion rate).

---

## TIER 2: High Impact

### 7. Open Graph Images for Dynamic Pages

**Status:** Root `opengraph-image.tsx` generates a generic ChefFlow OG image (1200x630). No per-chef or per-page OG images.

**What to do:**

- Create `app/(public)/chef/[slug]/opengraph-image.tsx` that generates a chef-specific OG image (name, photo, location, cuisines)
- Create `app/(public)/compare/[slug]/opengraph-image.tsx` for comparison pages
- Universal image size: **1200 x 630 pixels** (works across Facebook, Twitter/X, LinkedIn, Discord, Slack)
- File format: PNG for text-heavy, JPEG for photo-heavy
- Keep under 5MB (smaller is better for load time)

```ts
// app/(public)/chef/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export default async function Image({ params }) {
  const chef = await getChefBySlug(params.slug)
  return new ImageResponse(
    <div style={{ /* chef name, photo, location, cuisines */ }} />,
    { ...size }
  )
}
```

### 8. Twitter Card Images

**Status:** `twitter.card: 'summary_large_image'` is set in root metadata. No `twitter-image.tsx` file.

**What to do:**

- Create `app/twitter-image.tsx` (or rely on OG image fallback, which Twitter supports)
- For `summary_large_image`: recommended 1200 x 675 pixels (slightly taller than OG)
- If using the OG image (1200x630), Twitter will accept it and crop slightly
- Add `twitter.site` and `twitter.creator` if you have X/Twitter accounts

### 9. Core Web Vitals Optimization

**Status:** Next.js SSR + `font-display: swap` already in place. PostHog + Sentry are loaded.

**The three metrics that matter for SEO ranking:**

| Metric                              | What It Measures | Good Score | What Hurts It                                                    |
| ----------------------------------- | ---------------- | ---------- | ---------------------------------------------------------------- |
| **LCP** (Largest Contentful Paint)  | Loading speed    | < 2.5s     | Large images, slow server, render-blocking resources             |
| **INP** (Interaction to Next Paint) | Responsiveness   | < 200ms    | Heavy JS, long tasks, hydration delays                           |
| **CLS** (Cumulative Layout Shift)   | Visual stability | < 0.1      | Images without dimensions, dynamic content insertion, font swaps |

**Action items:**

1. Run Lighthouse on key public pages (homepage, /chefs, /chef/[slug])
2. Check field data in Google Search Console (once set up) after 28 days
3. Add `width` and `height` to all `<Image>` components (prevents CLS)
4. Ensure hero images use `priority` prop for LCP optimization
5. Defer non-critical third-party scripts (PostHog, Sentry) with `afterInteractive` strategy
6. Use `next/dynamic` with `ssr: false` for heavy below-fold components
7. Monitor with [PageSpeed Insights](https://pagespeed.web.dev/) and [web.dev/measure](https://web.dev/measure/)

**These are a tiebreaker signal:** CWV don't override content quality, but when two pages compete for the same query, the faster one wins.

### 10. Security Headers (Indirect SEO Impact)

**Status:** Already comprehensive. HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy all set in `next.config.js:117-262`.

**SEO impact:** Not a direct ranking signal (confirmed by Google's John Mueller). However:

- HSTS prevents mixed-content warnings (reduces bounce rate)
- CSP prevents injections that could deface pages (protects content integrity)
- X-Frame-Options prevents clickjacking and unauthorized embedding (prevents duplicate content)
- Overall, security headers contribute to E-E-A-T trust signals indirectly

**No action needed.** ChefFlow's security headers are already well-configured.

---

## TIER 3: Medium Impact

### 11. Structured Data Expansion

Beyond chef profiles, add JSON-LD to:

| Page              | Schema Type                                         | Key Properties                                   |
| ----------------- | --------------------------------------------------- | ------------------------------------------------ |
| Homepage          | `WebSite` + `Organization` + `SoftwareApplication`  | Already have components, verify they're rendered |
| `/chefs`          | `ItemList`                                          | List of chef profiles with positions             |
| `/compare/[slug]` | `Article` or `WebPage` with `BreadcrumbList`        | Comparison content                               |
| `/faq`            | `FAQPage`                                           | Question/answer pairs (component exists)         |
| `/contact`        | `ContactPage` + `Organization`                      | Contact info, email                              |
| Chef profiles     | `FoodService` or `LocalBusiness` + `BreadcrumbList` | See Tier 1 item 5                                |

**Validation:** Use [Google Rich Results Test](https://search.google.com/test/rich-results) and [Schema.org Validator](https://validator.schema.org/) to test.

### 12. Social Sharing Test & Debug

**Tools (all free):**

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) - test OG tags, force re-scrape
- [Twitter Card Validator](https://cards-dev.twitter.com/validator) - test Twitter cards
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) - test LinkedIn sharing
- [opengraph.xyz](https://www.opengraph.xyz/) - universal preview tool

**Action:** Test homepage and a chef profile page in all four tools. Fix any issues found.

### 13. PWA SEO Considerations

**Status:** PWA manifest exists with correct `name`, `short_name`, `display: standalone`, icons, shortcuts.

**Checklist:**

- [x] `manifest.json` with proper metadata
- [x] `display: standalone` (correct for app-like experience)
- [x] Proper icons (192px and 512px, both `any` and `maskable`)
- [x] `theme_color` matches brand
- [ ] Ensure service worker does NOT intercept Googlebot requests (verify `sw.js` has a user-agent check or only caches specific routes)
- [ ] Add `id` field to manifest (recommended for PWA identity)
- [ ] Consider `scope` field to restrict PWA to authenticated routes only

**Important:** Apple (Safari) has reduced PWA support significantly between 2024-2026, reverting to WebClip behavior. PWA SEO advantages are now primarily Android/Chrome.

**Key rule:** Server-side rendering is critical. Googlebot indexes in two waves; client-only content may be deferred. Next.js App Router with RSC handles this correctly by default.

### 14. RSS/Atom Feed

**Status:** `alternates.types` references `/feed.xml` in root metadata, but no feed route exists.

**What to do:** Either create `app/feed.xml/route.ts` that generates an RSS feed of public content (new chef profiles, compare guides, blog posts if any), or remove the `feed.xml` reference from metadata to avoid a 404.

### 15. Redirect and 404 Handling

**What to verify:**

- Custom 404 page exists at `app/not-found.tsx`
- Old URLs that changed have 301 redirects (only `/privacy-policy` -> `/privacy` exists currently)
- No redirect chains (A -> B -> C)
- All internal links use relative paths (no `http://` links to own domain)

---

## TIER 4: Lower Impact but Free

### 16. Free Directory Submissions (Backlinks)

Submit ChefFlow to these free directories for backlinks and visibility:

**SaaS Directories (all free, sorted by domain rating):**

| Directory     | DR  | Link Type | URL               |
| ------------- | --- | --------- | ----------------- |
| SaaSHub       | 76  | dofollow  | saashub.com       |
| Peerlist      | 75  | nofollow  | peerlist.io       |
| Product Hunt  | 91  | nofollow  | producthunt.com   |
| SaaSBison     | ~50 | dofollow  | saasbison.com     |
| SaasHunt      | ~40 | dofollow  | saashunt.com      |
| Openhunts     | 50  | dofollow  | openhunts.com     |
| toolfolio     | ~30 | dofollow  | toolfolio.io      |
| BetaList      | 68  | nofollow  | betalist.com      |
| AlternativeTo | 78  | nofollow  | alternativeto.net |

**Food/Chef-Specific Directories:**

- Google Business Profile (if applicable, see below)
- Yelp (for the food service aspect)
- Local business directories (Haverhill, MA area)

**Aggregators:**

- [startupsauce.com](https://www.startupsauce.com/list) - free list of 320+ submission sites
- [launchdirectories.com](https://launchdirectories.com) - curated directory of directories

**Rule of thumb:** 10-15 quality directories beat hundreds of random ones. Focus on DR 50+ sites.

### 17. Google Business Profile

**Applicability for SaaS:** A Google Business Profile is primarily for businesses with physical locations or service areas. ChefFlow as a SaaS platform doesn't strictly need one, but individual chefs on the platform could benefit from their own profiles.

**Consider if:**

- ChefFlow has a physical office address
- You want to appear in "near me" searches as a company
- You want the knowledge panel on Google search results

**Skip if:** ChefFlow is purely online with no physical location to list.

### 18. Content Structure for AI Search (GEO)

**What matters for appearing in ChatGPT, Perplexity, Claude, etc.:**

1. **Question-based H2/H3 headers** on public pages (FAQ page is already good for this)
2. **Concise answer blocks** (40-60 words) immediately after question headers
3. **Semantic HTML** (proper heading hierarchy, `<article>`, `<section>`, `<nav>`)
4. **Original content** that isn't just copied from competitors
5. **Structured data** (JSON-LD, see above) helps AI engines parse your content
6. **llms.txt** (see Tier 1, item 6)
7. **Citations and statistics** in content (AI engines prefer citable facts)

### 19. Accessibility and SEO Overlap

**Status:** Skip-to-content link exists. `lang="en"` on `<html>`. `font-display: swap` on fonts.

**What else helps SEO:**

- Alt text on all images (especially chef profile photos, food images)
- Proper heading hierarchy (H1 -> H2 -> H3, no skipping levels)
- Descriptive link text (not "click here")
- ARIA landmarks on main content areas
- `<main id="main-content">` matching the skip link

### 20. URL Structure Best Practices

**Current structure looks good:**

- `/chef/[slug]` - clean, descriptive
- `/compare/[slug]` - keyword-rich
- `/chefs` - directory

**Verify:**

- No URL parameters for content that should be separate pages
- No duplicate content accessible via multiple URLs
- Trailing slash consistency (pick one, redirect the other)

---

## TIER 5: Nice to Have

### 21. Blog / Content Marketing Pages

If ChefFlow ever adds a blog (`/blog`), ensure:

- `generateMetadata` on every post
- `Article` JSON-LD with `datePublished`, `dateModified`, `author`
- Posts in sitemap with accurate `lastModified`
- RSS feed includes blog posts

### 22. Hreflang (Multi-Language)

**Not needed now** (English only), but if ChefFlow adds languages:

- Use `alternates.languages` in metadata
- Every localized page must reference all other language versions
- Include `x-default` hreflang pointing to English

### 23. Video Schema

If ChefFlow adds video content (cooking demos, tutorials):

- `VideoObject` JSON-LD with `name`, `description`, `thumbnailUrl`, `uploadDate`, `duration`
- Video sitemap extension

### 24. Image Sitemap

Consider adding image information to the sitemap for chef profile photos and food images, which can help with Google Image Search visibility.

---

## Current State Audit

### What ChefFlow Already Has (Good)

| Item                  | File                         | Status                                                                |
| --------------------- | ---------------------------- | --------------------------------------------------------------------- |
| `robots.ts`           | `app/robots.ts`              | Well-configured, allows public pages, blocks private routes           |
| `sitemap.ts`          | `app/sitemap.ts`             | Dynamic, includes chef profiles, compare pages, static routes         |
| Root metadata         | `app/layout.tsx`             | Title template, description, OG tags, Twitter card, robots directives |
| `metadataBase`        | `app/layout.tsx:101`         | Set to `https://cheflowhq.com`                                        |
| OG image (root)       | `app/opengraph-image.tsx`    | Dynamic 1200x630 PNG                                                  |
| JSON-LD components    | `components/seo/json-ld.tsx` | Organization, SoftwareApplication, FAQ, WebSite, Breadcrumb           |
| Verification plumbing | `app/layout.tsx:83-95`       | Google + Bing env vars ready                                          |
| Security headers      | `next.config.js:117-262`     | HSTS, CSP, X-Frame-Options, Referrer-Policy, etc.                     |
| PWA manifest          | `public/manifest.json`       | Name, icons, shortcuts, theme color                                   |
| Favicons              | `public/`                    | favicon.ico, favicon.svg, logo.jpg/png/svg                            |
| Apple touch icon      | `app/layout.tsx:47`          | 180x180 apple-touch-icon.png                                          |
| `lang="en"`           | `app/layout.tsx:106`         | Correct                                                               |
| `font-display: swap`  | `app/layout.tsx:17,24`       | Both fonts use swap                                                   |
| Skip-to-content link  | `app/layout.tsx:113-118`     | WCAG compliant                                                        |
| googleBot directives  | `app/layout.tsx:73-79`       | max-image-preview: large, follow: true                                |

### What's Missing (Action Required)

| Priority | Item                                                                        | Effort             |
| -------- | --------------------------------------------------------------------------- | ------------------ |
| P0       | Set Google Search Console verification env var + submit sitemap             | 15 min             |
| P0       | Set Bing Webmaster Tools verification env var + submit sitemap              | 15 min             |
| P0       | Create `public/llms.txt`                                                    | 30 min             |
| P1       | Add canonical URLs to all public pages                                      | 1-2 hours          |
| P1       | Add `generateMetadata` to remaining public pages                            | 2-3 hours          |
| P1       | Add JSON-LD to chef profile pages (`FoodService`/`LocalBusiness`)           | 1-2 hours          |
| P1       | Verify JSON-LD components are actually rendered on pages (not just defined) | 30 min             |
| P2       | Per-chef `opengraph-image.tsx`                                              | 1-2 hours          |
| P2       | IndexNow integration                                                        | 1-2 hours          |
| P2       | Core Web Vitals audit via Lighthouse                                        | 1 hour             |
| P2       | Fix or remove `/feed.xml` reference (currently 404)                         | 15 min             |
| P3       | Submit to 10-15 free SaaS directories                                       | 2-3 hours (manual) |
| P3       | Social sharing test across all platforms                                    | 30 min             |
| P3       | Add `id` and `scope` to PWA manifest                                        | 15 min             |
| P3       | Service worker Googlebot check                                              | 30 min             |

---

## Free Tools Reference

| Tool                      | URL                                    | Purpose                                   |
| ------------------------- | -------------------------------------- | ----------------------------------------- |
| Google Search Console     | search.google.com/search-console       | Index monitoring, search performance, CWV |
| Bing Webmaster Tools      | bing.com/webmasters                    | Bing/Copilot/ChatGPT indexing             |
| Google Rich Results Test  | search.google.com/test/rich-results    | Validate JSON-LD                          |
| Schema.org Validator      | validator.schema.org                   | Validate structured data                  |
| PageSpeed Insights        | pagespeed.web.dev                      | Core Web Vitals measurement               |
| Lighthouse                | Built into Chrome DevTools             | Full performance/SEO audit                |
| Facebook Sharing Debugger | developers.facebook.com/tools/debug    | Test OG tags                              |
| Twitter Card Validator    | cards-dev.twitter.com/validator        | Test Twitter cards                        |
| LinkedIn Post Inspector   | linkedin.com/post-inspector            | Test LinkedIn sharing                     |
| opengraph.xyz             | opengraph.xyz                          | Universal OG preview                      |
| Mobile-Friendly Test      | search.google.com/test/mobile-friendly | Mobile rendering check                    |
| ahrefs Webmaster Tools    | ahrefs.com/webmaster-tools             | Free backlink/health audit                |

---

## Sources

- [Next.js Metadata and OG Images Docs](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js generateMetadata API Reference](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js SEO Optimization Guide 2026](https://www.djamware.com/post/697a19b07c935b6bb054313e/next-js-seo-optimization-guide--2026-edition)
- [llms.txt Specification](https://llmstxt.org/)
- [Semrush: What Is LLMs.txt](https://www.semrush.com/blog/llms-txt/)
- [Bluehost: What is llms.txt? (2026 Guide)](https://www.bluehost.com/blog/what-is-llms-txt/)
- [LLMrefs: Generative Engine Optimization Guide](https://llmrefs.com/generative-engine-optimization)
- [Semrush: Optimize Content for AI Search Engines](https://www.semrush.com/blog/how-to-optimize-content-for-ai-search-engines/)
- [Core Web Vitals 2026 Guide (w3era)](https://www.w3era.com/blog/seo/core-web-vitals-guide/)
- [Core Web Vitals and Google Search (Google Docs)](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [Security Headers for SEO (Hashmeta)](https://hashmeta.com/blog/security-headers-for-seo-how-csp-hsts-and-beyond-impact-rankings/)
- [Google on Security Headers and Ranking](https://www.searchenginejournal.com/security-headers-and-ranking-influence/488781/)
- [OG Image Size Guide 2026](https://myogimage.com/blog/og-image-size-meta-tags-complete-guide)
- [PWA SEO Guide 2026](https://whitelabelseoservice.com/progressive-web-app-seo/)
- [Bing IndexNow Setup 2026](https://rightblogger.com/blog/indexnow-bing-indexing)
- [Schema for SaaS Companies (SALT.agency)](https://salt.agency/blog/schema-for-saas-companies-salt-agency/)
- [Free SaaS Directories for SEO](https://launchdirectories.com/blog/12-best-free-saas-directories-for-seo-visibility-in-2025)
- [Startup Sauce: 320+ Submission Sites](https://www.startupsauce.com/list)
