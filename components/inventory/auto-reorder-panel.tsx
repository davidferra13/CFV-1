'use client'

// AutoReorderPanel - Preview and generate draft purchase orders from par-level shortfalls.
// Shows a grouped preview of what POs would be created, with a confirm button.

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Package, Store, Check } from '@/components/ui/icons'
import {
  previewAutoReorder,
  generateAutoReorderPOs,
  type AutoReorderPreview,
} from '@/lib/inventory/auto-reorder-actions'
import { toast } from 'sonner'

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function AutoReorderPanel() {
  const [preview, setPreview] = useState<AutoReorderPreview[] | null>(null)
  const [generated, setGenerated] = useState(false)
  const [poCount, setPoCount] = useState(0)
  const [loadingPreview, startPreview] = useTransition()
  const [loadingGenerate, startGenerate] = useTransition()

  function handlePreview() {
    startPreview(async () => {
      try {
        const data = await previewAutoReorder()
        setPreview(data)
        if (data.length === 0) {
          toast.info('All inventory is at or above par levels. Nothing to reorder.')
        }
      } catch {
        toast.error('Failed to generate reorder preview')
        setPreview(null)
      }
    })
  }

  function handleGenerate() {
    startGenerate(async () => {
      try {
        const result = await generateAutoReorderPOs()
        setGenerated(true)
        setPoCount(result.totalPOs)
        toast.success(
          `Created ${result.totalPOs} draft PO${result.totalPOs !== 1 ? 's' : ''} with ${result.totalItems} item${result.totalItems !== 1 ? 's' : ''}`
        )
      } catch {
        toast.error('Failed to generate purchase orders')
      }
    })
  }

  const totalItems = preview?.reduce((sum, g) => sum + g.items.length, 0) ?? 0
  const totalCost = preview?.reduce((sum, g) => sum + g.totalCostCents, 0) ?? 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-stone-400" />
            Auto-Reorder
          </CardTitle>
          {!preview && (
            <Button
              variant="secondary"
              onClick={handlePreview}
              loading={loadingPreview}
              disabled={loadingPreview}
            >
              Check Shortfalls
            </Button>
          )}
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Generates draft purchase orders from par-level deficits and demand forecasts. All POs
          start as drafts for your review.
        </p>
      </CardHeader>

      {preview && preview.length > 0 && (
        <CardContent className="p-0">
          {preview.map((group, groupIdx) => (
            <div key={groupIdx}>
              {/* Vendor group header */}
              <div className="px-6 py-2 bg-stone-800 border-y border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-stone-400" />
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                    {group.vendorName || 'Unassigned Vendor'}
                  </span>
                </div>
                <span className="text-xs text-stone-500">
                  {group.items.length} item{group.items.length !== 1 ? 's' : ''} -{' '}
                  {formatMoney(group.totalCostCents)}
                </span>
              </div>

              {/* Items */}
              <div className="divide-y divide-stone-800">
                {group.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-100 truncate">
                        {item.ingredientName}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Order: {item.reorderQty} {item.unit}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium text-stone-300">
                        {formatMoney(item.estimatedCostCents)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      )}

      {preview && preview.length > 0 && (
        <CardFooter className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="default">
              <Package className="h-3 w-3 mr-1" />
              {preview.length} PO{preview.length !== 1 ? 's' : ''}
            </Badge>
            <span className="text-sm text-stone-400">
              {totalItems} item{totalItems !== 1 ? 's' : ''}, est. {formatMoney(totalCost)}
            </span>
          </div>
          {generated ? (
            <Badge variant="success">
              <Check className="h-3 w-3 mr-1" />
              {poCount} Draft PO{poCount !== 1 ? 's' : ''} Created
            </Badge>
          ) : (
            <Button
              variant="primary"
              onClick={handleGenerate}
              loading={loadingGenerate}
              disabled={loadingGenerate}
            >
              Generate Draft POs
            </Button>
          )}
        </CardFooter>
      )}

      {preview && preview.length === 0 && (
        <CardContent className="py-8 text-center">
          <Check className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">
            All inventory is above par levels. Nothing to reorder.
          </p>
        </CardContent>
      )}
    </Card>
  )
}
