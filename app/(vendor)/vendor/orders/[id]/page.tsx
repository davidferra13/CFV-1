import { requireVendor } from '@/lib/auth/get-user'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { purchaseOrders, purchaseOrderItems } from '@/lib/db/schema/schema'
import { eq, and } from 'drizzle-orm'
import { cn } from '@/lib/utils'
import { VendorOrderActions } from './vendor-order-actions'

export const metadata = { title: 'Order Detail' }

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

export default async function VendorOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let user
  try {
    user = await requireVendor()
  } catch {
    redirect('/auth/signin?portal=vendor')
  }

  const [order] = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.vendorId, user.vendorId)))
    .limit(1)

  if (!order) notFound()

  const items = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.poId, order.id))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">{order.poNumber}</h1>
          <p className="text-sm text-stone-400 mt-1">
            Ordered: {order.orderDate}
            {order.expectedDeliveryDate ? ` | Expected: ${order.expectedDeliveryDate}` : ''}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
            STATUS_COLORS[order.status] ?? STATUS_COLORS.draft
          )}
        >
          {statusLabel(order.status)}
        </span>
      </div>

      <VendorOrderActions orderId={order.id} currentStatus={order.status} />

      <div className="rounded-lg border border-stone-700 bg-stone-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 text-left">
              <th className="px-4 py-3 text-stone-400 font-medium">Item</th>
              <th className="px-4 py-3 text-stone-400 font-medium text-right">Qty</th>
              <th className="px-4 py-3 text-stone-400 font-medium text-right">Unit Price</th>
              <th className="px-4 py-3 text-stone-400 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-stone-800 last:border-0">
                <td className="px-4 py-3 text-stone-200">{item.itemName}</td>
                <td className="px-4 py-3 text-stone-300 text-right">
                  {item.quantity} {item.unit}
                </td>
                <td className="px-4 py-3 text-stone-300 text-right">
                  {item.unitCostCents != null ? `$${(item.unitCostCents / 100).toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-3 text-stone-200 text-right font-medium">
                  {item.totalCostCents != null ? `$${(item.totalCostCents / 100).toFixed(2)}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-stone-700">
              <td colSpan={3} className="px-4 py-3 text-stone-400 font-medium text-right">
                Total
              </td>
              <td className="px-4 py-3 text-stone-100 font-bold text-right">
                ${(order.totalCents / 100).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.notes && (
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
          <p className="text-xs font-medium text-stone-400 mb-1">Notes</p>
          <p className="text-sm text-stone-300">{order.notes}</p>
        </div>
      )}
    </div>
  )
}
