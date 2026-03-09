// Shopping Mode Client Component
// Mobile-optimized: large tap targets, category grouping, check-off items,
// running totals, optional price entry, wake lock to keep screen on

'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  toggleItem,
  updateItemPrice,
  completeShoppingList,
  convertToExpense,
} from '@/lib/shopping/actions'
import { SHOPPING_CATEGORIES } from '@/lib/shopping/constants'
import type { ShoppingList, ShoppingItem } from '@/lib/shopping/actions'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  DollarSign,
  ShoppingCart,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  initialList: ShoppingList
}

export function ShoppingModeClient({ initialList }: Props) {
  const router = useRouter()
  const [list, setList] = useState(initialList)
  const [isPending, startTransition] = useTransition()
  const [editingPrice, setEditingPrice] = useState<number | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const isCompleted = list.status === 'completed'

  // Wake lock: keep screen on while actively shopping
  useEffect(() => {
    if (isCompleted) return

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Wake lock not supported or denied, that is fine
      }
    }

    requestWakeLock()

    // Re-acquire on visibility change (e.g. switching back to tab)
    function handleVisibility() {
      if (document.visibilityState === 'visible' && !isCompleted) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
    }
  }, [isCompleted])

  // Group items by category
  const grouped = groupByCategory(list.items)

  // Stats
  const totalItems = list.items.length
  const checkedItems = list.items.filter((i) => i.checked).length
  const estimatedTotal = list.items.reduce(
    (sum, i) => sum + (i.estimated_price_cents || 0),
    0
  )
  const actualTotal = list.items.reduce(
    (sum, i) => sum + (i.actual_price_cents || 0),
    0
  )
  const hasActualPrices = list.items.some((i) => i.actual_price_cents != null)

  // Find the original (flat) index for a grouped item
  const getOriginalIndex = useCallback(
    (item: ShoppingItem): number => {
      return list.items.indexOf(item)
    },
    [list.items]
  )

  function handleToggle(item: ShoppingItem) {
    if (isCompleted) return
    const idx = getOriginalIndex(item)
    if (idx === -1) return

    // Optimistic update
    const previousItems = [...list.items]
    const updatedItems = [...list.items]
    updatedItems[idx] = { ...updatedItems[idx], checked: !updatedItems[idx].checked }
    setList((prev) => ({ ...prev, items: updatedItems }))

    startTransition(async () => {
      try {
        await toggleItem(list.id, idx)
      } catch (err) {
        setList((prev) => ({ ...prev, items: previousItems }))
        toast.error('Failed to update item')
      }
    })
  }

  function handlePriceSubmit(item: ShoppingItem) {
    const idx = getOriginalIndex(item)
    if (idx === -1) return

    const cents = Math.round(parseFloat(priceInput) * 100)
    if (isNaN(cents) || cents <= 0) {
      toast.error('Please enter a valid price')
      return
    }

    // Optimistic update
    const previousItems = [...list.items]
    const updatedItems = [...list.items]
    updatedItems[idx] = { ...updatedItems[idx], actual_price_cents: cents }
    setList((prev) => ({ ...prev, items: updatedItems }))
    setEditingPrice(null)
    setPriceInput('')

    startTransition(async () => {
      try {
        await updateItemPrice(list.id, idx, cents)
      } catch (err) {
        setList((prev) => ({ ...prev, items: previousItems }))
        toast.error('Failed to update price')
      }
    })
  }

  function handleComplete() {
    startTransition(async () => {
      try {
        await completeShoppingList(list.id)
        setList((prev) => ({
          ...prev,
          status: 'completed' as const,
          completed_at: new Date().toISOString(),
        }))
        toast.success('Shopping list completed!')
      } catch (err) {
        toast.error('Failed to complete list')
      }
    })
  }

  function handleConvertToExpense() {
    startTransition(async () => {
      try {
        await convertToExpense(list.id)
        toast.success('Expense created from shopping list')
        router.push('/expenses')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to create expense'
        )
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/shopping"
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold truncate flex-1 mx-3">{list.name}</h1>
          {isCompleted && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              Done
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
            {checkedItems}/{totalItems}
          </span>
        </div>

        {/* Totals bar */}
        <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
          {estimatedTotal > 0 && (
            <span>Est: {formatCurrency(estimatedTotal)}</span>
          )}
          {hasActualPrices && actualTotal > 0 && (
            <span className="font-medium text-gray-800">
              Actual: {formatCurrency(actualTotal)}
            </span>
          )}
        </div>
      </div>

      {/* Items by category */}
      <div className="px-4 pt-4">
        {grouped.map(({ category, unchecked, checked }) => {
          if (unchecked.length === 0 && checked.length === 0) return null

          return (
            <div key={category} className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 sticky top-[110px] bg-white py-1 z-[5]">
                {category}
                <span className="ml-2 text-gray-400">
                  ({unchecked.length + checked.length})
                </span>
              </h2>

              {/* Unchecked items first */}
              <div className="space-y-1">
                {unchecked.map((item) => (
                  <ShoppingItemRow
                    key={`${item.name}-${getOriginalIndex(item)}`}
                    item={item}
                    originalIndex={getOriginalIndex(item)}
                    isCompleted={isCompleted}
                    editingPrice={editingPrice}
                    priceInput={priceInput}
                    onToggle={() => handleToggle(item)}
                    onStartPriceEdit={(idx) => {
                      setEditingPrice(idx)
                      setPriceInput(
                        item.actual_price_cents
                          ? (item.actual_price_cents / 100).toFixed(2)
                          : ''
                      )
                    }}
                    onPriceChange={setPriceInput}
                    onPriceSubmit={() => handlePriceSubmit(item)}
                    onPriceCancel={() => {
                      setEditingPrice(null)
                      setPriceInput('')
                    }}
                  />
                ))}
              </div>

              {/* Checked items at bottom of category, dimmed */}
              {checked.length > 0 && (
                <div className="mt-1 space-y-1 opacity-50">
                  {checked.map((item) => (
                    <ShoppingItemRow
                      key={`${item.name}-${getOriginalIndex(item)}-checked`}
                      item={item}
                      originalIndex={getOriginalIndex(item)}
                      isCompleted={isCompleted}
                      editingPrice={editingPrice}
                      priceInput={priceInput}
                      onToggle={() => handleToggle(item)}
                      onStartPriceEdit={(idx) => {
                        setEditingPrice(idx)
                        setPriceInput(
                          item.actual_price_cents
                            ? (item.actual_price_cents / 100).toFixed(2)
                            : ''
                        )
                      }}
                      onPriceChange={setPriceInput}
                      onPriceSubmit={() => handlePriceSubmit(item)}
                      onPriceCancel={() => {
                        setEditingPrice(null)
                        setPriceInput('')
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-20">
        <div className="max-w-2xl mx-auto">
          {!isCompleted ? (
            <Button
              variant="primary"
              onClick={handleComplete}
              disabled={isPending}
              className="w-full py-4 text-lg flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-5 w-5" />
              {isPending ? 'Finishing...' : 'Done Shopping'}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="text-center text-sm text-gray-500 mb-2">
                Completed{' '}
                {list.completed_at
                  ? new Date(list.completed_at).toLocaleDateString()
                  : ''}
              </div>
              <Button
                variant="primary"
                onClick={handleConvertToExpense}
                disabled={isPending}
                className="w-full py-3 flex items-center justify-center gap-2"
              >
                <DollarSign className="h-5 w-5" />
                {isPending ? 'Creating...' : 'Convert to Expense'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Item Row Component ---

type ItemRowProps = {
  item: ShoppingItem
  originalIndex: number
  isCompleted: boolean
  editingPrice: number | null
  priceInput: string
  onToggle: () => void
  onStartPriceEdit: (idx: number) => void
  onPriceChange: (val: string) => void
  onPriceSubmit: () => void
  onPriceCancel: () => void
}

function ShoppingItemRow({
  item,
  originalIndex,
  isCompleted,
  editingPrice,
  priceInput,
  onToggle,
  onStartPriceEdit,
  onPriceChange,
  onPriceSubmit,
  onPriceCancel,
}: ItemRowProps) {
  const isEditingThis = editingPrice === originalIndex

  return (
    <div
      className={`flex items-center gap-3 py-3 px-3 rounded-lg border transition-colors ${
        item.checked
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Checkbox - large tap target */}
      <button
        onClick={onToggle}
        disabled={isCompleted}
        className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
          item.checked
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-green-400'
        }`}
        aria-label={item.checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
      >
        {item.checked && <Check className="h-5 w-5" />}
      </button>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div
          className={`font-medium text-base ${
            item.checked ? 'line-through text-gray-400' : 'text-gray-900'
          }`}
        >
          {item.name}
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
          {item.quantity != null && (
            <span>
              {item.quantity} {item.unit || ''}
            </span>
          )}
          {item.estimated_price_cents != null && (
            <span className="text-gray-400">
              ~{formatCurrency(item.estimated_price_cents)}
            </span>
          )}
          {item.notes && (
            <span className="italic text-gray-400">{item.notes}</span>
          )}
        </div>
      </div>

      {/* Price edit / display */}
      {!isCompleted && (
        <div className="flex-shrink-0">
          {isEditingThis ? (
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={priceInput}
                onChange={(e) => onPriceChange(e.target.value)}
                className="w-16 px-1 py-1 border rounded text-sm text-right"
                placeholder="0.00"
                step="0.01"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onPriceSubmit()
                  if (e.key === 'Escape') onPriceCancel()
                }}
              />
              <button
                onClick={onPriceSubmit}
                className="p-1 text-green-600 hover:text-green-700"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={onPriceCancel}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onStartPriceEdit(originalIndex)}
              className="text-sm px-2 py-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              title="Enter actual price"
            >
              {item.actual_price_cents != null
                ? formatCurrency(item.actual_price_cents)
                : '$?'}
            </button>
          )}
        </div>
      )}

      {/* Show actual price on completed lists */}
      {isCompleted && item.actual_price_cents != null && (
        <span className="text-sm font-medium text-gray-600">
          {formatCurrency(item.actual_price_cents)}
        </span>
      )}
    </div>
  )
}

// --- Helpers ---

type GroupedCategory = {
  category: string
  unchecked: ShoppingItem[]
  checked: ShoppingItem[]
}

function groupByCategory(items: ShoppingItem[]): GroupedCategory[] {
  const categoryMap = new Map<string, { unchecked: ShoppingItem[]; checked: ShoppingItem[] }>()

  // Initialize all standard categories in order
  for (const cat of SHOPPING_CATEGORIES) {
    categoryMap.set(cat, { unchecked: [], checked: [] })
  }

  for (const item of items) {
    const cat = item.category || 'Other'
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { unchecked: [], checked: [] })
    }
    const group = categoryMap.get(cat)!
    if (item.checked) {
      group.checked.push(item)
    } else {
      group.unchecked.push(item)
    }
  }

  // Return in category order, only non-empty categories
  const result: GroupedCategory[] = []
  for (const [category, { unchecked, checked }] of categoryMap) {
    if (unchecked.length > 0 || checked.length > 0) {
      result.push({ category, unchecked, checked })
    }
  }

  return result
}
