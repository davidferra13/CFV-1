'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import {
  getDisplayCase,
  createDisplayItem,
  updateDisplayItem,
  deleteDisplayItem,
  soldOne,
  restockItem,
  getDisplayCaseSummary,
  type DisplayCaseItem,
  type DisplayCaseCategory,
  type DisplayCaseSummary,
} from '@/lib/bakery/display-case-actions'

const CATEGORIES: { value: DisplayCaseCategory; label: string }[] = [
  { value: 'bread', label: 'Bread' },
  { value: 'pastry', label: 'Pastry' },
  { value: 'cake', label: 'Cake' },
  { value: 'cookie', label: 'Cookie' },
  { value: 'savory', label: 'Savory' },
  { value: 'drink', label: 'Drink' },
  { value: 'other', label: 'Other' },
]

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function FreshnessIndicator({ status, hours }: { status: string; hours: number | null }) {
  const colors: Record<string, string> = {
    fresh: 'bg-green-500',
    getting_stale: 'bg-yellow-500',
    stale: 'bg-red-500',
  }
  const labels: Record<string, string> = {
    fresh: 'Fresh',
    getting_stale: 'Getting stale',
    stale: 'Past shelf life',
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${colors[status] || 'bg-gray-400'}`} />
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {labels[status] || 'Unknown'}
        {hours !== null && ` (${hours}h ago)`}
      </span>
    </div>
  )
}

function SummaryBar({ summary }: { summary: DisplayCaseSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalItems}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Products</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalQuantity}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Total Items</p>
      </div>
      <div
        className={`rounded-lg border p-3 text-center ${summary.lowStockCount > 0 ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}
      >
        <p
          className={`text-2xl font-bold ${summary.lowStockCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}
        >
          {summary.lowStockCount}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Low Stock</p>
      </div>
      <div
        className={`rounded-lg border p-3 text-center ${summary.staleCount > 0 ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}
      >
        <p
          className={`text-2xl font-bold ${summary.staleCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}
        >
          {summary.staleCount}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Stale</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
          {formatPrice(summary.totalValueCents)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Case Value</p>
      </div>
    </div>
  )
}

export default function DisplayCase() {
  const [items, setItems] = useState<DisplayCaseItem[]>([])
  const [summary, setSummary] = useState<DisplayCaseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [restockQty, setRestockQty] = useState('1')
  const [isPending, startTransition] = useTransition()
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Add form state
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<DisplayCaseCategory>('pastry')
  const [formQuantity, setFormQuantity] = useState('0')
  const [formParLevel, setFormParLevel] = useState('0')
  const [formPrice, setFormPrice] = useState('')
  const [formShelfLife, setFormShelfLife] = useState('')
  const [formAllergens, setFormAllergens] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [caseResult, summaryResult] = await Promise.all([
        getDisplayCase(),
        getDisplayCaseSummary(),
      ])

      if (caseResult.error) {
        setError(caseResult.error)
      } else {
        setItems(caseResult.data || [])
        setError(null)
      }

      if (summaryResult.data) setSummary(summaryResult.data)
    } catch (err) {
      setError('Failed to load display case')
      console.error('[DisplayCase] Load error', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    // Auto-refresh every 60 seconds
    refreshTimer.current = setInterval(loadData, 60000)
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current)
    }
  }, [loadData])

  const handleSoldOne = (id: string) => {
    const previousItems = [...items]
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, current_quantity: Math.max(0, i.current_quantity - 1) } : i
      )
    )

    startTransition(async () => {
      try {
        const result = await soldOne(id)
        if (result.error) {
          setItems(previousItems)
          setError(result.error)
        } else {
          await loadData()
        }
      } catch {
        setItems(previousItems)
        setError('Failed to update quantity')
      }
    })
  }

  const handleAddOne = (id: string) => {
    const previousItems = [...items]
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, current_quantity: i.current_quantity + 1 } : i))
    )

    startTransition(async () => {
      try {
        const result = await restockItem(id, 1)
        if (result.error) {
          setItems(previousItems)
          setError(result.error)
        } else {
          await loadData()
        }
      } catch {
        setItems(previousItems)
        setError('Failed to update quantity')
      }
    })
  }

  const handleRestock = (id: string) => {
    const qty = parseInt(restockQty, 10)
    if (isNaN(qty) || qty < 1) {
      setError('Restock quantity must be at least 1')
      return
    }

    const previousItems = [...items]
    const item = items.find((i) => i.id === id)
    if (item) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, current_quantity: i.current_quantity + qty } : i))
      )
    }
    setRestockId(null)

    startTransition(async () => {
      try {
        const result = await restockItem(id, qty)
        if (result.error) {
          setItems(previousItems)
          setError(result.error)
        } else {
          await loadData()
        }
      } catch {
        setItems(previousItems)
        setError('Failed to restock')
      }
    })
  }

  const handleAddProduct = () => {
    if (!formName.trim() || !formPrice.trim()) return

    const priceCents = Math.round(parseFloat(formPrice) * 100)
    if (isNaN(priceCents) || priceCents < 0) {
      setError('Please enter a valid price')
      return
    }

    startTransition(async () => {
      try {
        const result = await createDisplayItem({
          product_name: formName.trim(),
          category: formCategory,
          current_quantity: parseInt(formQuantity, 10) || 0,
          par_level: parseInt(formParLevel, 10) || 0,
          price_cents: priceCents,
          shelf_life_hours: formShelfLife ? parseInt(formShelfLife, 10) : null,
          allergens: formAllergens
            ? formAllergens
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean)
            : null,
        })
        if (result.error) {
          setError(result.error)
        } else {
          setFormName('')
          setFormCategory('pastry')
          setFormQuantity('0')
          setFormParLevel('0')
          setFormPrice('')
          setFormShelfLife('')
          setFormAllergens('')
          setShowAddForm(false)
          await loadData()
        }
      } catch {
        setError('Failed to add product')
      }
    })
  }

  const handleDeleteProduct = (id: string) => {
    const previous = [...items]
    setItems((prev) => prev.filter((i) => i.id !== id))

    startTransition(async () => {
      try {
        const result = await deleteDisplayItem(id)
        if (result.error) {
          setItems(previous)
          setError(result.error)
        } else {
          await loadData()
        }
      } catch {
        setItems(previous)
        setError('Failed to delete product')
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary */}
      {summary && <SummaryBar summary={summary} />}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setShowManage(false)
          }}
          className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          {showAddForm ? 'Cancel' : 'Add Product'}
        </button>
        <button
          onClick={() => {
            setShowManage(!showManage)
            setShowAddForm(false)
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {showManage ? 'Close Manager' : 'Manage Products'}
        </button>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
            New Display Case Product
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Product Name *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Chocolate Croissant"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as DisplayCaseCategory)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Price ($) *
              </label>
              <input
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                step="0.01"
                min="0"
                placeholder="3.50"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Current Quantity
              </label>
              <input
                type="number"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                min="0"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Par Level (min on display)
              </label>
              <input
                type="number"
                value={formParLevel}
                onChange={(e) => setFormParLevel(e.target.value)}
                min="0"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Shelf Life (hours)
              </label>
              <input
                type="number"
                value={formShelfLife}
                onChange={(e) => setFormShelfLife(e.target.value)}
                min="1"
                placeholder="e.g. 24"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Allergens (comma-separated)
              </label>
              <input
                type="text"
                value={formAllergens}
                onChange={(e) => setFormAllergens(e.target.value)}
                placeholder="e.g. gluten, dairy, eggs"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
              />
            </div>
          </div>
          <button
            onClick={handleAddProduct}
            disabled={isPending || !formName.trim() || !formPrice.trim()}
            className="mt-3 rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? 'Adding...' : 'Add Product'}
          </button>
        </div>
      )}

      {/* Product Grid */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No items in the display case.</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Add products to start tracking your display case.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const isLow = item.is_low_stock
            const isEmpty = item.current_quantity === 0
            const isStale = item.freshness_status === 'stale'

            let borderClass = 'border-gray-200 dark:border-gray-700'
            if (isEmpty || isStale) borderClass = 'border-red-300 dark:border-red-700'
            else if (isLow) borderClass = 'border-yellow-300 dark:border-yellow-700'

            return (
              <div
                key={item.id}
                className={`rounded-lg border bg-white p-4 dark:bg-gray-800 ${borderClass}`}
              >
                {/* Header */}
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {item.product_name}
                    </h4>
                    <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
                      {item.category}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {formatPrice(item.price_cents)}
                  </span>
                </div>

                {/* Freshness */}
                {item.baked_at && (
                  <FreshnessIndicator
                    status={item.freshness_status || 'fresh'}
                    hours={item.hours_since_baked ?? null}
                  />
                )}

                {/* Quantity display */}
                <div className="my-3 flex items-center justify-between">
                  <div>
                    <span
                      className={`text-3xl font-bold ${isEmpty ? 'text-red-500' : isLow ? 'text-yellow-500' : 'text-gray-900 dark:text-white'}`}
                    >
                      {item.current_quantity}
                    </span>
                    <span className="ml-1 text-sm text-gray-400">/ {item.par_level} par</span>
                  </div>
                </div>

                {/* Alerts */}
                {isEmpty && <p className="mb-2 text-xs font-medium text-red-500">OUT OF STOCK</p>}
                {isLow && !isEmpty && (
                  <p className="mb-2 text-xs font-medium text-yellow-500">LOW STOCK</p>
                )}
                {isStale && (
                  <p className="mb-2 text-xs font-medium text-red-500">PAST SHELF LIFE</p>
                )}

                {/* Allergens */}
                {item.allergens && item.allergens.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {item.allergens.map((a) => (
                      <span
                        key={a}
                        className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900 dark:text-red-300"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSoldOne(item.id)}
                    disabled={isPending || item.current_quantity === 0}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => handleAddOne(item.id)}
                    disabled={isPending}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => {
                      setRestockId(restockId === item.id ? null : item.id)
                      setRestockQty('1')
                    }}
                    disabled={isPending}
                    className="flex-1 rounded-md bg-blue-100 px-2 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                  >
                    Restock
                  </button>
                </div>

                {/* Restock form */}
                {restockId === item.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      min="1"
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRestock(item.id)}
                      disabled={isPending}
                      className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                )}

                {/* Manage mode: delete */}
                {showManage && (
                  <button
                    onClick={() => handleDeleteProduct(item.id)}
                    disabled={isPending}
                    className="mt-2 w-full rounded-md border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:hover:bg-red-900/20"
                  >
                    Remove Product
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
