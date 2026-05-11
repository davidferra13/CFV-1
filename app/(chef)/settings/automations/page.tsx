// Automations Settings Page
// Chef-configurable built-in toggles + preset rule toggles + custom rule-based triggers and actions.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getAutomationRules, getAutomationExecutions } from '@/lib/automations/actions'
import { getAutomationSettings } from '@/lib/automations/settings-actions'
import { getPresetRules } from '@/lib/automations/preset-actions'
import { AutomationsList } from './automations-list'
import { AutomationSettingsPanel } from '@/components/automations/automation-settings-panel'

export const metadata: Metadata = { title: 'Automations' }

export default async function AutomationsPage() {
  await requireChef()

  const [rules, executions, settings, presetRules] = await Promise.all([
    getAutomationRules(),
    getAutomationExecutions({ limit: 30 }),
    getAutomationSettings(),
    getPresetRules(),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Automations</h1>
        <p className="text-stone-400 mt-1">
          Control what ChefFlow does automatically: preset rules, built-in reminders, and your own
          custom triggers.
        </p>
      </div>

      <AutomationSettingsPanel presetRules={presetRules} />

      <AutomationsList rules={rules} executions={executions} settings={settings} />
    </div>
  )
}
