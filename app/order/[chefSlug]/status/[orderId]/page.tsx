// Public order status page. Auto-refreshes every 15 seconds.
// No auth required.

import type { Metadata } from 'next'
import { getOrderStatus, getRestaurantInfo } from '@/lib/commerce/online-order-actions'
import { OrderStatusTracker } from '@/components/commerce/order-status-tracker'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ chefSlug: string; orderId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chefSlug } = await params
  const info = await getRestaurantInfo(chefSlug)
  return {
    title: `Order Status - ${info?.businessName || 'Restaurant'}`,
  }
}

export default async function OrderStatusPage({ params }: Props) {
  const { chefSlug, orderId } = await params

  const [status, info] = await Promise.all([getOrderStatus(orderId), getRestaurantInfo(chefSlug)])

  if (!status || !info) {
    notFound()
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{info.businessName}</h1>
        <p className="text-stone-500 text-sm mt-1">Order #{status.orderNumber}</p>
      </div>
      <OrderStatusTracker orderId={orderId} chefSlug={chefSlug} initialStatus={status} />
    </div>
  )
}
