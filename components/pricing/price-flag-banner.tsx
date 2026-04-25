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
