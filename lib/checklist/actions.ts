// Non-Negotiables Checklist Server Actions
// Permanent items + event-specific items + learned items from AARs
// The learning system: forgotten 2+ times → promoted to permanent checklist

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getForgottenItemsFrequency } from '@/lib/aar/actions'
import { revalidatePath } from 'next/cache'

// Default permanent checklist items (Printed Sheet #3 from master doc)
const DEFAULT_PERMANENT_ITEMS = [
  'Gloves',
  'Gum/mints',
  'Clean uniform',
  'Clean shoes',
  'Towels',
  'Trash bags',
  'Parchment paper',
  'Salt',
  'Olive oil',
  'Black pepper',
  'Butter',
]

// Event-specific item triggers based on menu/event characteristics
const EVENT_SPECIFIC_TRIGGERS: Record<string, string[]> = {
  sous_vide: ['Vacuum seal bags', 'Immersion circulator'],
  cocktail: ['Specialty liquor', 'Cocktail shaker', 'Ice'],
  tasting_menu: ['Tasting spoons', 'Small plates'],
  dessert_frozen: ['Ice cream machine'],
  grill: ['Charcoal/propane', 'Grill tools'],
  buffet: ['Chafing dishes', 'Sterno fuel'],
}

export type ChecklistItem = {
  item: string
  category: 'permanent' | 'event_specific' | 'learned'
  forgottenCount?: number
}

/**
 * Get the combined checklist for a chef, optionally tailored to a specific event
 * Merges: permanent defaults + chef custom items + event-specific + learned from AARs
 */
export async function getChefChecklist(eventId?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const items: ChecklistItem[] = []

  // 1. Permanent items - default + any chef custom items
  const { data: chef } = await supabase.from('chefs').select('id').eq('id', user.tenantId!).single()

  if (!chef) throw new Error('Chef not found')

  // Use defaults (chef-specific customization would require a schema addition)
  for (const item of DEFAULT_PERMANENT_ITEMS) {
    items.push({ item, category: 'permanent' })
  }

  // 2. Event-specific items (if eventId provided)
  if (eventId) {
    const { data: event } = await supabase
      .from('events')
      .select('service_style, special_requests')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (event) {
      // Add items based on service style
      if (event.service_style === 'buffet') {
        for (const item of EVENT_SPECIFIC_TRIGGERS.buffet) {
          items.push({ item, category: 'event_specific' })
        }
      }
      if (event.service_style === 'cocktail') {
        for (const item of EVENT_SPECIFIC_TRIGGERS.cocktail) {
          items.push({ item, category: 'event_specific' })
        }
      }
      if (event.service_style === 'tasting_menu') {
        for (const item of EVENT_SPECIFIC_TRIGGERS.tasting_menu) {
          items.push({ item, category: 'event_specific' })
        }
      }

      // Check special requests for keywords
      const requests = (event.special_requests ?? '').toLowerCase()
      if (requests.includes('sous vide')) {
        for (const item of EVENT_SPECIFIC_TRIGGERS.sous_vide) {
          items.push({ item, category: 'event_specific' })
        }
      }
      if (requests.includes('grill') || requests.includes('bbq')) {
        for (const item of EVENT_SPECIFIC_TRIGGERS.grill) {
          items.push({ item, category: 'event_specific' })
        }
      }
    }
  }

  // 3. Learned items - forgotten 2+ times across AARs
  const forgottenFreq = await getForgottenItemsFrequency()
  const permanentNormalized = new Set(items.map((i) => i.item.toLowerCase()))

  for (const { item, count } of forgottenFreq) {
    if (count >= 2 && !permanentNormalized.has(item.toLowerCase())) {
      items.push({
        item: item.charAt(0).toUpperCase() + item.slice(1), // Capitalize
        category: 'learned',
        forgottenCount: count,
      })
    }
  }

  return items
}

/**
 * Get just the permanent checklist items
 */
export async function getPermanentChecklist() {
  await requireChef()
  return DEFAULT_PERMANENT_ITEMS
}

/**
 * Get learned items (forgotten 2+ times) that could be promoted
 */
export async function getLearnedChecklistItems() {
  const forgottenFreq = await getForgottenItemsFrequency()
  return forgottenFreq.filter((f) => f.count >= 2)
}
