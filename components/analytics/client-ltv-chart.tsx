'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { DollarSign, Crown, Users } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientLTV {
  name: string
  ltvCents: number
  eventCount: number
}

interface ClientLTVChartProps {
  clients: ClientLTV[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClientLTVChart({ clients }: ClientLTVChartProps) {
  // Sort by LTV descending and take top 15
  const sortedClients = [...clients].sort((a, b) => b.ltvCents - a.ltvCents).slice(0, 15)

  // Summary calculations
  const totalLtvCents = clients.reduce((sum, c) => sum + c.ltvCents, 0)
  const avgLtvCents = clients.length > 0 ? Math.round(totalLtvCents / clients.length) : 0
  const topClient = sortedClients[0] || null

  // Chart data
  const chartData = sortedClients.map((c) => ({
    name: c.name.length > 15 ? c.name.slice(0, 13) + '...' : c.name,
    LTV: c.ltvCents / 100,
    Events: c.eventCount,
  }))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-950 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-100">
                {'$'}
                {(avgLtvCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-stone-500">Average LTV</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-lg bg-amber-950 flex items-center justify-center flex-shrink-0">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              {topClient ? (
                <>
                  <p className="text-lg font-bold text-stone-100 truncate">{topClient.name}</p>
                  <p className="text-xs text-stone-500">
                    Top Client: {'$'}
                    {(topClient.ltvCents / 100).toFixed(2)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-stone-400 italic">No data</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-lg bg-blue-950 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-100">
                {'$'}
                {(totalLtvCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-stone-500">Total Lifetime Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      {sortedClients.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by Lifetime Value</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                />
                <Tooltip
                  formatter={
                    ((value: number | undefined, name: string | undefined) => {
                      const v = value ?? 0
                      const n = name ?? ''
                      if (n === 'LTV') return [`${v.toLocaleString()}`, 'Lifetime Value']
                      return [v, n]
                    }) as any
                  }
                />
                <Bar dataKey="LTV" fill="#d47530" radius={[4, 4, 0, 0]} name="LTV" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-stone-400 italic text-center">
              No client LTV data available yet. Complete events to build lifetime value data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
