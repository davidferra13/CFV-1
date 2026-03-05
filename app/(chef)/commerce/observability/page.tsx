import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  acknowledgePosAlert,
  captureDailyPosMetrics,
  listPosAlerts,
  listPosMetricSnapshots,
  resolvePosAlert,
  type PosMetricSnapshotRow,
} from '@/lib/commerce/observability-actions'
import { POS_SLO_DEFINITIONS } from '@/lib/commerce/slo-definitions'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'

export const metadata: Metadata = { title: 'POS Observability - ChefFlow' }

function formatCurrency(cents: number | null | undefined) {
  const value = Number(cents ?? 0)
  return `$${(value / 100).toFixed(2)}`
}

function severityBadgeVariant(severity: string): 'default' | 'warning' | 'error' | 'success' {
  if (severity === 'critical' || severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  return 'default'
}

function statusBadgeVariant(status: string): 'default' | 'warning' | 'error' | 'success' {
  if (status === 'resolved') return 'success'
  if (status === 'acknowledged') return 'warning'
  return 'default'
}

function getSloTrackingValue(input: {
  sloId: string
  snapshots: PosMetricSnapshotRow[]
  openAlerts: number
}) {
  if (input.sloId === 'capture_success') {
    const latest = input.snapshots[0]
    if (!latest || latest.totalSalesCount <= 0) return 'No snapshot data'
    const successRate = Math.max(
      0,
      Math.min(100, ((latest.totalSalesCount - latest.voidedSalesCount) / latest.totalSalesCount) * 100)
    )
    return `${successRate.toFixed(1)}% (latest snapshot)`
  }

  if (input.sloId === 'availability') {
    if (input.snapshots.length === 0) return 'No snapshot data'
    return `${input.openAlerts} open alerts (proxy signal)`
  }

  return 'Telemetry pending'
}

export default async function PosObservabilityPage() {
  await requireChef()
  await requirePro('commerce')

  async function captureTodayMetricsAction() {
    'use server'
    await captureDailyPosMetrics()
  }

  async function captureMetricsForDateAction(formData: FormData) {
    'use server'
    const date = String(formData.get('snapshotDate') ?? '').trim()
    await captureDailyPosMetrics({ date: date || undefined })
  }

  async function acknowledgeAlertAction(formData: FormData) {
    'use server'
    const alertId = String(formData.get('alertId') ?? '').trim()
    if (!alertId) return
    await acknowledgePosAlert(alertId)
  }

  async function resolveAlertAction(formData: FormData) {
    'use server'
    const alertId = String(formData.get('alertId') ?? '').trim()
    if (!alertId) return
    await resolvePosAlert(alertId)
  }

  const [alerts, snapshots] = await Promise.all([
    listPosAlerts({ limit: 120 }),
    listPosMetricSnapshots({ limit: 30 }),
  ])

  const openAlerts = alerts.filter((alert) => alert.status === 'open')
  const acknowledgedAlerts = alerts.filter((alert) => alert.status === 'acknowledged')
  const criticalOrErrorAlerts = alerts.filter(
    (alert) => alert.severity === 'critical' || alert.severity === 'error'
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">POS Observability</h1>
          <p className="text-sm text-stone-400 mt-1">
            Live incident feed and daily register health metrics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={captureTodayMetricsAction}>
            <Button variant="ghost" size="sm">
              Capture Today
            </Button>
          </form>
          <form action={captureMetricsForDateAction} className="flex items-center gap-2">
            <Input type="date" name="snapshotDate" className="h-8 w-[165px]" />
            <Button variant="secondary" size="sm">
              Capture Date
            </Button>
          </form>
          <Link href="/commerce/reconciliation">
            <Button variant="ghost" size="sm">
              Reconciliation
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide">Open Alerts</p>
            <p className="text-3xl font-bold text-stone-100 mt-1">{openAlerts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide">Ack Alerts</p>
            <p className="text-3xl font-bold text-amber-400 mt-1">{acknowledgedAlerts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide">Error/Critical</p>
            <p className="text-3xl font-bold text-red-400 mt-1">{criticalOrErrorAlerts.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>POS SLO Contract</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {POS_SLO_DEFINITIONS.map((slo) => (
            <div
              key={slo.id}
              className="rounded-lg border border-stone-800 bg-stone-900/40 p-3 space-y-1"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-stone-100 font-medium">{slo.label}</p>
                <Badge variant="default">{slo.objective}</Badge>
              </div>
              <p className="text-xs text-stone-500">Measure: {slo.measurement}</p>
              <p className="text-xs text-stone-500">Source: {slo.source}</p>
              <p className="text-xs text-stone-400">
                Current signal:{' '}
                {getSloTrackingValue({
                  sloId: slo.id,
                  snapshots,
                  openAlerts: openAlerts.length,
                })}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-sm text-stone-500">No POS alerts recorded yet.</p>
          ) : (
            alerts.map((alert) => {
              const contextEntries = Object.entries(alert.context ?? {}).slice(0, 5)
              return (
                <div
                  key={alert.id}
                  className="rounded-lg border border-stone-800 bg-stone-900/50 p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={severityBadgeVariant(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge variant={statusBadgeVariant(alert.status)}>
                        {alert.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-stone-500">
                        {alert.source} / {alert.eventType}
                      </span>
                    </div>
                    <span className="text-xs text-stone-500">
                      {new Date(alert.lastSeenAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm text-stone-200">{alert.message}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span>Seen: {alert.occurrenceCount}</span>
                    {alert.dedupeKey ? <span>Dedupe: {alert.dedupeKey}</span> : null}
                    {contextEntries.length > 0 ? (
                      <span>
                        Context:{' '}
                        {contextEntries.map(([key, value]) => `${key}=${String(value)}`).join(', ')}
                      </span>
                    ) : null}
                  </div>

                  {(alert.status === 'open' || alert.status === 'acknowledged') && (
                    <div className="flex items-center gap-2">
                      {alert.status === 'open' && (
                        <form action={acknowledgeAlertAction}>
                          <input type="hidden" name="alertId" value={alert.id} />
                          <Button size="sm" variant="ghost">
                            Acknowledge
                          </Button>
                        </form>
                      )}
                      <form action={resolveAlertAction}>
                        <input type="hidden" name="alertId" value={alert.id} />
                        <Button size="sm" variant="secondary">
                          Resolve
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-sm text-stone-500">No metric snapshots captured yet.</p>
          ) : (
            <div className="space-y-2">
              {snapshots.map((snapshot: PosMetricSnapshotRow) => (
                <div
                  key={snapshot.id}
                  className="grid grid-cols-2 md:grid-cols-6 gap-2 rounded-lg border border-stone-800 bg-stone-900/40 p-3 text-xs"
                >
                  <div>
                    <p className="text-stone-500">Date</p>
                    <p className="text-stone-200 font-medium">{snapshot.snapshotDate}</p>
                  </div>
                  <div>
                    <p className="text-stone-500">Sales</p>
                    <p className="text-stone-200 font-medium">{snapshot.totalSalesCount}</p>
                  </div>
                  <div>
                    <p className="text-stone-500">Gross</p>
                    <p className="text-stone-200 font-medium">
                      {formatCurrency(snapshot.grossRevenueCents)}
                    </p>
                  </div>
                  <div>
                    <p className="text-stone-500">Net</p>
                    <p className="text-stone-200 font-medium">
                      {formatCurrency(snapshot.netRevenueCents)}
                    </p>
                  </div>
                  <div>
                    <p className="text-stone-500">Refunds</p>
                    <p className="text-stone-200 font-medium">
                      {formatCurrency(snapshot.refundsCents)}
                    </p>
                  </div>
                  <div>
                    <p className="text-stone-500">Open Alerts</p>
                    <p className="text-stone-200 font-medium">{snapshot.openAlertCount}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
