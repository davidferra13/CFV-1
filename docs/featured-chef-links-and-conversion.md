# Featured Chef: Social Links & Conversion Upgrades

> **Date:** 2026-03-30
> **Spec:** `docs/specs/featured-chef-links-and-conversion.md`
> **Status:** Verified via Playwright

## What Changed

### 1. Social Links on Chef Profiles

Chefs can now add social media links (Instagram, TikTok, Facebook, YouTube, Linktree) in Settings > My Profile under the new "Social & External Links" card. These links:

- Persist to a `social_links` JSONB column on the `chefs` table
- Render as clickable icons on the public chef profile page (`/chef/[slug]`)
- Render as clickable icons on the Featured Chef cards on the homepage
- Are tracked via PostHog analytics (TrackedLink) on the public profile

### 2. Featured Chef Card Upgrades

The homepage Featured Chef cards were upgraded with:

- **Cloudinary image optimization** via `getOptimizedImageUrl()` for external image URLs
- **Star rating badge** overlay (top-right corner) showing average rating and review count
- **Social link icons** row below service type pills
- **"Inquire" CTA button** at card footer for chefs accepting inquiries
- **Restructured card layout**: outer wrapper changed from `<Link>` to `<div>` to allow standalone social links and CTAs without nested link issues

### 3. Backward Compatibility

The `social_links` column uses the same `42703` error catch pattern as other new columns. If the migration hasn't been applied, the profile form and public pages gracefully degrade (no social icons shown, no errors).

## Files Modified

| File                                                       | Change                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| `database/migrations/20260401000143_chef_social_links.sql` | New migration: adds `social_links` JSONB column                |
| `lib/chef/profile-actions.ts`                              | Added SocialLinksSchema, ChefSocialLinks type, save/load logic |
| `lib/directory/actions.ts`                                 | Added `website_url` and `social_links` to DirectoryChef        |
| `lib/profile/actions.ts`                                   | Added `social_links` to public profile query                   |
| `app/(chef)/settings/my-profile/chef-profile-form.tsx`     | New Social & External Links card with 5 URL inputs             |
| `app/(public)/chef/[slug]/page.tsx`                        | Social icons row in profile header                             |
| `app/(public)/page.tsx`                                    | Upgraded FeaturedChefCard with Cloudinary, rating, icons, CTA  |

## Verification

All steps verified via Playwright (`tests/verify-social-links-quick.mjs`):

- Settings form renders all 5 social link inputs
- Save persists values to database (confirmed via reload)
- Public profile shows Instagram and Linktree icons
- Homepage Featured Chefs section shows cards with Inquire CTAs and social icons
