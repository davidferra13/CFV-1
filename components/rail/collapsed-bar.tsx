'use client'

import type {
  ContextualRailData,
  RailCategory,
  ResolvedCollapsedMetric,
} from '@/lib/discovery/contextual-rail-types'
import { CATEGORY_COLORS, RESOLVER_CATEGORY_MAP } from '@/lib/discovery/contextual-rail-types'
import { ChevronDown } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Value formatting
// ---------------------------------------------------------------------------

function formatMetricValue(metric: ResolvedCollapsedMetric): string {
  if (metric.value === null || metric.value === undefined) return '--'
  const v = metric.value
  switch (metric.format) {
    case 'currency': {
      const num = typeof v === 'string' ? parseFloat(v) : (v as number)
      if (isNaN(num)) return '--'
      if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(1)}k`
      return `$${num.toFixed(0)}`
    }
    case 'percent': {
      const num = typeof v === 'string' ? parseFloat(v) : (v as number)
      if (isNaN(num)) return '--'
      return `${Math.round(num)}%`
    }
    case 'countdown': {
      const num = typeof v === 'string' ? parseFloat(v) : (v as number)
      if (isNaN(num)) return '--'
      return `${Math.round(num)}d`
    }
    case 'date': {
      if (typeof v === 'string') {
        const d = new Date(v)
        if (isNaN(d.getTime())) return String(v)
        const diff = Math.round((d.getTime() - Date.now()) / 86400000)
        if (diff === 0) return 'today'
        if (diff === 1) return 'tomorrow'
        if (diff > 0) return `in ${diff}d`
        return `${Math.abs(diff)}d ago`
      }
      return String(v)
    }
    case 'number':
    default:
      return String(v)
  }
}

function severityClass(severity?: 'normal' | 'warn' | 'critical'): string {
  switch (severity) {
    case 'critical':
      return 'text-red-400'
    case 'warn':
      return 'text-amber-400'
    default:
      return ''
  }
}

// ---------------------------------------------------------------------------
// Readiness progress bar
// ---------------------------------------------------------------------------

function ReadinessBar({ metrics }: { metrics: ResolvedCollapsedMetric[] }) {
  const pctMetric = metrics.find((m) => m.format === 'percent')
  const pct =
    pctMetric?.value !== null && pctMetric?.value !== undefined
      ? typeof pctMetric.value === 'string'
        ? parseFloat(pctMetric.value)
        : (pctMetric.value as number)
      : 0

  return (
    <div className="flex items-center gap-2 mr-2">
      <div className="w-32 h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="text-[10px] text-stone-400 tabular-nums">{Math.round(pct)}%</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metric chip
// ---------------------------------------------------------------------------

function MetricChip({ metric }: { metric: ResolvedCollapsedMetric }) {
  const categoryKey = RESOLVER_CATEGORY_MAP[metric.resolverKey] as RailCategory | undefined
  const color = categoryKey ? CATEGORY_COLORS[categoryKey] : null
  const colorClass = color ? `${color.bg} ${color.text}` : 'bg-stone-500/10 text-stone-300'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
        colorClass,
        severityClass(metric.severity)
      )}
    >
      <span className="text-stone-500 text-[9px]">{metric.label}</span>
      <span className="tabular-nums">{formatMetricValue(metric)}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

function Divider() {
  return <span className="text-stone-700 text-[10px] select-none mx-0.5">|</span>
}

// ---------------------------------------------------------------------------
// CollapsedBar
// ---------------------------------------------------------------------------

export function CollapsedBar({
  data,
  onExpand,
}: {
  data: ContextualRailData
  onExpand: () => void
}) {
  const hasCritical = data.criticalCount > 0
  const isReadinessBar = data.profile.collapsedSummary === 'readiness-bar'

  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        'flex items-center w-full h-9 px-3 border-b transition-colors cursor-pointer',
        'hover:bg-stone-900/60',
        hasCritical
          ? 'bg-red-950/20 border-red-900/30'
          : 'bg-stone-950/90 backdrop-blur-sm border-stone-800/50'
      )}
    >
      {/* Left: readiness bar and/or metric chips */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
        {isReadinessBar && <ReadinessBar metrics={data.collapsedMetrics} />}

        {data.collapsedMetrics.map((metric, i) => (
          <span
            key={`${metric.resolverKey}:${metric.label}:${i}`}
            className="flex items-center gap-1"
          >
            {(i > 0 || isReadinessBar) && <Divider />}
            <MetricChip metric={metric} />
          </span>
        ))}
      </div>

      {/* Critical badge */}
      {hasCritical && (
        <span className="flex items-center gap-1 mx-2">
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
            {data.criticalCount}
          </span>
        </span>
      )}

      {/* Expand chevron */}
      <span className="flex-shrink-0 ml-1">
        <ChevronDown className="h-4 w-4 text-stone-500" aria-hidden />
      </span>
    </button>
  )
}
