'use client'

import { useState, useTransition } from 'react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  getFollowUpRules,
  upsertFollowUpRule,
  deleteFollowUpRule,
} from '@/lib/clients/gifting-actions'
import type { FollowUpRule, TriggerType, RuleAction } from '@/lib/clients/gifting-types'

const TRIGGER_LABELS: Record<TriggerType, string> = {
  post_event: 'After every event',
  birthday: 'Client birthday',
  anniversary: 'Booking anniversary',
  no_booking_30d: 'No booking in 30 days',
  no_booking_60d: 'No booking in 60 days',
  no_booking_90d: 'No booking in 90 days',
  holiday: 'Major holiday',
  milestone_event_count: 'Event count milestone',
}

const ACTION_LABELS: Record<RuleAction, string> = {
  reminder: 'Show reminder',
  email_draft: 'Draft email',
  gift_suggestion: 'Suggest a gift',
}

const PRESET_TEMPLATES: { trigger: TriggerType; action: RuleAction; template: string }[] = [
  {
    trigger: 'post_event',
    action: 'reminder',
    template: 'Send a thank-you note within 48 hours of the event.',
  },
  {
    trigger: 'birthday',
    action: 'gift_suggestion',
    template: 'Consider a personalized gift or handwritten card for their birthday.',
  },
  {
    trigger: 'no_booking_30d',
    action: 'email_draft',
    template:
      'Hi {client_name}, it has been a while! I would love to cook for you again. Any upcoming occasions?',
  },
  {
    trigger: 'no_booking_60d',
    action: 'reminder',
    template: 'Client has not booked in 60 days. Consider reaching out with a special offer.',
  },
  {
    trigger: 'no_booking_90d',
    action: 'email_draft',
    template:
      'Hi {client_name}, I have been thinking about our past dinners together. I have some exciting new dishes I think you would love. Would you be interested in scheduling something?',
  },
  {
    trigger: 'milestone_event_count',
    action: 'gift_suggestion',
    template: 'This client just hit a milestone number of events! Consider a loyalty gift.',
  },
]

export default function FollowUpRulesManager({ initialRules }: { initialRules: FollowUpRule[] }) {
  const [rules, setRules] = useState<FollowUpRule[]>(initialRules)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [triggerType, setTriggerType] = useState<TriggerType>('post_event')
  const [action, setAction] = useState<RuleAction>('reminder')
  const [templateText, setTemplateText] = useState('')

  function resetForm() {
    setTriggerType('post_event')
    setAction('reminder')
    setTemplateText('')
    setShowForm(false)
    setEditingId(null)
  }

  function startEdit(rule: FollowUpRule) {
    setTriggerType(rule.trigger_type)
    setAction(rule.action)
    setTemplateText(rule.template_text || '')
    setEditingId(rule.id)
    setShowForm(true)
  }

  function applyPreset(preset: (typeof PRESET_TEMPLATES)[0]) {
    setTriggerType(preset.trigger)
    setAction(preset.action)
    setTemplateText(preset.template)
    setShowForm(true)
    setEditingId(null)
  }

  function handleSave() {
    setError(null)
    const previousRules = [...rules]

    startTransition(async () => {
      try {
        await upsertFollowUpRule({
          id: editingId || undefined,
          trigger_type: triggerType,
          action,
          template_text: templateText.trim() || undefined,
        })
        const updated = await getFollowUpRules()
        setRules(updated)
        resetForm()
      } catch (err: any) {
        setRules(previousRules)
        setError(err.message || 'Failed to save rule')
      }
    })
  }

  function handleToggle(rule: FollowUpRule) {
    setError(null)
    const previousRules = [...rules]
    setRules(rules.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)))

    startTransition(async () => {
      try {
        await upsertFollowUpRule({
          id: rule.id,
          trigger_type: rule.trigger_type,
          action: rule.action,
          template_text: rule.template_text || undefined,
          enabled: !rule.enabled,
        })
      } catch (err: any) {
        setRules(previousRules)
        setError(err.message || 'Failed to toggle rule')
      }
    })
  }

  function handleDelete(id: string) {
    setError(null)
    const previousRules = [...rules]
    setRules(rules.filter((r) => r.id !== id))

    startTransition(async () => {
      try {
        await deleteFollowUpRule(id)
      } catch (err: any) {
        setRules(previousRules)
        setError(err.message || 'Failed to delete rule')
      }
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Follow-Up Rules</h3>
          <p className="text-sm text-gray-500">
            Automated reminders and suggestions for client follow-ups
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showForm ? 'Cancel' : '+ Add Rule'}
        </button>
      </div>

      {error && <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Preset templates */}
      {showForm && !editingId && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Quick presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_TEMPLATES.map((preset, i) => (
              <button
                key={i}
                onClick={() => applyPreset(preset)}
                className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                {TRIGGER_LABELS[preset.trigger]}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Trigger</label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as TriggerType)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as RuleAction)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Template text (optional)
            </label>
            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={3}
              placeholder="Template for the reminder or email draft. Use {client_name} as a placeholder."
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : editingId ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      )}

      {rules.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          No follow-up rules configured. Add one above or use a preset.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center justify-between rounded-md border p-3 ${rule.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {TRIGGER_LABELS[rule.trigger_type] || rule.trigger_type}
                  </span>
                  <span className="rounded-full bg-brand-100 text-brand-700 px-2 py-0.5 text-xs font-medium">
                    {ACTION_LABELS[rule.action] || rule.action}
                  </span>
                </div>
                {rule.template_text && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-1">{rule.template_text}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3">
                <button
                  onClick={() => handleToggle(rule)}
                  disabled={isPending}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${rule.enabled ? 'bg-brand-600' : 'bg-gray-200'}`}
                  title={rule.enabled ? 'Disable' : 'Enable'}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </button>
                <button
                  onClick={() => startEdit(rule)}
                  disabled={isPending}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirmId(rule.id)}
                  disabled={isPending}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={!!deleteConfirmId}
        onCancel={() => setDeleteConfirmId(null)}
        title="Delete follow-up rule?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirmId) handleDelete(deleteConfirmId)
          setDeleteConfirmId(null)
        }}
      />
    </div>
  )
}
