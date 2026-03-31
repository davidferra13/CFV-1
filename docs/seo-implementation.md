# SEO Implementation - March 2026

## What Was Done (Code Changes)

All changes are live in the codebase. No external accounts or services are required for these to take effect.

### 1. AI Search Engine Visibility (llms.txt)

- Created `public/llms.txt` - concise site overview for AI crawlers (ChatGPT, Perplexity, Claude)
- Created `public/llms-full.txt` - detailed reference with all features, pricing, tech details
- AI search traffic converts at 14.2% vs 2.8% for Google. This is the highest-ROI SEO action.

### 2. Structured Data (JSON-LD) - Rich Snippets in Google

- **Homepage**: Now renders `Organization`, `SoftwareApplication`, and `WebSite` JSON-LD (with Google Sitelinks SearchAction)
- **Chef profiles**: Upgraded from bare `LocalBusiness` to full `FoodService` schema with: name, description, image, cuisines served, service area, price range, and aggregate ratings
- **Chef profiles**: Added `BreadcrumbList` JSON-LD (Home > Chef Directory > Chef Name)
- **Directory page**: Already had `ItemList` schema (no changes needed)
- **FAQ page**: Already had `FAQPage` schema (no changes needed)
- **Compare page**: Already had `CollectionPage` schema (no changes needed)

### 3. Canonical URLs

Added `alternates.canonical` to all public pages that were missing it:

- Homepage (`/`)
- Contact (`/contact`)
- Privacy Policy (`/privacy`)
- Terms of Service (`/terms`)
- Partner Signup (`/partner-signup`) - also added full metadata (was completely missing)

Pages that already had canonicals (no changes): `/chefs`, `/chef/[slug]`, `/compare`, `/faq`, `/trust`, `/for-operators`

### 4. RSS Feed

- Created `app/feed.xml/route.ts` - real RSS feed serving chef profiles and comparison guides
- Root layout already referenced `/feed.xml` in metadata but it was a 404. Now it serves real content.
- Enables RSS readers, feed aggregators, and some search engines to discover content.

### 5. Robots.txt Cleanup

- **Removed** duplicate `public/robots.txt` (Next.js generates from `app/robots.ts` automatically; having both caused conflicts)
- **Added** missing allowed routes to `robots.ts`: `/for-operators`, `/about`, `/discover`, `/discover/`, `/book`

### 6. Sitemap Expansion

- Added `/for-operators` (priority 0.8) and `/book` (priority 0.7) to static routes

### 7. PWA Manifest

- Added `id` field (stable identity for installed PWA)
- Added `scope` field (restricts PWA scope to root)

### 8. metadataBase Fix

- Root layout was using `NEXT_PUBLIC_SITE_URL` while all other files use `NEXT_PUBLIC_APP_URL`. Fixed to `NEXT_PUBLIC_APP_URL` for consistency.

---

## What YOU Need to Do (Developer Actions Required)

These are things that require account creation, DNS changes, or decisions only you can make. I filled out everything I could.

### PRIORITY 1: Google Search Console (15 minutes)

This is the single most important thing. Without it, Google may not know your site exists.

1. Go to https://search.google.com/search-console
2. Click "Add Property"
3. Add `https://app.cheflowhq.com` (URL prefix method)
4. Choose "HTML tag" verification method - it will give you a code like `google1234567890abcdef`
5. Add to your `.env.local` and production environment:
   ```
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=google1234567890abcdef
   ```
6. Rebuild and deploy
7. Back in Search Console, click "Verify"
8. Go to Sitemaps > Add sitemap > enter `sitemap.xml` > Submit
9. Go to URL Inspection > enter `https://app.cheflowhq.com` > Request Indexing

**The code is already wired up in `app/layout.tsx` to read this env var.** You just need the value.

### PRIORITY 2: Bing Webmaster Tools (15 minutes)

Bing feeds Microsoft Copilot, ChatGPT's web search, and DuckDuckGo. Getting indexed here means visibility across all major AI search surfaces.

1. Go to https://www.bing.com/webmasters
2. Sign in with a Microsoft account
3. Add your site URL
4. Choose meta tag verification - you'll get a code
5. Add to your `.env.local` and production environment:
   ```
   NEXT_PUBLIC_BING_SITE_VERIFICATION=YOUR_CODE_HERE
   ```
6. Rebuild and deploy
7. Verify in Bing Webmaster Tools
8. Submit sitemap: `https://app.cheflowhq.com/sitemap.xml`

### PRIORITY 3: Social Media Profiles (5 minutes)

If ChefFlow has any social media accounts, I need to add them to the Organization JSON-LD. Currently the `sameAs` array is empty. Tell me the URLs for any of these:

- [ ] Instagram
- [ ] TikTok
- [ ] Facebook
- [ ] X (Twitter)
- [ ] LinkedIn
- [ ] YouTube

I'll wire them into the structured data immediately.

### PRIORITY 4: OG Image (30 minutes)

The file `public/og-image.svg` exists as a placeholder. For best social sharing results, create a branded 1200x630px PNG or JPG image showing:

- ChefFlow logo
- Tagline ("Ops for Artists" or "Find a Private Chef Near You")
- Brand colors

Save it as `public/og-image.png` (or `.jpg`) and I'll wire it into the root metadata as the default OpenGraph image.

### OPTIONAL: Free Directory Submissions (1-2 hours, do when ready)

Submit ChefFlow to these free directories for backlinks. Listed by domain rating (higher = more valuable):

| Directory     | URL               | Notes                                   |
| ------------- | ----------------- | --------------------------------------- |
| Product Hunt  | producthunt.com   | Launch post, high visibility            |
| AlternativeTo | alternativeto.net | "Alternative to spreadsheets for chefs" |
| SaaSHub       | saashub.com       | Dofollow link (DR 76)                   |
| BetaList      | betalist.com      | Good for early-stage products           |
| Peerlist      | peerlist.io       | Developer/founder community             |

Full list of 320+ free directories: https://www.startupsauce.com/list

---

## What's Already Solid (No Action Needed)

- Root metadata (title template, description, OG tags, Twitter cards)
- Dynamic metadata on chef profiles with generateMetadata
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Font loading optimization (font-display: swap)
- Skip-to-content link (WCAG)
- HTML lang attribute
- Favicons and apple-touch-icon
- PWA manifest with proper icons

---

## Verification Tools (Free, Use After Setup)

After setting up Google Search Console and Bing:

1. **Rich Results Test**: https://search.google.com/test/rich-results - paste any public page URL to validate JSON-LD
2. **PageSpeed Insights**: https://pagespeed.web.dev - check Core Web Vitals scores
3. **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug - test how links look when shared
4. **opengraph.xyz**: Universal preview of OG tags across platforms

Full research report: `docs/research/seo-comprehensive-checklist.md`
