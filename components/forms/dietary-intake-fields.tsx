'use client'

// Shared Dietary Intake Fields
// Structured allergy and dietary preference collection for public flows
// (inquiry, instant-book, onboarding). Replaces free-text-only patterns.

import { useState, useCallback } from 'react'
import {
  getAllergenEntries,
  getDietaryPatternEntries,
  SEVERITY_LABELS,
  type CanonicalSeverity,
  type DietaryCatalogEntry,
} from '@/lib/dietary/catalog'

// ── Types ───────────────────────────────────────────────────────────────────

export type DietaryIntakeValue = {
  accommodationFlag: 'no' | 'yes' | 'unsure'
  dietaryPatterns: string[]
  allergySelections: Array<{
    allergen: string
    severity: CanonicalSeverity
  }>
  additionalNotes: string
}

type Props = {
  value: DietaryIntakeValue
  onChange: (value: DietaryIntakeValue) => void
  /** Optional reassurance text (e.g., "This chef shares menus for approval") */
  reassuranceText?: string
  /** Compact layout for embedded forms */
  compact?: boolean
}

// ── Precomputed catalog data ────────────────────────────────────────────────

const ALLERGEN_ENTRIES = getAllergenEntries()
const DIETARY_PATTERNS = getDietaryPatternEntries()
const SEVERITY_OPTIONS: CanonicalSeverity[] = [
  'preference',
  'intolerance',
  'allergy',
  'anaphylaxis',
]

// ── Component ───────────────────────────────────────────────────────────────

