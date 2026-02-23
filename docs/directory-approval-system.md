# Public Directory Approval System

**Date:** 2026-02-22
**Branch:** feature/risk-gap-closure

## Summary

The public `/chefs` directory now requires admin approval before any chef can appear. The founder account (`davidferra13@gmail.com`) is hardcoded to always appear regardless of any flags.

## What Changed

### Database

- **Migration:** `20260303000023_directory_approval.sql`
- **New column:** `chefs.directory_approved` (boolean, default `false`)
- **Index:** Partial index on `directory_approved = true` for fast directory queries
- **Bootstrap:** Founder account auto-approved in migration

### Query Gate (lib/directory/actions.ts)

- `getDiscoverableChefs()` now requires ALL three conditions:
  1. `slug IS NOT NULL`
  2. `chef_preferences.network_discoverable = true`
  3. `directory_approved = true` **OR** email matches founder
- Founder email is hardcoded as `FOUNDER_EMAIL` constant — never exposed publicly

### Admin Approval (lib/directory/admin-actions.ts)

Three new admin-only server actions:

- `getDirectoryCandidates()` — list all chefs with approval status
- `approveChefForDirectory(chefId)` — set `directory_approved = true`
- `revokeChefFromDirectory(chefId)` — set `directory_approved = false`

All gated behind `requireAdmin()`.

### Admin UI (app/(admin)/admin/directory/)

- New admin page at `/admin/directory`
- Toggle switches for each chef to approve/revoke
- Shows approved count, pending count, slug warnings
- Linked from admin dashboard quick actions

### Public Directory Redesign (app/(public)/chefs/)

- Premium TakeAChef-inspired design with:
  - Dark hero section with warm brand accents
  - Large 4:3 aspect ratio chef photo tiles — face is front and center
  - Name + tagline overlaid on photo with gradient
  - "Featured" badge for founder account
  - **Partner venue showcase** on each tile — "Where I Cook" section showing up to 3 partner venues with thumbnails, names, city/state, and type badges
  - **"Book Now" CTA** on every tile linking directly to `/chef/[slug]/inquire`
  - "Profile" secondary link for browsing
  - Trust footer ("Every chef is personally vetted")
- Responsive: 1 col mobile, 2 col tablet, 3 col desktop

### Partner Venue Showcase on Tiles

- `getDiscoverableChefs()` now also fetches each chef's showcase-visible partners in a single parallel query
- Each tile shows up to 3 partner pills with: cover image thumbnail, venue name, city/state, type badge
- Partners with `is_showcase_visible=true` and `status='active'` are included
- If a chef has more than 3 partners, a "+N more venues" count is shown
- Partners see their venues promoted on the public directory — makes them feel acknowledged

## How It Works for New Chefs

1. Chef signs up and creates their profile (sets slug, bio, photo, etc.)
2. Chef enables network discoverability in Settings (on by default)
3. Chef does NOT appear on public `/chefs` page yet
4. Admin goes to `/admin/directory` and toggles the chef ON
5. Chef now appears on the public directory
6. Admin can revoke at any time

## Founder Special Case

The account `davidferra13@gmail.com` bypasses ALL approval checks:

- Always appears in the directory (as long as slug + discoverability are set)
- Gets the "Featured" badge on their tile
- Cannot be removed from the directory by revoking `directory_approved`

## Files Changed

| File                                                               | Change                            |
| ------------------------------------------------------------------ | --------------------------------- |
| `supabase/migrations/20260303000023_directory_approval.sql`        | New migration                     |
| `lib/directory/actions.ts`                                         | Approval gate + founder override  |
| `lib/directory/admin-actions.ts`                                   | New admin actions                 |
| `app/(public)/chefs/page.tsx`                                      | Premium redesign                  |
| `app/(public)/chefs/_components/chef-hero.tsx`                     | New hero component                |
| `app/(admin)/admin/directory/page.tsx`                             | New admin page                    |
| `app/(admin)/admin/directory/_components/directory-toggle-row.tsx` | Toggle component                  |
| `app/(admin)/admin/page.tsx`                                       | Added Directory quick-action tile |
