'use client'

import { useState, useEffect } from 'react'
import type { EventTheme } from '@/lib/hub/types'
import { getThemes } from '@/lib/themes/actions'
import { groupThemesByCategory } from '@/lib/themes/theme-registry'

interface ThemePickerProps {
  currentThemeId?: string | null
  onSelect: (theme: EventTheme) => void
}

export function ThemePicker({ currentThemeId, onSelect }: ThemePickerProps) {
  const [themes, setThemes] = useState<EventTheme[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getThemes()
      .then(setThemes)
      .catch(() => setThemes([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-4 text-sm text-stone-500">Loading themes...</div>
  }

  const grouped = groupThemesByCategory(themes)

  return (
    <div className="space-y-6 p-4">
      <h3 className="text-sm font-semibold text-stone-300">🎨 Choose a Theme</h3>

      {grouped.map(({ category, label, themes: categoryThemes }) => (
        <div key={category}>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">
            {label}
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categoryThemes.map((theme) => {
              const isSelected = theme.id === currentThemeId
              return (
                <button
                  key={theme.id}
                  onClick={() => onSelect(theme)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-white ring-2 ring-white/20'
                      : 'border-stone-700 hover:border-stone-500'
                  }`}
                  style={{
                    background: theme.background_gradient ?? theme.primary_color,
                  }}
                >
                  <div className="mb-1 text-xl">{theme.emoji}</div>
                  <div className="text-xs font-semibold text-stone-900/80">{theme.name}</div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
