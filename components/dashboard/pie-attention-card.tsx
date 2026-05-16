'use client'

/**
 * PIE Attention Card
 *
 * Renders a price intelligence alert in the dashboard.
 * Color-coded by urgency: red (spike/overrun), amber (opportunity), green (savings).
 */

import Link from 'next/link'
import type { PieAttentionItem } from '@/lib/pricing/pie-attention-actions'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Urgency styling
// ---------------------------------------------------------------------------

const URGENCY_STYLES = {
  critical: {
    border: 'border-red-700/60',
    bg: 'bg-red-950/30',
    badge: 'bg-red-900/70 text-red-200',
    icon: 'text-red-400',
  },
  high: {
    border: 'border-amber-700/50',
    bg: 'bg-amber-950/20',
    badge: 'bg-amber-900/60 text-amber-200',
    icon: 'text-amber-400',
  },
  medium: {
    border: 'border-blue-700/40',
    bg: 'bg-blue-950/20',
    badge: 'bg-blue-900/50 text-blue-200',
    icon: 'text-blue-400',
  },
  low: {
    border: 'border-green-700/40',
    bg: 'bg-green-950/20',
    badge: 'bg-green-900/50 text-green-200',
    icon: 'text-green-400',
  },
}

const KIND_LABELS: Record<string, string> = {
  price_spike: 'Price Spike',
  seasonal_opportunity: 'Seasonal',
  cost_overrun_risk: 'Cost Overrun',
  better_alternative: 'Alternative',
  bulk_buy_window: 'Bulk Buy',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number | null): string {
  if (cents === null) return '--'
  return `$${(cents / 100).toFixed(2)}`
}

function formatPct(pct: number | null): string {
  if (pct === null) return ''
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(0)}%`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PieAttentionCard({ item }: { item: PieAttentionItem }) {
  const style = URGENCY_STYLES[item.urgency]

  return (
    <div
      className={cn('rounded-lg border p-3 space-y-2 transition-colors', style.border, style.bg)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('text-lg', style.icon)}>
            {item.kind === 'price_spike' || item.kind === 'cost_overrun_risk'
              ? '\u26a0\ufe0f'
              : item.kind === 'bulk_buy_window'
                ? '\ud83d\udcc9'
                : '\u2728'}
          </span>
          <h4 className="text-sm font-medium text-stone-100 truncate">{item.title}</h4>
        </div>
        <span className={cn('px-1.5 py-0.5 text-xs rounded shrink-0', style.badge)}>
          {KIND_LABELS[item.kind] ?? item.kind}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-stone-400">{item.description}</p>

      {/* Price change row */}
      {(item.currentCents || item.previousCents) && (
        <div className="flex items-center gap-3 text-xs">
          {item.previousCents && (
            <span className="text-stone-500">Was: {formatCents(item.previousCents)}</span>
          )}
          {item.currentCents && (
            <span className="text-stone-300">Now: {formatCents(item.currentCents)}</span>
          )}
          {item.changePct !== null && (
            <span
              className={cn('font-medium', item.changePct > 0 ? 'text-red-400' : 'text-green-400')}
            >
              {formatPct(item.changePct)}
            </span>
          )}
        </div>
      )}

      {/* Affected events */}
      {item.affectedEvents.length > 0 && (
        <div className="text-xs text-stone-500">
          Affects: {item.affectedEvents.map((e) => e.occasion).join(', ')}
        </div>
      )}

      {/* Suggestion */}
      <p className="text-xs text-stone-300 italic">{item.suggestion}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {item.href && (
          <Link
            href={item.href}
            className="px-2 py-1 text-xs rounded bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
          >
            View details
          </Link>
        )}
        {item.affectedEvents.length > 0 && (
          <Link
            href={`/events/${item.affectedEvents[0].id}`}
            className="px-2 py-1 text-xs rounded bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
          >
            View event
          </Link>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// List wrapper (for standalone widget use outside the rail)
// ---------------------------------------------------------------------------

export function PieAttentionList({ items }: { items: PieAttentionItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-300 flex items-center gap-2">
        <span>\ud83d\udcca</span> Price Intelligence
      </h3>
      <div className="space-y-2">
        {items.map((item) => (
          <PieAttentionCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
