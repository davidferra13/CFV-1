# Spec: Featured Chef Links & Conversion Upgrades

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (6 files modified, 1 migration)
> **Created:** 2026-03-30
> **Built by:** Claude Code session 2026-03-30

---

## What This Does (Plain English)

Chefs can add their social links (Instagram, TikTok, Facebook, YouTube, Linktree/custom link tree) from their existing profile settings page. These links display as tappable icons on both their public profile page and the Featured Chef cards on the homepage. Featured Chef cards also get Cloudinary-optimized images, a star rating when available, and a prominent "Inquire" CTA button so visitors can act immediately without navigating to the full profile first.

---

## Why It Matters

The Featured Chef section is the highest-visibility placement on the homepage. Right now it's a passive grid: no social proof (ratings), no external presence (links), no direct action (CTA). A potential client sees a photo and a name, clicks through, and then has to find the inquiry button. Every extra click is lost conversion. Social links prove the chef is a real, active professional. A star rating provides instant trust. A direct "Inquire" button collapses the funnel from 3 clicks to 1.

---

## Files to Create

| File                                                       | Purpose                                          |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `database/migrations/20260401000143_chef_social_links.sql` | Add `social_links` JSONB column to `chefs` table |

---

## Files to Modify

| File                                                   | What to Change                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `lib/chef/profile-actions.ts`                          | Add `social_links` to Zod schema, `getChefFullProfile()`, and `updateChefFullProfile()`                     |
| `app/(chef)/settings/my-profile/chef-profile-form.tsx` | Add social links input fields (Instagram, TikTok, Facebook, YouTube, Linktree) in a new "Social Links" card |
| `lib/directory/actions.ts`                             | Fetch `website_url` and `social_links` in `getDiscoverableChefs()`, add to `DirectoryChef` type             |
| `lib/profile/actions.ts`                               | Fetch `social_links` in `getPublicChefProfile()`, include in return shape                                   |
| `app/(public)/page.tsx`                                | Upgrade `FeaturedChefCard`: Cloudinary image optimization, social link icons, star rating, "Inquire" CTA    |
| `app/(public)/chef/[slug]/page.tsx`                    | Display social link icons in the profile header section                                                     |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Add structured social links to chefs table.
-- JSONB allows flexible addition of new platforms without migrations.
-- Example value: {"instagram": "https://instagram.com/chefname", "tiktok": "https://tiktok.com/@chefname"}
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}';

-- Informational comment for future developers
COMMENT ON COLUMN chefs.social_links IS 'Chef social media links. Keys: instagram, tiktok, facebook, youtube, linktree. Values: full URLs.';
```

### Migration Notes

- Highest existing migration: `20260401000142_service_lifecycle_checkpoints.sql`
- New migration: `20260401000143_chef_social_links.sql`
- Purely additive (ADD COLUMN). No data loss. No approval needed.
- `DEFAULT '{}'` means existing rows get an empty object, no backfill required.

---

## Data Model

### `chefs.social_links` (JSONB)

Structured as a flat object with known keys. All values are full URLs (validated client-side and server-side). Empty string or missing key = not set.

```typescript
type ChefSocialLinks = {
  instagram?: string // https://instagram.com/handle
  tiktok?: string // https://tiktok.com/@handle
  facebook?: string // https://facebook.com/page
  youtube?: string // https://youtube.com/@channel
  linktree?: string // https://linktr.ee/handle OR any custom link-tree URL
}
```

**Why JSONB instead of individual columns:**

- Adding a new platform (X, Pinterest, Threads) requires zero migrations
- Sparse data (most chefs will have 2-3 links, not all 5) is naturally handled
- The `clients` table already uses `social_media_links` JSONB for the same purpose

**Why known keys instead of an array:**

- Deterministic rendering order (always Instagram first, etc.)
- Platform-specific icon mapping is trivial
- No duplicate platform entries possible

---

## Server Actions

| Action                                    | Auth            | Input                                              | Output                                                        | Side Effects                                                     |
| ----------------------------------------- | --------------- | -------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `updateChefFullProfile(input)` (modified) | `requireChef()` | Existing fields + `social_links?: ChefSocialLinks` | `{ success: true }`                                           | Revalidates `/settings`, `/settings/my-profile`, chef layout tag |
| `getChefFullProfile()` (modified)         | `requireChef()` | none                                               | Existing shape + `social_links: ChefSocialLinks`              | none                                                             |
| `getPublicChefProfile(slug)` (modified)   | none (public)   | slug                                               | Existing shape + `chef.social_links`                          | none                                                             |
| `getDiscoverableChefs()` (modified)       | none (public)   | none                                               | `DirectoryChef` now includes `website_url` and `social_links` | none                                                             |

### Validation Rules (Zod)

```typescript
const SocialLinksSchema = z
  .object({
    instagram: z.string().url().optional().or(z.literal('')),
    tiktok: z.string().url().optional().or(z.literal('')),
    facebook: z.string().url().optional().or(z.literal('')),
    youtube: z.string().url().optional().or(z.literal('')),
    linktree: z.string().url().optional().or(z.literal('')),
  })
  .optional()
