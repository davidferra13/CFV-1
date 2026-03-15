'use client'

import { useState, useTransition } from 'react'
import {
  assignItemToStore,
  type PreferredStore,
  type GroceryItem,
  type StoreSplit,
} from '@/lib/grocery/store-shopping-actions'

type StoreSplitViewProps = {
  splits: StoreSplit[]
  unassigned: GroceryItem[]
  allStores: PreferredStore[]
  onRefresh?: () => void
}

export function StoreSplitView({
  splits: initialSplits,
  unassigned: initialUnassigned,
  allStores,
  onRefresh,
}: StoreSplitViewProps) {
  const [splits, setSplits] = useState(initialSplits)
  const [unassigned, setUnassigned] = useState(initialUnassigned)
  const [collapsedStores, setCollapsedStores] = useState<Set<string>>(new Set())
  const [reassigning, setReassigning] = useState<{
    item: GroceryItem
    fromStoreId: string | null
  } | null>(null)
  const [rememberAssignment, setRememberAssignment] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleCollapse(storeId: string) {
    setCollapsedStores((prev) => {
      const next = new Set(prev)
      if (next.has(storeId)) {
        next.delete(storeId)
      } else {
        next.add(storeId)
      }
      return next
    })
  }

  function startReassign(item: GroceryItem, fromStoreId: string | null) {
    setReassigning({ item, fromStoreId })
    setError(null)
  }

  function cancelReassign() {
    setReassigning(null)
  }

  function handleReassign(toStoreId: string) {
    if (!reassigning) return

    const { item, fromStoreId } = reassigning
    const previousSplits = splits
    const previousUnassigned = unassigned

    // Optimistic update: move item between stores locally
    if (fromStoreId) {
      setSplits((prev) =>
        prev.map((s) =>
          s.store.id === fromStoreId
            ? { ...s, items: s.items.filter((i) => i.name !== item.name) }
            : s.store.id === toStoreId
            ? { ...s, items: [...s.items, item] }
            : s
        )
      )
    } else {
      // From unassigned
      setUnassigned((prev) => prev.filter((i) => i.name !== item.name))
      setSplits((prev) =>
        prev.map((s) =>
          s.store.id === toStoreId
            ? { ...s, items: [...s.items, item] }
            : s
        )
      )
      // If toStore not in splits yet, add it
      const targetExists = splits.some((s) => s.store.id === toStoreId)
      if (!targetExists) {
        const targetStore = allStores.find((s) => s.id === toStoreId)
        if (targetStore) {
          setSplits((prev) => [...prev, { store: targetStore, items: [item] }])
        }
      }
    }

    setReassigning(null)

    if (rememberAssignment) {
      startTransition(async () => {
        try {
          await assignItemToStore(item.name, toStoreId)
        } catch (err) {
          setSplits(previousSplits)
          setUnassigned(previousUnassigned)
          setError(
            err instanceof Error ? err.message : 'Failed to save assignment'
          )
        }
      })
    }
  }

  // Print mode: trigger browser print
  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shopping List by Store</h3>
        <div className="flex gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Refresh
            </button>
          )}
          <button
            onClick={handlePrint}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 print:hidden"
          >
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 print:hidden">
          {error}
        </div>
      )}

      {/* Remember assignment toggle */}
      <label className="flex items-center gap-2 text-sm text-gray-600 print:hidden">
        <input
          type="checkbox"
          checked={rememberAssignment}
          onChange={(e) => setRememberAssignment(e.target.checked)}
          className="rounded border-gray-300"
        />
        Remember store assignments for future lists
      </label>

      {/* Store sections */}
      {splits.map((split) => (
        <div
          key={split.store.id}
          className="rounded-lg border border-gray-200 bg-white print:break-inside-avoid print:border-black"
        >
          {/* Store header */}
          <button
            onClick={() => toggleCollapse(split.store.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 print:hover:bg-white"
          >
            <div className="flex items-center gap-2">
              <span
                className="text-gray-400 text-xs print:hidden"
                aria-hidden="true"
              >
                {collapsedStores.has(split.store.id) ? '&#9654;' : '&#9660;'}
              </span>
              <span className="font-medium">{split.store.store_name}</span>
              {split.store.is_default && (
                <span className="text-xs text-orange-600">(default)</span>
              )}
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {split.items.length} item{split.items.length !== 1 ? 's' : ''}
            </span>
          </button>

          {/* Items */}
          {!collapsedStores.has(split.store.id) && (
            <div className="border-t border-gray-100 px-4 py-2">
              <ul className="space-y-1">
                {split.items.map((item, i) => (
                  <li
                    key={`${item.name}-${i}`}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <span>
                      <span className="text-gray-900">{item.name}</span>
                      {(item.quantity || item.unit) && (
                        <span className="ml-2 text-gray-500">
                          {item.quantity} {item.unit}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => startReassign(item, split.store.id)}
                      className="text-xs text-gray-400 hover:text-orange-600 print:hidden"
                      disabled={isPending}
                    >
                      Move
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      {/* Unassigned items */}
      {unassigned.length > 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 print:break-inside-avoid">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-medium text-gray-600">Unassigned Items</span>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
              {unassigned.length} item{unassigned.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="border-t border-gray-200 px-4 py-2">
            <ul className="space-y-1">
              {unassigned.map((item, i) => (
                <li
                  key={`${item.name}-${i}`}
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <span>
                    <span className="text-gray-700">{item.name}</span>
                    {(item.quantity || item.unit) && (
                      <span className="ml-2 text-gray-500">
                        {item.quantity} {item.unit}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => startReassign(item, null)}
                    className="text-xs text-orange-600 hover:text-orange-800 print:hidden"
                    disabled={isPending}
                  >
                    Assign
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {splits.length === 0 && unassigned.length === 0 && (
        <p className="text-sm text-gray-500">
          No items in this shopping list.
        </p>
      )}

      {/* Reassign dropdown */}
      {reassigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 print:hidden">
          <div className="w-80 rounded-lg bg-white p-4 shadow-xl">
            <h4 className="font-medium text-sm mb-2">
              Move "{reassigning.item.name}" to:
            </h4>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {allStores
                .filter((s) => s.id !== reassigning.fromStoreId)
                .map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleReassign(store.id)}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-orange-50"
                    disabled={isPending}
                  >
                    {store.store_name}
                    <span className="ml-2 text-xs text-gray-400">
                      {store.store_type.replace('_', ' ')}
                    </span>
                  </button>
                ))}
            </div>
            <button
              onClick={cancelReassign}
              className="mt-3 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
