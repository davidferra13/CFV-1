'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { getPriceHistory, addPriceEntry } from '@/lib/vendors/vendor-actions'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react'

type PriceEntry = {
  id: string
  vendor_id: string
  item_name: string
  price_cents: number
  unit: string
  recorded_at: string
  notes: string | null
  created_at: string
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function PriceTrend({ current, previous }: { current: number; previous: number }) {
  if (current > previous) {
    const pct = (((current - previous) / previous) * 100).toFixed(1)
    return (
      <span className="inline-flex items-center gap-0.5 text-red-600 text-xs">
        <TrendingUp className="h-3 w-3" />+{pct}%
      </span>
    )
  }
  if (current < previous) {
    const pct = (((previous - current) / previous) * 100).toFixed(1)
    return (
      <span className="inline-flex items-center gap-0.5 text-green-600 text-xs">
        <TrendingDown className="h-3 w-3" />-{pct}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-xs">
      <Minus className="h-3 w-3" />
      0%
    </span>
  )
}

export function VendorPriceLog({
  vendorId,
  vendorName,
  onBack,
}: {
  vendorId: string
  vendorName: string
  onBack: () => void
}) {
  const [entries, setEntries] = useState<PriceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [itemName, setItemName] = useState('')
  const [priceDollars, setPriceDollars] = useState('')
  const [unit, setUnit] = useState('lb')
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().split('T')[0])
  const [entryNotes, setEntryNotes] = useState('')

  const loadPrices = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPriceHistory(vendorId)
      setEntries(data as PriceEntry[])
    } catch (err) {
      console.error('Failed to load price history:', err)
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    loadPrices()
  }, [loadPrices])

  function handleAddEntry(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const priceCents = Math.round(parseFloat(priceDollars) * 100)
    if (isNaN(priceCents) || priceCents < 0) {
      setError('Please enter a valid price')
      return
    }

    startTransition(async () => {
      try {
        await addPriceEntry(vendorId, {
          item_name: itemName,
          price_cents: priceCents,
          unit,
          recorded_at: recordedAt,
          notes: entryNotes || null,
        })
        // Reset form
        setItemName('')
        setPriceDollars('')
        setUnit('lb')
        setEntryNotes('')
        setShowForm(false)
        await loadPrices()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add price entry')
      }
    })
  }

  // Group entries by item for trend calculation
  const entriesByItem = new Map<string, PriceEntry[]>()
  for (const entry of entries) {
    const list = entriesByItem.get(entry.item_name) || []
    list.push(entry)
    entriesByItem.set(entry.item_name, list)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            &larr; Back to vendors
          </button>
          <h2 className="text-lg font-semibold">Price Log: {vendorName}</h2>
        </div>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Log Price
        </Button>
      </div>

      {/* Add entry form */}
      {showForm && (
        <form onSubmit={handleAddEntry} className="border rounded-lg p-4 bg-card space-y-3">
          {error && (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium mb-1">Item Name *</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
                placeholder="e.g. Ribeye"
                className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Price *</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value)}
                  required
                  className="w-full border rounded-md pl-6 pr-2 py-1.5 text-sm bg-background"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Unit *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
              >
                <option value="lb">lb</option>
                <option value="oz">oz</option>
                <option value="each">each</option>
                <option value="case">case</option>
                <option value="dozen">dozen</option>
                <option value="gallon">gallon</option>
                <option value="quart">quart</option>
                <option value="pint">pint</option>
                <option value="bunch">bunch</option>
                <option value="bag">bag</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Date</label>
              <input
                type="date"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Notes</label>
            <input
              type="text"
              value={entryNotes}
              onChange={(e) => setEntryNotes(e.target.value)}
              placeholder="Sale price, quality notes..."
              className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Entry'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Price table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading prices...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No price entries yet. Log your first price to start tracking.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Item</th>
                <th className="text-right px-4 py-2 font-medium">Price</th>
                <th className="text-left px-4 py-2 font-medium">Unit</th>
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-left px-4 py-2 font-medium">Trend</th>
                <th className="text-left px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => {
                // Find the previous entry for the same item to calculate trend
                const itemEntries = entriesByItem.get(entry.item_name) || []
                const idx = itemEntries.indexOf(entry)
                const previousEntry = idx < itemEntries.length - 1 ? itemEntries[idx + 1] : null

                return (
                  <tr key={entry.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{entry.item_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatPrice(entry.price_cents)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">/{entry.unit}</td>
                    <td className="px-4 py-2 text-muted-foreground">{entry.recorded_at}</td>
                    <td className="px-4 py-2">
                      {previousEntry ? (
                        <PriceTrend
                          current={entry.price_cents}
                          previous={previousEntry.price_cents}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground truncate max-w-[200px]">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
