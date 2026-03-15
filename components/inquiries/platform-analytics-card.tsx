'use client'

import type { PlatformAnalytics } from '@/lib/inquiries/platform-analytics'

interface CPLEntry {
  channelKey: string
  channel: string
  cplCents: number | null
  cpcCents: number | null
}

interface SLAStatEntry {
  channelKey: string
  channel?: string // display name for matching
  avgResponseHours: number | null
  slaHitRate: number
  targetHours: number
}

interface PlatformAnalyticsCardProps {
  analytics: PlatformAnalytics
  cplData?: CPLEntry[]
  slaStats?: SLAStatEntry[]
}

export function PlatformAnalyticsCard({
  analytics,
  cplData,
  slaStats,
}: PlatformAnalyticsCardProps) {
  if (analytics.platforms.length < 2) return null

  const maxTotal = Math.max(...analytics.platforms.map((p) => p.total))

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">Inquiries by Source</h3>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span>{analytics.totalInquiries} total</span>
          <span>{analytics.overallConversionRate}% conversion</span>
          {cplData && cplData.length > 0 && <span className="text-stone-500">CPL</span>}
          {slaStats && slaStats.length > 0 && <span className="text-stone-500">Avg / SLA</span>}
          {analytics.bestPlatform && (
            <span className="text-emerald-400">Best: {analytics.bestPlatform}</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {analytics.platforms.slice(0, 8).map((platform) => (
          <div key={platform.channel} className="flex items-center gap-2">
            <span className="w-28 text-xs text-stone-400 truncate shrink-0">
              {platform.channel}
            </span>
            <div className="flex-1 h-4 bg-stone-800 rounded overflow-hidden relative">
              <div
                className="h-full bg-brand-500/60 rounded"
                style={{ width: `${maxTotal > 0 ? (platform.total / maxTotal) * 100 : 0}%` }}
              />
              {platform.confirmed > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500/60 rounded"
                  style={{
                    width: `${maxTotal > 0 ? (platform.confirmed / maxTotal) * 100 : 0}%`,
                  }}
                />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-stone-300 w-8 text-right">{platform.total}</span>
              <span
                className={`text-xs w-10 text-right ${platform.conversionRate > 0 ? 'text-emerald-400' : 'text-stone-500'}`}
              >
                {platform.conversionRate}%
              </span>
              {platform.avgLeadScore !== null && (
                <span className="text-xs text-stone-500 w-6 text-right">
                  {platform.avgLeadScore}
                </span>
              )}
              {cplData &&
                cplData.length > 0 &&
                (() => {
                  const match = cplData.find(
                    (c) => c.channel === platform.channel || c.channelKey === platform.channel
                  )
                  return (
                    <span className="text-xs text-stone-500 w-12 text-right">
                      {match?.cplCents != null ? `$${(match.cplCents / 100).toFixed(2)}` : '-'}
                    </span>
                  )
                })()}
              {slaStats &&
                slaStats.length > 0 &&
                (() => {
                  const match = slaStats.find(
                    (s) => s.channel === platform.channel || s.channelKey === platform.channel
                  )
                  return (
                    <>
                      <span
                        className="text-xs text-stone-500 w-10 text-right"
                        title="Avg response time"
                      >
                        {match?.avgResponseHours != null
                          ? `${match.avgResponseHours.toFixed(1)}h`
                          : '-'}
                      </span>
                      <span
                        className={`text-xs w-10 text-right ${
                          match
                            ? match.slaHitRate >= 80
                              ? 'text-emerald-400'
                              : match.slaHitRate >= 50
                                ? 'text-amber-400'
                                : 'text-red-400'
                            : 'text-stone-500'
                        }`}
                        title="SLA hit rate"
                      >
                        {match ? `${match.slaHitRate}%` : '-'}
                      </span>
                    </>
                  )
                })()}
            </div>
          </div>
        ))}
      </div>

      {analytics.platforms.length > 8 && (
        <p className="text-xs text-stone-500">+{analytics.platforms.length - 8} more sources</p>
      )}
    </div>
  )
}
