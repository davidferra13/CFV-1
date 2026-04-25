// Individual Location Detail Page
// Performance metrics, alerts, staff, inventory, forecasts, and compliance for one location.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getLocation, getLocationFinancials } from '@/lib/locations/actions'
import { getLocationMetrics } from '@/lib/locations/metrics-actions'
import { getActiveAlerts, getAlertHistory } from '@/lib/locations/alert-actions'
import { getForecasts } from '@/lib/locations/forecast-actions'
import { getComplianceChecks } from '@/lib/locations/compliance-actions'
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { LocationDetailClient } from './location-detail-client'

export const metadata: Metadata = { title: 'Location Detail' }

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireChef()
  const { id } = await params
  const location = await getLocation(id)

  if (!location) notFound()

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const startDate = thirtyDaysAgo.toISOString().split('T')[0]

  const sevenDaysOut = new Date()
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
  const forecastEnd = sevenDaysOut.toISOString().split('T')[0]

  const [metrics, activeAlerts, alertHistory, forecasts, complianceChecks, allFinancials] =
    await Promise.all([
      getLocationMetrics(id, startDate, today),
      getActiveAlerts(id),
      getAlertHistory(id, 20),
      getForecasts(id, today, forecastEnd),
      getComplianceChecks(id, undefined, 20),
      getLocationFinancials(),
    ])

  const locationFinancials = allFinancials.find((f) => f.locationId === id)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/locations" className="text-stone-500 hover:text-stone-300 text-sm">
              Locations
            </Link>
            <span className="text-stone-600">/</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 mt-1">{location.name}</h1>
          <p className="text-sm text-stone-500">
            {location.locationType}
            {location.address && ` \u00b7 ${location.address}`}
            {location.city && `, ${location.city}, ${location.state}`}
          </p>
        </div>
        <div className="flex gap-2">
          {location.managerName && <Badge variant="default">Mgr: {location.managerName}</Badge>}
          {location.capacityCovers && (
            <Badge variant="info">Capacity: {location.capacityCovers} covers</Badge>
          )}
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-3 flex items-center justify-between ${
                alert.severity === 'critical'
                  ? 'bg-red-900/30 border-red-700/50'
                  : alert.severity === 'high'
                    ? 'bg-amber-900/30 border-amber-700/50'
                    : 'bg-stone-800/50 border-stone-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
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
                <span className="text-sm text-stone-200">{alert.title}</span>
              </div>
              <span className="text-xs text-stone-500">
                {new Date(alert.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Financial Summary */}
      {locationFinancials && (
        <div>
          <h2 className="text-lg font-semibold text-stone-200 mb-3">Financial Summary (30 days)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-stone-500 uppercase">Net Revenue</p>
                <p className="mt-1 text-xl font-bold text-stone-100">
                  {formatCurrency(locationFinancials.netRevenueCents)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-stone-500 uppercase">Expenses</p>
                <p className="mt-1 text-xl font-bold text-stone-100">
                  {formatCurrency(locationFinancials.totalExpensesCents)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-stone-500 uppercase">Profit</p>
                <p
                  className={`mt-1 text-xl font-bold ${locationFinancials.profitCents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {formatCurrency(locationFinancials.profitCents)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-stone-500 uppercase">Labor (30d)</p>
                <p className="mt-1 text-xl font-bold text-stone-100">
                  {formatCurrency(locationFinancials.laborCost30dCents)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Pass data to client component for interactive sections */}
      <LocationDetailClient
        location={location}
        metrics={metrics}
        forecasts={forecasts}
        complianceChecks={complianceChecks}
        alertHistory={alertHistory}
      />
    </div>
  )
}
