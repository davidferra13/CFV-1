'use client'
import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  runCustomReport,
  type ReportConfig,
  type ReportDataPoint,
  type ChartType,
} from '@/lib/analytics/custom-report'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/currency'
import { Play, BarChart2 } from '@/components/ui/icons'
import { toast } from 'sonner'

const COLORS = ['#d47530', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899']

export function CustomReportBuilder() {
  const [config, setConfig] = useState<ReportConfig>({
    entity: 'events',
    metric: 'revenue',
    chartType: 'bar',
    groupBy: 'month',
    dateRange: 'last_6_months',
  })
  const [data, setData] = useState<ReportDataPoint[]>([])
  const [hasRun, setHasRun] = useState(false)
  const [isPending, startTransition] = useTransition()

  function updateConfig(key: keyof ReportConfig, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  function handleRun() {
    startTransition(async () => {
      try {
        const result = await runCustomReport(config)
        setData(result)
        setHasRun(true)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        toast.error(message)
      }
    })
  }

  const formatValue = (v: number) => (config.metric === 'count' ? v.toString() : formatCurrency(v))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Data Source</label>
              <select
                value={config.entity}
                onChange={(e) => updateConfig('entity', e.target.value)}
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="events">Events</option>
                <option value="expenses">Expenses</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Metric</label>
              <select
                value={config.metric}
                onChange={(e) => updateConfig('metric', e.target.value)}
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="revenue">Revenue</option>
                <option value="count">Count</option>
                <option value="average">Average</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Group By</label>
              <select
                value={config.groupBy}
                onChange={(e) => updateConfig('groupBy', e.target.value)}
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="month">Month</option>
                <option value="status">Status</option>
                <option value="occasion">Occasion</option>
                <option value="category">Category</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Date Range</label>
              <select
                value={config.dateRange}
                onChange={(e) => updateConfig('dateRange', e.target.value)}
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="last_3_months">Last 3 Months</option>
                <option value="last_6_months">Last 6 Months</option>
                <option value="last_12_months">Last 12 Months</option>
                <option value="ytd">Year to Date</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Chart Type</label>
              <select
                value={config.chartType}
                onChange={(e) => updateConfig('chartType', e.target.value as ChartType)}
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="table">Table</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleRun} loading={isPending}>
              <Play className="h-4 w-4 mr-1" />
              Run Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasRun && data.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500">No data for this configuration.</p>
          </CardContent>
        </Card>
      )}

      {hasRun && data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {config.chartType === 'bar' && (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                  <YAxis
                    tickFormatter={(v) =>
                      config.metric === 'count' ? String(v) : `$${(v / 100).toFixed(0)}`
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: number | undefined) =>
                      v != null ? [formatValue(v), config.metric] : ['-', config.metric]
                    }
                  />
                  <Bar dataKey="value" fill="#d47530" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {config.chartType === 'line' && (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                  <YAxis
                    tickFormatter={(v) =>
                      config.metric === 'count' ? String(v) : `$${(v / 100).toFixed(0)}`
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: number | undefined) =>
                      v != null ? [formatValue(v), config.metric] : ['-', config.metric]
                    }
                  />
                  <Line
                    dataKey="value"
                    stroke="#d47530"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#d47530' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            {config.chartType === 'pie' && (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={(props: PieLabelRenderProps) => {
                      const lbl = String(props.name ?? '')
                      const val = Number(props.value ?? 0)
                      return `${lbl}: ${formatValue(val)}`
                    }}
                    labelLine={true}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number | undefined) =>
                      v != null ? [formatValue(v), ''] : ['-', '']
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {config.chartType === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700">
                      <th className="text-left py-2 text-stone-400">Label</th>
                      <th className="text-right py-2 text-stone-400">Value</th>
                      <th className="text-right py-2 text-stone-400">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr key={i} className="border-b border-stone-800 hover:bg-stone-800">
                        <td className="py-2 font-medium">{row.label}</td>
                        <td className="py-2 text-right">{formatValue(row.value)}</td>
                        <td className="py-2 text-right text-stone-500">{row.count ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
