// Location Detail Client Component
// Interactive tabs for metrics history, forecasts, compliance, and alerts.

'use client'

import { useState } from 'react'
import type { BusinessLocation } from '@/lib/locations/actions'
import type { DailyMetrics } from '@/lib/locations/metrics-actions'
import type { DemandForecast } from '@/lib/locations/forecast-actions'
import type { ComplianceCheck } from '@/lib/locations/compliance-actions'
import type { LocationAlert } from '@/lib/locations/alert-actions'
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Tab = 'metrics' | 'forecasts' | 'compliance' | 'alerts'

export function LocationDetailClient({
  location,
  metrics,
  forecasts,
  complianceChecks,
  alertHistory,
}: {
  location: BusinessLocation
  metrics: DailyMetrics[]
  forecasts: DemandForecast[]
  complianceChecks: ComplianceCheck[]
  alertHistory: LocationAlert[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>('metrics')

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'metrics', label: 'Daily Metrics', count: metrics.length },
    { id: 'forecasts', label: 'Forecasts', count: forecasts.length },
    { id: 'compliance', label: 'Compliance', count: complianceChecks.length },
    { id: 'alerts', label: 'Alert History', count: alertHistory.length },
  ]

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-stone-700 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-stone-800 text-stone-100 border-b-2 border-amber-500'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 text-xs text-stone-500">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'metrics' && <MetricsTab metrics={metrics} location={location} />}
      {activeTab === 'forecasts' && <ForecastsTab forecasts={forecasts} />}
      {activeTab === 'compliance' && <ComplianceTab checks={complianceChecks} />}
      {activeTab === 'alerts' && <AlertsTab alerts={alertHistory} />}
    </div>
  )
}

