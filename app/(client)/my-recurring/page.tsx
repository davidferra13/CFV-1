import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyRecurringServices } from '@/lib/recurring/client-recurring-actions'
import { RecurringClient } from './recurring-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Recurring Services' }

export default async function MyRecurringPage() {
  await requireClient()
  const services = await getMyRecurringServices()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Recurring Services</h1>
        <p className="text-stone-400 mt-1">Your ongoing meal programs and service arrangements.</p>
      </div>
      <RecurringClient services={services} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}
