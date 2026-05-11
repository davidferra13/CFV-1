import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyGiftCards } from '@/lib/gift-cards/client-gift-card-actions'
import { GiftCardsClient } from './gift-cards-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Gift Cards' }

export default async function MyGiftCardsPage() {
  await requireClient()
  const cards = await getMyGiftCards()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Gift Cards</h1>
        <p className="text-stone-400 mt-1">Gift cards and store credit you have received.</p>
      </div>
      <GiftCardsClient cards={cards} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}
