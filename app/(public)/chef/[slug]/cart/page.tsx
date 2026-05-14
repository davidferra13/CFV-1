import { DirectOrderCartShell } from '@/components/commerce/direct-orders/direct-order-cart-shell'
import type { DirectOrderCart } from '@/lib/commerce/direct-orders/cart-contracts'

export default function PublicChefCartPage({ params }: { params: { slug: string } }) {
  const cart: DirectOrderCart = {
    id: `demo-cart-${params.slug}`,
    chefTenantId: params.slug,
    context: {
      scope: 'personal',
      label: `Personal cart for ${params.slug}`,
      role: 'owner',
    },
    status: 'draft',
    version: 1,
    updatedAt: new Date().toISOString(),
    buyer: { email: 'demo-buyer@example.com' },
    pickup: { windowLabel: 'Next available pickup window' },
    items: [
      {
        id: 'item-1',
        productProjectionId: 'chef-drop-1',
        name: 'Chef meal drop',
        unitPriceCents: 4200,
        quantity: 2,
        status: 'available',
      },
      {
        id: 'item-2',
        productProjectionId: 'dessert-1',
        name: 'Seasonal dessert add-on',
        unitPriceCents: 1200,
        quantity: 1,
        status: 'price_changed',
        savedForLater: true,
      },
    ],
  }

  return <DirectOrderCartShell cart={cart} />
}
