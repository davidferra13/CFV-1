'use server'
import { createServerClient } from '@/lib/db/server'
import { generateApiKey, hashApiKey } from './auth-api-key'
import { revalidatePath } from 'next/cache'
import { LEGACY_DEFAULT_SCOPES, API_SCOPES, type ApiScope } from './v2/scopes'
import { CHEF_FEATURE_FLAGS, requireChefFeatureFlag } from '@/lib/features/chef-feature-flags'
import { logDeveloperToolsFirstUseIfNeeded } from '@/lib/features/developer-tools-observability'

export async function createApiKey(name: string, scopes?: ApiScope[]): Promise<{ key: string }> {
  const user = await requireChefFeatureFlag(CHEF_FEATURE_FLAGS.developerTools)
  const db: any = createServerClient()
  const key = generateApiKey()
  const keyHash = hashApiKey(key)
  const keyPrefix = key.substring(0, 15)

  // Validate scopes - only allow known scopes
  const validScopes = scopes?.filter((s) => s in API_SCOPES) ?? [...LEGACY_DEFAULT_SCOPES]
  if (validScopes.length === 0) {
    throw new Error('At least one scope is required')
  }

  const { error } = await db.from('chef_api_keys' as any).insert({
    tenant_id: user.entityId,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes: validScopes,
  })
  if (error) throw new Error(error.message)
  await logDeveloperToolsFirstUseIfNeeded({
    tenantId: user.entityId,
    actorId: user.id,
    kind: 'api_key',
    context: { scopes: validScopes, key_name: name },
    db,
  })
  revalidatePath('/settings/api-keys')
  return { key }
}

export async function revokeApiKey(id: string) {
  const user = await requireChefFeatureFlag(CHEF_FEATURE_FLAGS.developerTools)
  const db: any = createServerClient()
  await db
    .from('chef_api_keys' as any)
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', user.entityId)
  revalidatePath('/settings/api-keys')
}
