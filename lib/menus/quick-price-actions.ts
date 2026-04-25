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
