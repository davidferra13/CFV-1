'use client'

// InventoryCountForm - Mobile-friendly inventory count form.
// Count updates append inventory ledger movements instead of replacing truth.

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ClipboardCheck, Package, AlertTriangle } from '@/components/ui/icons'
import { updateInventoryCount } from '@/lib/inventory/count-actions'
import { toast } from 'sonner'

export type InventoryCount = {
  id: string
  ingredientName: string
  currentQty: number
  parLevel: number
  unit: string
  lastCountedAt: string | null
  vendorId?: string
}

function parBadge(current: number, par: number) {
  if (current > par) return <Badge variant="success">Above Par</Badge>
  if (current === par) return <Badge variant="warning">At Par</Badge>
  return <Badge variant="error">Below Par</Badge>
}

export function InventoryCountForm({ items }: { items: InventoryCount[] }) {
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(items.map((item) => [item.id, item.currentQty]))
  )
  const [pending, startTransition] = useTransition()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)

  function handleCountChange(id: string, value: string) {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      setCounts((prev) => ({ ...prev, [id]: num }))
    }
  }

  function handleUpdate(item: InventoryCount) {
    setUpdatingId(item.id)
    setSuccessId(null)
    startTransition(async () => {
      try {
        await updateInventoryCount({
          ingredientName: item.ingredientName,
          currentQty: counts[item.id],
          parLevel: item.parLevel,
          unit: item.unit,
          vendorId: item.vendorId,
        })
        setUpdatingId(null)
        setSuccessId(item.id)
        setTimeout(() => setSuccessId((prev) => (prev === item.id ? null : prev)), 2000)
      } catch (err) {
        setUpdatingId(null)
        toast.error('Failed to update inventory count')
      }
    })
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">No inventory items to count.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-stone-400" />
          Inventory Count
        </CardTitle>
        <p className="text-xs text-stone-500">
          Saved counts create an auditable opening balance or correction movement.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-stone-800">
          {items.map((item) => {
            const currentCount = counts[item.id]
            const changed = currentCount !== item.currentQty

            return (
              <div
                key={item.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-stone-100 truncate">
                      {item.ingredientName}
                    </span>
                    {parBadge(currentCount, item.parLevel)}
                  </div>
                  <p className="text-xs text-stone-500">
                    Par: {item.parLevel} {item.unit}
                    {item.lastCountedAt && (
                      <span className="ml-2">
                        Last counted: {new Date(item.lastCountedAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>

                {/* Count input - large for mobile */}
                <div className="flex items-center gap-2">
                  <div className="w-28">
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={currentCount}
                      onChange={(e) => handleCountChange(item.id, e.target.value)}
                      className="text-center text-lg h-12 font-semibold"
                    />
                  </div>
                  <span className="text-sm text-stone-500 w-12">{item.unit}</span>
                  <Button
                    variant={changed ? 'primary' : 'secondary'}
                    size="md"
                    disabled={!changed || (pending && updatingId === item.id)}
                    loading={pending && updatingId === item.id}
                    onClick={() => handleUpdate(item)}
                  >
                    {successId === item.id ? 'Saved' : 'Update'}
                  </Button>
                </div>

                {/* Below-par warning */}
                {currentCount < item.parLevel && (
                  <div className="flex items-center gap-1 text-amber-600 text-xs sm:hidden">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>
                      {(item.parLevel - currentCount).toFixed(1)} {item.unit} below par
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
