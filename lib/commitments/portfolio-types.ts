/**
 * Commitment Portfolios: preset bundles of commitments
 * that a chef can activate based on their current business phase.
 */

export type PortfolioType = 'quality-first' | 'growth' | 'sustainability' | 'recovery'

export interface PortfolioDefinition {
  type: PortfolioType
  name: string
  description: string
  commitments: PortfolioCommitment[]
  /** Months (1-12) when this portfolio is seasonally recommended */
  seasonal_months: number[]
}

export interface PortfolioCommitment {
  label: string
  category: string
  threshold: number
  unit: string
}

export interface CommitmentPortfolio {
  id: string
  tenant_id: string
  portfolio_type: PortfolioType
  customizations: Record<string, unknown> | null
  activated_at: string
}
