'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

/**
 * Bulk archive clients - soft-deletes clients by setting `deleted_at`.
 * Only affects clients owned by the authenticated chef's tenant.
 */
export async function bulkArchiveClients(ids: string[]) {
  if (ids.length === 0) return { success: true, count: 0 }

  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('clients')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .in('id', ids)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .select('id')

  if (error) {
    throw new Error(`Failed to archive clients: ${error.message}`)
  }

  revalidatePath('/clients')
  return { success: true, count: data?.length ?? 0 }
}

/**
 * Bulk add a tag to multiple clients.
 */
export async function bulkAddTag(ids: string[], tag: string) {
  if (ids.length === 0 || !tag.trim()) return { success: true, count: 0 }

  const user = await requireChef()
  const db: any = createServerClient()
  const normalizedTag = tag.trim().toLowerCase().slice(0, 50)

  const rows = ids.map((clientId) => ({
    client_id: clientId,
    tenant_id: user.tenantId!,
    tag: normalizedTag,
  }))

  const { error } = await db
    .from('client_tags' as any)
    .upsert(rows, { onConflict: 'client_id,tag' })

  if (error) {
    throw new Error(`Failed to tag clients: ${error.message}`)
  }

  revalidatePath('/clients')
  return { success: true, count: ids.length }
}

/**
 * Bulk update client status (active, dormant, repeat_ready, vip).
 */
export async function bulkUpdateStatus(ids: string[], status: string) {
  if (ids.length === 0) return { success: true, count: 0 }

  const validStatuses = ['active', 'dormant', 'repeat_ready', 'vip']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`)
  }

  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('clients')
    .update({ status } as any)
    .in('id', ids)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .select('id')

  if (error) {
    throw new Error(`Failed to update client status: ${error.message}`)
  }

  // Cancel follow-ups for clients moving to dormant
  if (status === 'dormant') {
    try {
      const { cancelFollowUpSends } = await import('@/lib/follow-up/sequence-engine')
      await Promise.all(ids.map((id) => cancelFollowUpSends(id, user.tenantId!)))
    } catch (err) {
      console.error('[bulkUpdateStatus] Follow-up cancellation failed (non-blocking):', err)
    }
  }

  revalidatePath('/clients')
  return { success: true, count: data?.length ?? 0 }
}

/**
 * Bulk remove a tag from multiple clients.
 */
export async function bulkRemoveTag(ids: string[], tag: string) {
  if (ids.length === 0 || !tag.trim()) return { success: true, count: 0 }

  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('client_tags' as any)
    .delete()
    .in('client_id', ids)
    .eq('tenant_id', user.tenantId!)
    .eq('tag', tag.trim().toLowerCase())

  if (error) {
    throw new Error(`Failed to remove tag: ${error.message}`)
  }

  revalidatePath('/clients')
  return { success: true, count: ids.length }
}
