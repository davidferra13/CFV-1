# Codex Task: Quick Price Calculator from Saved Menu

## Problem

Emergency chefs need instant pricing. Client asks "how much?" and the chef must answer in seconds. Currently, getting a price requires: open menu, check cost breakdown, mentally multiply by guests, add markup. This task creates a single server action that takes a menu ID + guest count and returns a price estimate in one call, plus a small UI to display it.

## Context

The existing function `getMenuBreakdown(menuId)` in `lib/menus/menu-intelligence-actions.ts` already computes full cost breakdown per menu (total cost in cents, cost per guest, food cost %). This task wraps it with a simpler interface: menu + guest count + markup = price estimate.

## What to Build

2 new files only. Zero modifications to existing files.

---

### Change 1: New server action file

**Create:** `lib/menus/quick-price-actions.ts`

```ts
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getMenuBreakdown } from './menu-intelligence-actions'
import { getMenus } from './actions'

// ---------------------------------------------------------------------------
// Quick Price Calculator
// Takes a menu ID + guest count, returns instant price estimate.
// Read-only: does NOT create quotes, events, or ledger entries.
// ---------------------------------------------------------------------------

export interface QuickPriceEstimate {
  menuId: string
  menuName: string
  guestCount: number
  // All amounts in cents
  ingredientCostCents: number
  costPerGuestCents: number
  // Suggested prices at different markups
  suggestedPrices: {
    markup: number // e.g. 2.5, 3.0, 3.5
    totalCents: number
    perGuestCents: number
    perGuestDollars: string // formatted, e.g. "$125.00"
  }[]
  // Warnings
  hasAllPrices: boolean
  missingPriceCount: number
}

const DEFAULT_MARKUPS = [2.5, 3.0, 3.5]

/**
 * Calculate a quick price estimate for a saved menu at a given guest count.
 * Uses existing getMenuBreakdown() for cost data.
 * Returns null if menu not found or has no dishes.
 */
export async function getQuickPriceEstimate(
  menuId: string,
  guestCount: number
): Promise<QuickPriceEstimate | null> {
  await requireChef()

  if (guestCount < 1) return null

  const breakdown = await getMenuBreakdown(menuId)
  if (!breakdown) return null

  // getMenuBreakdown returns costs based on the menu's own guest count.
  // We need to scale to the requested guest count.
  const originalGuests = breakdown.guestCount || 1
  const scaleFactor = guestCount / originalGuests

  const scaledTotalCostCents = Math.round(breakdown.totalCostCents * scaleFactor)
  const costPerGuestCents = Math.round(scaledTotalCostCents / guestCount)

  const suggestedPrices = DEFAULT_MARKUPS.map((markup) => {
    const totalCents = Math.round(scaledTotalCostCents * markup)
    const perGuestCents = Math.round(totalCents / guestCount)
    return {
      markup,
      totalCents,
      perGuestCents,
      perGuestDollars: `$${(perGuestCents / 100).toFixed(2)}`,
    }
  })

  return {
    menuId: breakdown.menuId,
    menuName: breakdown.menuName,
    guestCount,
    ingredientCostCents: scaledTotalCostCents,
    costPerGuestCents,
    suggestedPrices,
    hasAllPrices: breakdown.hasAllPrices,
    missingPriceCount: breakdown.missingPriceCount,
  }
}

/**
 * Get a simple list of menus for the dropdown.
 * Returns only id and name, sorted by most recent.
 */
export async function getMenuListForPricing(): Promise<Array<{ id: string; name: string }>> {
  const menus = await getMenus()
  return (menus || []).map((m: any) => ({ id: m.id, name: m.name }))
}
```

---

### Change 2: New standalone UI component

**Create:** `components/menus/quick-price-calculator.tsx`

This is a self-contained client component. It is NOT wired into any existing page. It can be imported and used anywhere (circle detail page, event creation, inquiry detail, etc.) by a future task.

```tsx
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
```

---

## DO NOT

- Do NOT modify `menu-intelligence-actions.ts` or any existing menu file
- Do NOT modify any existing page files
- Do NOT create any database migrations
- Do NOT create quotes, events, or ledger entries (this is READ-ONLY)
- Do NOT add any new dependencies or npm packages
- Do NOT rename or move any existing files
- Do NOT add this component to any existing page (it is standalone, to be wired later)

## Verification

After building, verify:

1. `npx tsc --noEmit --skipLibCheck` passes (no type errors)
2. The `getQuickPriceEstimate` function is importable from `lib/menus/quick-price-actions`
3. The `QuickPriceCalculator` component is importable from `components/menus/quick-price-calculator`
4. The `getMenuListForPricing` action returns an array of `{ id, name }` objects
5. No em dashes in any file
6. The component does NOT write to any database table
