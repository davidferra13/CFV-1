# Price Flag Resolution UI - Build Spec

## Context

When receipts are processed, ingredient prices are auto-applied. If a new price deviates >50% from the historical average, the system flags it instead of auto-applying. The backend is fully wired:

- **Flag set by:** `lib/finance/expense-line-item-actions.ts` lines 486-503 (`applyLineItemPrices`)
- **Flag resolved by:** `lib/finance/expense-line-item-actions.ts` lines 552-617 (`resolvePriceFlag`)
- **DB columns:** `ingredients.price_flag_pending` (boolean), `ingredients.price_flag_new_cents` (integer), `ingredients.price_flag_reason` (text)

**Problem:** No UI exists. Flagged prices are invisible to chefs. This is a Zero Hallucination violation (data exists but is hidden).

## What to Build

A `PriceFlagBanner` component that:

1. Queries ingredients where `price_flag_pending = true`
2. Displays a dismissible alert/banner on the ingredients page
3. Lists each flagged ingredient with: name, current price, proposed price, reason
4. Provides Accept/Reject buttons per ingredient that call `resolvePriceFlag(ingredientId, accept)`

## Files to Create

### 1. `components/pricing/price-flag-banner.tsx` (NEW - Client Component)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { resolvePriceFlag } from '@/lib/finance/expense-line-item-actions'
import { toast } from 'sonner'

type FlaggedIngredient = {
  id: string
  name: string
  cost_per_unit_cents: number | null
  price_flag_new_cents: number | null
  price_flag_reason: string | null
  price_unit: string | null
}

export function PriceFlagBanner({ flagged }: { flagged: FlaggedIngredient[] }) {
  const [items, setItems] = useState(flagged)
  const [pending, startTransition] = useTransition()

  if (items.length === 0) return null

  function handleResolve(ingredientId: string, accept: boolean) {
    startTransition(async () => {
      try {
        const result = await resolvePriceFlag(ingredientId, accept)
        if (result.success) {
          setItems((prev) => prev.filter((i) => i.id !== ingredientId))
          toast.success(accept ? 'Price updated' : 'Price change rejected')
        } else {
          toast.error(result.error || 'Failed to resolve')
        }
      } catch {
        toast.error('Failed to resolve price flag')
      }
    })
  }

  const formatPrice = (cents: number | null) =>
    cents != null ? `$${(cents / 100).toFixed(2)}` : 'N/A'

  return (
    <Card className="border-amber-800 bg-amber-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-amber-400">
          Price Review Needed ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-stone-400">
          These prices deviated significantly from historical averages. Review before applying.
        </p>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 rounded border border-stone-800 bg-stone-900/50 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-stone-200">{item.name}</span>
              <div className="text-xs text-stone-400">
                {formatPrice(item.cost_per_unit_cents)} {'>'}{' '}
                {formatPrice(item.price_flag_new_cents)}
                {item.price_unit ? ` / ${item.price_unit}` : ''}
              </div>
              {item.price_flag_reason && (
                <div className="text-xs text-amber-500">{item.price_flag_reason}</div>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => handleResolve(item.id, true)}
                className="text-green-500 hover:text-green-400 text-xs"
              >
                Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => handleResolve(item.id, false)}
                className="text-red-500 hover:text-red-400 text-xs"
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

### 2. `lib/pricing/get-flagged-prices.ts` (NEW - Server Function)

```ts
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export async function getFlaggedPrices() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('ingredients')
    .select('id, name, cost_per_unit_cents, price_flag_new_cents, price_flag_reason, price_unit')
    .eq('tenant_id', user.tenantId!)
    .eq('price_flag_pending', true)

  return data ?? []
}
```

### 3. Wire into `app/(chef)/culinary/ingredients/page.tsx` (EDIT)

At the top, add imports:

```tsx
import { getFlaggedPrices } from '@/lib/pricing/get-flagged-prices'
import { PriceFlagBanner } from '@/components/pricing/price-flag-banner'
```

Inside the `IngredientsPage` component, after the `requireChef()` and `getIngredients()` calls, add:

```tsx
const flaggedPrices = await getFlaggedPrices()
```

Then render `<PriceFlagBanner flagged={flaggedPrices} />` ABOVE the ingredients table (immediately after the page header / before the main content). It self-hides when empty.

## Constraints for Builder

- Do NOT modify `lib/finance/expense-line-item-actions.ts`. It is complete and correct.
- Do NOT modify `types/database.ts`. It is already updated.
- Use ONLY existing UI components from `components/ui/` (Card, Button, Badge, etc.).
- Follow the existing dark theme (stone/amber color palette visible in the ingredients page).
- The `resolvePriceFlag` function is already exported from `lib/finance/expense-line-item-actions.ts`. Import it directly in the client component.
- `formatCurrency` exists at `lib/utils/currency.ts` if you prefer it over inline formatting.
- Toast via `sonner` (already used project-wide).
- The banner must self-hide when `flagged` array is empty.
- Do NOT add any em dashes anywhere.
- Keep the component simple. No modals, no tables, no pagination. Just a banner with accept/reject per item.

## Verification

After building:

1. Run `npx tsc --noEmit --skipLibCheck` - must pass
2. Run `npx next build --no-lint` - must pass
3. No new type errors introduced

## Files Changed Summary

| File                                       | Action                                        |
| ------------------------------------------ | --------------------------------------------- |
| `components/pricing/price-flag-banner.tsx` | CREATE                                        |
| `lib/pricing/get-flagged-prices.ts`        | CREATE                                        |
| `app/(chef)/culinary/ingredients/page.tsx` | EDIT (add 2 imports + 1 data call + 1 render) |
