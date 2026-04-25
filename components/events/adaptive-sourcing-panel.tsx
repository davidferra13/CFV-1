'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getAdaptiveSourcingStatus,
  logSourcingEvent,
  proposeSubstitution,
  updatePriceFlexibility,
} from '@/lib/dinner-circles/sourcing-actions'
import type {
  DinnerCircleAvailabilityItem,
  DinnerCircleIngredientStatus,
  DinnerCircleSourcingEvent,
  DinnerCircleSubstitutionProposal,
} from '@/lib/dinner-circles/types'

type AdaptiveSourcingPanelProps = {
  eventId: string
}

const STATUS_STYLES: Record<DinnerCircleIngredientStatus, string> = {
  confirmed: 'bg-green-100 text-green-800',
  flexible: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  substitution_pending: 'bg-orange-100 text-orange-800',
  unavailable: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<DinnerCircleIngredientStatus, string> = {
  confirmed: 'Confirmed',
  flexible: 'Flexible',
  pending: 'Pending',
  substitution_pending: 'Sub Pending',
  unavailable: 'Unavailable',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function AdaptiveSourcingPanel({ eventId }: AdaptiveSourcingPanelProps) {
  const [items, setItems] = useState<DinnerCircleAvailabilityItem[]>([])
  const [log, setLog] = useState<DinnerCircleSourcingEvent[]>([])
  const [proposals, setProposals] = useState<DinnerCircleSubstitutionProposal[]>([])
  const [flexibility, setFlexibility] = useState(15)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Substitution inline form state
  const [subFormIdx, setSubFormIdx] = useState<number | null>(null)
  const [subValue, setSubValue] = useState('')
  const [subReason, setSubReason] = useState('')

  useEffect(() => {
    let cancelled = false
    getAdaptiveSourcingStatus(eventId)
      .then((data) => {
        if (cancelled) return
        setItems(data.availabilityItems)
        setLog(data.sourcingLog)
        setProposals(data.substitutionProposals)
        setFlexibility(data.priceFlexibilityPercent)
      })
      .catch((err) => console.error('[sourcing] Failed to load status', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  function handleStatusChange(
    item: DinnerCircleAvailabilityItem,
    newStatus: DinnerCircleIngredientStatus
  ) {
    if (newStatus === item.status) return
    const reason = window.prompt('Reason for change:')
    if (!reason) return

    startTransition(async () => {
      try {
        await logSourcingEvent(eventId, {
          ingredient: item.ingredient,
          newStatus,
          reason,
          sourceName: item.sourceName,
        })
        // Refresh data
        const data = await getAdaptiveSourcingStatus(eventId)
        setItems(data.availabilityItems)
        setLog(data.sourcingLog)
        setProposals(data.substitutionProposals)
      } catch (err) {
        console.error('[sourcing] Failed to log event', err)
      }
    })

    // Show sub form when set to unavailable
    if (newStatus === 'unavailable') {
      const idx = items.findIndex(
        (i) => i.ingredient.toLowerCase() === item.ingredient.toLowerCase()
      )
      setSubFormIdx(idx >= 0 ? idx : null)
    }
  }

  function handleProposeSub(originalIngredient: string) {
    if (!subValue.trim()) return
    startTransition(async () => {
      try {
        await proposeSubstitution(eventId, {
          originalIngredient,
          proposedSubstitute: subValue.trim(),
          reason: subReason.trim() || 'Unavailable, proposing substitute',
        })
        setSubFormIdx(null)
        setSubValue('')
        setSubReason('')
        const data = await getAdaptiveSourcingStatus(eventId)
        setItems(data.availabilityItems)
        setLog(data.sourcingLog)
        setProposals(data.substitutionProposals)
      } catch (err) {
        console.error('[sourcing] Failed to propose substitution', err)
      }
    })
  }

  function handleFlexibilityChange(val: number) {
    setFlexibility(val)
    startTransition(async () => {
      try {
        await updatePriceFlexibility(eventId, val)
      } catch (err) {
        console.error('[sourcing] Failed to update flexibility', err)
      }
    })
  }

  if (loading) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Ingredient Sourcing</h2>
        <p className="text-sm text-stone-400">Loading sourcing data...</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Ingredient Sourcing</h2>

      {items.length === 0 ? (
        <p className="text-sm text-stone-400">
          No ingredients tracked yet. Attach a menu with recipes to populate.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Ingredient table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-left text-stone-400">
                  <th className="pb-2 pr-4">Ingredient</th>
                  <th className="pb-2 pr-4">Source</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.ingredient} className="border-b border-stone-800">
                    <td className="py-2 pr-4 text-stone-100">{item.ingredient}</td>
                    <td className="py-2 pr-4 text-stone-400">{item.sourceName || '-'}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[item.status]}`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="py-2">
                      <select
                        className="bg-stone-800 text-stone-200 text-xs rounded px-2 py-1 border border-stone-600"
                        value={item.status}
                        disabled={isPending}
                        onChange={(e) =>
                          handleStatusChange(item, e.target.value as DinnerCircleIngredientStatus)
                        }
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="flexible">Flexible</option>
                        <option value="pending">Pending</option>
                        <option value="substitution_pending">Sub Pending</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inline substitution form for unavailable item */}
          {subFormIdx !== null && items[subFormIdx] && (
            <div className="mt-2 p-3 bg-stone-800 rounded border border-stone-700">
              <p className="text-sm text-stone-300 mb-2">
                Propose substitute for <strong>{items[subFormIdx].ingredient}</strong>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <input
                  type="text"
                  placeholder="Substitute ingredient"
                  className="bg-stone-900 text-stone-200 text-sm rounded px-3 py-1.5 border border-stone-600 flex-1"
                  value={subValue}
                  onChange={(e) => setSubValue(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  className="bg-stone-900 text-stone-200 text-sm rounded px-3 py-1.5 border border-stone-600 flex-1"
                  value={subReason}
                  onChange={(e) => setSubReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={isPending || !subValue.trim()}
                    onClick={() => handleProposeSub(items[subFormIdx!].ingredient)}
                  >
                    Propose
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSubFormIdx(null)
                      setSubValue('')
                      setSubReason('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Substitution Proposals */}
      {proposals.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-stone-300 mb-2">Substitution Proposals</h3>
          <div className="space-y-2">
            {proposals.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 text-sm bg-stone-800 rounded px-3 py-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-stone-100">
                    {p.originalIngredient} {'->'} {p.proposedSubstitute}
                  </span>
                  {p.costDeltaCents != null && (
                    <span className="text-xs text-stone-400">
                      ({p.costDeltaCents >= 0 ? '+' : ''}
                      {(p.costDeltaCents / 100).toFixed(2)})
                    </span>
                  )}
                  <Badge
                    variant={
                      p.status === 'acknowledged'
                        ? 'success'
                        : p.status === 'flagged'
                          ? 'error'
                          : 'warning'
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
                {p.status === 'proposed' && (
                  <span className="text-xs text-stone-500">(awaiting client)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sourcing Log */}
      {log.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-stone-300 mb-2">Sourcing Log</h3>
          <div className="space-y-1">
            {log
              .slice(-10)
              .reverse()
              .map((entry) => (
                <p key={entry.id} className="text-xs text-stone-400">
                  <span className="text-stone-200">{entry.ingredient}</span>:{' '}
                  {STATUS_LABELS[entry.previousStatus]} {'->'} {STATUS_LABELS[entry.newStatus]}
                  {' - '}
                  {entry.reason}{' '}
                  <span className="text-stone-500">({relativeTime(entry.loggedAt)})</span>
                </p>
              ))}
          </div>
        </div>
      )}

      {/* Price Flexibility */}
      <div className="mt-6">
        <label className="text-sm text-stone-300 block mb-2">
          Acceptable price drift: +/- {flexibility}%
        </label>
        <input
          type="range"
          min={0}
          max={50}
          value={flexibility}
          onChange={(e) => handleFlexibilityChange(Number(e.target.value))}
          className="w-full accent-emerald-500"
          disabled={isPending}
        />
        <div className="flex justify-between text-xs text-stone-500 mt-1">
          <span>0%</span>
          <span>50%</span>
        </div>
      </div>
    </Card>
  )
}
