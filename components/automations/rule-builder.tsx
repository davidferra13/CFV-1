// Automation Rule Builder — Create/edit automation rules
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { createAutomationRule } from '@/lib/automations/actions'
import { TRIGGER_LABELS, ACTION_LABELS } from '@/lib/automations/types'
import type { TriggerEvent, ActionType, Condition } from '@/lib/automations/types'

interface RuleBuilderProps {
  onClose: () => void
}

export function RuleBuilder({ onClose }: RuleBuilderProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerEvent, setTriggerEvent] = useState<TriggerEvent>('inquiry_created')
  const [conditions, setConditions] = useState<Condition[]>([])
  const [actionType, setActionType] = useState<ActionType>('create_notification')
  const [actionConfig, setActionConfig] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createAutomationRule({
        name,
        description: description || undefined,
        trigger_event: triggerEvent,
        conditions,
        action_type: actionType,
        action_config: actionConfig,
      })
      router.refresh()
      onClose()
    } catch (err) {
      const e = err as Error
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const addCondition = () => {
    setConditions([...conditions, { field: '', op: 'eq', value: '' }])
  }

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    setConditions(conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)))
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  return (
    <div className="border border-stone-200 rounded-lg p-4 space-y-4 bg-white">
      <h3 className="text-sm font-semibold text-stone-800">New Automation Rule</h3>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Rule Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Notify on new Wix lead"
          className="w-full border border-stone-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this rule do?"
          className="w-full border border-stone-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Trigger */}
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">When this happens...</label>
        <select
          value={triggerEvent}
          onChange={(e) => setTriggerEvent(e.target.value as TriggerEvent)}
          className="w-full border border-stone-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-stone-600">And these conditions match...</label>
          <button
            onClick={addCondition}
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            + Add condition
          </button>
        </div>
        {conditions.length === 0 ? (
          <p className="text-xs text-stone-400">No conditions — rule fires on every trigger</p>
        ) : (
          <div className="space-y-2">
            {conditions.map((cond, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={cond.field}
                  onChange={(e) => updateCondition(i, { field: e.target.value })}
                  placeholder="field"
                  className="flex-1 border border-stone-300 rounded px-2 py-1 text-xs"
                />
                <select
                  value={cond.op}
                  onChange={(e) => updateCondition(i, { op: e.target.value as Condition['op'] })}
                  className="border border-stone-300 rounded px-2 py-1 text-xs"
                >
                  <option value="eq">=</option>
                  <option value="neq">!=</option>
                  <option value="gt">&gt;</option>
                  <option value="lt">&lt;</option>
                  <option value="gte">&gt;=</option>
                  <option value="lte">&lt;=</option>
                  <option value="contains">contains</option>
                </select>
                <input
                  type="text"
                  value={String(cond.value)}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                  placeholder="value"
                  className="flex-1 border border-stone-300 rounded px-2 py-1 text-xs"
                />
                <button
                  onClick={() => removeCondition(i)}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action */}
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Then do this...</label>
        <select
          value={actionType}
          onChange={(e) => {
            setActionType(e.target.value as ActionType)
            setActionConfig({})
          }}
          className="w-full border border-stone-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Action Config */}
      <ActionConfigForm
        actionType={actionType}
        config={actionConfig}
        onChange={setActionConfig}
      />

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} loading={saving}>
          Create Rule
        </Button>
      </div>
    </div>
  )
}

function ActionConfigForm({
  actionType,
  config,
  onChange,
}: {
  actionType: ActionType
  config: Record<string, string>
  onChange: (config: Record<string, string>) => void
}) {
  switch (actionType) {
    case 'create_notification':
      return (
        <div className="space-y-2 pl-2 border-l-2 border-amber-200">
          <div>
            <label className="block text-xs text-stone-500 mb-0.5">Notification title</label>
            <input
              type="text"
              value={config.title || ''}
              onChange={(e) => onChange({ ...config, title: e.target.value })}
              placeholder="e.g., New lead from Wix!"
              className="w-full border border-stone-300 rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-0.5">
              Body (use {'{{field_name}}'} for dynamic values)
            </label>
            <input
              type="text"
              value={config.body || ''}
              onChange={(e) => onChange({ ...config, body: e.target.value })}
              placeholder="e.g., {{client_name}} submitted a form"
              className="w-full border border-stone-300 rounded px-2 py-1 text-xs"
            />
          </div>
        </div>
      )

    case 'create_follow_up_task':
      return (
        <div className="space-y-2 pl-2 border-l-2 border-blue-200">
          <div>
            <label className="block text-xs text-stone-500 mb-0.5">Task description</label>
            <input
              type="text"
              value={config.description || ''}
              onChange={(e) => onChange({ ...config, description: e.target.value })}
              placeholder="e.g., Follow up with client"
              className="w-full border border-stone-300 rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-0.5">Due in (hours)</label>
            <input
              type="number"
              value={config.due_hours || '48'}
              onChange={(e) => onChange({ ...config, due_hours: e.target.value })}
              className="w-32 border border-stone-300 rounded px-2 py-1 text-xs"
            />
          </div>
        </div>
      )

    case 'create_internal_note':
      return (
        <div className="pl-2 border-l-2 border-emerald-200">
          <label className="block text-xs text-stone-500 mb-0.5">Note text</label>
          <textarea
            value={config.note || ''}
            onChange={(e) => onChange({ ...config, note: e.target.value })}
            placeholder="e.g., Auto-flagged: Wix form submission"
            rows={2}
            className="w-full border border-stone-300 rounded px-2 py-1 text-xs"
          />
        </div>
      )

    case 'send_template_message':
      return (
        <div className="pl-2 border-l-2 border-purple-200">
          <p className="text-xs text-stone-500">
            Template messages are created as <strong>drafts</strong> — you must review and approve before sending.
          </p>
          <div className="mt-1">
            <label className="block text-xs text-stone-500 mb-0.5">Template ID</label>
            <input
              type="text"
              value={config.template_id || ''}
              onChange={(e) => onChange({ ...config, template_id: e.target.value })}
              placeholder="Paste template UUID"
              className="w-full border border-stone-300 rounded px-2 py-1 text-xs"
            />
          </div>
        </div>
      )

    default:
      return null
  }
}
