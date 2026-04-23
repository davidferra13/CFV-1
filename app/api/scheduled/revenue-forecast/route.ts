import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { createServerClient } from '@/lib/db/server'
import { getRevenueForecastForTenant } from '@/lib/finance/revenue-forecast-run'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'

const FORECAST_HORIZONS = [3, 6, 12] as const

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('revenue-forecast', async () => {
      const db: any = createServerClient({ admin: true })
      const { data: chefs, error } = await db.from('chefs').select('id, business_name')

      if (error || !chefs) {
        throw new Error(error?.message ?? 'Failed to load chefs for revenue forecast snapshots')
      }

      let generated = 0
      let failed = 0

      for (const chef of chefs as Array<{ id: string; business_name: string | null }>) {
        for (const months of FORECAST_HORIZONS) {
          try {
            await getRevenueForecastForTenant(chef.id, months, {
              runSource: 'scheduled',
              forceFresh: true,
              maxAgeMinutes: 0,
            })
            generated += 1
          } catch (forecastError) {
            failed += 1
            await recordSideEffectFailure({
              source: 'cron:revenue-forecast',
              operation: 'generate_revenue_forecast_snapshot',
              severity: 'medium',
              entityType: 'chef',
              entityId: chef.id,
              tenantId: chef.id,
              errorMessage:
                forecastError instanceof Error ? forecastError.message : String(forecastError),
              context: {
                businessName: chef.business_name ?? null,
                months,
              },
            })
          }
        }
      }

      return {
        success: true,
        chefs: chefs.length,
        horizons: [...FORECAST_HORIZONS],
        generated,
        failed,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[revenue-forecast-cron] Failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate revenue forecast snapshots' },
      { status: 500 }
    )
  }
}

export { GET as POST }
