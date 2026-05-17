/**
 * Scan-Understand-Act Visual Heuristic Gate (UI System #31)
 * Types for evaluating UI routes against heuristic phases.
 */

export type HeuristicPhase = 'scan' | 'understand' | 'act'

export type HeuristicSeverity = 'critical' | 'warning' | 'info'

export interface HeuristicRule {
  id: string
  name: string
  phase: HeuristicPhase
  description: string
  severity: HeuristicSeverity
  checkFn?: (route: string) => boolean | Promise<boolean>
}

export interface HeuristicEvaluation {
  id: string
  tenantId: string
  route: string
  phase: HeuristicPhase
  ruleName: string
  passed: boolean
  details: string | null
  evaluatedAt: string
}

export interface HeuristicGateResult {
  route: string
  scanScore: number
  understandScore: number
  actScore: number
  overallScore: number
  passed: boolean
  failedRules: HeuristicEvaluation[]
  evaluatedAt: string
}

export interface HeuristicSummary {
  totalRoutes: number
  evaluated: number
  passing: number
  failing: number
  avgScore: number
  worstRoutes: HeuristicGateResult[]
}
