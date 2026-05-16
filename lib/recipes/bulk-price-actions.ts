'use server'

// Standalone server action for bulk-updating ingredient prices.
// Used by GroceryQuotePanel to save discovered prices back to the Recipe Book.
// Separated from lib/recipes/actions.ts to keep the panel import path clean.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { propagatePriceChange } from '@/lib/pricing/cost-refresh-actions'
import { revalidatePath } from 'next/cache'

export async function bulkUpdateIngredientPrices(
  updates: Array<{ ingredientId: string; pricePerUnitCents: number }>
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (updates.length === 0) return

  const updateResults = await Promise.all(
    updates.map(({ ingredientId, pricePerUnitCents }) =>
      db
        .from('ingredients')
        .update({
          last_price_cents: pricePerUnitCents,
          last_price_date: ((_d) =>
            `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(
            new Date()
          ),
        })
        .eq('id', ingredientId)
        .eq('tenant_id', user.tenantId!)
        .select('id')
    )
  )

  const changedIngredientIds = [
    ...new Set(
      updateResults.flatMap((result: any) => (result.data ?? []).map((row: any) => row.id))
    ),
  ]
  if (changedIngredientIds.length > 0) {
    try {
      await propagatePriceChange(changedIngredientIds, { tenantId: user.tenantId! })
    } catch (err) {
      console.error('[bulkUpdateIngredientPrices] Price cascade failed (non-blocking):', err)
    }
  }

  // Bust recipe/costing caches so food cost % and menu profitability update
  revalidatePath('/recipes')
  revalidatePath('/events')
}
