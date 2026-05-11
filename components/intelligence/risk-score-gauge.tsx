'use client'

// Risk Score Gauge - visual meter for a 0-100 risk score
// Red arc fills proportionally. Number centered.

import type { RiskLevel } from '@/lib/intelligence/client-risk'

const LEVEL_COLORS: Record<RiskLevel, { ring: string; text: string; bg: string }> = {
  critical: { ring: 'stroke-red-500', text: 'text-red-400', bg: 'bg-red-500/10' },
  high: { ring: 'stroke-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  medium: { ring: 'stroke-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  low: { ring: 'stroke-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
}

interface RiskScoreGaugeProps {
  score: number
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
}

export function RiskScoreGauge({ score, level, size = 'md' }: RiskScoreGaugeProps) {
  const colors = LEVEL_COLORS[level]
  const dims = size === 'sm' ? 48 : size === 'lg' ? 80 : 64
  const strokeWidth = size === 'sm' ? 4 : size === 'lg' ? 6 : 5
  const radius = (dims - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const fontSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dims, height: dims }}>
      <svg width={dims} height={dims} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={dims / 2}
          cy={dims / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-stone-700"
        />
        {/* Progress ring */}
        <circle
          cx={dims / 2}
          cy={dims / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          className={colors.ring}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <span className={`absolute font-bold ${fontSize} ${colors.text}`}>{score}</span>
    </div>
  )
}
