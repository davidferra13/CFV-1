# SEO & Marketing Infrastructure Implementation

**Date:** 2026-02-27
**Status:** Complete

## What Changed

### 1. Structured Data (JSON-LD) — Google Rich Results

Created reusable JSON-LD components at `components/seo/json-ld.tsx`:

| Schema Type                         | Where Used               | Google Benefit                               |
| ----------------------------------- | ------------------------ | -------------------------------------------- |
| **Organization**                    | Homepage                 | Brand knowledge panel, sitelinks             |
| **WebSite** + SearchAction          | Homepage                 | Sitelinks search box in SERP                 |
| **SoftwareApplication**             | Homepage + Pricing       | App listing with price in SERP               |
| **FAQPage**                         | Pricing page             | FAQ rich snippets (expandable Q&A in search) |
| **ContactPage**                     | Contact page             | Contact info in knowledge panel              |
| **BreadcrumbList**                  | Pricing, Contact         | Breadcrumb trail in SERP                     |
| **LocalBusiness** + AggregateRating | Chef profiles (existing) | Star ratings in search results               |

### 2. Enhanced Metadata (Title Tags, Descriptions, OG, Twitter)

| Page               | Before                  | After                                                             |
| ------------------ | ----------------------- | ----------------------------------------------------------------- |
| **Root layout**    | Static title "ChefFlow" | Title template `%s \| ChefFlow`, robots directives, Twitter cards |
| **Homepage**       | Basic OG                | Keywords (12 long-tail), canonical URL, enhanced descriptions     |
| **Pricing**        | No metadata             | Full metadata, OG, Twitter, canonical, keywords baked into layout |
| **Contact**        | No metadata             | Full metadata, OG, Twitter, canonical                             |
| **Chef directory** | Basic                   | Enhanced title ("Near You"), 7 keywords, canonical                |
| **Chef profiles**  | Good                    | Added canonical URL, improved title format                        |

### 3. Sitemap Improvements (`app/sitemap.ts`)

**Added routes:**

- `/chefs` (chef directory — high SEO value)
- `/partner-signup`
- `/chef/[slug]/gift-cards` (per-chef gift card pages)
- `/chef/[slug]/inquire` (per-chef inquiry pages)

**Changed:**

- Homepage priority: monthly → weekly
- Pricing priority: 0.8 → 0.9
- Consistent `cheflowhq.com` base URL

### 4. Robots.txt Improvements (`app/robots.ts`)

**Added to allow list:**

- `/chefs` (directory)
- `/partner-signup`

**Added to disallow list:**

- `/share/`, `/g/`, `/book/`, `/embed/` (private guest pages)
- `/recipes`, `/menus`, `/calendar`, `/documents`, `/staff` (auth-required)

**Added crawl-delay:**

- AhrefsBot: 10s delay
- SemrushBot: 10s delay

### 5. Email Branding Fix (`lib/email/templates/base-layout.tsx`)

- **Logo text:** `CheFlow` → `ChefFlow` (fixed typo)
- **Footer:** `Sent via CheFlow` → `Powered by ChefFlow` (with clickable link in brand orange)
- Every transactional email (50+ templates) now carries a clickable ChefFlow link

### 6. "Powered by ChefFlow" on Guest-Facing Pages

| Page                                        | Status                           |
| ------------------------------------------- | -------------------------------- |
| Event share page (`/share/[token]`)         | **Added** — new                  |
| Event recap (`/share/[token]/recap`)        | Already had it                   |
| Guest landing (`/g/[code]`)                 | Already had it                   |
| Campaign booking (`/book/campaign/[token]`) | Already had it                   |
| Embed widget                                | Already had it (footer)          |
| All emails                                  | **Updated** — now clickable link |

### 7. Public Footer Enhancement (`components/navigation/public-footer.tsx`)

- **Layout:** 2-column → 4-column grid
- **Added "Resources" column:** Partner signup, Start Free Trial
- **Added "Find a Chef"** to Product links
- **Added tagline:** "Ops for Artists" in brand color
- **Added SEO-friendly subtitle** in copyright bar
- **Updated description** to be more keyword-rich

### 8. URL Consistency Fix

Fixed 6 files with stale `chefflow.app` fallback → `cheflowhq.com`:

- `lib/guest-comms/actions.ts`
- `lib/guest-leads/actions.ts`
- `lib/scheduling/generate-ics.ts`
- `components/events/guest-code-panel.tsx`
- `app/(chef)/events/[id]/page.tsx`
- `app/(chef)/events/[id]/guest-card/page.tsx`

---

## Files Created

| File                              | Purpose                                                        |
| --------------------------------- | -------------------------------------------------------------- |
| `components/seo/json-ld.tsx`      | Reusable JSON-LD structured data components                    |
| `app/(public)/pricing/layout.tsx` | Pricing page metadata + JSON-LD (FAQPage, SoftwareApplication) |
| `app/(public)/contact/layout.tsx` | Contact page metadata + JSON-LD (ContactPage)                  |

## Files Modified

