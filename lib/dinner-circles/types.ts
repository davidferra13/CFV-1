import type { EventDefaultLayerResult } from '@/lib/events/default-behaviors'

export type DinnerCirclePalette = 'field' | 'hearth' | 'market' | 'coastal' | 'custom'

export type DinnerCircleTheme = {
  palette: DinnerCirclePalette
  accentColor: string
  backgroundMode: 'plain' | 'subtle_gradient' | 'muted_image'
  mutedImageUrl?: string | null
}

export type DinnerCircleLayoutZone = {
  id: string
  label: string
  kind: 'kitchen' | 'prep' | 'service' | 'guest' | 'storage' | 'path'
  x: number
  y: number
  w: number
  h: number
  notes?: string
}

export type DinnerCircleTimelineItem = {
  time: string
  title: string
  zoneId?: string
  notes?: string
}

export type DinnerCircleAnimal = {
  name: string
  species?: string
  photoUrl?: string
  notes?: string
}

export type DinnerCircleSourceLink = {
  ingredient: string
  sourceName: string
  notes?: string
}

export type DinnerCircleIngredientStatus =
  | 'confirmed'
  | 'flexible'
  | 'pending'
  | 'substitution_pending'
  | 'unavailable'

export type DinnerCircleAvailabilityItem = {
  ingredient: string
  quantity?: string
  sourceName?: string
  status: DinnerCircleIngredientStatus
  unitCostCents?: number | null
  allocatedTo?: string
  substitution?: string
  flavorRole?: string
}

export type DinnerCircleSocialPost = {
  source: 'instagram' | 'tiktok' | 'facebook' | 'website' | 'manual'
  label: string
  url?: string
  body?: string
}

export type DinnerCircleVendorInquiry = {
  name: string
  email: string
  role: string
  note?: string
  submittedAt: string
}

export type PopUpLifecycleStage =
  | 'concept'
  | 'menu_build'
  | 'orders_open'
  | 'production_lock'
  | 'day_of'
  | 'closed'
  | 'analyzed'

export type PopUpOrderSource =
  | 'online'
  | 'dm'
  | 'comment'
  | 'word_of_mouth'
  | 'form'
  | 'walkup'
  | 'comp'

export type PopUpMenuItemPlan = {
  ticketTypeId?: string | null
  dishIndexId?: string | null
  recipeId?: string | null
  name: string
  plannedUnits: number
  suggestedUnits?: number | null
  bufferPercent?: number | null
  batchSize?: number | null
  unitCostCents?: number | null
  priceCents?: number | null
  targetMarginPercent?: number | null
  prepLeadHours?: number | null
  productionStatus?: 'not_started' | 'prep_started' | 'batched' | 'packed' | 'ready'
  equipmentNeeded?: string[]
  constraints?: string[]
  notes?: string
}

export type PopUpLocationProfile = {
  locationKind: 'cafe_collab' | 'standalone_drop' | 'private_event' | 'market' | 'other'
  accessWindow?: string
  kitchenAccess?: string
  equipmentAvailable: string[]
  coldStorage?: string
  holdingConstraints?: string[]
  loadInNotes?: string
}

export type PopUpCloseoutItem = {
  name: string
  plannedUnits: number
  producedUnits: number
  soldUnits: number
  wastedUnits: number
  soldOutAt?: string | null
  revenueCents: number
  estimatedCostCents: number
  notes?: string
}

export type PopUpConfig = {
  stage: PopUpLifecycleStage
  dropType: 'cafe_collab' | 'weekend_drop' | 'private_dessert_event' | 'other'
  preorderOpensAt?: string | null
  preorderClosesAt?: string | null
  productionLocksAt?: string | null
  pickupWindows?: string[]
  orderSources?: PopUpOrderSource[]
  locationProfile?: PopUpLocationProfile
  menuItems: PopUpMenuItemPlan[]
  closeout?: {
    itemResults: PopUpCloseoutItem[]
    overallNotes?: string
    nextDropIdeas?: string
  }
}

export type DinnerCircleSourcingEvent = {
  id: string
  ingredient: string
  previousStatus: DinnerCircleIngredientStatus
  newStatus: DinnerCircleIngredientStatus
  reason: string
  sourceName?: string
  loggedAt: string
}

