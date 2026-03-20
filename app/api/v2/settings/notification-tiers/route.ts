// API v2: Notification Tier Overrides - Get & Patch
// GET   /api/v2/settings/notification-tiers - Full tier map with overrides applied
// PATCH /api/v2/settings/notification-tiers - Update one or more tier overrides

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import { DEFAULT_TIER_MAP } from '@/lib/notifications/tier-config'
import { NOTIFICATION_CONFIG } from '@/lib/notifications/types'
import type { NotificationAction } from '@/lib/notifications/types'
import type { NotificationTier } from '@/lib/notifications/tier-config'

const validActions = Object.keys(DEFAULT_TIER_MAP)

const OverrideEntry = z.object({
  action: z.string().refine((a) => validActions.includes(a), {
    message: 'Unknown notification action',
  }),
  tier: z.enum(['critical', 'alert', 'info']),
})

const PatchBody = z.object({
  overrides: z.array(OverrideEntry).min(1).max(200),
})

export const GET = withApiAuth(
  async (_req, ctx) => {
    // Load all overrides for this chef
    const { data: overrides, error } = await ctx.supabase
      .from('chef_notification_tier_overrides' as any)
      .select('action, tier')
      .eq('chef_id', ctx.tenantId)

    if (error) {
      console.error('[api/v2/notification-tiers] GET error:', error)
      return apiError('query_failed', 'Failed to load tier overrides', 500)
    }

    const overrideMap = new Map<string, string>()
    for (const row of overrides ?? []) {
      overrideMap.set(row.action, row.tier)
    }

    // Build full map
    const entries = (
      Object.entries(DEFAULT_TIER_MAP) as [NotificationAction, NotificationTier][]
    ).map(([action, defaultTier]) => {
      const override = overrideMap.get(action)
      return {
        action,
        category: NOTIFICATION_CONFIG[action].category,
        current_tier: override ?? defaultTier,
        default_tier: defaultTier,
        is_overridden: override !== undefined && override !== defaultTier,
      }
    })

    return apiSuccess({ tiers: entries, override_count: overrideMap.size })
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

    const parsed = PatchBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Process each override: if tier matches default, delete the override; otherwise upsert
    const errors: string[] = []
    for (const { action, tier } of parsed.data.overrides) {
      const defaultTier = DEFAULT_TIER_MAP[action as NotificationAction]

      if (tier === defaultTier) {
        // Remove override (revert to default)
        const { error } = await ctx.supabase
          .from('chef_notification_tier_overrides' as any)
          .delete()
          .eq('chef_id', ctx.tenantId)
          .eq('action', action)

        if (error) errors.push(`${action}: ${error.message}`)
      } else {
        // Upsert override
        const { error } = await ctx.supabase.from('chef_notification_tier_overrides' as any).upsert(
          {
            chef_id: ctx.tenantId,
            action,
            tier,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'chef_id,action' }
        )

        if (error) errors.push(`${action}: ${error.message}`)
      }
    }

    if (errors.length > 0) {
      console.error('[api/v2/notification-tiers] PATCH errors:', errors)
      return apiError('partial_failure', `Some updates failed: ${errors.join('; ')}`, 500)
    }

    return apiSuccess({ updated: parsed.data.overrides.length })
  },
  { scopes: ['settings:write'] }
)
