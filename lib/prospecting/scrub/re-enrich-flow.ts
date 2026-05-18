import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { revalidatePath } from 'next/cache'
import {
  APPROACH_SYSTEM_PROMPT,
  buildApproachUserPrompt,
  COLD_EMAIL_SYSTEM_PROMPT,
  buildColdEmailPrompt,
} from '../scrub-prompt'
import { APPROACH_COOLDOWN_MS, sleep } from './constants'
import { buildEnrichedLines, collectWebEnrichmentUpdates, computeEnrichedLeadScore } from './enrich'
import { ApproachFromAI, ColdEmailFromAI } from './schemas'

export async function reEnrichProspectForTenant(db: any, tenantId: string, prospectId: string) {
  const { data: prospect, error } = await db
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('chef_id', tenantId)
    .single()

  if (error || !prospect) {
    throw new Error('Prospect not found')
  }

  const enrichUpdates = await collectWebEnrichmentUpdates(prospect, {
    markVerified: true,
    logPrefix: '[re-enrich]',
  })

  const enrichedLines = buildEnrichedLines(prospect, enrichUpdates, {
    includeDirect: true,
    includeSocial: true,
  })
  const enrichedDetailsStr = enrichedLines.length > 0 ? enrichedLines.join('\n') : null
  const currentNewsIntel = (enrichUpdates.news_intel as string) ?? prospect.news_intel

  try {
    const approachResult = await parseWithOllama(
      APPROACH_SYSTEM_PROMPT,
      buildApproachUserPrompt({
        name: prospect.name,
        category: prospect.category,
        description: prospect.description,
        city: prospect.city,
        state: prospect.state,
        annualEventsEstimate: prospect.annual_events_estimate,
        avgEventBudget: prospect.avg_event_budget,
        eventTypesHosted: prospect.event_types_hosted,
        competitorsPresent: prospect.competitors_present,
        luxuryIndicators: prospect.luxury_indicators,
        enrichedDetails: enrichedDetailsStr,
        newsIntel: currentNewsIntel,
      }),
      ApproachFromAI,
      { modelTier: 'fast', timeoutMs: 45_000 }
    )

    enrichUpdates.talking_points = approachResult.talkingPoints
    enrichUpdates.approach_strategy = approachResult.approachStrategy
  } catch (err) {
    console.warn(`[re-enrich] Approach generation failed for ${prospect.name}:`, err)
  }

  try {
    await sleep(APPROACH_COOLDOWN_MS)
    const emailResult = await parseWithOllama(
      COLD_EMAIL_SYSTEM_PROMPT,
      buildColdEmailPrompt({
        name: prospect.name,
        category: prospect.category,
        prospectType: prospect.prospect_type,
        description: prospect.description,
        city: prospect.city,
        state: prospect.state,
        contactPerson: prospect.contact_person,
        contactTitle: prospect.contact_title,
        eventTypesHosted: prospect.event_types_hosted,
        luxuryIndicators: prospect.luxury_indicators,
        talkingPoints: (enrichUpdates.talking_points as string) ?? prospect.talking_points,
        approachStrategy: (enrichUpdates.approach_strategy as string) ?? prospect.approach_strategy,
        newsIntel: currentNewsIntel,
        enrichedDetails: enrichedDetailsStr,
      }),
      ColdEmailFromAI,
      { modelTier: 'fast', timeoutMs: 45_000 }
    )
    enrichUpdates.draft_email = `Subject: ${emailResult.subject}\n\n${emailResult.body}`
  } catch (err) {
    console.warn(`[re-enrich] Email draft failed for ${prospect.name}:`, err)
  }

  enrichUpdates.lead_score = computeEnrichedLeadScore(prospect, enrichUpdates)
  enrichUpdates.source = 'web_enriched'
  enrichUpdates.last_enriched_at = new Date().toISOString()
  await db.from('prospects').update(enrichUpdates).eq('id', prospect.id)

  revalidatePath('/prospecting')
  return { success: true }
}
