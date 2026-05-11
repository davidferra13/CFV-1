import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyHousehold } from '@/lib/household/client-household-actions'
import { HouseholdClient } from './household-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Household' }

export default async function MyHouseholdPage() {
  await requireClient()
  const members = await getMyHousehold()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Household</h1>
        <p className="text-stone-400 mt-1">
          Manage your household members and their dietary needs so your chef can plan accordingly.
        </p>
      </div>
      <HouseholdClient initialMembers={members} />
      <ActivityTracker eventType="page_viewed" metadata={{ member_count: members.length }} />
    </div>
  )
}
