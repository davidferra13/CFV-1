import { createServerClient } from '@/lib/db/server'
import { createHash } from 'crypto'

export interface ApiKeyContext {
  tenantId: string
  scopes: string[]
  keyId: string
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(32)
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(bytes)
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `cf_live_${hex}`
}

export async function validateApiKey(authHeader: string | null): Promise<ApiKeyContext | null> {
  if (!authHeader?.startsWith('Bearer cf_live_')) return null
  const key = authHeader.replace('Bearer ', '').trim()
  const keyHash = hashApiKey(key)

  const db = createServerClient({ admin: true })
  const { data: rawData } = await db
    .from('chef_api_keys' as any)
    .select('id, tenant_id, scopes, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single()

  const data = rawData as any
  if (!data || !data.is_active) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  // Update last_used_at (non-blocking)
  db.from('chef_api_keys' as any)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return { tenantId: data.tenant_id, scopes: data.scopes || [], keyId: data.id }
}
