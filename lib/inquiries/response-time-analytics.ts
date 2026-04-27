'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type ResponseTimeMetrics = {
  avgHours: number
  medianHours: number
  under24hPercent: number
  over48hCount: number
  totalResponded: number
}

export async function getResponseTimeMetrics(): Promise<ResponseTimeMetrics | null> {
  const user = await requireChef()
  const db = createServerClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await db
    .from('inquiries')
    .select('created_at, first_response_at')
    .eq('tenant_id', user.tenantId!)
    .not('first_response_at', 'is', null)
    .gte('created_at', thirtyDaysAgo.toISOString())

  if (error || !data) {
    console.error('[response-time-analytics] Query failed:', error)
    return null
  }

  // Filter to rows that actually have first_response_at
  const rows = data.filter(
    (r: { created_at: string; first_response_at: string | null }) => r.first_response_at != null
  )

  if (rows.length < 3) return null

  // Calculate response times in hours
  const responseTimes = rows.map((r: { created_at: string; first_response_at: string }) => {
    const created = new Date(r.created_at).getTime()
    const responded = new Date(r.first_response_at).getTime()
    return Math.max(0, (responded - created) / (1000 * 60 * 60))
  })

  // Sort for median calculation
  responseTimes.sort((a: number, b: number) => a - b)

  const sum = responseTimes.reduce((acc: number, h: number) => acc + h, 0)
  const avgHours = Math.round(sum / responseTimes.length)

  // Median
  const mid = Math.floor(responseTimes.length / 2)
  const medianHours =
    responseTimes.length % 2 === 0
      ? Math.round((responseTimes[mid - 1] + responseTimes[mid]) / 2)
      : Math.round(responseTimes[mid])

  const under24hCount = responseTimes.filter((h: number) => h < 24).length
  const under24hPercent = Math.round((under24hCount / responseTimes.length) * 100)

  const over48hCount = responseTimes.filter((h: number) => h >= 48).length

  return {
    avgHours,
    medianHours,
    under24hPercent,
    over48hCount,
    totalResponded: responseTimes.length,
  }
}
