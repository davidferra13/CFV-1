'use client'

/**
 * PriceTrendAlerts - Dashboard card showing actionable price movements.
 * Shows rising costs (threats), falling costs (opportunities), and
 * volatility warnings for ingredients the chef actually uses.
 */

import Link from 'next/link'

export interface TrendAlert {
  ingredientName: string
  direction: 'rising' | 'falling' | 'volatile'
  changePct: number
  currentCents: number
  unit: string
  /** Which recipes this impacts */
  impactedRecipes?: string[]
  /** Suggested action */
  action: string
}

interface PriceTrendAlertsProps {
  alerts: TrendAlert[]
  className?: string
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function directionIcon(dir: TrendAlert['direction']): string {
  switch (dir) {
    case 'rising':
      return '\u2191'
    case 'falling':
      return '\u2193'
    case 'volatile':
      return '\u21C5'
  }
}

function directionColor(dir: TrendAlert['direction']): string {
  switch (dir) {
    case 'rising':
      return 'text-red-400'
    case 'falling':
      return 'text-emerald-400'
    case 'volatile':
      return 'text-amber-400'
  }
}

function directionBg(dir: TrendAlert['direction']): string {
  switch (dir) {
    case 'rising':
      return 'bg-red-950/30 border-red-900/30'
    case 'falling':
      return 'bg-emerald-950/30 border-emerald-900/30'
    case 'volatile':
      return 'bg-amber-950/30 border-amber-900/30'
  }
}

export function PriceTrendAlerts({ alerts, className = '' }: PriceTrendAlertsProps) {
  if (alerts.length === 0) return null

  const rising = alerts.filter((a) => a.direction === 'rising')
  const falling = alerts.filter((a) => a.direction === 'falling')
  const volatile = alerts.filter((a) => a.direction === 'volatile')

  return (
    <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-stone-200">Price Trend Alerts</h3>
        <Link
          href="/culinary/costing"
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          View all
        </Link>
      </div>

      {rising.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-red-400 mb-1.5">Rising ({rising.length})</p>
          <div className="space-y-1.5">
            {rising.slice(0, 3).map((alert) => (
              <TrendAlertRow key={alert.ingredientName} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {falling.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-emerald-400 mb-1.5">
            Opportunities ({falling.length})
          </p>
          <div className="space-y-1.5">
            {falling.slice(0, 3).map((alert) => (
              <TrendAlertRow key={alert.ingredientName} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {volatile.length > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-400 mb-1.5">Volatile ({volatile.length})</p>
          <div className="space-y-1.5">
            {volatile.slice(0, 2).map((alert) => (
              <TrendAlertRow key={alert.ingredientName} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TrendAlertRow({ alert }: { alert: TrendAlert }) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-2 ${directionBg(alert.direction)}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-sm font-medium ${directionColor(alert.direction)}`}>
          {directionIcon(alert.direction)} {Math.abs(alert.changePct).toFixed(0)}%
        </span>
        <span className="text-sm text-stone-300 truncate">{alert.ingredientName}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-stone-400">
          {formatPrice(alert.currentCents)}/{alert.unit}
        </span>
      </div>
    </div>
  )
}
