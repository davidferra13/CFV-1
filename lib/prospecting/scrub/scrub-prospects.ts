'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { generateApproachStrategies } from './approach'
import { MAX_PROSPECTS_PER_SCRUB, MAX_WEB_ENRICHMENTS, PHASE_2_TIMEOUT_MS } from './constants'
import { filterNewProspects, mapExistingProspects } from './deduplicate'
import { draftColdEmails } from './email'
import { collectWebEnrichmentUpdates, computeEnrichedLeadScore } from './enrich'
import { generateScrubProspects } from './ingest'
import { buildAiScrubInsertRows } from './insert-rows'
import { updateProgress } from './progress'
import { validateProspects } from './validate'

export async function scrubProspects(query: string) {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  if (!query.trim()) throw new Error('Query is required')

  const { data: activeSessions } = await db
    .from('prospect_scrub_sessions')
    .select('id, status')
    .eq('chef_id', user.tenantId!)
    .in('status', ['running', 'enriching'])

  if (activeSessions && activeSessions.length > 0) {
    throw new Error('A scrub is already in progress. Please wait for it to finish.')
  }

  const { data: session, error: sessionError } = await db
    .from('prospect_scrub_sessions')
    .insert({
      chef_id: user.tenantId!,
      query: query.trim(),
      status: 'running',
      progress_message: 'Starting AI generation...',
    })
    .select()
    .single()

  if (sessionError || !session) {
    console.error('[scrubProspects] Session creation failed:', sessionError)
    throw new Error('Failed to create scrub session')
  }

  let insertedCount = 0

  try {
    await updateProgress(db, session.id, 'Phase 1: AI is generating prospects...')

    let parsedResult: Awaited<ReturnType<typeof generateScrubProspects>>
    try {
      parsedResult = await generateScrubProspects(query)
    } catch {
      await db
        .from('prospect_scrub_sessions')
        .update({
          status: 'failed',
          error_message: 'AI returned invalid response',
          progress_message: 'Failed: AI did not return valid data',
        })
        .eq('id', session.id)
      throw new Error('AI returned invalid response. Please try again.')
    }

    const prospects = parsedResult.prospects.slice(0, MAX_PROSPECTS_PER_SCRUB)

    if (prospects.length === 0) {
      await db
        .from('prospect_scrub_sessions')
        .update({
          status: 'failed',
          error_message: 'No valid prospects generated',
          progress_message: 'Failed: no prospects generated',
        })
        .eq('id', session.id)
      throw new Error('AI did not generate any valid prospects. Try a different query.')
    }

    await updateProgress(
      db,
      session.id,
      `Validating ${prospects.length} prospects against the web...`
    )
    const validatedProspects = await validateProspects(prospects)

    await updateProgress(db, session.id, 'Deduplicating against existing prospects...')

    const { data: existing } = await db
      .from('prospects')
      .select('name, city')
      .eq('chef_id', user.tenantId!)

    const existingList = mapExistingProspects(existing)
    const newProspects = filterNewProspects(validatedProspects, existingList)
    const insertRows = buildAiScrubInsertRows(newProspects, user.tenantId!, session.id)

    if (insertRows.length > 0) {
      const { error: insertError } = await db.from('prospects').insert(insertRows)
      if (insertError) {
        console.error('[scrubProspects] Insert error:', insertError)
      }
    }

    insertedCount = insertRows.length

    await updateProgress(
      db,
      session.id,
      `Generated ${insertRows.length} prospects. Starting enrichment...`,
      {
        prospect_count: insertRows.length,
        status: 'enriching',
      }
    )

    const { data: insertedProspects } = await db
      .from('prospects')
      .select('id, name, city, state, region')
      .eq('scrub_session_id', session.id)

    let enrichedCount = 0
    const enrichSlice = (insertedProspects ?? []).slice(0, MAX_WEB_ENRICHMENTS)
    const enrichStart = Date.now()

    for (let i = 0; i < enrichSlice.length; i++) {
      if (Date.now() - enrichStart > PHASE_2_TIMEOUT_MS) {
        console.warn('[scrub-enrich] Hit phase time limit, skipping remaining enrichments')
        break
      }

      const prospect = enrichSlice[i]
      await updateProgress(
        db,
        session.id,
        `Deep-enriching ${i + 1}/${enrichSlice.length}: ${prospect.name}...`
      )

      try {
        const enrichUpdates = await collectWebEnrichmentUpdates(prospect, {
          logPrefix: '[scrub-enrich]',
          throwOnSearchFailure: true,
          beforeNews: () => updateProgress(db, session.id, `Gathering news on ${prospect.name}...`),
        })

        if (Object.keys(enrichUpdates).length > 0) {
          enrichUpdates.source = 'web_enriched'
          enrichUpdates.last_enriched_at = new Date().toISOString()

          const { data: currentProspect } = await db
            .from('prospects')
            .select('*')
            .eq('id', prospect.id)
            .single()

          if (currentProspect) {
            enrichUpdates.lead_score = computeEnrichedLeadScore(currentProspect, enrichUpdates)
          }

          await db.from('prospects').update(enrichUpdates).eq('id', prospect.id)
          enrichedCount++
        }
      } catch (err) {
        console.warn(`[scrub-enrich] Failed for ${prospect.name}:`, err)
      }
    }

    await updateProgress(
      db,
      session.id,
      `Enriched ${enrichedCount}. Generating approach strategies...`
    )
    await generateApproachStrategies(db, session.id, insertedProspects ?? [])
    await draftColdEmails(db, session.id, insertedProspects ?? [])

    await db
      .from('prospect_scrub_sessions')
      .update({
        status: 'completed',
        enriched_count: enrichedCount,
        progress_message: `Done! ${insertedCount} prospects, ${enrichedCount} enriched.`,
      })
      .eq('id', session.id)

    revalidatePath('/prospecting')
    revalidatePath('/prospecting/scrub')

    return {
      success: true as const,
      sessionId: session.id,
      totalGenerated: insertedCount,
      duplicatesSkipped: prospects.length - insertedCount,
      enriched: enrichedCount,
    }
  } catch (err) {
    if (insertedCount > 0) {
      await db
        .from('prospect_scrub_sessions')
        .update({
          status: 'completed',
          prospect_count: insertedCount,
          error_message: `Partial: ${err instanceof Error ? err.message : String(err)}`,
          progress_message: `Completed with warnings. ${insertedCount} prospects saved.`,
        })
        .eq('id', session.id)
        .then(() => {})

      revalidatePath('/prospecting')
      revalidatePath('/prospecting/scrub')

      return {
        success: true as const,
        sessionId: session.id,
        totalGenerated: insertedCount,
        duplicatesSkipped: 0,
        enriched: 0,
      }
    }

    await db
      .from('prospect_scrub_sessions')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
        progress_message: 'Failed: ' + (err instanceof Error ? err.message : String(err)),
      })
      .eq('id', session.id)
      .then(() => {})

    throw err
  }
}
