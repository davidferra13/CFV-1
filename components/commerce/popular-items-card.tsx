'use client'

import type { PopularItem } from '@/lib/commerce/popular-items-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PopularItemsCardProps {
  items: PopularItem[]
  period: string
  totalSalesInPeriod: number
}

export function PopularItemsCard({ items, period, totalSalesInPeriod }: PopularItemsCardProps) {
  const maxQty = items.length > 0 ? items[0].totalQuantitySold : 1

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Popular Items</CardTitle>
          <Badge variant="default">{period}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-stone-500 text-sm py-4 text-center">No sales data yet</p>
        ) : (
          <div className="space-y-4">
            <ol className="space-y-3">
              {items.map((item, idx) => {
                const pct = Math.round((item.totalQuantitySold / maxQty) * 100)
                return (
                  <li key={item.productId ?? idx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500 text-sm font-mono w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="text-stone-200 font-medium truncate">
                        {item.productName}
                      </span>
                      {item.category && (
                        <Badge variant="default" className="text-xs shrink-0">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                    <div className="ml-7 flex items-center justify-between text-sm">
                      <span className="text-stone-400">
                        {item.totalQuantitySold} sold across {item.orderCount} order
                        {item.orderCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-emerald-400 font-medium">
                        ${(item.totalRevenueCents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="ml-7 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ol>
            <p className="text-stone-500 text-xs text-center pt-2">
              Based on {totalSalesInPeriod} sale{totalSalesInPeriod !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
