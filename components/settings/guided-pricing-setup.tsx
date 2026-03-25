// Guided Pricing Setup - standalone wrapper for /settings/pricing page.
// Uses the same PricingStep component as onboarding but persists directly
// to chef_pricing_config via server action.
'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'
import { PricingStep } from '@/components/onboarding/onboarding-steps/pricing-step'
import { updatePricingConfig } from '@/lib/pricing/config-actions'
import type { ArchetypeId } from '@/lib/archetypes/presets'

interface GuidedPricingSetupProps {
  archetype: ArchetypeId | null
}

export function GuidedPricingSetup({ archetype }: GuidedPricingSetupProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleComplete(data: Record<string, unknown>) {
    const pricingConfig = data.pricingConfig as Record<string, unknown> | undefined
    if (!pricingConfig || Object.keys(pricingConfig).length === 0) {
      router.refresh()
      return
    }

    startTransition(async () => {
      try {
        const result = await updatePricingConfig(pricingConfig as any)
        if (!result.success) {
          setError(result.error || 'Failed to save pricing')
          return
        }
        // Refresh the page - it will now show the full pricing form since rates exist
        router.refresh()
      } catch (err) {
        console.error('[guided-pricing] Failed to save', err)
        setError('Something went wrong. Please try again.')
      }
    })
  }

  function handleSkip() {
    router.push('/settings')
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-6">
      {error && (
        <div className="mb-4 rounded-lg bg-red-950/50 border border-red-800 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <PricingStep onComplete={handleComplete} onSkip={handleSkip} archetype={archetype} />
    </div>
  )
}
