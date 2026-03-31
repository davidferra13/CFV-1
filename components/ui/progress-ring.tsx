// ProgressRing - Animated circular progress indicator.
// Use for completion %, goal progress, capacity display.
'use client'

import { useEffect, useRef, useState } from 'react'

interface ProgressRingProps {
  /** Progress value 0-100 */
  value: number
  /** Size in px */
  size?: number
  /** Stroke width in px */
  strokeWidth?: number
  /** Color variant */
  color?: 'brand' | 'emerald' | 'amber' | 'red'
  /** Show the percentage text in the center */
  showValue?: boolean
  /** Custom center content (overrides showValue) */
  children?: React.ReactNode
  className?: string
}

const colorMap = {
  brand: 'stroke-brand-500',
  emerald: 'stroke-emerald-500',
  amber: 'stroke-amber-500',
  red: 'stroke-red-500',
} as const

export function ProgressRing({
  value,
  size = 48,
  strokeWidth = 4,
  color = 'brand',
  showValue = false,
  children,
  className = '',
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const ref = useRef<SVGSVGElement>(null)
  const hasAnimated = useRef(false)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, animatedValue))
  const dashOffset = circumference - (clamped / 100) * circumference

  useEffect(() => {
    const el = ref.current
    if (!el || hasAnimated.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return
        hasAnimated.current = true
        observer.disconnect()

        const duration = 600
        const startTime = performance.now()

        function animate(now: number) {
          const elapsed = now - startTime
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setAnimatedValue(Math.round(eased * value))
          if (progress < 1) requestAnimationFrame(animate)
          else setAnimatedValue(value)
        }

        requestAnimationFrame(animate)
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg ref={ref} width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-stone-700/50"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colorMap[color]}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: dashOffset,
            transition: 'stroke-dashoffset 100ms ease-out',
          }}
        />
      </svg>
      {(showValue || children) && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children || (
            <span className="text-xs font-semibold tabular-nums text-stone-200">{clamped}%</span>
          )}
        </div>
      )}
    </div>
  )
}
