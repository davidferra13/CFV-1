'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import type { GoalCategory, NudgeLevel } from '@/lib/goals/types'
import { GOAL_CATEGORY_META } from '@/lib/goals/types'
import { updateCategorySettings } from '@/lib/goals/actions'

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {}
for (const [name, comp] of Object.entries(LucideIcons)) {
  if (typeof comp === 'function') {
    ICON_COMPONENTS[name] = comp as React.ComponentType<{ className?: string }>
  }
}

interface CategoryOptInPanelProps {
  enabledCategories: GoalCategory[]
  nudgeLevels: Partial<Record<GoalCategory, NudgeLevel>>
  /** If true, shown as a setup prompt (dismissible banner style) */
  isFirstTime?: boolean
  onDismiss?: () => void
}

export function CategoryOptInPanel({
  enabledCategories,
  nudgeLevels,
  isFirstTime = false,
  onDismiss,
}: CategoryOptInPanelProps) {
  const [selected, setSelected] = useState<GoalCategory[]>(enabledCategories)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggleCategory(catId: GoalCategory) {
    const meta = GOAL_CATEGORY_META.find((m) => m.id === catId)
    if (meta?.alwaysEnabled) return // can't disable core categories

    setSelected((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    )
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        await updateCategorySettings(selected, nudgeLevels)
        onDismiss?.()
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">
            {isFirstTime ? 'Which life areas do you want to track?' : 'Goal Categories'}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {isFirstTime
              ? 'Enable categories to track goals across your whole life, not just revenue.'
              : 'Enable or disable goal categories. Core business categories are always on.'}
          </p>
        </div>
        {onDismiss && !isFirstTime && (
          <button
            onClick={onDismiss}
            className="rounded-full p-1 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GOAL_CATEGORY_META.map((meta) => {
          const Icon = ICON_COMPONENTS[meta.icon] ?? LucideIcons.Target
          const isEnabled = selected.includes(meta.id) || meta.alwaysEnabled
          const locked = meta.alwaysEnabled

          return (
            <button
              key={meta.id}
              onClick={() => toggleCategory(meta.id)}
              disabled={locked}
              className={`text-left rounded-lg border-2 px-3 py-2.5 transition-all ${
                isEnabled
                  ? locked
                    ? 'border-stone-300 bg-stone-50 cursor-default opacity-70'
                    : 'border-brand-500 bg-brand-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${isEnabled ? 'text-brand-600' : 'text-stone-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-stone-900 truncate">{meta.label}</p>
                  <p className="text-xs text-stone-400 truncate">{meta.description}</p>
                </div>
                {isEnabled && !locked && (
                  <Check className="h-3.5 w-3.5 text-brand-600 flex-shrink-0" />
                )}
                {locked && (
                  <span className="text-[10px] text-stone-400 flex-shrink-0">Always on</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-sm text-red-600 rounded-md bg-red-50 border border-red-200 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            {isFirstTime ? 'Skip for now' : 'Cancel'}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40 transition-colors"
        >
          {isPending ? 'Saving…' : 'Save Categories'}
        </button>
      </div>
    </div>
  )
}
