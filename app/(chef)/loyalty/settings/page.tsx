// Loyalty Program Settings Page
// Chef configures: earn rates, welcome bonus, large party bonus,
// milestone bonuses, tier thresholds, and program on/off toggle.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLoyaltyConfig } from '@/lib/loyalty/actions'
import { LoyaltySettingsForm } from './loyalty-settings-form'

export const metadata: Metadata = { title: 'Loyalty Settings - ChefFlow' }

export default async function LoyaltySettingsPage() {
  await requireChef()
  const config = await getLoyaltyConfig()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/loyalty" className="text-sm text-stone-500 hover:text-stone-300">
            ← Loyalty Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-stone-100">Program Settings</h1>
        <p className="text-stone-400 mt-1">
          Configure how clients earn points, which milestones they hit, and what tiers mean. Changes
          take effect immediately for all future events.
        </p>
      </div>

      <LoyaltySettingsForm config={config} />
    </div>
  )
}
