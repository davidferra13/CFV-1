// Rate Card — Quick-access pricing reference
// Pull this up on your phone mid-conversation to quote instantly.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { RateCardView } from '@/components/pricing/rate-card-view'

export const metadata: Metadata = { title: 'Rate Card - ChefFlow' }

export default async function RateCardPage() {
  await requireChef()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Rate Card</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Your pricing at a glance. Tap any section to expand, hit Copy to paste into a text.
        </p>
      </div>
      <RateCardView />
    </div>
  )
}
