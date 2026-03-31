// Client Intake Forms - Management Page
// Chefs create, edit, and share intake/assessment forms with clients.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getIntakeForms } from '@/lib/clients/intake-actions'
import { IntakeFormsClient } from './intake-forms-client'

export const metadata: Metadata = { title: 'Intake Forms' }

export default async function IntakeFormsPage() {
  await requireChef()
  const forms = await getIntakeForms()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Intake Forms</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Create and share client assessment forms. Clients can fill them out without an account.
          </p>
        </div>
      </div>

      <IntakeFormsClient forms={forms} />
    </div>
  )
}
