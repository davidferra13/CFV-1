export type ColorRole =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'surface'

export interface ColorToken {
  id: string
  tenantId: string
  role: ColorRole
  name: string
  lightValue: string
  darkValue: string
  contrastRatio?: number | null
  usage?: string | null
  createdAt: Date
}

export interface ColorViolation {
  id: string
  tenantId: string
  route: string
  component?: string | null
  violationType: string
  rawColor: string
  suggestedToken?: string | null
  severity: string
  resolved?: boolean
  detectedAt: Date
}

export interface ColorSemanticsSummary {
  totalTokens: number
  byRole: Record<string, number>
  totalViolations: number
  topViolatingRoutes: Array<{ route: string; count: number }>
}
