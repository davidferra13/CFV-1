'use server'

/**
 * OpenClaw Store Preference Integration
 * Thin wrappers connecting chef store preferences to OpenClaw's price data.
 */

import { requireChef } from '@/lib/auth/get-user'
import { getPreferredStores } from '@/lib/grocery/store-shopping-actions'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

// --- Helpers ---

async function fetchPi<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${OPENCLAW_API}${path}`, {
      ...options,
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return { data: null, error: `Pi returned ${res.status}` }
    return { data: await res.json(), error: null }
  } catch {
    clearTimeout(timeout)
    return { data: null, error: 'Price data temporarily unavailable' }
  }
}

// --- Actions ---

/**
 * Get list of store display names from Pi's source registry.
 */
export async function getAvailableOpenClawStores(): Promise<string[]> {
  await requireChef()

  const result = await fetchPi<{ sources: { name: string }[] }>('/api/sources')
  if (!result.data) return []

  return (result.data.sources || [])
    .map((s) => s.name || '')
    .filter(Boolean)
    .sort()
}

/**
 * Get the chef's primary (default) store name, or null if none set.
 */
export async function getMyPrimaryStoreName(): Promise<string | null> {
  await requireChef()

  const stores = await getPreferredStores()
  const defaultStore = stores.find((s) => s.is_default)
  return defaultStore?.store_name || null
}
