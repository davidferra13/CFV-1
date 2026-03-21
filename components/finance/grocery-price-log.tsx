'use client'

import { useState, useTransition, useEffect, useCallback, useRef } from 'react'
import {
  addPriceEntry,
  bulkAddPrices,
  deletePriceEntry,
  getPriceHistory,
  getFrequentIngredients,
  type PriceEntry,
  type PriceEntryInput,
} from '@/lib/finance/grocery-price-actions'

const UNIT_OPTIONS = [
  'lb',
  'oz',
  'each',
  'bunch',
  'bag',
  'can',
  'bottle',
  'gallon',
  'quart',
  'pint',
  'dozen',
  'kg',
  'g',
]

type BulkRow = PriceEntryInput & { _key: number }

export function GroceryPriceLog() {
  const [entries, setEntries] = useState<PriceEntry[]>([])
  const [frequentIngredients, setFrequentIngredients] = useState<
    { name: string; count: number; latest_cents: number; unit: string }[]
  >([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [filterIngredient, setFilterIngredient] = useState('')
  const [filterStore, setFilterStore] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const nextKey = useRef(0)

  // Single entry form state
  const [ingredientName, setIngredientName] = useState('')
  const [unit, setUnit] = useState('lb')
  const [priceStr, setPriceStr] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [storeName, setStoreName] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])

  const loadEntries = useCallback(() => {
    startTransition(async () => {
      try {
        const [histResult, freqResult] = await Promise.all([
          getPriceHistory(filterIngredient || undefined, filterStore || undefined),
          getFrequentIngredients(),
        ])
        if (histResult.success && histResult.entries) {
          setEntries(histResult.entries)
        }
        if (freqResult.success && freqResult.ingredients) {
          setFrequentIngredients(freqResult.ingredients)
        }
        setError(null)
      } catch (err) {
        setError('Failed to load price entries')
        console.error('[grocery-price-log] load failed:', err)
      }
    })
  }, [filterIngredient, filterStore])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  function parsePriceCents(str: string): number | null {
    const val = parseFloat(str)
    if (isNaN(val) || val < 0) return null
    return Math.round(val * 100)
  }

  function handleAddEntry() {
    const priceCents = parsePriceCents(priceStr)
    if (!ingredientName.trim() || priceCents === null) {
      setError('Ingredient name and valid price are required')
      return
    }

    const previousEntries = entries
    setError(null)

    startTransition(async () => {
      try {
        const result = await addPriceEntry({
          ingredient_name: ingredientName,
          unit,
          price_cents: priceCents,
          quantity: parseFloat(quantity) || 1,
          store_name: storeName || undefined,
          receipt_date: receiptDate,
        })
        if (!result.success) {
          setEntries(previousEntries)
          setError(result.error || 'Failed to add entry')
          return
        }
        // Reset form
        setIngredientName('')
        setPriceStr('')
        setQuantity('1')
        loadEntries()
      } catch (err) {
        setEntries(previousEntries)
        setError('Failed to add entry')
        console.error('[grocery-price-log] add failed:', err)
      }
    })
  }

  function addBulkRow() {
    setBulkRows((prev) => [
      ...prev,
      {
        _key: nextKey.current++,
        ingredient_name: '',
        unit: 'lb',
        price_cents: 0,
        quantity: 1,
        store_name: storeName,
        receipt_date: receiptDate,
      },
    ])
  }

  function updateBulkRow(key: number, field: string, value: string | number) {
    setBulkRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)))
  }

  function removeBulkRow(key: number) {
    setBulkRows((prev) => prev.filter((r) => r._key !== key))
  }

  function handleBulkSave() {
    const valid = bulkRows.filter((r) => r.ingredient_name.trim() && r.price_cents > 0)
    if (valid.length === 0) {
      setError('Add at least one valid row with ingredient name and price')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await bulkAddPrices(
          valid.map((r) => ({
            ingredient_name: r.ingredient_name,
            unit: r.unit,
            price_cents: r.price_cents,
            quantity: r.quantity,
            store_name: r.store_name,
            receipt_date: r.receipt_date,
          }))
        )
        if (!result.success) {
          setError(result.error || 'Failed to save entries')
          return
        }
        setBulkRows([])
        setBulkMode(false)
        loadEntries()
      } catch (err) {
        setError('Failed to save entries')
        console.error('[grocery-price-log] bulk save failed:', err)
      }
    })
  }

  function handleDelete(id: string) {
    const previousEntries = entries
    setEntries((prev) => prev.filter((e) => e.id !== id))

    startTransition(async () => {
      try {
        const result = await deletePriceEntry(id)
        if (!result.success) {
          setEntries(previousEntries)
          setError(result.error || 'Failed to delete entry')
        }
      } catch (err) {
        setEntries(previousEntries)
        setError('Failed to delete entry')
        console.error('[grocery-price-log] delete failed:', err)
      }
    })
  }

  function formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`
  }

  const filteredAutocomplete = frequentIngredients.filter(
    (i) => i.name.includes(ingredientName.toLowerCase()) && ingredientName.length > 0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Grocery Price Log</h2>
        <button
          onClick={() => setBulkMode(!bulkMode)}
          className="text-sm text-brand-600 hover:text-brand-800"
        >
          {bulkMode ? 'Single entry' : 'Bulk entry'}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Single entry form */}
      {!bulkMode && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 sm:grid-cols-3 lg:grid-cols-7">
          <div className="relative col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">Ingredient</label>
            <input
              type="text"
              value={ingredientName}
              onChange={(e) => {
                setIngredientName(e.target.value)
                setShowAutocomplete(true)
              }}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
              placeholder="e.g. chicken breast"
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
            {showAutocomplete && filteredAutocomplete.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded border bg-white shadow-lg">
                {filteredAutocomplete.slice(0, 8).map((i) => (
                  <li
                    key={i.name}
                    onMouseDown={() => {
                      setIngredientName(i.name)
                      setUnit(i.unit)
                      setShowAutocomplete(false)
                    }}
                    className="cursor-pointer px-2 py-1 text-sm hover:bg-brand-50"
                  >
                    {i.name} ({formatCents(i.latest_cents)}/{i.unit})
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder="4.99"
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Qty</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Store</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Costco"
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Date</label>
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddEntry}
              disabled={isPending}
              className="w-full rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Bulk entry mode */}
      {bulkMode && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Store (all rows)
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => {
                  setStoreName(e.target.value)
                  setBulkRows((prev) => prev.map((r) => ({ ...r, store_name: e.target.value })))
                }}
                placeholder="Costco"
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Date (all rows)
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => {
                  setReceiptDate(e.target.value)
                  setBulkRows((prev) => prev.map((r) => ({ ...r, receipt_date: e.target.value })))
                }}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {bulkRows.map((row) => (
            <div key={row._key} className="grid grid-cols-5 gap-2 items-end">
              <input
                type="text"
                value={row.ingredient_name}
                onChange={(e) => updateBulkRow(row._key, 'ingredient_name', e.target.value)}
                placeholder="Ingredient"
                className="rounded border px-2 py-1.5 text-sm"
              />
              <select
                value={row.unit}
                onChange={(e) => updateBulkRow(row._key, 'unit', e.target.value)}
                className="rounded border px-2 py-1.5 text-sm"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Price $"
                onChange={(e) => {
                  const cents = parsePriceCents(e.target.value)
                  if (cents !== null) updateBulkRow(row._key, 'price_cents', cents)
                }}
                className="rounded border px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={row.quantity ?? 1}
                onChange={(e) =>
                  updateBulkRow(row._key, 'quantity', parseFloat(e.target.value) || 1)
                }
                placeholder="Qty"
                className="rounded border px-2 py-1.5 text-sm"
              />
              <button
                onClick={() => removeBulkRow(row._key)}
                className="rounded border border-red-200 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <button
              onClick={addBulkRow}
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              + Add row
            </button>
            {bulkRows.length > 0 && (
              <button
                onClick={handleBulkSave}
                disabled={isPending}
                className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {isPending ? 'Saving...' : `Save ${bulkRows.length} entries`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          value={filterIngredient}
          onChange={(e) => setFilterIngredient(e.target.value)}
          placeholder="Filter by ingredient..."
          className="rounded border px-2 py-1.5 text-sm"
        />
        <input
          type="text"
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          placeholder="Filter by store..."
          className="rounded border px-2 py-1.5 text-sm"
        />
        <button
          onClick={loadEntries}
          disabled={isPending}
          className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {/* Recent entries table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="pb-2 pr-3">Ingredient</th>
              <th className="pb-2 pr-3">Price</th>
              <th className="pb-2 pr-3">Qty</th>
              <th className="pb-2 pr-3">Unit</th>
              <th className="pb-2 pr-3">Store</th>
              <th className="pb-2 pr-3">Date</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  No price entries yet. Log your first receipt above.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium capitalize">{entry.ingredient_name}</td>
                <td className="py-2 pr-3">{formatCents(entry.price_cents)}</td>
                <td className="py-2 pr-3">{entry.quantity}</td>
                <td className="py-2 pr-3">{entry.unit}</td>
                <td className="py-2 pr-3 text-gray-600">{entry.store_name || '-'}</td>
                <td className="py-2 pr-3 text-gray-600">{entry.receipt_date}</td>
                <td className="py-2">
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={isPending}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
