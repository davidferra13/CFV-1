import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { listPromotions } from '@/lib/commerce/promotion-actions'
import { PromotionManager } from '@/components/commerce/promotion-manager'

export const metadata: Metadata = { title: 'Promotions' }

export default async function PromotionsPage() {
  await requireChef()
  await requirePro('commerce')

  const promotions = await listPromotions()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Promotions</h1>
        <p className="text-sm text-stone-400 mt-1">
          Create register discount codes and item/order promotion rules.
        </p>
      </div>
      <PromotionManager promotions={promotions} />
    </div>
  )
}
