# Chef Discoverability — Public Directory

## What Changed

A public chef directory page at `/chefs` now lists all discoverable chefs. It is server-rendered, requires no authentication, and is linked from the public navigation header.

## Why

The public profile at `/chef/[slug]` existed but was unreachable without a direct link. There was no way for new clients to discover chefs organically. The directory closes that gap.

## How It Works

### Page

`app/(public)/chefs/page.tsx` is a Next.js server component rendered at request time. It calls `getDiscoverableChefs()` and renders a responsive grid of cards.

Each card shows:
- Profile image (with initial-letter fallback if no image)
- Display name
- Tagline
- Bio (3-line clamp via CSS `line-clamp-3`)
- "View profile →" link to `/chef/[slug]`

The page includes OpenGraph metadata (`og:title`, `og:description`) for social sharing.

### Data Query

`lib/directory/actions.ts` queries the database using the admin client (bypasses RLS):

```sql
SELECT id, slug, display_name, tagline, bio, profile_image_url
FROM chefs
JOIN chef_preferences ON chef_preferences.chef_id = chefs.id
WHERE chefs.slug IS NOT NULL
  AND chef_preferences.network_discoverable = true
ORDER BY chefs.created_at DESC
```

Only chefs with both a slug AND `network_discoverable = true` appear. Chefs control this toggle in Settings → Discovery.

### Navigation

`components/navigation/public-header.tsx` now includes "Find a Chef" between Home and Pricing:

```typescript
const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/chefs', label: 'Find a Chef' },  // ← added
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
]
```

### Middleware

`/chefs` was added to `skipAuthPaths` in `middleware.ts` so the directory is publicly accessible without authentication.

## Key Files

| File | Role |
|---|---|
| `app/(public)/chefs/page.tsx` | Server-rendered public directory |
| `lib/directory/actions.ts` | `getDiscoverableChefs()` — admin-client query |
| `components/navigation/public-header.tsx` | Added "Find a Chef" nav item |
| `middleware.ts` | `/chefs` added to `skipAuthPaths` |

## How a Chef Appears in the Directory

1. Chef must have a `slug` set (done via onboarding wizard step 3 or Settings → Profile URL)
2. `network_discoverable` must be `true` in `chef_preferences` (default: true)
3. If either condition fails, the chef does not appear in the directory but their direct `/chef/[slug]` link still works
