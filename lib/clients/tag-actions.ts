'use server'

// Client Tags - CRUD actions for the client_tags table.
// Tags are free-text labels (max 50 chars) scoped to a chef-tenant.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export async function getClientTags(clientId: string): Promise<string[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('client_tags' as any)
    .select('tag')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('tag')

  return ((data ?? []) as any[]).map((r: any) => r.tag as string)
}

/** Returns all distinct tags used by this chef, sorted alphabetically. */
export async function getAllUsedTags(): Promise<string[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('client_tags' as any)
    .select('tag')
    .eq('tenant_id', user.tenantId!)
    .order('tag')

  const tags = ((data ?? []) as any[]).map((r: any) => r.tag as string)
  return [...new Set(tags)]
}

export async function addClientTag(clientId: string, tag: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const trimmed = tag.trim().toLowerCase().slice(0, 50)
  if (!trimmed) return

  await db
    .from('client_tags' as any)
    .upsert(
      { client_id: clientId, tenant_id: user.tenantId!, tag: trimmed },
      { onConflict: 'client_id,tag' }
    )

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/clients')
}

export async function removeClientTag(clientId: string, tag: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('client_tags' as any)
    .delete()
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .eq('tag', tag)

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/clients')
}

/** Returns a map of clientId → tag array for all clients with tags. */
export async function getTagsForAllClients(): Promise<Map<string, string[]>> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('client_tags' as any)
    .select('client_id, tag')
    .eq('tenant_id', user.tenantId!)
    .order('tag')

  const map = new Map<string, string[]>()
  for (const row of (data ?? []) as any[]) {
    const existing = map.get(row.client_id) ?? []
    existing.push(row.tag)
    map.set(row.client_id, existing)
  }
  return map
}
