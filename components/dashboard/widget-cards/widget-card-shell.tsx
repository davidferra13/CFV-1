import Link from 'next/link'
import { getWidgetIcon, getWidgetCategoryStyle } from '@/lib/scheduling/types'

// ============================================
// WIDGET SIZE SYSTEM
// sm  = 1 column  (stat cards, single metrics)
// md  = 2 columns (list cards, schedules)
// lg  = 2 columns + tall (charts, health score)
// ============================================

export type WidgetSize = 'sm' | 'md' | 'lg'

interface WidgetCardShellProps {
  widgetId: string
  title: string
  size: WidgetSize
  href?: string
  children: React.ReactNode
  className?: string
}

/**
 * The universal wrapper for all dashboard widget cards.
 * Always visible (no collapsing). Shows category color accent,
 * icon, title, and optional link. Children render immediately.
 */
export function WidgetCardShell({
  widgetId,
  title,
  size,
  href,
  children,
  className,
}: WidgetCardShellProps) {
  const icon = getWidgetIcon(widgetId)
  const catStyle = getWidgetCategoryStyle(widgetId)

  const sizeClass =
    size === 'sm'
      ? 'col-span-1'
      : size === 'md'
        ? 'col-span-1 sm:col-span-2'
        : 'col-span-1 sm:col-span-2'

  return (
    <div
      data-widget-id={widgetId}
      className={`${sizeClass} rounded-2xl overflow-hidden card-lift hover:brightness-[1.06] ${className ?? ''}`}
      style={{
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `4px solid ${catStyle.border}`,
        background: catStyle.bgExpanded,
        boxShadow: `0 0 20px ${catStyle.border}08, 0 1px 3px rgba(0,0,0,0.2)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base leading-none shrink-0">{icon}</span>
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider truncate">
            {title}
          </span>
        </div>
        {href && (
          <Link
            href={href}
            className="text-xs font-medium shrink-0 ml-3 transition-colors"
            style={{ color: catStyle.border }}
          >
            View &rarr;
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-1">{children}</div>
    </div>
  )
}

// ============================================
// WIDGET LOADING SKELETON
// Matches card shape per size
// ============================================

export function WidgetCardSkeleton({ size = 'sm' }: { size?: WidgetSize }) {
  const sizeClass = size === 'sm' ? 'col-span-1' : 'col-span-1 sm:col-span-2'

  return (
    <div
      className={`${sizeClass} rounded-2xl overflow-hidden animate-pulse`}
      style={{
        border: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(120,113,108,0.06)',
      }}
    >
      <div className="px-4 pt-3.5 pb-1 flex items-center gap-2.5">
        <div className="w-4 h-4 skeleton" />
        <div className="h-3 w-24 skeleton" />
      </div>
      <div className="px-4 pb-4 pt-2 space-y-2.5">
        {size === 'sm' ? (
          <>
            <div className="h-8 w-28 skeleton" />
            <div className="h-3 w-20 skeleton" />
          </>
        ) : (
          <>
            <div className="h-6 w-20 skeleton" />
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-3/4 skeleton" />
          </>
        )}
      </div>
    </div>
  )
}

// ============================================
// WIDGET ERROR STATE
// Shows when data fetch fails
// ============================================

export function WidgetCardError({
  widgetId,
  title,
  size = 'sm',
}: {
  widgetId: string
  title: string
  size?: WidgetSize
}) {
  const icon = getWidgetIcon(widgetId)

  return (
    <WidgetCardShell widgetId={widgetId} title={title} size={size}>
      <div className="flex items-center gap-2 py-2">
        <span className="text-sm">{icon}</span>
        <p className="text-xs text-stone-500">Could not load data</p>
      </div>
    </WidgetCardShell>
  )
}

// ============================================
// WIDGET EMPTY STATE
// Shows when there's genuinely no data
// ============================================

export function WidgetCardEmpty({
  message,
  actionLabel,
  actionHref,
}: {
  message: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="py-3 text-center">
      <p className="text-xs text-stone-500">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="text-xs text-brand-500 hover:text-brand-400 font-medium mt-1.5 inline-block"
        >
          {actionLabel} &rarr;
        </Link>
      )}
    </div>
  )
}
