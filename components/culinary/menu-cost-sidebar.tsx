'use client'

// MenuCostSidebar - Live cost display with margin alerts + costing gap warnings
// Shows food cost %, cost per guest, total cost, margin alerts, and data quality gaps (A1, A2)
// Reads from server actions, no AI

import { useEffect, useRef, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { checkMenuMargins, getMenuVendorHints } from '@/lib/menus/menu-intelligence-actions'
import type { MarginAlert, MenuVendorHint } from '@/lib/menus/menu-intelligence-actions'
import { getMenuCostingGaps } from '@/lib/menus/actions'
import type { CostingGap } from '@/lib/menus/actions'
import { formatCurrency } from '@/lib/utils/currency'

interface MenuCostSidebarProps {
  menuId: string
  className?: string
  vendorHintsEnabled?: boolean
}

function formatCentsOrNA(cents: number | null): string {
  if (cents === null) return 'N/A'
  return formatCurrency(cents)
}

function getAlertBadgeVariant(level: string): 'success' | 'warning' | 'error' {
  if (level === 'critical') return 'error'
  if (level === 'warning') return 'warning'
  return 'success'
}

function getFoodCostColor(pct: number | null): string {
  if (pct === null) return 'text-stone-400'
  if (pct > 45) return 'text-red-400'
  if (pct > 35) return 'text-amber-400'
  if (pct > 30) return 'text-yellow-400'
  return 'text-emerald-400'
}

export function MenuCostSidebar({
  menuId,
  className = '',
  vendorHintsEnabled = true,
}: MenuCostSidebarProps) {
  const [isPending, startTransition] = useTransition()
  const [costData, setCostData] = useState<{
    totalCostCents: number | null
    costPerGuestCents: number | null
    foodCostPercent: number | null
    hasAllPrices: boolean
    componentCount: number
    oldestPriceDaysAgo: number | null
  } | null>(null)
  const [alerts, setAlerts] = useState<MarginAlert[]>([])
  const [vendorHints, setVendorHints] = useState<MenuVendorHint[]>([])
  const [gaps, setGaps] = useState<CostingGap | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchCost = () => {
    startTransition(async () => {
      try {
        const [result, hints, costingGaps] = await Promise.all([
          checkMenuMargins(menuId),
          vendorHintsEnabled ? getMenuVendorHints(menuId).catch(() => []) : Promise.resolve([]),
          getMenuCostingGaps(menuId).catch(() => null),
        ])
        setCostData(result.costBreakdown)
        setAlerts(result.alerts)
        setVendorHints(hints)
        setGaps(costingGaps)
        setLoadError(null)
      } catch (err) {
        console.error('[MenuCostSidebar] Failed to load:', err)
        setLoadError('Could not load cost data')
      }
    })
  }

  // Initial load
  useEffect(() => {
    fetchCost()
  }, [menuId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live cost: re-fetch 600ms after any menu mutation (add/remove dish or component)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const handler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchCost(), 600)
    }
    window.addEventListener('menu:mutated', handler)
    return () => {
      window.removeEventListener('menu:mutated', handler)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [menuId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) {
    return (
      <div className={`rounded-lg border border-red-500/30 bg-red-500/10 p-4 ${className}`}>
        <p className="text-sm text-red-300">{loadError}</p>
      </div>
    )
  }

  if (!costData && isPending) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-stone-700 rounded w-3/4" />
          <div className="h-8 bg-stone-700 rounded w-1/2" />
          <div className="h-4 bg-stone-700 rounded w-full" />
        </div>
      </div>
    )
  }

  if (!costData) return null

  // Empty menu: show guidance instead of $0.00 values
  if (costData.componentCount === 0) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
        <h3 className="text-sm font-medium text-stone-300 mb-2">Cost Summary</h3>
        <p className="text-xs text-stone-500">
          Add dishes and link recipes to see live cost tracking, food cost %, and margin alerts.
        </p>
      </div>
    )
  }

  const foodCostColor = getFoodCostColor(costData.foodCostPercent)

  return (
    <div
      className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300">Cost Summary</h3>
        {isPending && <span className="text-xs text-stone-500">Updating...</span>}
      </div>

      {/* Food Cost Percentage - the hero metric */}
      <div className="text-center py-2">
        <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Food Cost</p>
        <p className={`text-3xl font-bold ${foodCostColor}`}>
          {costData.foodCostPercent !== null
            ? `${!costData.hasAllPrices ? '≥ ' : ''}${costData.foodCostPercent.toFixed(1)}%`
            : 'N/A'}
        </p>
        <p className="text-xs text-stone-500 mt-1">
          {costData.foodCostPercent !== null && !costData.hasAllPrices
            ? 'Minimum estimate (missing prices)'
            : 'Target: 25-30%'}
        </p>
      </div>

      {/* Cost metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-stone-900/50 rounded-lg p-3">
          <p className="text-xs text-stone-500">Total Cost</p>
          <p className="text-sm font-medium text-stone-200">
            {!costData.hasAllPrices && costData.totalCostCents !== null ? '≥ ' : ''}
            {formatCentsOrNA(costData.totalCostCents)}
          </p>
          {!costData.hasAllPrices && costData.totalCostCents !== null && (
            <p className="text-xxs text-amber-400/70 mt-0.5">minimum (gaps below)</p>
          )}
        </div>
        <div className="bg-stone-900/50 rounded-lg p-3">
          <p className="text-xs text-stone-500">Per Guest</p>
          <p className="text-sm font-medium text-stone-200">
            {!costData.hasAllPrices && costData.costPerGuestCents !== null ? '≥ ' : ''}
            {formatCentsOrNA(costData.costPerGuestCents)}
          </p>
        </div>
      </div>

      {/* Component count + price freshness */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>{costData.componentCount} components</span>
        {costData.oldestPriceDaysAgo !== null && costData.oldestPriceDaysAgo > 90 && (
          <span className="text-amber-400/80">prices up to {costData.oldestPriceDaysAgo}d old</span>
        )}
      </div>

      {/* A2: Components with no recipe - cost excluded silently without this warning */}
      {gaps && gaps.unrecipedComponents.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="warning">{gaps.unrecipedComponents.length} unlinked</Badge>
            <span className="text-xs text-amber-300 font-medium">No recipe attached</span>
          </div>
          <p className="text-xs text-amber-200/70">
            These components are excluded from the cost total:
          </p>
          <ul className="text-xs text-amber-200/60 space-y-0.5 pl-2">
            {gaps.unrecipedComponents.slice(0, 5).map((c) => (
              <li key={c.componentId} className="truncate">
                {c.courseName}: {c.componentName}
              </li>
            ))}
            {gaps.unrecipedComponents.length > 5 && (
              <li className="text-amber-200/40">+{gaps.unrecipedComponents.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* A1: Recipes with missing ingredient prices - cost is understated */}
      {gaps && gaps.recipesWithMissingPrices.length > 0 && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="warning">
              {gaps.recipesWithMissingPrices.reduce((s, r) => s + r.missingCount, 0)} missing
            </Badge>
            <span className="text-xs text-orange-300 font-medium">Unpriced ingredients</span>
          </div>
          <p className="text-xs text-orange-200/70">
            Cost total is understated. Set prices to fix:
          </p>
          <ul className="text-xs text-orange-200/60 space-y-0.5 pl-2">
            {gaps.recipesWithMissingPrices.slice(0, 4).map((r) => (
              <li key={r.recipeId} className="truncate">
                {r.recipeName}: {r.missingCount}/{r.totalIngredients} ingredients unpriced
              </li>
            ))}
            {gaps.recipesWithMissingPrices.length > 4 && (
              <li className="text-orange-200/40">
                +{gaps.recipesWithMissingPrices.length - 4} more recipes
              </li>
            )}
          </ul>
        </div>
      )}

      {/* A6: Unit mismatches - recipe unit vs price unit */}
      {gaps && gaps.unitMismatches.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="warning">{gaps.unitMismatches.length} mismatch</Badge>
            <span className="text-xs text-yellow-300 font-medium">Unit mismatch</span>
          </div>
          <p className="text-xs text-yellow-200/70">
            Recipe unit differs from price unit. Cost math may be wrong:
          </p>
          <ul className="text-xs text-yellow-200/60 space-y-0.5 pl-2">
            {gaps.unitMismatches.slice(0, 5).map((m, i) => (
              <li key={i} className="truncate">
                {m.ingredientName}: {m.recipeUnit} vs {m.priceUnit}
              </li>
            ))}
            {gaps.unitMismatches.length > 5 && (
              <li className="text-yellow-200/40">+{gaps.unitMismatches.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Margin alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-xs ${
                alert.level === 'critical'
                  ? 'border border-red-500/30 bg-red-500/10 text-red-300'
                  : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
              role="alert"
            >
              <span className="font-medium">
                {alert.level === 'critical' ? 'Critical' : 'Warning'}:
              </span>{' '}
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Vendor best-price hints */}
      {vendorHintsEnabled && vendorHints.length > 0 && (
        <div className="space-y-2 border-t border-stone-700 pt-3">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
            Vendor Savings
          </h4>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {vendorHints.map((hint) => (
              <div key={hint.ingredientId} className="text-xxs">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-stone-300 truncate">{hint.ingredientName}</span>
                  <span className="text-emerald-400 font-medium shrink-0">
                    -{hint.savingsPercent}%
                  </span>
                </div>
                <p className="text-stone-500">
                  {hint.bestVendorName}: {formatCurrency(hint.bestPriceCents)} (vs{' '}
                  {formatCurrency(hint.currentPriceCents)})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
