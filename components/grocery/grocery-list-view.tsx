'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import type {
  GroceryListData,
  GroceryItem,
  CustomGroceryItem,
  AnyGroceryItem,
} from '@/lib/grocery/generate-grocery-list'
import { splitListByStore } from '@/lib/grocery/store-shopping-actions'
import type { StoreSplit } from '@/lib/grocery/store-shopping-actions'

// ── localStorage Keys ─────────────────────────────────────────────────

function getStorageKey(eventId: string) {
  return `grocery-checked-${eventId}`
}

function getCustomItemsKey(eventId: string) {
  return `grocery-custom-${eventId}`
}

function loadCheckedState(eventId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(getStorageKey(eventId))
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function saveCheckedState(eventId: string, checked: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getStorageKey(eventId), JSON.stringify(Array.from(checked)))
  } catch {
    // localStorage full or unavailable, silently ignore
  }
}

function loadCustomItems(eventId: string): CustomGroceryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(getCustomItemsKey(eventId))
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveCustomItems(eventId: string, items: CustomGroceryItem[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getCustomItemsKey(eventId), JSON.stringify(items))
  } catch {
    // silently ignore
  }
}

// ── Component ─────────────────────────────────────────────────────────

interface GroceryListViewProps {
  data: GroceryListData
  eventId: string
}

type ViewMode = 'by-category' | 'by-store'

