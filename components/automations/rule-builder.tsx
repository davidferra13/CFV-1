// Automation Rule Builder — Create and edit automation rules
// Improvements over original:
// - Condition field picker: dropdown of known fields per trigger (no raw text needed)
// - Template picker: dropdown of chef's templates (no UUID paste)
// - Edit mode: accepts initialRule prop to pre-populate for editing
// - Quick-start gallery: pre-built rule starters for common use cases
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import {
  createAutomationRule,
  updateAutomationRule,
  getTemplatesForAutomations,
} from '@/lib/automations/actions'
import { TRIGGER_LABELS, ACTION_LABELS, TRIGGER_CONTEXT_FIELDS } from '@/lib/automations/types'
import type { TriggerEvent, ActionType, Condition, AutomationRule } from '@/lib/automations/types'

// ─── Quick-start rule templates ───────────────────────────────────────────

type QuickStartTemplate = {
  label: string
  description: string
  rule: {
    name: string
    description: string
    trigger_event: TriggerEvent
    conditions: Condition[]
    action_type: ActionType
    action_config: Record<string, string>
  }
}

const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    label: 'New Wix lead → notify me',
    description: 'Get an instant alert whenever a Wix form is submitted.',
    rule: {
      name: 'New Wix lead alert',
      description: 'Notifies you immediately when a Wix form is submitted.',
      trigger_event: 'wix_submission_received',
      conditions: [],
      action_type: 'create_notification',
      action_config: {
        title: 'New Wix lead: {{client_name}}',
        body: '{{client_name}} submitted a form for {{occasion}}',
      },
    },
  },
  {
    label: 'Client goes quiet → schedule follow-up',
    description: "Create a follow-up task when a client hasn't responded in 3+ days.",
    rule: {
      name: 'No-response follow-up task',
      description: 'Schedules a follow-up task when a client has been silent for 3+ days.',
      trigger_event: 'no_response_timeout',
      conditions: [{ field: 'days_since_last_contact', op: 'gte', value: '3' }],
      action_type: 'create_follow_up_task',
      action_config: {
        description:
          'Send a follow-up to {{client_name}} — no response in {{days_since_last_contact}} days',
        due_hours: '4',
      },
    },
  },
  {
    label: 'Event is 24h away → prep reminder',
    description: 'Remind yourself to do a final check the day before an event.',
    rule: {
      name: 'Day-before event prep reminder',
      description: 'Creates a follow-up task when an event is 24 hours away.',
      trigger_event: 'event_approaching',
      conditions: [{ field: 'hours_until_event', op: 'lte', value: '24' }],
      action_type: 'create_follow_up_task',
      action_config: {
        description: 'Day-before check for {{occasion}} with {{client_name}}',
        due_hours: '2',
      },
    },
  },
  {
    label: 'Inquiry status changes → log a note',
    description: 'Automatically log an internal note whenever an inquiry status changes.',
    rule: {
      name: 'Inquiry status change note',
      description: 'Logs an internal note whenever an inquiry status changes.',
      trigger_event: 'inquiry_status_changed',
      conditions: [],
      action_type: 'create_internal_note',
      action_config: {
        note: "Status changed to {{status}} for {{client_name}}'s {{occasion}} inquiry.",
      },
    },
  },
  {
    label: 'Payment received → thank-you draft',
    description: 'Create a follow-up task to send a thank-you note when an event is paid.',
    rule: {
      name: 'Payment received — thank-you task',
      description:
        'Creates a follow-up task to draft a thank-you message after deposit or full payment is received.',
      trigger_event: 'event_status_changed',
      conditions: [{ field: 'new_status', op: 'eq', value: 'paid' }],
      action_type: 'create_follow_up_task',
      action_config: {
        description: 'Send thank-you note to {{client_name}} for {{occasion}} — payment received',
        due_hours: '4',
      },
    },
  },
  {
    label: 'Event completed → request review',
    description: 'Schedule a review request 24 hours after an event is completed.',
    rule: {
      name: 'Post-event review request',
      description: 'Creates a follow-up task to request a review 24 hours after event completion.',
      trigger_event: 'event_status_changed',
      conditions: [{ field: 'new_status', op: 'eq', value: 'completed' }],
      action_type: 'create_follow_up_task',
      action_config: {
        description: 'Request a review from {{client_name}} — 24h after {{occasion}}',
        due_hours: '24',
      },
    },
  },
]

// ─── Props ────────────────────────────────────────────────────────────────

interface RuleBuilderProps {
  onClose: () => void
  initialRule?: AutomationRule // if provided, we're in edit mode
}

// ─── Main Component ───────────────────────────────────────────────────────

