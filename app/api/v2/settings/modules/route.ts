// API v2: Module Toggles
// GET   /api/v2/settings/modules - Get enabled/disabled modules
// PATCH /api/v2/settings/modules - Toggle modules on/off

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { ALL_MODULE_SLUGS, DEFAULT_ENABLED_MODULES, MODULES } from '@/lib/billing/modules'

const UpdateModulesBody = z
  .object({
    enabled_modules: z.array(z.string()),
  })
  .strict()

export const GET = withApiAuth(
  async (_req, ctx) => {
    const { data } = await ctx.supabase
      .from('chef_preferences')
      .select('enabled_modules')
      .eq('chef_id', ctx.tenantId)
      .single()

    const raw = (data as any)?.enabled_modules
    const enabledModules = Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_ENABLED_MODULES

    // Return the full module list with enabled status
    const modules = MODULES.map((m) => ({
      slug: m.slug,
      label: m.label,
      description: m.description,
      tier: m.tier,
      always_visible: m.alwaysVisible,
      enabled: m.alwaysVisible || enabledModules.includes(m.slug),
    }))

    return apiSuccess({ modules, enabled_modules: enabledModules })
  },
  { scopes: ['settings:read'] }
)

export const PATCH = withApiAuth(
  async (req: NextRequest, ctx) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = UpdateModulesBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Validate: only allow known module slugs
    const validSlugs = new Set(ALL_MODULE_SLUGS)
    const filtered = parsed.data.enabled_modules.filter((slug) => validSlugs.has(slug))

    // Always include 'dashboard' (cannot be toggled off)
    if (!filtered.includes('dashboard')) {
      filtered.unshift('dashboard')
    }

    const { error } = await ctx.supabase.from('chef_preferences').upsert(
      {
        chef_id: ctx.tenantId,
        enabled_modules: filtered,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'chef_id' }
    )

    if (error) {
      console.error('[api/v2/settings/modules] Update error:', error)
      return apiError('update_failed', 'Failed to update modules', 500)
    }

    return apiSuccess({ enabled_modules: filtered })
  },
  { scopes: ['settings:write'] }
)
