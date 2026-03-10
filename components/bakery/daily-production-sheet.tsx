'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import {
  generateDailySheet,
  getParStockItems,
  createParStockItem,
  updateParStockItem,
  deleteParStockItem,
  markProductionComplete,
  updateProductionItemStatus,
  getDailyProductionSummary,
  type ProductionItem,
  type ParStockItem,
  type ProductionItemStatus,
  type DailyProductionSummary,
} from '@/lib/bakery/daily-production-actions'

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function StatusBadge({ status }: { status: ProductionItemStatus }) {
  const colors: Record<ProductionItemStatus, string> = {
    pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    skipped: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  }
  const labels: Record<ProductionItemStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    done: 'Done',
    skipped: 'Skipped',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {labels[status]}
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    par_stock: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    custom_order: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    batch: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  }
  const labels: Record<string, string> = {
    par_stock: 'Par Stock',
    custom_order: 'Custom Order',
    batch: 'Batch',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[source] || 'bg-gray-100 text-gray-700'}`}
    >
      {labels[source] || source}
    </span>
  )
}

function ProgressBar({ summary }: { summary: DailyProductionSummary }) {
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {summary.completedItems} of {summary.totalItems} items complete ({summary.percentComplete}
          %)
        </span>
        {summary.inProgressItems > 0 && (
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {summary.inProgressItems} in progress
          </span>
        )}
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-300"
          style={{ width: `${summary.percentComplete}%` }}
        />
      </div>
    </div>
  )
}

export default function DailyProductionSheet() {
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()))
  const [items, setItems] = useState<ProductionItem[]>([])
  const [summary, setSummary] = useState<DailyProductionSummary | null>(null)
  const [parStock, setParStock] = useState<ParStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showParStockForm, setShowParStockForm] = useState(false)
  const [showManageParStock, setShowManageParStock] = useState(false)
  const [completeItemId, setCompleteItemId] = useState<string | null>(null)
  const [actualQuantity, setActualQuantity] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  // Par stock form state
  const [newParName, setNewParName] = useState('')
  const [newParQuantity, setNewParQuantity] = useState('1')
  const [newParPriority, setNewParPriority] = useState('50')
  const [newParNotes, setNewParNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sheetResult, summaryResult] = await Promise.all([
        generateDailySheet(selectedDate),
        getDailyProductionSummary(selectedDate),
      ])

      if (sheetResult.error) {
        setError(sheetResult.error)
      } else {
        setItems(sheetResult.data || [])
      }

      if (summaryResult.data) {
        setSummary(summaryResult.data)
      }
    } catch (err) {
      setError('Failed to load production sheet')
      console.error('[DailyProductionSheet] Load error', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  const loadParStock = useCallback(async () => {
    const result = await getParStockItems()
    if (result.data) setParStock(result.data)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (showManageParStock) loadParStock()
  }, [showManageParStock, loadParStock])

  const handleStatusChange = (itemId: string, newStatus: ProductionItemStatus) => {
    if (newStatus === 'done') {
      setCompleteItemId(itemId)
      const item = items.find((i) => i.id === itemId)
      setActualQuantity(String(item?.planned_quantity || 0))
      return
    }

    const previousItems = [...items]
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i)))

    startTransition(async () => {
      try {
        const result = await updateProductionItemStatus(itemId, newStatus)
        if (result.error) {
          setItems(previousItems)
          setError(result.error)
        } else {
          const summaryResult = await getDailyProductionSummary(selectedDate)
          if (summaryResult.data) setSummary(summaryResult.data)
        }
      } catch {
        setItems(previousItems)
        setError('Failed to update status')
      }
    })
  }

  const handleMarkComplete = (itemId: string) => {
    const qty = parseInt(actualQuantity, 10)
    if (isNaN(qty) || qty < 0) {
      setError('Please enter a valid quantity')
      return
    }

    const previousItems = [...items]
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, status: 'done' as ProductionItemStatus, actual_quantity: qty } : i
      )
    )
    setCompleteItemId(null)

    startTransition(async () => {
      try {
        const result = await markProductionComplete(itemId, { actual_quantity: qty })
        if (result.error) {
          setItems(previousItems)
          setError(result.error)
        } else {
          const summaryResult = await getDailyProductionSummary(selectedDate)
          if (summaryResult.data) setSummary(summaryResult.data)
        }
      } catch {
        setItems(previousItems)
        setError('Failed to mark complete')
      }
    })
  }

  const handleAddParStock = () => {
    if (!newParName.trim()) return

    startTransition(async () => {
      try {
        const result = await createParStockItem({
          product_name: newParName.trim(),
          quantity: parseInt(newParQuantity, 10) || 1,
          priority: parseInt(newParPriority, 10) || 50,
          notes: newParNotes.trim() || null,
        })
        if (result.error) {
          setError(result.error)
        } else {
          setNewParName('')
          setNewParQuantity('1')
          setNewParPriority('50')
          setNewParNotes('')
          setShowParStockForm(false)
          await loadParStock()
        }
      } catch {
        setError('Failed to add par stock item')
      }
    })
  }

  const handleDeleteParStock = (id: string) => {
    const previous = [...parStock]
    setParStock((prev) => prev.filter((i) => i.id !== id))

    startTransition(async () => {
      try {
        const result = await deleteParStockItem(id)
        if (result.error) {
          setParStock(previous)
          setError(result.error)
        }
      } catch {
        setParStock(previous)
        setError('Failed to delete par stock item')
      }
    })
  }

  const handlePrint = () => {
    window.print()
  }

  // Group items by source type
  const grouped = {
    custom_order: items.filter((i) => i.source_type === 'custom_order'),
    par_stock: items.filter((i) => i.source_type === 'par_stock'),
    batch: items.filter((i) => i.source_type === 'batch'),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <label
            htmlFor="production-date"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Date:
          </label>
          <input
            id="production-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={() => setSelectedDate(formatDate(new Date()))}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManageParStock(!showManageParStock)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Manage Par Stock
          </button>
          <button
            onClick={handlePrint}
            className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
          >
            Print
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Daily Production Sheet</h1>
        <p className="text-gray-600">{selectedDate}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Progress */}
      {summary && summary.totalItems > 0 && <ProgressBar summary={summary} />}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No production items for this date.</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Add par stock items or create bakery orders to populate the sheet.
          </p>
        </div>
      )}

      {/* Custom Orders Section */}
      {grouped.custom_order.length > 0 && (
        <ProductionSection
          title="Custom Orders"
          items={grouped.custom_order}
          onStatusChange={handleStatusChange}
          completeItemId={completeItemId}
          actualQuantity={actualQuantity}
          onActualQuantityChange={setActualQuantity}
          onMarkComplete={handleMarkComplete}
          onCancelComplete={() => setCompleteItemId(null)}
          isPending={isPending}
        />
      )}

      {/* Par Stock Section */}
      {grouped.par_stock.length > 0 && (
        <ProductionSection
          title="Par Stock (Daily Production)"
          items={grouped.par_stock}
          onStatusChange={handleStatusChange}
          completeItemId={completeItemId}
          actualQuantity={actualQuantity}
          onActualQuantityChange={setActualQuantity}
          onMarkComplete={handleMarkComplete}
          onCancelComplete={() => setCompleteItemId(null)}
          isPending={isPending}
        />
      )}

      {/* Batch Production Section */}
      {grouped.batch.length > 0 && (
        <ProductionSection
          title="Batch Production"
          items={grouped.batch}
          onStatusChange={handleStatusChange}
          completeItemId={completeItemId}
          actualQuantity={actualQuantity}
          onActualQuantityChange={setActualQuantity}
          onMarkComplete={handleMarkComplete}
          onCancelComplete={() => setCompleteItemId(null)}
          isPending={isPending}
        />
      )}

      {/* Manage Par Stock Panel */}
      {showManageParStock && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 print:hidden">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Par Stock Items</h3>
            <button
              onClick={() => setShowParStockForm(!showParStockForm)}
              className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
            >
              {showParStockForm ? 'Cancel' : 'Add Item'}
            </button>
          </div>

          {showParStockForm && (
            <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={newParName}
                    onChange={(e) => setNewParName(e.target.value)}
                    placeholder="e.g. Baguettes"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Daily Quantity
                  </label>
                  <input
                    type="number"
                    value={newParQuantity}
                    onChange={(e) => setNewParQuantity(e.target.value)}
                    min="1"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Priority (1=first, 100=last)
                  </label>
                  <input
                    type="number"
                    value={newParPriority}
                    onChange={(e) => setNewParPriority(e.target.value)}
                    min="1"
                    max="100"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={newParNotes}
                    onChange={(e) => setNewParNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <button
                onClick={handleAddParStock}
                disabled={isPending || !newParName.trim()}
                className="mt-3 rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}

          {parStock.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No par stock items yet. Add items that should be produced every day.
            </p>
          ) : (
            <div className="space-y-2">
              {parStock.map((ps) => (
                <div
                  key={ps.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-600"
                >
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {ps.product_name}
                    </span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      x{ps.quantity} (priority: {ps.priority})
                    </span>
                    {ps.notes && (
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                        {ps.notes}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteParStock(ps.id)}
                    disabled={isPending}
                    className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- Reusable section component ---

function ProductionSection({
  title,
  items,
  onStatusChange,
  completeItemId,
  actualQuantity,
  onActualQuantityChange,
  onMarkComplete,
  onCancelComplete,
  isPending,
}: {
  title: string
  items: ProductionItem[]
  onStatusChange: (id: string, status: ProductionItemStatus) => void
  completeItemId: string | null
  actualQuantity: string
  onActualQuantityChange: (val: string) => void
  onMarkComplete: (id: string) => void
  onCancelComplete: () => void
  isPending: boolean
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-4 py-3">
            {/* Checkbox area */}
            <div className="print:hidden">
              {item.status === 'done' ? (
                <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-green-500 bg-green-500 text-white">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <button
                  onClick={() => onStatusChange(item.id, 'done')}
                  className="flex h-5 w-5 items-center justify-center rounded border-2 border-gray-300 hover:border-green-400 dark:border-gray-500"
                  title="Mark complete"
                />
              )}
            </div>

            {/* Print checkbox */}
            <div className="hidden print:block">
              <div className="h-4 w-4 border border-gray-400" />
            </div>

            {/* Item details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`font-medium ${
                    item.status === 'done'
                      ? 'text-gray-400 line-through dark:text-gray-500'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {item.product_name}
                </span>
                <SourceBadge source={item.source_type} />
                <StatusBadge status={item.status} />
              </div>
              {item.notes && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.notes}</p>
              )}
            </div>

            {/* Quantity */}
            <div className="text-right">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                x{item.actual_quantity ?? item.planned_quantity}
              </span>
              {item.actual_quantity !== null && item.actual_quantity !== item.planned_quantity && (
                <span className="ml-1 text-xs text-gray-400">
                  (planned: {item.planned_quantity})
                </span>
              )}
            </div>

            {/* Status actions */}
            <div className="flex items-center gap-1 print:hidden">
              {item.status === 'pending' && (
                <button
                  onClick={() => onStatusChange(item.id, 'in_progress')}
                  disabled={isPending}
                  className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                >
                  Start
                </button>
              )}
              {item.status === 'in_progress' && (
                <button
                  onClick={() => onStatusChange(item.id, 'done')}
                  disabled={isPending}
                  className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
                >
                  Done
                </button>
              )}
              {item.status !== 'done' && item.status !== 'skipped' && (
                <button
                  onClick={() => onStatusChange(item.id, 'skipped')}
                  disabled={isPending}
                  className="rounded-md px-2 py-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  Skip
                </button>
              )}
            </div>

            {/* Complete modal inline */}
            {completeItemId === item.id && (
              <div className="flex items-center gap-2 print:hidden">
                <input
                  type="number"
                  value={actualQuantity}
                  onChange={(e) => onActualQuantityChange(e.target.value)}
                  min="0"
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-500 dark:bg-gray-600 dark:text-white"
                  placeholder="Qty"
                  autoFocus
                />
                <button
                  onClick={() => onMarkComplete(item.id)}
                  disabled={isPending}
                  className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={onCancelComplete}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
