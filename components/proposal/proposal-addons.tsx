'use client'

import { Sparkles, Check } from 'lucide-react'

type Addon = {
  id: string
  addonId: string
  name: string
  description: string | null
  priceCents: number
  isPerPerson: boolean
  isDefaultSelected: boolean
  sortOrder: number
}

type ProposalAddonsProps = {
  addons: Addon[]
  selectedAddonIds: string[]
  guestCount: number | null
  onToggle: (addonId: string) => void
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function ProposalAddons({
  addons,
  selectedAddonIds,
  guestCount,
  onToggle,
}: ProposalAddonsProps) {
  if (addons.length === 0) return null

  return (
    <section>
      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="h-5 w-5 text-amber-600" />
        <h2 className="text-xl font-semibold text-gray-900">Customize Your Experience</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">Select any enhancements you would like to add.</p>

      <div className="space-y-3">
        {addons.map((addon) => {
          const isSelected = selectedAddonIds.includes(addon.id)
          const lineTotal =
            addon.isPerPerson && guestCount ? addon.priceCents * guestCount : addon.priceCents

          return (
            <button
              key={addon.id}
              type="button"
              onClick={() => onToggle(addon.id)}
              className={`
                w-full text-left rounded-xl border-2 px-4 py-4 transition-all duration-200
                ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{addon.name}</span>
                  </div>
                  {addon.description && (
                    <p className="text-sm text-gray-500 mt-1">{addon.description}</p>
                  )}
                  <p className="text-sm text-gray-400 mt-1">
                    {formatCents(addon.priceCents)}
                    {addon.isPerPerson ? ' per person' : ' flat rate'}
                    {addon.isPerPerson && guestCount && guestCount > 1 && (
                      <span className="text-gray-500"> ({formatCents(lineTotal)} total)</span>
                    )}
                  </p>
                </div>

                {/* Selection indicator */}
                <div
                  className={`
                    mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                    transition-all duration-200
                    ${isSelected ? 'bg-amber-500 text-white' : 'border-2 border-gray-300'}
                  `}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
