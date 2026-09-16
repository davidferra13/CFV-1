import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getActiveOrders } from '@/lib/commerce/order-queue-actions'
import { getOrderOpsSnapshot } from '@/lib/order-operations/actions'
import { OrderOperationsDashboard } from '@/components/commerce/order-operations-dashboard'

export const metadata: Metadata = { title: 'Order Operations' }

export default async function OrdersPage() {
  await requireChef()
  await requirePro('commerce')

  const [snapshot, activeOrders] = await Promise.all([
    getOrderOpsSnapshot(),
    getActiveOrders(),
  ])

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-500">Orders / Reservations</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-100">Order Operations</h1>
        <p className="mt-1 max-w-3xl text-sm text-stone-400">
          Orders, reservations, waitlist demand, and connected channel activity in one operating view.
        </p>
      </div>

      <OrderOperationsDashboard snapshot={snapshot} activeOrders={activeOrders} />
    </div>
  )
}
