// Public online ordering page for a restaurant.
// No auth required. Resolves restaurant by slug.

import type { Metadata } from 'next'
import { getPublicMenu, getRestaurantInfo } from '@/lib/commerce/online-order-actions'
import { OnlineOrderingStorefront } from '@/components/commerce/online-ordering-storefront'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ chefSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chefSlug } = await params
  const info = await getRestaurantInfo(chefSlug)
  const name = info?.businessName || 'Restaurant'

  return {
    title: `Order from ${name} - ChefFlow`,
    description: `Browse the menu and place an order from ${name}.`,
  }
}

export default async function OnlineOrderPage({ params }: Props) {
  const { chefSlug } = await params

  const [info, menu] = await Promise.all([
    getRestaurantInfo(chefSlug),
    getPublicMenu(chefSlug).catch(() => null),
  ])

  if (!info) {
    notFound()
  }

  return <OnlineOrderingStorefront chefSlug={chefSlug} restaurant={info} menu={menu ?? []} />
}
