export const SYSTEM_SURFACES = ['public', 'chef', 'client', 'admin', 'partner'] as const

export type Surface = (typeof SYSTEM_SURFACES)[number]

export const SYSTEM_ROLES = ['chef', 'staff', 'client', 'partner', 'admin'] as const

export type Role = (typeof SYSTEM_ROLES)[number]

export const FEATURE_EXPOSURES = ['visible', 'hidden', 'gated', 'internal'] as const

export type Exposure = (typeof FEATURE_EXPOSURES)[number]

/** @deprecated Use Exposure instead */
export type FeatureExposure = Exposure

export type FeaturePlacement = {
  featureId: string
  currentSurface?: Surface
  correctSurface: Surface
  roles: Role[]
  exposure: Exposure
  notes?: string
}

export type FeatureClassificationSignals = {
  route?: string
  routeGroup?: string
  authGuards?: string[]
  componentShells?: string[]
  dataOwners?: string[]
  tokenized?: boolean
  publicAccess?: boolean
  crossTenant?: boolean
  previewMode?: boolean
  navigable?: boolean
}

export const FEATURE_MISALIGNMENT_REASONS = [
  'surface_mismatch',
  'role_mismatch',
  'admin_leak',
  'public_overflow',
  'duplicate_surface_logic',
  'feature_should_split',
] as const

export type FeatureMisalignmentReason = (typeof FEATURE_MISALIGNMENT_REASONS)[number]
