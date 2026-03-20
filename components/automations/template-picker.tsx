// Automation Rule Template Picker
// Grid of pre-built automation templates grouped by category.
// "Use Template" pre-fills the rule builder with the selected template config.
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AUTOMATION_RULE_TEMPLATES,
  TEMPLATE_CATEGORY_LABELS,
  type AutomationRuleTemplate,
  type TemplateCategory,
} from '@/lib/automations/rule-templates'
import { TRIGGER_LABELS, ACTION_LABELS } from '@/lib/automations/types'

interface TemplatePickerProps {
  onSelectTemplate: (template: AutomationRuleTemplate) => void
}

const CATEGORY_ORDER: TemplateCategory[] = ['client_communication', 'payment', 'event_prep']

const CATEGORY_BADGE_VARIANT: Record<TemplateCategory, 'default' | 'success' | 'warning' | 'info'> = {
  client_communication: 'info',
  payment: 'warning',
  event_prep: 'success',
}

export function TemplatePicker({ onSelectTemplate }: TemplatePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')

  const filteredTemplates =
    selectedCategory === 'all'
      ? AUTOMATION_RULE_TEMPLATES
      : AUTOMATION_RULE_TEMPLATES.filter((t) => t.category === selectedCategory)

  const grouped = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      const templates = filteredTemplates.filter((t) => t.category === cat)
      if (templates.length > 0) {
        acc.push({ category: cat, templates })
      }
      return acc
    },
    [] as { category: TemplateCategory; templates: AutomationRuleTemplate[] }[]
  )

  return (
    <div className="space-y-6">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'primary' : 'ghost'}
          onClick={() => setSelectedCategory('all')}
          className="text-sm"
        >
          All Templates
        </Button>
        {CATEGORY_ORDER.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'primary' : 'ghost'}
            onClick={() => setSelectedCategory(cat)}
            className="text-sm"
          >
            {TEMPLATE_CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      {/* Grouped template cards */}
      {grouped.map(({ category, templates }) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {TEMPLATE_CATEGORY_LABELS[category]}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant={CATEGORY_BADGE_VARIANT[template.category]}>
                      {TEMPLATE_CATEGORY_LABELS[template.category]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-3">
                  <p className="text-sm text-gray-600">{template.description}</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>
                      <span className="font-medium">Trigger:</span>{' '}
                      {TRIGGER_LABELS[template.triggerType]}
                    </p>
                    <p>
                      <span className="font-medium">Action:</span>{' '}
                      {ACTION_LABELS[template.actionType]}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => onSelectTemplate(template)}
                    className="mt-2 w-full"
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {filteredTemplates.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">
          No templates in this category.
        </p>
      )}
    </div>
  )
}
