'use server'

// Client archive/restore for the chef UI.
//
// Archiving is the existing soft delete (deleteClient): it refuses while the
// client has active events, cancels pending follow-ups and scheduled
// notifications, and keeps every record. restoreClient reverses it.
// These wrappers return the reason as data, because Next.js hides thrown
// server-action messages in production and the chef needs to see why an
// archive was refused.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { ValidationError } from '@/lib/errors/app-error'
import { deleteClient, restoreClient } from '@/lib/clients/actions'

export type ArchiveResult = { ok: true } | { ok: false; reason: string }

export type ArchivedClient = {
  id: string
  fullName: string
  email: string | null
  archivedAt: string
}

export async function archiveClientFromUi(clientId: string): Promise<ArchiveResult> {
  try {
    await deleteClient(clientId)
    return { ok: true }
  } catch (err) {
    if (err instanceof ValidationError) return { ok: false, reason: err.message }
    console.error('[archiveClientFromUi] Error:', err)
    return { ok: false, reason: 'Could not archive this client. Please try again.' }
  }
}

export async function restoreClientFromUi(clientId: string): Promise<ArchiveResult> {
  try {
    await restoreClient(clientId)
    return { ok: true }
  } catch (err) {
    console.error('[restoreClientFromUi] Error:', err)
    return { ok: false, reason: 'Could not restore this client. Please try again.' }
  }
}

export async function getArchivedClients(limit = 100): Promise<ArchivedClient[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('clients')
    .select('id, full_name, email, deleted_at')
    .eq('tenant_id', user.tenantId!)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getArchivedClients] Error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    fullName: row.full_name || 'Unnamed client',
    email: row.email ?? null,
    archivedAt:
      row.deleted_at instanceof Date ? row.deleted_at.toISOString() : String(row.deleted_at),
  }))
}
