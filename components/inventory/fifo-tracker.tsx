'use client'

import { useState, useTransition, useCallback } from 'react'
import type { InventoryLot, LotInput, ShelfLifeReport } from '@/lib/inventory/fifo-actions'
import {
  receiveLot,
  consumeLot,
  discardLot,
  getActiveLots,
  getExpiringItems,
  getExpiredItems,
  getShelfLifeReport,
  getWasteFromExpiry,
} from '@/lib/inventory/fifo-actions'

// ── Sub-components ────────────────────────────────────────────────

function ExpiryBadge({ daysUntilExpiry }: { daysUntilExpiry: number | null }) {
  if (daysUntilExpiry === null) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-stone-700 text-stone-400">No expiry</span>
    )
  }
  if (daysUntilExpiry <= 0) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-red-900/60 text-red-300 animate-pulse">
        Expired
      </span>
    )
  }
  if (daysUntilExpiry <= 3) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-orange-900/60 text-orange-300">
        {daysUntilExpiry}d left
      </span>
    )
  }
  if (daysUntilExpiry <= 7) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-yellow-900/60 text-yellow-300">
        {daysUntilExpiry}d left
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded text-xs bg-green-900/60 text-green-300">
      {daysUntilExpiry}d left
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    available: 'bg-green-900/60 text-green-300',
    partially_used: 'bg-yellow-900/60 text-yellow-300',
    consumed: 'bg-stone-700 text-stone-400',
    expired: 'bg-red-900/60 text-red-300',
    discarded: 'bg-red-900/60 text-red-400',
  }
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs ${colors[status] || 'bg-stone-700 text-stone-400'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function StorageLabel({ location }: { location: string | null }) {
  if (!location) return null
  const labels: Record<string, string> = {
    walk_in: 'Walk-in',
    freezer: 'Freezer',
    dry_storage: 'Dry Storage',
    prep_area: 'Prep Area',
  }
  return (
    <span className="px-2 py-0.5 rounded text-xs bg-stone-700 text-stone-400">
      {labels[location] || location}
    </span>
  )
}

// ── Receive Form ──────────────────────────────────────────────────

function ReceiveForm({ onReceived }: { onReceived: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const data: LotInput = {
      ingredientName: fd.get('ingredientName') as string,
      quantity: Number(fd.get('quantity')),
      unit: fd.get('unit') as string,
      receivedDate: fd.get('receivedDate') as string,
      expiryDate: (fd.get('expiryDate') as string) || null,
      shelfLifeDays: fd.get('shelfLifeDays') ? Number(fd.get('shelfLifeDays')) : null,
      storageLocation: (fd.get('storageLocation') as string) || null,
      supplier: (fd.get('supplier') as string) || null,
      lotNumber: (fd.get('lotNumber') as string) || null,
      costPerUnitCents: fd.get('costPerUnitCents') ? Number(fd.get('costPerUnitCents')) : null,
    }

    startTransition(async () => {
      try {
        const result = await receiveLot(data)
        if (!result.success) {
          setError(result.error || 'Failed to receive lot')
          return
        }
        setShowForm(false)
        onReceived()
      } catch (err: any) {
        setError(err.message || 'Failed to receive lot')
      }
    })
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
      >
        + Receive Lot
      </button>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-stone-800 border border-stone-700 rounded-lg p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-stone-200">Receive New Lot</h3>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <input
          name="ingredientName"
          required
          placeholder="Ingredient name"
          className="col-span-2 sm:col-span-1 bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
        />
        <input
          name="quantity"
          required
          type="number"
          step="any"
          min="0.01"
          placeholder="Quantity"
          className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
        />
        <input
          name="unit"
          required
          placeholder="Unit (lbs, oz, each)"
          className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
        />
        <div className="flex flex-col">
          <label className="text-xs text-stone-500 mb-1">Received</label>
          <input
            name="receivedDate"
            required
            type="date"
            defaultValue={today}
            className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-stone-500 mb-1">Expiry date</label>
          <input
            name="expiryDate"
            type="date"
            className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-stone-500 mb-1">Shelf life (days)</label>
          <input
            name="shelfLifeDays"
            type="number"
            min="1"
            placeholder="e.g. 5"
            className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
          />
        </div>
        <select
          name="storageLocation"
          className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200"
        >
          <option value="">Storage location</option>
          <option value="walk_in">Walk-in</option>
          <option value="freezer">Freezer</option>
          <option value="dry_storage">Dry Storage</option>
          <option value="prep_area">Prep Area</option>
        </select>
        <input
          name="supplier"
          placeholder="Supplier"
          className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
        />
        <input
          name="lotNumber"
          placeholder="Lot / batch #"
          className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
        />
        <div className="flex flex-col">
          <label className="text-xs text-stone-500 mb-1">Cost per unit (cents)</label>
          <input
            name="costPerUnitCents"
            type="number"
            min="0"
            placeholder="e.g. 350"
            className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
        >
          {isPending ? 'Saving...' : 'Save Lot'}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Use / Discard Dialog ──────────────────────────────────────────

function UseDialog({ lot, onDone }: { lot: InventoryLot; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [qty, setQty] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleUse() {
    const amount = Number(qty)
    if (!amount || amount <= 0) {
      setError('Enter a valid quantity')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const result = await consumeLot(lot.id, amount)
        if (!result.success) {
          setError(result.error || 'Failed')
          return
        }
        onDone()
      } catch (err: any) {
        setError(err.message || 'Failed')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step="any"
        min="0.01"
        max={lot.quantity}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder={`Max ${lot.quantity}`}
        className="w-24 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-sm text-stone-200 placeholder-stone-500"
      />
      <button
        onClick={handleUse}
        disabled={isPending}
        className="px-2 py-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs"
      >
        {isPending ? '...' : 'Use'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────

interface FIFOTrackerProps {
  initialLots: InventoryLot[]
  initialReport: ShelfLifeReport
  initialExpiring: InventoryLot[]
  initialExpired: InventoryLot[]
  initialWaste: { totalLots: number; totalValueCents: number }
}

export function FIFOTracker({
  initialLots,
  initialReport,
  initialExpiring,
  initialExpired,
  initialWaste,
}: FIFOTrackerProps) {
  const [lots, setLots] = useState(initialLots)
  const [report, setReport] = useState(initialReport)
  const [expiring, setExpiring] = useState(initialExpiring)
  const [expired, setExpired] = useState(initialExpired)
  const [waste, setWaste] = useState(initialWaste)
  const [isPending, startTransition] = useTransition()
  const [filterLocation, setFilterLocation] = useState<string>('')
  const [filterIngredient, setFilterIngredient] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [useDialogLot, setUseDialogLot] = useState<string | null>(null)

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const [newLots, newReport, newExpiring, newExpired, newWaste] = await Promise.all([
          getActiveLots(),
          getShelfLifeReport(),
          getExpiringItems(3),
          getExpiredItems(),
          getWasteFromExpiry(30),
        ])
        setLots(newLots)
        setReport(newReport)
        setExpiring(newExpiring)
        setExpired(newExpired)
        setWaste(newWaste)
      } catch {
        // Non-critical refresh failure
      }
    })
  }, [])

  function handleDiscard(lotId: string) {
    startTransition(async () => {
      try {
        const result = await discardLot(lotId)
        if (result.success) refresh()
      } catch {
        // Discard failed silently for now
      }
    })
  }

  // Filtering
  const filteredLots = lots.filter((lot) => {
    if (filterLocation && lot.storageLocation !== filterLocation) return false
    if (
      filterIngredient &&
      !lot.ingredientName.toLowerCase().includes(filterIngredient.toLowerCase())
    )
      return false
    if (filterStatus === 'expiring' && (lot.daysUntilExpiry === null || lot.daysUntilExpiry > 3))
      return false
    if (filterStatus === 'expired' && (lot.daysUntilExpiry === null || lot.daysUntilExpiry > 0))
      return false
    return true
  })

  // Group by ingredient
  const grouped = new Map<string, InventoryLot[]>()
  for (const lot of filteredLots) {
    const key = lot.ingredientName
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(lot)
  }

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`

  return (
    <div className="space-y-6">
      {/* Alert banners */}
      {expiring.length > 0 && (
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3 flex items-center gap-2">
          <span className="text-orange-400 font-medium text-sm">
            {expiring.length} item{expiring.length !== 1 ? 's' : ''} expiring within 3 days
          </span>
        </div>
      )}
      {expired.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-center gap-2 animate-pulse">
          <span className="text-red-400 font-medium text-sm">
            {expired.length} expired item{expired.length !== 1 ? 's' : ''} still in stock - discard
            or review immediately
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Active Lots</p>
          <p className="text-2xl font-bold text-stone-100 mt-1">{report.totalActiveLots}</p>
        </div>
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Expiring This Week</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">{report.expiringSoon}</p>
        </div>
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Expired</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{report.expired}</p>
        </div>
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-4">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Waste Value (30d)</p>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {formatCents(waste.totalValueCents)}
          </p>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        <ReceiveForm onReceived={refresh} />

        <input
          value={filterIngredient}
          onChange={(e) => setFilterIngredient(e.target.value)}
          placeholder="Filter by ingredient..."
          className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
        />
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200"
        >
          <option value="">All locations</option>
          <option value="walk_in">Walk-in</option>
          <option value="freezer">Freezer</option>
          <option value="dry_storage">Dry Storage</option>
          <option value="prep_area">Prep Area</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200"
        >
          <option value="">All statuses</option>
          <option value="expiring">Expiring soon</option>
          <option value="expired">Expired</option>
        </select>

        {isPending && <span className="text-xs text-stone-500">Refreshing...</span>}
      </div>

      {/* Lot list grouped by ingredient */}
      {grouped.size === 0 ? (
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-8 text-center">
          <p className="text-stone-500">No lots found. Receive your first lot to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([ingredient, ingredientLots]) => (
            <div
              key={ingredient}
              className="bg-stone-800 border border-stone-700 rounded-lg overflow-hidden"
            >
              <div className="px-4 py-3 bg-stone-800 border-b border-stone-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-200">{ingredient}</h3>
                <span className="text-xs text-stone-500">
                  {ingredientLots.length} lot{ingredientLots.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y divide-stone-700">
                {ingredientLots.map((lot, idx) => (
                  <div
                    key={lot.id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {idx === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-300 uppercase">
                          FIFO
                        </span>
                      )}
                      <span className="text-sm text-stone-300 font-medium">
                        {lot.quantity} {lot.unit}
                      </span>
                      <span className="text-xs text-stone-500">Received {lot.receivedDate}</span>
                      <ExpiryBadge daysUntilExpiry={lot.daysUntilExpiry} />
                      <StatusBadge status={lot.status} />
                      <StorageLabel location={lot.storageLocation} />
                      {lot.supplier && (
                        <span className="text-xs text-stone-500 truncate">{lot.supplier}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {useDialogLot === lot.id ? (
                        <UseDialog
                          lot={lot}
                          onDone={() => {
                            setUseDialogLot(null)
                            refresh()
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setUseDialogLot(lot.id)}
                          className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs transition-colors"
                        >
                          Use
                        </button>
                      )}
                      <button
                        onClick={() => handleDiscard(lot.id)}
                        disabled={isPending}
                        className="px-2 py-1 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-red-200 rounded text-xs transition-colors"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
