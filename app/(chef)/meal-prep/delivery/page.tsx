import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getDeliveryRoute } from '@/lib/meal-prep/delivery-actions'
import { generateDeliveryManifest } from '@/lib/meal-prep/manifest-actions'
import { DeliveryRouteClient } from './delivery-client'

export const metadata: Metadata = { title: 'Delivery Route - ChefFlow' }

interface Props {
  searchParams: Promise<{ date?: string }>
}

export default async function DeliveryPage({ searchParams }: Props) {
  await requireChef()
  await requirePro('operations')

  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const deliveryDate = params.date || today

  const deliveries = await getDeliveryRoute(deliveryDate)
  const manifestResult = deliveries.length > 0 ? await generateDeliveryManifest(deliveryDate) : null

  return (
    <DeliveryRouteClient
      deliveries={deliveries}
      deliveryDate={deliveryDate}
      manifest={manifestResult?.manifest ?? null}
    />
  )
}
