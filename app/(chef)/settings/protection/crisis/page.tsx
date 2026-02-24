// Crisis Response Playbook Page
// Static playbook for handling food safety incidents, client complaints, and PR crises.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { CrisisPlaybook } from '@/components/protection/crisis-playbook'

export const metadata: Metadata = { title: 'Crisis Response — ChefFlow' }

export default async function CrisisResponsePage() {
  await requireChef()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Crisis Response Playbook</h1>
        <p className="mt-1 text-sm text-stone-500">
          Step-by-step protocols for food safety incidents, client complaints, negative reviews, and
          other crisis scenarios. Know exactly what to do before a crisis happens.
        </p>
      </div>

      <CrisisPlaybook />
    </div>
  )
}
