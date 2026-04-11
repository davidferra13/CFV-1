// API v2 Middleware
// Wraps any route handler with auth, rate limiting, scope checking, and error handling.
// Usage:
//   export const GET = withApiAuth(async (req, ctx) => { ... }, { scopes: ['events:read'] })
//   export const POST = withApiAuth(async (req, ctx) => { ... }, { scopes: ['events:write'] })

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, type ApiKeyContext } from '@/lib/api/auth-api-key'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { createServerClient } from '@/lib/db/server'
import { hasAllScopes, LEGACY_DEFAULT_SCOPES, type ApiScope } from './scopes'
import { apiUnauthorized, apiForbidden, apiRateLimited, apiServerError } from './response'
import { hasChefFeatureFlagWithDb, type ChefFeatureFlag } from '@/lib/features/chef-feature-flags'

export interface ApiContext {
  /** The tenant (chef) ID from the API key */
  tenantId: string
  /** Scopes granted to this API key */
  scopes: string[]
  /** The API key record ID */
  keyId: string
  /** Pre-built admin DB client (bypasses RLS, use tenantId for scoping) */
  db: ReturnType<typeof createServerClient>
}

export type ApiHandler = (
  req: NextRequest,
  ctx: ApiContext,
  params?: Record<string, string>
) => Promise<NextResponse>

export interface ApiAuthOptions {
  /** Required scopes for this endpoint. All must be present. */
  scopes?: ApiScope[]
  /** Optional per-chef feature flag gate. */
  featureFlag?: ChefFeatureFlag
}

/**
 * Wrap a route handler with API key auth, rate limiting, and error handling.
 *
 * Handles:
 * 1. API key validation (Bearer cf_live_*)
 * 2. Rate limiting (100 req/min per tenant)
 * 3. Scope checking (if scopes option provided)
 * 4. Error catching (returns structured JSON errors)
 *
 * The handler receives an ApiContext with tenantId, scopes, and a pre-built database client.
 */
export function withApiAuth(handler: ApiHandler, options?: ApiAuthOptions) {
  return async (req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => {
    try {
      // 1. Authenticate
      const authHeader = req.headers.get('authorization')
      const keyCtx = await validateApiKey(authHeader)
      if (!keyCtx) return apiUnauthorized()

      // 2. Rate limit
      const { success, reset } = await checkRateLimit(`api:${keyCtx.tenantId}`)
      if (!success) return apiRateLimited(reset)

      // 3. Resolve scopes (legacy keys without scopes get default read access)
      const effectiveScopes =
        keyCtx.scopes && keyCtx.scopes.length > 0
          ? keyCtx.scopes
          : (LEGACY_DEFAULT_SCOPES as string[])

      // 4. Check required scopes
      if (options?.scopes && options.scopes.length > 0) {
        if (!hasAllScopes(effectiveScopes, options.scopes)) {
          const missing = options.scopes.filter((s) => !effectiveScopes.includes(s))
          return apiForbidden(`API key missing required scope(s): ${missing.join(', ')}`)
        }
      }

      // 5. Build context
      const db = createServerClient({ admin: true })
      const ctx: ApiContext = {
        tenantId: keyCtx.tenantId,
        scopes: effectiveScopes,
        keyId: keyCtx.keyId,
        db,
      }

      // 6. Check feature flag gate if required
      if (options?.featureFlag) {
        const enabled = await hasChefFeatureFlagWithDb(db, keyCtx.tenantId, options.featureFlag)
        if (!enabled) {
          return apiForbidden(`Feature not enabled for this account: ${options.featureFlag}`)
        }
      }

      // 7. Resolve dynamic route params if present
      const params = routeContext?.params ? await routeContext.params : undefined

      // 8. Execute handler
      return await handler(req, ctx, params)
    } catch (err) {
      console.error('[api/v2] Unhandled error:', err)
      return apiServerError()
    }
  }
}
