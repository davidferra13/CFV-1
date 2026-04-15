'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export async function confirmStagedClient(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { error } = await db
    .from('clients')
    .update({ is_staged: false, staged_from_signal_id: null })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_staged', true)

  if (error) return { success: false, error: error.message }

  // Also confirm any staged inquiries linked to this client
  await db
    .from('inquiries')
    .update({ is_staged: false, staged_from_signal_id: null })
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_staged', true)

  revalidatePath('/inbox')
  revalidatePath('/clients')
  revalidatePath('/inquiries')
  return { success: true }
}

export async function dismissStagedClient(clientId: string) {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  // Dismiss related staged inquiries first
  await db
    .from('inquiries')
    .delete()
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_staged', true)

  const { error } = await db
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_staged', true)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inbox')
  return { success: true }
}

export async function getStagedEntities() {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const [{ data: clients }, { data: inquiries }] = await Promise.all([
    db
      .from('clients')
      .select('id, name, email, phone, created_at, staged_from_signal_id')
      .eq('tenant_id', user.tenantId!)
      .eq('is_staged', true)
      .order('created_at', { ascending: false })
      .limit(50),
    db
      .from('inquiries')
      .select('id, client_id, channel, notes, created_at, staged_from_signal_id')
      .eq('tenant_id', user.tenantId!)
      .eq('is_staged', true)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return {
    clients: (clients || []) as Array<{
      id: string
      name: string
      email: string | null
      phone: string | null
      created_at: string
      staged_from_signal_id: string | null
    }>,
    inquiries: (inquiries || []) as Array<{
      id: string
      client_id: string
      channel: string
      notes: string | null
      created_at: string
      staged_from_signal_id: string | null
    }>,
  }
}
