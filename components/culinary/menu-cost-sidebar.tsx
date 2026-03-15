'use client'

// MenuCostSidebar - Live cost display with margin alerts
// Shows food cost %, cost per guest, total cost, and margin alerts
// Reads from server actions, no AI

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { checkMenuMargins } from '@/lib/menus/menu-intelligence-actions'
import type { MarginAlert } from '@/lib/menus/menu-intelligence-actions'

interface MenuCostSidebarProps {
  menuId: string
  className?: string
}

function formatCents(cents: number | null): string {
  if (cents === null) return 'N/A'
  return `$${(cents / 100).toFixed(2)}`
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

export function MenuCostSidebar({ menuId, className = '' }: MenuCostSidebarProps) {
  const [isPending, startTransition] = useTransition()
  const [costData, setCostData] = useState<{
    totalCostCents: number | null
    costPerGuestCents: number | null
    foodCostPercent: number | null
    hasAllPrices: boolean
    componentCount: number
  } | null>(null)
  const [alerts, setAlerts] = useState<MarginAlert[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await checkMenuMargins(menuId)
        setCostData(result.costBreakdown)
        setAlerts(result.alerts)
        setLoadError(null)
      } catch (err) {
        console.error('[MenuCostSidebar] Failed to load:', err)
        setLoadError('Could not load cost data')
      }
    })
  }, [menuId])

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
          {costData.foodCostPercent !== null ? `${costData.foodCostPercent.toFixed(1)}%` : 'N/A'}
        </p>
        <p className="text-xs text-stone-500 mt-1">Target: 25-30%</p>
      </div>

      {/* Cost metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-stone-900/50 rounded-lg p-3">
          <p className="text-xs text-stone-500">Total Cost</p>
          <p className="text-sm font-medium text-stone-200">
            {formatCents(costData.totalCostCents)}
          </p>
        </div>
        <div className="bg-stone-900/50 rounded-lg p-3">
          <p className="text-xs text-stone-500">Per Guest</p>
          <p className="text-sm font-medium text-stone-200">
            {formatCents(costData.costPerGuestCents)}
          </p>
        </div>
      </div>

      {/* Component count */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>{costData.componentCount} components</span>
        {!costData.hasAllPrices && <Badge variant="warning">Missing prices</Badge>}
      </div>

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
    </div>
  )
}
