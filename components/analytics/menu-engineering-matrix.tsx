'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Star,
  TrendingDown,
  HelpCircle,
  Zap,
  ArrowUpDown,
  Lightbulb,
  Calculator,
  BarChart3,
} from 'lucide-react'
import {
  getMenuEngineering,
  getMenuEngineeringRecommendations,
  getMenuPriceImpact,
} from '@/lib/analytics/menu-engineering-actions'
import type {
  MenuEngineeringResult,
  MenuEngineeringItem,
  MenuRecommendation,
  MenuQuadrant,
  PriceImpactResult,
} from '@/lib/analytics/menu-engineering-actions'

// ─── Constants ───────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
]

const QUADRANT_CONFIG: Record<
  MenuQuadrant,
  { label: string; color: string; bgColor: string; dotColor: string; icon: typeof Star }
> = {
  star: {
    label: 'Star',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    dotColor: '#16a34a',
    icon: Star,
  },
  plowhorse: {
    label: 'Plow Horse',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    dotColor: '#d97706',
    icon: Zap,
  },
  puzzle: {
    label: 'Puzzle',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    dotColor: '#2563eb',
    icon: HelpCircle,
  },
  dog: {
    label: 'Dog',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    dotColor: '#dc2626',
    icon: TrendingDown,
  },
}

