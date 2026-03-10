// BEO Types
// Shared type definitions for Banquet Event Order generation.

export type BEODish = {
  name: string | null
  description: string | null
  courseName: string
  courseNumber: number
  dietaryTags: string[]
  allergenFlags: string[]
  chefNotes: string | null
  platingInstructions: string | null
  sortOrder: number
}

export type BEOCourse = {
  name: string
  number: number
  dishes: BEODish[]
}

export type BEOStaffMember = {
  name: string
  role: string
  phone: string | null
}

export type BEOFinancials = {
  quotedPriceCents: number | null
  depositAmountCents: number | null
  totalPaidCents: number
  totalRefundedCents: number
  outstandingBalanceCents: number
  paymentStatus: string
  tipAmountCents: number
}

export type BEOTimeline = {
  arrivalTime: string | null
  serveTime: string
  departureTime: string | null
  prepStartedAt: string | null
  serviceStartedAt: string | null
  serviceCompletedAt: string | null
}

export type BEOData = {
  // Header
  eventId: string
  eventName: string
  occasion: string | null
  eventDate: string
  formattedDate: string
  serveTime: string
  serviceStyle: string
  status: string

  // Location
  locationAddress: string
  locationCity: string
  locationState: string
  locationZip: string
  locationNotes: string | null
  accessInstructions: string | null

  // Client
  client: {
    name: string
    email: string
    phone: string | null
  }
  guestCount: number
  guestCountConfirmed: boolean

  // Dietary
  dietaryRestrictions: string[]
  allergies: string[]

  // Menu
  menuName: string | null
  menuDescription: string | null
  isSimpleMenu: boolean
  simpleMenuContent: string | null
  courses: BEOCourse[]

  // Timeline
  timeline: BEOTimeline

  // Staff
  staff: BEOStaffMember[]

  // Notes
  specialRequests: string | null
  kitchenNotes: string | null
  siteNotes: string | null

  // Alcohol
  alcoholBeingServed: boolean | null
  cannabisPreference: boolean | null

  // Chef info (for header)
  chef: {
    businessName: string
    email: string
    phone: string | null
  }

  // Financials (only populated when includeFinancials is true)
  financials: BEOFinancials | null

  // Enhanced BEO sections (caterer archetype)
  equipmentChecklist: BEOEquipmentItem[]
  vendorDeliveries: BEOVendorDelivery[]
  stationAssignments: BEOStationAssignment[]
  breakdownTimeline: BEOBreakdownTask[]

  // Generated metadata
  generatedAt: string
  version: 'full' | 'kitchen'
}

// ─── Enhanced BEO Types ──────────────────────────────────────────────────────

export type BEOEquipmentItem = {
  name: string
  quantity: number
  source: string
  category: string
}

export type BEOVendorDelivery = {
  deliveryTime: string | null
  vendorName: string
  deliveryType: string
  items: string
  contactInfo: string | null
}

export type BEOStationAssignment = {
  stationName: string
  staffName: string
  roleNotes: string | null
}

export type BEOBreakdownTask = {
  order: number
  task: string
  estimatedMinutes: number
  responsible: string
}
