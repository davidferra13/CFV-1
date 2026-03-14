'use client'

// ParAlertPanel — Below-par inventory alerts grouped by vendor.
// Shows items that need reordering with deficit amounts.

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Package, ShoppingCart, Store } from 'lucide-react'

type ParAlert = {
  ingredientName: string
  currentQty: number
  parLevel: number
  unit: string
  vendorName?: string
}

function groupByVendor(alerts: ParAlert[]): Record<string, ParAlert[]> {
  const groups: Record<string, ParAlert[]> = {}
  for (const alert of alerts) {
    const key = alert.vendorName || 'Unassigned'
    if (!groups[key]) groups[key] = []
    groups[key].push(alert)
  }
  // Sort: named vendors first, then unassigned
  const sorted: Record<string, ParAlert[]> = {}
  const keys = Object.keys(groups).sort((a, b) => {
    if (a === 'Unassigned') return 1
    if (b === 'Unassigned') return -1
    return a.localeCompare(b)
  })
  for (const key of keys) {
    sorted[key] = groups[key]
  }
  return sorted
}

export function ParAlertPanel({ alerts }: { alerts: ParAlert[] }) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">All inventory items are at or above par level.</p>
        </CardContent>
      </Card>
    )
  }

  const grouped = groupByVendor(alerts)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Below-Par Alerts
          </CardTitle>
          <Badge variant="error">
            {alerts.length} item{alerts.length !== 1 ? 's' : ''} low
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {Object.entries(grouped).map(([vendorName, vendorAlerts]) => (
          <div key={vendorName}>
            {/* Vendor group header */}
            <div className="px-6 py-2 bg-stone-800 border-y border-stone-800 flex items-center gap-2">
              <Store className="h-4 w-4 text-stone-400" />
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                {vendorName}
              </span>
              <Badge variant="default">{vendorAlerts.length}</Badge>
            </div>

            {/* Vendor items */}
            <div className="divide-y divide-stone-800">
              {vendorAlerts.map((alert, idx) => {
                const deficit = alert.parLevel - alert.currentQty

                return (
                  <div
                    key={`${alert.ingredientName}-${idx}`}
                    className="px-6 py-3 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-100 truncate">
                        {alert.ingredientName}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-500">
                        <span>
                          On hand:{' '}
                          <span className="font-medium text-red-600">
                            {alert.currentQty} {alert.unit}
                          </span>
                        </span>
                        <span>
                          Par: {alert.parLevel} {alert.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">
                          -{deficit.toFixed(1)} {alert.unit}
                        </p>
                        <p className="text-xs text-stone-400">deficit</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-stone-500 bg-stone-800 px-2 py-1 rounded-md">
                        <ShoppingCart className="h-3 w-3" />
                        <span>Reorder</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
