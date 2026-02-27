# SEO & Marketing — Phase 3: Blog Expansion, Referral Card, Internal Linking

**Date:** 2026-02-27
**Branch:** `feature/risk-gap-closure`

## What Changed

### 1. InviteChefCard Wired to Dashboard

- **File:** `app/(chef)/dashboard/page.tsx`
- Added `InviteChefCard` component after the Recipe Debt widget
- Fetches chef's `slug` and `display_name` from `chefs` table for personalized referral URLs
- Always visible — encourages organic growth through chef-to-chef referrals

### 2. Three New Blog Posts (Long-Tail SEO)

- **File:** `lib/blog/posts.ts`
- **"How to Start a Private Chef Business in 2026"** (9 min read) — targets "how to start a private chef business," "private chef license," "personal chef startup"
- **"Private Chef Contract: What to Include"** (6 min read) — targets "private chef contract template," "personal chef agreement," "chef service agreement"
- **"How to Build a Profitable Weekly Meal Prep Business"** (8 min read) — targets "meal prep business," "weekly meal prep service," "private chef meal prep"
- Each post includes internal CTAs linking to `/auth/signup` and `/contact`

### 3. Related Posts Section

- **File:** `app/(public)/blog/[slug]/page.tsx`
- After the CTA card, shows up to 3 related articles matched by shared tags
- 3-column responsive grid with hover effects
- Improves dwell time, internal linking, and topical authority signals

### 4. Blog Index Enhancements

- **File:** `app/(public)/blog/page.tsx`
- Added article count ("5 articles published") as content freshness signal
- Added newsletter signup CTA at bottom of index page
- Captures email leads from blog readers

### 5. Internal Link Fixes

- **File:** `lib/blog/posts.ts`
- Changed all absolute URLs (`https://cheflowhq.com/...`) to relative paths (`/...`)
- Keeps SEO link equity internal instead of treating own site as external

### 6. Markdown Renderer: Smart Link Handling

- **File:** `components/blog/blog-markdown.tsx`
- Internal links (`/...` or `#...`) no longer get `target="_blank"`
- External links still open in new tabs with `rel="noopener"`

### 7. App Audit Updated

- **File:** `docs/app-complete-audit.md`
- Added Section 26: Blog (index + post pages)
- Documented `NewsletterSignup` and `InviteChefCard` components

## SEO Keyword Targets (New Posts)

| Post             | Primary Keywords                                                                  | Search Intent                      |
| ---------------- | --------------------------------------------------------------------------------- | ---------------------------------- |
| Start a Business | how to start a private chef business, private chef license, personal chef startup | Informational — new chefs          |
| Contract Guide   | private chef contract template, chef service agreement, personal chef contract    | Transactional — ready to formalize |
| Meal Prep Guide  | meal prep business, weekly meal prep service, private chef meal prep pricing      | Informational — scaling chefs      |

## Files Changed

| File                                | Change                                    |
| ----------------------------------- | ----------------------------------------- |
| `app/(chef)/dashboard/page.tsx`     | Added InviteChefCard + chef profile fetch |
| `app/(public)/blog/page.tsx`        | Article count, newsletter CTA             |
| `app/(public)/blog/[slug]/page.tsx` | Related posts section                     |
| `lib/blog/posts.ts`                 | 3 new posts, relative URL fixes           |
| `components/blog/blog-markdown.tsx` | Smart internal/external link handling     |
| `docs/app-complete-audit.md`        | Section 26: Blog                          |
