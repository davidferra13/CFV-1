'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Check } from '@/components/ui/icons'
import { receivePurchaseOrder } from '@/lib/commerce/purchase-order-actions'
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/commerce/purchase-order-actions'
import { toast } from 'sonner'

type Props = {
  po: PurchaseOrder
  items: PurchaseOrderItem[]
}

export function POReceiving({ po, items }: Props) {
  const [isPending, startTransition] = useTransition()
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const item of items) {
      map[item.id] = item.received_quantity
    }
    return map
  })

  const canReceive = ['sent', 'acknowledged', 'partially_received'].includes(po.status)

  function handleReceive() {
    const receivedItems = items.map((item) => ({
      itemId: item.id,
      receivedQuantity: receivedQtys[item.id] ?? 0,
    }))

    startTransition(async () => {
      try {
        const result = await receivePurchaseOrder(po.id, receivedItems)
        toast.success(result.status === 'received' ? 'All items received' : 'Receiving updated')
      } catch (err) {
        toast.error('Failed to update receiving')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Receiving</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium text-center">Ordered</th>
                <th className="pb-2 font-medium text-center">Received</th>
                <th className="pb-2 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const received = receivedQtys[item.id] ?? 0
                const ordered = item.quantity
                const isShort = received > 0 && received < ordered
                const isOver = received > ordered
                const isMatch = received === ordered

                return (
                  <tr key={item.id} className="border-b">
                    <td className="py-3">
                      <div className="font-medium">{item.item_name}</div>
                      <div className="text-xs text-muted-foreground">{item.unit}</div>
                    </td>
                    <td className="py-3 text-center">{ordered}</td>
                    <td className="py-3 text-center">
                      {canReceive ? (
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="w-20 mx-auto text-center"
                          value={received}
                          onChange={(e) =>
                            setReceivedQtys((prev) => ({
                              ...prev,
                              [item.id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      ) : (
                        <span>{received}</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {received === 0 && (
                        <span className="text-muted-foreground text-xs">Pending</span>
                      )}
                      {isMatch && (
                        <Badge variant="success">
                          <Check className="h-3 w-3 mr-1" />
                          Match
                        </Badge>
                      )}
                      {isShort && (
                        <Badge variant="warning">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Short ({ordered - received})
                        </Badge>
                      )}
                      {isOver && <Badge variant="info">Over (+{received - ordered})</Badge>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {canReceive && (
          <div className="mt-4 flex justify-end">
            <Button onClick={handleReceive} disabled={isPending}>
              <Check className="h-4 w-4 mr-1" />
              Mark Received
            </Button>
          </div>
        )}

        {po.status === 'received' && (
          <div className="mt-4 p-3 rounded-md bg-green-50 text-green-800 text-sm">
            All items received on{' '}
            {po.received_at
              ? new Date(po.received_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : 'unknown date'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
