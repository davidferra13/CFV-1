// Permit types, statuses, and labels - no 'use server' (safe to import from client components)

export const PERMIT_TYPES = [
  'health',
  'business',
  'fire',
  'parking',
  'vendor',
  'mobile_food',
  'other',
] as const

export const PERMIT_STATUSES = ['active', 'expired', 'pending_renewal', 'revoked'] as const

export type PermitType = (typeof PERMIT_TYPES)[number]
export type PermitStatus = (typeof PERMIT_STATUSES)[number]

export const PERMIT_TYPE_LABELS: Record<PermitType, string> = {
  health: 'Health Permit',
  business: 'Business License',
  fire: 'Fire Permit',
  parking: 'Parking Permit',
  vendor: 'Vendor Permit',
  mobile_food: 'Mobile Food Unit',
  other: 'Other',
}
