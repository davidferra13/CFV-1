export const GRAZING_FORMATS = ['small_board', 'mid_spread', 'large_table'] as const
export const GRAZING_SERVICE_STYLES = [
  'light_snack',
  'standard_grazing',
  'heavy_grazing',
  'meal_replacement',
] as const
export const GRAZING_DENSITIES = ['light', 'standard', 'abundant'] as const
export const GRAZING_EDIBLE_CATEGORIES = [
  'cheese',
  'charcuterie',
  'fruit',
  'crackers_bread',
  'nuts',
  'dips_spreads',
  'garnish',
] as const
export const GRAZING_COMPONENT_CATEGORIES = [
  'cheese',
  'charcuterie',
  'fruit',
  'cracker_bread',
  'nut',
  'dip_spread',
  'pickle_olive',
  'garnish',
  'sweet',
  'prop',
] as const
export const GRAZING_PLAN_STATUSES = ['draft', 'client_sent', 'client_approved', 'locked'] as const

export type GrazingFormat = (typeof GRAZING_FORMATS)[number]
export type GrazingServiceStyle = (typeof GRAZING_SERVICE_STYLES)[number]
export type GrazingDensity = (typeof GRAZING_DENSITIES)[number]
export type GrazingEdibleCategory = (typeof GRAZING_EDIBLE_CATEGORIES)[number]
export type GrazingCategory = GrazingEdibleCategory | 'props'
export type GrazingComponentCategory = (typeof GRAZING_COMPONENT_CATEGORIES)[number]
export type GrazingPlanStatus = (typeof GRAZING_PLAN_STATUSES)[number]

export type GrazingComponentMix = Partial<Record<GrazingEdibleCategory, number>>

export type GrazingPlanInput = {
  guestCount: number
  eventFormat: GrazingFormat
  serviceStyle: GrazingServiceStyle
  density: GrazingDensity
  tableLengthFt?: number | null
  tableWidthFt?: number | null
  budgetCents?: number | null
  targetMarginPercent?: number
  componentMix?: GrazingComponentMix
}

export type GrazingQuantityLine = {
  category: GrazingCategory
  label: string
  quantity: number
  unit: 'oz' | 'cup' | 'each'
  edibleOz: number
  estimatedCostCents: number
  displayOrder: number
  notes: string
}

export type GrazingLayoutZone = {
  id: string
  label: string
  kind:
    | 'anchor_cheese'
    | 'charcuterie_ribbon'
    | 'fruit_block'
    | 'cracker_bread_perimeter'
    | 'dip_bowl'
    | 'garnish_finish'
    | 'service_flow'
  description: string
  displayOrder: number
}

export type GrazingLayoutPlan = {
  surfaceSqFt: number | null
  sqFtPerGuest: number | null
  densityAssessment: 'unknown' | 'tight' | 'standard' | 'spacious'
  zones: GrazingLayoutZone[]
  serviceFlowNotes: string[]
}

export type GrazingPricingEstimate = {
  estimatedFoodCostCents: number
  estimatedPropsCostCents: number
  estimatedTotalCostCents: number
  costPerGuestCents: number
  suggestedQuoteCents: number
  quotePerGuestCents: number
  grossMarginCents: number
  grossMarginPercent: number
}

export type GrazingPlanOutput = {
  totalEdibleOz: number
  perGuestOz: number
  quantityPlan: GrazingQuantityLine[]
  layoutPlan: GrazingLayoutPlan
  pricingEstimate: GrazingPricingEstimate
  warnings: string[]
}

export type GrazingTemplate = {
  id: string
  tenantId?: string
  name: string
  format: GrazingFormat
  serviceStyle: GrazingServiceStyle
  aestheticTags: string[]
  defaultDensity: GrazingDensity
  layoutZones: unknown[]
  componentMix: Record<GrazingEdibleCategory, number>
  active: boolean
}

export type GrazingComponent = {
  id: string
  tenantId?: string
  name: string
  category: GrazingComponentCategory
  aestheticTags: string[]
  seasonTags: string[]
  dietaryTags: string[]
  defaultUnit: string
  defaultVendorId: string | null
  costPerUnitCents: number | null
  clientDescription: string | null
  prepNotes: string | null
  storageNotes: string | null
  active: boolean
}

export type GrazingPlan = {
  id: string
  eventId: string
  tenantId: string
  templateId: string | null
  status: GrazingPlanStatus
  eventFormat: GrazingFormat
  serviceStyle: GrazingServiceStyle
  guestCount: number
  tableLengthFt: number | null
  tableWidthFt: number | null
  density: GrazingDensity
  budgetCents: number | null
  targetMarginPercent: number
  aestheticTags: string[]
  inspirationNotes: string | null
  inspirationAssets: GrazingInspirationAsset[]
  layoutPlan: GrazingLayoutPlan | Record<string, unknown>
  quantityPlan: GrazingQuantityLine[] | Record<string, unknown>
  pricingSnapshot: GrazingPricingEstimate | Record<string, unknown>
  sourcingSnapshot: GrazingSourcingPlan | Record<string, unknown>
  clientConfirmationSnapshot: GrazingClientConfirmation | Record<string, unknown>
  lockedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  items: GrazingItem[]
}

export type GrazingItem = {
  id: string
  planId: string
  tenantId: string
  componentId: string | null
  category: string
  name: string
  quantity: number
  unit: string
  estimatedCostCents: number
  vendorId: string | null
  displayOrder: number
  clientVisible: boolean
  substitutionAllowed: boolean
  notes: string | null
}

export type GrazingInspirationAsset = {
  url: string
  name?: string
  type?: string
}

export type GrazingPrepChecklistGroup = {
  offset: 'T-7' | 'T-5' | 'T-3' | 'T-2' | 'T-1' | 'Day-of'
  title: string
  items: string[]
}

export type GrazingClientConfirmation = {
  eventId: string
  status: GrazingPlanStatus
  guestCount: number
  eventFormat: GrazingFormat
  serviceStyle: GrazingServiceStyle
  aestheticTags: string[]
  includedCategories: { category: string; items: string[] }[]
  substitutionNotes: string[]
  setupAssumptions: string[]
  dietaryAllergenDisclaimer: string
  priceSummary: { suggestedQuoteCents: number; quotePerGuestCents: number } | null
  builtAt: string
}

export type GrazingSourcingPlan = {
  eventId: string
  vendorGroups: {
    vendorId: string | null
    vendorName: string
    items: GrazingItem[]
    subtotalCents: number
  }[]
  checklist: GrazingPrepChecklistGroup[]
  builtAt: string
}

export type GrazingMultiEventSnapshot = {
  dateRange: { from: string; to: string }
  events: {
    id: string
    occasion: string
    eventDate: string
    guestCount: number
    planStatus: GrazingPlanStatus
    estimatedCostCents: number
  }[]
  sharedPurchasing: {
    category: string
    name: string
    quantity: number
    unit: string
    eventCount: number
    estimatedCostCents: number
  }[]
  prepPressure: { date: string; eventCount: number; warnings: string[] }[]
  lockedOrApprovedPlans: { eventId: string; status: GrazingPlanStatus; eventDate: string }[]
}
