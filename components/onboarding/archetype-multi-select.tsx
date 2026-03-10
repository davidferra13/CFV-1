'use client'

import { useState, useCallback } from 'react'
import { ARCHETYPES, type ArchetypeId } from '@/lib/archetypes/presets'

type Props = {
  /** Called when the user clicks Continue with their selections. */
  onContinue: (selected: ArchetypeId[]) => void
  /** Optional initial selections (for editing). */
  initialSelection?: ArchetypeId[]
  /** Whether the continue action is in progress. */
  loading?: boolean
}

/**
 * Multi-select archetype picker for onboarding.
 * Users can select one or more archetypes. The first selected becomes
 * the "primary" archetype, which determines nav ordering priority.
 */
export function ArchetypeMultiSelect({
  onContinue,
  initialSelection = [],
  loading = false,
}: Props) {
  const [selected, setSelected] = useState<ArchetypeId[]>(initialSelection)

  const toggleArchetype = useCallback((id: ArchetypeId) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id)
      }
      return [...prev, id]
    })
  }, [])

  const handleContinue = () => {
    if (selected.length > 0) {
      onContinue(selected)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">What kind of chef are you?</h2>
        <p className="text-zinc-400">
          Select one or more that describe your business. The first one you pick sets your default
          nav layout.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {ARCHETYPES.map((archetype) => {
          const isSelected = selected.includes(archetype.id)
          const isPrimary = selected[0] === archetype.id

          return (
            <button
              key={archetype.id}
              type="button"
              onClick={() => toggleArchetype(archetype.id)}
              className={`
                relative p-5 rounded-xl border-2 text-left transition-all
                ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500'
                }
              `}
            >
              {isPrimary && (
                <span className="absolute top-2 right-2 text-xs font-medium bg-orange-500 text-white px-2 py-0.5 rounded-full">
                  Primary
                </span>
              )}

              {isSelected && !isPrimary && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}

              <div className="text-3xl mb-3">{archetype.emoji}</div>
              <h3 className="text-lg font-semibold text-white mb-1">{archetype.label}</h3>
              <p className="text-sm text-zinc-400">{archetype.description}</p>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={selected.length === 0 || loading}
          className={`
            px-8 py-3 rounded-lg font-semibold text-white transition-all
            ${
              selected.length === 0 || loading
                ? 'bg-zinc-600 cursor-not-allowed opacity-50'
                : 'bg-orange-500 hover:bg-orange-600'
            }
          `}
        >
          {loading ? 'Applying...' : 'Continue'}
        </button>
        {selected.length > 1 && (
          <p className="text-sm text-zinc-500">
            {selected.length} archetypes selected. Nav and modules will be merged.
          </p>
        )}
      </div>
    </div>
  )
}