export function RuleBuilder({ onClose, initialRule }: RuleBuilderProps) {
  const router = useRouter()
  const isEditing = !!initialRule

  const [name, setName] = useState(initialRule?.name ?? '')
  const [description, setDescription] = useState(initialRule?.description ?? '')
  const [triggerEvent, setTriggerEvent] = useState<TriggerEvent>(
    initialRule?.trigger_event ?? 'inquiry_created'
  )
  const [conditions, setConditions] = useState<Condition[]>(
    (initialRule?.conditions as Condition[]) ?? []
  )
  const [actionType, setActionType] = useState<ActionType>(
    initialRule?.action_type ?? 'create_notification'
  )
  const [actionConfig, setActionConfig] = useState<Record<string, string>>(
    (initialRule?.action_config as Record<string, string>) ?? {}
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showQuickStart, setShowQuickStart] = useState(!isEditing)

  // Fetch templates when template action is selected
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    if (actionType === 'send_template_message') {
      getTemplatesForAutomations().then(setTemplates)
    }
  }, [actionType])

  // When trigger changes, clear conditions (fields differ per trigger)
  const handleTriggerChange = (newTrigger: TriggerEvent) => {
    setTriggerEvent(newTrigger)
    setConditions([])
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Rule name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isEditing) {
        await updateAutomationRule(initialRule.id, {
          name,
          description: description || undefined,
          trigger_event: triggerEvent,
          conditions,
          action_type: actionType,
          action_config: actionConfig,
        })
      } else {
        await createAutomationRule({
          name,
          description: description || undefined,
          trigger_event: triggerEvent,
          conditions,
          action_type: actionType,
          action_config: actionConfig,
          priority: 0,
        })
      }
      router.refresh()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const applyQuickStart = (template: QuickStartTemplate) => {
    setName(template.rule.name)
    setDescription(template.rule.description)
    setTriggerEvent(template.rule.trigger_event)
    setConditions(template.rule.conditions)
    setActionType(template.rule.action_type)
    setActionConfig(template.rule.action_config)
    setShowQuickStart(false)
  }

  const addCondition = () => {
    const fields = TRIGGER_CONTEXT_FIELDS[triggerEvent]
    const firstField = fields[0]?.field ?? ''
    setConditions([...conditions, { field: firstField, op: 'eq', value: '' }])
  }

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    setConditions(conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)))
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const contextFields = TRIGGER_CONTEXT_FIELDS[triggerEvent] ?? []

  return (
    <div className="border border-stone-700 rounded-lg bg-stone-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">
          {isEditing ? 'Edit Rule' : 'New Automation Rule'}
        </h3>
        {!isEditing && (
          <button
            onClick={() => setShowQuickStart(!showQuickStart)}
            className="text-xs text-brand-600 hover:text-brand-400"
          >
            {showQuickStart ? 'Build from scratch ↓' : '⚡ Quick-start templates'}
          </button>
        )}
      </div>

      {/* Quick-start gallery */}
      {showQuickStart && !isEditing && (
        <div className="px-4 py-3 bg-amber-950 border-b border-amber-100">
          <p className="text-xs font-medium text-stone-400 mb-2">
            Start with a pre-built rule — you can customise it after:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_START_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => applyQuickStart(tpl)}
                className="text-left border border-amber-200 rounded-md px-3 py-2 bg-stone-900 hover:border-brand-400 hover:bg-brand-950 transition-colors group"
              >
                <p className="text-xs font-medium text-stone-200 group-hover:text-brand-400">
                  {tpl.label}
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">{tpl.description}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowQuickStart(false)}
            className="mt-2 text-xs text-stone-400 hover:text-stone-400"
          >
            Skip — build from scratch
          </button>
        </div>
      )}

      <div className="p-4 space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">
            Rule Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Alert me on new Wix leads"
            className="w-full border border-stone-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">
            Description <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this rule do?"
            className="w-full border border-stone-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Trigger */}
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">
            When this happens…
          </label>
          <select
            aria-label="Trigger event"
            value={triggerEvent}
            onChange={(e) => handleTriggerChange(e.target.value as TriggerEvent)}
            className="w-full border border-stone-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Conditions */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-stone-400">
              And only if… <span className="text-stone-400 font-normal">(optional filter)</span>
            </label>
            <button
              type="button"
              onClick={addCondition}
              className="text-xs text-brand-600 hover:text-brand-400"
            >
              + Add condition
            </button>
          </div>
          {conditions.length === 0 ? (
            <p className="text-xs text-stone-400 border border-dashed border-stone-700 rounded px-3 py-2">
              No filter — rule fires every time the trigger happens
            </p>
          ) : (
            <div className="space-y-2">
              {conditions.map((cond, i) => (
                <div key={i} className="flex gap-2 items-center">
                  {/* Field picker — dropdown of known context fields */}
                  <select
                    aria-label={`Condition ${i + 1} field`}
                    value={cond.field}
                    onChange={(e) => updateCondition(i, { field: e.target.value })}
                    className="flex-1 border border-stone-600 rounded px-2 py-1 text-xs min-w-0"
                  >
                    {contextFields.map((f) => (
                      <option key={f.field} value={f.field}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  {/* Operator */}
                  <select
                    aria-label={`Condition ${i + 1} operator`}
                    value={cond.op}
                    onChange={(e) => updateCondition(i, { op: e.target.value as Condition['op'] })}
                    className="border border-stone-600 rounded px-2 py-1 text-xs"
                  >
                    <option value="eq">equals</option>
                    <option value="neq">not</option>
                    <option value="gt">more than</option>
                    <option value="lt">less than</option>
                    <option value="gte">at least</option>
                    <option value="lte">at most</option>
                    <option value="contains">contains</option>
                  </select>
                  {/* Value */}
                  <input
                    type="text"
                    aria-label={`Condition ${i + 1} value`}
                    value={String(cond.value)}
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                    placeholder={contextFields.find((f) => f.field === cond.field)?.hint ?? 'value'}
                    className="flex-1 border border-stone-600 rounded px-2 py-1 text-xs min-w-0"
                  />
                  <button
                    type="button"
                    aria-label={`Remove condition ${i + 1}`}
                    onClick={() => removeCondition(i)}
                    className="text-red-400 hover:text-red-600 text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action */}
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Then do this…</label>
          <select
            aria-label="Action type"
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value as ActionType)
              setActionConfig({})
            }}
            className="w-full border border-stone-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Config */}
        <ActionConfigForm
          actionType={actionType}
          config={actionConfig}
          onChange={setActionConfig}
          templates={templates}
          contextFields={contextFields}
        />

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={saving}>
            {isEditing ? 'Save Changes' : 'Create Rule'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Action Config Form ───────────────────────────────────────────────────

function ActionConfigForm({
  actionType,
  config,
  onChange,
  templates,
  contextFields,
}: {
  actionType: ActionType
  config: Record<string, string>
  onChange: (config: Record<string, string>) => void
  templates: { id: string; name: string }[]
  contextFields: { field: string; label: string }[]
}) {
  const fieldHint =
    contextFields.length > 0
      ? `Dynamic values: ${contextFields.map((f) => `{{${f.field}}}`).join(', ')}`
      : 'Use {{field_name}} for dynamic values'

  switch (actionType) {
    case 'create_notification':
      return (
        <div className="space-y-2 pl-3 border-l-2 border-amber-200">
          <p className="text-[11px] text-stone-500">{fieldHint}</p>
          <div>
            <label className="block text-xs text-stone-500 mb-0.5">Notification title</label>
            <input
              type="text"
              value={config.title || ''}
              onChange={(e) => onChange({ ...config, title: e.target.value })}
              placeholder="e.g., New lead: {{client_name}}"
              className="w-full border border-stone-600 rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-0.5">Message (optional)</label>
            <input
              type="text"
              value={config.body || ''}
              onChange={(e) => onChange({ ...config, body: e.target.value })}
              placeholder="e.g., {{client_name}} wants {{occasion}} for {{guest_count}} guests"
              className="w-full border border-stone-600 rounded px-2 py-1 text-xs"
            />
          </div>
        </div>
      )

    case 'create_follow_up_task':
      return (
        <div className="space-y-2 pl-3 border-l-2 border-blue-200">
          <p className="text-[11px] text-stone-500">{fieldHint}</p>
          <div>
            <label className="block text-xs text-stone-500 mb-0.5">Task description</label>
            <input
              type="text"
              value={config.description || ''}
              onChange={(e) => onChange({ ...config, description: e.target.value })}
              placeholder="e.g., Follow up with {{client_name}} about {{occasion}}"
              className="w-full border border-stone-600 rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-0.5">Due in (hours from now)</label>
            <input
              type="number"
              min={1}
              max={720}
              value={config.due_hours || '48'}
              onChange={(e) => onChange({ ...config, due_hours: e.target.value })}
              className="w-28 border border-stone-600 rounded px-2 py-1 text-xs"
            />
          </div>
        </div>
      )

    case 'create_internal_note':
      return (
        <div className="pl-3 border-l-2 border-emerald-200 space-y-1">
          <p className="text-[11px] text-stone-500">{fieldHint}</p>
          <label className="block text-xs text-stone-500">Note text</label>
          <textarea
            value={config.note || ''}
            onChange={(e) => onChange({ ...config, note: e.target.value })}
            placeholder="e.g., Auto-flagged: status changed to {{status}}"
            rows={2}
            className="w-full border border-stone-600 rounded px-2 py-1 text-xs"
          />
        </div>
      )

    case 'send_template_message':
      return (
        <div className="pl-3 border-l-2 border-purple-200 space-y-2">
          <p className="text-xs text-stone-500">
            Creates a <strong>draft</strong> message from your template — you review and send it.
            Nothing goes out automatically.
          </p>
          <div>
            <label className="block text-xs text-stone-500 mb-0.5">Template</label>
            {templates.length === 0 ? (
              <p className="text-xs text-stone-400 italic">
                No templates found. Go to Settings → Response Templates to create one first.
              </p>
            ) : (
              <select
                aria-label="Response template"
                value={config.template_id || ''}
                onChange={(e) => onChange({ ...config, template_id: e.target.value })}
                className="w-full border border-stone-600 rounded px-2 py-1 text-xs"
              >
                <option value="">Select a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )

    default:
      return null
  }
}
