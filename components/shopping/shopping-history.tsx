'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getShoppingHistory,
  getPastShoppingEvents,
  recordManualPurchase,
  type ShoppingHistoryResult,
  type PastShoppingEvent,
} from '@/lib/culinary/shopping-history-actions'

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

// ── Manual Purchase Entry Form ───────────────────────────────────────────

function ManualPurchaseForm({ eventId, onComplete }: { eventId: string; onComplete: () => void }) {
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('lb')
  const [costCents, setCostCents] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (!ingredientId.trim() || !quantity) return
    setError(null)
    startTransition(async () => {
      try {
        await recordManualPurchase({
          eventId,
          ingredientId: ingredientId.trim(),
          quantity: Number(quantity),
          unit,
          costCents: costCents ? Math.round(Number(costCents) * 100) : undefined,
          notes: notes || undefined,
        })
        setIngredientId('')
        setQuantity('')
        setCostCents('')
        setNotes('')
        onComplete()
      } catch (err: any) {
        setError(err?.message || 'Failed to record purchase')
      }
    })
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4 space-y-3">
      <p className="text-sm font-medium text-stone-200">Record a Purchase</p>
      <p className="text-xs text-stone-500">
        For items bought without a receipt (farmers market, cash purchases).
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          placeholder="Ingredient ID"
          value={ingredientId}
          onChange={(e) => setIngredientId(e.target.value)}
          className="rounded-md border border-stone-600 bg-stone-900 px-2 py-1.5 text-sm text-stone-300"
        />
        <div className="flex gap-1">
          <input
            type="number"
            placeholder="Qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-1.5 text-sm text-stone-300 w-20"
          />
          <select
            title="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-1.5 text-sm text-stone-300"
          >
            <option value="lb">lb</option>
            <option value="oz">oz</option>
            <option value="each">each</option>
            <option value="qt">qt</option>
            <option value="gal">gal</option>
            <option value="bunch">bunch</option>
          </select>
        </div>
        <input
          type="number"
          step="0.01"
          placeholder="Cost ($)"
          value={costCents}
          onChange={(e) => setCostCents(e.target.value)}
          className="rounded-md border border-stone-600 bg-stone-900 px-2 py-1.5 text-sm text-stone-300"
        />
        <Button onClick={handleSubmit} disabled={isPending || !ingredientId || !quantity}>
          {isPending ? 'Saving...' : 'Add Purchase'}
        </Button>
      </div>
      <input
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full rounded-md border border-stone-600 bg-stone-900 px-2 py-1.5 text-sm text-stone-300"
      />
    </div>
  )
}

// ── History Table ────────────────────────────────────────────────────────

function HistoryTable({ history }: { history: ShoppingHistoryResult }) {
  if (history.items.length === 0) {
    return (
      <p className="text-sm text-stone-500 py-4">
        No ingredient data for this event. Add recipes to the menu or record purchases.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-700 text-stone-500">
            <th className="px-2 py-2 text-left font-medium">Ingredient</th>
            <th className="px-2 py-2 text-right font-medium">List Said</th>
            <th className="px-2 py-2 text-right font-medium">Purchased</th>
            <th className="px-2 py-2 text-right font-medium">Cost</th>
            <th className="px-2 py-2 text-right font-medium">Variance</th>
          </tr>
        </thead>
        <tbody>
          {history.items.map((item) => {
            const varianceColor =
              item.purchaseVariance == null
                ? 'text-stone-500'
                : item.purchaseVariance > 0
                  ? 'text-amber-400'
                  : item.purchaseVariance < 0
                    ? 'text-red-400'
                    : 'text-green-400'

            return (
              <tr key={item.ingredientId} className="border-b border-stone-800">
                <td className="px-2 py-2 text-stone-100">{item.ingredientName}</td>
                <td className="px-2 py-2 text-right text-stone-300">
                  {item.buyQty != null ? `${item.buyQty.toFixed(1)} ${item.unit}` : 'N/A'}
                </td>
                <td className="px-2 py-2 text-right text-stone-300">
                  {item.purchasedQty != null
                    ? `${item.purchasedQty.toFixed(1)} ${item.unit}`
                    : 'Not recorded'}
                </td>
                <td className="px-2 py-2 text-right text-stone-300">
                  {item.purchasedCostCents != null ? formatCurrency(item.purchasedCostCents) : '-'}
                </td>
                <td className={`px-2 py-2 text-right font-medium ${varianceColor}`}>
                  {item.purchaseVariance != null
                    ? `${item.purchaseVariance > 0 ? '+' : ''}${item.purchaseVariance.toFixed(1)} ${item.unit}`
                    : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {history.totalPurchasedCostCents > 0 && (
        <div className="flex justify-end px-2 py-2 border-t border-stone-700">
          <span className="text-sm text-stone-300">
            Total purchased: {formatCurrency(history.totalPurchasedCostCents)}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main Shopping History Component ──────────────────────────────────────

export function ShoppingHistory() {
  const [events, setEvents] = useState<PastShoppingEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [history, setHistory] = useState<ShoppingHistoryResult | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function loadEvents() {
    if (loaded) return
    startTransition(async () => {
      try {
        const result = await getPastShoppingEvents()
        setEvents(result)
        setLoaded(true)
      } catch (err: any) {
        setError(err?.message || 'Failed to load events')
      }
    })
  }

  function loadHistory(eventId: string) {
    setSelectedEventId(eventId)
    setError(null)
    startTransition(async () => {
      try {
        const result = await getShoppingHistory(eventId)
        setHistory(result)
      } catch (err: any) {
        setError(err?.message || 'Failed to load shopping history')
      }
    })
  }

  function refreshHistory() {
    if (selectedEventId) loadHistory(selectedEventId)
  }

  // Load events on first render
  if (!loaded && !isPending) {
    loadEvents()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shopping History</CardTitle>
        <p className="text-sm text-stone-500">
          Compare what the list said to buy vs. what was actually purchased.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Event selector */}
        <div className="flex items-center gap-3">
          <select
            title="Select an event"
            value={selectedEventId ?? ''}
            onChange={(e) => e.target.value && loadHistory(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm text-stone-300 min-w-[250px]"
          >
            <option value="">Select an event...</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.occasion || 'Event'} - {e.eventDate}
                {e.clientName ? ` (${e.clientName})` : ''}
              </option>
            ))}
          </select>

          {selectedEventId && (
            <Button
              variant="secondary"
              onClick={() => setShowManualEntry((v) => !v)}
              className="text-sm"
            >
              {showManualEntry ? 'Hide Entry Form' : 'Record Purchase'}
            </Button>
          )}
        </div>

        {/* Manual purchase entry */}
        {showManualEntry && selectedEventId && (
          <ManualPurchaseForm eventId={selectedEventId} onComplete={refreshHistory} />
        )}

        {/* History table */}
        {isPending && <p className="text-sm text-stone-500">Loading...</p>}
        {history && !isPending && <HistoryTable history={history} />}
        {!history && !isPending && selectedEventId && (
          <p className="text-sm text-stone-500">No history data found.</p>
        )}
      </CardContent>
    </Card>
  )
}
