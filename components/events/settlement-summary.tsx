'use client'

// Settlement Summary - Shows revenue split breakdown for multi-chef events.
// Displays each collaborator's share based on role and custom percentages.

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { getEventSettlement } from '@/lib/collaboration/settlement-actions'
import type { EventSettlement } from '@/lib/collaboration/settlement-actions'

interface SettlementSummaryProps {
  eventId: string
  className?: string
}

export function SettlementSummary({ eventId, className = '' }: SettlementSummaryProps) {
  const [isPending, startTransition] = useTransition()
  const [settlement, setSettlement] = useState<EventSettlement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getEventSettlement(eventId)
        setSettlement(data)
      } catch (err) {
        console.error('[SettlementSummary] Load failed:', err)
        setError('Could not load settlement data')
      }
    })
  }, [eventId])

  if (error) {
    return (
      <div className={`rounded-lg border border-red-500/30 bg-red-500/10 p-3 ${className}`}>
        <p className="text-xs text-red-300">{error}</p>
      </div>
    )
  }

  if (isPending && !settlement) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-stone-700 rounded w-1/3" />
          <div className="h-6 bg-stone-700 rounded" />
        </div>
      </div>
    )
  }

  if (!settlement) return null

  const formatDollars = (cents: number) =>
    `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div
      className={`rounded-lg border border-stone-700 bg-stone-800/50 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-700">
        <h3 className="text-sm font-medium text-stone-200">Revenue Split</h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Total: {formatDollars(settlement.totalRevenueCents)}
        </p>
      </div>

      {/* Split table */}
      <div className="divide-y divide-stone-700/50">
        {/* Host chef */}
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-stone-200">You (Host)</span>
            <Badge variant="info">Host</Badge>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-emerald-400">
              {formatDollars(settlement.hostChefSplitCents)}
            </span>
            <span className="text-xxs text-stone-500 ml-1.5">
              {settlement.hostChefSplitPercent}%
            </span>
          </div>
        </div>

        {/* Collaborators */}
        {settlement.collaborators.map((collab) => (
          <div
            key={collab.collaboratorId}
            className="px-4 py-2.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-300">{collab.chefName}</span>
              <Badge variant="default">{collab.role.replace(/_/g, ' ')}</Badge>
              {collab.station && <span className="text-xxs text-stone-600">{collab.station}</span>}
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-stone-200">
                {formatDollars(collab.splitAmountCents)}
              </span>
              <span className="text-xxs text-stone-500 ml-1.5">{collab.splitPercent}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Visual split bar */}
      <div className="px-4 py-2 border-t border-stone-700">
        <div className="flex h-2 rounded overflow-hidden">
          <div
            className="bg-emerald-500"
            style={{ width: `${settlement.hostChefSplitPercent}%` }}
            title={`Host: ${settlement.hostChefSplitPercent}%`}
          />
          {settlement.collaborators.map((c, i) => {
            const colors = [
              'bg-brand-500',
              'bg-purple-500',
              'bg-amber-500',
              'bg-rose-500',
              'bg-brand-500',
            ]
            return (
              <div
                key={c.collaboratorId}
                className={colors[i % colors.length]}
                style={{ width: `${c.splitPercent}%` }}
                title={`${c.chefName}: ${c.splitPercent}%`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