function MetricsTab({
  metrics,
  location,
}: {
  metrics: DailyMetrics[]
  location: BusinessLocation
}) {
  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-stone-400">No daily metrics recorded yet.</p>
          <p className="text-sm text-stone-500 mt-1">
            Metrics are recorded daily from sales, labor, and inventory data.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="text-left p-3 text-stone-400 font-medium">Date</th>
                <th className="text-right p-3 text-stone-400 font-medium">Covers</th>
                <th className="text-right p-3 text-stone-400 font-medium">Revenue</th>
                <th className="text-right p-3 text-stone-400 font-medium">Food %</th>
                <th className="text-right p-3 text-stone-400 font-medium">Labor %</th>
                <th className="text-right p-3 text-stone-400 font-medium">Prime %</th>
                <th className="text-right p-3 text-stone-400 font-medium">Orders</th>
                <th className="text-right p-3 text-stone-400 font-medium">Avg Ticket</th>
                <th className="text-right p-3 text-stone-400 font-medium">Waste</th>
              </tr>
            </thead>
            <tbody>
              {metrics.slice(0, 30).map((m) => {
                const coverTarget = location.dailyCoverTarget
                const coverPct = coverTarget ? (m.coversServed / coverTarget) * 100 : null

                return (
                  <tr key={m.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                    <td className="p-3 text-stone-200 font-medium">{m.date}</td>
                    <td className="p-3 text-right">
                      <span className="text-stone-300">{m.coversServed}</span>
                      {coverPct !== null && (
                        <span
                          className={`ml-1 text-xs ${coverPct >= 90 ? 'text-emerald-400' : coverPct >= 70 ? 'text-amber-400' : 'text-red-400'}`}
                        >
                          ({coverPct.toFixed(0)}%)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-stone-300">
                      {formatCurrency(m.revenueCents)}
                    </td>
                    <td
                      className={`p-3 text-right ${(m.foodCostPct ?? 0) > 35 ? 'text-red-400' : (m.foodCostPct ?? 0) > 30 ? 'text-amber-400' : 'text-emerald-400'}`}
                    >
                      {m.foodCostPct?.toFixed(1) ?? '-'}%
                    </td>
                    <td
                      className={`p-3 text-right ${(m.laborCostPct ?? 0) > 35 ? 'text-red-400' : (m.laborCostPct ?? 0) > 30 ? 'text-amber-400' : 'text-emerald-400'}`}
                    >
                      {m.laborCostPct?.toFixed(1) ?? '-'}%
                    </td>
                    <td
                      className={`p-3 text-right ${(m.primeCostPct ?? 0) > 65 ? 'text-red-400' : (m.primeCostPct ?? 0) > 60 ? 'text-amber-400' : 'text-emerald-400'}`}
                    >
                      {m.primeCostPct?.toFixed(1) ?? '-'}%
                    </td>
                    <td className="p-3 text-right text-stone-300">{m.ordersCount}</td>
                    <td className="p-3 text-right text-stone-300">
                      {formatCurrency(m.avgTicketCents)}
                    </td>
                    <td className="p-3 text-right text-stone-300">
                      {formatCurrency(m.wasteCents)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function ForecastsTab({ forecasts }: { forecasts: DemandForecast[] }) {
  if (forecasts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-stone-400">No forecasts generated yet.</p>
          <p className="text-sm text-stone-500 mt-1">
            Forecasts require at least 2 weeks of daily metrics data.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="text-left p-3 text-stone-400 font-medium">Date</th>
                <th className="text-right p-3 text-stone-400 font-medium">Predicted Covers</th>
                <th className="text-right p-3 text-stone-400 font-medium">Predicted Revenue</th>
                <th className="text-right p-3 text-stone-400 font-medium">Predicted Orders</th>
                <th className="text-right p-3 text-stone-400 font-medium">Confidence</th>
                <th className="text-right p-3 text-stone-400 font-medium">Actual Covers</th>
                <th className="text-right p-3 text-stone-400 font-medium">Variance</th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((f) => (
                <tr key={f.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                  <td className="p-3 text-stone-200 font-medium">{f.forecastDate}</td>
                  <td className="p-3 text-right text-stone-300">{f.predictedCovers ?? '-'}</td>
                  <td className="p-3 text-right text-stone-300">
                    {f.predictedRevenueCents ? formatCurrency(f.predictedRevenueCents) : '-'}
                  </td>
                  <td className="p-3 text-right text-stone-300">{f.predictedOrders ?? '-'}</td>
                  <td className="p-3 text-right">
                    {f.confidenceScore !== null ? (
                      <Badge
                        variant={
                          f.confidenceScore >= 0.7
                            ? 'success'
                            : f.confidenceScore >= 0.4
                              ? 'warning'
                              : 'error'
                        }
                      >
                        {(f.confidenceScore * 100).toFixed(0)}%
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3 text-right text-stone-300">
                    {f.actualCovers ?? <span className="text-stone-600">pending</span>}
                  </td>
                  <td className="p-3 text-right">
                    {f.variancePct !== null ? (
                      <span
                        className={
                          f.variancePct > 10
                            ? 'text-red-400'
                            : f.variancePct < -10
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                        }
                      >
                        {f.variancePct > 0 ? '+' : ''}
                        {f.variancePct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-stone-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function ComplianceTab({ checks }: { checks: ComplianceCheck[] }) {
  if (checks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-stone-400">No compliance checks recorded yet.</p>
          <p className="text-sm text-stone-500 mt-1">
            Record recipe compliance checks to track standardization across locations.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="text-left p-3 text-stone-400 font-medium">Date</th>
                <th className="text-left p-3 text-stone-400 font-medium">Recipe</th>
                <th className="text-center p-3 text-stone-400 font-medium">Portion</th>
                <th className="text-center p-3 text-stone-400 font-medium">Method</th>
                <th className="text-center p-3 text-stone-400 font-medium">Ingredients</th>
                <th className="text-center p-3 text-stone-400 font-medium">Presentation</th>
                <th className="text-right p-3 text-stone-400 font-medium">Score</th>
                <th className="text-right p-3 text-stone-400 font-medium">Deviations</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                  <td className="p-3 text-stone-200">{c.checkDate}</td>
                  <td className="p-3 text-stone-300">{c.recipeId.slice(0, 8)}...</td>
                  <td className="p-3 text-center">
                    <ComplianceBadge compliant={c.portionCompliant} />
                  </td>
                  <td className="p-3 text-center">
                    <ComplianceBadge compliant={c.methodCompliant} />
                  </td>
                  <td className="p-3 text-center">
                    <ComplianceBadge compliant={c.ingredientCompliant} />
                  </td>
                  <td className="p-3 text-center">
                    <ComplianceBadge compliant={c.presentationCompliant} />
                  </td>
                  <td className="p-3 text-right">
                    {c.overallScore !== null ? (
                      <span
                        className={
                          c.overallScore >= 90
                            ? 'text-emerald-400'
                            : c.overallScore >= 70
                              ? 'text-amber-400'
                              : 'text-red-400'
                        }
                      >
                        {c.overallScore.toFixed(0)}%
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3 text-right text-stone-400">
                    {c.deviations.length > 0 ? (
                      <Badge variant="warning">{c.deviations.length}</Badge>
                    ) : (
                      <span className="text-emerald-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function ComplianceBadge({ compliant }: { compliant: boolean }) {
  return compliant ? (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-900/50 text-emerald-400 text-xs">
      &#10003;
    </span>
  ) : (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-900/50 text-red-400 text-xs">
      &#10007;
    </span>
  )
}

function AlertsTab({ alerts }: { alerts: LocationAlert[] }) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-stone-400">No alert history.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Card key={alert.id}>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  alert.severity === 'critical'
                    ? 'error'
                    : alert.severity === 'high'
                      ? 'warning'
                      : 'default'
                }
              >
                {alert.severity}
              </Badge>
              <div>
                <p className="text-sm text-stone-200">{alert.title}</p>
                {alert.description && <p className="text-xs text-stone-500">{alert.description}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500">
                {new Date(alert.createdAt).toLocaleDateString()}
              </p>
              {alert.resolvedAt ? (
                <Badge variant="success">Resolved</Badge>
              ) : alert.acknowledgedAt ? (
                <Badge variant="info">Acknowledged</Badge>
              ) : (
                <Badge variant="warning">Active</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
