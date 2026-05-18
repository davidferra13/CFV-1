'use client'

// Profitability Cockpit: unified event-level financial analysis panel.
// Shows cost breakdown, margin analysis, per-guest economics, food cost %,
// labor allocation, time breakdown, and prime cost in one cohesive view.
// Renders real data from closeout + costing domains; shows pending states
// when data is missing (never $0.00 or fake numbers).

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import type { ProfitabilityCockpitData } from '@/lib/finance/profitability-cockpit-actions'

// ── Helpers ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  food: 'bg-amber-500',
  labor: 'bg-blue-500',
  labor_expense: 'bg-blue-400',
  travel: 'bg-purple-500',
  overhead: 'bg-stone-500',
}

function marginColor(pct: number): string {
  if (pct >= 50) return 'text-green-400'
  if (pct >= 35) return 'text-emerald-400'
  if (pct >= 20) return 'text-amber-400'
  return 'text-red-400'
}

function marginBadge(pct: number): 'success' | 'info' | 'warning' | 'error' {
  if (pct >= 50) return 'success'
  if (pct >= 35) return 'info'
  if (pct >= 20) return 'warning'
  return 'error'
}

function foodCostBadge(
  rating: 'excellent' | 'good' | 'fair' | 'high'
): 'success' | 'info' | 'warning' | 'error' {
  switch (rating) {
    case 'excellent':
      return 'success'
    case 'good':
      return 'info'
    case 'fair':
      return 'warning'
    case 'high':
      return 'error'
  }
}

function primeCostColor(pct: number): string {
  if (pct <= 55) return 'text-green-400'
  if (pct <= 65) return 'text-emerald-400'
  if (pct <= 75) return 'text-amber-400'
  return 'text-red-400'
}

function fmt(cents: number): string {
  return formatCurrency(cents)
}

function fmtMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── Component ──────────────────────────────────────────────────────────

type Props = {
  data: ProfitabilityCockpitData
}

