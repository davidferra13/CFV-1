'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { refreshActivitySnapshot } from './snapshot-job'

export async function getActivitySharingStatus(): Promise<boolean> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chef_preferences')
    .select('share_activity_with_connections')
    .eq('chef_id', user.entityId)
    .maybeSingle()

  return data?.share_activity_with_connections ?? false
}

export async function toggleActivitySharing(enabled: boolean) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('chef_preferences')
    .select('id')
    .eq('chef_id', user.entityId)
    .single()

  if (existing) {
    const { error } = await db
      .from('chef_preferences')
      .update({ share_activity_with_connections: enabled })
      .eq('chef_id', user.entityId)

    if (error) throw new Error('Failed to update activity sharing preference')
  } else {
    const { error } = await db.from('chef_preferences').insert({
      chef_id: user.entityId,
      tenant_id: user.tenantId!,
      share_activity_with_connections: enabled,
    })

    if (error) throw new Error('Failed to create activity sharing preference')
  }

  // Immediately refresh (or delete) the snapshot
  await refreshActivitySnapshot(user.entityId)

  revalidatePath('/settings/profile-branding')
}
