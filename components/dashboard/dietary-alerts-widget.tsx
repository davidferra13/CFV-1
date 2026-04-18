'use client'

import { useState, useEffect, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { getDietaryAlerts, getAlertStats } from '@/lib/clients/dietary-alert-actions'
import type { DietaryAlert, AlertStats } from '@/lib/clients/dietary-alert-actions'
import { AlertTriangle } from '@/components/ui/icons'

const severityBadge = {
  critical: 'error' as const,
  warning: 'warning' as const,
  info: 'info' as const,
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function DietaryAlertsWidget() {
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [criticalAlerts, setCriticalAlerts] = useState<DietaryAlert[]>([])
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const [alertStats, alerts] = await Promise.all([getAlertStats(), getDietaryAlerts(true)])
        setStats(alertStats)
        // Show latest 3 critical alerts
        setCriticalAlerts(alerts.filter((a) => a.severity === 'critical').slice(0, 3))
      } catch {
        setError(true)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="p-4 rounded-lg border border-stone-200 bg-white">
        <p className="text-sm text-stone-400">Could not load dietary alerts</p>
      </div>
    )
  }

  if (!stats && isPending) {
    return (
      <div className="p-4 rounded-lg border border-stone-200 bg-white">
        <p className="text-sm text-stone-400">Loading alerts...</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="p-4 rounded-lg border border-stone-200 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h4 className="font-medium text-sm">Dietary Alerts</h4>
        </div>
        {stats.unacknowledged > 0 && <Badge variant="error">{stats.unacknowledged}</Badge>}
      </div>

      {stats.unacknowledged === 0 ? (
        <p className="text-xs text-stone-400">No new dietary alerts</p>
      ) : (
        <>
          {/* Summary counts */}
          <div className="flex gap-3 mb-3 text-xs text-stone-500">
            {stats.critical > 0 && <span className="text-red-600">{stats.critical} critical</span>}
            {stats.warning > 0 && <span className="text-amber-600">{stats.warning} warning</span>}
            {stats.info > 0 && <span className="text-brand-600">{stats.info} info</span>}
          </div>

          {/* Latest critical alerts */}
          {criticalAlerts.length > 0 && (
            <div className="space-y-1.5">
              {criticalAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center gap-2 text-xs">
                  <Badge
                    variant={
                      severityBadge[alert.severity as keyof typeof severityBadge] || 'default'
                    }
                  >
                    {alert.severity}
                  </Badge>
                  <span className="truncate flex-1 text-stone-700">
                    {alert.client_name}: {alert.field_name}
                  </span>
                  <span className="text-stone-400 shrink-0">{timeAgo(alert.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
