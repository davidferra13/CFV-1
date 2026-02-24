'use client'

// GroceryRoute — Store route display for grocery shopping trips.
// Shows a numbered list of stores in the suggested visit order,
// with each store's item checklist and item count summary.
// Simple list layout — no map integration needed.

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, ShoppingCart, ChevronDown, ChevronRight, Package } from 'lucide-react'

type StoreItem = {
  name: string
  quantity: number
  unit: string
}

type Store = {
  name: string
  address: string
  items: StoreItem[]
}

type Props = {
  route: {
    stores: Store[]
  }
}

export function GroceryRoute({ route }: Props) {
  const [expandedStores, setExpandedStores] = useState<Set<number>>(() => {
    // Expand all stores by default
    return new Set(route.stores.map((_, i) => i))
  })

  if (route.stores.length === 0) {
    return (
      <Card className="border-dashed border-stone-600">
        <CardContent className="py-8">
          <div className="text-center">
            <ShoppingCart className="h-8 w-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">No stores in this route</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalItems = route.stores.reduce((sum, store) => sum + store.items.length, 0)
  const totalStores = route.stores.length

  function toggleStore(index: number) {
    setExpandedStores((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-stone-400" />
            Grocery Route
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="default">
              {totalStores} {totalStores === 1 ? 'store' : 'stores'}
            </Badge>
            <Badge variant="info">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-stone-500 -mt-1">Suggested order for efficient shopping</p>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {route.stores.map((store, index) => {
            const isExpanded = expandedStores.has(index)
            const storeNumber = index + 1

            return (
              <div
                key={`${store.name}-${index}`}
                className="rounded-lg border border-stone-700 overflow-hidden"
              >
                {/* Store header */}
                <button
                  type="button"
                  onClick={() => toggleStore(index)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-stone-800 hover:bg-stone-700 transition-colors text-left"
                >
                  {/* Step number */}
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center">
                    {storeNumber}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-100 truncate">{store.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
                      <p className="text-xs text-stone-500 truncate">{store.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-stone-500">
                      {store.items.length} {store.items.length === 1 ? 'item' : 'items'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-stone-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-stone-400" />
                    )}
                  </div>
                </button>

                {/* Items checklist */}
                {isExpanded && store.items.length > 0 && (
                  <div className="px-4 py-2 border-t border-stone-800">
                    <div className="space-y-1">
                      {store.items.map((item, itemIndex) => (
                        <div
                          key={`${item.name}-${itemIndex}`}
                          className="flex items-center gap-2.5 py-1.5"
                        >
                          <Package className="h-3.5 w-3.5 text-stone-300 shrink-0" />
                          <span className="text-sm text-stone-300 flex-1 truncate">
                            {item.name}
                          </span>
                          <span className="text-xs font-medium text-stone-500 shrink-0 tabular-nums">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty items state */}
                {isExpanded && store.items.length === 0 && (
                  <div className="px-4 py-3 border-t border-stone-800">
                    <p className="text-xs text-stone-400 text-center">No items for this store</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Route summary */}
        {totalStores > 1 && (
          <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
            <p className="text-xs text-stone-400">
              {totalStores} stops &middot; {totalItems} total items
            </p>
            <p className="text-xs text-stone-400">Suggested order: 1 &rarr; {totalStores}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