```

Empty strings are accepted (user clears a field) and normalized to omitted keys before DB write.

---

## UI / Component Spec

### A. Settings Page: Social Links Card

**Location:** [chef-profile-form.tsx](<app/(chef)/settings/my-profile/chef-profile-form.tsx>), new `<Card>` between the existing "Chef Profile" and "Public Profile Settings" cards.

```
Card: "Social & External Links"
  - Instagram URL input (placeholder: "https://instagram.com/yourname")
  - TikTok URL input (placeholder: "https://tiktok.com/@yourname")
  - Facebook URL input (placeholder: "https://facebook.com/yourpage")
  - YouTube URL input (placeholder: "https://youtube.com/@yourchannel")
  - Linktree / Link Hub URL input (placeholder: "https://linktr.ee/yourname")
  - Helper text: "Add your social profiles. These appear on your public chef page and directory listing."
```

No new save button needed. These fields save with the existing "Save Profile" button at the bottom of the form.

### B. Featured Chef Card Upgrades

**Location:** [page.tsx:101-172](<app/(public)/page.tsx#L101-L172>), `FeaturedChefCard` component.

Changes:

1. **Cloudinary-optimized hero image:** Wrap `heroImage` URL in `getOptimizedImageUrl(heroImage, { width: 600, height: 450, fit: 'fill', gravity: 'auto' })` for crisp, correctly-sized images.
2. **Star rating:** If `chef.discovery.avg_rating` exists and `chef.discovery.review_count > 0`, show a compact `"4.9 (12)"` rating below the name overlay, using a star icon.
3. **Social link icons:** Below service type pills, render small (16px) icons for each populated social link. Icons link to the URL with `target="_blank"`. Use simple inline SVG icons (Instagram, TikTok, Facebook, YouTube, link/globe for Linktree). Limit to 4 visible + "+N" if more.
4. **"Inquire" CTA button:** At the bottom of the card, a small accent-colored button linking to `/chef/{slug}/inquire`. Only shown if `chef.discovery.accepting_inquiries` is true. The whole card still links to the profile, but the button uses `e.stopPropagation()` + its own `<a>` to navigate directly to the inquiry form.

**Visual hierarchy (top to bottom):**

- Hero image (4:3 aspect, Cloudinary-optimized)
- Availability badge (top-left overlay, existing)
- Star rating badge (top-right overlay, new)
- Name + tagline (bottom overlay, existing)
- Service type pills (card body, existing)
- Social icons row (card body, new)
- Coverage area (card body, existing)
- "Inquire" CTA button (card footer, new)

### C. Public Profile Page: Social Links

**Location:** [chef/[slug]/page.tsx](<app/(public)/chef/[slug]/page.tsx>), in the header section after the tagline (around line 220).

Render a horizontal row of social link icons (24px, stone-300, hover:white). Each is a `TrackedLink` with `target="_blank"` and appropriate analytics name (`public_profile_social_instagram`, etc.). Only render icons for links that are populated.

### States

- **No social links set:** Icons row simply doesn't render. No empty state needed.
- **No hero image:** Existing fallback (letter initial) still applies, now inside the same card layout.
- **No rating:** Star rating badge doesn't render.
- **Not accepting inquiries:** "Inquire" button is hidden; availability badge already shows the status.
- **Cloudinary env var missing:** `getOptimizedImageUrl` gracefully falls back to original URL (already built into the function at [cloudinary.ts:151](lib/images/cloudinary.ts#L151)).

---

## Edge Cases and Error Handling

| Scenario                                                        | Correct Behavior                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chef enters invalid URL in social link field                    | Zod rejects on save, toast error "Instagram URL must be valid"                                                                                                                                                                               |
| Chef enters handle instead of URL (e.g. "@chefname")            | Zod rejects (not a URL). Helper text clarifies "full URL" is required                                                                                                                                                                        |
| `social_links` column doesn't exist yet (migration not applied) | Backward compat: `getChefFullProfile` catches `42703` error and falls back to query without `social_links`, returns `{}`. Same pattern already used for `website_url` at [profile-actions.ts:104-115](lib/chef/profile-actions.ts#L104-L115) |
| Chef has 5+ social links                                        | Show first 4 icons + "+1" indicator on featured card. Full set on profile page.                                                                                                                                                              |
| Cloudinary is down or cloud name not set                        | Falls back to original image URL (existing behavior at [cloudinary.ts:151](lib/images/cloudinary.ts#L151))                                                                                                                                   |
| Social link icon clicked on featured card                       | `e.stopPropagation()` prevents card navigation; icon opens social URL in new tab                                                                                                                                                             |
| "Inquire" button clicked on featured card                       | `e.stopPropagation()` + `e.preventDefault()` on the inner link navigates to `/chef/{slug}/inquire`                                                                                                                                           |

---

## Verification Steps

1. Apply migration: `20260401000143_chef_social_links.sql`
2. Sign in with agent account at `/settings/my-profile`
3. Verify: new "Social & External Links" card appears between "Chef Profile" and "Public Profile Settings"
4. Enter Instagram and Linktree URLs, click Save Profile
5. Verify: success toast, refresh page, values persist
6. Navigate to `/chef/{agent-slug}` (public profile)
7. Verify: social link icons appear in header, clicking opens correct URLs in new tab
8. Navigate to homepage `/`
9. Verify: Featured Chef cards show Cloudinary-optimized images (check `src` attribute contains `res.cloudinary.com`)
10. Verify: star rating badge appears on cards where rating data exists
11. Verify: social link icons appear on cards for chefs with links
12. Verify: "Inquire" button appears on cards for chefs accepting inquiries
13. Click "Inquire" button - verify it navigates to `/chef/{slug}/inquire` (not the profile page)
14. Click a social icon on a card - verify it opens the URL in a new tab (card doesn't navigate)
15. Screenshot all states

---

## Out of Scope

- Portfolio photo previews on featured cards (separate spec, depends on portfolio data)
- Testimonial snippets on featured cards (separate spec)
- "Instant quote" badge (needs pricing model work first)
- Social link validation beyond URL format (no checking if the Instagram account actually exists)
- Social link auto-detection from handle (e.g. typing "chefname" and auto-prepending "https://instagram.com/")
- Social links on the `/chefs` directory listing cards (separate follow-up if wanted)
- Editing social links from the Public Profile settings page (keep it in My Profile only, one place to edit)

---

## Notes for Builder Agent

1. **Backward compatibility pattern:** This codebase uses a consistent pattern for new columns: try the query with the new column, catch `42703` (undefined column), fall back to query without it. See [profile-actions.ts:104-115](lib/chef/profile-actions.ts#L104-L115) and [profile-actions.ts:163-176](lib/chef/profile-actions.ts#L163-L176). Use the same pattern for `social_links`.

2. **Image optimization is one line:** The `getOptimizedImageUrl()` function at [cloudinary.ts:139](lib/images/cloudinary.ts#L139) takes any URL and returns a Cloudinary CDN URL. No upload needed. Just wrap the hero image URL before passing it to `<Image src>`.

3. **TrackedLink for analytics:** Use `TrackedLink` from [components/analytics/tracked-link.tsx](components/analytics/tracked-link.tsx) for all social link clicks on the public profile. On the homepage, regular `<a>` tags are fine (the card itself is already a `<Link>`).

4. **SVG icons:** Use simple inline SVG for the 5 platform icons. Do NOT add a new icon library dependency. The codebase uses inline SVGs throughout (see the existing arrow SVGs in the Featured Chefs section at [page.tsx:300-307](<app/(public)/page.tsx#L300-L307>)).

5. **`DirectoryChef` type change:** Adding `website_url` and `social_links` to the type at [directory/actions.ts:41-61](lib/directory/actions.ts#L41-L61) requires also adding those fields to the select query at [directory/actions.ts:84-96](lib/directory/actions.ts#L84-L96). The fields come from the `chefs` table directly, not from marketplace profiles or directory listings.

6. **Card click architecture:** The entire card is currently a `<Link>`. To add clickable sub-elements (social icons, CTA button), you need `e.stopPropagation()` on those elements to prevent the parent `<Link>` from navigating. Use `<a>` tags inside (not nested `<Link>`s, which Next.js doesn't allow).

7. **Revalidation:** `updateChefFullProfile` already revalidates `/settings`, `/settings/my-profile`, `/settings/public-profile`, and the chef layout tag. The homepage uses `revalidate = 60` (ISR). No additional revalidation needed.

---

## Spec Validation (Planner Gate Evidence)

### 1. What exists today that this touches?

| File                                                   | What it does                                        | Lines read                              |
| ------------------------------------------------------ | --------------------------------------------------- | --------------------------------------- |
| `app/(public)/page.tsx`                                | Homepage with FeaturedChefCard component            | L1-385 (full file)                      |
| `app/(public)/chef/[slug]/page.tsx`                    | Public chef profile page                            | L1-473 (full file)                      |
| `app/(chef)/settings/my-profile/chef-profile-form.tsx` | Chef profile edit form                              | L1-383 (full file)                      |
| `lib/chef/profile-actions.ts`                          | Server actions: get/update chef profile             | L1-300 (full file)                      |
| `lib/profile/actions.ts`                               | Server action: get public chef profile              | L1-271 (relevant section)               |
| `lib/directory/actions.ts`                             | Server action: get discoverable chefs for directory | L1-261 (full file)                      |
| `lib/discovery/profile.ts`                             | DiscoveryProfile type and merge logic               | L1-253 (full file)                      |
| `lib/images/cloudinary.ts`                             | Image optimization via Cloudinary CDN               | L1-233 (full file)                      |
| `lib/db/schema/schema.ts`                              | Chefs table schema (lines 19675-19790)              | Confirmed no social_links column exists |
| `components/analytics/tracked-link.tsx`                | Analytics-tracked link component                    | L1-38 (full file)                       |

### 2. What exactly changes?

- **Add:** `chefs.social_links` JSONB column (migration)
- **Modify:** `UpdateChefFullProfileSchema` Zod schema to include `social_links` (profile-actions.ts)
- **Modify:** `getChefFullProfile()` select query + return shape (profile-actions.ts)
- **Modify:** `updateChefFullProfile()` payload construction (profile-actions.ts)
- **Modify:** `ChefProfileForm` component to add 5 new URL input fields (chef-profile-form.tsx)
- **Modify:** `getPublicChefProfile()` select list + return shape (lib/profile/actions.ts)
- **Modify:** `DirectoryChef` type + `getDiscoverableChefs()` select query (directory/actions.ts)
- **Modify:** `FeaturedChefCard` component: add Cloudinary optimization, star rating, social icons, CTA button (page.tsx)
- **Modify:** Chef profile page header: add social icons row (chef/[slug]/page.tsx)

### 3. What assumptions am I making?

| Assumption                                                    | Verified?                                                                                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `chefs` table has no existing `social_links` column           | Verified: searched schema.ts, no match                                                                                                                             |
| `getOptimizedImageUrl` works without upload (fetch mode)      | Verified: [cloudinary.ts:139-171](lib/images/cloudinary.ts#L139-L171), uses `/image/fetch/` endpoint                                                               |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set in the environment | Unverified: if not set, `getOptimizedImageUrl` falls back gracefully (line 151), so this is safe either way                                                        |
| The `42703` backward-compat pattern is the standard approach  | Verified: used in both [profile-actions.ts:104-115](lib/chef/profile-actions.ts#L104-L115) and [profile-actions.ts:163-176](lib/chef/profile-actions.ts#L163-L176) |
| Nested `<a>` inside `<Link>` is handled via stopPropagation   | Verified pattern: standard React approach for clickable sub-elements in card links                                                                                 |

### 4. Where will this most likely break?

1. **Nested clickable elements in the card.** The entire `FeaturedChefCard` is wrapped in `<Link>`. Adding inner `<a>` tags for social icons and the CTA requires careful `stopPropagation` handling. If missed, clicking a social icon navigates to the profile instead of the social URL. **Mitigation:** explicit `onClick` handlers with `e.stopPropagation(); e.preventDefault()` on every inner clickable, plus manual `window.open()` or `router.push()`.

2. **JSONB serialization edge cases.** If a chef saves `social_links` with empty strings, the DB stores `{"instagram": ""}`. The public display must treat empty strings the same as missing keys. **Mitigation:** normalize empty strings to `undefined` before DB write, and filter falsy values before rendering icons.

3. **Image optimization doubling Cloudinary credits.** Each featured card image will make a Cloudinary fetch request on first load. With 6 cards and ISR revalidating every 60s, this is ~6 fetch transforms per minute max. **Mitigation:** Cloudinary caches transformed images; subsequent requests are free. Well within the free tier.

### 5. What is underspecified?

- **Icon designs:** The spec says "simple inline SVG" but doesn't provide exact SVG paths. Builder should use standard platform brand icons (Instagram camera, TikTok note, Facebook F, YouTube play, chain-link globe for Linktree). Keep them minimal, single-color, 16-24px.
- **CTA button exact styling:** "Accent-colored" means `gradient-accent` class (used on the homepage hero CTA at [page.tsx:199](<app/(public)/page.tsx#L199>)). Builder should use a smaller variant (text-xs, px-3 py-1.5, rounded-lg).

### 6. What dependencies or prerequisites exist?

- Migration `20260401000143` must be applied before the feature works. With backward compat pattern, the app won't crash without it, but social links won't save/display.
- Cloudinary cloud name env var should be set for image optimization. Without it, images render as-is (no crash, just no optimization).

### 7. What existing logic could this conflict with?

- **`useProtectedForm` in chef-profile-form.tsx** ([line 96-103](<app/(chef)/settings/my-profile/chef-profile-form.tsx#L96-L103>)): The form uses draft protection. Adding new fields to `defaultData` and `currentData` is required or the dirty-checking will be wrong.
- **`updateChefFullProfile` backward compat fallback** ([profile-actions.ts:163-176](lib/chef/profile-actions.ts#L163-L176)): The fallback payload must NOT include `social_links` or it will trigger the same `42703` error it's trying to avoid.

### 8. What is the end-to-end data flow?

**Setting social links:**

1. Chef navigates to `/settings/my-profile`
2. `getChefFullProfile()` fetches `social_links` from `chefs` table -> returns to form
3. Chef fills in Instagram URL, clicks Save
4. `updateChefFullProfile({ ..., social_links: { instagram: "https://..." } })` called
5. Zod validates URLs, normalizes empty strings to omitted keys
6. `db.from('chefs').update({ ..., social_links: {...} }).eq('id', chefId)`
7. Revalidates settings paths + chef layout tag
8. Form shows success toast

**Displaying on homepage:**

1. Homepage renders (ISR, 60s revalidate)
2. `getDiscoverableChefs()` fetches `website_url, social_links` from `chefs` table
3. `FeaturedChefCard` receives chef data including `social_links` and `website_url`
4. Card renders: Cloudinary-optimized image, social icons, star rating, CTA button

**Displaying on profile:**

1. Visitor navigates to `/chef/{slug}`
2. `getPublicChefProfile(slug)` fetches `social_links` from `chefs` table
3. Profile header renders social icon row with TrackedLink for analytics

### 9. What is the correct implementation order?

1. Migration (column must exist first)
2. Server actions (profile-actions.ts: schema + get + update)
3. Directory actions (add fields to DirectoryChef type + query)
4. Public profile actions (add social_links to getPublicChefProfile)
5. Settings form (add social link inputs)
6. Public profile page (add social icons to header)
7. Homepage featured cards (Cloudinary + rating + social icons + CTA)

### 10. What are the exact success criteria?

1. Chef can enter social links at `/settings/my-profile` and they persist after save + refresh
2. Social icons appear on the public profile page at `/chef/{slug}` and open correct URLs
3. Featured Chef card images are served via Cloudinary CDN (URL contains `res.cloudinary.com`)
4. Featured Chef cards show star rating when `avg_rating > 0` and `review_count > 0`
5. Featured Chef cards show social link icons for chefs who have them set
6. Featured Chef cards show "Inquire" button for chefs accepting inquiries
7. Clicking social icon on a card does NOT navigate to the profile page
8. Clicking "Inquire" on a card navigates to `/chef/{slug}/inquire`
9. No TypeScript errors (`npx tsc --noEmit --skipLibCheck` passes)
10. Build passes (`npx next build --no-lint`)

### 11. What are the non-negotiable constraints?

- Auth: social links are only editable by the chef who owns the profile (`requireChef()` + tenant scoping)
- Privacy: social links are intentionally public data (the chef opts in by entering them)
- No new dependencies: inline SVGs only, no icon library
- Backward compat: app must not crash if migration hasn't been applied yet

### 12. What should NOT be touched?

- `lib/discovery/profile.ts` - DiscoveryProfile type stays unchanged. Social links are NOT discovery data.
- `lib/directory/utils.ts` - Sort algorithm stays unchanged. Social links don't affect sort order.
- `components/settings/public-profile-settings.tsx` - Social links are edited on My Profile, not Public Profile settings.
- `components/settings/discovery-profile-settings.tsx` - Discovery profile is about marketplace data, not social links.
- The booking flow (`/chef/{slug}/inquire`) - untouched.

### 13. Is this the simplest complete version?

Yes. The alternatives considered and rejected:

- Individual columns (`instagram_url`, `tiktok_url`, etc.) instead of JSONB: more migrations for each new platform, same outcome. JSONB is simpler.
- A separate `chef_social_links` table: over-engineering for 5 key-value pairs per chef.
- Auto-detecting platform from URL: unnecessary complexity. Explicit keys are simpler.
- Social links on directory listing cards too: separate follow-up, keeps this spec focused on homepage + profile.

### 14. If implemented exactly as written, what would still be wrong?

1. **No way to reorder social links.** They render in a fixed order (Instagram, TikTok, Facebook, YouTube, Linktree). A chef who wants YouTube first can't do it. This is acceptable for v1.
2. **No link validation beyond URL format.** A chef could enter `https://google.com` as their Instagram. We accept this: policing URL domains is brittle and not worth the complexity.
3. **Linktree field name is misleading if they use a different service.** The field is labeled "Linktree / Link Hub" with a generic placeholder. The DB key is `linktree` even if the URL is `stan.store/chefname`. This is fine: the key is internal, the label is what the chef sees.

---

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

**Production-ready.** All files have been read. All assumptions are verified or have safe fallbacks. The backward compatibility pattern is proven. The only unverified item (Cloudinary env var) degrades gracefully. The JSONB approach matches existing patterns in the codebase (`clients.social_media_links`). No open questions remain that would cause a builder to guess.