export function GroceryListView({ data, eventId }: GroceryListViewProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => loadCheckedState(eventId))
  const [customItems, setCustomItems] = useState<CustomGroceryItem[]>(() =>
    loadCustomItems(eventId)
  )
  const [newItemName, setNewItemName] = useState('')
  const [newItemSection, setNewItemSection] = useState('Other')
  const [isPrintMode, setIsPrintMode] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('by-category')
  const [storeSplits, setStoreSplits] = useState<{
    splits: StoreSplit[]
    unassigned: { name: string; quantity: number | string; unit: string }[]
  } | null>(null)
  const [storeViewError, setStoreViewError] = useState<string | null>(null)
  const [isLoadingStores, startStoreTransition] = useTransition()

  const loadStoreSplits = useCallback(() => {
    if (storeSplits) return // already loaded
    const allItems = data.categories.flatMap((c) =>
      c.items.map((item) => ({
        name: item.ingredientName,
        quantity: item.displayQuantity || String(item.totalQuantity),
        unit: item.unit,
      }))
    )
    startStoreTransition(async () => {
      try {
        const result = await splitListByStore(allItems)
        setStoreSplits(result)
        setStoreViewError(null)
      } catch {
        setStoreViewError('Could not load store assignments. Check Settings > Store Preferences.')
      }
    })
  }, [data.categories, storeSplits])

  const handleViewMode = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode)
      if (mode === 'by-store') loadStoreSplits()
    },
    [loadStoreSplits]
  )

  // Persist checked state
  useEffect(() => {
    saveCheckedState(eventId, checkedItems)
  }, [eventId, checkedItems])

  // Persist custom items
  useEffect(() => {
    saveCustomItems(eventId, customItems)
  }, [eventId, customItems])

  const toggleItem = useCallback((itemKey: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemKey)) {
        next.delete(itemKey)
      } else {
        next.add(itemKey)
      }
      return next
    })
  }, [])

  const addCustomItem = useCallback(() => {
    const trimmed = newItemName.trim()
    if (!trimmed) return

    const item: CustomGroceryItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      checked: false,
      isCustom: true,
      storeSection: newItemSection,
    }
    setCustomItems((prev) => [...prev, item])
    setNewItemName('')
  }, [newItemName, newItemSection])

  const removeCustomItem = useCallback((id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id))
    setCheckedItems((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  // Count totals
  const allGroceryItems = data.categories.flatMap((c) => c.items)
  const totalItems = allGroceryItems.length + customItems.length
  const checkedCount =
    allGroceryItems.filter((item) => checkedItems.has(item.ingredientId)).length +
    customItems.filter((item) => checkedItems.has(item.id)).length
  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0

  // Merge custom items into categories for display
  const customBySection = new Map<string, CustomGroceryItem[]>()
  for (const item of customItems) {
    const section = item.storeSection
    if (!customBySection.has(section)) customBySection.set(section, [])
    customBySection.get(section)!.push(item)
  }

  return (
    <div className={isPrintMode ? 'print-grocery-list' : ''}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{data.eventName}</h2>
          <p className="text-sm text-gray-500">
            {data.guestCount} guests
            {data.eventDate ? ` \u00B7 ${new Date(data.eventDate).toLocaleDateString()}` : ''}
            {' \u00B7 '}
            {data.totalItems} ingredients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={() => handleViewMode('by-category')}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === 'by-category'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              By Category
            </button>
            <button
              type="button"
              onClick={() => handleViewMode('by-store')}
              className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${
                viewMode === 'by-store'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              By Store
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsPrintMode(true)
              setTimeout(() => {
                window.print()
                setIsPrintMode(false)
              }, 100)
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Print
          </button>
        </div>
      </div>

      {/* Print header (only visible in print) */}
      <div className="hidden print:block print:mb-4">
        <h1 className="text-2xl font-bold">{data.eventName} - Grocery List</h1>
        <p className="text-lg">
          {data.guestCount} guests
          {data.eventDate ? ` \u00B7 ${new Date(data.eventDate).toLocaleDateString()}` : ''}
        </p>
      </div>

      {/* Budget Guardrail */}
      {data.budget.projectedCents != null && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 print:hidden ${
            data.budget.overBudget ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
          }`}
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span
                className={`font-medium ${data.budget.overBudget ? 'text-red-700' : 'text-green-700'}`}
              >
                Projected grocery spend: ${(data.budget.projectedCents / 100).toFixed(0)}
              </span>
              {data.budget.ceilingCents != null && (
                <span className="text-gray-500">
                  Target (30% food cost): ${(data.budget.ceilingCents / 100).toFixed(0)}
                </span>
              )}
            </div>
            {data.budget.overBudget && (
              <span className="text-xs font-medium text-red-600">Over budget</span>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-6 print:hidden">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {checkedCount} of {totalItems} items checked
          </span>
          <span className="font-medium text-gray-900">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Empty state */}
      {data.categories.length === 0 && customItems.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-500">
            No ingredients found. Add recipes with ingredients to your event menu to generate a
            grocery list.
          </p>
        </div>
      )}

      {/* By Store View */}
      {viewMode === 'by-store' && (
        <div className="print:hidden">
          {isLoadingStores && (
            <div className="py-6 text-center text-sm text-gray-500">
              Loading store assignments...
            </div>
          )}
          {storeViewError && !isLoadingStores && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {storeViewError}
            </div>
          )}
          {!isLoadingStores && storeSplits && (
            <>
              {storeSplits.splits.length === 0 && storeSplits.unassigned.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
                  No store assignments yet. Go to Settings &gt; Store Preferences to set up your
                  stores and assign ingredients.
                </div>
              )}
              {storeSplits.splits.map((split) => (
                <div key={split.store.id} className="mb-5">
                  <h3 className="mb-2 border-b border-gray-200 pb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    {split.store.store_name}
                    {split.store.store_type !== 'other' && (
                      <span className="ml-2 text-xs font-normal normal-case text-gray-400">
                        ({split.store.store_type.replace(/_/g, ' ')})
                      </span>
                    )}
                  </h3>
                  <ul className="space-y-1">
                    {split.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          title={`Check off ${item.name}`}
                          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-900">
                          {item.quantity && <span className="font-medium">{item.quantity} </span>}
                          {item.unit && item.unit !== 'unit' && (
                            <span className="text-gray-500">{item.unit} </span>
                          )}
                          {item.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {storeSplits.unassigned.length > 0 && (
                <div className="mb-5">
                  <h3 className="mb-2 border-b border-gray-200 pb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    Unassigned ({storeSplits.unassigned.length})
                  </h3>
                  <ul className="space-y-1">
                    {storeSplits.unassigned.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          title={`Check off ${item.name}`}
                          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-500">
                          {item.quantity && <span className="font-medium">{item.quantity} </span>}
                          {item.unit && item.unit !== 'unit' && <span>{item.unit} </span>}
                          {item.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-gray-400">
                    Assign these in Settings &gt; Store Preferences to route them automatically.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Categories (hidden in store view) */}
      {viewMode === 'by-category' &&
        data.categories.map((category) => {
          const sectionCustom = customBySection.get(category.name) ?? []
          return (
            <CategorySection
              key={category.name}
              name={category.name}
              items={category.items}
              customItems={sectionCustom}
              checkedItems={checkedItems}
              onToggle={toggleItem}
              onRemoveCustom={removeCustomItem}
            />
          )
        })}

      {/* Custom items in sections that don't exist in generated data */}
      {Array.from(customBySection.entries())
        .filter(([section]) => !data.categories.some((c) => c.name === section))
        .map(([section, items]) => (
          <CategorySection
            key={`custom-${section}`}
            name={section}
            items={[]}
            customItems={items}
            checkedItems={checkedItems}
            onToggle={toggleItem}
            onRemoveCustom={removeCustomItem}
          />
        ))}

      {/* Add Custom Item */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 print:hidden">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Add Custom Item</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustomItem()
            }}
            placeholder="Paper towels, ice, etc."
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <select
            value={newItemSection}
            onChange={(e) => setNewItemSection(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="Produce">Produce</option>
            <option value="Proteins">Proteins</option>
            <option value="Dairy">Dairy</option>
            <option value="Pantry">Pantry</option>
            <option value="Spices">Spices</option>
            <option value="Baking">Baking</option>
            <option value="Frozen">Frozen</option>
            <option value="Beverages">Beverages</option>
            <option value="Alcohol">Alcohol</option>
            <option value="Supplies">Supplies</option>
            <option value="Other">Other</option>
          </select>
          <button
            onClick={addCustomItem}
            disabled={!newItemName.trim()}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Category Section ──────────────────────────────────────────────────

interface CategorySectionProps {
  name: string
  items: GroceryItem[]
  customItems: CustomGroceryItem[]
  checkedItems: Set<string>
  onToggle: (key: string) => void
  onRemoveCustom: (id: string) => void
}

function CategorySection({
  name,
  items,
  customItems,
  checkedItems,
  onToggle,
  onRemoveCustom,
}: CategorySectionProps) {
  const allItems: AnyGroceryItem[] = [
    ...items.map((i) => ({ ...i, checked: checkedItems.has(i.ingredientId) })),
    ...customItems.map((i) => ({ ...i, checked: checkedItems.has(i.id) })),
  ]

  if (allItems.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="mb-2 border-b border-gray-200 pb-1 text-sm font-semibold uppercase tracking-wide text-gray-500 print:text-lg print:font-bold print:text-black">
        {name}
      </h3>
      <ul className="space-y-1">
        {allItems.map((item) => {
          const key = item.isCustom ? item.id : item.ingredientId
          const isChecked = checkedItems.has(key)

          return (
            <li
              key={key}
              className={`flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors ${
                isChecked ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(key)}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 print:h-5 print:w-5"
              />
              <div className="min-w-0 flex-1">
                <span
                  className={`text-sm print:text-base ${
                    isChecked ? 'line-through' : 'text-gray-900'
                  }`}
                >
                  {item.isCustom ? (
                    item.name
                  ) : (
                    <>
                      {item.displayQuantity && (
                        <span className="font-medium">{item.displayQuantity}</span>
                      )}{' '}
                      {item.ingredientName}
                    </>
                  )}
                </span>
                {!item.isCustom && item.recipes.length > 0 && (
                  <span className="ml-2 text-xs text-gray-400 print:text-sm">
                    ({item.recipes.join(', ')})
                  </span>
                )}
              </div>
              {item.isCustom && (
                <button
                  onClick={() => onRemoveCustom(item.id)}
                  className="text-xs text-gray-400 hover:text-red-500 print:hidden"
                  title="Remove"
                >
                  &times;
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
