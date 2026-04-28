'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getPantrySummary, type PantrySummary } from '@/lib/inventory/pantry-actions'

export function PantryAlertsWidget() {
  const [summary, setSummary] = useState<PantrySummary | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPantrySummary()
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(true)
        console.error('[pantry-alerts-widget] load error:', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loadError) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-2">Pantry</h3>
        <p className="text-sm text-red-600">Could not load pantry data</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="rounded-lg border p-4 animate-pulse">
        <h3 className="font-semibold mb-2">Pantry</h3>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    )
  }

  if (summary.totalLocations === 0) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-2">Pantry</h3>
        <p className="text-sm text-gray-500">No pantry locations set up yet.</p>
        <Link
          href="/inventory/locations"
          className="text-sm text-brand-600 hover:underline mt-1 inline-block"
        >
          Set up pantry tracking
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Pantry</h3>
        <Link href="/inventory/locations" className="text-sm text-brand-600 hover:underline">
          View all
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Locations</p>
          <p className="font-medium">{summary.totalLocations}</p>
        </div>
        <div>
          <p className="text-gray-500">Total Items</p>
          <p className="font-medium">{summary.totalItems}</p>
        </div>
        <div>
          <p className="text-gray-500">Low Stock</p>
          <p className="font-medium flex items-center gap-1">
            {summary.lowStockCount}
            {summary.lowStockCount > 0 && (
              <Badge variant="warning" className="text-xs">
                Alert
              </Badge>
            )}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Expiring (7d)</p>
          <p className="font-medium flex items-center gap-1">
            {summary.expiringCount}
            {summary.expiringCount > 0 && (
              <Badge variant="error" className="text-xs">
                Alert
              </Badge>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
