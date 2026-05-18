'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import type { PaymentMethod } from '@/lib/ledger/append'
import { counterCheckout } from './counter-checkout'

/**
 * One-tap sale for a single product. Even faster than counterCheckout
 * for high-volume simple items.
 */
export async function quickSale(input: {
  productProjectionId: string
  paymentMethod: PaymentMethod
  registerSessionId?: string
}) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  const { data: product, error: prodErr } = await (db
    .from('product_projections')
    .select('id, name, price_cents, tax_class, cost_cents, modifiers')
    .eq('id', input.productProjectionId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .single() as any)

  if (prodErr || !product) throw new Error('Product not found or inactive')

  return counterCheckout({
    registerSessionId: input.registerSessionId,
    items: [
      {
        productProjectionId: product.id,
        name: (product as any).name,
        unitPriceCents: (product as any).price_cents,
        quantity: 1,
        taxClass: (product as any).tax_class,
        unitCostCents: (product as any).cost_cents,
      },
    ],
    paymentMethod: input.paymentMethod,
    amountTenderedCents: (product as any).price_cents,
  })
}
