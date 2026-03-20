import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPricingConfig } from '@/lib/pricing/config-actions'
import { PricingConfigForm } from '@/components/settings/pricing-config-form'

export const metadata: Metadata = { title: 'Pricing Configuration - ChefFlow' }

export default async function PricingSettingsPage() {
  await requireChef()
  const config = await getPricingConfig()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Pricing Configuration</h1>
          <p className="mt-1 text-stone-400">
            Customize your rates, premiums, and booking policies. Changes apply to all future quotes
            and pricing calculations.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors"
        >
          Back to Settings
        </Link>
      </div>

      <PricingConfigForm initialConfig={config} />
    </div>
  )
}
