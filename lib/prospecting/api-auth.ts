// Prospecting API Authentication
// Supports two auth methods for flexibility:
// 1. Chef API key (Bearer cf_live_*) - for external integrations
// 2. Prospecting pipeline key (X-Prospecting-Key header) - for n8n/internal automation
//
// The pipeline key is a simple shared secret from PROSPECTING_API_KEY in .env.local.
// It always resolves to the admin chef's tenant ID (PROSPECTING_TENANT_ID in .env.local).

import { validateApiKey, type ApiKeyContext } from '@/lib/api/auth-api-key'
import { timingSafeEqual } from 'crypto'

export interface ProspectingAuthContext {
  tenantId: string
  source: 'api_key' | 'pipeline_key'
}

export async function validateProspectingAuth(
  request: Request
): Promise<ProspectingAuthContext | null> {
  // Method 1: Standard chef API key (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer cf_live_')) {
    const ctx = await validateApiKey(authHeader)
    if (ctx) return { tenantId: ctx.tenantId, source: 'api_key' }
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
