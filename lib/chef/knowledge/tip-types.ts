// ChefTips types and constants (separate from 'use server' file)

export type ChefTipCategory =
  | 'technique'
  | 'ingredient'
  | 'equipment'
  | 'plating'
  | 'flavor'
  | 'business'
  | 'safety'
  | 'other'
  // Legacy categories (kept for backwards compat with existing data)
  | 'prep'
  | 'timing'
  | 'ingredients'
  | 'client'
  | 'dietary'
  | 'service'
  | 'mistakes'
  | 'discovery'
  | 'general'

export type ChefTip = {
  id: string
  title: string | null
  content: string
  category: ChefTipCategory
  tags: string[]
  source: string | null
  event_id: string | null
  shared: boolean
  pinned: boolean
  review: boolean
  promoted_to: string | null
  created_at: string
  updated_at: string
}

export const CHEFTIP_CATEGORIES: { value: ChefTipCategory; label: string }[] = [
  { value: 'technique', label: 'Technique' },
  { value: 'ingredient', label: 'Ingredient' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'plating', label: 'Plating' },
  { value: 'flavor', label: 'Flavor' },
  { value: 'business', label: 'Business' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
]
