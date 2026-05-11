// Dashboard Automation Activity Feed
// Compact widget showing recent automation executions.

import { getAutomationExecutions } from '@/lib/automations/actions'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'
import type { AutomationExecution } from '@/lib/automations/types'

function formatLabel(raw: string): string {
  const s = raw.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const STATUS_DOT: Record<AutomationExecution['status'], string> = {
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-stone-500',
}

export async function AutomationFeedCard() {
  let executions: AutomationExecution[]
  try {
    executions = await getAutomationExecutions({ limit: 8 })
  } catch {
    return null
  }

  if (!executions.length) return null

  return (
    <WidgetCardShell
      widgetId="automation_feed"
      title="Automation Activity"
      size="sm"
      href="/settings/automations"
    >
      <div className="space-y-1.5">
        {executions.map((ex) => (
          <div
            key={ex.id}
            className="flex items-start gap-2 py-1 border-b border-stone-800 last:border-0"
          >
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[ex.status]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-stone-300 truncate">
                  {formatLabel(ex.trigger_event)}
                </span>
                <span className="text-xxs text-stone-500 shrink-0">
                  {relativeTime(ex.executed_at)}
                </span>
              </div>
              <span className="text-xxs text-stone-500 truncate block">
                {formatLabel(ex.action_type)}
              </span>
              {ex.status === 'failed' && ex.error && (
                <span className="text-xxs text-red-400 truncate block">
                  {ex.error.length > 60 ? ex.error.slice(0, 60) + '...' : ex.error}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </WidgetCardShell>
  )
}
