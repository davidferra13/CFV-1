// Template Picker - Quick-start automation templates
// Lets the chef pick a pre-built automation rule to add, then edits it via RuleBuilder.
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createAutomationRule } from '@/lib/automations/actions'
import type { TriggerEvent, ActionType, Condition } from '@/lib/automations/types'

type AutomationTemplate = {
  id: string
  name: string
  description: string
  trigger_event: TriggerEvent
  action_type: ActionType
  conditions: Condition[]
  action_config: Record<string, unknown>
  category: 'follow-up' | 'alerts' | 'organization'
}

const TEMPLATES: AutomationTemplate[] = [
  {
    id: 'large-party-alert',
    name: 'Large Party Alert',
    description: 'Get notified when an inquiry comes in for 20+ guests.',
    trigger_event: 'inquiry_created',
    action_type: 'create_notification',
    conditions: [{ field: 'guest_count', op: 'gte', value: 20 }],
    action_config: { message: 'New large-party inquiry (20+ guests)' },
    category: 'alerts',
  },
  {
    id: 'event-confirmed-note',
    name: 'Note on Event Confirmation',
    description: 'Auto-create an internal note when an event is confirmed.',
    trigger_event: 'event_status_changed',
    action_type: 'create_internal_note',
    conditions: [{ field: 'new_status', op: 'eq', value: 'confirmed' }],
    action_config: { note: 'Event confirmed. Begin prep planning.' },
    category: 'organization',
  },
  {
    id: 'payment-overdue-task',
    name: 'Follow-Up on Overdue Payment',
    description: 'Create a follow-up task when a payment becomes overdue.',
    trigger_event: 'payment_overdue',
    action_type: 'create_follow_up_task',
    conditions: [],
    action_config: { task_title: 'Follow up on overdue payment' },
    category: 'follow-up',
  },
  {
    id: 'quote-expiring-notification',
    name: 'Quote Expiring Reminder',
    description: 'Get a notification when a quote is about to expire.',
    trigger_event: 'quote_expiring',
    action_type: 'create_notification',
    conditions: [],
    action_config: { message: 'A quote is expiring soon. Follow up with the client.' },
    category: 'alerts',
  },
  {
    id: 'event-approaching-prep',
    name: 'Pre-Event Prep Task',
    description: 'Create a prep task when an event is approaching.',
    trigger_event: 'event_approaching',
    action_type: 'create_follow_up_task',
    conditions: [],
    action_config: { task_title: 'Finalize prep list and confirm details' },
    category: 'follow-up',
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  'follow-up': 'Follow-up',
  alerts: 'Alerts',
  organization: 'Organization',
}

const CATEGORY_VARIANTS: Record<string, 'info' | 'warning' | 'success'> = {
  'follow-up': 'info',
  alerts: 'warning',
  organization: 'success',
}

export function TemplatePicker() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [addedId, setAddedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleUseTemplate = (template: AutomationTemplate) => {
    setError(null)
    setAddedId(template.id)
    startTransition(async () => {
      try {
        await createAutomationRule({
          name: template.name,
          description: template.description,
          trigger_event: template.trigger_event,
          action_type: template.action_type,
          conditions: template.conditions as any,
          action_config: template.action_config,
          priority: 0,
        })
        router.refresh()
        // Brief feedback then clear
        setTimeout(() => setAddedId(null), 2000)
      } catch (err) {
        setAddedId(null)
        setError(err instanceof Error ? err.message : 'Failed to create rule from template')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Start from Template</CardTitle>
            <p className="text-sm text-stone-500 mt-0.5">
              Pick a common automation to add instantly. You can customize it after.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
            Dismiss
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="grid gap-2">
          {TEMPLATES.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-stone-200">{t.name}</span>
                  <Badge variant={CATEGORY_VARIANTS[t.category] ?? 'info'}>
                    {CATEGORY_LABELS[t.category]}
                  </Badge>
                </div>
                <p className="text-xs text-stone-500">{t.description}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={isPending}
                onClick={() => handleUseTemplate(t)}
              >
                {addedId === t.id ? 'Added!' : 'Use'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
