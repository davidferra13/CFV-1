'use server'

// Placeholder image server action — fetches beautiful food photos from
// Unsplash (primary) or Pexels (fallback) for recipes and menus that
// don't have their own photo. Results are cached in Upstash for 7 days
// to avoid hitting API rate limits.

import { searchPhotos as searchUnsplash } from '@/lib/images/unsplash'
import { searchPhotos as searchPexels } from '@/lib/images/pexels'
import { cacheFetch } from '@/lib/cache/upstash'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PlaceholderImage {
  url: string // Image URL (regular size for hero, small for thumbnails)
  thumbUrl: string // Thumbnail URL
  alt: string // Alt text for accessibility
  photographerName: string // Attribution: photographer name
  photographerUrl: string // Attribution: link to photographer profile
  source: 'unsplash' | 'pexels' // Which API provided the photo
  dominantColor: string // Hex color for loading placeholder
}

// 7 days in seconds
const CACHE_TTL = 7 * 24 * 60 * 60

// ─── Main action ────────────────────────────────────────────────────────────

/**
 * Get a placeholder food photo for a recipe/menu name.
 *
 * - Checks Upstash cache first (7-day TTL)
 * - Tries Unsplash, then Pexels
 * - Returns null if both APIs fail (caller should show CSS gradient)
 *
 * @param query - Food-related search query (recipe name, cuisine type, etc.)
 */
export async function getPlaceholderImage(query: string): Promise<PlaceholderImage | null> {
  if (!query.trim()) return null

  const cacheKey = `placeholder:${query.toLowerCase().trim()}`

  try {
    return await cacheFetch<PlaceholderImage | null>(cacheKey, CACHE_TTL, async () => {
      // Try Unsplash first — better food photography, required attribution
      const unsplashResult = await tryUnsplash(query)
      if (unsplashResult) return unsplashResult

      // Fall back to Pexels
      const pexelsResult = await tryPexels(query)
      if (pexelsResult) return pexelsResult

      // Both failed — return null (caller shows CSS gradient)
      return null
    })
  } catch {
    // Cache itself failed — try APIs directly without caching
    try {
      const unsplashResult = await tryUnsplash(query)
      if (unsplashResult) return unsplashResult

      const pexelsResult = await tryPexels(query)
      if (pexelsResult) return pexelsResult
    } catch {
      // Non-blocking — both APIs and cache failed
    }
    return null
  }
}

/**
 * Get placeholder images for multiple queries in parallel.
 * Useful for list pages (recipe list, menu list).
 */
export async function getPlaceholderImages(
  queries: { id: string; query: string }[]
): Promise<Record<string, PlaceholderImage | null>> {
  const results: Record<string, PlaceholderImage | null> = {}

  // Fetch in parallel but with a concurrency limit to avoid rate-limiting
  const BATCH_SIZE = 5
  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async ({ id, query }) => {
        const image = await getPlaceholderImage(query)
        return { id, image }
      })
    )
    for (const { id, image } of batchResults) {
      results[id] = image
    }
  }

  return results
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function tryUnsplash(query: string): Promise<PlaceholderImage | null> {
  try {
    const photos = await searchUnsplash(`${query} food`, 1, 1, 'landscape')
    if (photos.length === 0) return null

    const photo = photos[0]
    return {
      url: photo.urls.regular, // 1080px — good for hero
      thumbUrl: photo.urls.small, // 400px — good for thumbnails
      alt: photo.alt_description ?? `Food photo related to ${query}`,
      photographerName: photo.user.name,
      photographerUrl: photo.user.link
        ? photo.user.link
        : `https://unsplash.com/@${photo.user.username}`,
      source: 'unsplash',
      dominantColor: photo.color,
    }
  } catch {
    return null
  }
}

async function tryPexels(query: string): Promise<PlaceholderImage | null> {
  try {
    const photos = await searchPexels(`${query} food`, 1, 1, 'landscape')
    if (photos.length === 0) return null

    const photo = photos[0]
    return {
      url: photo.src.large, // 940px — good for hero
      thumbUrl: photo.src.medium, // 350px — good for thumbnails
      alt: photo.alt ?? `Food photo related to ${query}`,
      photographerName: photo.photographer,
      photographerUrl: photo.photographer_url,
      source: 'pexels',
      dominantColor: photo.avg_color,
    }
  } catch {
    return null
  }
}
