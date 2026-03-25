'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

/**
 * Bulk decline inquiries - sets status to 'declined' for the given inquiry IDs.
 * Only affects inquiries owned by the authenticated chef's tenant.
 */
export async function bulkDeclineInquiries(ids: string[]) {
  if (ids.length === 0) return { success: true, count: 0 }

  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('inquiries')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('tenant_id', user.tenantId!)
    .select('id')

  if (error) {
    throw new Error(`Failed to decline inquiries: ${error.message}`)
  }

  revalidatePath('/inquiries')
  return { success: true, count: data?.length ?? 0 }
}

/**
 * Bulk archive inquiries - soft-deletes inquiries by setting `deleted_at`.
 * Only affects inquiries owned by the authenticated chef's tenant.
 */
export async function bulkArchiveInquiries(ids: string[]) {
  if (ids.length === 0) return { success: true, count: 0 }

  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('inquiries')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null) // only archive inquiries not already archived
    .select('id')

  if (error) {
    throw new Error(`Failed to archive inquiries: ${error.message}`)
  }

  revalidatePath('/inquiries')
  return { success: true, count: data?.length ?? 0 }
}
