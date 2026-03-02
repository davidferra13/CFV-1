// Conversion Funnel Analytics — Inquiry → Quote → Booking → Completed
// Shows conversion rates, decline reasons, channel performance, response time

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { ConversionFunnel } from '@/components/analytics/conversion-funnel'
import {
  getInquiryFunnelStats,
  getDeclineReasonStats,
  getAvgInquiryResponseTime,
  getLeadTimeStats,
  getGhostRateStats,
} from '@/lib/analytics/pipeline-analytics'
import { getInquiries } from '@/lib/inquiries/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, TrendingUp, Ghost, XCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Conversion Funnel - ChefFlow',
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export default async function FunnelPage() {
  await requireChef()

  const [funnel, declineReasons, responseTime, leadTime, ghostRate, allInquiries] =
    await Promise.all([
      safe(getInquiryFunnelStats, {
        totalInquiries: 0,
        quotedCount: 0,
        confirmedCount: 0,
        completedCount: 0,
        declinedCount: 0,
        expiredCount: 0,
        quoteRate: 0,
        confirmRate: 0,
        completionRate: 0,
        overallConversionRate: 0,
      }),
      safe(getDeclineReasonStats, { reasons: [], totalDeclined: 0 }),
      safe(getAvgInquiryResponseTime, {
        avgHoursToFirstResponse: 0,
        under1hour: 0,
        under4hours: 0,
        under24hours: 0,
        over24hours: 0,
        under1hourPercent: 0,
        under4hoursPercent: 0,
      }),
      safe(getLeadTimeStats, {
        avgLeadTimeDays: 0,
        avgSalesCycleDays: 0,
        buckets: { under2weeks: 0, twoTo4weeks: 0, oneToThreeMonths: 0, over3months: 0 },
        bucketPercents: { under2weeks: 0, twoTo4weeks: 0, oneToThreeMonths: 0, over3months: 0 },
      }),
      safe(getGhostRateStats, { totalInquiries: 0, ghosted: 0, ghostRate: 0, avgDaysToGhost: 0 }),
      safe(getInquiries, []),
    ])

  // Channel breakdown
  const channelCounts = new Map<string, { total: number; converted: number }>()
  for (const inq of allInquiries) {
    const ch = inq.channel || 'unknown'
    const curr = channelCounts.get(ch) || { total: 0, converted: 0 }
    curr.total++
    if (inq.status === 'confirmed' || (inq as any).converted_to_event_id) {
      curr.converted++
    }
    channelCounts.set(ch, curr)
  }
  const channelBreakdown = Array.from(channelCounts.entries())
    .map(([channel, data]) => ({
      channel,
      total: data.total,
      converted: data.converted,
      rate: data.total > 0 ? Math.round((data.converted / data.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // Build funnel data for the visualization component
  const funnelData = [
    { stage: 'Inquiry', count: funnel.totalInquiries },
    { stage: 'Quote', count: funnel.quotedCount },
    { stage: 'Booking', count: funnel.confirmedCount },
    { stage: 'Completed', count: funnel.completedCount },
  ]

  const CHANNEL_LABELS: Record<string, string> = {
    website: 'Website',
    email: 'Email',
    phone: 'Phone',
    instagram: 'Instagram',
    take_a_chef: 'TakeAChef',
    yhangry: 'Yhangry',
    referral: 'Referral',
    walk_in: 'Walk-in',
    other: 'Other',
    unknown: 'Unknown',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/analytics"
          className="text-stone-400 hover:text-stone-100 transition-colors"
          aria-label="Back to Analytics"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Conversion Funnel</h1>
          <p className="text-stone-400 mt-1">Track how inquiries move through your pipeline</p>
        </div>
      </div>

      {/* Funnel Visualization */}
      {funnel.totalInquiries > 0 ? (
        <ConversionFunnel funnel={funnelData} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">
              No inquiry data yet. Funnel analytics will appear after you receive inquiries.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Response Time */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-950 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-stone-500">Avg Response Time</p>
                <p className="text-xl font-bold text-stone-100">
                  {responseTime.avgHoursToFirstResponse > 0
                    ? responseTime.avgHoursToFirstResponse < 1
                      ? `${Math.round(responseTime.avgHoursToFirstResponse * 60)}m`
                      : `${responseTime.avgHoursToFirstResponse}h`
                    : '--'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 text-xs text-stone-400">
              <span>{responseTime.under1hourPercent}% under 1h</span>
              <span className="text-stone-600">|</span>
              <span>{responseTime.under4hoursPercent}% under 4h</span>
            </div>
          </CardContent>
        </Card>

        {/* Overall Conversion */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-950 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-stone-500">Overall Conversion</p>
                <p className="text-xl font-bold text-stone-100">
                  {funnel.overallConversionRate > 0 ? `${funnel.overallConversionRate}%` : '--'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-stone-400">
              {funnel.completedCount} of {funnel.totalInquiries} inquiries converted
            </p>
          </CardContent>
        </Card>

        {/* Ghost Rate */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-950 flex items-center justify-center">
                <Ghost className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-stone-500">Ghost Rate</p>
                <p className="text-xl font-bold text-stone-100">
                  {ghostRate.ghostRate > 0 ? `${ghostRate.ghostRate}%` : '--'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-stone-400">
              {ghostRate.ghosted} expired{' '}
              {ghostRate.avgDaysToGhost > 0 && `(avg ${ghostRate.avgDaysToGhost}d)`}
            </p>
          </CardContent>
        </Card>

        {/* Avg Lead Time */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-950 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-stone-500">Avg Lead Time</p>
                <p className="text-xl font-bold text-stone-100">
                  {leadTime.avgLeadTimeDays > 0 ? `${leadTime.avgLeadTimeDays}d` : '--'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-stone-400">
              Sales cycle:{' '}
              {leadTime.avgSalesCycleDays > 0 ? `${leadTime.avgSalesCycleDays}d` : '--'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance + Decline Reasons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {channelBreakdown.length > 0 ? (
              <div className="space-y-3">
                {channelBreakdown.map((ch) => (
                  <div key={ch.channel} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-stone-100">
                        {CHANNEL_LABELS[ch.channel] || ch.channel}
                      </span>
                      <span className="text-xs text-stone-500">
                        ({ch.total} inquiry{ch.total !== 1 ? 'ies' : ''})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-stone-300">
                        {ch.converted} booked
                      </span>
                      <Badge
                        variant={ch.rate >= 30 ? 'success' : ch.rate >= 15 ? 'warning' : 'default'}
                      >
                        {ch.rate}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400 italic">No channel data yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Decline Reasons */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <CardTitle>Why Leads Are Lost</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {declineReasons.reasons.length > 0 ? (
              <div className="space-y-3">
                {declineReasons.reasons.slice(0, 8).map((r) => (
                  <div key={r.reason} className="flex items-center justify-between">
                    <span className="text-sm text-stone-100 capitalize">
                      {r.reason.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-400">{r.count}x</span>
                      <div className="w-20 h-2 rounded-full bg-stone-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-500"
                          style={{ width: `${Math.min(r.percent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-stone-500 w-10 text-right">{r.percent}%</span>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-stone-500 mt-2">
                  {declineReasons.totalDeclined} total declined inquiries
                </p>
              </div>
            ) : (
              <p className="text-sm text-stone-400 italic">
                No decline reasons recorded yet. Use the decline modal when turning down inquiries.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Time Distribution */}
      {leadTime.avgLeadTimeDays > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lead Time Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {[
                {
                  label: '< 2 weeks',
                  count: leadTime.buckets.under2weeks,
                  pct: leadTime.bucketPercents.under2weeks,
                },
                {
                  label: '2-4 weeks',
                  count: leadTime.buckets.twoTo4weeks,
                  pct: leadTime.bucketPercents.twoTo4weeks,
                },
                {
                  label: '1-3 months',
                  count: leadTime.buckets.oneToThreeMonths,
                  pct: leadTime.bucketPercents.oneToThreeMonths,
                },
                {
                  label: '3+ months',
                  count: leadTime.buckets.over3months,
                  pct: leadTime.bucketPercents.over3months,
                },
              ].map((b) => (
                <div key={b.label} className="text-center">
                  <p className="text-2xl font-bold text-stone-100">{b.count}</p>
                  <p className="text-xs text-stone-500">{b.label}</p>
                  <p className="text-xs text-stone-400">{b.pct}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
