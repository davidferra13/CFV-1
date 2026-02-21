'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Mail, MousePointerClick, DollarSign, Send } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignStats {
  id: string
  name: string
  sentCount: number
  openCount: number
  clickCount: number
  revenueCents: number
}

interface CampaignPerformanceProps {
  campaigns: CampaignStats[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CampaignPerformance({ campaigns }: CampaignPerformanceProps) {
  // Aggregated stats
  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0)
  const totalOpens = campaigns.reduce((sum, c) => sum + c.openCount, 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clickCount, 0)
  const totalRevenueCents = campaigns.reduce((sum, c) => sum + c.revenueCents, 0)
  const avgOpenRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : '0.0'
  const avgClickRate = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0'

  // Chart data
  const chartData = campaigns.map(c => ({
    name: c.name.length > 20 ? c.name.slice(0, 18) + '...' : c.name,
    Opens: c.openCount,
    Clicks: c.clickCount,
    Revenue: c.revenueCents / 100,
  }))

  const formatDollars = (v: number) => (v ? `$${v.toFixed(0)}` : '')

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Send className="h-5 w-5 text-stone-500" />}
          label="Total Sent"
          value={totalSent.toLocaleString()}
        />
        <SummaryCard
          icon={<Mail className="h-5 w-5 text-blue-500" />}
          label="Avg Open Rate"
          value={`${avgOpenRate}%`}
        />
        <SummaryCard
          icon={<MousePointerClick className="h-5 w-5 text-amber-500" />}
          label="Avg Click Rate"
          value={`${avgClickRate}%`}
        />
        <SummaryCard
          icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
          label="Total Revenue"
          value={`$${(totalRevenueCents / 100).toFixed(2)}`}
        />
      </div>

      {/* Chart */}
      {campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatDollars}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                />
                <Tooltip
                  formatter={(value: number | undefined, name: string | undefined) => {
                    const v = value ?? 0
                    const n = name ?? ''
                    if (n === 'Revenue') return [`$${v.toFixed(2)}`, n]
                    return [v, n]
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="Opens" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="Clicks" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="Revenue" fill="#d47530" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-Campaign Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-sm text-stone-400 italic text-center py-8">
              No campaign data yet. Send your first campaign to see performance metrics.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-2 px-3 font-medium text-stone-600">Campaign</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-600">Sent</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-600">Opens</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-600">Open Rate</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-600">Clicks</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-600">CTR</th>
                    <th className="text-right py-2 px-3 font-medium text-stone-600">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(campaign => {
                    const openRate = campaign.sentCount > 0
                      ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1)
                      : '0.0'
                    const ctr = campaign.sentCount > 0
                      ? ((campaign.clickCount / campaign.sentCount) * 100).toFixed(1)
                      : '0.0'

                    return (
                      <tr key={campaign.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="py-2 px-3 font-medium text-stone-900">{campaign.name}</td>
                        <td className="py-2 px-3 text-right text-stone-700">{campaign.sentCount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-stone-700">{campaign.openCount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-stone-700">{openRate}%</td>
                        <td className="py-2 px-3 text-right text-stone-700">{campaign.clickCount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-stone-700">{ctr}%</td>
                        <td className="py-2 px-3 text-right font-medium text-stone-900">
                          ${(campaign.revenueCents / 100).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex-shrink-0">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-stone-900">{value}</p>
          <p className="text-xs text-stone-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
