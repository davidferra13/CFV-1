// Business Health Checklist Page
// Tracks completion of foundational business protection items.

import type { Metadata } from 'next'
import { getHealthChecklist } from '@/lib/protection/business-health-actions'
import { BusinessHealthChecklist } from '@/components/protection/business-health-checklist'

export const metadata: Metadata = { title: 'Business Health - ChefFlow' }

export default async function BusinessHealthPage() {
  const items = await getHealthChecklist()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Business Health Checklist</h1>
        <p className="mt-1 text-sm text-stone-500">
          A practical checklist of legal, financial, and operational foundations every private chef
          business should have in place.
        </p>
      </div>

      <BusinessHealthChecklist items={items} />
    </div>
  )
}
