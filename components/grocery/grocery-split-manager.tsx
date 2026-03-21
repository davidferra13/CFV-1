'use client'

// Grocery Split Manager
// Select clients, choose split method, preview per-client totals, assign items.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  splitEquallyAcrossClients,
  splitProportionally,
  assignItemToClient,
  getTripSplitSummary,
} from '@/lib/grocery/grocery-splitting-actions'

type TripItem = {
  id: string
  item_name: string
  price_cents: number
  category: string | null
}

type Client = {
  id: string
  name: string
}

type SplitSummaryClient = {
  clientId: string
  clientName: string
  totalCents: number
  splitMethod: string
}

type Props = {
  tripId: string
  tripTotalCents: number
  items: TripItem[]
  availableClients: Client[]
  initialSplits?: SplitSummaryClient[]
}

type SplitMode = 'equal' | 'proportional' | 'per-item'

export function GrocerySplitManager({
  tripId,
  tripTotalCents,
  items,
  availableClients,
  initialSplits = [],
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
    initialSplits.map((s) => s.clientId)
  )
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [itemAssignments, setItemAssignments] = useState<Record<string, string>>({})
  const [splitPreview, setSplitPreview] = useState<SplitSummaryClient[]>(initialSplits)
  const [error, setError] = useState<string | null>(null)

  function toggleClient(clientId: string) {
    setSelectedClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    )
  }

  function setClientWeight(clientId: string, w: number) {
    setWeights((prev) => ({ ...prev, [clientId]: w }))
  }

  function assignItem(itemId: string, clientId: string) {
    setItemAssignments((prev) => ({ ...prev, [itemId]: clientId }))
  }

  function computeEqualPreview(): SplitSummaryClient[] {
    if (selectedClientIds.length === 0) return []
    const perClient = Math.floor(tripTotalCents / selectedClientIds.length)
    const remainder = tripTotalCents - perClient * selectedClientIds.length
    return selectedClientIds.map((id, i) => ({
      clientId: id,
      clientName: availableClients.find((c) => c.id === id)?.name ?? 'Unknown',
      totalCents: perClient + (i === 0 ? remainder : 0),
      splitMethod: 'equal',
    }))
  }

  function computeProportionalPreview(): SplitSummaryClient[] {
    const totalWeight = selectedClientIds.reduce((s, id) => s + (weights[id] || 1), 0)
    if (totalWeight <= 0) return []
    let allocated = 0
    const result = selectedClientIds.map((id) => {
      const w = weights[id] || 1
      const share = Math.floor((w / totalWeight) * tripTotalCents)
      allocated += share
      return {
        clientId: id,
        clientName: availableClients.find((c) => c.id === id)?.name ?? 'Unknown',
        totalCents: share,
        splitMethod: 'proportional',
      }
    })
    if (result.length > 0) {
      result[0].totalCents += tripTotalCents - allocated
    }
    return result
  }

  function computePerItemPreview(): SplitSummaryClient[] {
    const totals = new Map<string, number>()
    for (const item of items) {
      const assignedTo = itemAssignments[item.id]
      if (assignedTo) {
        totals.set(assignedTo, (totals.get(assignedTo) || 0) + item.price_cents)
      }
    }
    return Array.from(totals.entries()).map(([clientId, cents]) => ({
      clientId,
      clientName: availableClients.find((c) => c.id === clientId)?.name ?? 'Unknown',
      totalCents: cents,
      splitMethod: 'full',
    }))
  }

  function getPreview(): SplitSummaryClient[] {
    switch (splitMode) {
      case 'equal':
        return computeEqualPreview()
      case 'proportional':
        return computeProportionalPreview()
      case 'per-item':
        return computePerItemPreview()
    }
  }

  function handleApplySplit() {
    setError(null)
    const previousPreview = [...splitPreview]

    startTransition(async () => {
      try {
        if (splitMode === 'equal') {
          await splitEquallyAcrossClients(tripId, selectedClientIds)
        } else if (splitMode === 'proportional') {
          const clientWeights = selectedClientIds.map((id) => ({
            clientId: id,
            weight: weights[id] || 1,
          }))
          await splitProportionally(tripId, clientWeights)
        } else if (splitMode === 'per-item') {
          // Assign each item individually
          for (const item of items) {
            const clientId = itemAssignments[item.id]
            if (clientId) {
              await assignItemToClient(item.id, clientId)
            }
          }
        }

        // Refresh summary from server
        const summary = await getTripSplitSummary(tripId)
        setSplitPreview(summary.clients)
        router.refresh()
      } catch (err) {
        setSplitPreview(previousPreview)
        setError(err instanceof Error ? err.message : 'Failed to apply split')
      }
    })
  }

  const preview = getPreview()
  const previewTotal = preview.reduce((s, c) => s + c.totalCents, 0)
  const unallocated = tripTotalCents - previewTotal

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      {/* Split mode selector */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Split Method</h3>
        <div className="flex gap-2">
          {(
            [
              { value: 'equal', label: 'Equal Split' },
              { value: 'proportional', label: 'By Weight' },
              { value: 'per-item', label: 'Per Item' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.value}
              onClick={() => setSplitMode(mode.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                splitMode === mode.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client selection (for equal / proportional) */}
      {splitMode !== 'per-item' && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Select Clients</h3>
          <div className="flex flex-wrap gap-2">
            {availableClients.map((client) => (
              <button
                key={client.id}
                onClick={() => toggleClient(client.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedClientIds.includes(client.id)
                    ? 'bg-brand-100 border-brand-300 text-brand-800'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {client.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Weight inputs (proportional mode) */}
      {splitMode === 'proportional' && selectedClientIds.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Client Weights (e.g., guest count)
          </h3>
          <div className="space-y-2">
            {selectedClientIds.map((clientId) => {
              const client = availableClients.find((c) => c.id === clientId)
              return (
                <div key={clientId} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-32 truncate">
                    {client?.name ?? 'Unknown'}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={weights[clientId] || 1}
                    onChange={(e) => setClientWeight(clientId, parseInt(e.target.value) || 1)}
                    className="w-20 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Per-item assignment */}
      {splitMode === 'per-item' && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Assign Items to Clients</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                <span className="text-sm text-gray-900 flex-1 truncate">
                  {item.item_name} (${(item.price_cents / 100).toFixed(2)})
                </span>
                <select
                  value={itemAssignments[item.id] || ''}
                  onChange={(e) => assignItem(item.id, e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="">Unassigned</option>
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Split Preview</h3>
          <div className="space-y-2">
            {preview.map((client) => {
              const pct =
                tripTotalCents > 0 ? ((client.totalCents / tripTotalCents) * 100).toFixed(1) : '0'
              return (
                <div key={client.clientId} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{client.clientName}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-brand-500 rounded-full h-2" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-20 text-right">
                      ${(client.totalCents / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 w-12 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {unallocated > 0 && splitMode === 'per-item' && (
            <div className="mt-3 pt-3 border-t text-sm text-amber-600">
              ${(unallocated / 100).toFixed(2)} unallocated
            </div>
          )}

          <div className="mt-3 pt-3 border-t flex justify-between items-center">
            <span className="text-sm font-medium text-gray-900">
              Trip total: ${(tripTotalCents / 100).toFixed(2)}
            </span>
            <Button onClick={handleApplySplit} disabled={isPending || preview.length === 0}>
              {isPending ? 'Applying...' : 'Apply Split'}
            </Button>
          </div>
        </div>
      )}

      {/* Saved splits summary */}
      {splitPreview.length > 0 && (
        <div className="border rounded-lg p-4 bg-green-50">
          <h3 className="text-sm font-semibold text-green-900 mb-2">Saved Split</h3>
          <div className="space-y-1">
            {splitPreview.map((client) => (
              <div key={client.clientId} className="flex justify-between text-sm">
                <span className="text-green-800">{client.clientName}</span>
                <span className="font-medium text-green-900">
                  ${(client.totalCents / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
