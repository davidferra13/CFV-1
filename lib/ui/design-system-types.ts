// Design System & Density Contract - Type Definitions

/** Display density mode for chef workspace */
export type DensityMode = 'compact' | 'comfortable' | 'spacious'

/** A single design token (color, spacing, radius, etc.) */
export type DesignToken = {
  name: string
  category: string
  value: string
  darkValue: string | null
  description: string
}

/** Pixel values for component size scale */
export type ComponentSizeScale = {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
}

/** Spacing scale definition */
export type SpacingScale = {
  unit: 'px' | 'rem'
  values: Record<string, number>
}

/** Typography token for consistent text styling */
export type TypographyToken = {
  name: string
  fontFamily: string
  fontSize: string
  fontWeight: number
  lineHeight: string
  letterSpacing: string
}

/** Semantic color token with contrast info */
export type ColorSemanticToken = {
  name: string
  role: string
  lightValue: string
  darkValue: string
  contrastRatio: number
}

/** Persisted density preference for a chef */
export type DensityPreference = {
  id: string
  tenantId: string
  chefId: string
  mode: DensityMode
  customOverrides: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/** Design audit entry for a route */
export type DesignSystemAuditEntry = {
  id: string
  tenantId: string
  route: string
  violations: Array<{ rule: string; element: string; detail: string }>
  score: number | null
  checkedAt: string
}

/** Summary stats for design system health */
export type DesignSystemSummary = {
  tokenCount: number
  avgAuditScore: number | null
  auditCount: number
  densityDistribution: Record<DensityMode, number>
}
