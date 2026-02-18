// Automations List — Client component for managing rules
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RuleBuilder } from '@/components/automations/rule-builder'
import { ExecutionLog } from '@/components/automations/execution-log'
import { toggleAutomationRule, deleteAutomationRule } from '@/lib/automations/actions'
import { TRIGGER_LABELS, ACTION_LABELS } from '@/lib/automations/types'
import type { AutomationRule, AutomationExecution, TriggerEvent, ActionType } from '@/lib/automations/types'

interface AutomationsListProps {
  rules: AutomationRule[]
  executions: AutomationExecution[]
}

export function AutomationsList({ rules, executions }: AutomationsListProps) {
  const router = useRouter()
  const [showBuilder, setShowBuilder] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

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

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Delete this automation rule? This cannot be undone.')) return
    setDeleting(ruleId)
    try {
      await deleteAutomationRule(ruleId)
      router.refresh()
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rules ({rules.length})</CardTitle>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBuilder(!showBuilder)}
            >
              {showBuilder ? 'Cancel' : '+ New Rule'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showBuilder && (
            <RuleBuilder onClose={() => setShowBuilder(false)} />
          )}

          {rules.length === 0 && !showBuilder ? (
            <p className="text-sm text-stone-400 text-center py-6">
              No automation rules yet. Create one to get started.
            </p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className={`border rounded-lg p-3 transition-colors ${
                  rule.is_active ? 'border-stone-200' : 'border-stone-100 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-stone-800">{rule.name}</span>
                      <Badge variant={rule.is_active ? 'success' : 'info'}>
                        {rule.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    {rule.description && (
                      <p className="text-xs text-stone-500 mb-1">{rule.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                        When: {TRIGGER_LABELS[rule.trigger_event as TriggerEvent] || rule.trigger_event}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                        Do: {ACTION_LABELS[rule.action_type as ActionType] || rule.action_type}
                      </span>
                      {rule.total_fires > 0 && (
                        <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                          Fired {rule.total_fires}x
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(rule.id, rule.is_active)}
                      disabled={toggling === rule.id}
                      className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1"
                    >
                      {toggling === rule.id ? '...' : rule.is_active ? 'Pause' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={deleting === rule.id}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
                    >
                      {deleting === rule.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Execution Log */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Log</CardTitle>
        </CardHeader>
        <CardContent>
          <ExecutionLog executions={executions} />
        </CardContent>
      </Card>
    </div>
  )
}
