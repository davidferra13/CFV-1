/**
 * AvailabilityBadge
 *
 * Renders a pill badge that communicates ingredient sourceability at a glance.
 * Three states: readily available, limited/seasonal, hard to source.
 * Includes an optional confidence indicator.
 */

import type { SourceabilityClass, SourceabilityReport } from '@/lib/pricing/sourceability'
import { confidencePct } from '@/lib/pricing/sourceability'

// ---------------------------------------------------------------------------
// Color + icon map
// ---------------------------------------------------------------------------

const CONFIG: Record<
  SourceabilityClass,
  { dot: string; bg: string; text: string; border: string }
> = {
  readily_available: {
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-300',
    border: 'border-emerald-800/50',
  },
  limited_seasonal: {
    dot: 'bg-amber-400',
    bg: 'bg-amber-950/60',
    text: 'text-amber-300',
    border: 'border-amber-800/50',
  },
  hard_to_source: {
    dot: 'bg-red-500',
    bg: 'bg-red-950/60',
    text: 'text-red-300',
    border: 'border-red-900/50',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AvailabilityBadgeProps {
  report: SourceabilityReport
  /** 'full' shows label + confidence. 'compact' shows label only. 'dot' shows just a dot. */
  variant?: 'full' | 'compact' | 'dot'
  className?: string
}

export function AvailabilityBadge({
  report,
  variant = 'full',
  className = '',
}: AvailabilityBadgeProps) {
  const c = CONFIG[report.classification]

  if (variant === 'dot') {
    return (
      <span
        className={`inline-block h-2 w-2 rounded-full ${c.dot} ${className}`}
        title={report.label}
        aria-label={report.label}
      />
    )
  }

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.border} ${className}`}
        title={report.description}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
        {report.label}
      </span>
    )
  }

  // full
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 ${c.bg} ${c.border} ${className}`}
      title={report.description}
    >
      <span className={`h-2 w-2 rounded-full ${c.dot} shrink-0`} />
      <span className={`text-sm font-semibold ${c.text}`}>{report.label}</span>
      <span className="text-xs text-stone-500">{confidencePct(report.confidence)} confidence</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline description block (shown below the badge on the detail panel)
// ---------------------------------------------------------------------------

interface AvailabilityDetailProps {
  report: SourceabilityReport
  className?: string
}

export function AvailabilityDetail({ report, className = '' }: AvailabilityDetailProps) {
  const c = CONFIG[report.classification]
  const { signals } = report

  return (
    <div className={`rounded-lg border p-3 ${c.bg} ${c.border} space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${c.dot} shrink-0`} />
        <span className={`text-sm font-semibold ${c.text}`}>{report.label}</span>
        <span className="ml-auto text-xs text-stone-500">
          {confidencePct(report.confidence)} confidence
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-stone-400 leading-relaxed">{report.description}</p>

      {/* Signal pills */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <Signal label="Stores" value={String(signals.storeCount)} />
        <Signal label="In stock" value={String(signals.inStockCount)} />
        {signals.daysSinceLastSeen !== null && (
          <Signal
            label="Last seen"
            value={signals.daysSinceLastSeen === 0 ? 'today' : `${signals.daysSinceLastSeen}d ago`}
          />
        )}
      </div>
    </div>
  )
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-stone-700 bg-stone-800/60 px-2 py-0.5 text-xs text-stone-400">
      <span className="text-stone-500">{label}:</span>
      <span className="font-medium text-stone-300">{value}</span>
    </span>
  )
}
