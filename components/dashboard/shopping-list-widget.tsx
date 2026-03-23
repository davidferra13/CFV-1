'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Check, CheckSquare, Square } from '@/components/ui/icons'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

export interface ShoppingItem {
  id: string
  name: string
  quantity: string
  category: string
  purchased: boolean
  eventOccasion: string
  eventId: string
  substituteNote?: string
}

export interface ShoppingListWidgetProps {
  items: ShoppingItem[]
  eventLabel: string
  consolidatedEvents?: string[]
}

// ============================================
// Constants
// ============================================

const STORE_WALK_ORDER = [
  'Produce',
  'Protein',
  'Seafood',
  'Dairy',
  'Bakery',
  'Pantry',
  'Frozen',
  'Other',
] as const

type Category = (typeof STORE_WALK_ORDER)[number]

function normalizeCategory(raw: string): Category {
  const lower = raw.toLowerCase().trim()
  for (const cat of STORE_WALK_ORDER) {
    if (cat.toLowerCase() === lower) return cat
  }
  return 'Other'
}

// ============================================
// Component
// ============================================

export function ShoppingListWidget({
  items: initialItems,
  eventLabel,
  consolidatedEvents,
}: ShoppingListWidgetProps) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems)
  const [groupBy, setGroupBy] = useState<'aisle' | 'event'>('aisle')
  const [isPending, startTransition] = useTransition()

  const purchasedCount = items.filter((i) => i.purchased).length
  const totalCount = items.length
  const allDone = totalCount > 0 && purchasedCount === totalCount
  const progressPercent = totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0

  // Toggle a single item with optimistic update + rollback
  function handleToggle(itemId: string) {
    const previous = [...items]
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, purchased: !i.purchased } : i)))

    startTransition(async () => {
      try {
        const { toggleShoppingItem } = await import('@/lib/dashboard/widget-actions')
        const toggled = items.find((i) => i.id === itemId)
        await toggleShoppingItem(itemId, !toggled?.purchased)
      } catch {
        setItems(previous)
        toast.error('Failed to update shopping item')
      }
    })
  }

  // Group items by category (store-walk order)
  function groupByAisle(): { category: Category; items: ShoppingItem[] }[] {
    const map = new Map<Category, ShoppingItem[]>()
    for (const item of items) {
      const cat = normalizeCategory(item.category)
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return STORE_WALK_ORDER.filter((cat) => map.has(cat)).map((cat) => ({
      category: cat,
      items: map.get(cat)!,
    }))
  }

  // Group items by event
  function groupByEvent(): { event: string; eventId: string; items: ShoppingItem[] }[] {
    const map = new Map<string, { event: string; eventId: string; items: ShoppingItem[] }>()
    for (const item of items) {
      const key = item.eventId
      if (!map.has(key)) {
        map.set(key, { event: item.eventOccasion, eventId: item.eventId, items: [] })
      }
      map.get(key)!.items.push(item)
    }
    return Array.from(map.values())
  }

  if (totalCount === 0) return null

  return (
    <Card className="border-stone-700 bg-stone-800">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-stone-400" weight="bold" />
            <h3 className="text-sm font-semibold text-stone-100">Shopping List</h3>
          </div>
          <span className="text-xs text-stone-500">{eventLabel}</span>
        </div>

        {/* Consolidated events note */}
        {consolidatedEvents && consolidatedEvents.length > 1 && (
          <p className="text-xs text-stone-500 mb-3">
            Combined from {consolidatedEvents.length} events
          </p>
        )}

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-stone-400">
              {purchasedCount} of {totalCount} items
            </span>
            <span className="text-xs font-medium text-stone-300">{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-stone-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                allDone ? 'bg-green-500' : 'bg-brand-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Completion state */}
        {allDone && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-4">
            <Check className="h-5 w-5 text-green-400" weight="bold" />
            <p className="text-sm font-medium text-green-300">All items purchased</p>
          </div>
        )}

        {/* Grouping toggle */}
        <div className="flex gap-1 mb-3">
          <Button
            variant={groupBy === 'aisle' ? 'primary' : 'ghost'}
            className="text-xs h-7 px-3"
            onClick={() => setGroupBy('aisle')}
          >
            By aisle
          </Button>
          <Button
            variant={groupBy === 'event' ? 'primary' : 'ghost'}
            className="text-xs h-7 px-3"
            onClick={() => setGroupBy('event')}
          >
            By event
          </Button>
        </div>

        {/* Item list - grouped by aisle */}
        {groupBy === 'aisle' && (
          <div className="space-y-4">
            {groupByAisle().map((group) => (
              <div key={group.category}>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                  {group.category}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      disabled={isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Item list - grouped by event */}
        {groupBy === 'event' && (
          <div className="space-y-4">
            {groupByEvent().map((group) => (
              <div key={group.eventId}>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                  {group.event}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      disabled={isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// Single item row (44px minimum touch target)
// ============================================

function ShoppingItemRow({
  item,
  onToggle,
  disabled,
}: {
  item: ShoppingItem
  onToggle: (id: string) => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      disabled={disabled}
      className="flex items-center gap-3 w-full text-left rounded-md px-2 hover:bg-stone-700/50 transition-colors disabled:opacity-50"
      style={{ minHeight: '44px' }}
    >
      {/* Checkbox icon */}
      <span className="shrink-0">
        {item.purchased ? (
          <CheckSquare className="h-5 w-5 text-green-400" weight="fill" />
        ) : (
          <Square className="h-5 w-5 text-stone-500" weight="regular" />
        )}
      </span>

      {/* Item details */}
      <div className="min-w-0 flex-1">
        <span
          className={`text-sm ${item.purchased ? 'text-stone-500 line-through' : 'text-stone-200'}`}
        >
          {item.name}
        </span>
        {item.substituteNote && (
          <p className="text-xs text-amber-400/80 truncate">{item.substituteNote}</p>
        )}
      </div>

      {/* Quantity */}
      <span className="text-xs text-stone-500 shrink-0">{item.quantity}</span>
    </button>
  )
}
