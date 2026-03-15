'use client'

// PriceAlertsWidget - Shows ingredients with price spikes (30%+ above average)
// Deterministic, no AI. Reads from ingredient pricing data.

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { getIngredientPriceAlerts } from '@/lib/menus/menu-intelligence-actions'
import type { PriceAlert } from '@/lib/menus/menu-intelligence-actions'

interface PriceAlertsWidgetProps {
  className?: string
}

export function PriceAlertsWidget({ className = '' }: PriceAlertsWidgetProps) {
  const [isPending, startTransition] = useTransition()
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getIngredientPriceAlerts()
        setAlerts(result)
        setLoadError(null)
      } catch (err) {
        console.error('[PriceAlertsWidget] Failed to load:', err)
        setLoadError('Could not load price alerts')
      }
    })
  }, [])

  if (loadError) {
    return (
      <div className={`rounded-lg border border-red-500/30 bg-red-500/10 p-3 ${className}`}>
        <p className="text-xs text-red-300">{loadError}</p>
      </div>
    )
  }

  if (isPending && alerts.length === 0) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-stone-700 rounded w-1/3" />
          <div className="h-3 bg-stone-700 rounded w-full" />
          <div className="h-3 bg-stone-700 rounded w-4/5" />
        </div>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <Badge variant="success">All clear</Badge>
          <span className="text-xs text-stone-500">No ingredient price spikes detected</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-amber-500/20 bg-amber-950/10 ${className}`}>
      <div className="px-4 py-3 border-b border-amber-500/10">
        <div className="flex items-center gap-2">
          <Badge variant="warning">
            {alerts.length} Price Alert{alerts.length !== 1 ? 's' : ''}
          </Badge>
          <span className="text-xs text-stone-500">Ingredients 30%+ above average</span>
        </div>
      </div>
      <div className="divide-y divide-stone-800">
        {alerts.slice(0, 5).map((alert) => (
          <div key={alert.ingredientId} className="px-4 py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-200 truncate">{alert.ingredientName}</p>
              {alert.affectedMenus.length > 0 && (
                <p className="text-[10px] text-stone-500 truncate">
                  Affects: {alert.affectedMenus.join(', ')}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-amber-400 font-medium">+{alert.spikePercent}%</p>
              <p className="text-[10px] text-stone-500">
                ${(alert.currentPriceCents / 100).toFixed(2)} vs $
                {(alert.averagePriceCents / 100).toFixed(2)} avg
              </p>
            </div>
          </div>
        ))}
      </div>
      {alerts.length > 5 && (
        <div className="px-4 py-2 border-t border-stone-800">
          <p className="text-[10px] text-stone-500">
            +{alerts.length - 5} more alert{alerts.length - 5 !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
