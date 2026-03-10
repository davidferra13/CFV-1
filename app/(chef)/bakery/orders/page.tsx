import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getAllBakeryOrders } from '@/lib/bakery/order-actions'
import { ProductionBoard } from '@/components/bakery/production-board'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Bakery Orders - ChefFlow',
  description: 'Manage bakery orders and production schedule.',
}

export default async function BakeryOrdersPage() {
  const user = await requireChef()
  let orders
  let fetchError = false

  try {
    orders = await getAllBakeryOrders()
  } catch {
    fetchError = true
    orders = []
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-stone-100">Bakery Orders</h1>
        <Link
          href="/bakery/orders/new"
          className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-500 transition"
        >
          + New Order
        </Link>
      </div>

      {fetchError ? (
        <div className="rounded-lg bg-red-900/30 border border-red-700 p-4 text-red-300">
          Could not load bakery orders. Please try refreshing the page.
        </div>
      ) : (
        <ProductionBoard orders={orders} />
      )}
    </div>
  )
}
