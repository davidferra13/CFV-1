import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getYelpConnection, getYelpReviewCount } from '@/lib/integrations/yelp/yelp-actions'
import { YelpSettings } from '@/components/settings/yelp-settings'
import { requireChef } from '@/lib/auth/get-user'
import { UpgradeGate } from '@/components/billing/upgrade-gate'

export const metadata: Metadata = { title: 'Yelp Reviews - ChefFlow' }

async function YelpSettingsContent() {
  const [connection, reviewCount] = await Promise.all([getYelpConnection(), getYelpReviewCount()])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Yelp Reviews</h1>
        <p className="text-stone-400 mt-1">
          Connect your Yelp business listing to automatically sync reviews into your unified review
          dashboard.
        </p>
      </div>

      <YelpSettings
        initialBusinessId={connection.businessId}
        initialBusinessName={connection.businessName}
        initialReviewCount={reviewCount}
      />
    </div>
  )
}

export default async function YelpSettingsPage() {
  const user = await requireChef()

  return (
    <UpgradeGate chefId={user.entityId} featureSlug="integrations">
      <YelpSettingsContent />
    </UpgradeGate>
  )
}
