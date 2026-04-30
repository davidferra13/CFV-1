import type { LoopState, RiskEvent } from './types'

export type ActionAttempt = {
  actionKey: string
  status: 'success' | 'failed' | 'blocked'
  message?: string
}

export function evaluateLoopGuard(attempts: ActionAttempt[], threshold = 3): LoopState {
  const failureCounts = new Map<string, number>()

  for (const attempt of attempts) {
    if (attempt.status === 'success') {
      failureCounts.delete(attempt.actionKey)
      continue
    }

    const count = (failureCounts.get(attempt.actionKey) ?? 0) + 1
    failureCounts.set(attempt.actionKey, count)

    if (count >= threshold) {
      return {
        tripped: true,
        threshold,
        repeatedAction: attempt.actionKey,
        failureCount: count,
        message: `Loop guard tripped after ${count} repeated failed attempts for ${attempt.actionKey}.`,
      }
    }
  }

  const highest = Math.max(0, ...failureCounts.values())
  return {
    tripped: false,
    threshold,
    failureCount: highest,
  }
}

export function loopRiskEvent(runId: string, loopState: LoopState): RiskEvent | null {
  if (!loopState.tripped) return null

  return {
    runId,
    kind: 'loop',
    severity: 'high',
    details: loopState.message ?? 'Loop guard tripped.',
  }
}

