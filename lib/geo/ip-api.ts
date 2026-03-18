// IP-API - free IP geolocation, no key required
// https://ip-api.com/
// 45 requests/minute, unlimited total
// NOTE: Free tier is HTTP only (not HTTPS) - use server-side only

export interface IpGeoResult {
  status: 'success' | 'fail'
  country: string
  countryCode: string
  region: string // State code (e.g. "MA")
  regionName: string // Full state name (e.g. "Massachusetts")
  city: string
  zip: string
  lat: number
  lon: number
  timezone: string // IANA timezone (e.g. "America/New_York")
  currency: string // Currency code (e.g. "USD")
  isp: string
  query: string // The IP address
}

/**
 * Get geolocation data from an IP address.
 * IMPORTANT: Server-side only - free tier is HTTP, not HTTPS.
 * Pass the client's IP from request headers.
 */
export async function getGeoFromIp(ip: string): Promise<IpGeoResult | null> {
  // Skip local/private IPs
  if (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip === 'localhost'
  ) {
    return null
  }

  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,currency,isp,query`,
      { next: { revalidate: 86400 } } // cache 24h - IP location rarely changes
    )
    if (!res.ok) return null
    const data: IpGeoResult = await res.json()
    if (data.status !== 'success') return null
    return data
  } catch {
    return null
  }
}

/**
 * Extract client IP from Next.js request headers.
 * Works with Vercel, Cloudflare, and standard proxies.
 */
export function getClientIp(headers: Headers): string | null {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    headers.get('cf-connecting-ip') ??
    null
  )
}

/**
 * Auto-detect timezone from a client request.
 * Useful for pre-filling event timezone on new event forms.
 */
export async function detectTimezone(headers: Headers): Promise<string | null> {
  const ip = getClientIp(headers)
  if (!ip) return null

  const geo = await getGeoFromIp(ip)
  return geo?.timezone ?? null
}
