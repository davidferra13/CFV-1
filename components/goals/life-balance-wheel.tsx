'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { GoalCategory } from '@/lib/goals/types'
import { GOAL_CATEGORY_META } from '@/lib/goals/types'

interface LifeBalanceWheelProps {
  categoryProgress: Partial<Record<GoalCategory, number>>
  enabledCategories: GoalCategory[]
  onCategoryClick?: (category: GoalCategory) => void
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function WheelTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: { subject: string; value: number } }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const { subject, value } = payload[0].payload
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-stone-100">{subject}</p>
      <p className="text-stone-400">{value}% toward targets</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function LifeBalanceWheel({
  categoryProgress,
  enabledCategories,
  onCategoryClick,
}: LifeBalanceWheelProps) {
  const data = enabledCategories.map((catId) => {
    const meta = GOAL_CATEGORY_META.find((m) => m.id === catId)
    return {
      category: catId,
      subject: meta?.label ?? catId,
      value: categoryProgress[catId] ?? 0,
      fullMark: 100,
    }
  })

  if (data.length === 0) return null

  // Color the fill based on average progress
  const avgProgress = data.reduce((sum, d) => sum + d.value, 0) / data.length
  const fillColor =
    avgProgress >= 75
      ? '#10b981' // emerald
      : avgProgress >= 40
        ? '#f59e0b' // amber
        : '#ef4444' // red

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-stone-300">Life Balance</h3>
        <span className="text-xs text-stone-400">
          {Math.round(avgProgress)}% average across {data.length} categor
          {data.length === 1 ? 'y' : 'ies'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#e7e5e4" />
          <PolarAngleAxis
            dataKey="subject"
            tick={({ x, y, payload, index }) => {
              const catId = data[index]?.category as GoalCategory | undefined
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fill="#78716c"
                  style={{ cursor: catId && onCategoryClick ? 'pointer' : 'default' }}
                  onClick={() => catId && onCategoryClick?.(catId)}
                >
                  {payload.value}
                </text>
              )
            }}
          />
          <Radar
            name="Progress"
            dataKey="value"
            stroke={fillColor}
            fill={fillColor}
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip content={<WheelTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
