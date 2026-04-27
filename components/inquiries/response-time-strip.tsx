import { getResponseTimeMetrics } from '@/lib/inquiries/response-time-analytics'

function getAvgColor(hours: number): string {
  if (hours < 12) return 'text-emerald-400'
  if (hours < 24) return 'text-stone-200'
  if (hours < 48) return 'text-amber-400'
  return 'text-red-400'
}

export async function ResponseTimeStrip() {
  const metrics = await getResponseTimeMetrics()

  if (!metrics) return null

  const avgColor = getAvgColor(metrics.avgHours)

  return (
    <div className="flex items-center gap-4 text-xs text-stone-400">
      <span>
        Avg response: <strong className={avgColor}>{metrics.avgHours}h</strong>
      </span>
      <span>
        Under 24h: <strong className="text-stone-200">{metrics.under24hPercent}%</strong>
      </span>
      <span>
        Over 48h:{' '}
        <strong className={metrics.over48hCount > 0 ? 'text-red-400' : 'text-stone-200'}>
          {metrics.over48hCount}
        </strong>
      </span>
      <span>
        Total: <strong className="text-stone-200">{metrics.totalResponded}</strong> responses
      </span>
    </div>
  )
}
