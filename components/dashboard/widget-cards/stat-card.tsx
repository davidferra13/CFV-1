import { WidgetCardShell } from './widget-card-shell'

// ============================================
// STAT CARD (sm, 1-column)
// Shows one hero metric + trend + optional sparkline
//
//  ┌──────────────────┐
//  │ REVENUE           │
//  │   $4,230          │  <- hero value
//  │   +12% vs last mo │  <- trend line
//  │   ▁▂▃▅▆▇          │  <- sparkline
//  └──────────────────┘
// ============================================

export interface StatCardProps {
  widgetId: string
  title: string
  /** The big number / value displayed prominently */
  value: string
  /** Optional subtitle below the value */
  subtitle?: string
  /** Trend indicator text (e.g. "+12% vs last month") */
  trend?: string
  /** up = green, down = red, flat = stone */
  trendDirection?: 'up' | 'down' | 'flat'
  /** Optional array of numbers for a mini sparkline (6-12 values) */
  sparkData?: number[]
  /** Link to the detail page */
  href?: string
}

export function StatCard({
  widgetId,
  title,
  value,
  subtitle,
  trend,
  trendDirection = 'flat',
  sparkData,
  href,
}: StatCardProps) {
  const trendColor =
    trendDirection === 'up'
      ? 'text-green-400'
      : trendDirection === 'down'
        ? 'text-red-400'
        : 'text-stone-500'

  const trendArrow = trendDirection === 'up' ? '\u25B2' : trendDirection === 'down' ? '\u25BC' : ''

  return (
    <WidgetCardShell widgetId={widgetId} title={title} size="sm" href={href}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {/* Hero value */}
          <p className="text-2xl font-bold text-stone-100 leading-tight truncate">{value}</p>

          {/* Subtitle */}
          {subtitle && <p className="text-xs text-stone-500 mt-0.5 truncate">{subtitle}</p>}

          {/* Trend */}
          {trend && (
            <p className={`text-xs font-medium mt-1 ${trendColor}`}>
              {trendArrow && <span className="mr-0.5">{trendArrow}</span>}
              {trend}
            </p>
          )}
        </div>

        {/* Sparkline */}
        {sparkData && sparkData.length >= 3 && (
          <MiniSparkline data={sparkData} color={trendDirection} />
        )}
      </div>
    </WidgetCardShell>
  )
}

// ============================================
// MINI SPARKLINE (pure SVG, no library)
// ============================================

function MiniSparkline({
  data,
  color = 'flat',
}: {
  data: number[]
  color?: 'up' | 'down' | 'flat'
}) {
  const width = 64
  const height = 28
  const padding = 2

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const strokeColor = color === 'up' ? '#4ade80' : color === 'down' ? '#f87171' : '#78716c'

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
