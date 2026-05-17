export type ThemeMode = 'light' | 'dark' | 'system'

export type ThemeTokenCategory =
  | 'color'
  | 'spacing'
  | 'typography'
  | 'shadow'
  | 'border'
  | 'animation'

export type ThemeConsistencyIssueType =
  | 'missing-dark'
  | 'missing-light'
  | 'contrast-fail'
  | 'orphaned'
  | 'override-conflict'

export type ThemeConsistencyIssueSeverity = 'error' | 'warning' | 'info'

export type ThemeToken = {
  id: string
  tenantId: string
  tokenName: string
  category: ThemeTokenCategory
  lightValue: string
  darkValue: string | null
  description: string | null
  inheritsFrom: string | null
  createdAt: Date
  updatedAt: Date
}

export type ThemeConsistencyIssue = {
  id: string
  tenantId: string
  tokenName: string
  mode: ThemeMode
  issue: ThemeConsistencyIssueType
  severity: ThemeConsistencyIssueSeverity
  route: string | null
  resolvedAt: Date | null
  createdAt: Date
}

export type ThemeTokenSummary = {
  totalTokens: number
  totalIssues: number
  unresolvedIssues: number
  categoryDistribution: Record<ThemeTokenCategory, number>
  consistencyScore: number
}
