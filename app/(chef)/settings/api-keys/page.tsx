import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { ApiKeyManager } from '@/components/settings/api-key-manager'

export const metadata: Metadata = { title: 'API Keys - ChefFlow' }

async function getApiKeys(tenantId: string) {
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_api_keys' as any)
    .select('id, name, key_prefix, scopes, last_used_at, is_active, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  return (data || []) as any[]
}

export default async function ApiKeysPage() {
  const user = await requireChef()
  const keys = await getApiKeys(user.entityId)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">API Keys</h1>
        <p className="text-stone-400 mt-1">
          Create API keys to integrate ChefFlow with other tools
        </p>
      </div>
      <ApiKeyManager apiKeys={keys} />
    </div>
  )
}
