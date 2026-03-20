// Touchpoint Rules Settings Page
// Configure automated client touchpoint rules: follow-up timing, birthday reminders, etc.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { TouchpointRulesManager } from '@/components/clients/touchpoint-rules-manager'
import { getTouchpointRules } from '@/lib/clients/touchpoint-actions'

export const metadata: Metadata = { title: 'Touchpoint Rules | ChefFlow' }

function TouchpointLoading() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-lg bg-stone-800 animate-pulse" />
      ))}
    </div>
  )
}

async function TouchpointRulesContent() {
  const rules = await getTouchpointRules()
  return <TouchpointRulesManager rules={rules} />
}

export default async function TouchpointRulesPage() {
  await requireChef()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Touchpoint Rules</h1>
        <p className="text-stone-400 mt-1">
          Set up automated reminders for client follow-ups, birthdays, post-event check-ins, and
          other relationship touchpoints.
        </p>
      </div>

      <Suspense fallback={<TouchpointLoading />}>
        <TouchpointRulesContent />
      </Suspense>
    </div>
  )
}
