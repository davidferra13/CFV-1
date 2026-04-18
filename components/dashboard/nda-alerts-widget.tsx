'use client'

import { useState, useEffect, useTransition } from 'react'
import { Lock, AlertTriangle, ArrowRight } from '@/components/ui/icons'
import Link from 'next/link'
import type { NdaDashboardSummary } from '@/lib/clients/nda-management-actions'
import { getNdaDashboard } from '@/lib/clients/nda-management-actions'

export function NdaAlertsWidget() {
  const [data, setData] = useState<NdaDashboardSummary | null>(null)
  const [error, setError] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const result = await getNdaDashboard()
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(true)
        console.error('[NdaAlertsWidget] Failed to load:', err)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
        <p className="text-xs text-red-400">Could not load NDA data</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 animate-pulse">
        <div className="h-4 w-24 rounded bg-stone-700" />
      </div>
    )
  }

  const { counts } = data

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-stone-400" />
          <h3 className="text-sm font-semibold text-stone-200">NDA Status</h3>
        </div>
        <Link
          href="/clients"
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200"
        >
          Manage
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-stone-800 p-2">
          <p className="text-lg font-bold text-emerald-400">{counts.signed}</p>
          <p className="text-xxs text-stone-500">Active</p>
        </div>
        <div className="rounded bg-stone-800 p-2">
          <p className="text-lg font-bold text-stone-300">{counts.total}</p>
          <p className="text-xxs text-stone-500">Total</p>
        </div>
        <div className="rounded bg-stone-800 p-2">
          <p
            className={`text-lg font-bold ${counts.expiringSoon > 0 ? 'text-amber-400' : 'text-stone-500'}`}
          >
            {counts.expiringSoon}
          </p>
          <p className="text-xxs text-stone-500">Expiring</p>
        </div>
      </div>

      {/* Expiring soon alert */}
      {counts.expiringSoon > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded border border-amber-800/50 bg-amber-900/20 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            {counts.expiringSoon} NDA{counts.expiringSoon !== 1 ? 's' : ''} expiring within 30 days
          </p>
        </div>
      )}

      {/* Expired alert */}
      {counts.expired > 0 && (
        <div className="mt-2 flex items-center gap-2 rounded border border-red-800/50 bg-red-900/20 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">
            {counts.expired} NDA{counts.expired !== 1 ? 's' : ''} expired and need renewal
          </p>
        </div>
      )}
    </div>
  )
}
