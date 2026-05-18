// Departure Checklist + Leftover Tracking Types

export interface DepartureChecklistItem {
  id: string
  event_id: string
  tenant_id: string
  label: string
  category: 'departure' | 'leftover'
  checked: boolean
  sort_order: number
  created_at: string
}

export interface LeftoverInput {
  item_description: string
  quantity?: string
  packaging_type?: 'container' | 'wrapped' | 'bag' | 'box' | 'other'
  labeled?: boolean
  label_text?: string
  given_to?: string
  storage_instructions?: string
}

export interface EventLeftover {
  id: string
  event_id: string
  tenant_id: string
  item_description: string
  quantity: string | null
  packaging_type: 'container' | 'wrapped' | 'bag' | 'box' | 'other' | null
  labeled: boolean
  label_text: string | null
  given_to: string | null
  storage_instructions: string | null
  created_at: string
}
