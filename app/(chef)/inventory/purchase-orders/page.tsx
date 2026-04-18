// Purchase Orders Page
// List all purchase orders with status filters.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPurchaseOrders } from '@/lib/inventory/purchase-order-actions'
import { POListClient } from './po-list-client'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Purchase Orders' }

export default async function PurchaseOrdersPage() {
  await requireChef()

  const orders = await getPurchaseOrders({}).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Purchase Orders</h1>
            <p className="text-stone-500 mt-1">
              Create, submit, and receive purchase orders. Track every ingredient from order to
              shelf.
            </p>
          </div>
          <div className="flex gap-2">
            <Button href="/inventory/procurement" variant="secondary" size="sm">
              Procurement Hub
            </Button>
            <Button href="/inventory/purchase-orders/new" size="sm">
              + New PO
            </Button>
          </div>
        </div>
      </div>

      <POListClient initialOrders={orders as any[]} />
    </div>
  )
}
