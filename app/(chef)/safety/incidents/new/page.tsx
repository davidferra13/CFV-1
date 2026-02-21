// Report an Incident Page
// Simple form page for logging a new safety incident.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { IncidentForm } from '@/components/safety/incident-form'

export const metadata: Metadata = { title: 'Report an Incident — ChefFlow' }

export default async function NewIncidentPage() {
  await requireChef()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Report an Incident</h1>
        <p className="mt-1 text-sm text-stone-500">
          Document what happened, when, who was involved, and what immediate actions were taken.
          Accurate and timely documentation is critical for insurance claims and legal protection.
        </p>
      </div>

      <IncidentForm />
    </div>
  )
}
