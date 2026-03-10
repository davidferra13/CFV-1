import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { CookingDayView } from './cooking-day-client'

export const metadata: Metadata = { title: 'Cooking Day - ChefFlow' }

export default async function CookingDayPage() {
  await requireChef()
  await requirePro('operations')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Cooking Day</h1>
        <p className="text-sm text-stone-500 mt-1">
          Assembly-line task breakdown for batch cooking day.
        </p>
      </div>
      <CookingDayView />
    </div>
  )
}
