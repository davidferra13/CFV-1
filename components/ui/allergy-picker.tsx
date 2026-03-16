'use client'

import { useState, useMemo } from 'react'
import { FDA_BIG_9, COMMON_ALLERGENS } from '@/lib/constants/allergens'
import { Input } from '@/components/ui/input'

type AllergyPickerProps = {
  value: string[]
  onChange: (allergies: string[]) => void
  /** Show a text input for custom allergens not in the list */
  allowCustom?: boolean
  /** Compact mode - smaller spacing for inline use */
  compact?: boolean
}

export function AllergyPicker({
  value,
  onChange,
  allowCustom = true,
  compact = false,
}: AllergyPickerProps) {
  const [customInput, setCustomInput] = useState('')

  // Separate selected allergens into known (in our lists) and custom
  const knownAllergens = useMemo(() => {
    const all = new Set([...FDA_BIG_9, ...COMMON_ALLERGENS] as string[])
    return all
  }, [])

  const customAllergens = useMemo(
    () => value.filter((a) => !knownAllergens.has(a)),
    [value, knownAllergens]
  )

  function toggle(allergen: string) {
    if (value.includes(allergen)) {
      onChange(value.filter((a) => a !== allergen))
    } else {
      onChange([...value, allergen])
    }
  }

  function addCustom() {
    const trimmed = customInput.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setCustomInput('')
  }

  function removeCustom(allergen: string) {
    onChange(value.filter((a) => a !== allergen))
  }

  const chipBase = compact
    ? 'px-2 py-0.5 text-xs rounded-md border cursor-pointer select-none transition-colors'
    : 'px-3 py-1 text-sm rounded-lg border cursor-pointer select-none transition-colors'

  const activeClass = 'bg-red-500/20 border-red-500 text-red-300 font-medium'
  const inactiveClass = 'bg-stone-800 border-stone-600 text-stone-400 hover:border-stone-400'

  return (
    <div className="space-y-3">
      {/* Big 9 - FDA required */}
      <div>
        <div className="text-xs font-medium text-stone-500 mb-1.5">
          FDA Big 9 {compact ? '' : '- Major Allergens'}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FDA_BIG_9.map((allergen) => (
            <button
              key={allergen}
              type="button"
              onClick={() => toggle(allergen)}
              className={`${chipBase} ${value.includes(allergen) ? activeClass : inactiveClass}`}
            >
              {value.includes(allergen) ? '* ' : ''}
              {allergen}
            </button>
          ))}
        </div>
      </div>

      {/* Common allergens */}
      <div>
        <div className="text-xs font-medium text-stone-500 mb-1.5">Common</div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_ALLERGENS.map((allergen) => (
            <button
              key={allergen}
              type="button"
              onClick={() => toggle(allergen)}
              className={`${chipBase} ${value.includes(allergen) ? activeClass : inactiveClass}`}
            >
              {value.includes(allergen) ? '* ' : ''}
              {allergen}
            </button>
          ))}
        </div>
      </div>

      {/* Custom allergens */}
      {allowCustom && (
        <div>
          <div className="text-xs font-medium text-stone-500 mb-1.5">Custom</div>
          <div className="flex gap-2">
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustom()
                }
              }}
              placeholder="Add custom allergy..."
              className="flex-1"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!customInput.trim()}
              className="px-3 py-1 text-sm rounded-lg bg-stone-700 text-stone-300 hover:bg-stone-600 disabled:opacity-40"
            >
              Add
            </button>
          </div>
          {customAllergens.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {customAllergens.map((allergen) => (
                <span
                  key={allergen}
                  className={`${chipBase} ${activeClass} inline-flex items-center gap-1`}
                >
                  * {allergen}
                  <button
                    type="button"
                    onClick={() => removeCustom(allergen)}
                    className="ml-1 text-red-400 hover:text-red-200"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
