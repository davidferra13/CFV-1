import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { ensureHACCPPlan, getHACCPPlan } from '@/lib/haccp/actions'
import { getChefArchetype } from '@/lib/archetypes/actions'
import { HACCPPlanView } from '@/components/haccp/haccp-plan-view'
import { HACCPWizard } from '@/components/haccp/haccp-wizard'
import { HACCPPageTabs } from './tabs-client'
import type { HACCPPlanData } from '@/lib/haccp/types'

export const metadata: Metadata = { title: 'HACCP Plan | ChefFlow' }

export default async function HACCPPage() {
  await requireChef()
  const archetype = await getChefArchetype()

  if (!archetype) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold text-stone-100">HACCP Plan</h1>
        <p className="text-stone-400">
          Select your business type in{' '}
          <Link href="/settings/navigation" className="text-brand-500 hover:underline">
            Settings &gt; Navigation
          </Link>{' '}
          to auto-generate your HACCP plan.
        </p>
      </div>
    )
  }

  // Lazy generate if plan doesn't exist yet (for chefs who signed up before this feature)
  await ensureHACCPPlan(archetype)
  const plan = await getHACCPPlan()

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold text-stone-100">HACCP Plan</h1>
        <p className="text-stone-400">
          Unable to generate your HACCP plan. Please try refreshing the page.
        </p>
      </div>
    )
  }

  const planData = plan.plan_data as HACCPPlanData

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <HACCPPageTabs
        referenceView={<HACCPPlanView planData={planData} lastReviewedAt={plan.last_reviewed_at} />}
        wizardView={<HACCPWizard planData={planData} />}
      />
    </div>
  )
}
