'use server'

/**
 * Vendor Sourcing Actions
 *
 * Powers the Tier 3 fallback in the ingredient sourcing intelligence system.
 * When the catalog (Tier 1) and web search (Tier 2) both fail to locate an
 * ingredient, this action returns the chef's saved vendor contacts ranked by
 * relevance, so they know exactly who to call and in what order.
 *
 * Tier 4 (AI auto-calling via Bland.ai) will wire into this same data.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type VendorCallCandidate = {
  id: string
  name: string
  vendor_type: string
  phone: string
  contact_name: string | null
  is_preferred: boolean
  relevance_score: number
}

// Vendor types ranked by general specialty-ingredient relevance.
// Higher = more likely to carry uncommon or specialty items.
const TYPE_RELEVANCE: Record<string, number> = {
  specialty: 10,
  butcher: 9,
  fishmonger: 9,
  farm: 8,
  produce: 8,
  dairy: 7,
  bakery: 6,
  grocery: 5,
  other: 4,
  liquor: 3,
  equipment: 1,
}

export async function getVendorCallQueue(ingredientName: string): Promise<VendorCallCandidate[]> {
  if (!ingredientName || ingredientName.trim().length < 2) return []

  const user = await requireChef()
  const db: any = createServerClient()

  const { data: vendors, error } = await db
    .from('vendors')
    .select('id, name, vendor_type, phone, contact_name, is_preferred')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .not('phone', 'is', null)
    .neq('phone', '')

  if (error || !vendors) return []

  const scored: VendorCallCandidate[] = vendors.map((v: any) => {
    const typeScore = TYPE_RELEVANCE[v.vendor_type] ?? 4
    const preferredBonus = v.is_preferred ? 5 : 0
    return {
      id: v.id,
      name: v.name,
      vendor_type: v.vendor_type ?? 'other',
      phone: v.phone,
      contact_name: v.contact_name ?? null,
      is_preferred: v.is_preferred ?? false,
      relevance_score: typeScore + preferredBonus,
    }
  })

  // Sort: highest relevance first, then alphabetically for ties
  return scored.sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score
    return a.name.localeCompare(b.name)
  })
}
