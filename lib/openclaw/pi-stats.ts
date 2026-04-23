const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'
const OPENCLAW_TOKEN = process.env.OPENCLAW_API_TOKEN || null

export interface OpenClawStats {
  sources: number
  canonicalIngredients: number
  currentPrices: number
  priceChanges: number
  lastScrapeAt: string | null
  timestamp: string
}

export function piHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  if (OPENCLAW_TOKEN) headers.Authorization = `Bearer ${OPENCLAW_TOKEN}`
  return headers
}

/**
 * Fetch Pi stats without request auth. Safe for cron routes and runtime health checks.
 */
export async function getOpenClawStatsInternal(): Promise<OpenClawStats | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${OPENCLAW_API}/api/stats`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: piHeaders(),
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return (await res.json()) as OpenClawStats
  } catch {
    return null
  }
}

export { OPENCLAW_API }