type SortField =
  | 'dishName'
  | 'unitsSold'
  | 'revenueCents'
  | 'foodCostCents'
  | 'profitCents'
  | 'profitMarginPercent'
  | 'quadrant'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MenuEngineeringMatrix() {
  const [period, setPeriod] = useState(30)
  const [data, setData] = useState<MenuEngineeringResult | null>(null)
  const [recommendations, setRecommendations] = useState<MenuRecommendation[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Table state
  const [sortField, setSortField] = useState<SortField>('profitCents')
  const [sortAsc, setSortAsc] = useState(false)
  const [quadrantFilter, setQuadrantFilter] = useState<MenuQuadrant | 'all'>('all')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  // Price simulator state
  const [simItem, setSimItem] = useState<string>('')
  const [simPrice, setSimPrice] = useState<string>('')
  const [simResult, setSimResult] = useState<PriceImpactResult | null>(null)
  const [isSimulating, startSimTransition] = useTransition()

  const loadData = useCallback((days: number) => {
    setError(null)
    startTransition(async () => {
      try {
        const [engineeringResult, recs] = await Promise.all([
          getMenuEngineering(days),
          getMenuEngineeringRecommendations(days),
        ])
        setData(engineeringResult)
        setRecommendations(recs)
      } catch (err) {
        console.error('[MenuEngineering] Failed to load:', err)
        setError('Could not load menu engineering data. Please try again.')
        setData(null)
        setRecommendations([])
      }
    })
  }, [])

  useEffect(() => {
    loadData(period)
  }, [period, loadData])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const handleSimulate = () => {
    if (!simItem || !simPrice) return
    const priceCents = Math.round(parseFloat(simPrice) * 100)
    if (isNaN(priceCents) || priceCents <= 0) return

    startSimTransition(async () => {
      try {
        const result = await getMenuPriceImpact(simItem, priceCents)
        setSimResult(result)
      } catch (err) {
        console.error('[MenuEngineering] Simulation failed:', err)
        setSimResult(null)
      }
    })
  }

  // Sort and filter items
  const sortedItems = data?.items
    ? [...data.items]
        .filter((i) => quadrantFilter === 'all' || i.quadrant === quadrantFilter)
        .sort((a, b) => {
          const aVal = a[sortField]
          const bVal = b[sortField]
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
          }
          return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
        })
    : []

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => loadData(period)}
            className="mt-3 text-sm text-violet-600 hover:text-violet-700 underline"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    )
  }

  if (isPending && !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-stone-500">Loading menu engineering data...</p>
        </CardContent>
      </Card>
    )
  }

  if (data?.status === 'insufficient_data') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">Not enough data yet</p>
          <p className="text-sm text-stone-400 mt-1">
            Complete some events with menus to see your menu engineering matrix.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  // Calculate quadrant counts
  const quadrantCounts: Record<MenuQuadrant, number> = {
    star: 0,
    plowhorse: 0,
    puzzle: 0,
    dog: 0,
  }
  for (const item of data.items) {
    quadrantCounts[item.quadrant]++
  }

  // Scatter plot dimensions
  const PLOT_W = 100
  const PLOT_H = 100

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === opt.value
                ? 'bg-violet-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {isPending && <span className="text-xs text-stone-400 ml-2">Updating...</span>}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-stone-900">{data.items.length}</p>
            <p className="text-xs text-stone-500">Items Analyzed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-stone-900">{data.avgProfitMarginPercent}%</p>
            <p className="text-xs text-stone-500">Avg Margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {data.topPerformer ? data.topPerformer.substring(0, 20) : 'N/A'}
            </p>
            <p className="text-xs text-stone-500">Top Performer</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {data.worstPerformer ? data.worstPerformer.substring(0, 20) : 'N/A'}
            </p>
            <p className="text-xs text-stone-500">Lowest Performer</p>
          </CardContent>
        </Card>
      </div>

      {/* Scatter Plot Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Menu Engineering Matrix</CardTitle>
          <p className="text-xs text-stone-400">
            Each circle is a menu item. Size represents revenue. Position shows popularity (X) vs
            profit margin (Y).
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative w-full" style={{ paddingBottom: '70%' }}>
            <div className="absolute inset-0">
              {/* Quadrant backgrounds */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                {/* Top-left: Puzzle (blue) */}
                <div className="bg-blue-50/50 border-r border-b border-stone-200 relative">
                  <span className="absolute top-2 left-2 text-xs font-medium text-blue-600 opacity-60">
                    Puzzles
                  </span>
                </div>
                {/* Top-right: Star (green) */}
                <div className="bg-green-50/50 border-b border-stone-200 relative">
                  <span className="absolute top-2 right-2 text-xs font-medium text-green-600 opacity-60">
                    Stars
                  </span>
                </div>
                {/* Bottom-left: Dog (red) */}
                <div className="bg-red-50/50 border-r border-stone-200 relative">
                  <span className="absolute bottom-2 left-2 text-xs font-medium text-red-600 opacity-60">
                    Dogs
                  </span>
                </div>
                {/* Bottom-right: Plowhorse (amber) */}
                <div className="bg-amber-50/50 relative">
                  <span className="absolute bottom-2 right-2 text-xs font-medium text-amber-600 opacity-60">
                    Plow Horses
                  </span>
                </div>
              </div>

              {/* Axis labels */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-stone-500">
                Popularity (% of total units) &rarr;
              </div>
              <div
                className="absolute -left-6 top-1/2 -translate-y-1/2 text-xs text-stone-500"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(50%)' }}
              >
                Profit Margin % &rarr;
              </div>

              {/* Average lines */}
              <div
                className="absolute border-l border-dashed border-stone-400 top-0 bottom-0"
                style={{ left: '50%' }}
              />
              <div
                className="absolute border-t border-dashed border-stone-400 left-0 right-0"
                style={{ top: '50%' }}
              />

              {/* Data points */}
              {data.items.map((item) => {
                // Normalize positions
                const maxPop = Math.max(...data.items.map((i) => i.popularityPercent), 1)
                const maxMargin = Math.max(...data.items.map((i) => i.profitMarginPercent), 1)
                const maxRev = Math.max(...data.items.map((i) => i.revenueCents), 1)

                const x = (item.popularityPercent / maxPop) * 90 + 5
                const y = 95 - (item.profitMarginPercent / maxMargin) * 90
                const size = Math.max(16, Math.min(48, (item.revenueCents / maxRev) * 48))

                const config = QUADRANT_CONFIG[item.quadrant]
                const isSelected = selectedItem === item.dishName

                return (
                  <button
                    key={item.dishName}
                    className="absolute rounded-full transition-all duration-200 hover:scale-125 hover:z-20 flex items-center justify-center cursor-pointer"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: config.dotColor,
                      opacity: isSelected ? 1 : 0.75,
                      transform: `translate(-50%, -50%)${isSelected ? ' scale(1.3)' : ''}`,
                      zIndex: isSelected ? 30 : 10,
                      border: isSelected ? '2px solid white' : 'none',
                      boxShadow: isSelected
                        ? `0 0 0 2px ${config.dotColor}, 0 2px 8px rgba(0,0,0,0.2)`
                        : '0 1px 3px rgba(0,0,0,0.15)',
                    }}
                    onClick={() =>
                      setSelectedItem(selectedItem === item.dishName ? null : item.dishName)
                    }
                    title={`${item.dishName}: ${item.profitMarginPercent}% margin, ${item.popularityPercent}% popularity`}
                  >
                    {size >= 24 && (
                      <span className="text-white text-[8px] font-bold truncate px-0.5">
                        {item.dishName.substring(0, 3)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected item detail */}
          {selectedItem && (
            <div className="mt-8 p-4 bg-stone-50 rounded-lg border border-stone-200">
              {(() => {
                const item = data.items.find((i) => i.dishName === selectedItem)
                if (!item) return null
                const config = QUADRANT_CONFIG[item.quadrant]
                const Icon = config.icon
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className="font-semibold text-stone-900">{item.dishName}</span>
                      <Badge
                        variant={
                          item.quadrant === 'star'
                            ? 'success'
                            : item.quadrant === 'dog'
                              ? 'error'
                              : item.quadrant === 'puzzle'
                                ? 'info'
                                : 'warning'
                        }
                      >
                        {config.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-stone-500">Units Sold</p>
                        <p className="font-medium">{item.unitsSold}</p>
                      </div>
                      <div>
                        <p className="text-stone-500">Revenue</p>
                        <p className="font-medium">{formatCents(item.revenueCents)}</p>
                      </div>
                      <div>
                        <p className="text-stone-500">Food Cost</p>
                        <p className="font-medium">{formatCents(item.foodCostCents)}</p>
                      </div>
                      <div>
                        <p className="text-stone-500">Profit</p>
                        <p className="font-medium">{formatCents(item.profitCents)}</p>
                      </div>
                      <div>
                        <p className="text-stone-500">Margin</p>
                        <p className="font-medium">{item.profitMarginPercent}%</p>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Item Breakdown</CardTitle>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setQuadrantFilter('all')}
                className={`min-h-[36px] px-3 py-1.5 rounded text-xs font-medium ${
                  quadrantFilter === 'all'
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All ({data.items.length})
              </button>
              {(['star', 'plowhorse', 'puzzle', 'dog'] as MenuQuadrant[]).map((q) => {
                const config = QUADRANT_CONFIG[q]
                return (
                  <button
                    key={q}
                    onClick={() => setQuadrantFilter(quadrantFilter === q ? 'all' : q)}
                    className={`min-h-[36px] px-3 py-1.5 rounded text-xs font-medium ${
                      quadrantFilter === q
                        ? `${config.bgColor} ${config.color} ring-1 ring-current`
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {config.label} ({quadrantCounts[q]})
                  </button>
                )
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  {[
                    { key: 'dishName' as SortField, label: 'Item' },
                    { key: 'unitsSold' as SortField, label: 'Units' },
                    { key: 'revenueCents' as SortField, label: 'Revenue' },
                    { key: 'foodCostCents' as SortField, label: 'Food Cost' },
                    { key: 'profitCents' as SortField, label: 'Profit' },
                    { key: 'profitMarginPercent' as SortField, label: 'Margin %' },
                    { key: 'quadrant' as SortField, label: 'Quadrant' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="text-left py-2 px-3 text-stone-500 font-medium cursor-pointer hover:text-stone-700 whitespace-nowrap"
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const config = QUADRANT_CONFIG[item.quadrant]
                  const Icon = config.icon
                  return (
                    <tr
                      key={item.dishName}
                      className={`border-b border-stone-100 hover:bg-stone-50 cursor-pointer ${
                        selectedItem === item.dishName ? 'bg-violet-50' : ''
                      }`}
                      onClick={() =>
                        setSelectedItem(selectedItem === item.dishName ? null : item.dishName)
                      }
                    >
                      <td className="py-2.5 px-3 font-medium text-stone-900">{item.dishName}</td>
                      <td className="py-2.5 px-3 text-stone-700">{item.unitsSold}</td>
                      <td className="py-2.5 px-3 text-stone-700">
                        {formatCents(item.revenueCents)}
                      </td>
                      <td className="py-2.5 px-3 text-stone-700">
                        {formatCents(item.foodCostCents)}
                      </td>
                      <td className="py-2.5 px-3 text-stone-700">
                        {formatCents(item.profitCents)}
                      </td>
                      <td className="py-2.5 px-3 text-stone-700">{item.profitMarginPercent}%</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {sortedItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400">
                      No items match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base">Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, i) => {
                const config = QUADRANT_CONFIG[rec.quadrant]
                const Icon = config.icon
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${config.bgColor} border-stone-200`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className="font-medium text-stone-900 text-sm">{rec.itemName}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}
                      >
                        {rec.action}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 ml-6">{rec.detail}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Simulator */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-violet-500" />
            <CardTitle className="text-base">Price Impact Simulator</CardTitle>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            See how a price change would affect an item's quadrant placement.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="block text-sm text-stone-600 mb-1">Item</label>
              <select
                value={simItem}
                onChange={(e) => {
                  setSimItem(e.target.value)
                  setSimResult(null)
                }}
                className="w-full min-h-[44px] rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select an item...</option>
                {data.items.map((item) => (
                  <option key={item.dishName} value={item.dishName}>
                    {item.dishName}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-40">
              <label className="block text-sm text-stone-600 mb-1">New Price (per unit)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={simPrice}
                  onChange={(e) => {
                    setSimPrice(e.target.value)
                    setSimResult(null)
                  }}
                  placeholder="0.00"
                  className="w-full min-h-[44px] rounded-lg border border-stone-300 pl-7 pr-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleSimulate}
              disabled={!simItem || !simPrice || isSimulating}
              className="min-h-[44px] px-6 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSimulating ? 'Simulating...' : 'Simulate'}
            </button>
          </div>

          {simResult && (
            <div className="mt-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-stone-500">Current Price</p>
                  <p className="font-medium">{formatCents(simResult.currentPriceCents)}</p>
                </div>
                <div>
                  <p className="text-stone-500">New Price</p>
                  <p className="font-medium">{formatCents(simResult.newPriceCents)}</p>
                </div>
                <div>
                  <p className="text-stone-500">Current Margin</p>
                  <p className="font-medium">{simResult.currentMarginPercent}%</p>
                </div>
                <div>
                  <p className="text-stone-500">New Margin</p>
                  <p className="font-medium">{simResult.newMarginPercent}%</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${QUADRANT_CONFIG[simResult.currentQuadrant].bgColor} ${QUADRANT_CONFIG[simResult.currentQuadrant].color}`}
                >
                  {QUADRANT_CONFIG[simResult.currentQuadrant].label}
                </span>
                <span className="text-stone-400">&rarr;</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${QUADRANT_CONFIG[simResult.newQuadrant].bgColor} ${QUADRANT_CONFIG[simResult.newQuadrant].color}`}
                >
                  {QUADRANT_CONFIG[simResult.newQuadrant].label}
                </span>
                {simResult.quadrantChanged && <Badge variant="warning">Quadrant Change</Badge>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
