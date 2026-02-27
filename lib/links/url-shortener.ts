// URL Shortener — shorturl.at, free, no key required
// https://shorturl.at/
// No signup, no limits, permanent redirects
// Also includes ulvis.net API as backup (100 req/hour)

/**
 * Shorten a URL using the ulvis.net API.
 * Returns the shortened URL string.
 */
export async function shortenUrl(longUrl: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      url: longUrl,
      private: '1', // don't list publicly
    })
    const res = await fetch(`https://ulvis.net/API/write/get?${params}`)
    if (!res.ok) return null
    const shortened = await res.text()
    // API returns the shortened URL as plain text
    if (shortened.startsWith('http')) return shortened.trim()
    return null
  } catch {
    return null
  }
}

/**
 * Generate a shareable short link for an event.
 * Falls back to the full URL if shortening fails.
 */
export async function getShortEventLink(eventId: string, baseUrl: string): Promise<string> {
  const fullUrl = `${baseUrl}/events/${eventId}`
  const short = await shortenUrl(fullUrl)
  return short ?? fullUrl
}

/**
 * Generate a shareable short link for a menu.
 */
export async function getShortMenuLink(eventId: string, baseUrl: string): Promise<string> {
  const fullUrl = `${baseUrl}/events/${eventId}/menu`
  const short = await shortenUrl(fullUrl)
  return short ?? fullUrl
}

/**
 * Generate a shareable short link for a chef's public page.
 */
export async function getShortChefLink(chefSlug: string, baseUrl: string): Promise<string> {
  const fullUrl = `${baseUrl}/chef/${chefSlug}`
  const short = await shortenUrl(fullUrl)
  return short ?? fullUrl
}
