// ChefTips types and constants (separate from 'use server' file)

export type ChefTipCategory =
  | 'prep'
  | 'technique'
  | 'timing'
  | 'plating'
  | 'ingredients'
  | 'equipment'
  | 'client'
  | 'dietary'
  | 'service'
  | 'mistakes'
  | 'discovery'
  | 'general'

export type ChefTip = {
  id: string
  content: string
  tags: string[]
  shared: boolean
  created_at: string
  updated_at: string
}

export const CHEFTIP_CATEGORIES: { value: ChefTipCategory; label: string }[] = [
  { value: 'prep', label: 'Prep' },
  { value: 'technique', label: 'Technique' },
  { value: 'timing', label: 'Timing' },
  { value: 'plating', label: 'Plating' },
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'client', label: 'Client Management' },
  { value: 'dietary', label: 'Dietary' },
  { value: 'service', label: 'Service' },
  { value: 'mistakes', label: 'Mistakes' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'general', label: 'General' },
]
