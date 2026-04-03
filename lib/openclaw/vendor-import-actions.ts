'use server'

/**
 * Vendor Price List Import
 * Chef users upload PDF price lists from vendors, Pi parses them,
 * the user reviews matches, then confirms import.
 * Two-step flow: parse (read-only) then confirm (mutating).
 */

import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { revalidateTag } from 'next/cache'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

// --- Types ---

export type ParsedVendorItem = {
  raw_name: string
  canonical_id: string | null
  canonical_name: string | null
  price_cents: number
  unit: string
  matched: boolean
  confidence: number
}

export type VendorType = 'farm' | 'fish_market' | 'butcher' | 'specialty' | 'wholesale'
export type PricingTier = 'retail' | 'wholesale' | 'farm_direct'

export type ParseResult = {
  success: boolean
  parsed_items: number
  matched: number
  unmatched: number
  items: ParsedVendorItem[]
  error?: string
}

export type ConfirmResult = {
  success: boolean
  imported: number
  error?: string
}

// --- Actions ---

export async function parseVendorPriceList(formData: FormData): Promise<ParseResult> {
  await requireChef()

  const file = formData.get('file') as File | null
  const vendorName = formData.get('vendor_name') as string
  const vendorType = formData.get('vendor_type') as string
  const pricingTier = formData.get('pricing_tier') as string

  if (!file)
    return {
      success: false,
      parsed_items: 0,
      matched: 0,
      unmatched: 0,
      items: [],
      error: 'No file provided',
    }
  if (!vendorName?.trim())
    return {
      success: false,
      parsed_items: 0,
      matched: 0,
      unmatched: 0,
      items: [],
      error: 'Vendor name is required',
    }
  if (file.size > 10 * 1024 * 1024)
    return {
      success: false,
      parsed_items: 0,
      matched: 0,
      unmatched: 0,
      items: [],
      error: 'File exceeds 10MB limit',
    }

  // Proxy PDF to Pi for parsing
  const piFormData = new FormData()
  piFormData.append('file', file)
  piFormData.append('vendor_name', vendorName)
  piFormData.append('vendor_type', vendorType || 'specialty')
  piFormData.append('pricing_tier', pricingTier || 'retail')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000) // 30s for PDF processing

  try {
    const res = await fetch(`${OPENCLAW_API}/api/vendor/import`, {
      method: 'POST',
      body: piFormData,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        success: false,
        parsed_items: 0,
        matched: 0,
        unmatched: 0,
        items: [],
        error: text || `Pi returned ${res.status}`,
      }
    }

    const data = await res.json()
    const items: ParsedVendorItem[] = (data.items || []).map((item: any) => ({
      raw_name: item.raw_name || '',
      canonical_id: item.canonical_id || null,
      canonical_name: item.canonical_name || item.canonical_id || null,
      price_cents: item.price_cents || 0,
      unit: item.unit || 'each',
      matched: item.matched || false,
      confidence:
        item.confidence === 'direct_scrape'
          ? 1.0
          : typeof item.confidence === 'number'
            ? item.confidence
            : 0.5,
    }))

    const matched = items.filter((i) => i.matched).length

    return {
      success: true,
      parsed_items: data.parsed_items || items.length,
      matched,
      unmatched: items.length - matched,
      items,
    }
  } catch {
    clearTimeout(timeout)
    return {
      success: false,
      parsed_items: 0,
      matched: 0,
      unmatched: 0,
      items: [],
      error: 'Cannot reach OpenClaw Pi. Ensure Pi is online.',
    }
  }
}

export async function confirmVendorImport(payload: {
  vendor_name: string
  vendor_source_id: string
  items: { canonical_id: string; raw_name: string; price_cents: number; unit: string }[]
}): Promise<ConfirmResult> {
  await requireChef()

  if (!payload.items || payload.items.length === 0) {
    return { success: false, imported: 0, error: 'No items to import' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(`${OPENCLAW_API}/api/vendor/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { success: false, imported: 0, error: text || `Pi returned ${res.status}` }
    }

    const data = await res.json()

    revalidatePath('/culinary/price-catalog')
    revalidateTag('pi-data')

    return {
      success: true,
      imported: data.imported || payload.items.length,
    }
  } catch {
    clearTimeout(timeout)
    return { success: false, imported: 0, error: 'Cannot reach OpenClaw Pi. Ensure Pi is online.' }
  }
}
