'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import Link from 'next/link'
import type { GoalView, GoalCategory, GoalCheckIn } from '@/lib/goals/types'
import { GOAL_CATEGORY_META } from '@/lib/goals/types'
import { GoalCard } from './goal-card'

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {}

// Dynamic icon loading using lucide-react
import * as LucideIcons from 'lucide-react'
for (const [name, comp] of Object.entries(LucideIcons)) {
  if (typeof comp === 'function') {
    ICON_COMPONENTS[name] = comp as React.ComponentType<{ className?: string }>
  }
}

interface CategorySectionProps {
  category: GoalCategory
  goals: GoalView[]
  /** id attribute for scroll-to from wheel click */
  id?: string
  onCheckIn?: (goal: GoalView['goal'], currentValue: number) => void
}

export function CategorySection({ category, goals, id, onCheckIn }: CategorySectionProps) {
  const meta = GOAL_CATEGORY_META.find((m) => m.id === category)
  const [collapsed, setCollapsed] = useState(false)

  if (!meta) return null

  const Icon = ICON_COMPONENTS[meta.icon] ?? LucideIcons.Target
  const avgProgress =
    goals.length > 0
      ? Math.round(
          goals.reduce((sum, v) => sum + Math.min(100, v.progress.progressPercent), 0) /
            goals.length
        )
      : null

  return (
    <section id={id} className="space-y-3">
      {/* Category header */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setCollapsed((v) => !v)} className="flex items-center gap-2 group">
          <div className="rounded-lg p-1.5 bg-stone-100 group-hover:bg-stone-200 transition-colors">
            <Icon className="h-4 w-4 text-stone-600" />
          </div>
          <span className="text-sm font-semibold text-stone-900">{meta.label}</span>
          {avgProgress !== null && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                avgProgress >= 75
                  ? 'bg-emerald-100 text-emerald-700'
                  : avgProgress >= 40
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {avgProgress}%
            </span>
          )}
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-stone-400 ml-1" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-stone-400 ml-1" />
          )}
        </button>

        <Link
          href={`/goals/setup?category=${category}`}
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-brand-600 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Link>
      </div>

      {!collapsed && (
        <>
          {goals.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-stone-200 px-4 py-6 text-center">
              <p className="text-sm text-stone-500">No {meta.label.toLowerCase()} goals yet.</p>
              <Link
                href={`/goals/setup?category=${category}`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add your first {meta.label.toLowerCase()} goal
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((view) => (
                <GoalCard key={view.goal.id} view={view} onCheckIn={onCheckIn} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
