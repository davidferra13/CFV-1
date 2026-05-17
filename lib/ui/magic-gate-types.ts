export type MagicDimension =
  | 'clarity'
  | 'hierarchy'
  | 'density'
  | 'contrast'
  | 'alignment'
  | 'whitespace'
  | 'rhythm'

export type MagicScore = {
  dimension: MagicDimension
  score: number
  maxScore: number
  notes?: string
}

export type MagicGateEvaluation = {
  id: string
  tenantId: string
  route: string
  scores: MagicScore[]
  overallScore: number
  passed: boolean
  evaluatedBy: string | null
  evaluatedAt: Date
}

export type MagicGateThreshold = {
  id: string
  tenantId: string
  dimension: MagicDimension
  minScore: number
  weight: number
  active: boolean
}

export type MagicGateSummary = {
  totalEvaluated: number
  passing: number
  failing: number
  avgScore: number
  worstDimension: MagicDimension | null
  bestDimension: MagicDimension | null
}
