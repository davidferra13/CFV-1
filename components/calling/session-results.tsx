'use client'

import { useState } from 'react'
import {
  Check,
  X,
  Clock,
  Phone,
  DollarSign,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from '@/components/ui/icons'

interface ConfirmedVendor {
  vendorName: string
  vendorPhone: string
  priceQuoted?: string | null
  priceCents?: number | null
  quantityAvailable?: string | null
  unit?: string | null
  canHold?: boolean
  holdUntil?: string | null
}

interface SessionResultsProps {
  ingredientQuery: string
  confirmed: ConfirmedVendor[]
  unavailable: Array<{ vendorName: string; vendorPhone: string }>
  noAnswer: Array<{ vendorName: string; vendorPhone: string }>
  skipped: Array<{ vendorName: string; reason?: string }>
  totalCalls: number
  totalCostCents: number
  durationSeconds: number
  onNewSearch?: () => void
  onRetryNoAnswer?: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function CollapsibleSection({
  label,
  count,
  children,
  action,
}: {
  label: string
  count: number
  children: React.ReactNode
  action?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (count === 0) return null

  return (
    <div className="border border-stone-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-stone-400 hover:bg-stone-800 transition-colors"
      >
        <span>
          {label} ({count})
        </span>
        <span className="flex items-center gap-2">
          {action}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && <div className="px-3 pb-2 space-y-1">{children}</div>}
    </div>
  )
}

export function SessionResults({
  ingredientQuery,
  confirmed,
  unavailable,
  noAnswer,
  skipped,
  totalCalls,
  totalCostCents,
  durationSeconds,
  onNewSearch,
  onRetryNoAnswer,
}: SessionResultsProps) {
  const sorted = [...confirmed].sort(
    (a, b) => (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity)
  )
  const best = sorted[0]
  const found = confirmed.length > 0

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-xl p-5 space-y-4 max-w-lg">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 rounded-full p-1.5 ${found ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}
        >
          {found ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </div>
        <div>
          <p className={`font-medium ${found ? 'text-emerald-300' : 'text-rose-300'}`}>
            {found
              ? `Found ${ingredientQuery} at ${confirmed.length} location${confirmed.length > 1 ? 's' : ''}`
              : `Could not find ${ingredientQuery}`}
          </p>
          {best?.priceQuoted && (
            <p className="text-sm text-stone-400 mt-0.5">
              Best price: <span className="font-mono text-emerald-400">{best.priceQuoted}</span> at{' '}
              {best.vendorName}
            </p>
          )}
        </div>
      </div>

      {/* Confirmed list (always visible) */}
      {sorted.length > 0 && (
        <div className="border border-emerald-800/50 rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-900/20 border-b border-emerald-800/50">
            Confirmed ({sorted.length})
          </div>
          <div className="divide-y divide-stone-800">
            {sorted.map((v) => (
              <div key={v.vendorPhone} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-stone-200 truncate">{v.vendorName}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {v.priceQuoted && (
                    <span className="font-mono text-sm text-emerald-400">{v.priceQuoted}</span>
                  )}
                  {v.canHold && (
                    <span className="text-xs bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">
                      hold
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed sections */}
      <div className="space-y-2">
        <CollapsibleSection label="Unavailable" count={unavailable.length}>
          {unavailable.map((v) => (
            <p key={v.vendorPhone} className="text-sm text-stone-400">
              {v.vendorName}
            </p>
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          label="No answer"
          count={noAnswer.length}
          action={
            noAnswer.length > 0 && onRetryNoAnswer ? (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  onRetryNoAnswer()
                }}
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Retry
              </span>
            ) : undefined
          }
        >
          {noAnswer.map((v) => (
            <p key={v.vendorPhone} className="text-sm text-stone-400">
              {v.vendorName}
            </p>
          ))}
        </CollapsibleSection>

        <CollapsibleSection label="Skipped" count={skipped.length}>
          {skipped.map((v, i) => (
            <p key={i} className="text-sm text-stone-400">
              {v.vendorName}
              {v.reason ? ` (${v.reason})` : ''}
            </p>
          ))}
        </CollapsibleSection>
      </div>

      {/* Stats footer */}
      <div className="flex items-center justify-center gap-3 text-xs text-stone-500 pt-2 border-t border-stone-800">
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3" />
          {totalCalls} calls
        </span>
        <span className="text-stone-700">·</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(durationSeconds)}
        </span>
        <span className="text-stone-700">·</span>
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          {formatCost(totalCostCents)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {onNewSearch && (
          <button
            onClick={onNewSearch}
            className="flex-1 text-sm px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          >
            New Search
          </button>
        )}
      </div>
    </div>
  )
}
