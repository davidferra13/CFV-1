// Order Queue Page — board view of order-ahead items
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getActiveOrders } from '@/lib/commerce/order-queue-actions'
import { OrderQueueBoard } from '@/components/commerce/order-queue-board'

export const metadata: Metadata = { title: 'Order Queue — ChefFlow' }

export default async function OrdersPage() {
  await requireChef()
  await requirePro('commerce')

  const activeOrders = await getActiveOrders()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Order Queue</h1>
        <p className="text-stone-400 mt-1">Track orders from received to pickup</p>
      </div>

      <OrderQueueBoard orders={activeOrders} />
    </div>
  )
}
