// Equipment Packing List Auto-Generation - Types
// Shared between server actions, technique map, and UI components.

export type PackingItemSource = 'menu_technique' | 'guest_scale' | 'venue_gap' | 'registry' | 'custom'
export type PackingSection = 'must_bring' | 'recommended' | 'not_needed'

export interface PackingItem {
  id: string
  packingListId: string
  name: string
  category: string
  quantity: number
  source: PackingItemSource
  section: PackingSection
  checked: boolean
  checkedAt: string | null
  notes: string | null
}

export interface PackingList {
  id: string
  eventId: string
  tenantId: string
  generatedAt: string
  finalizedAt: string | null
  items: PackingItem[]
}

export interface EquipmentRegistryItem {
  id: string
  tenantId: string
  name: string
  category: string
  quantity: number
  notes: string | null
  portable: boolean
  createdAt: string
}

export type EquipmentCategory =
  | 'cooking'
  | 'prep'
  | 'plating'
  | 'service'
  | 'transport'
  | 'misc'

export const EQUIPMENT_REGISTRY_CATEGORIES: EquipmentCategory[] = [
  'cooking',
  'prep',
  'plating',
  'service',
  'transport',
  'misc',
]
