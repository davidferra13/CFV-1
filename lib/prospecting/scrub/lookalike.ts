'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { MAX_PROSPECTS_PER_SCRUB, MAX_WEB_ENRICHMENTS, sleep } from './constants'
import { filterNewProspects, mapExistingProspects } from './deduplicate'
import { generateLookalikeProspects } from './ingest'
import { buildLookalikeInsertRows } from './insert-rows'
import { updateProgress } from './progress'
import { reEnrichProspectForTenant } from './re-enrich-flow'
import { validateProspects } from './validate'

export async function lookalikeProspect(sourceProspectId: string) {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: source, error } = await db
    .from('prospects')
    .select('*')
    .eq('id', sourceProspectId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !source) {
    throw new Error('Source prospect not found')
  }

  const { data: session, error: sessionError } = await db
    .from('prospect_scrub_sessions')
    .insert({
      chef_id: user.tenantId!,
      query: `Lookalike: find more like "${source.name}"`,
      status: 'running',
      progress_message: `Finding prospects similar to ${source.name}...`,
    })
    .select()
    .single()

  if (sessionError || !session) {
    throw new Error('Failed to create scrub session')
  }

  let insertedCount = 0

  try {
    await updateProgress(db, session.id, `AI is finding prospects similar to ${source.name}...`)

    let parsedResult: Awaited<ReturnType<typeof generateLookalikeProspects>>
    try {
      parsedResult = await generateLookalikeProspects(source)
    } catch {
      await db
        .from('prospect_scrub_sessions')
        .update({
          status: 'failed',
          error_message: 'AI failed to generate lookalike prospects',
          progress_message: 'Failed: AI did not return valid data',
        })
        .eq('id', session.id)
      throw new Error('AI failed to generate lookalike prospects. Try again.')
    }

    const prospects = parsedResult.prospects.slice(0, MAX_PROSPECTS_PER_SCRUB)

    if (prospects.length === 0) {
      await db
        .from('prospect_scrub_sessions')
        .update({
          status: 'completed',
          prospect_count: 0,
          progress_message: 'No lookalike prospects generated.',
        })
        .eq('id', session.id)
      return {
        success: true,
        sessionId: session.id,
        totalGenerated: 0,
        duplicatesSkipped: 0,
        enriched: 0,
      }
    }

    await updateProgress(db, session.id, `Validating ${prospects.length} lookalike prospects...`)
    const validatedProspects = await validateProspects(prospects, null)

    await updateProgress(db, session.id, 'Deduplicating lookalike prospects...')

    const { data: existing } = await db
      .from('prospects')
      .select('name, city')
      .eq('chef_id', user.tenantId!)

    const existingList = mapExistingProspects(existing)
    const newProspects = filterNewProspects(validatedProspects, existingList)
    const insertRows = buildLookalikeInsertRows(
      newProspects,
      user.tenantId!,
      session.id,
      sourceProspectId
    )

    if (insertRows.length > 0) {
      const { error: insertError } = await db.from('prospects').insert(insertRows)
      if (insertError) {
        console.error('[lookalike] Insert error:', insertError)
      }
    }

    insertedCount = insertRows.length

    await updateProgress(
      db,
      session.id,
      `Inserted ${insertedCount} lookalikes. Enriching top prospects...`
    )

    const { data: insertedProspects } = await db
      .from('prospects')
      .select('id')
      .eq('scrub_session_id', session.id)

    let enrichedCount = 0
    for (const prospect of (insertedProspects ?? []).slice(0, MAX_WEB_ENRICHMENTS)) {
      try {
        await reEnrichProspectForTenant(db, user.tenantId!, prospect.id)
        enrichedCount++
      } catch (err) {
        console.warn(`[lookalike] Enrich failed for ${prospect.id}:`, err)
      }
      await sleep(2_000)
    }

    await db
      .from('prospect_scrub_sessions')
      .update({
        status: 'completed',
        prospect_count: insertedCount,
        enriched_count: enrichedCount,
        progress_message: `Done! ${insertedCount} lookalike prospects found, ${enrichedCount} enriched.`,
      })
      .eq('id', session.id)

    revalidatePath('/prospecting')
    return {
      success: true,
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
          progress_message: `Completed with warnings. ${insertedCount} lookalike prospects.`,
        })
        .eq('id', session.id)

      revalidatePath('/prospecting')
      return {
        success: true,
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

    throw err
  }
}