| File                                         | Changes                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `app/layout.tsx`                             | Title template, robots, Twitter cards, `cheflowhq.com` base                 |
| `app/(public)/page.tsx`                      | Keywords, canonical, JSON-LD injection (Organization, WebSite, SoftwareApp) |
| `app/(public)/chef/[slug]/page.tsx`          | Canonical URL, `cheflowhq.com` fallback                                     |
| `app/(public)/chefs/page.tsx`                | Enhanced title, keywords, canonical                                         |
| `app/(public)/share/[token]/page.tsx`        | "Powered by ChefFlow" footer                                                |
| `app/sitemap.ts`                             | Gift card + inquiry routes, /chefs, /partner-signup                         |
| `app/robots.ts`                              | More disallow paths, crawl-delay for bots                                   |
| `lib/email/templates/base-layout.tsx`        | CheFlow→ChefFlow, Powered by link                                           |
| `components/navigation/public-footer.tsx`    | 4-column, Resources, tagline, SEO subtitle                                  |
| `lib/guest-comms/actions.ts`                 | URL fix                                                                     |
| `lib/guest-leads/actions.ts`                 | URL fix                                                                     |
| `lib/scheduling/generate-ics.ts`             | URL fix                                                                     |
| `components/events/guest-code-panel.tsx`     | URL fix                                                                     |
| `app/(chef)/events/[id]/page.tsx`            | URL fix                                                                     |
| `app/(chef)/events/[id]/guest-card/page.tsx` | URL fix                                                                     |

---

## Phase 2 — Implemented 2026-02-27

### 9. Dynamic OG Images for Chef Profiles

**File:** `app/(public)/chef/[slug]/opengraph-image.tsx`

- Each public chef profile now generates a custom 1200x630 social preview image
- Shows: chef photo (or initials), name, tagline/bio, cuisine tags, "Book on ChefFlow" branding
- Dark theme with brand gradient accents
- Falls back to generic image if chef not found
- **Impact:** When a chef shares their ChefFlow profile on social media, it shows their face and name — not the generic ChefFlow image

### 10. Blog Infrastructure

**Files created:**

- `app/(public)/blog/layout.tsx` — Blog layout with metadata + breadcrumb JSON-LD
- `app/(public)/blog/page.tsx` — Blog index (lists all posts with tags, reading time, dates)
- `app/(public)/blog/[slug]/page.tsx` — Individual post page with BlogPosting JSON-LD, breadcrumbs, CTA
- `lib/blog/posts.ts` — Static post registry (no database needed, ISR-compatible)
- `components/blog/blog-markdown.tsx` — Lightweight markdown-to-HTML renderer (no heavy deps)
- Blog typography styles added to `app/globals.css`

**Seed posts (2 published):**

1. "How to Price a Private Dinner Party (Without Undercharging)" — pricing, food cost, labor
2. "5 Client Management Mistakes Private Chefs Make" — response time, follow-ups, communication

**SEO integration:**

- Blog added to sitemap (index + individual posts)
- Blog added to robots.txt allow list
- Blog link added to public header nav + footer Resources column
- Each post has: BlogPosting JSON-LD, OpenGraph article metadata, canonical URL, breadcrumbs

### 11. Chef Referral/Invite Component

**File:** `components/marketing/invite-chef-card.tsx`

- "Invite a Chef" card with shareable referral link
- Copy-to-clipboard + native Web Share API (mobile share sheet)
- Tracks referring chef via `?ref=slug` parameter
- Can be placed on dashboard, settings, or anywhere in the chef app

### 12. Newsletter Signup

**Files:**

- `components/marketing/newsletter-signup.tsx` — Compact email form for footer
- `lib/marketing/newsletter-actions.ts` — Server action (upsert to `newsletter_subscribers` table)
- `supabase/migrations/20260327000001_newsletter_subscribers.sql` — Simple email table with RLS

**Integration:**

- Newsletter signup embedded in public footer "Stay Updated" section
- Success/error states, email validation, loading state
- Idempotent — re-subscribing same email just updates timestamp

### 13. Google Search Console & Bing Webmaster Verification

**File:** `app/layout.tsx`

- Infrastructure ready: set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in `.env.local` to auto-inject Google meta tag
- Also supports Bing: set `NEXT_PUBLIC_BING_SITE_VERIFICATION`
- **Next step:** Go to Google Search Console, verify ownership, submit sitemap URL (`https://cheflowhq.com/sitemap.xml`)

---

## What's NOT Implemented Yet (Future Work)

### High Priority

1. **Google Search Console setup** — Verify ownership in console, submit sitemap (infra is ready)
2. **More blog content** — Comparison pages ("ChefFlow vs spreadsheets"), "how to grow a personal chef business"
3. **Dynamic OG images for blog posts** — Currently uses default ChefFlow image

### Medium Priority

4. **SaaS directory listings** — G2, Capterra, Product Hunt, AlternativeTo
5. **Culinary school partnerships** — Free tier for students
6. **Social media profiles** — Instagram, TikTok, LinkedIn, YouTube (add to Organization schema's `sameAs` array and footer)
7. **Place InviteChefCard on dashboard** — Component exists, needs to be wired into dashboard layout

### Lower Priority

8. **Guest posting / backlink strategy**
9. **HARO / Connectively responses**
10. **Podcast** — Interview private chefs
11. **Newsletter email sending** — Currently collects emails; need to set up an email service (Resend, Mailchimp) to actually send newsletters
