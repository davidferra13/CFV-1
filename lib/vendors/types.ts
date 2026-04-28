import type { VENDOR_CATEGORY_VALUES, VENDOR_TYPE_VALUES } from './constants'

export type VendorCategory = (typeof VENDOR_CATEGORY_VALUES)[number]
export type VendorType = (typeof VENDOR_TYPE_VALUES)[number]

export type VendorInput = {
  name: string
  category: VendorCategory
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  notes?: string | null
  is_preferred?: boolean
  rating?: number | null
}

export type PriceEntryInput = {
  item_name: string
  price_cents: number
  unit: string
  recorded_at?: string
  notes?: string | null
}
