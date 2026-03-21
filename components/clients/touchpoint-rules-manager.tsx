'use client'

import { useState, useTransition } from 'react'
import {
  getTouchpointRules,
  createTouchpointRule,
  updateTouchpointRule,
  deleteTouchpointRule,
} from '@/lib/clients/touchpoint-actions'
import type { TouchpointRule, TouchpointRuleType } from '@/lib/clients/touchpoint-actions'

const RULE_TYPE_LABELS: Record<TouchpointRuleType, string> = {
  birthday: 'Birthday',
  anniversary: 'Client anniversary',
  days_since_last_event: 'Days since last event',
  lifetime_spend_milestone: 'Lifetime spend milestone',
  streak_milestone: 'Event count milestone',
  custom: 'Custom',
}

const RULE_TYPE_DESCRIPTIONS: Record<TouchpointRuleType, string> = {
  birthday: 'Triggers when a client birthday is within the configured window (days)',
  anniversary: 'Triggers near the anniversary of their first event (days)',
  days_since_last_event: 'Triggers when a client has not booked in N days',
  lifetime_spend_milestone: 'Triggers when a client crosses a spend threshold (dollars)',
  streak_milestone: 'Triggers when a client reaches N total events',
  custom: 'A manual reminder with no automatic evaluation',
}

const TRIGGER_VALUE_LABELS: Partial<Record<TouchpointRuleType, string>> = {
  birthday: 'Days before birthday',
  anniversary: 'Days before anniversary',
  days_since_last_event: 'Days threshold',
  lifetime_spend_milestone: 'Spend milestone ($)',
  streak_milestone: 'Event count',
}

export default function TouchpointRulesManager({
  initialRules,
}: {
  initialRules: TouchpointRule[]
}) {
  const [rules, setRules] = useState<TouchpointRule[]>(initialRules)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [ruleType, setRuleType] = useState<TouchpointRuleType>('birthday')
  const [triggerValue, setTriggerValue] = useState('')
  const [actionSuggestion, setActionSuggestion] = useState('')

  function resetForm() {
    setRuleType('birthday')
    setTriggerValue('')
    setActionSuggestion('')
    setShowForm(false)
    setEditingId(null)
  }

  function startEdit(rule: TouchpointRule) {
    setRuleType(rule.rule_type)
    setTriggerValue(rule.trigger_value || '')
    setActionSuggestion(rule.action_suggestion || '')
    setEditingId(rule.id)
    setShowForm(true)
  }

  function handleSave() {
    setError(null)
    const previousRules = [...rules]

    startTransition(async () => {
      try {
        if (editingId) {
          await updateTouchpointRule(editingId, {
            rule_type: ruleType,
            trigger_value: triggerValue.trim() || null,
            action_suggestion: actionSuggestion.trim() || null,
          })
        } else {
          await createTouchpointRule({
            rule_type: ruleType,
            trigger_value: triggerValue.trim() || undefined,
            action_suggestion: actionSuggestion.trim() || undefined,
          })
        }
        const updated = await getTouchpointRules()
        setRules(updated)
        resetForm()
      } catch (err: any) {
        setRules(previousRules)
        setError(err.message || 'Failed to save rule')
      }
    })
  }

  function handleToggle(rule: TouchpointRule) {
    setError(null)
    const previousRules = [...rules]
    setRules(rules.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)))

    startTransition(async () => {
      try {
        await updateTouchpointRule(rule.id, { is_active: !rule.is_active })
      } catch (err: any) {
        setRules(previousRules)
        setError(err.message || 'Failed to toggle rule')
      }
    })
  }

  function handleDelete(id: string) {
    setError(null)
    const previousRules = [...rules]
    setRules(rules.map((r) => (r.id === id ? { ...r, is_active: false } : r)))

    startTransition(async () => {
      try {
        await deleteTouchpointRule(id)
        const updated = await getTouchpointRules()
        setRules(updated)
      } catch (err: any) {
        setRules(previousRules)
        setError(err.message || 'Failed to deactivate rule')
      }
    })
  }

  const activeRules = rules.filter((r) => r.is_active)
  const inactiveRules = rules.filter((r) => !r.is_active)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Touchpoint Rules</h3>
          <p className="text-sm text-gray-500">
            Configure when to surface client touchpoint reminders
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

      {showForm && (
        <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rule Type</label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as TouchpointRuleType)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {Object.entries(RULE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">{RULE_TYPE_DESCRIPTIONS[ruleType]}</p>
          </div>

          {ruleType !== 'custom' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {TRIGGER_VALUE_LABELS[ruleType] || 'Trigger Value'}
              </label>
              <input
                type="text"
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
                placeholder={
                  ruleType === 'birthday'
                    ? '7'
                    : ruleType === 'days_since_last_event'
                      ? '90'
                      : ruleType === 'lifetime_spend_milestone'
                        ? '5000'
                        : ruleType === 'streak_milestone'
                          ? '10'
                          : '7'
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Suggested Action</label>
            <textarea
              value={actionSuggestion}
              onChange={(e) => setActionSuggestion(e.target.value)}
              rows={2}
              placeholder="e.g., Send a thank you note, Offer loyalty discount"
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

      {activeRules.length === 0 && inactiveRules.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          No touchpoint rules configured yet. Add one above to start getting client reminders.
        </p>
      ) : (
        <>
          {activeRules.length > 0 && (
            <div className="space-y-2">
              {activeRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}
                      </span>
                      {rule.trigger_value && (
                        <span className="rounded-full bg-brand-100 text-brand-700 px-2 py-0.5 text-xs font-medium">
                          {rule.trigger_value}
                        </span>
                      )}
                    </div>
                    {rule.action_suggestion && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                        {rule.action_suggestion}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => handleToggle(rule)}
                      disabled={isPending}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        rule.is_active ? 'bg-brand-600' : 'bg-gray-200'
                      }`}
                      title={rule.is_active ? 'Disable' : 'Enable'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          rule.is_active ? 'translate-x-4' : 'translate-x-0'
                        }`}
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
                      onClick={() => handleDelete(rule.id)}
                      disabled={isPending}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {inactiveRules.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2">Inactive Rules</p>
              <div className="space-y-2">
                {inactiveRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3 opacity-60"
                  >
                    <div className="flex-1">
                      <span className="text-sm text-gray-600">
                        {RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggle(rule)}
                      disabled={isPending}
                      className="text-xs text-brand-500 hover:text-brand-700"
                    >
                      Re-activate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
