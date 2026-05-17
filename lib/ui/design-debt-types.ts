export type DebtSeverity = 'critical' | 'major' | 'minor' | 'cosmetic'

export type DebtCategory =
  | 'spacing'
  | 'typography'
  | 'color'
  | 'layout'
  | 'interaction'
  | 'accessibility'
  | 'consistency'
  | 'responsiveness'

export type DebtStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix'

export interface DesignDebtItem {
  id: string
  tenantId: string
  route: string
  component?: string | null
  category: DebtCategory
  severity: DebtSeverity
  description: string
  screenshotPath?: string | null
  assignedTo?: string | null
  status: DebtStatus
  createdAt: string
  resolvedAt?: string | null
}

export interface DesignDebtSummary {
  totalItems: number
  bySeverity: Record<DebtSeverity, number>
  byCategory: Record<DebtCategory, number>
  byStatus: Record<DebtStatus, number>
  topRoutes: Array<{ route: string; count: number }>
  resolvedThisWeek: number
  avgResolutionDays: number | null
}
