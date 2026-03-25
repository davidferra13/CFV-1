// API v2: Dashboard Widget Configuration
// GET   /api/v2/settings/dashboard - Get dashboard widget config
// PATCH /api/v2/settings/dashboard - Update widget enabled/disabled states

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'
import {
  DASHBOARD_WIDGET_IDS,
  DEFAULT_DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_LABELS,
} from '@/lib/scheduling/types'

const WidgetPreferenceSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
})

const UpdateDashboardBody = z
  .object({
    widgets: z.array(WidgetPreferenceSchema),
  })
  .strict()

function getDashboardWidgetsFromUnknown(raw: unknown): { id: string; enabled: boolean }[] {
  if (Array.isArray(raw) && raw.length > 0) {
    const validIds = new Set(DASHBOARD_WIDGET_IDS as readonly string[])
    return raw.filter(
      (w: any) =>
        w && typeof w.id === 'string' && validIds.has(w.id) && typeof w.enabled === 'boolean'
    )
  }
  return DEFAULT_DASHBOARD_WIDGETS.map((w) => ({ id: w.id, enabled: w.enabled }))
}

export const GET = withApiAuth(
  async (_req, ctx) => {
    const { data } = await ctx.db
      .from('chef_preferences')
      .select('dashboard_widgets')
      .eq('chef_id', ctx.tenantId)
      .single()

    const widgets = getDashboardWidgetsFromUnknown((data as any)?.dashboard_widgets)

    // Enrich with labels
    const enriched = widgets.map((w) => ({
      ...w,
      label: (DASHBOARD_WIDGET_LABELS as Record<string, string>)[w.id] ?? w.id,
    }))

    return apiSuccess({ widgets: enriched })
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

    const parsed = UpdateDashboardBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    // Validate widget IDs
    const validIds = new Set(DASHBOARD_WIDGET_IDS as readonly string[])
    const sanitized = parsed.data.widgets.filter((w) => validIds.has(w.id))

    if (sanitized.length === 0) {
      return apiError('no_valid_widgets', 'No valid widget IDs provided', 422)
    }

    // Merge with existing: keep existing widgets not in the update, override those in the update
    const { data: existing } = await ctx.db
      .from('chef_preferences')
      .select('dashboard_widgets')
      .eq('chef_id', ctx.tenantId)
      .single()

    const currentWidgets = getDashboardWidgetsFromUnknown((existing as any)?.dashboard_widgets)

    // Build a map from the update
    const updateMap = new Map(sanitized.map((w) => [w.id, w.enabled]))
    const merged = currentWidgets.map((w) => ({
      id: w.id,
      enabled: updateMap.has(w.id) ? updateMap.get(w.id)! : w.enabled,
    }))

    const { data, error } = await ctx.db
      .from('chef_preferences')
      .upsert(
        {
          chef_id: ctx.tenantId,
          dashboard_widgets: merged,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'chef_id' }
      )
      .select('dashboard_widgets')
      .single()

    if (error) {
      console.error('[api/v2/settings/dashboard] Update error:', error)
      return apiError('update_failed', 'Failed to update dashboard widgets', 500)
    }

    return apiSuccess({
      widgets: getDashboardWidgetsFromUnknown((data as any)?.dashboard_widgets),
    })
  },
  { scopes: ['settings:write'] }
)
