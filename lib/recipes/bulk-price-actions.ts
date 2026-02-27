'use server'

// Standalone server action for bulk-updating ingredient prices.
// Used by GroceryQuotePanel to save discovered prices back to the Recipe Book.
// Separated from lib/recipes/actions.ts to keep the panel import path clean.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function bulkUpdateIngredientPrices(
  updates: Array<{ ingredientId: string; pricePerUnitCents: number }>
): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  if (updates.length === 0) return

  await Promise.all(
    updates.map(({ ingredientId, pricePerUnitCents }) =>
      supabase
        .from('ingredients')
        .update({
          last_price_cents: pricePerUnitCents,
          last_price_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', ingredientId)
        .eq('tenant_id', user.tenantId!)
    )
  )

  // Bust recipe/costing caches so food cost % and menu profitability update
  revalidatePath('/recipes')
  revalidatePath('/events')
}
