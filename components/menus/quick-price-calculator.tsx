'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { getQuickPriceEstimate, getMenuListForPricing } from '@/lib/menus/quick-price-actions'
import type { QuickPriceEstimate } from '@/lib/menus/quick-price-actions'

interface QuickPriceCalculatorProps {
  /** Pre-loaded menu list. If not provided, component fetches on mount. */
  menus?: Array<{ id: string; name: string }>
  /** Pre-selected menu ID */
  defaultMenuId?: string
  /** Pre-filled guest count */
  defaultGuestCount?: number
}

export function QuickPriceCalculator({
  menus: initialMenus,
  defaultMenuId,
  defaultGuestCount,
}: QuickPriceCalculatorProps) {
  const [menus, setMenus] = useState(initialMenus || [])
  const [menusLoaded, setMenusLoaded] = useState(!!initialMenus)
  const [menuId, setMenuId] = useState(defaultMenuId || '')
  const [guestCount, setGuestCount] = useState(defaultGuestCount?.toString() || '')
  const [estimate, setEstimate] = useState<QuickPriceEstimate | null>(null)
  const [isPending, startTransition] = useTransition()

  // Load menus on first interaction if not provided
  const ensureMenus = () => {
    if (!menusLoaded) {
      setMenusLoaded(true)
      getMenuListForPricing()
        .then(setMenus)
        .catch(() => {
          toast.error('Failed to load menus')
        })
    }
  }

  const handleCalculate = () => {
    if (!menuId || !guestCount) {
      toast.error('Select a menu and enter guest count')
      return
    }

    const guests = parseInt(guestCount, 10)
    if (isNaN(guests) || guests < 1) {
      toast.error('Guest count must be at least 1')
      return
    }

    startTransition(async () => {
      try {
        const result = await getQuickPriceEstimate(menuId, guests)
        if (result) {
          setEstimate(result)
        } else {
          toast.error('Could not calculate price. Menu may have no dishes.')
        }
      } catch {
        toast.error('Price calculation failed')
      }
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-stone-700 bg-stone-800/50 p-4">
      <h3 className="text-sm font-semibold text-stone-200">Quick Price Calculator</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-300">Menu</label>
          <select
            value={menuId}
            onChange={(e) => {
              setMenuId(e.target.value)
              setEstimate(null)
            }}
            onFocus={ensureMenus}
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          >
            <option value="">Select menu...</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-300">Guests</label>
          <input
            type="number"
            min="1"
            value={guestCount}
            onChange={(e) => {
              setGuestCount(e.target.value)
              setEstimate(null)
            }}
            placeholder="8"
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleCalculate}
        disabled={isPending || !menuId || !guestCount}
        className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {isPending ? 'Calculating...' : 'Calculate Price'}
      </button>

      {estimate && (
        <div className="space-y-3">
          <div className="rounded-lg bg-stone-700/50 p-3">
            <div className="text-xs text-stone-400">
              {estimate.menuName} for {estimate.guestCount} guests
            </div>
            <div className="mt-1 text-sm text-stone-200">
              Ingredient cost: ${(estimate.ingredientCostCents / 100).toFixed(2)}
              <span className="text-stone-400">
                {' '}
                (${(estimate.costPerGuestCents / 100).toFixed(2)}/guest)
              </span>
            </div>
            {!estimate.hasAllPrices && (
              <div className="mt-1 text-xs text-amber-400">
                {estimate.missingPriceCount} ingredient(s) missing prices. Estimate may be low.
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-stone-400">Suggested pricing:</div>
            {estimate.suggestedPrices.map((sp) => (
              <div
                key={sp.markup}
                className="flex items-center justify-between rounded-lg bg-stone-700/30 px-3 py-2"
              >
                <span className="text-xs text-stone-400">{sp.markup}x markup</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-stone-100">
                    {sp.perGuestDollars}/guest
                  </span>
                  <span className="ml-2 text-xs text-stone-500">
                    (${(sp.totalCents / 100).toFixed(2)} total)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
