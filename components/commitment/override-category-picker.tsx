'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { OVERRIDE_CATEGORY_LABELS, type OverrideCategory } from '@/lib/commitment/types'
import { suggestCategory } from '@/lib/commitment/override-taxonomy'

interface OverrideCategoryPickerProps {
  value: OverrideCategory | null
  onChange: (category: OverrideCategory) => void
  /** Free-text reason for auto-suggest */
  reasonText?: string
  /** Show compact inline layout */
  compact?: boolean
}

const CATEGORY_ICONS: Record<OverrideCategory, string> = {
  time_constraint: '⏱️',
  client_request: '👤',
  ingredient_substitution: '🥬',
  venue_change: '🏠',
  simplified_service: '📋',
  financial_pressure: '💰',
  scheduling_cascade: '🔗',
  chef_judgment: '👨‍🍳',
  other: '📌',
}

const CATEGORIES: OverrideCategory[] = [
  'time_constraint',
  'client_request',
  'ingredient_substitution',
  'venue_change',
  'financial_pressure',
  'scheduling_cascade',
  'chef_judgment',
  'other',
]

export function OverrideCategoryPicker({
  value,
  onChange,
  reasonText,
  compact = false,
}: OverrideCategoryPickerProps) {
  const [suggested, setSuggested] = useState<OverrideCategory | null>(null)

  // Auto-suggest category when reason text changes
  useEffect(() => {
    if (!reasonText || reasonText.trim().length < 3) {
      setSuggested(null)
      return
    }
    const timer = setTimeout(() => {
      const result = suggestCategory(reasonText)
      setSuggested(result)
    }, 300)
    return () => clearTimeout(timer)
  }, [reasonText])

  const handleSelect = useCallback(
    (category: OverrideCategory) => {
      onChange(category)
    },
    [onChange]
  )

  // Accept suggestion
  const handleAcceptSuggestion = useCallback(() => {
    if (suggested) {
      onChange(suggested)
    }
  }, [suggested, onChange])

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Suggestion banner */}
        {suggested && !value && (
          <button
            type="button"
            onClick={handleAcceptSuggestion}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg bg-brand-950/30 border border-brand-800/30 hover:bg-brand-950/50 transition-colors text-left"
          >
            <span className="text-xs text-brand-400">Suggested:</span>
            <span className="text-xs text-brand-300 font-medium">
              {CATEGORY_ICONS[suggested]} {OVERRIDE_CATEGORY_LABELS[suggested]}
            </span>
            <span className="text-xxs text-brand-500 ml-auto">Click to apply</span>
          </button>
        )}

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const isSelected = value === cat
            const isSuggested = suggested === cat && !value
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelect(cat)}
                className={`
                  inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs
                  transition-all duration-150 border
                  ${
                    isSelected
                      ? 'bg-brand-600/20 border-brand-500/50 text-brand-300 font-medium'
                      : isSuggested
                        ? 'bg-stone-800/60 border-brand-700/30 text-stone-300'
                        : 'bg-stone-900/60 border-stone-700/40 text-stone-400 hover:bg-stone-800/60 hover:text-stone-300'
                  }
                `}
              >
                <span className="text-xs leading-none">{CATEGORY_ICONS[cat]}</span>
                <span>{OVERRIDE_CATEGORY_LABELS[cat]}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Full layout (grid)
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-stone-300">Override Category</label>

      {/* Suggestion banner */}
      {suggested && !value && (
        <button
          type="button"
          onClick={handleAcceptSuggestion}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-brand-950/30 border border-brand-800/30 hover:bg-brand-950/50 transition-colors text-left"
        >
          <span className="text-sm text-brand-400">Suggested:</span>
          <span className="text-sm text-brand-300 font-medium">
            {CATEGORY_ICONS[suggested]} {OVERRIDE_CATEGORY_LABELS[suggested]}
          </span>
          <Badge variant="default" className="ml-auto text-xxs">
            Auto-detected
          </Badge>
        </button>
      )}

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((cat) => {
          const isSelected = value === cat
          const isSuggested = suggested === cat && !value
          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleSelect(cat)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left
                transition-all duration-150 border
                ${
                  isSelected
                    ? 'bg-brand-600/20 border-brand-500/50 text-brand-200 font-medium ring-1 ring-brand-500/30'
                    : isSuggested
                      ? 'bg-stone-800/60 border-brand-700/30 text-stone-300'
                      : 'bg-stone-900/60 border-stone-700/40 text-stone-400 hover:bg-stone-800/60 hover:text-stone-300'
                }
              `}
            >
              <span className="text-base leading-none shrink-0">{CATEGORY_ICONS[cat]}</span>
              <span className="truncate">{OVERRIDE_CATEGORY_LABELS[cat]}</span>
            </button>
          )
        })}
      </div>

      {/* Selected confirmation */}
      {value && (
        <p className="text-xs text-stone-500">
          Selected: {CATEGORY_ICONS[value]} {OVERRIDE_CATEGORY_LABELS[value]}
        </p>
      )}
    </div>
  )
}
