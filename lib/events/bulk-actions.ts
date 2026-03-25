'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

/**
 * Bulk archive events - sets `archived = true` for the given event IDs.
 * Only affects events owned by the authenticated chef's tenant.
 */
export async function bulkArchiveEvents(ids: string[]) {
  if (ids.length === 0) return { success: true, count: 0 }

  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('events')
    .update({ archived: true })
    .in('id', ids)
    .eq('tenant_id', user.tenantId!)
    .select('id')

  if (error) {
    throw new Error(`Failed to archive events: ${error.message}`)
  }

  revalidatePath('/events')
  return { success: true, count: data?.length ?? 0 }
}

/**
 * Bulk delete draft events - soft-deletes events that are in 'draft' status.
 * Events in any other status are skipped (not deleted).
 * Only affects events owned by the authenticated chef's tenant.
 */
export async function bulkDeleteDraftEvents(ids: string[]) {
  if (ids.length === 0) return { success: true, count: 0 }

  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('events')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .in('id', ids)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'draft')
    .select('id')

  if (error) {
    throw new Error(`Failed to delete draft events: ${error.message}`)
  }

  revalidatePath('/events')
  return { success: true, count: data?.length ?? 0 }
}
