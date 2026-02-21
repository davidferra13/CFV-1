'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { generateApiKey, hashApiKey } from './auth-api-key'
import { revalidatePath } from 'next/cache'

export async function createApiKey(name: string): Promise<{ key: string }> {
  const user = await requireChef()
  const supabase = createServerClient()
  const key = generateApiKey()
  const keyHash = hashApiKey(key)
  const keyPrefix = key.substring(0, 15)

  const { error } = await supabase.from('chef_api_keys' as any).insert({
    tenant_id: user.entityId,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes: ['events:read', 'clients:read', 'expenses:read'],
  })
  if (error) throw new Error(error.message)
  revalidatePath('/settings/api-keys')
  return { key }
}

export async function revokeApiKey(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()
  await supabase.from('chef_api_keys' as any).update({ is_active: false }).eq('id', id).eq('tenant_id', user.entityId)
  revalidatePath('/settings/api-keys')
}
