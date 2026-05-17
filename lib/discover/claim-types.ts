// Directory Post-Claim Enhancement Types
// Types for claim lifecycle, claimed listing management, and listing analytics.

// ---- Claim Status ----

export type ClaimStatus = 'unclaimed' | 'pending' | 'claimed' | 'verified' | 'rejected'

// ---- Verification Data ----

export type ClaimVerificationMethod =
  | 'email_match'
  | 'phone_call'
  | 'document_upload'
  | 'admin_override'

export interface ClaimVerificationData {
  method: ClaimVerificationMethod
  businessName: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  note?: string
}

// ---- Claimed Listing ----

export interface ClaimedListing {
  id: string
  name: string
  slug: string
  city: string | null
  state: string | null
  businessType: string
  status: ClaimStatus
  description: string | null
  address: string | null
  phone: string | null
  email: string | null
  websiteUrl: string | null
  menuUrl: string | null
  hours: Record<string, string> | null
  photoUrls: string[]
  cuisineTypes: string[]
  priceRange: string | null
  claimedByName: string | null
  claimedByEmail: string | null
  claimedAt: string | null
  linkedChefId: string | null
  createdAt: string
  updatedAt: string
}

// ---- Listing Update Payload ----

export interface ClaimedListingUpdate {
  description?: string
  address?: string
  phone?: string
  email?: string
  websiteUrl?: string
  menuUrl?: string
  hours?: Record<string, string>
  photoUrls?: string[]
  cuisineTypes?: string[]
  priceRange?: string
}

// ---- Listing Analytics ----

export interface ListingAnalytics {
  listingId: string
  totalFavorites: number
  recentFavorites: number
  claimedAt: string | null
  daysSinceClaimed: number | null
  listingStatus: string
  hasLinkedChef: boolean
  completenessScore: number
  missingFields: string[]
}

// ---- Claim Submission Result ----

export interface ClaimSubmissionResult {
  success: boolean
  error?: string
  claimId?: string
  slug?: string
}

// ---- Admin Claim Verification Result ----

export interface ClaimVerificationResult {
  success: boolean
  error?: string
  newStatus?: ClaimStatus
}
