// Purchase Order Detail Page
// View, edit items, and receive deliveries.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPurchaseOrder } from '@/lib/inventory/purchase-order-actions'
import { PODetailClient } from './po-detail-client'

export const metadata: Metadata = { title: 'Purchase Order Detail' }

export default async function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireChef()
  const { id } = await params

  const po = await getPurchaseOrder(id).catch(() => null)

  if (!po) {
    return (
      <div className="space-y-6">
        <Link
          href="/inventory/purchase-orders"
          className="text-sm text-stone-500 hover:text-stone-300"
        >
          &larr; Purchase Orders
        </Link>
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500">Purchase order not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/inventory/purchase-orders"
          className="text-sm text-stone-500 hover:text-stone-300"
        >
          &larr; Purchase Orders
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">
          PO {(po as any).poNumber || (po as any).id?.slice(0, 8)}
        </h1>
      </div>

      <PODetailClient po={po as any} />
    </div>
  )
}
