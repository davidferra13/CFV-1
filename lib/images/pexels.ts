// Pexels - free stock photography API (backup for Unsplash)
// https://www.pexels.com/api/
// 200 requests/hour, no credit card
// All photos are free for commercial use

const PEXELS_BASE = 'https://api.pexels.com/v1'

export interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string // Pexels page URL
  photographer: string
  photographer_url: string
  alt: string | null
  avg_color: string // Hex color
  src: {
    original: string
    large2x: string // 940px width
    large: string // 940px width
    medium: string // 350px width
    small: string // 130px width
    portrait: string // 800x1200
    landscape: string // 1200x627
    tiny: string // 280x200
  }
}

function getApiKey(): string {
  const key = process.env.PEXELS_API_KEY
  if (!key) throw new Error('PEXELS_API_KEY not set in .env.local')
  return key
}

/**
 * Search for photos by keyword.
 * Great backup for Unsplash - different photo library.
 */
export async function searchPhotos(
  query: string,
  perPage = 10,
  page = 1,
  orientation?: 'landscape' | 'portrait' | 'square'
): Promise<PexelsPhoto[]> {
  try {
    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      page: String(page),
    })
    if (orientation) params.set('orientation', orientation)

    const res = await fetch(`${PEXELS_BASE}/search?${params}`, {
      headers: { Authorization: getApiKey() },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.photos ?? []
  } catch {
    return []
  }
}

/**
 * Get curated photos - editorially selected, high quality.
 */
export async function getCuratedPhotos(perPage = 10, page = 1): Promise<PexelsPhoto[]> {
  try {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
    })
    const res = await fetch(`${PEXELS_BASE}/curated?${params}`, {
      headers: { Authorization: getApiKey() },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.photos ?? []
  } catch {
    return []
  }
}

/**
 * Get a specific photo by ID.
 */
export async function getPhotoById(id: number): Promise<PexelsPhoto | null> {
  try {
    const res = await fetch(`${PEXELS_BASE}/photos/${id}`, {
      headers: { Authorization: getApiKey() },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Get attribution string (required by Pexels terms).
 */
export function getAttribution(photo: PexelsPhoto): string {
  return `Photo by ${photo.photographer} on Pexels`
}