export function DietaryIntakeFields({ value, onChange, reassuranceText, compact }: Props) {
  const [customAllergen, setCustomAllergen] = useState('')

  const update = useCallback(
    (partial: Partial<DietaryIntakeValue>) => {
      onChange({ ...value, ...partial })
    },
    [value, onChange]
  )

  const togglePattern = useCallback(
    (patternId: string) => {
      const patterns = value.dietaryPatterns.includes(patternId)
        ? value.dietaryPatterns.filter((p) => p !== patternId)
        : [...value.dietaryPatterns, patternId]
      update({ dietaryPatterns: patterns })
    },
    [value.dietaryPatterns, update]
  )

  const addAllergen = useCallback(
    (entry: DietaryCatalogEntry) => {
      if (value.allergySelections.some((a) => a.allergen === entry.label)) return
      update({
        allergySelections: [
          ...value.allergySelections,
          { allergen: entry.label, severity: entry.defaultSeverity },
        ],
      })
    },
    [value.allergySelections, update]
  )

  const addCustomAllergen = useCallback(() => {
    const trimmed = customAllergen.trim()
    if (!trimmed) return
    if (value.allergySelections.some((a) => a.allergen.toLowerCase() === trimmed.toLowerCase()))
      return
    update({
      allergySelections: [...value.allergySelections, { allergen: trimmed, severity: 'allergy' }],
    })
    setCustomAllergen('')
  }, [customAllergen, value.allergySelections, update])

  const removeAllergen = useCallback(
    (allergen: string) => {
      update({
        allergySelections: value.allergySelections.filter((a) => a.allergen !== allergen),
      })
    },
    [value.allergySelections, update]
  )

  const updateSeverity = useCallback(
    (allergen: string, severity: CanonicalSeverity) => {
      update({
        allergySelections: value.allergySelections.map((a) =>
          a.allergen === allergen ? { ...a, severity } : a
        ),
      })
    },
    [value.allergySelections, update]
  )

  const labelClass = compact ? 'text-sm font-medium' : 'text-sm font-semibold'
  const gapClass = compact ? 'space-y-3' : 'space-y-4'

  return (
    <div className={gapClass}>
      {/* Accommodation flag */}
      <div>
        <label className={`${labelClass} text-stone-700 dark:text-stone-300 block mb-2`}>
          Do any guests need dietary accommodations?
        </label>
        <div className="flex gap-3">
          {(['no', 'yes', 'unsure'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => update({ accommodationFlag: opt })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                value.accommodationFlag === opt
                  ? 'bg-brand-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
              }`}
            >
              {opt === 'no' ? 'No' : opt === 'yes' ? 'Yes' : 'Not sure yet'}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded fields when "Yes" is selected */}
      {value.accommodationFlag === 'yes' && (
        <>
          {/* Dietary patterns */}
          <div>
            <label className={`${labelClass} text-stone-700 dark:text-stone-300 block mb-2`}>
              Dietary preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_PATTERNS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => togglePattern(entry.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    value.dietaryPatterns.includes(entry.id)
                      ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-300 dark:bg-brand-900/50 dark:text-brand-300 dark:ring-brand-700'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {/* Allergen picker */}
          <div>
            <label className={`${labelClass} text-stone-700 dark:text-stone-300 block mb-2`}>
              Allergies
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ALLERGEN_ENTRIES.map((entry) => {
                const isSelected = value.allergySelections.some((a) => a.allergen === entry.label)
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => (isSelected ? removeAllergen(entry.label) : addAllergen(entry))}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                      isSelected
                        ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:ring-amber-700'
                        : 'bg-stone-50 text-stone-500 hover:bg-stone-100 dark:bg-stone-800/50 dark:text-stone-500 dark:hover:bg-stone-700'
                    }`}
                  >
                    {entry.classification === 'fda_major' && (
                      <span className="font-semibold">{entry.label}</span>
                    )}
                    {entry.classification !== 'fda_major' && entry.label}
                  </button>
                )
              })}
            </div>

            {/* Custom allergen input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customAllergen}
                onChange={(e) => setCustomAllergen(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomAllergen()
                  }
                }}
                placeholder="Other allergen..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-sm bg-white dark:bg-stone-900 dark:border-stone-700 dark:text-stone-300"
              />
              <button
                type="button"
                onClick={addCustomAllergen}
                disabled={!customAllergen.trim()}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-40 dark:bg-stone-800 dark:text-stone-400"
              >
                Add
              </button>
            </div>
          </div>

          {/* Selected allergies with severity */}
          {value.allergySelections.length > 0 && (
            <div className="space-y-2">
              {value.allergySelections.map((sel) => (
                <div
                  key={sel.allergen}
                  className="flex items-center gap-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300 flex-1">
                    {sel.allergen}
                  </span>
                  <select
                    value={sel.severity}
                    onChange={(e) =>
                      updateSeverity(sel.allergen, e.target.value as CanonicalSeverity)
                    }
                    className="text-xs px-2 py-1 rounded border border-stone-300 bg-white dark:bg-stone-900 dark:border-stone-700 dark:text-stone-300"
                  >
                    {SEVERITY_OPTIONS.map((sev) => (
                      <option key={sev} value={sev}>
                        {SEVERITY_LABELS[sev]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeAllergen(sel.allergen)}
                    className="text-stone-400 hover:text-red-500 text-sm"
                    aria-label={`Remove ${sel.allergen}`}
                  >
                    &times;
                  </button>
                </div>
              ))}

              {/* Anaphylaxis inline caution */}
              {value.allergySelections.some((a) => a.severity === 'anaphylaxis') && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                  Severe allergies noted. The chef will confirm allergy handling before finalizing
                  your booking.
                </p>
              )}
            </div>
          )}

          {/* Additional notes */}
          <div>
            <label className={`${labelClass} text-stone-700 dark:text-stone-300 block mb-1`}>
              Additional context
            </label>
            <textarea
              value={value.additionalNotes}
              onChange={(e) => update({ additionalNotes: e.target.value })}
              placeholder="Cross-contact concerns, preparation notes, or anything else..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white dark:bg-stone-900 dark:border-stone-700 dark:text-stone-300"
            />
          </div>
        </>
      )}

      {/* Reassurance copy */}
      {reassuranceText && (
        <p className="text-xs text-stone-400 dark:text-stone-500">{reassuranceText}</p>
      )}
    </div>
  )
}

/** Create a fresh empty intake value */
export function emptyDietaryIntake(): DietaryIntakeValue {
  return {
    accommodationFlag: 'no',
    dietaryPatterns: [],
    allergySelections: [],
    additionalNotes: '',
  }
}
