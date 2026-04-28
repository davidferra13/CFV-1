'use client'

import { useEffect, useState } from 'react'
import { getInsuranceStats, type InsuranceStats } from '@/lib/compliance/insurance-actions'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function InsuranceAlertsWidget() {
  const [stats, setStats] = useState<InsuranceStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    getInsuranceStats()
      .then(setStats)
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium text-gray-500">Insurance</h3>
        <p className="mt-1 text-sm text-red-600">Could not load insurance data</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium text-gray-500">Insurance</h3>
        <p className="mt-1 text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  const hasExpiring = stats.expiringSoonCount > 0

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium text-gray-500">Insurance</h3>
      <div className="mt-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Active Policies</span>
          <span className="text-sm font-semibold">{stats.activeCount}</span>
        </div>

        {hasExpiring && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-600 font-medium">Expiring Soon</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {stats.expiringSoonCount}
            </span>
          </div>
        )}

        {stats.nextExpiryDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Next Expiry</span>
            <span
              className={`text-sm ${hasExpiring ? 'text-amber-600 font-medium' : 'text-gray-700'}`}
            >
              {formatDate(stats.nextExpiryDate)}
            </span>
          </div>
        )}

        <a
          href="/settings/protection/insurance"
          className="mt-2 block text-center text-xs text-brand-600 hover:underline"
        >
          View all policies
        </a>
      </div>
    </div>
  )
}
