import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { createServerClient } from '@/lib/db/server'
import { refreshIngredientCostsForTenant } from '@/lib/pricing/cost-refresh-actions'

/**
 * Ingredient Cost Refresh Cron
 *
 * Refreshes last_price_cents for all recipe ingredients across all active tenants
 * via the PIE resolution chain. Runs every 6 hours.
 *
 * Processes tenants sequentially to avoid hammering the Pi bridge.
 */
export async function POST(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('ingredient-cost-refresh', async () => {
      const db: any = createServerClient({ admin: true })

      // Find all tenants that have at least one recipe_ingredient row
      const { data: tenantRows, error: tenantError } = await db
        .from('recipe_ingredients')
        .select('tenant_id')
        .not('tenant_id', 'is', null)
        .limit(10000)

      if (tenantError) {
        throw new Error(`Failed to query active tenants: ${tenantError.message}`)
      }

      // Deduplicate tenant IDs
      const tenantIds = [...new Set((tenantRows || []).map((r: any) => r.tenant_id))] as string[]

      let totalRefreshed = 0
      let totalMatched = 0
      let totalUnmatched = 0
      const errors: string[] = []
      let tenantsProcessed = 0

      // Process tenants sequentially to avoid hammering the Pi bridge
      for (const tenantId of tenantIds) {
        try {
          const result = await refreshIngredientCostsForTenant(tenantId)
          totalRefreshed += result.refreshed
          totalMatched += result.matched
          totalUnmatched += result.unmatched
          if (result.errors.length > 0) {
            errors.push(...result.errors.map((e) => `[${tenantId}] ${e}`))
          }
          tenantsProcessed++
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          errors.push(`[${tenantId}] ${msg}`)
        }
      }

      return {
        success: true,
        tenantsProcessed,
        totalTenants: tenantIds.length,
        totalRefreshed,
        totalMatched,
        totalUnmatched,
        errors: errors.slice(0, 50), // cap error list
        timestamp: new Date().toISOString(),
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[ingredient-cost-refresh cron] Error:', message)
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
