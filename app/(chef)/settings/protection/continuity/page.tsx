// Business Continuity Plan Page
// Chef documents their plan for handling extended incapacitation or emergency scenarios.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { ContinuityPlanForm } from '@/components/protection/continuity-plan-form'

export const metadata: Metadata = { title: 'Business Continuity | ChefFlow' }

export default async function BusinessContinuityPage() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: chefRow } = await db
    .from('chefs')
    .select('business_continuity_plan')
    .eq('id', chef.tenantId!)
    .single()

  const plan = (chefRow as any)?.business_continuity_plan ?? null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Business Continuity Plan</h1>
        <p className="mt-1 text-sm text-stone-500">
          Document what happens to your business and your clients if you are suddenly unable to work
          - illness, injury, family emergency, or extended leave.
        </p>
      </div>

      <div className="rounded-lg border border-brand-200 bg-brand-950 px-4 py-3">
        <p className="text-sm text-brand-900">
          A continuity plan gives your backup contacts and trusted peers the information they need
          to protect your clients and your reputation. Review and update it at least twice a year.
        </p>
      </div>

      <ContinuityPlanForm plan={plan} />
    </div>
  )
}
