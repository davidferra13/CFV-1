'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  generateShoppingList,
  createPurchaseOrderFromShoppingList,
  getUpcomingEventsForShopping,
  getChefVendors,
  type ShoppingListResult,
  type ShoppingEventOption,
} from '@/lib/culinary/shopping-list-actions'
import { splitListByStore, type StoreSplit } from '@/lib/grocery/store-shopping-actions'
import { WebSourcingPanel } from '@/components/pricing/web-sourcing-panel'
import { ExportToolbar } from '@/components/shopping/export-toolbar'
import { VendorSublist } from '@/components/shopping/vendor-sublist'
import { ShoppingHistory } from '@/components/shopping/shopping-history'
import { QuickExitLink } from '@/components/exit-links/QuickExitLink'
import { ExitLinkButton } from '@/components/exit-links/ExitLinkButton'
import { getIngredientContext } from '@/lib/exit-links/context-helpers'

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

// ---------------------------------------------------------------------------
// ShoppingListRow
// Per-item row with inline sourcing panel for unassigned/unpriced items.
// When a chef needs to buy something but has no supplier or price data,
// the sourcing panel fires automatically to show where to buy it.
// ---------------------------------------------------------------------------

type ShoppingItem = ShoppingListResult['items'][number]

function ShoppingListRow({
  item,
  isHaveThis,
  onHaveThis,
  onHandOverride,
  onOnHandChange,
}: {
  item: ShoppingItem
  isHaveThis?: boolean
  onHaveThis?: () => void
  onHandOverride?: number
  onOnHandChange?: (value: number) => void
}) {
  const needsSourcing = item.supplier === 'Unassigned' && item.estimatedCostCents === 0
  const [showSourcing, setShowSourcing] = useState(false)
  const [editingOnHand, setEditingOnHand] = useState(false)

  const ingredientCtx = getIngredientContext({ name: item.ingredientName })

  return (
    <>
      <tr className={`border-b border-stone-800 ${isHaveThis ? 'opacity-40 line-through' : ''}`}>
        <td className="px-2 py-2 text-stone-100">
          <div className="flex items-center gap-2">
            {item.ingredientName}
            {needsSourcing && item.toBuy > 0 && (
              <button
                type="button"
                onClick={() => setShowSourcing((v) => !v)}
                className="text-xs text-brand-400 hover:text-brand-300 underline shrink-0"
              >
                {showSourcing ? 'Hide' : 'Find it'}
              </button>
            )}
            {item.toBuy > 0 && (
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <QuickExitLink exitId={1} context={ingredientCtx}>
                  Buy
                </QuickExitLink>
                <QuickExitLink exitId={4} context={ingredientCtx}>
                  Wholesale
                </QuickExitLink>
                <QuickExitLink exitId={2} context={ingredientCtx}>
                  Price
                </QuickExitLink>
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500">
            {item.category} · {item.supplier}
            {item.priceStore && (
              <span className="ml-1 text-stone-600">
                · priced at {item.priceStore.split(' ').slice(0, 2).join(' ')}
              </span>
            )}
          </p>
          {item.eventBreakdown && item.eventBreakdown.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.eventBreakdown.map((b) => (
                <span key={b.eventId} className="text-[10px] text-stone-600">
                  {b.eventLabel}: {b.quantityForEvent.toFixed(1)} {item.unit}
                </span>
              ))}
            </div>
          )}
          {item.dietaryWarnings && item.dietaryWarnings.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.dietaryWarnings.map((w, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    w.severity === 'anaphylaxis'
                      ? 'bg-red-900/60 text-red-200'
                      : w.severity === 'allergy'
                        ? 'bg-amber-900/50 text-amber-200'
                        : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {w.clientName}: {w.allergen}
                </span>
              ))}
            </div>
          )}
        </td>
        <td className="px-2 py-2 text-right text-stone-300">
          {item.totalRequired.toFixed(2)} {item.unit}
        </td>
        <td className="px-2 py-2 text-right text-stone-300">
          {editingOnHand ? (
            <input
              type="number"
              step="0.1"
              title="Override on-hand quantity"
              defaultValue={onHandOverride ?? item.onHand}
              onBlur={(e) => {
                onOnHandChange?.(Number(e.target.value) || 0)
                setEditingOnHand(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onOnHandChange?.(Number((e.target as HTMLInputElement).value) || 0)
                  setEditingOnHand(false)
                }
              }}
              autoFocus
              className="w-16 rounded border border-stone-600 bg-stone-900 px-1 py-0.5 text-right text-xs"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingOnHand(true)}
              className="hover:text-brand-400 cursor-pointer"
              title="Click to override on-hand quantity"
            >
              {item.onHand.toFixed(2)} {item.unit}
            </button>
          )}
        </td>
        <td
          className={`px-2 py-2 text-right font-medium ${
            item.toBuy > 0 ? 'text-red-600' : 'text-green-700'
          }`}
        >
          {item.toBuy.toFixed(2)} {item.unit}
        </td>
        <td className="px-2 py-2 text-right text-stone-300">
          {formatCurrency(item.estimatedCostCents)}
        </td>
        <td className="px-2 py-2 text-right">
          <button
            type="button"
            onClick={onHaveThis}
            className={`text-xs px-2 py-0.5 rounded ${
              isHaveThis
                ? 'bg-green-900/50 text-green-300'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title={isHaveThis ? 'Undo: I need this' : 'I have this (skip buying)'}
          >
            {isHaveThis ? 'Have it' : 'I have this'}
          </button>
        </td>
      </tr>
      {showSourcing && (
        <tr className="border-b border-stone-800 bg-stone-950">
          <td colSpan={6} className="px-3 py-3">
            <WebSourcingPanel query={item.ingredientName} label="Where to buy" />
          </td>
        </tr>
      )}
    </>
  )
}

type Props = {
  initialResult: ShoppingListResult
  initialEventIds?: string[]
  initialEvents?: ShoppingEventOption[]
}

export function ShoppingListGenerator({ initialResult, initialEventIds, initialEvents }: Props) {
  const router = useRouter()
  const [result, setResult] = useState(initialResult)
  const [startDate, setStartDate] = useState(initialResult.startDate)
  const [endDate, setEndDate] = useState(initialResult.endDate)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    new Set(initialEventIds ?? [])
  )
  const [availableEvents, setAvailableEvents] = useState<ShoppingEventOption[]>(initialEvents ?? [])
  const [showEventPicker, setShowEventPicker] = useState(false)
  const [groupBy, setGroupBy] = useState<'category' | 'supplier' | 'store'>('category')
  const [showShortagesOnly, setShowShortagesOnly] = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [storeSplits, setStoreSplits] = useState<{
    splits: StoreSplit[]
    unassigned: { name: string; quantity: number | string; unit: string }[]
  } | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'vendors' | 'history'>('list')
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])
  const [vendorsLoaded, setVendorsLoaded] = useState(false)
  const [onHandOverrides, setOnHandOverrides] = useState<Map<string, number>>(new Map())
  const [haveThisSet, setHaveThisSet] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const adjustedItems = useMemo(() => {
    return result.items.map((item) => {
      if (haveThisSet.has(item.ingredientId)) {
        return { ...item, toBuy: 0, onHand: item.totalRequired }
      }
      const override = onHandOverrides.get(item.ingredientId)
      if (override !== undefined) {
        const newToBuy = Math.max(0, item.totalRequired - override)
        return { ...item, onHand: override, toBuy: newToBuy }
      }
      return item
    })
  }, [result.items, onHandOverrides, haveThisSet])

  const filteredItems = useMemo(() => {
    return adjustedItems.filter((item) => {
      if (showShortagesOnly && item.toBuy <= 0) return false
      if (selectedSupplier && item.supplier !== selectedSupplier) return false
      return true
    })
  }, [adjustedItems, selectedSupplier, showShortagesOnly])

  const grouped = useMemo(() => {
    if (groupBy === 'store' && storeSplits) {
      // Map store splits back to full ShoppingListItem data
      const result: [string, typeof filteredItems][] = []
      for (const split of storeSplits.splits) {
        const storeItemNames = new Set(split.items.map((i) => i.name.toLowerCase()))
        const matched = filteredItems.filter((fi) =>
          storeItemNames.has(fi.ingredientName.toLowerCase())
        )
        if (matched.length > 0) {
          result.push([split.store.store_name, matched])
        }
      }
      // Unassigned items
      if (storeSplits.unassigned.length > 0) {
        const unassignedNames = new Set(storeSplits.unassigned.map((i) => i.name.toLowerCase()))
        const unmatched = filteredItems.filter((fi) =>
          unassignedNames.has(fi.ingredientName.toLowerCase())
        )
        if (unmatched.length > 0) {
          result.push(['Unassigned', unmatched])
        }
      }
      // Items not in any split (fallback)
      const allMappedNames = new Set([
        ...storeSplits.splits.flatMap((s) => s.items.map((i) => i.name.toLowerCase())),
        ...storeSplits.unassigned.map((i) => i.name.toLowerCase()),
      ])
      const remaining = filteredItems.filter(
        (fi) => !allMappedNames.has(fi.ingredientName.toLowerCase())
      )
      if (remaining.length > 0) {
        result.push(['Other', remaining])
      }
      return result
    }

    const map = new Map<string, typeof filteredItems>()
    for (const item of filteredItems) {
      const key = groupBy === 'category' ? item.category : item.supplier
      const existing = map.get(key) ?? []
      existing.push(item)
      map.set(key, existing)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredItems, groupBy, storeSplits])

  const suppliers = useMemo(() => {
    return Array.from(new Set(result.items.map((item) => item.supplier))).sort((a, b) =>
      a.localeCompare(b)
    )
  }, [result.items])

  function regenerate() {
    setError(null)
    startTransition(async () => {
      try {
        const eventIds = selectedEventIds.size > 0 ? Array.from(selectedEventIds) : undefined
        const [next, events] = await Promise.all([
          generateShoppingList({ startDate, endDate, eventIds }),
          getUpcomingEventsForShopping({ startDate, endDate }),
        ])
        setResult(next)
        setAvailableEvents(events)
        setStoreSplits(null) // reset store splits when list changes
      } catch (err: any) {
        setError(err?.message || 'Failed to generate shopping list')
      }
    })
  }

  function loadStoreSplits() {
    if (storeSplits) return
    const allItems = result.items.map((item) => ({
      name: item.ingredientName,
      quantity: item.totalRequired,
      unit: item.unit,
    }))
    startTransition(async () => {
      try {
        const splits = await splitListByStore(allItems)
        setStoreSplits(splits)
      } catch {
        setError('Could not load store assignments. Check Settings > Store Preferences.')
      }
    })
  }

  function handleGroupByChange(value: 'category' | 'supplier' | 'store') {
    setGroupBy(value)
    if (value === 'store') loadStoreSplits()
  }

  function toggleEvent(eventId: string) {
    setSelectedEventIds((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  function selectAllEvents() {
    setSelectedEventIds(new Set(availableEvents.map((e) => e.id)))
  }

  function clearAllEvents() {
    setSelectedEventIds(new Set())
  }

  function exportCsv() {
    const rows = [
      [
        'Ingredient',
        'Category',
        'Supplier',
        'Required',
        'On Hand',
        'To Buy',
        'Unit',
        'Estimated Cost',
        'Price Store',
        'Price Source',
      ].join(','),
      ...filteredItems.map((item) =>
        [
          `"${item.ingredientName.replace(/"/g, '""')}"`,
          item.category,
          `"${item.supplier.replace(/"/g, '""')}"`,
          item.totalRequired,
          item.onHand,
          item.toBuy,
          item.unit,
          (item.estimatedCostCents / 100).toFixed(2),
          `"${(item.priceStore || '').replace(/"/g, '""')}"`,
          item.priceSource || '',
        ].join(',')
      ),
    ]

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `shopping-list-${startDate}-to-${endDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function createDraftPO() {
    if (filteredItems.length === 0) return
    setError(null)

    startTransition(async () => {
      try {
        const po = await createPurchaseOrderFromShoppingList({
          supplier: selectedSupplier || undefined,
          eventId: selectedEventIds.size === 1 ? Array.from(selectedEventIds)[0] : undefined,
          items: filteredItems.map((item) => ({
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            toBuy: item.toBuy,
            unit: item.unit,
            estimatedCostCents: item.estimatedCostCents,
          })),
        })

        router.push(`/inventory/purchase-orders/${po.id}`)
      } catch (err: any) {
        setError(err?.message || 'Failed to create purchase order from shopping list')
      }
    })
  }

  function loadVendors() {
    if (vendorsLoaded) return
    startTransition(async () => {
      try {
        const v = await getChefVendors()
        setVendors(v)
        setVendorsLoaded(true)
      } catch {
        /* non-blocking */
      }
    })
  }

  function handleTabChange(tab: 'list' | 'vendors' | 'history') {
    setActiveTab(tab)
    if (tab === 'vendors') loadVendors()
  }

  function markAsHaveThis(ingredientId: string) {
    setHaveThisSet((prev) => {
      const next = new Set(prev)
      if (next.has(ingredientId)) {
        next.delete(ingredientId)
      } else {
        next.add(ingredientId)
      }
      return next
    })
  }

  function handleOnHandOverride(ingredientId: string, value: number) {
    setOnHandOverrides((prev) => {
      const next = new Map(prev)
      next.set(ingredientId, value)
      return next
    })
  }

  function handleVendorChanged(ingredientId: string, newVendor: string) {
    setResult((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.ingredientId === ingredientId ? { ...item, supplier: newVendor } : item
      ),
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Combined Shopping List</CardTitle>
        <p className="text-sm text-stone-500">
          Consolidated ingredient demand across multiple events, minus on-hand inventory.
          {availableEvents.length > 0 && (
            <span className="ml-1 text-stone-400">
              {selectedEventIds.size > 0
                ? `${selectedEventIds.size} of ${availableEvents.length} events selected`
                : `All ${availableEvents.length} events in range`}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid gap-2 md:grid-cols-[150px_150px_140px_1fr]">
          <input
            type="date"
            title="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          />
          <input
            type="date"
            title="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          />
          <select
            title="Group by"
            value={groupBy}
            onChange={(e) =>
              handleGroupByChange(e.target.value as 'category' | 'supplier' | 'store')
            }
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          >
            <option value="category">Group by Category</option>
            <option value="supplier">Group by Supplier</option>
            <option value="store">Group by Store</option>
          </select>
          <div className="flex gap-2 justify-end">
            <Button onClick={regenerate} disabled={isPending}>
              {isPending ? 'Loading...' : 'Generate'}
            </Button>
            <Button variant="secondary" onClick={() => setShowEventPicker((v) => !v)}>
              {showEventPicker ? 'Hide Events' : 'Pick Events'}
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              Export
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
          </div>
        </div>

        {/* Event Picker */}
        {showEventPicker && (
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-stone-200">Select events to include</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllEvents}
                  className="text-xs text-brand-400 hover:text-brand-300"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearAllEvents}
                  className="text-xs text-stone-400 hover:text-stone-300"
                >
                  Clear
                </button>
              </div>
            </div>
            {availableEvents.length === 0 ? (
              <p className="text-sm text-stone-500">
                No confirmed events in this date range. Adjust dates and click Generate.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {availableEvents.map((event) => {
                  const isSelected = selectedEventIds.has(event.id)
                  return (
                    <label
                      key={event.id}
                      className={`flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-brand-500/50 bg-brand-950/30'
                          : 'border-stone-700 hover:border-stone-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEvent(event.id)}
                        className="mt-0.5 h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-200 truncate">
                          {event.occasion || 'Untitled Event'}
                        </p>
                        <p className="text-xs text-stone-500">
                          {new Date(event.eventDate + 'T00:00:00').toLocaleDateString()} ·{' '}
                          {event.guestCount} guests
                          {event.clientName && ` · ${event.clientName}`}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-stone-600">
              Leave all unchecked to include every confirmed event in the date range.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-400">
            <input
              type="checkbox"
              checked={showShortagesOnly}
              onChange={(e) => setShowShortagesOnly(e.target.checked)}
            />
            Show shortages only
          </label>

          <select
            title="Filter by supplier"
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>

          <Badge variant="warning">{result.shortageCount} shortages</Badge>
          <Badge variant="info">{formatCurrency(result.totalEstimatedCostCents)} est. spend</Badge>

          <div className="ml-auto">
            <Button onClick={createDraftPO} disabled={isPending || filteredItems.length === 0}>
              Create Draft PO
            </Button>
          </div>
        </div>

        {/* Incomplete recipe warnings */}
        {result.incompleteRecipes && result.incompleteRecipes.length > 0 && (
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3">
            <p className="text-sm font-medium text-amber-200">
              {result.incompleteRecipes.length} recipe ingredient
              {result.incompleteRecipes.length === 1 ? '' : 's'} with missing quantities
            </p>
            <p className="text-xs text-amber-400/70 mt-1">
              Shopping list may be incomplete. Fix these recipes for accurate quantities.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {[...new Set(result.incompleteRecipes.map((w) => w.recipeName))].map((name) => (
                <span
                  key={name}
                  className="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Export toolbar */}
        <ExportToolbar result={{ ...result, items: adjustedItems }} />

        {/* Exit links: shop entire list externally */}
        {filteredItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <ExitLinkButton
              exitId={40}
              context={{ firstItem: filteredItems[0]?.ingredientName ?? '' }}
              variant="outline"
            />
            <ExitLinkButton
              exitId={3}
              context={{ ingredient: filteredItems[0]?.ingredientName ?? '', zip: '' }}
              variant="compact"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-stone-700">
          {(['list', 'vendors', 'history'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-brand-500 text-stone-100'
                  : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
            >
              {tab === 'list'
                ? 'Current List'
                : tab === 'vendors'
                  ? 'By Vendor'
                  : 'Shopping History'}
            </button>
          ))}
        </div>

        {/* Tab: Current List */}
        {activeTab === 'list' && (
          <>
            {grouped.length === 0 ? (
              <p className="text-sm text-stone-500">No matching items for this range.</p>
            ) : (
              grouped.map(([groupName, items]) => (
                <div key={groupName} className="rounded-lg border border-stone-700">
                  <div className="border-b border-stone-700 px-3 py-2">
                    <p className="text-sm font-semibold text-stone-200">
                      {groupName || 'Uncategorized'}
                      <span className="ml-2 text-stone-500">({items.length})</span>
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-800 text-stone-500">
                          <th className="px-2 py-2 text-left font-medium">Ingredient</th>
                          <th className="px-2 py-2 text-right font-medium">Required</th>
                          <th className="px-2 py-2 text-right font-medium">On Hand</th>
                          <th className="px-2 py-2 text-right font-medium">To Buy</th>
                          <th className="px-2 py-2 text-right font-medium">Estimated</th>
                          <th className="px-2 py-2 text-right font-medium w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <ShoppingListRow
                            key={`${item.ingredientId}:${item.unit}`}
                            item={item}
                            isHaveThis={haveThisSet.has(item.ingredientId)}
                            onHaveThis={() => markAsHaveThis(item.ingredientId)}
                            onHandOverride={onHandOverrides.get(item.ingredientId)}
                            onOnHandChange={(v) => handleOnHandOverride(item.ingredientId, v)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Tab: Vendor Sublists */}
        {activeTab === 'vendors' && (
          <VendorSublist
            items={filteredItems}
            vendors={vendors}
            onItemVendorChanged={handleVendorChanged}
          />
        )}

        {/* Tab: Shopping History */}
        {activeTab === 'history' && <ShoppingHistory />}
      </CardContent>
    </Card>
  )
}
