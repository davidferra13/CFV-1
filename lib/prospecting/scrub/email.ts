import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { COLD_EMAIL_SYSTEM_PROMPT, buildColdEmailPrompt } from '../scrub-prompt'
import {
  APPROACH_COOLDOWN_MS,
  MAX_CONSECUTIVE_FAILURES,
  MAX_EMAIL_DRAFTS,
  PHASE_4_TIMEOUT_MS,
  sleep,
} from './constants'
import { buildEnrichedLines } from './enrich'
import { updateProgress } from './progress'
import { ColdEmailFromAI } from './schemas'

export async function draftColdEmails(db: any, sessionId: string, prospects: any[]) {
  await updateProgress(db, sessionId, 'Drafting personalized outreach emails...')

  const emailSlice = prospects.slice(0, MAX_EMAIL_DRAFTS)
  let emailConsecutiveFailures = 0
  const emailStart = Date.now()

  for (let i = 0; i < emailSlice.length; i++) {
    if (Date.now() - emailStart > PHASE_4_TIMEOUT_MS) {
      console.warn('[scrub-email] Hit phase time limit, skipping remaining email drafts')
      break
    }
    if (emailConsecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(`[scrub-email] ${emailConsecutiveFailures} consecutive failures, stopping`)
      break
    }

    const prospect = emailSlice[i]
    await updateProgress(
      db,
      sessionId,
      `Drafting email ${i + 1}/${emailSlice.length}: ${prospect.name}...`
    )

    try {
      if (i > 0) await sleep(APPROACH_COOLDOWN_MS)

      const { data: fullProspect } = await db
        .from('prospects')
        .select('*')
        .eq('id', prospect.id)
        .single()

      if (!fullProspect) continue

      const enrichedLines = buildEnrichedLines(fullProspect)
      const emailResult = await parseWithOllama(
        COLD_EMAIL_SYSTEM_PROMPT,
        buildColdEmailPrompt({
          name: fullProspect.name,
          category: fullProspect.category,
          prospectType: fullProspect.prospect_type,
          description: fullProspect.description,
          city: fullProspect.city,
          state: fullProspect.state,
          contactPerson: fullProspect.contact_person,
          contactTitle: fullProspect.contact_title,
          eventTypesHosted: fullProspect.event_types_hosted,
          luxuryIndicators: fullProspect.luxury_indicators,
          talkingPoints: fullProspect.talking_points,
          approachStrategy: fullProspect.approach_strategy,
          newsIntel: fullProspect.news_intel,
          enrichedDetails: enrichedLines.length > 0 ? enrichedLines.join('\n') : null,
        }),
        ColdEmailFromAI,
        { modelTier: 'fast', timeoutMs: 45_000 }
      )

      const draftEmail = `Subject: ${emailResult.subject}\n\n${emailResult.body}`
      await db.from('prospects').update({ draft_email: draftEmail }).eq('id', prospect.id)

      emailConsecutiveFailures = 0
    } catch (err) {
      emailConsecutiveFailures++
      console.warn(
        `[scrub-email] Failed for ${prospect.name} (${emailConsecutiveFailures} consecutive):`,
        err
      )
    }
  }
}
