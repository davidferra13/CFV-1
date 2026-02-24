'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Plus, Settings } from 'lucide-react'
import type { GoalsDashboard, GoalView, GoalCategory } from '@/lib/goals/types'
import { GOAL_TYPE_TO_CATEGORY, GOAL_CATEGORY_META } from '@/lib/goals/types'
import { LifeBalanceWheel } from '@/components/goals/life-balance-wheel'
import { CategorySection } from '@/components/goals/category-section'
import { CategoryOptInPanel } from '@/components/goals/category-opt-in-panel'
import { GoalCheckInModal } from '@/components/goals/goal-check-in-modal'
import { GoalsEmptyState } from '@/components/goals/goals-empty-state'

// ── Server-side data is fetched then passed to this client shell ──────────────
// Next.js 13+ app router: we use a server component wrapper that imports this.

export function GoalsPageClient({ dashboard }: { dashboard: GoalsDashboard }) {
  const { activeGoals, categoryProgress, enabledCategories, computedAt } = dashboard

  // Category opt-in panel visibility
  const [showOptIn, setShowOptIn] = useState(false)

  // Check-in modal state
  const [checkInGoal, setCheckInGoal] = useState<{
    goal: GoalView['goal']
    currentValue: number
  } | null>(null)

  // Scroll refs for wheel→section navigation
  const sectionRefs = useRef<Partial<Record<GoalCategory, HTMLElement | null>>>({})

  function handleWheelCategoryClick(category: GoalCategory) {
    const el = sectionRefs.current[category]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Group goals by category, only for enabled categories
  const goalsByCategory = new Map<GoalCategory, GoalView[]>()
  for (const category of enabledCategories) {
    goalsByCategory.set(category, [])
  }
  for (const view of activeGoals) {
    const cat = GOAL_TYPE_TO_CATEGORY[view.goal.goalType]
    if (cat && goalsByCategory.has(cat)) {
      goalsByCategory.get(cat)!.push(view)
    }
  }

  const hasAnyGoals = activeGoals.length > 0
  const hasMultipleCategories = enabledCategories.length > 2

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Goals</h1>
          <p className="text-stone-400 mt-1">
            Track your targets across business, craft, and life.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowOptIn((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-600 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors"
            title="Manage goal categories"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
          </button>
          <Link
            href="/goals/setup"
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add Goal
          </Link>
        </div>
      </div>

      {/* Category opt-in panel (settings / first-time) */}
      {showOptIn && (
        <CategoryOptInPanel
          enabledCategories={enabledCategories}
          nudgeLevels={dashboard.enabledCategories ? {} : {}}
          onDismiss={() => setShowOptIn(false)}
        />
      )}

      {/* Life Balance Wheel — only when 3+ categories active and has goals */}
      {hasMultipleCategories && hasAnyGoals && (
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-5">
          <LifeBalanceWheel
            categoryProgress={categoryProgress}
            enabledCategories={enabledCategories}
            onCategoryClick={handleWheelCategoryClick}
          />
        </div>
      )}

      {/* Goals list — empty state or category sections */}
      {!hasAnyGoals ? (
        <GoalsEmptyState />
      ) : (
        <div className="space-y-8">
          {Array.from(goalsByCategory.entries()).map(([category, goals]) => {
            const meta = GOAL_CATEGORY_META.find((m) => m.id === category)
            if (!meta) return null
            return (
              <div
                key={category}
                ref={(el) => {
                  sectionRefs.current[category] = el
                }}
              >
                <CategorySection
                  category={category}
                  goals={goals}
                  onCheckIn={(goal, currentValue) => setCheckInGoal({ goal, currentValue })}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Check-in modal */}
      {checkInGoal && (
        <GoalCheckInModal
          goal={checkInGoal.goal}
          currentValue={checkInGoal.currentValue}
          onClose={() => setCheckInGoal(null)}
        />
      )}

      <p className="text-xs text-stone-400 text-right">
        Updated{' '}
        {new Date(computedAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </p>
    </div>
  )
}
