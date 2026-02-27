'use client'

import { useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Clock } from 'lucide-react'
import { updateOrderStatus } from '@/lib/commerce/order-queue-actions'
import { useRouter } from 'next/navigation'
import { ORDER_QUEUE_STATUS_LABELS, ORDER_QUEUE_STATUS_COLORS } from '@/lib/commerce/constants'
import type { OrderQueueStatus } from '@/lib/commerce/constants'

type Props = {
  orders: any[]
}

const COLUMNS: { status: OrderQueueStatus; label: string; color: string }[] = [
  { status: 'received', label: 'Received', color: 'border-blue-600' },
  { status: 'preparing', label: 'Preparing', color: 'border-amber-600' },
  { status: 'ready', label: 'Ready', color: 'border-emerald-600' },
]

const NEXT_STATUS: Record<string, OrderQueueStatus> = {
  received: 'preparing',
  preparing: 'ready',
  ready: 'picked_up',
}

export function OrderQueueBoard({ orders }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAdvance(orderId: string, currentStatus: string) {
    const next = NEXT_STATUS[currentStatus]
    if (!next) return

    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, next)
        router.refresh()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to update order')
      }
    })
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-stone-500">No active orders. Orders will appear here when received.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const columnOrders = orders.filter((o: any) => o.status === col.status)

        return (
          <div key={col.status} className="space-y-3">
            <div className={`border-t-4 ${col.color} pt-2`}>
              <div className="flex items-center justify-between">
                <h3 className="text-stone-200 font-medium">{col.label}</h3>
                <Badge variant={ORDER_QUEUE_STATUS_COLORS[col.status] as any}>
                  {columnOrders.length}
                </Badge>
              </div>
            </div>

            {columnOrders.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-stone-600 text-sm">No orders</p>
                </CardContent>
              </Card>
            ) : (
              columnOrders.map((order: any) => {
                const waitMinutes = Math.round(
                  (Date.now() - new Date(order.received_at).getTime()) / 60000
                )

                return (
                  <Card key={order.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-100 font-bold text-lg">
                          {order.order_number}
                        </span>
                        <div className="flex items-center gap-1 text-stone-500 text-sm">
                          <Clock className="w-3 h-3" />
                          {waitMinutes}m
                        </div>
                      </div>

                      {order.customer_name && (
                        <p className="text-stone-400 text-sm">{order.customer_name}</p>
                      )}

                      {order.sales && (
                        <p className="text-stone-300 text-sm">
                          ${((order.sales.total_cents ?? 0) / 100).toFixed(2)}
                        </p>
                      )}

                      {order.notes && (
                        <p className="text-stone-500 text-xs italic">{order.notes}</p>
                      )}

                      {NEXT_STATUS[col.status] && (
                        <Button
                          variant="primary"
                          className="w-full mt-2"
                          onClick={() => handleAdvance(order.id, col.status)}
                          disabled={isPending}
                        >
                          {NEXT_STATUS[col.status] === 'preparing'
                            ? 'Start Preparing'
                            : NEXT_STATUS[col.status] === 'ready'
                              ? 'Mark Ready'
                              : 'Mark Picked Up'}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )
      })}
    </div>
  )
}
