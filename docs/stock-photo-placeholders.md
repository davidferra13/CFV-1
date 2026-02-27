# Stock Photo Placeholders — Unsplash & Pexels Integration

**Date:** 2026-02-26
**Branch:** feature/risk-gap-closure

## What Changed

Recipes and menus that don't have user-uploaded photos now show beautiful stock food photography from Unsplash (primary) or Pexels (fallback) instead of blank/broken image areas.

## Architecture

### Data Flow

```
Recipe/Menu page loads
  → Check if item has its own photo (recipe.photo_url)
  → If YES → show the user's photo directly
  → If NO → call getPlaceholderImage(name)
      → Check Upstash cache (7-day TTL)
      → If cached → return cached result
      → If not cached → try Unsplash API → try Pexels API
      → Cache result in Upstash
      → Return image URL + attribution
  → If ALL fail → show CSS gradient fallback (brand terracotta colors)
```

### Non-Blocking Design

- If Unsplash API fails, falls back to Pexels
- If Pexels fails too, falls back to CSS gradient
- If Upstash cache fails, APIs are called directly (skips cache)
- No page load is ever blocked by a stock photo failure

### Rate Limit Protection

- Upstash caching with 7-day TTL prevents repeated API calls
- Same query always returns same cached image
- Batch fetching on list pages uses concurrency limit (5 at a time)
- Unsplash: 50 req/hour (demo), 5,000/hour (production)
- Pexels: 200 req/hour

### Attribution (Required by TOS)

- Unsplash requires: "Photo by [Name] on Unsplash" with links
- Pexels requires: "Photo by [Name] on Pexels" with links
- Hero images show attribution as an overlay at the bottom
- Thumbnails are too small for attribution text (covered by linking to detail page which has it)

## Files Created

| File                                       | Purpose                                                             |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `lib/images/placeholder-actions.ts`        | Server action: `getPlaceholderImage()` and `getPlaceholderImages()` |
| `components/ui/food-placeholder-image.tsx` | Client component: `FoodPlaceholderImage` (hero + thumb sizes)       |

## Files Modified

| File                                        | Change                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `next.config.js`                            | Added `images.unsplash.com` and `images.pexels.com` to `remotePatterns` |
| `app/(chef)/culinary/recipes/[id]/page.tsx` | Added hero image above recipe header                                    |
| `app/(chef)/culinary/recipes/page.tsx`      | Added thumbnail in recipe list table                                    |
| `app/(chef)/culinary/menus/[id]/page.tsx`   | Added hero image above menu editor                                      |
| `app/(chef)/culinary/menus/page.tsx`        | Added thumbnail in menu list table                                      |

## Pre-Existing Files Used (Not Modified)

| File                     | Role                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| `lib/images/unsplash.ts` | Unsplash API utility (search, random, attribution)               |
| `lib/images/pexels.ts`   | Pexels API utility (search, curated, attribution)                |
| `lib/cache/upstash.ts`   | Upstash Redis caching utilities (cacheFetch, cacheSet, cacheGet) |

## PlaceholderImage Type

```ts
interface PlaceholderImage {
  url: string // Regular size (hero images)
  thumbUrl: string // Thumbnail size (list rows)
  alt: string // Alt text
  photographerName: string
  photographerUrl: string
  source: 'unsplash' | 'pexels'
  dominantColor: string // Hex — used as loading background
}
```

## Component Usage

```tsx
// Hero image (detail pages)
<FoodPlaceholderImage image={placeholderImage} size="hero" />

// Thumbnail (table rows)
<FoodPlaceholderImage image={placeholderImage} size="thumb" />

// Both degrade to CSS gradient if image is null
```

## Environment Variables Required

- `UNSPLASH_ACCESS_KEY` — Unsplash API access key
- `PEXELS_API_KEY` — Pexels API key
- `UPSTASH_REDIS_REST_URL` — Upstash Redis endpoint
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis token

All four are already configured in `.env.local`.
