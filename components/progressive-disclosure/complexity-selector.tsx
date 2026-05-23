// Complexity level selector for settings page.
// Three cards: Starter, Standard, Pro. Current selection highlighted.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setComplexityLevel } from '@/lib/progressive-disclosure/disclosure-actions'
import {
  COMPLEXITY_LEVELS,
  COMPLEXITY_PRESETS,
  type ComplexityLevel,
} from '@/lib/progressive-disclosure/complexity-config'
import { Card, CardContent } from '@/components/ui/card'
import { ChefHat, Flame, Sparkles } from '@/components/ui/icons'

const LEVEL_ICONS: Record<ComplexityLevel, typeof ChefHat> = {
  starter: ChefHat,
  standard: Flame,
  pro: Sparkles,
}

const LEVEL_COLORS: Record<ComplexityLevel, { ring: string; bg: string; text: string }> = {
  starter: {
    ring: 'ring-emerald-500',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-400',
  },
  standard: {
    ring: 'ring-brand-500',
    bg: 'bg-brand-950/40',
    text: 'text-brand-400',
  },
  pro: {
    ring: 'ring-amber-500',
    bg: 'bg-amber-950/40',
    text: 'text-amber-400',
  },
}

export function ComplexitySelector({ currentLevel }: { currentLevel: ComplexityLevel }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<ComplexityLevel>(currentLevel)
  const [error, setError] = useState<string | null>(null)

  function handleSelect(level: ComplexityLevel) {
    if (level === selected || isPending) return
    setError(null)
    setSelected(level)
    startTransition(async () => {
      try {
        const result = await setComplexityLevel(level)
        if (!result.success) {
          setError(result.error ?? 'Failed to update')
          setSelected(currentLevel)
        } else {
          router.refresh()
        }
      } catch {
        setError('Something went wrong')
        setSelected(currentLevel)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-stone-100">Feature Level</h3>
        <p className="text-sm text-stone-400 mt-1">
          Control how many features you see in the navigation. You can change this anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {COMPLEXITY_LEVELS.map((level) => {
          const preset = COMPLEXITY_PRESETS[level]
          const Icon = LEVEL_ICONS[level]
          const colors = LEVEL_COLORS[level]
          const isActive = selected === level

          return (
            <button
              key={level}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(level)}
              className={`text-left transition-all duration-200 rounded-xl border p-4 ${
                isActive
                  ? `${colors.bg} border-transparent ring-2 ${colors.ring}`
                  : 'border-stone-700/50 hover:border-stone-600 bg-stone-900/50'
              } ${isPending ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${isActive ? colors.text : 'text-stone-500'}`} />
                <span
                  className={`text-sm font-semibold ${isActive ? colors.text : 'text-stone-300'}`}
                >
                  {preset.label}
                </span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">{preset.description}</p>
              {isActive && (
                <p className="text-xs font-medium mt-2 text-stone-500">Currently active</p>
              )}
            </button>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
