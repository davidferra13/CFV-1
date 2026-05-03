'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function getWorkspaceDensity(): Promise<'minimal' | 'standard' | 'power'> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_preferences')
    .select('workspace_density')
    .eq('chef_id', user.entityId)
    .single()
  return (data?.workspace_density as 'minimal' | 'standard' | 'power') ?? 'standard'
}

export async function setWorkspaceDensity(
  density: 'minimal' | 'standard' | 'power'
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const valid = ['minimal', 'standard', 'power']
  if (!valid.includes(density)) {
    return { success: false, error: 'Invalid density value' }
  }

  const payload = { workspace_density: density, updated_at: new Date().toISOString() }
  const { data: existing } = await db
    .from('chef_preferences')
    .select('id')
    .eq('chef_id', user.entityId)
    .single()

  const { error } = existing
    ? await db.from('chef_preferences').update(payload).eq('chef_id', user.entityId)
    : await db.from('chef_preferences').insert({
        chef_id: user.entityId,
        tenant_id: user.tenantId ?? user.entityId,
        ...payload,
      })

  if (error) {
    console.error('[setWorkspaceDensity] failed:', error)
    return { success: false, error: 'Failed to update workspace density' }
  }
  revalidatePath('/', 'layout')
  revalidatePath('/dashboard')
  revalidatePath('/settings')
  revalidateTag(`chef-layout-${user.entityId}`)
  revalidateTag(`chef-prefs-${user.entityId}`)
  return { success: true }
}
