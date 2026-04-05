// Sparkline - Tiny inline SVG chart for showing trends at a glance.
// Pure SVG, no chart library. Renders a smooth polyline from data points.
//
// Usage:
//   <Sparkline data={[3, 5, 2, 8, 4, 7, 6]} />
//   <Sparkline data={[3, 5, 2, 8]} color="emerald" height={24} />

interface SparklineProps {
  /** Array of numeric values to plot */
  data: number[]
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Color preset or custom hex */
  color?: 'brand' | 'emerald' | 'amber' | 'red' | 'stone' | string
  /** Show a filled area under the line */
  filled?: boolean
  /** Additional CSS classes */
  className?: string
}

const colorMap: Record<string, { stroke: string; fill: string }> = {
  brand: { stroke: 'rgb(237, 168, 107)', fill: 'rgba(237, 168, 107, 0.15)' },
  emerald: { stroke: 'rgb(16, 185, 129)', fill: 'rgba(16, 185, 129, 0.15)' },
  amber: { stroke: 'rgb(245, 158, 11)', fill: 'rgba(245, 158, 11, 0.15)' },
  red: { stroke: 'rgb(239, 68, 68)', fill: 'rgba(239, 68, 68, 0.15)' },
  stone: { stroke: 'rgb(120, 113, 108)', fill: 'rgba(120, 113, 108, 0.1)' },
}

export function Sparkline({
  data,
  width = 64,
  height = 20,
  color = 'brand',
  filled = true,
  className = '',
}: SparklineProps) {
  if (!data.length || data.length < 2) return null

  const colors = colorMap[color] ?? { stroke: color, fill: `${color}26` }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  // Padding so the line doesn't touch edges
  const padX = 2
  const padY = 2
  const plotW = width - padX * 2
  const plotH = height - padY * 2

  const points = data.map((val, i) => {
    const x = padX + (i / (data.length - 1)) * plotW
    const y = padY + plotH - ((val - min) / range) * plotH
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const polyline = points.join(' ')

  // For filled area, close the path along the bottom
  const areaPath = filled
    ? `M${points[0]} ${points
        .slice(1)
        .map((p) => `L${p}`)
        .join(
          ' '
        )} L${(padX + plotW).toFixed(1)},${(height - padY).toFixed(1)} L${padX.toFixed(1)},${(height - padY).toFixed(1)} Z`
    : undefined

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`inline-block ${className}`}
      aria-hidden="true"
    >
      {filled && areaPath && <path d={areaPath} fill={colors.fill} />}
      <polyline
        points={polyline}
        fill="none"
        stroke={colors.stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={parseFloat(points[points.length - 1].split(',')[0])}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r={1.5}
        fill={colors.stroke}
      />
    </svg>
  )
}
