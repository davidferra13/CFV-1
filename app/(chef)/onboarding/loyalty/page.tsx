import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getLoyaltyConfig, getRewards } from '@/lib/loyalty/actions'
import { getImportedClients } from '@/lib/clients/import-actions'
import { LoyaltySetup } from '@/components/onboarding/loyalty-setup'

export const metadata = { title: 'Loyalty Program Setup — ChefFlow Setup' }

export default async function OnboardingLoyaltyPage() {
  const [config, rewards, clients] = await Promise.all([
    getLoyaltyConfig().catch(() => null),
    getRewards().catch(() => []),
    getImportedClients().catch(() => []),
  ])

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Setup
          </Link>
          <h1 className="text-3xl font-bold text-stone-900">Loyalty Program</h1>
          <p className="text-stone-600 mt-2 max-w-xl">
            Configure your tier thresholds, build your reward catalog, then enter each client&apos;s
            historical point balance. Get this right — the ledger is append-only.
          </p>
        </div>

        <LoyaltySetup
          initialConfig={config}
          initialRewards={rewards}
          clients={clients}
        />

      </div>
    </div>
  )
}
