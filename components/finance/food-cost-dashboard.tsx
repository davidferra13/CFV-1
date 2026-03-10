'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getFoodCostToday,
  getFoodCostForPeriod,
  getFoodCostByCategory,
  getFoodCostTrend,
  getFoodCostByEvent,
  setFoodCostTarget,
} from '@/lib/finance/food-cost-actions'

type Period = 'today' | 'week' | 'month' | 'custom'

function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date()
  const end = now.toISOString().slice(0, 10)

  switch (period) {
    case 'today':
      return { start: end, end }
    case 'week': {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return { start: weekAgo.toISOString().slice(0, 10), end }
    }
    case 'month': {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      return { start: monthStart, end }
    }
    default:
      return { start: end, end }
  }
}

function getColorClass(percent: number, target: number): string {
  if (percent === 0) return 'text-stone-400'
  if (percent <= target - 3) return 'text-green-500'
  if (percent <= target) return 'text-yellow-500'
  return 'text-red-500'
}

function getColorBg(percent: number, target: number): string {
  if (percent === 0) return 'bg-stone-800'
  if (percent <= target - 3) return 'bg-green-950 border-green-800'
  if (percent <= target) return 'bg-yellow-950 border-yellow-800'
  return 'bg-red-950 border-red-800'
}

export function FoodCostDashboard() {
  const [isPending, startTransition] = useTransition()
  const [period, setPeriod] = useState<Period>('today')
  const [todayData, setTodayData] = useState<any>(null)
  const [periodData, setPeriodData] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [trend, setTrend] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [period])

  function loadData() {
    startTransition(async () => {
      try {
        setLoadError(null)
        const [today, cats, trendData, eventData] = await Promise.all([
          getFoodCostToday(),
          getFoodCostByCategory(),
          getFoodCostTrend(30),
          getFoodCostByEvent(),
        ])

        setTodayData(today)
        setCategories(cats)
        setTrend(trendData)
        setEvents(eventData)
        setTargetInput(String(today.targetPercent))

        if (period !== 'today') {
          const { start, end } = getDateRange(period)
          const pData = await getFoodCostForPeriod(start, end)
          setPeriodData(pData.totals)
        } else {
          setPeriodData(null)
        }
      } catch (err) {
        console.error('[FoodCostDashboard] Load error:', err)
        setLoadError('Could not load food cost data. Please refresh the page.')
      }
    })
  }

  function handleSaveTarget() {
    const val = parseInt(targetInput, 10)
    if (isNaN(val) || val < 1 || val > 100) return

    startTransition(async () => {
      try {
        const result = await setFoodCostTarget(val)
        if (result.success) {
          setEditingTarget(false)
          loadData()
        }
      } catch (err) {
        console.error('[FoodCostDashboard] Save target error:', err)
      }
    })
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950 p-6 text-center">
        <p className="text-sm text-red-400">{loadError}</p>
      </div>
    )
  }

  const displayData = periodData || todayData
  if (!displayData && !isPending) return null

  const currentPercent = displayData?.foodCostPercent ?? 0
  const targetPercent = displayData?.targetPercent ?? 30

  return (
    <div className="space-y-6">
      {/* Big Number */}
      <Card className={`p-6 border ${getColorBg(currentPercent, targetPercent)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-stone-400 mb-1">
              Food Cost %{' '}
              {period === 'today' ? '(Today)' : period === 'week' ? '(This Week)' : '(This Month)'}
            </p>
            <p className={`text-5xl font-bold ${getColorClass(currentPercent, targetPercent)}`}>
              {currentPercent}%
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-stone-400">
              <span>Spend: {formatCurrency(displayData?.spendCents ?? 0)}</span>
              <span>Revenue: {formatCurrency(displayData?.revenueCents ?? 0)}</span>
            </div>
          </div>
          <div className="text-right">
            {editingTarget ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="w-16 rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm text-stone-100"
                />
                <span className="text-stone-400 text-sm">%</span>
                <Button variant="ghost" onClick={handleSaveTarget} disabled={isPending}>
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setEditingTarget(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setEditingTarget(true)}
                className="text-sm text-stone-400 hover:text-stone-200"
              >
                Target: {targetPercent}%
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <Button key={p} variant={period === p ? 'primary' : 'ghost'} onClick={() => setPeriod(p)}>
            {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
          </Button>
        ))}
      </div>

      {/* 30-Day Trend */}
      {trend.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3">30-Day Trend</h3>
          <div className="flex items-end gap-1 h-32">
            {trend.map((d, i) => {
              const maxPercent = Math.max(...trend.map((t) => t.foodCostPercent), 1)
              const height = (d.foodCostPercent / maxPercent) * 100
              const color =
                d.foodCostPercent === 0
                  ? 'bg-stone-700'
                  : d.foodCostPercent <= targetPercent - 3
                    ? 'bg-green-600'
                    : d.foodCostPercent <= targetPercent
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
              return (
                <div
                  key={i}
                  className="flex-1 group relative"
                  title={`${d.date}: ${d.foodCostPercent}%`}
                >
                  <div
                    className={`${color} rounded-t min-h-[2px] transition-all`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-stone-500 mt-1">
            <span>{trend[0]?.date}</span>
            <span>{trend[trend.length - 1]?.date}</span>
          </div>
          {/* Target line indicator */}
          <p className="text-xs text-stone-500 mt-2">
            Target: {targetPercent}% (green = below target, yellow = near target, red = above)
          </p>
        </Card>
      )}

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3">
            Category Breakdown (This Month)
          </h3>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-300">{cat.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-stone-800 rounded-full h-2">
                    <div
                      className="bg-brand-600 h-2 rounded-full"
                      style={{ width: `${Math.min(cat.percentageOfTotal, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-stone-400 w-20 text-right">
                    {formatCurrency(cat.spendCents)}
                  </span>
                  <span className="text-xs text-stone-500 w-12 text-right">
                    {cat.percentageOfTotal}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Per-Event Drill Down */}
      {events.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3">Food Cost by Event</h3>
          <div className="space-y-2">
            {events.slice(0, 10).map((evt) => (
              <div
                key={evt.eventId}
                className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
              >
                <div>
                  <p className="text-sm text-stone-200">{evt.occasion}</p>
                  <p className="text-xs text-stone-500">{evt.eventDate}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-medium ${getColorClass(evt.foodCostPercentage, targetPercent)}`}
                  >
                    {evt.foodCostPercentage}%
                  </p>
                  <p className="text-xs text-stone-500">
                    {formatCurrency(evt.totalExpensesCents)} / {formatCurrency(evt.netRevenueCents)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!isPending && trend.length === 0 && categories.length === 0 && events.length === 0 && (
        <Card className="p-6 text-center border-dashed">
          <p className="text-sm text-stone-400">
            No food cost data yet. Once you record expenses in the food categories (groceries,
            alcohol, specialty items) and have revenue from events, your food cost tracking will
            appear here.
          </p>
        </Card>
      )}
    </div>
  )
}
