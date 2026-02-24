// Station Orders — Unified order sheet across all stations
// Aggregates all "need to order" requests grouped by component.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listPendingOrders, getOrderHistory } from '@/lib/stations/order-actions'
import { OrderHandoff } from '@/components/stations/order-handoff'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Order Sheet — ChefFlow' }

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { tab?: string; start?: string; end?: string }
}) {
  await requireChef()

  const tab = searchParams.tab ?? 'pending'
  const pendingOrders = await listPendingOrders()

  // For history tab
  const today = new Date().toISOString().split('T')[0]
  const startDate =
    searchParams.start ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const endDate = searchParams.end ?? today
  const history = tab === 'history' ? await getOrderHistory(startDate, endDate) : []

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/stations" className="text-stone-500 hover:text-stone-300">
              Stations
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-stone-300">Order Sheet</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 mt-1">Order Sheet</h1>
          <p className="mt-1 text-sm text-stone-500">
            Aggregated order requests from all stations. Print this for vendor calls.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-stone-700">
        <Link
          href="/stations/orders?tab=pending"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'pending'
              ? 'border-brand-500 text-stone-100'
              : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          Pending ({pendingOrders.length})
        </Link>
        <Link
          href="/stations/orders?tab=history"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'history'
              ? 'border-brand-500 text-stone-100'
              : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          History
        </Link>
      </div>

      {tab === 'pending' && (
        <>
          {pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-stone-500 text-sm">
                  No pending orders. When stations need items, they will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <OrderHandoff orders={pendingOrders} />
          )}
        </>
      )}

      {tab === 'history' && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="mb-4 flex gap-3 items-center text-sm">
              <label className="text-stone-400">From:</label>
              <span className="text-stone-300">{startDate}</span>
              <label className="text-stone-400">To:</label>
              <span className="text-stone-300">{endDate}</span>
            </div>
            {history.length === 0 ? (
              <p className="text-stone-500 text-sm">No orders in this date range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700 text-left text-stone-400">
                      <th className="pb-2 pr-4">Component</th>
                      <th className="pb-2 pr-4">Station</th>
                      <th className="pb-2 pr-4">Qty</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((order: any) => (
                      <tr key={order.id} className="border-b border-stone-800">
                        <td className="py-2 pr-4 text-stone-200">
                          {order.station_components?.name ?? 'Unknown'}
                        </td>
                        <td className="py-2 pr-4 text-stone-400">
                          {order.stations?.name ?? 'Unknown'}
                        </td>
                        <td className="py-2 pr-4 text-stone-300">
                          {order.quantity} {order.unit}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'received'
                                ? 'bg-emerald-950 text-emerald-400'
                                : order.status === 'ordered'
                                  ? 'bg-sky-950 text-sky-400'
                                  : 'bg-amber-950 text-amber-400'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-stone-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
