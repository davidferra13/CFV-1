import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPricingConfig } from '@/lib/pricing/config-actions'
import { PricingConfigForm } from '@/components/settings/pricing-config-form'
import { getChefArchetype } from '@/lib/archetypes/actions'
import { GuidedPricingSetup } from '@/components/settings/guided-pricing-setup'

export const metadata: Metadata = { title: 'Pricing Configuration' }

function hasAnyRatesConfigured(config: Record<string, unknown>): boolean {
  const rateKeys = [
    'couples_rate_3_course',
    'couples_rate_4_course',
    'couples_rate_5_course',
    'group_rate_3_course',
    'group_rate_4_course',
    'group_rate_5_course',
    'weekly_standard_min',
    'weekly_standard_max',
    'cook_and_leave_rate',
  ]
  return rateKeys.some((key) => {
    const val = config[key]
    return typeof val === 'number' && val > 0
  })
}

export default async function PricingSettingsPage() {
  await requireChef()
  const [config, archetype] = await Promise.all([
    getPricingConfig(),
    getChefArchetype().catch(() => null),
  ])

  const hasRates = hasAnyRatesConfigured(config as unknown as Record<string, unknown>)

  // Show guided setup wizard for chefs who haven't configured pricing yet
  if (!hasRates) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Set Up Your Pricing</h1>
            <p className="mt-1 text-stone-400">
              We'll walk you through each pricing area with industry benchmarks to help you get
              started.
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors"
          >
            Back to Settings
          </Link>
        </div>

        <GuidedPricingSetup archetype={archetype} />
      </div>
    )
  }

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
