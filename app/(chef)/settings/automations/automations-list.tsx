// Automations List — Client component for managing rules
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { RuleBuilder } from '@/components/automations/rule-builder'
import { BuiltInSettings } from '@/components/automations/built-in-settings'
import { ExecutionLog } from '@/components/automations/execution-log'
import { toggleAutomationRule, deleteAutomationRule } from '@/lib/automations/actions'
import { TRIGGER_LABELS, ACTION_LABELS } from '@/lib/automations/types'
import type {
  AutomationRule,
  AutomationExecution,
  TriggerEvent,
  ActionType,
  ChefAutomationSettings,
} from '@/lib/automations/types'

interface AutomationsListProps {
  rules: AutomationRule[]
  executions: AutomationExecution[]
  settings: ChefAutomationSettings
}

export function AutomationsList({ rules, executions, settings }: AutomationsListProps) {
  const router = useRouter()
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const handleToggle = async (ruleId: string, currentActive: boolean) => {
    setToggling(ruleId)
    try {
      await toggleAutomationRule(ruleId, !currentActive)
      router.refresh()
    } catch (err) {
      console.error('Toggle failed:', err)
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = (ruleId: string) => {
    setDeleteTargetId(ruleId)
    setShowDeleteConfirm(true)
  }

  const handleConfirmedDelete = async () => {
    if (!deleteTargetId) return
    setShowDeleteConfirm(false)
    setDeleting(deleteTargetId)
    try {
      await deleteAutomationRule(deleteTargetId)
      router.refresh()
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeleting(null)
    }
  }

  const handleEditClose = () => {
    setEditingRule(null)
  }

  return (
    <div className="space-y-6">
      {/* ── Built-in Automations ─────────────────────────────────────────── */}
      <BuiltInSettings settings={settings} />

      {/* ── Custom Rules ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Custom Rules</CardTitle>
              <p className="text-sm text-stone-500 mt-0.5">
                Your rules run on top of the built-in automations above.
              </p>
            </div>
            {!showBuilder && !editingRule && (
              <Button variant="primary" size="sm" onClick={() => setShowBuilder(true)}>
                + New Rule
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* New rule builder */}
          {showBuilder && <RuleBuilder onClose={() => setShowBuilder(false)} />}

          {/* Edit rule builder */}
          {editingRule && <RuleBuilder initialRule={editingRule} onClose={handleEditClose} />}

          {/* Empty state */}
          {rules.length === 0 && !showBuilder && !editingRule && (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-stone-400">No custom rules yet.</p>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Custom rules let you build additional automations on top of the built-ins above —
                like getting a special alert for large-party inquiries, or logging a note whenever
                an event is confirmed.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setShowBuilder(true)}>
                + Create your first rule
              </Button>
            </div>
          )}

          {/* Rule cards */}
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`border rounded-lg p-3 transition-colors ${
                rule.is_active
                  ? 'border-stone-700 bg-stone-900'
                  : 'border-stone-800 bg-stone-800 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-stone-200">{rule.name}</span>
                    <Badge variant={rule.is_active ? 'success' : 'info'}>
                      {rule.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  {rule.description && (
                    <p className="text-xs text-stone-500 mb-1">{rule.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="bg-blue-950 text-blue-700 px-1.5 py-0.5 rounded">
                      When:{' '}
                      {TRIGGER_LABELS[rule.trigger_event as TriggerEvent] || rule.trigger_event}
                    </span>
                    <span className="bg-emerald-950 text-emerald-700 px-1.5 py-0.5 rounded">
                      Do: {ACTION_LABELS[rule.action_type as ActionType] || rule.action_type}
                    </span>
                    {rule.total_fires > 0 && (
                      <span className="bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded">
                        Fired {rule.total_fires}×
                      </span>
                    )}
                    {rule.last_fired_at && (
                      <span className="bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded">
                        Last: {new Date(rule.last_fired_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBuilder(false)
                      setEditingRule(rule)
                    }}
                    className="text-xs text-stone-400 hover:text-stone-300 px-2 py-1"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(rule.id, rule.is_active)}
                    disabled={toggling === rule.id}
                    className="text-xs text-stone-400 hover:text-stone-400 px-2 py-1"
                  >
                    {toggling === rule.id ? '…' : rule.is_active ? 'Pause' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rule.id)}
                    disabled={deleting === rule.id}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
                  >
                    {deleting === rule.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this automation rule?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting !== null}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* ── Execution Log ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <p className="text-sm text-stone-500">Recent custom rule executions.</p>
        </CardHeader>
        <CardContent>
          <ExecutionLog executions={executions} />
        </CardContent>
      </Card>
    </div>
  )
}
