// Automation Execution Log — Shows recent rule firings
import { Badge } from '@/components/ui/badge'
import type { AutomationExecution } from '@/lib/automations/types'

interface ExecutionLogProps {
  executions: AutomationExecution[]
}

export function ExecutionLog({ executions }: ExecutionLogProps) {
  if (executions.length === 0) {
    return (
      <p className="text-xs text-stone-400 py-4 text-center">
        No automation executions yet. Rules will appear here after they fire.
      </p>
    )
  }

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto">
      {executions.map((exec) => (
        <div
          key={exec.id}
          className="flex items-center justify-between text-xs border-b border-stone-100 py-1.5 last:border-0"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <StatusBadge status={exec.status} />
            <span className="text-stone-600 truncate">
              {exec.trigger_event}
              {exec.trigger_entity_type && (
                <span className="text-stone-400"> ({exec.trigger_entity_type})</span>
              )}
            </span>
            <span className="text-stone-400">
              &rarr; {exec.action_type}
            </span>
          </div>
          <span className="text-stone-400 ml-2 shrink-0">
            {new Date(exec.executed_at).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'success' | 'error' | 'info'> = {
    success: 'success',
    failed: 'error',
    skipped: 'info',
  }
  return <Badge variant={variants[status] || 'info'}>{status}</Badge>
}
