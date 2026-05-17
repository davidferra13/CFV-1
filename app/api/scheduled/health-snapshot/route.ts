import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { createServerClient } from '@/lib/db/server'
import { getHealthScoreDistribution } from '@/lib/clients/health-score'
import { writeHealthSnapshot } from '@/lib/analytics/health-trend-actions'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('health-snapshot', async () => {
      const db: any = createServerClient({ admin: true })
      const { data: chefs, error } = await db.from('chefs').select('id')

      if (error || !chefs) {
        throw new Error(error?.message ?? 'Failed to load chefs for health snapshots')
      }

      let snapshotted = 0

      for (const chef of chefs as Array<{ id: string }>) {
        try {
          const dist = await getHealthScoreDistribution()
          await writeHealthSnapshot(chef.id, {
            meanScore: dist.meanScore,
            percentHealthy: dist.percentHealthy,
            totalClients: dist.totalClients,
            alertCount: dist.alertCount,
            tierDistribution: dist.tierDistribution,
          })
          snapshotted++
        } catch {}
      }

      return { snapshotted, total: chefs.length }
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
