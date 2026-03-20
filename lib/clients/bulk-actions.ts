'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Bulk archive clients - soft-deletes clients by setting `deleted_at`.
 * The clients table has no `archived` column, so we use the existing
 * soft-delete pattern (`deleted_at` + `deleted_by`).
 * Only affects clients owned by the authenticated chef's tenant.
 */
export async function bulkArchiveClients(ids: string[]) {
  if (ids.length === 0) return { success: true, count: 0 }

  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .in('id', ids)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null) // only archive clients not already archived
    .select('id')

  if (error) {
    throw new Error(`Failed to archive clients: ${error.message}`)
  }

  revalidatePath('/clients')
  return { success: true, count: data?.length ?? 0 }
}
