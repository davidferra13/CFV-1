import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { UpgradeGate } from '@/components/billing/upgrade-gate'
import { ReportsContent } from './reports-content'

export const metadata: Metadata = { title: 'Custom Reports' }

export default async function CustomReportsPage() {
  const user = await requireChef()

  return (
    <UpgradeGate chefId={user.entityId} featureSlug="custom-reports">
      <ReportsContent />
    </UpgradeGate>
  )
}