export function ProfitabilityCockpit({ data }: Props) {
  const { margin, costBreakdown, perGuest, foodCost, labor, timeBreakdown } = data

  // If no financial data at all, show guidance
  if (!data.hasFinancialData) {
    return (
      <Card>
        <CardContent className="py-6">
          <h3 className="text-sm font-semibold text-stone-300 mb-2">Profitability Cockpit</h3>
          <p className="text-sm text-stone-500">
            Log expenses and record payments to see your profitability analysis for this event.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-5">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-300">Profitability Cockpit</h3>
          <Badge variant={marginBadge(margin.grossMarginPercent)}>
            {margin.grossMarginPercent}% margin
          </Badge>
        </div>

        {/* ── 1. Margin Analysis (hero metrics) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCell
            label="Revenue"
            value={margin.revenueCents > 0 ? fmt(margin.revenueCents) : null}
            placeholder="No payments"
            color="text-stone-200"
          />
          <MetricCell
            label="Total Cost"
            value={margin.totalCostCents > 0 ? fmt(margin.totalCostCents) : null}
            placeholder="No expenses"
            color="text-stone-200"
          />
          <MetricCell
            label="Gross Profit"
            value={
              margin.revenueCents > 0 || margin.totalCostCents > 0
                ? fmt(margin.grossProfitCents)
                : null
            }
            placeholder="Pending"
            color={margin.grossProfitCents >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
          <MetricCell
            label="Gross Margin"
            value={margin.revenueCents > 0 ? `${margin.grossMarginPercent}%` : null}
            placeholder="Pending"
            color={marginColor(margin.grossMarginPercent)}
          />
        </div>

        {/* Effective hourly rate + prime cost row */}
        {(margin.effectiveHourlyRateCents || margin.primeCostPercent !== null) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {margin.effectiveHourlyRateCents && (
              <span className="text-stone-400">
                Effective rate:{' '}
                <span className="font-medium text-stone-200">
                  {fmt(margin.effectiveHourlyRateCents)}/hr
                </span>
              </span>
            )}
            {margin.primeCostPercent !== null && (
              <span className="text-stone-400">
                Prime cost:{' '}
                <span className={`font-medium ${primeCostColor(margin.primeCostPercent)}`}>
                  {margin.primeCostPercent}%
                </span>
                <span className="text-stone-600 ml-1">
                  (target: &lt;{data.operatorTargets.primeCostPctTarget}%)
                </span>
              </span>
            )}
            {data.estimatedCashbackCents > 0 && (
              <span className="text-emerald-400">
                Est. cashback: {fmt(data.estimatedCashbackCents)}
              </span>
            )}
          </div>
        )}

        {/* ── 2. Cost Breakdown ── */}
        {costBreakdown.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Cost Breakdown
            </h4>
            {/* Stacked bar */}
            {margin.totalCostCents > 0 && (
              <div className="h-4 rounded-full bg-stone-800 overflow-hidden flex">
                {costBreakdown.map((line) => {
                  const widthPct = (line.totalCents / margin.totalCostCents) * 100
                  if (widthPct < 1) return null
                  return (
                    <div
                      key={line.category}
                      className={`h-full ${CATEGORY_COLORS[line.category] || 'bg-stone-600'}`}
                      style={{ width: `${widthPct}%` }}
                      title={`${line.label}: ${fmt(line.totalCents)} (${widthPct.toFixed(0)}%)`}
                    />
                  )
                })}
              </div>
            )}
            {/* Line items */}
            <div className="space-y-1">
              {costBreakdown.map((line) => (
                <div key={line.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-sm ${CATEGORY_COLORS[line.category] || 'bg-stone-600'}`}
                    />
                    <span className="text-stone-300">{line.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-400">
                    <span className="font-medium text-stone-200">{fmt(line.totalCents)}</span>
                    {line.percentOfRevenue !== null && (
                      <span className="text-xs w-12 text-right">{line.percentOfRevenue}%</span>
                    )}
                    {line.perGuestCents !== null && (
                      <span className="text-xs w-16 text-right text-stone-500">
                        {fmt(line.perGuestCents)}/hd
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 3. Food Cost Percentage ── */}
        {(foodCost.foodCostCents > 0 || foodCost.recipeCostCents) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Food Cost
              </h4>
              <Badge variant={foodCostBadge(foodCost.rating)}>
                {foodCost.rating === 'excellent'
                  ? 'Excellent'
                  : foodCost.rating === 'good'
                    ? 'Good'
                    : foodCost.rating === 'fair'
                      ? 'Fair'
                      : 'High'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCell
                label="Food Spend"
                value={foodCost.foodCostCents > 0 ? fmt(foodCost.foodCostCents) : null}
                placeholder="No food expenses"
                color="text-stone-200"
              />
              <MetricCell
                label="Food Cost %"
                value={foodCost.foodCostPercent !== null ? `${foodCost.foodCostPercent}%` : null}
                placeholder="Set price first"
                color={
                  foodCost.foodCostPercent !== null
                    ? foodCost.foodCostPercent <= foodCost.targets.high
                      ? 'text-emerald-400'
                      : 'text-red-400'
                    : 'text-stone-500'
                }
                sub={`Target: ${foodCost.targets.low}-${foodCost.targets.high}%`}
              />
              {foodCost.recipeCostCents != null && (
                <MetricCell
                  label="Recipe Cost"
                  value={fmt(foodCost.recipeCostCents)}
                  color="text-stone-200"
                  sub={foodCost.recipeCostComplete ? 'Complete' : 'Partial'}
                />
              )}
              {foodCost.chefAvgFoodCostPercent !== null && (
                <MetricCell
                  label="Your Average"
                  value={`${foodCost.chefAvgFoodCostPercent}%`}
                  color="text-stone-300"
                  sub="Across events"
                />
              )}
            </div>
            {/* Food cost bar */}
            {foodCost.foodCostPercent !== null && (
              <div className="space-y-1">
                <div className="h-3 rounded-full bg-stone-800 overflow-hidden flex">
                  <div
                    className={`h-full transition-all ${
                      foodCost.foodCostPercent > foodCost.targets.high + 10
                        ? 'bg-red-500'
                        : foodCost.foodCostPercent > foodCost.targets.high
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(foodCost.foodCostPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-600">
                  <span>0%</span>
                  <span className="text-stone-500">{foodCost.targets.low}%</span>
                  <span className="text-stone-500">{foodCost.targets.high}%</span>
                  <span>100%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 4. Per-Guest Economics ── */}
        {perGuest && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Per Guest ({perGuest.guestCount} guests)
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <MiniMetric label="Revenue" value={fmt(perGuest.revenuePerGuestCents)} />
              <MiniMetric label="Total Cost" value={fmt(perGuest.costPerGuestCents)} />
              <MiniMetric label="Food" value={fmt(perGuest.foodCostPerGuestCents)} />
              <MiniMetric label="Labor" value={fmt(perGuest.laborCostPerGuestCents)} />
              <MiniMetric label="Overhead" value={fmt(perGuest.overheadPerGuestCents)} />
              <MiniMetric
                label="Profit"
                value={fmt(perGuest.profitPerGuestCents)}
                bold
                color={perGuest.profitPerGuestCents >= 0 ? 'text-emerald-400' : 'text-red-400'}
              />
            </div>
          </div>
        )}

        {/* ── 5. Labor Allocation ── */}
        {labor.entries.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Labor Allocation
              </h4>
              <div className="flex items-center gap-3 text-xs text-stone-500">
                {labor.laborPercentOfRevenue !== null && (
                  <span
                    className={
                      labor.laborPercentOfRevenue > 35
                        ? 'text-red-400'
                        : labor.laborPercentOfRevenue > 25
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                    }
                  >
                    {labor.laborPercentOfRevenue}% of revenue
                  </span>
                )}
                <span>{labor.totalHours.toFixed(1)}h total</span>
              </div>
            </div>
            <div className="space-y-1">
              {labor.entries.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-stone-300 truncate">{entry.staffName}</span>
                    <span className="text-stone-600 shrink-0">{entry.role}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-stone-500">
                      {entry.hours != null ? `${entry.hours}h` : '-'}
                    </span>
                    <span className="text-stone-300 font-medium w-16 text-right">
                      {fmt(entry.payCents)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-800 font-medium">
                <span className="text-stone-400">Total Staff Labor</span>
                <span className="text-stone-200">{fmt(labor.totalLaborCents)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── 6. Time Breakdown ── */}
        {timeBreakdown && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Time Invested
            </h4>
            <div className="flex flex-wrap gap-3 text-xs">
              {timeBreakdown.shoppingMinutes > 0 && (
                <TimeChip label="Shopping" minutes={timeBreakdown.shoppingMinutes} />
              )}
              {timeBreakdown.prepMinutes > 0 && (
                <TimeChip label="Prep" minutes={timeBreakdown.prepMinutes} />
              )}
              {timeBreakdown.travelMinutes > 0 && (
                <TimeChip label="Travel" minutes={timeBreakdown.travelMinutes} />
              )}
              {timeBreakdown.serviceMinutes > 0 && (
                <TimeChip label="Service" minutes={timeBreakdown.serviceMinutes} />
              )}
              {timeBreakdown.resetMinutes > 0 && (
                <TimeChip label="Cleanup" minutes={timeBreakdown.resetMinutes} />
              )}
              <span className="text-stone-400 font-medium">
                Total: {fmtMinutes(timeBreakdown.totalMinutes)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────

function MetricCell({
  label,
  value,
  placeholder,
  color,
  sub,
}: {
  label: string
  value: string | null
  placeholder?: string
  color?: string
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
      <p className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</p>
      {value != null ? (
        <>
          <p className={`text-lg font-bold mt-0.5 ${color || 'text-stone-200'}`}>{value}</p>
          {sub && <p className="text-xs text-stone-500">{sub}</p>}
        </>
      ) : (
        <p className="text-sm text-stone-600 mt-1">{placeholder || 'Pending'}</p>
      )}
    </div>
  )
}

function MiniMetric({
  label,
  value,
  bold,
  color,
}: {
  label: string
  value: string
  bold?: boolean
  color?: string
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-stone-600 uppercase">{label}</p>
      <p className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${color || 'text-stone-300'}`}>
        {value}
      </p>
    </div>
  )
}

function TimeChip({ label, minutes }: { label: string; minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-stone-800 px-2 py-0.5 text-stone-400">
      <span className="text-stone-500">{label}:</span>
      <span className="font-medium text-stone-300">{fmtMinutes(minutes)}</span>
    </span>
  )
}
