export type ConsentType =
  | 'marketing'
  | 'photos'
  | 'testimonials'
  | 'data_sharing'
  | 'dietary_storage'
  | 'contact_reuse'
export type ConsentStatus = 'granted' | 'denied' | 'withdrawn' | 'pending'
export interface ConsentRecord {
  id: string
  tenantId: string
  clientId: string
  consentType: ConsentType
  status: ConsentStatus
  grantedAt: string | null
  withdrawnAt: string | null
  ipAddress: string | null
  source: 'portal' | 'email' | 'verbal' | 'form'
  notes: string | null
  createdAt: string
}
export interface SharingPermission {
  id: string
  tenantId: string
  entityType: 'event' | 'menu' | 'recipe' | 'photo' | 'review'
  entityId: string
  visibility: 'private' | 'client_only' | 'circle' | 'public'
  expiresAt: string | null
  createdAt: string
}
export interface ConsentSummary {
  clientId: string
  clientName: string
  consents: { type: ConsentType; status: ConsentStatus; grantedAt: string | null }[]
  completeness: number
}
