// Commerce Gift Cards - Issue, manage, and redeem gift cards with balance tracking
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getGiftCards, getGiftCardStats } from '@/lib/commerce/gift-card-actions'
import { GiftCardManager } from '@/components/commerce/gift-card-manager'
import { GiftCardRedeem } from '@/components/commerce/gift-card-redeem'

export const metadata: Metadata = {
  title: 'Gift Cards | ChefFlow',
}

export default async function CommerceGiftCardsPage() {
  await requireChef()

  const [cards, stats] = await Promise.all([getGiftCards(), getGiftCardStats()])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100">Gift Cards & Store Credit</h1>
        <p className="text-stone-500 mt-1">
          Issue and manage gift cards. Track balances, redemptions, and outstanding liability.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <GiftCardManager initialCards={cards} initialStats={stats} />
        </div>
        <div>
          <GiftCardRedeem />
        </div>
      </div>
    </div>
  )
}
