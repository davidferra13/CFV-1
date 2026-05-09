'use client'

import type { FOHMenuOptions } from '@/lib/menus/foh-menu-options'

// ---------------------------------------------------------------------------
// FOH Customization Panel
// Toggle switches for front-of-house menu display options.
// Manages state locally and calls back on change.
// ---------------------------------------------------------------------------

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none">
      <span className="text-sm text-stone-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-brand-600' : 'bg-stone-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </label>
  )
}

export function FOHCustomizationPanel({
  options,
  onChange,
}: {
  options: FOHMenuOptions
  onChange: (next: FOHMenuOptions) => void
}) {
  const set = (patch: Partial<FOHMenuOptions>) => onChange({ ...options, ...patch })

  return (
    <div className="foh-controls bg-stone-900 border border-stone-800 rounded-lg p-4 mb-6 max-w-[650px] mx-auto">
      <h3 className="text-sm font-medium text-stone-200 mb-3">Customize Menu</h3>

      <div className="space-y-1">
        <Toggle
          label="Show date"
          checked={options.showDate}
          onChange={(v) => set({ showDate: v })}
        />
        <Toggle
          label="Show course numbers"
          checked={options.showCourseNumbers}
          onChange={(v) => set({ showCourseNumbers: v })}
        />
        <Toggle
          label="Show beverage pairings"
          checked={options.showBeveragePairings}
          onChange={(v) => set({ showBeveragePairings: v })}
        />
        <Toggle
          label="Show dietary badges"
          checked={options.showDietaryBadges}
          onChange={(v) => set({ showDietaryBadges: v })}
        />
        <Toggle
          label="Chef attribution"
          checked={options.showChefAttribution}
          onChange={(v) => set({ showChefAttribution: v })}
        />
        <Toggle
          label="Allergy disclaimer"
          checked={options.showAllergyDisclaimer}
          onChange={(v) => set({ showAllergyDisclaimer: v })}
        />
      </div>

      {/* Custom footer note */}
      <div className="mt-3 pt-3 border-t border-stone-800">
        <label className="block text-sm text-stone-300 mb-1.5">Custom footer note</label>
        <input
          type="text"
          value={options.footerNote ?? ''}
          onChange={(e) => set({ footerNote: e.target.value || null })}
          placeholder="e.g. Thank you for a wonderful evening"
          className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-brand-600"
        />
      </div>
    </div>
  )
}
