// Event Media Vault - Type definitions
// 4-tier media management for event documentation and cross-event search.

// ─── Enums / Unions ───────────────────────────────────────────────────────────

export type MediaTier = 'raw' | 'curated' | 'polished' | 'published'

export type MediaType = 'photo' | 'video' | 'social_post'

export type MediaTag =
  | 'prep'
  | 'plated'
  | 'venue'
  | 'table'
  | 'team'
  | 'guest'
  | 'behind_scenes'
  | 'client_sent'

export type ConsentStatus =
  | 'no_photos'
  | 'private_only'
  | 'portfolio_ok'
  | 'social_ok'

// ─── Core Types ───────────────────────────────────────────────────────────────

export interface MediaAsset {
  id: string
  eventId: string
  tenantId: string
  tier: MediaTier
  mediaType: MediaType
  filePath: string | null
  externalUrl: string | null
  thumbnailPath: string | null
  caption: string | null
  tags: MediaTag[]
  dishName: string | null
  courseName: string | null
  venueAddress: string | null
  socialPlatform: string | null
  socialCaption: string | null
  socialPostDate: string | null
  annotation: string | null
  sourceAttribution: string | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface MediaConsent {
  id: string
  eventId: string
  tenantId: string
  guestId: string | null
  status: ConsentStatus
  notes: string | null
  recordedAt: string
  createdAt: string
  updatedAt: string
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface AddMediaInput {
  tier: MediaTier
  mediaType: MediaType
  filePath?: string | null
  externalUrl?: string | null
  thumbnailPath?: string | null
  caption?: string | null
  tags?: MediaTag[]
  dishName?: string | null
  courseName?: string | null
  venueAddress?: string | null
  socialPlatform?: string | null
  socialCaption?: string | null
  socialPostDate?: string | null
  annotation?: string | null
  sourceAttribution?: string | null
  displayOrder?: number
}

export interface RecordConsentInput {
  guestId?: string | null
  status: ConsentStatus
  notes?: string | null
}

// ─── Search Types ─────────────────────────────────────────────────────────────

export interface VaultSearchParams {
  dishName?: string
  venueAddress?: string
  tag?: MediaTag
  tier?: MediaTier
  mediaType?: MediaType
  eventId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export interface VaultSearchResult {
  assets: MediaAsset[]
  totalCount: number
}

export interface DishPhotoMatch {
  asset: MediaAsset
  eventId: string
  eventDate: string | null
  clientName: string | null
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface MediaStats {
  totalAssets: number
  byTier: Record<MediaTier, number>
  byType: Record<MediaType, number>
  byConsent: Record<ConsentStatus, number>
}
