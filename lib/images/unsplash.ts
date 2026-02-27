// Unsplash — free stock photography API
// https://unsplash.com/developers
// 50 requests/hour (demo), 5,000/hour (production)
// Beautiful food photography for empty states, menu placeholders

const UNSPLASH_BASE = 'https://api.unsplash.com'

export interface UnsplashPhoto {
  id: string
  description: string | null
  alt_description: string | null
  urls: {
    raw: string // Original resolution
    full: string // Full size
    regular: string // 1080px width
    small: string // 400px width
    thumb: string // 200px width
  }
  user: {
    name: string
    username: string
    link: string
  }
  links: {
    download_location: string // Must call this to comply with API guidelines
  }
  width: number
  height: number
  color: string // Dominant color (hex)
}

function getAccessKey(): string {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY not set in .env.local')
  return key
}

/**
 * Search for photos by keyword.
 * Great for: "grilled salmon", "dinner party", "kitchen prep", etc.
 */
export async function searchPhotos(
  query: string,
  perPage = 10,
  page = 1,
  orientation?: 'landscape' | 'portrait' | 'squarish'
): Promise<UnsplashPhoto[]> {
  try {
    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      page: String(page),
    })
    if (orientation) params.set('orientation', orientation)

    const res = await fetch(`${UNSPLASH_BASE}/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${getAccessKey()}` },
      next: { revalidate: 86400 }, // cache 24h
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map(mapPhoto)
  } catch {
    return []
  }
}

/**
 * Get a random food photo.
 * Perfect for empty states and placeholders.
 */
export async function getRandomFoodPhoto(
  query = 'food plating chef',
  orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape'
): Promise<UnsplashPhoto | null> {
  try {
    const params = new URLSearchParams({
      query,
      orientation,
    })
    const res = await fetch(`${UNSPLASH_BASE}/photos/random?${params}`, {
      headers: { Authorization: `Client-ID ${getAccessKey()}` },
      next: { revalidate: 3600 }, // cache 1h for random
    })
    if (!res.ok) return null
    const data = await res.json()
    return mapPhoto(data)
  } catch {
    return null
  }
}

/**
 * Trigger a download event — required by Unsplash API guidelines.
 * Call this when a user actually uses/downloads a photo.
 */
export async function trackDownload(downloadLocation: string): Promise<void> {
  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${getAccessKey()}` },
    })
  } catch {
    // Non-blocking — don't fail the app if tracking fails
  }
}

/**
 * Get the attribution string for a photo (required by Unsplash terms).
 * Format: "Photo by [Name] on Unsplash"
 */
export function getAttribution(photo: UnsplashPhoto): string {
  return `Photo by ${photo.user.name} on Unsplash`
}

function mapPhoto(raw: any): UnsplashPhoto {
  return {
    id: raw.id,
    description: raw.description ?? null,
    alt_description: raw.alt_description ?? null,
    urls: {
      raw: raw.urls?.raw ?? '',
      full: raw.urls?.full ?? '',
      regular: raw.urls?.regular ?? '',
      small: raw.urls?.small ?? '',
      thumb: raw.urls?.thumb ?? '',
    },
    user: {
      name: raw.user?.name ?? '',
      username: raw.user?.username ?? '',
      link: raw.user?.links?.html ?? '',
    },
    links: {
      download_location: raw.links?.download_location ?? '',
    },
    width: raw.width ?? 0,
    height: raw.height ?? 0,
    color: raw.color ?? '#000000',
  }
}
