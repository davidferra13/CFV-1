// Prospecting API Authentication
// Supports two auth methods for flexibility:
// 1. Platform admin chef API key (Bearer cf_live_*) - for external integrations
// 2. Prospecting pipeline key (X-Prospecting-Key header) - for n8n/internal automation
//
// The pipeline key is a simple shared secret from PROSPECTING_API_KEY in .env.local.
// It always resolves to the admin chef's tenant ID (PROSPECTING_TENANT_ID in .env.local).

import { validateApiKey, type ApiKeyContext } from '@/lib/api/auth-api-key'
import { createServerClient } from '@/lib/db/server'
import { timingSafeEqual } from 'crypto'

export interface ProspectingAuthContext {
  tenantId: string
  source: 'api_key' | 'pipeline_key'
}

const PLATFORM_ADMIN_ACCESS_LEVELS = new Set(['admin', 'owner'])

export async function validateProspectingAuth(
  request: Request
): Promise<ProspectingAuthContext | null> {
  // Method 1: Platform admin chef API key (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer cf_live_')) {
    const ctx = await validateApiKey(authHeader)
    if (ctx) {
      const tenantId = await getPlatformAdminTenantIdForApiKey(ctx)
      if (tenantId) return { tenantId, source: 'api_key' }
    }
  }

  // Method 2: Pipeline key (X-Prospecting-Key header)
  const pipelineKey = request.headers.get('x-prospecting-key')
  const expectedKey = process.env.PROSPECTING_API_KEY
  const tenantId = process.env.PROSPECTING_TENANT_ID

  if (pipelineKey && expectedKey && tenantId) {
    const a = Buffer.from(pipelineKey)
    const b = Buffer.from(expectedKey)
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return { tenantId, source: 'pipeline_key' }
    }
  }

  return null
}

async function getPlatformAdminTenantIdForApiKey(ctx: ApiKeyContext): Promise<string | null> {
  const db = createServerClient({ admin: true })

  const { data: chef, error: chefError } = await db
    .from('chefs' as any)
    .select('auth_user_id')
    .eq('id', ctx.tenantId)
    .maybeSingle()

  if (chefError) {
    console.warn('[prospecting/auth] Failed to resolve API key tenant', {
      keyId: ctx.keyId,
      tenantId: ctx.tenantId,
      error: chefError.message,
    })
    return null
  }

  const authUserId = (chef as { auth_user_id?: string } | null)?.auth_user_id
  if (!authUserId) {
    console.warn('[prospecting/auth] API key denied: tenant owner not found', {
      keyId: ctx.keyId,
      tenantId: ctx.tenantId,
    })
    return null
  }

  const { data: admin, error: adminError } = await db
    .from('platform_admins' as any)
    .select('access_level')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .maybeSingle()

  if (adminError) {
    console.warn('[prospecting/auth] Failed to resolve platform admin access', {
      keyId: ctx.keyId,
      tenantId: ctx.tenantId,
      error: adminError.message,
    })
    return null
  }

  const accessLevel = (admin as { access_level?: string } | null)?.access_level
  if (accessLevel && PLATFORM_ADMIN_ACCESS_LEVELS.has(accessLevel)) {
    return ctx.tenantId
  }

  console.warn('[prospecting/auth] API key denied: platform admin access required', {
    keyId: ctx.keyId,
    tenantId: ctx.tenantId,
  })
  return null
}
