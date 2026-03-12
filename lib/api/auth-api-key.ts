import { createServerClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'
import { NextResponse } from 'next/server'

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

  const supabase = createServerClient({ admin: true })
  const { data: rawData } = await supabase
    .from('chef_api_keys' as any)
    .select('id, tenant_id, scopes, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single()

  const data = rawData as any
  if (!data || !data.is_active) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  // Update last_used_at (non-blocking)
  supabase
    .from('chef_api_keys' as any)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return { tenantId: data.tenant_id, scopes: data.scopes || [], keyId: data.id }
}

/**
 * Check that an API key has a required scope.
 * Returns an error Response if the scope is missing, or null if authorized.
 * Usage: const denied = requireScope(ctx, 'clients:read'); if (denied) return denied;
 */
export function requireScope(ctx: ApiKeyContext, scope: string): NextResponse | null {
  if (ctx.scopes.includes('*') || ctx.scopes.includes(scope)) return null
  return NextResponse.json(
    { error: `Forbidden: missing required scope '${scope}'` },
    { status: 403 }
  )
}
