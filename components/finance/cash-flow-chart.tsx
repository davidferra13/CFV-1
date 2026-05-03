'use client'

import { useState, useTransition } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getCashFlowForecast, type CashFlowForecast } from '@/lib/finance/cash-flow-actions'
import { TrendingUp } from '@/components/ui/icons'
import { toast } from 'sonner'

type Props = {
  initialForecast: CashFlowForecast
}

function formatDollars(v: number) {
  return v ? `$${(v / 100).toFixed(0)}` : ''
}

function formatCents(cents: number): string {
  return `$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

export function CashFlowChart({ initialForecast }: Props) {
  const [forecast, setForecast] = useState(initialForecast)
  const [days, setDays] = useState<30 | 60 | 90>(30)
  const [isPending, startTransition] = useTransition()

  function handleChangeDays(d: 30 | 60 | 90) {
    const previousDays = days
    const previousForecast = forecast
    setDays(d)
    startTransition(async () => {
      try {
        const data = await getCashFlowForecast(d)
        setForecast(data)
      } catch (err) {
        setDays(previousDays)
        setForecast(previousForecast)
        toast.error('Failed to load cash flow forecast')
      }
    })
  }

  const chartData = forecast.periods.map((p) => ({
    label: p.label,
    'Confirmed In': p.confirmedIncomeCents,
    'Projected In': p.projectedIncomeCents,
    Expenses: -p.confirmedExpenseCents,
    Net: p.netCents,
  }))

  const totalNet =
    forecast.totalConfirmedInCents +
    forecast.totalProjectedInCents -
    forecast.totalConfirmedOutCents -
    forecast.totalProjectedOutCents

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Confirmed Revenue</p>
            <p className="text-xl font-semibold text-emerald-600">
              {formatCents(forecast.totalConfirmedInCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Projected Revenue</p>
            <p className="text-xl font-semibold text-brand-600">
              {formatCents(forecast.totalProjectedInCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Expenses</p>
            <p className="text-xl font-semibold text-red-600">
              {formatCents(forecast.totalConfirmedOutCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Net ({days}d)</p>
            <p
              className={`text-xl font-semibold ${totalNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {totalNet < 0 ? '-' : ''}
              {formatCents(totalNet)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {([30, 60, 90] as const).map((d) => (
          <Button
            key={d}
            size="sm"
            variant={days === d ? 'primary' : 'secondary'}
            onClick={() => handleChangeDays(d)}
            loading={isPending}
          >
            {d} Days
          </Button>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-stone-400" />
            Cash Flow Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} />
              <YAxis tickFormatter={formatDollars} tick={{ fontSize: 11, fill: '#78716c' }} />
              <Tooltip
                formatter={(v) => [
                  `$${(Math.abs(typeof v === 'number' ? v : 0) / 100).toLocaleString()}`,
                  '',
                ]}
              />
              <Legend />
              <Bar dataKey="Confirmed In" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Projected In" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.6} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line
                dataKey="Net"
                stroke="#d47530"
                strokeWidth={2}
                dot={{ fill: '#d47530', r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
