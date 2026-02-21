'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePhotoPermission(photoId: string, permissionOverride: string) {
  const chef = await requireChef()
  const supabase = createServerClient()
  const { error } = await (supabase as any)
    .from('event_photos')
    .update({ permission_override: permissionOverride })
    .eq('id', photoId)
  if (error) throw new Error(error.message)
  revalidatePath('/settings/portfolio')
}

export async function getPortfolioPermissionAudit() {
  const chef = await requireChef()
  const supabase = createServerClient()
  const { data } = await (supabase as any)
    .from('event_photos')
    .select(
      'id, url, event_id, client_id, permission_override, clients(full_name, photo_permission)'
    )
    .eq('tenant_id', chef.tenantId!)
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []).map((p: any) => ({
    id: p.id,
    url: p.url,
    event_id: p.event_id,
    client_id: p.client_id,
    client_name: p.clients?.full_name ?? null,
    photo_permission: p.clients?.photo_permission ?? null,
    permission_override: p.permission_override,
  }))
}
