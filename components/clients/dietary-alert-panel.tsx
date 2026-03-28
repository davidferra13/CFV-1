'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getDietaryAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
} from '@/lib/clients/dietary-alert-actions'
import type { DietaryAlert } from '@/lib/clients/dietary-alert-actions'
import { AlertTriangle, Check, CheckCheck, Filter } from 'lucide-react'
import { toast } from 'sonner'

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info'

type Props = {
  initialAlerts: DietaryAlert[]
}

const severityConfig = {
  critical: { badge: 'error' as const, label: 'Critical', color: 'text-red-600' },
  warning: { badge: 'warning' as const, label: 'Warning', color: 'text-amber-600' },
  info: { badge: 'info' as const, label: 'Info', color: 'text-brand-600' },
} as const

function changeTypeLabel(changeType: string): string {
  const labels: Record<string, string> = {
    allergy_added: 'Allergy added',
    allergy_removed: 'Allergy removed',
    restriction_added: 'Restriction added',
    restriction_removed: 'Restriction removed',
    preference_updated: 'Preference updated',
    note_updated: 'Note updated',
  }
  return labels[changeType] || changeType
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function DietaryAlertPanel({ initialAlerts }: Props) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [filter, setFilter] = useState<SeverityFilter>('all')
  const [isPending, startTransition] = useTransition()

  const filtered = alerts.filter((a) => {
    if (filter === 'all') return true
    return a.severity === filter
  })

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length

  function handleAcknowledge(alertId: string) {
    const previous = [...alerts]
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)))
    startTransition(async () => {
      try {
        await acknowledgeAlert(alertId)
      } catch {
        setAlerts(previous)
        toast.error('Failed to acknowledge alert')
      }
    })
  }

  function handleAcknowledgeAll() {
    const previous = [...alerts]
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })))
    startTransition(async () => {
      try {
        await acknowledgeAllAlerts()
      } catch {
        setAlerts(previous)
        toast.error('Failed to acknowledge alerts')
      }
    })
  }

  async function handleRefresh() {
    startTransition(async () => {
      try {
        const fresh = await getDietaryAlerts()
        setAlerts(fresh)
      } catch {
        // keep current state on failure
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">Dietary Alerts</h3>
          {unacknowledgedCount > 0 && <Badge variant="error">{unacknowledgedCount} new</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {unacknowledgedCount > 0 && (
            <Button variant="ghost" onClick={handleAcknowledgeAll} loading={isPending}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Acknowledge all
            </Button>
          )}
          <Button variant="ghost" onClick={handleRefresh} loading={isPending}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-stone-400" />
        {(['all', 'critical', 'warning', 'info'] as SeverityFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              filter === f
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
            ].join(' ')}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No dietary alerts</p>
          <p className="text-xs mt-1">
            Alerts appear when clients update their dietary information
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => {
            const config =
              severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info
            return (
              <div
                key={alert.id}
                className={[
                  'flex items-start justify-between p-3 rounded-lg border',
                  alert.acknowledged
                    ? 'bg-stone-50 border-stone-100 opacity-60'
                    : 'bg-white border-stone-200',
                ].join(' ')}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={config.badge}>{config.label}</Badge>
                    <span className="font-medium text-sm truncate">{alert.client_name}</span>
                    <span className="text-xs text-stone-400">{timeAgo(alert.created_at)}</span>
                  </div>
                  <p className="text-sm text-stone-700">
                    {changeTypeLabel(alert.change_type)}:{' '}
                    <span className="font-medium">{alert.field_name}</span>
                  </p>
                  {(alert.old_value || alert.new_value) && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      {alert.old_value && (
                        <span className="line-through mr-2">{alert.old_value}</span>
                      )}
                      {alert.new_value && <span className={config.color}>{alert.new_value}</span>}
                    </p>
                  )}
                </div>
                {!alert.acknowledged && (
                  <Button
                    variant="ghost"
                    onClick={() => handleAcknowledge(alert.id)}
                    disabled={isPending}
                    className="ml-2 shrink-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
