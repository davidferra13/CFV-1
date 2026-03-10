// Purchase Order Detail — View/edit a single PO, receive items
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { getPurchaseOrder } from '@/lib/commerce/purchase-order-actions'
import { PurchaseOrderForm } from '@/components/commerce/purchase-order-form'
import { POReceiving } from '@/components/commerce/po-receiving'
import { PODetailActions } from './po-detail-actions'

export const metadata: Metadata = { title: 'Purchase Order - ChefFlow' }

type Props = {
  params: Promise<{ id: string }>
}

export default async function PurchaseOrderDetailPage(props: Props) {
  await requireChef()
  await requirePro('commerce')

  const { id } = await props.params
  let po, items

  try {
    const result = await getPurchaseOrder(id)
    po = result.po
    items = result.items
  } catch {
    notFound()
  }

  const showReceiving = ['sent', 'acknowledged', 'partially_received', 'received'].includes(
    po.status
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/commerce/purchase-orders"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase Orders
        </Link>
        <PODetailActions poId={po.id} status={po.status} />
      </div>

      {/* PO Form */}
      <PurchaseOrderForm po={po} items={items} />

      {/* Receiving section */}
      {showReceiving && <POReceiving po={po} items={items} />}
    </div>
  )
}
