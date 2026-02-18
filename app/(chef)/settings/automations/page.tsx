// Automations Settings Page
// Chef-configurable rule-based triggers and actions.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getAutomationRules, getAutomationExecutions } from '@/lib/automations/actions'
import { AutomationsList } from './automations-list'

export const metadata: Metadata = { title: 'Automations - ChefFlow' }

export default async function AutomationsPage() {
  await requireChef()

  const [rules, executions] = await Promise.all([
    getAutomationRules(),
    getAutomationExecutions({ limit: 30 }),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Automations</h1>
        <p className="text-stone-600 mt-1">
          Set up rules that automatically fire when events happen — new inquiries, status changes, approaching deadlines.
        </p>
      </div>

      <AutomationsList rules={rules} executions={executions} />
    </div>
  )
}
