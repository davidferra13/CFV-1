import { searchWeb } from '@/lib/ai/remy-web-actions'
import { PHASE_VALIDATE_TIMEOUT_MS } from './constants'
import type { ProspectFromAIValue, ValidatedProspect } from './schemas'

export async function validateProspects(
  prospects: ProspectFromAIValue[],
  timeoutMs: number | null = PHASE_VALIDATE_TIMEOUT_MS,
  warningPrefix = '[scrub-validate]'
): Promise<ValidatedProspect[]> {
  const validateStart = Date.now()
  const validatedProspects: ValidatedProspect[] = []

  for (const prospect of prospects) {
    if (timeoutMs !== null && Date.now() - validateStart > timeoutMs) {
      const remaining = prospects.slice(validatedProspects.length)
      for (const p of remaining) {
        validatedProspects.push({ ...p, verified: false })
      }
      console.warn(
        `${warningPrefix} Hit time limit, ${remaining.length} prospects accepted unverified`
      )
      break
    }

    try {
      const searchQuery = `"${prospect.name}" ${prospect.city ?? ''} ${prospect.state ?? ''}`
      const results = await searchWeb(searchQuery, 2)
      validatedProspects.push({ ...prospect, verified: results.length > 0 })
    } catch {
      validatedProspects.push({ ...prospect, verified: false })
    }
  }

  return validatedProspects
}
