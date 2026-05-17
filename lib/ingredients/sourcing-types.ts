// Ingredient Sourcing Intelligence - Types

export type VendorType =
  | 'grocery'
  | 'specialty'
  | 'butcher'
  | 'fishmonger'
  | 'farm'
  | 'liquor'
  | 'equipment'
  | 'bakery'
  | 'produce'
  | 'dairy'
  | 'other'

export type SourcingOption = {
  vendorId: string
  vendorName: string
  vendorType: VendorType
  phone: string | null
  email: string | null
  contactName: string | null
  isPreferred: boolean
  reliabilityScore: number | null
  minimumOrderCents: number | null
  notes: string | null
  lastPriceCents: number | null
  lastPriceDate: string | null
  lastPriceUnit: string | null
}

export type VendorPreference = {
  id: string
  ingredientId: string
  tenantId: string
  vendorName: string
  vendorType: VendorType
  notes: string | null
  isPreferred: boolean
  createdAt: string
}

export type SeasonalWindow = {
  ingredientId: string
  ingredientName: string
  category: string
  peakMonths: number[]
  availableMonths: number[]
  qualityNotes: string | null
}

export type PurchaseLogEntry = {
  id: string
  ingredientId: string
  tenantId: string
  vendorName: string
  priceCents: number
  quantity: string
  unit: string
  qualityRating: number | null
  purchasedAt: string
  notes: string | null
  createdAt: string
}

export type PurchaseLogInput = {
  vendorName: string
  priceCents: number
  quantity: string
  unit: string
  qualityRating?: number | null
  purchasedAt?: string
  notes?: string | null
}

export type SourcingReport = {
  eventId: string
  items: SourcingReportItem[]
  totalEstimatedCents: number
  vendorSummary: { vendorName: string; itemCount: number; estimatedCents: number }[]
}

export type SourcingReportItem = {
  ingredientId: string
  ingredientName: string
  requiredQuantity: string | null
  requiredUnit: string | null
  preferredVendor: string | null
  estimatedPriceCents: number | null
  sourcingOptions: SourcingOption[]
}
