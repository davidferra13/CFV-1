import { Suspense } from 'react'
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { UpgradeGate } from '@/components/billing/upgrade-gate'
import { IntelligenceHubContent } from '@/components/intelligence/intelligence-hub'

export const metadata: Metadata = {
  title: 'Intelligence Hub - ChefFlow',
  description: 'Your business brain - 10 deterministic intelligence engines, zero AI dependency',
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  )
}

export default async function IntelligenceHubPage() {
  const user = await requireChef()

  return (
    <UpgradeGate chefId={user.entityId} featureSlug="intelligence-hub" mode="block">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Intelligence Hub</h1>
          <p className="text-muted-foreground mt-1">
            Your business brain - 10 intelligence engines working for you. All deterministic, all
            instant, all from your real data.
          </p>
        </div>
        <Suspense fallback={<LoadingSkeleton />}>
          <IntelligenceHubContent />
        </Suspense>
      </div>
    </UpgradeGate>
  )
}
