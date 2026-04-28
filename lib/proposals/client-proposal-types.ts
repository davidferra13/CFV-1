export type ProposalAddonEntry = {
  addonId: string
  name: string
  priceCents: number
}

export type ClientProposal = {
  id: string
  tenantId: string
  eventId: string | null
  clientId: string | null
  templateId: string | null
  menuId: string | null
  shareToken: string
  title: string
  personalNote: string | null
  coverPhotoUrl: string | null
  totalPriceCents: number
  selectedAddons: ProposalAddonEntry[]
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'declined' | 'expired'
  sentAt: string | null
  viewedAt: string | null
  approvedAt: string | null
  declinedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type PublicProposalData = {
  id: string
  title: string
  personalNote: string | null
  coverPhotoUrl: string | null
  totalPriceCents: number
  selectedAddons: ProposalAddonEntry[]
  status: string
  expiresAt: string | null
  createdAt: string
  chefName: string | null
  chefBusinessName: string | null
  chefSlug: string | null
  clientName: string | null
  eventDate: string | null
  eventServeTime: string | null
  eventOccasion: string | null
  guestCount: number | null
  serviceStyle: string | null
  locationAddress: string | null
  locationCity: string | null
  locationState: string | null
  locationZip: string | null
  locationNotes: string | null
  kitchenNotes: string | null
  dietaryRestrictions: string[]
  allergies: string[]
  specialRequests: string | null
  quotedPriceCents: number | null
  eventDepositAmountCents: number | null
  paymentStatus: string | null
  menu: {
    id: string
    name: string
    description: string | null
    dishes: { id: string; name: string; description: string | null; course: string | null }[]
  } | null
  template: {
    id: string
    name: string
    description: string | null
    coverPhotoUrl: string | null
    includedServices: Record<string, unknown> | null
  } | null
  payment: {
    depositRequired: boolean | null
    depositPercentage: number | null
    depositAmountCents: number | null
    balanceDueCents: number | null
    balanceDueDaysBefore: number | null
    termsText: string | null
    source: 'event' | 'chef_settings' | 'not_published'
  }
  cancellationPolicy: {
    name: string
    gracePeriodHours: number | null
    tiers: Array<{
      label: string
      minDays: number | null
      maxDays: number | null
      refundPercent: number | null
    }>
    notes: string | null
  } | null
  reviews: {
    totalReviews: number
    averageRating: number
    highlights: Array<{
      id: string
      reviewerName: string
      rating: number | null
      reviewText: string
      sourceLabel: string
    }>
  }
}
