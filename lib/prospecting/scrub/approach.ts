import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { APPROACH_SYSTEM_PROMPT, buildApproachUserPrompt } from '../scrub-prompt'
import {
  APPROACH_COOLDOWN_MS,
  MAX_APPROACH_CALLS,
  MAX_CONSECUTIVE_FAILURES,
  PHASE_3_TIMEOUT_MS,
  sleep,
} from './constants'
import { buildEnrichedLines } from './enrich'
import { updateProgress } from './progress'
import { ApproachFromAI } from './schemas'

export async function generateApproachStrategies(db: any, sessionId: string, prospects: any[]) {
  const approachSlice = prospects.slice(0, MAX_APPROACH_CALLS)
  let consecutiveFailures = 0
  const approachStart = Date.now()

  for (let i = 0; i < approachSlice.length; i++) {
    if (Date.now() - approachStart > PHASE_3_TIMEOUT_MS) {
      console.warn('[scrub-approach] Hit phase time limit, skipping remaining approach calls')
      break
    }
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(`[scrub-approach] ${consecutiveFailures} consecutive failures, stopping`)
      break
    }

    const prospect = approachSlice[i]
    await updateProgress(
      db,
      sessionId,
      `Strategy ${i + 1}/${approachSlice.length}: ${prospect.name}...`
    )

    try {
      if (i > 0) await sleep(APPROACH_COOLDOWN_MS)

      const { data: fullProspect } = await db
        .from('prospects')
        .select('*')
        .eq('id', prospect.id)
        .single()

      if (!fullProspect) continue

      const enrichedLines = buildEnrichedLines(fullProspect, undefined, {
        includeDirect: true,
        includeSocial: true,
        includeVerified: true,
      })

      const approachResult = await parseWithOllama(
        APPROACH_SYSTEM_PROMPT,
        buildApproachUserPrompt({
          name: fullProspect.name,
          category: fullProspect.category,
          description: fullProspect.description,
          city: fullProspect.city,
          state: fullProspect.state,
          annualEventsEstimate: fullProspect.annual_events_estimate,
          avgEventBudget: fullProspect.avg_event_budget,
          eventTypesHosted: fullProspect.event_types_hosted,
          competitorsPresent: fullProspect.competitors_present,
          luxuryIndicators: fullProspect.luxury_indicators,
          enrichedDetails: enrichedLines.length > 0 ? enrichedLines.join('\n') : null,
          newsIntel: fullProspect.news_intel,
        }),
        ApproachFromAI,
        { modelTier: 'fast', timeoutMs: 45_000 }
      )

      await db
        .from('prospects')
        .update({
          talking_points: approachResult.talkingPoints,
          approach_strategy: approachResult.approachStrategy,
        })
        .eq('id', prospect.id)

      consecutiveFailures = 0
    } catch (err) {
      consecutiveFailures++
      console.warn(
        `[scrub-approach] Failed for ${prospect.name} (${consecutiveFailures} consecutive):`,
        err
      )
    }
  }
}
