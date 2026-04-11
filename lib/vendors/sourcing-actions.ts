'use server'

/**
 * Vendor Sourcing Actions
 *
 * Returns a ranked list of callable vendors for a given ingredient.
 * Two tiers:
 *   1. Chef's saved vendors (preferred/favorites) - always shown first
 *   2. National directory vendors in the chef's state - auto-populated, no save required
 *
 * The chef can call any vendor in either tier without any extra setup.
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
  source: 'saved' | 'national'
  address: string | null
  city: string | null
  state: string | null
}

// Vendor types ranked by specialty-ingredient relevance.
const TYPE_RELEVANCE: Record<string, number> = {
  specialty: 10,
  butcher: 9,
  fishmonger: 9,
  farm: 8,
  greengrocer: 8,
  produce: 8,
  dairy: 7,
  cheese: 7,
  organic: 7,
  bakery: 6,
  deli: 6,
  grocery: 5,
  other: 4,
  liquor: 3,
  equipment: 1,
}

// Ingredient keyword -> vendor types most likely to carry it
const INGREDIENT_TYPE_HINTS: Record<string, string[]> = {
  fish: ['fishmonger'],
  seafood: ['fishmonger'],
  salmon: ['fishmonger'],
  halibut: ['fishmonger'],
  cod: ['fishmonger'],
  haddock: ['fishmonger'],
  tuna: ['fishmonger'],
  shrimp: ['fishmonger'],
  lobster: ['fishmonger'],
  clam: ['fishmonger'],
  oyster: ['fishmonger'],
  scallop: ['fishmonger'],
  crab: ['fishmonger'],
  beef: ['butcher'],
  steak: ['butcher'],
  lamb: ['butcher'],
  pork: ['butcher'],
  chicken: ['butcher'],
  duck: ['butcher', 'farm'],
  rabbit: ['butcher', 'farm'],
  veal: ['butcher'],
  charcuterie: ['butcher', 'deli'],
  sausage: ['butcher', 'deli'],
  cheese: ['cheese', 'deli', 'specialty'],
  butter: ['dairy', 'specialty'],
  milk: ['dairy', 'farm'],
  cream: ['dairy', 'farm'],
  egg: ['farm'],
  herb: ['farm', 'greengrocer'],
  mushroom: ['farm', 'specialty', 'greengrocer'],
  truffle: ['specialty'],
  foie: ['specialty'],
  caviar: ['specialty', 'fishmonger'],
  produce: ['greengrocer', 'farm'],
  vegetable: ['greengrocer', 'farm'],
  fruit: ['greengrocer', 'farm'],
  bread: ['bakery'],
  pastry: ['bakery'],
  flour: ['bakery', 'specialty'],
  wine: ['liquor'],
  spirits: ['liquor'],
}

function getRelevantTypes(ingredientName: string): string[] {
  const lower = ingredientName.toLowerCase()
  for (const [keyword, types] of Object.entries(INGREDIENT_TYPE_HINTS)) {
    if (lower.includes(keyword)) return types
  }
  return []
}

export async function getVendorCallQueue(ingredientName: string): Promise<VendorCallCandidate[]> {
  if (!ingredientName || ingredientName.trim().length < 2) return []

  const user = await requireChef()
  const db: any = createServerClient()

  const relevantTypes = getRelevantTypes(ingredientName)

  // 1. Chef's saved vendors (favorites / personal call sheet)
  const { data: savedVendors } = await db
    .from('vendors')
    .select('id, name, vendor_type, phone, contact_name, is_preferred, address')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .not('phone', 'is', null)
    .neq('phone', '')

  const savedCandidates: VendorCallCandidate[] = (savedVendors || []).map((v: any) => {
    const typeScore = TYPE_RELEVANCE[v.vendor_type] ?? 4
    const preferredBonus = v.is_preferred ? 5 : 0
    const typeHintBonus = relevantTypes.includes(v.vendor_type) ? 3 : 0
    return {
      id: v.id,
      name: v.name,
      vendor_type: v.vendor_type ?? 'other',
      phone: v.phone,
      contact_name: v.contact_name ?? null,
      is_preferred: v.is_preferred ?? false,
      relevance_score: typeScore + preferredBonus + typeHintBonus,
      source: 'saved' as const,
      address: v.address ?? null,
      city: null,
      state: null,
    }
  })

  // 2. National vendors from chef's state (no save required)
  const { data: chef } = await db
    .from('chefs')
    .select('home_city, home_state')
    .eq('id', user.tenantId!)
    .single()

  const chefState = chef?.home_state || 'MA'

  let nationalQuery = db
    .from('national_vendors')
    .select('id, name, vendor_type, phone, address, city, state')
    .eq('state', chefState.toUpperCase())
    .not('phone', 'is', null)
    .neq('phone', '')

  // If we know the relevant types, filter to those first
  if (relevantTypes.length > 0) {
    nationalQuery = nationalQuery.in('vendor_type', relevantTypes)
  }

  const { data: nationalVendors } = await nationalQuery.order('name', { ascending: true }).limit(50)

  // Deduplicate by phone - saved vendors take priority
  const savedPhones = new Set(savedCandidates.map((v) => v.phone.replace(/\D/g, '')))

  const nationalCandidates: VendorCallCandidate[] = (nationalVendors || [])
    .filter((v: any) => {
      const digits = v.phone.replace(/\D/g, '')
      return !savedPhones.has(digits)
    })
    .map((v: any) => {
      const typeScore = TYPE_RELEVANCE[v.vendor_type] ?? 4
      const typeHintBonus = relevantTypes.includes(v.vendor_type) ? 3 : 0
      return {
        id: v.id,
        name: v.name,
        vendor_type: v.vendor_type ?? 'other',
        phone: v.phone,
        contact_name: null,
        is_preferred: false,
        relevance_score: typeScore + typeHintBonus,
        source: 'national' as const,
        address: v.address ?? null,
        city: v.city ?? null,
        state: v.state ?? null,
      }
    })

  // Merge: saved first (sorted by relevance), then national (sorted by relevance)
  const sortByRelevance = (a: VendorCallCandidate, b: VendorCallCandidate) => {
    if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score
    return a.name.localeCompare(b.name)
  }

  return [...savedCandidates.sort(sortByRelevance), ...nationalCandidates.sort(sortByRelevance)]
}
