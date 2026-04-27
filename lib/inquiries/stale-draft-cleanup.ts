'use server'

import { createServerClient } from '@/lib/db/server'

const STALE_THRESHOLD_DAYS = 3
const BATCH_LIMIT = 100

/**
 * Delete outbound draft messages older than 3 days.
 * The proactive-draft engine will regenerate fresh ones on its next run,
 * so this action only needs to clean up stale drafts.
 */
export async function cleanupStaleDrafts(): Promise<{
  deleted: number
  errors: number
}> {
  const db = createServerClient({ admin: true })

  const threshold = new Date()
  threshold.setDate(threshold.getDate() - STALE_THRESHOLD_DAYS)

  const { data: staleDrafts, error: queryError } = await db
    .from('messages')
    .select('id, inquiry_id')
    .eq('status', 'draft')
    .eq('direction', 'outbound')
    .lte('created_at', threshold.toISOString())
    .limit(BATCH_LIMIT)

  if (queryError) {
    console.error('[stale-draft-cleanup] Query failed:', queryError)
    throw new Error('Failed to query stale drafts')
  }

  if (!staleDrafts || staleDrafts.length === 0) {
    return { deleted: 0, errors: 0 }
  }

  let deleted = 0
  let errors = 0

  for (const draft of staleDrafts) {
    try {
      const { error } = await db.from('messages').delete().eq('id', draft.id)

      if (error) {
        console.error(`[stale-draft-cleanup] Failed to delete draft ${draft.id}:`, error)
        errors++
      } else {
        deleted++
      }
    } catch (err) {
      console.error(`[stale-draft-cleanup] Exception deleting draft ${draft.id}:`, err)
      errors++
    }
  }

  console.log(
    `[stale-draft-cleanup] Processed ${staleDrafts.length} stale drafts: ${deleted} deleted, ${errors} errors`
  )

  return { deleted, errors }
}
