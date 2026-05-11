// Automation Settings Panel
// Container for all 6 preset automation rule cards.
// Renders each rule with its toggle, description, and config.
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AutomationRuleCard } from './automation-rule-card'
import type { PresetRuleConfig } from '@/lib/automations/types'

interface AutomationSettingsPanelProps {
  presetRules: PresetRuleConfig[]
}

export function AutomationSettingsPanel({ presetRules }: AutomationSettingsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Automation Rules</CardTitle>
          <p className="text-sm text-stone-500 mt-0.5">
            Set it and forget it. Toggle a rule on, configure the threshold, and ChefFlow handles the
            rest. No custom code needed.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {presetRules.map((rule) => (
          <AutomationRuleCard key={rule.type} rule={rule} />
        ))}
      </CardContent>
    </Card>
  )
}
