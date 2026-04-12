'use client'

// Event Food Cost Insight - shows the relationship between menu cost and quoted price
// with operator-aware targets, warnings, and margin analysis.
// Renders on the event detail Money tab when a menu with cost data is attached.

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { CostingHelpPopover } from './costing-help-popover'
import { CostingWarningList } from './costing-warning-detail'
import { generateMenuWarnings } from '@/lib/costing/generate-warnings'
import { getTargetsForArchetype } from '@/lib/costing/knowledge'
import type { OperatorType } from '@/lib/costing/knowledge'
import { archetypeToOperatorType } from '@/lib/costing/knowledge'
import Link from 'next/link'

export interface MenuCostData {
  totalRecipeCostCents: number | null
  costPerGuestCents: number | null
  foodCostPercentage: number | null
  totalComponentCount: number | null
  hasAllRecipeCosts: boolean | null
}

interface Props {
  menuCost: MenuCostData
  quotedPriceCents: number | null
  guestCount: number | null
  archetype?: string | null
}

function getHealthColor(pct: number, low: number, high: number): string {
  if (pct < low) return 'text-green-400'
  if (pct <= high) return 'text-emerald-400'
  if (pct <= high + 10) return 'text-amber-400'
  return 'text-red-400'
}

function getHealthLabel(pct: number, low: number, high: number): string {
  if (pct < low) return 'Below target (strong margin)'
  if (pct <= high) return 'Within target'
  if (pct <= high + 10) return 'Above target'
  return 'Critically high'
}

function getHealthBadge(
  pct: number,
  low: number,
  high: number
): 'success' | 'warning' | 'error' | 'info' {
  if (pct < low) return 'success'
  if (pct <= high) return 'info'
  if (pct <= high + 10) return 'warning'
  return 'error'
}

export function EventFoodCostInsight({ menuCost, quotedPriceCents, guestCount, archetype }: Props) {
  const operatorType = archetypeToOperatorType(archetype ?? 'private-chef')
  const targets = getTargetsForArchetype(archetype ?? 'private-chef')

  const hasCostData = menuCost.totalRecipeCostCents != null && menuCost.totalRecipeCostCents > 0
  const hasPrice = quotedPriceCents != null && quotedPriceCents > 0

  if (!hasCostData) return null

  const foodCostCents = menuCost.totalRecipeCostCents!
  const foodCostPct = hasPrice ? Math.round((foodCostCents / quotedPriceCents!) * 1000) / 10 : null
  const marginCents = hasPrice ? quotedPriceCents! - foodCostCents : null
  const marginPct = hasPrice
    ? Math.round(((quotedPriceCents! - foodCostCents) / quotedPriceCents!) * 1000) / 10
    : null
  const effectiveGuests = Math.max(guestCount ?? 1, 1)
  const profitPerGuest = marginCents != null ? Math.round(marginCents / effectiveGuests) : null

  // Warnings from knowledge layer
  const warnings = generateMenuWarnings(
    {
      totalRecipeCostCents: menuCost.totalRecipeCostCents,
      costPerGuestCents: menuCost.costPerGuestCents,
      foodCostPercentage: menuCost.foodCostPercentage ?? foodCostPct,
      totalComponentCount: menuCost.totalComponentCount,
      hasAllRecipeCosts: menuCost.hasAllRecipeCosts,
    },
    operatorType
  )

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-300">Food Cost Analysis</h3>
            <CostingHelpPopover topic="food_cost_pct" operationType={operatorType} />
          </div>
          {foodCostPct != null && (
            <Badge
              variant={getHealthBadge(foodCostPct, targets.foodCostPctLow, targets.foodCostPctHigh)}
            >
              {getHealthLabel(foodCostPct, targets.foodCostPctLow, targets.foodCostPctHigh)}
            </Badge>
          )}
        </div>

        {/* Main metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Menu Cost */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Menu Cost</p>
            <p className="text-lg font-bold text-stone-200 mt-0.5">
              {formatCurrency(foodCostCents)}
            </p>
            {menuCost.costPerGuestCents != null && (
              <p className="text-xs text-stone-500">
                {formatCurrency(menuCost.costPerGuestCents)}/guest
              </p>
            )}
          </div>

          {/* Food Cost % */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Food Cost %</p>
            {foodCostPct != null ? (
              <>
                <p
                  className={`text-lg font-bold mt-0.5 ${getHealthColor(foodCostPct, targets.foodCostPctLow, targets.foodCostPctHigh)}`}
                >
                  {foodCostPct}%
                </p>
                <p className="text-xs text-stone-500">
                  Target: {targets.foodCostPctLow}-{targets.foodCostPctHigh}%
                </p>
              </>
            ) : (
              <p className="text-sm text-stone-500 mt-1">Set a quoted price</p>
            )}
          </div>

          {/* Gross Margin */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Gross Margin</p>
            {marginCents != null ? (
              <>
                <p
                  className={`text-lg font-bold mt-0.5 ${marginCents > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {formatCurrency(marginCents)}
                </p>
                <p className="text-xs text-stone-500">{marginPct}% of price</p>
              </>
            ) : (
              <p className="text-sm text-stone-500 mt-1">Set a quoted price</p>
            )}
          </div>

          {/* Profit per Guest */}
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide">Profit / Guest</p>
            {profitPerGuest != null ? (
              <>
                <p
                  className={`text-lg font-bold mt-0.5 ${profitPerGuest > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {formatCurrency(profitPerGuest)}
                </p>
                <p className="text-xs text-stone-500">{effectiveGuests} guests</p>
              </>
            ) : (
              <p className="text-sm text-stone-500 mt-1">Set a quoted price</p>
            )}
          </div>
        </div>

        {/* Visual bar: food cost as % of price */}
        {foodCostPct != null && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-stone-500">
              <span>Food Cost</span>
              <span>Margin</span>
            </div>
            <div className="h-3 rounded-full bg-stone-800 overflow-hidden flex">
              <div
                className={`h-full transition-all ${
                  foodCostPct > targets.foodCostPctHigh + 10
                    ? 'bg-red-500'
                    : foodCostPct > targets.foodCostPctHigh
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(foodCostPct, 100)}%` }}
              />
              <div className="h-full flex-1 bg-stone-700" />
            </div>
            <div className="flex justify-between text-[10px] text-stone-600">
              <span>{foodCostPct}%</span>
              <span>{marginPct}%</span>
            </div>
          </div>
        )}

        {/* Coverage note */}
        {menuCost.hasAllRecipeCosts === false && (
          <p className="text-xs text-amber-400">
            Not all menu components have recipe costs. This analysis is based on partial data.{' '}
            <Link href="/culinary/costing/recipe" className="underline hover:text-amber-300">
              Fix missing prices
            </Link>
          </p>
        )}

        {/* Warnings from knowledge layer */}
        {warnings.length > 0 && <CostingWarningList warnings={warnings} />}
      </CardContent>
    </Card>
  )
}
