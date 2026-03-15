// Chef Intake Forms Management Page
// List, create, edit, and send intake forms to clients

import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getIntakeForms, getIntakeResponses } from '@/lib/clients/intake-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { IntakeFormsManager } from '@/components/clients/intake-forms-manager'

export default async function IntakeFormsPage() {
  await requireChef()

  const [forms, responses] = await Promise.all([getIntakeForms(), getIntakeResponses()])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Client Intake Forms</h1>
        <p className="text-sm text-stone-500 mt-1">
          Create assessment forms and send them to clients. Responses can be merged into client
          profiles.
        </p>
      </div>

      <Suspense fallback={<div className="text-stone-400">Loading...</div>}>
        <IntakeFormsManager forms={forms} responses={responses} />
      </Suspense>
    </div>
  )
}