export type DinnerCircleSubstitutionProposal = {
  id: string
  originalIngredient: string
  proposedSubstitute: string
  reason: string
  costDeltaCents: number | null
  status: 'proposed' | 'acknowledged' | 'flagged'
  proposedAt: string
  respondedAt?: string
  clientNote?: string
}

export type DinnerCirclePriceTolerance = {
  flexibilityPercent: number
  lastSnapshotCents: number | null
  currentEstimateCents: number | null
  driftPercent: number | null
  withinTolerance: boolean
}

export type CorporateApprovalGateStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'skipped'

export type CorporatePaymentTerms = 'net_15' | 'net_30' | 'net_60' | 'on_receipt' | 'prepaid'

export type CorporateDocType = 'insurance' | 'w9' | 'food_handler' | 'business_license' | 'other'

export type CorporateDocStatus = 'missing' | 'submitted' | 'approved' | 'expired'

export type CorporateContact = {
  name: string
  role: string
  email?: string
  phone?: string
  isDecisionMaker: boolean
}

export type CorporateRequiredDoc = {
  type: CorporateDocType
  label: string
  required: boolean
  status: CorporateDocStatus
  expiresAt?: string
  notes?: string
}

export type CorporateConfig = {
  enabled: boolean
  companyName?: string
  departmentName?: string
  poNumber?: string
  costCenter?: string
  paymentTerms?: CorporatePaymentTerms
  budgetCeilingCents?: number
  contacts: CorporateContact[]
  requiredDocs: CorporateRequiredDoc[]
}

export type DinnerCircleConfig = {
  money?: {
    paySplit: string
    ticketSeller: string
    compensation: string
    platformFeePercent: number
  }
  supplier?: {
    rawInput: string
    ingredientLines: string[]
    sourceLinks: DinnerCircleSourceLink[]
  }
  menu?: {
    manualNotes: string
    pollEnabled: boolean
    suggestionsEnabled: boolean
    versionLabel?: string
    lockedAt?: string | null
    fixedElements?: string
    flexibleElements?: string
    changeLog?: string[]
  }
  publicPage?: {
    story: string
    pastLinks: Array<{ label: string; url: string }>
    showGuestMap: boolean
  }
  layout?: {
    name: string
    reusable: boolean
    chefNotes: string
    zones: DinnerCircleLayoutZone[]
    timeline: DinnerCircleTimelineItem[]
  }
  farm?: {
    enabled: boolean
    showcaseTitle: string
    notes: string
    animals: DinnerCircleAnimal[]
  }
  social?: {
    enabled: boolean
    posts: DinnerCircleSocialPost[]
  }
  adaptive?: {
    availabilityItems: DinnerCircleAvailabilityItem[]
    clientExpectationNote: string
    changeWindowNote: string
    pricingAdjustmentPolicy: string
    substitutionValidationNotes: string
    finalValidationLocked: boolean
    finalValidationNotes: string
    sourcingLog?: DinnerCircleSourcingEvent[]
    substitutionProposals?: DinnerCircleSubstitutionProposal[]
    priceFlexibilityPercent?: number
  }
  popUp?: PopUpConfig
  theme?: DinnerCircleTheme
  vendorInquiries?: DinnerCircleVendorInquiry[]
  corporate?: CorporateConfig
}

export type DinnerCircleAdaptiveSnapshot = {
  confirmedCount: number
  flexibleCount: number
  pendingCount: number
  unavailableCount: number
  substitutionPendingCount: number
  pricedIngredientCount: number
  estimatedIngredientCostCents: number
  hasClientExpectationLayer: boolean
  hasSubstitutionValidation: boolean
  finalValidationLocked: boolean
  liveMenuState: 'locked' | 'fluid' | 'needs_sourcing'
}

export type DinnerCircleSnapshot = {
  eventId: string
  shareUrl: string | null
  hubUrl: string | null
  config: DinnerCircleConfig
  counts: {
    collaborators: number
    activeTicketTypes: number
    paidTickets: number
    paidGuests: number
    publicPhotos: number
    menuCount: number
  }
  money: {
    revenueCents: number
    refundedCents: number
    projectedCapacity: number
    projectedRevenueCents: number
    platformFeeCents: number
    netPayoutCents: number
    finalNetCents: number
  }
  checks: Array<{
    key: string
    label: string
    status: 'ready' | 'warning'
    actionHref?: string
  }>
  defaults: EventDefaultLayerResult
  adaptive: DinnerCircleAdaptiveSnapshot
}
