// Automations Settings Page
// Chef-configurable built-in toggles + custom rule-based triggers and actions.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getAutomationRules, getAutomationExecutions } from '@/lib/automations/actions'
import { getAutomationSettings } from '@/lib/automations/settings-actions'
import { AutomationsList } from './automations-list'

export const metadata: Metadata = { title: 'Automations - ChefFlow' }

export default async function AutomationsPage() {
  await requireChef()

  const [rules, executions, settings] = await Promise.all([
    getAutomationRules(),
    getAutomationExecutions({ limit: 30 }),
    getAutomationSettings(),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Automations</h1>
        <p className="text-stone-600 mt-1">
          Control what ChefFlow does automatically — built-in follow-up reminders, expiry rules, and your own custom triggers.
        </p>
      </div>

      <AutomationsList rules={rules} executions={executions} settings={settings} />
    </div>
  )
}
