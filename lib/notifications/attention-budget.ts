import type { EvaluatedChefSignal } from './noise-simulator'

export type AttentionBudgetConfig = {
  maxAdminPushesPerDay: number
  maxGrowthPushesPerDay: number
  maxReviewPushesPerDay: number
}

export type AttentionBudgetDecision =
  | 'allow'
  | 'force_digest'
  | 'allow_unlimited'
  | 'suppress_non_actionable'

export type AttentionBudgetResult = {
  signalId: string
  decision: AttentionBudgetDecision
  reason: string
}

export type AttentionBudgetSummary = {
  allowed: number
  forcedDigest: number
  suppressed: number
  unlimited: number
  results: AttentionBudgetResult[]
}

export const DEFAULT_ATTENTION_BUDGET: AttentionBudgetConfig = {
  maxAdminPushesPerDay: 3,
  maxGrowthPushesPerDay: 5,
  maxReviewPushesPerDay: 2,
}

function isUnlimited(signal: EvaluatedChefSignal): boolean {
  return (
    signal.risk === 'safety' ||
    signal.risk === 'money' ||
    signal.decision === 'escalate' ||
    signal.action === 'account_access_alert'
  )
}

function budgetKey(signal: EvaluatedChefSignal): keyof AttentionBudgetConfig | null {
  if (signal.risk === 'admin' || signal.risk === 'system') return 'maxAdminPushesPerDay'
  if (signal.risk === 'growth' || signal.risk === 'relationship') return 'maxGrowthPushesPerDay'
  if (signal.decision === 'batch' || signal.attention === 'review') return 'maxReviewPushesPerDay'
  return null
}

export function applyAttentionBudget(
  signals: EvaluatedChefSignal[],
  config: AttentionBudgetConfig = DEFAULT_ATTENTION_BUDGET
): AttentionBudgetSummary {
  const counts: Record<keyof AttentionBudgetConfig, number> = {
    maxAdminPushesPerDay: 0,
    maxGrowthPushesPerDay: 0,
    maxReviewPushesPerDay: 0,
  }

  const results = signals.map((signal): AttentionBudgetResult => {
    if (signal.decision === 'suppress') {
      return {
        signalId: signal.id,
        decision: 'suppress_non_actionable',
        reason: 'Signal was already suppressed before attention budgeting.',
      }
    }

    if (isUnlimited(signal)) {
      return {
        signalId: signal.id,
        decision: 'allow_unlimited',
        reason:
          'Safety, money, escalation, and account security signals bypass the attention budget.',
      }
    }

    const key = budgetKey(signal)
    if (!key) {
      return {
        signalId: signal.id,
        decision: 'allow',
        reason: 'Signal does not count against a limited attention bucket.',
      }
    }

    counts[key] += signal.channels.push ? 1 : 0
    if (counts[key] > config[key]) {
      return {
        signalId: signal.id,
        decision: 'force_digest',
        reason: `Daily ${key} limit reached; signal should move to digest.`,
      }
    }

    return {
      signalId: signal.id,
      decision: 'allow',
      reason: `Signal is within the daily ${key} limit.`,
    }
  })

  return {
    allowed: results.filter((result) => result.decision === 'allow').length,
    forcedDigest: results.filter((result) => result.decision === 'force_digest').length,
    suppressed: results.filter((result) => result.decision === 'suppress_non_actionable').length,
    unlimited: results.filter((result) => result.decision === 'allow_unlimited').length,
    results,
  }
}
