'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  getReferralDashboard,
  getReferralSources,
  type ReferralDashboard as DashboardData,
  type ReferralStatus,
} from '@/lib/clients/referral-actions'
import { formatCurrency } from '@/lib/utils/currency'

const STATUS_COLORS: Record<ReferralStatus, string> = {
  pending: 'bg-stone-700 text-stone-300',
  contacted: 'bg-blue-900/40 text-blue-300',
  booked: 'bg-emerald-900/40 text-emerald-300',
  completed: 'bg-brand-900/40 text-brand-300',
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-stone-800/60 border border-stone-700 p-4">
      <p className="text-xs text-stone-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-stone-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-stone-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export function ReferralDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [sources, setSources] = useState<{ source: string; count: number }[]>([])
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const [dashData, srcData] = await Promise.all([
          getReferralDashboard(),
          getReferralSources(),
        ])
        setData(dashData)
        setSources(srcData)
        setLoadError(false)
      } catch {
        setLoadError(true)
      }
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loadError) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-400">Could not load referral data. Please try again.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-sm text-stone-500">Loading referral data...</p>
      </div>
    )
  }

  const avgRevenue =
    data.convertedReferrals > 0
      ? Math.round(data.totalRevenueFromReferralsCents / data.convertedReferrals)
      : 0

  const maxMonthlyCount = Math.max(...data.monthlyTrend.map((m) => m.count), 1)

  return (
    <div className="space-y-6">
      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Referrals" value={String(data.totalReferrals)} />
        <StatCard
          label="Conversion Rate"
          value={`${data.conversionRate}%`}
          sub={`${data.convertedReferrals} converted`}
        />
        <StatCard
          label="Revenue from Referrals"
          value={formatCurrency(data.totalRevenueFromReferralsCents)}
        />
        <StatCard label="Avg Revenue / Referral" value={formatCurrency(avgRevenue)} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top referrers */}
        <Card className="bg-stone-900 border-stone-800">
          <CardHeader>
            <CardTitle className="text-base text-stone-100">Top Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topReferrers.length === 0 ? (
              <p className="text-sm text-stone-500">No referrals yet.</p>
            ) : (
              <div className="space-y-2">
                {data.topReferrers.map((ref) => (
                  <Link
                    key={ref.clientId}
                    href={`/clients/${ref.clientId}`}
                    className="flex items-center justify-between p-2 rounded hover:bg-stone-800 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-200">{ref.clientName}</p>
                      <p className="text-xs text-stone-500">
                        {ref.referralCount} referral{ref.referralCount !== 1 ? 's' : ''} ·{' '}
                        {ref.referralCount > 0
                          ? Math.round((ref.convertedCount / ref.referralCount) * 100)
                          : 0}
                        % converted
                      </p>
                    </div>
                    <p className="text-sm font-medium text-emerald-400">
                      {formatCurrency(ref.revenueCents)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion funnel */}
        <Card className="bg-stone-900 border-stone-800">
          <CardHeader>
            <CardTitle className="text-base text-stone-100">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {data.totalReferrals === 0 ? (
              <p className="text-sm text-stone-500">No referrals yet.</p>
            ) : (
              <div className="space-y-3">
                {(['pending', 'contacted', 'booked', 'completed'] as ReferralStatus[]).map(
                  (status) => {
                    const count = data.recentReferrals.filter((r) => r.status === status).length
                    // Use total referrals for funnel percentage (all referrals, not just recent 20)
                    const allCount =
                      status === 'pending'
                        ? data.totalReferrals - data.convertedReferrals
                        : status === 'completed' || status === 'booked'
                          ? data.convertedReferrals
                          : count
                    const pct =
                      data.totalReferrals > 0
                        ? Math.round((allCount / data.totalReferrals) * 100)
                        : 0
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-stone-400 capitalize">{status}</span>
                          <span className="text-stone-500">{pct}%</span>
                        </div>
                        <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              status === 'completed'
                                ? 'bg-brand-500'
                                : status === 'booked'
                                  ? 'bg-emerald-500'
                                  : status === 'contacted'
                                    ? 'bg-blue-500'
                                    : 'bg-stone-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly trend (CSS bar chart) */}
        <Card className="bg-stone-900 border-stone-800">
          <CardHeader>
            <CardTitle className="text-base text-stone-100">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {data.monthlyTrend.map((m) => {
                const totalHeight = (m.count / maxMonthlyCount) * 100
                const convertedHeight = m.count > 0 ? (m.converted / m.count) * totalHeight : 0
                const monthLabel = m.month.split('-')[1]
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full relative rounded-t"
                      style={{ height: `${totalHeight}%`, minHeight: m.count > 0 ? '4px' : '0' }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-stone-600 rounded-t"
                        style={{ height: '100%' }}
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t"
                        style={{ height: `${convertedHeight}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-stone-600">{monthLabel}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-stone-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-stone-600" /> Total
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-emerald-500" /> Converted
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Referral sources */}
        <Card className="bg-stone-900 border-stone-800">
          <CardHeader>
            <CardTitle className="text-base text-stone-100">Referral Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-sm text-stone-500">No sources recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {sources.map((s) => {
                  const maxCount = sources[0]?.count ?? 1
                  const pct = Math.round((s.count / maxCount) * 100)
                  return (
                    <div key={s.source}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-stone-300">{s.source}</span>
                        <span className="text-stone-500">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent referrals table */}
      <Card className="bg-stone-900 border-stone-800">
        <CardHeader>
          <CardTitle className="text-base text-stone-100">Recent Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentReferrals.length === 0 ? (
            <p className="text-sm text-stone-500">No referrals yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-500 border-b border-stone-800">
                    <th className="pb-2 pr-4">Referrer</th>
                    <th className="pb-2 pr-4">Referred</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentReferrals.map((ref) => (
                    <tr key={ref.id} className="border-b border-stone-800/50 hover:bg-stone-800/30">
                      <td className="py-2 pr-4 text-stone-200">{ref.referringClientName}</td>
                      <td className="py-2 pr-4 text-stone-300">{ref.referredClientName}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[ref.status]}`}
                        >
                          {ref.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-stone-500 text-xs">
                        {new Date(ref.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-2 text-right text-stone-300">
                        {ref.revenueCents > 0 ? formatCurrency(ref.revenueCents) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
