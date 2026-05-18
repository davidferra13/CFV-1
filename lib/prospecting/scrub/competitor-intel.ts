'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { searchWeb, readWebPage } from '@/lib/ai/remy-web-actions'
import { revalidatePath } from 'next/cache'
import { MAX_PROSPECTS_PER_SCRUB, MAX_WEB_ENRICHMENTS, sleep } from './constants'
import { filterNewProspects, mapExistingProspects } from './deduplicate'
import { extractProspectsFromCompetitorPage } from './ingest'
import { buildCompetitorInsertRows } from './insert-rows'
import { updateProgress } from './progress'
import { reEnrichProspectForTenant } from './re-enrich-flow'
import type { ProspectFromAIValue } from './schemas'

export async function competitorIntelScrub(region: string) {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  if (!region.trim()) throw new Error('Region is required for competitor intelligence scrub')

  const { data: session, error: sessionError } = await db
    .from('prospect_scrub_sessions')
    .insert({
      chef_id: user.tenantId!,
      query: `Competitor intel: ${region.trim()}`,
      status: 'running',
      progress_message: 'Searching for competing chefs in the area...',
    })
    .select()
    .single()

  if (sessionError || !session) {
    throw new Error('Failed to create scrub session')
  }

  let insertedCount = 0

  try {
    await updateProgress(db, session.id, 'Finding competing chefs and caterers...')

    const searchQueries = [
      `private chef ${region} testimonials portfolio`,
      `luxury caterer ${region} clients events`,
      `personal chef ${region} reviews past events`,
    ]

    const competitorPages: Array<{ name: string; url: string; content: string }> = []

    for (const sq of searchQueries) {
      if (competitorPages.length >= 5) break
      try {
        const results = await searchWeb(sq, 3)
        for (const result of results) {
          if (competitorPages.length >= 5) break
          if (!result.url) continue
          try {
            const page = await readWebPage(result.url)
            if (page.content && page.content.length > 200) {
              competitorPages.push({
                name: result.title || result.url,
                url: result.url,
                content: page.content,
              })
            }
          } catch {
            // Skip pages that fail.
          }
        }
      } catch {
        // Skip failed searches.
      }
    }

    if (competitorPages.length === 0) {
      await db
        .from('prospect_scrub_sessions')
        .update({
          status: 'failed',
          error_message: 'No competitor websites found',
          progress_message: 'Failed: no competitor sites found',
        })
        .eq('id', session.id)
      throw new Error(
        'Could not find any competitor websites in that region. Try a different region.'
      )
    }

    await updateProgress(
      db,
      session.id,
      `Analyzing ${competitorPages.length} competitor websites for client intel...`
    )

    const allExtractedProspects: ProspectFromAIValue[] = []

    for (const competitor of competitorPages) {
      try {
        const result = await extractProspectsFromCompetitorPage({
          competitorName: competitor.name,
          websiteContent: competitor.content,
          region,
        })

        for (const p of result.prospects) {
          allExtractedProspects.push(p)
        }
      } catch (err) {
        console.warn(`[competitor-intel] Failed to parse ${competitor.name}:`, err)
      }
    }

    if (allExtractedProspects.length === 0) {
      await db
        .from('prospect_scrub_sessions')
        .update({
          status: 'completed',
          prospect_count: 0,
          progress_message: 'No venue/client names found on competitor websites.',
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

    await updateProgress(db, session.id, 'Deduplicating extracted prospects...')

    const { data: existing } = await db
      .from('prospects')
      .select('name, city')
      .eq('chef_id', user.tenantId!)

    const existingList = mapExistingProspects(existing)
    const newProspects = filterNewProspects(
      allExtractedProspects.slice(0, MAX_PROSPECTS_PER_SCRUB),
      existingList
    )

    const insertRows = buildCompetitorInsertRows(newProspects, user.tenantId!, session.id)

    if (insertRows.length > 0) {
      const { error: insertError } = await db.from('prospects').insert(insertRows)
      if (insertError) {
        console.error('[competitor-intel] Insert error:', insertError)
      }
    }

    insertedCount = insertRows.length

    await updateProgress(
      db,
      session.id,
      `Inserted ${insertedCount} prospects from competitor intel. Enriching...`
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
        console.warn(`[competitor-intel] Enrich failed for ${prospect.id}:`, err)
      }
      await sleep(2_000)
    }

    await db
      .from('prospect_scrub_sessions')
      .update({
        status: 'completed',
        prospect_count: insertedCount,
        enriched_count: enrichedCount,
        progress_message: `Done! ${insertedCount} prospects from competitor intel, ${enrichedCount} enriched.`,
      })
      .eq('id', session.id)

    revalidatePath('/prospecting')
    return {
      success: true,
      sessionId: session.id,
      totalGenerated: insertedCount,
      duplicatesSkipped: allExtractedProspects.length - insertedCount,
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
          progress_message: `Completed with warnings. ${insertedCount} prospects from competitor intel.`,
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
