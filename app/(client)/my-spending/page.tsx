// Client Spending Dashboard — aggregate financial history

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getClientSpendingSummary } from '@/lib/clients/spending-actions'
import { SpendingDashboardClient } from '@/components/clients/spending-dashboard-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Spending - ChefFlow' }

export default async function MySpendingPage() {
  await requireClient()
  const summary = await getClientSpendingSummary()

  return (
    <div>
      <SpendingDashboardClient summary={summary} />
      <ActivityTracker
        eventType="spending_viewed"
        metadata={{ event_count: summary.events.length }}
      />
    </div>
  )
}
