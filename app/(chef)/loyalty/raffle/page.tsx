import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { UpgradeGate } from '@/components/billing/upgrade-gate'
import { RaffleManagement } from './raffle-management'

export const metadata: Metadata = { title: 'Monthly Raffle - ChefFlow' }

export default async function RafflePage() {
  const user = await requireChef()

  return (
    <UpgradeGate chefId={user.entityId} featureSlug="raffle">
      <RaffleManagement />
    </UpgradeGate>
  )
}
