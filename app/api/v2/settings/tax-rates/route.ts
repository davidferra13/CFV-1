// API v2: Per-Chef Tax Rate Overrides - Get & Update
// GET   /api/v2/settings/tax-rates         - list all overrides (merged with defaults)
// GET   /api/v2/settings/tax-rates?state=MA - single state resolved rate
// PATCH /api/v2/settings/tax-rates         - upsert a state override
// DELETE via PATCH with { state_code, delete: true }

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiAuth, apiSuccess, apiValidationError, apiError } from '@/lib/api/v2'

const UpsertTaxRateBody = z
  .object({
    state_code: z.string().min(2).max(3),
    rate_bps: z.number().int().min(0).max(10000),
    local_rate_bps: z.number().int().min(0).max(10000).optional().default(0),
    description: z.string().nullable().optional(),
    delete: z.literal(true).optional(),
  })
  .strict()

export const GET = withApiAuth(
  async (req: NextRequest, ctx) => {
    const stateParam = req.nextUrl.searchParams.get('state')

    if (stateParam) {
      // Resolve single state: check override, then fall back to constant
      const code = stateParam.toUpperCase()

      const { data: override } = await (ctx.supabase as any)
        .from('chef_tax_config')
        .select('*')
        .eq('chef_id', ctx.tenantId)
        .eq('state_code', code)
        .single()

      if (override) {
        return apiSuccess({
          state_code: code,
          rate_bps: override.rate_bps,
          local_rate_bps: override.local_rate_bps,
          combined_bps: override.rate_bps + override.local_rate_bps,
          source: 'chef_override',
          description: override.description,
        })
      }

      // Fall back to constants (imported dynamically to keep this file lean)
      const { COMMON_STATE_RATES_BPS } = await import('@/lib/finance/sales-tax-constants')
      const defaultRate = COMMON_STATE_RATES_BPS[code]
      return apiSuccess({
        state_code: code,
        rate_bps: defaultRate?.rateBps ?? 0,
        local_rate_bps: 0,
        combined_bps: defaultRate?.rateBps ?? 0,
        source: 'default',
        description: defaultRate?.label ?? null,
      })
    }

    // List all overrides for this chef
    const { data, error } = await (ctx.supabase as any)
      .from('chef_tax_config')
      .select('*')
      .eq('chef_id', ctx.tenantId)
      .order('state_code', { ascending: true })

    if (error) {
      console.error('[api/v2/settings/tax-rates] Fetch error:', error)
      return apiError('fetch_failed', 'Failed to fetch tax rate overrides', 500)
    }

    const overrides = (data || []).map((r: any) => ({
      id: r.id,
      state_code: r.state_code,
      rate_bps: r.rate_bps,
      local_rate_bps: r.local_rate_bps,
      combined_bps: r.rate_bps + r.local_rate_bps,
      description: r.description,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }))

    return apiSuccess({ overrides, count: overrides.length })
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

    const parsed = UpsertTaxRateBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { state_code, delete: shouldDelete, ...rest } = parsed.data
    const code = state_code.toUpperCase()

    // Handle delete
    if (shouldDelete) {
      const { error } = await (ctx.supabase as any)
        .from('chef_tax_config')
        .delete()
        .eq('chef_id', ctx.tenantId)
        .eq('state_code', code)

      if (error) {
        console.error('[api/v2/settings/tax-rates] Delete error:', error)
        return apiError('delete_failed', 'Failed to delete tax rate override', 500)
      }

      return apiSuccess({ deleted: true, state_code: code })
    }

    // Upsert
    const { data, error } = await (ctx.supabase as any)
      .from('chef_tax_config')
      .upsert(
        {
          chef_id: ctx.tenantId,
          state_code: code,
          rate_bps: rest.rate_bps,
          local_rate_bps: rest.local_rate_bps ?? 0,
          description: rest.description ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'chef_id,state_code' }
      )
      .select()
      .single()

    if (error) {
      console.error('[api/v2/settings/tax-rates] Upsert error:', error)
      return apiError('update_failed', 'Failed to save tax rate override', 500)
    }

    return apiSuccess({
      id: data.id,
      state_code: data.state_code,
      rate_bps: data.rate_bps,
      local_rate_bps: data.local_rate_bps,
      combined_bps: data.rate_bps + data.local_rate_bps,
      description: data.description,
      updated_at: data.updated_at,
    })
  },
  { scopes: ['settings:write'] }
)
