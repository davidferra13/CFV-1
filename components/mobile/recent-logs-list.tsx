'use client'

import { DollarSign, StickyNote, ListChecks, Clock } from '@/components/ui/icons'

type LogEntry = {
  id: string
  action: string
  summary: string
  created_at: string
  metadata?: {
    type?: string
    amount_cents?: number
    vendor?: string
    description?: string
  }
}

function getTypeFromAction(action: string): 'expense' | 'note' | 'task' {
  if (action.includes('expense')) return 'expense'
  if (action.includes('task')) return 'task'
  return 'note'
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const TYPE_ICONS = {
  expense: DollarSign,
  note: StickyNote,
  task: ListChecks,
}

const TYPE_COLORS = {
  expense: 'text-green-400',
  note: 'text-blue-400',
  task: 'text-amber-400',
}

export function RecentLogsList({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-stone-600">
        <p className="text-sm">No recent logs yet.</p>
        <p className="text-xs mt-1">Your quick logs will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => {
        const type = getTypeFromAction(log.action)
        const Icon = TYPE_ICONS[type]
        const color = TYPE_COLORS[type]

        return (
          <div
            key={log.id}
            className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-800/50 transition-colors"
          >
            <div className={`mt-0.5 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-200 truncate">{log.summary}</p>
              {log.metadata?.amount_cents != null && (
                <p className="text-xs text-green-400 font-medium">
                  ${(log.metadata.amount_cents / 100).toFixed(2)}
                  {log.metadata.vendor ? ` at ${log.metadata.vendor}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-stone-600 shrink-0">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(log.created_at)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
