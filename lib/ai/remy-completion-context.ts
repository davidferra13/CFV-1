import type { PageEntityContext } from '@/lib/ai/remy-types'
import type { CompletionResult } from '@/lib/completion/types'

export function buildPageCompletionContext(
  result: CompletionResult | null | undefined
): PageEntityContext['completion'] | undefined {
  if (!result) return undefined

  const mapRequirement = (requirement: CompletionResult['missingRequirements'][number]) => ({
    key: requirement.key,
    label: requirement.label,
    category: requirement.category,
    actionUrl: requirement.actionUrl,
    actionLabel: requirement.actionLabel,
  })

  return {
    status: result.status,
    score: result.score,
    missingRequirements: result.missingRequirements.slice(0, 8).map(mapRequirement),
    blockingRequirements: result.blockingRequirements.slice(0, 8).map(mapRequirement),
    nextAction: result.nextAction,
  }
}
