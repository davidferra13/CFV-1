import { requireVendor } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { purchaseOrders } from '@/lib/db/schema/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Purchase Orders' }

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-blue-900/50 text-blue-300 border-blue-700',
  acknowledged: 'bg-amber-900/50 text-amber-300 border-amber-700',
  partially_received: 'bg-amber-900/50 text-amber-300 border-amber-700',
  received: 'bg-green-900/50 text-green-300 border-green-700',
  cancelled: 'bg-red-900/50 text-red-300 border-red-700',
  draft: 'bg-stone-800 text-stone-400 border-stone-600',
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function VendorOrdersPage() {
  let user
  try {
    user = await requireVendor()
  } catch {
    redirect('/auth/signin?portal=vendor')
  }

  const orders = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      orderDate: purchaseOrders.orderDate,
      expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
      totalCents: purchaseOrders.totalCents,
      status: purchaseOrders.status,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.vendorId, user.vendorId))
    .orderBy(desc(purchaseOrders.orderDate))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Purchase Orders</h1>
        <p className="text-sm text-stone-400 mt-1">Orders from chefs using your services</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-8 text-center">
          <p className="text-stone-400">No purchase orders yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/vendor/orders/${order.id}`}
              className="block rounded-lg border border-stone-700 bg-stone-900 p-4 hover:border-stone-500 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-100">{order.poNumber}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Ordered: {order.orderDate}
                    {order.expectedDeliveryDate ? ` | Expected: ${order.expectedDeliveryDate}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-stone-200">
                    ${(order.totalCents / 100).toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      STATUS_COLORS[order.status] ?? STATUS_COLORS.draft
                    )}
                  >
                    {statusLabel(order.status)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
