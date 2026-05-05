/**
 * Resolve the OpenClaw API base URL at call time so env changes
 * (e.g. correcting the Pi IP) take effect without a server restart.
 */
function resolveOpenClawApi(): string {
  return process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'
}

/** Backwards-compatible constant (reads env at import time). Prefer resolveOpenClawApi(). */
const OPENCLAW_API = resolveOpenClawApi()

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
  const token = process.env.OPENCLAW_API_TOKEN || null
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/**
 * Fetch Pi stats without request auth. Safe for cron routes and runtime health checks.
 */
export async function getOpenClawStatsInternal(): Promise<OpenClawStats | null> {
  try {
    const apiUrl = resolveOpenClawApi()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${apiUrl}/api/stats`, {
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

export { OPENCLAW_API, resolveOpenClawApi }
