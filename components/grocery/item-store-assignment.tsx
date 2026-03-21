'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  assignItemToStore,
  deleteStoreAssignment,
  bulkAssignItems,
  type StoreAssignment,
  type PreferredStore,
  type AssignmentReason,
} from '@/lib/grocery/store-shopping-actions'

type AssignmentWithStore = StoreAssignment & { store: PreferredStore }

const REASON_LABELS: Record<AssignmentReason, string> = {
  best_price: 'Best Price',
  best_quality: 'Best Quality',
  only_source: 'Only Source',
  convenience: 'Convenience',
}

type ItemStoreAssignmentProps = {
  initialAssignments: AssignmentWithStore[]
  allStores: PreferredStore[]
}

export function ItemStoreAssignment({ initialAssignments, allStores }: ItemStoreAssignmentProps) {
  const [assignments, setAssignments] = useState<AssignmentWithStore[]>(initialAssignments)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStoreId, setFilterStoreId] = useState<string | ''>('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSelections, setBulkSelections] = useState<Set<string>>(new Set())
  const [bulkTargetStore, setBulkTargetStore] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStoreId, setEditStoreId] = useState('')
  const [editReason, setEditReason] = useState<AssignmentReason | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    let result = assignments
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((a) => a.ingredient_keyword.includes(q))
    }
    if (filterStoreId) {
      result = result.filter((a) => a.store_id === filterStoreId)
    }
    return result
  }, [assignments, searchQuery, filterStoreId])

  function handleDelete(id: string) {
    const previous = assignments
    setAssignments((prev) => prev.filter((a) => a.id !== id))

    startTransition(async () => {
      try {
        await deleteStoreAssignment(id)
      } catch (err) {
        setAssignments(previous)
        setError(err instanceof Error ? err.message : 'Failed to delete assignment')
      }
    })
  }

  function startEdit(assignment: AssignmentWithStore) {
    setEditingId(assignment.id)
    setEditStoreId(assignment.store_id)
    setEditReason((assignment.reason as AssignmentReason) ?? '')
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditStoreId('')
    setEditReason('')
  }

  function saveEdit(assignment: AssignmentWithStore) {
    if (!editStoreId) return

    const previous = assignments
    const targetStore = allStores.find((s) => s.id === editStoreId)
    if (!targetStore) return

    // Optimistic update
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignment.id
          ? {
              ...a,
              store_id: editStoreId,
              store: targetStore,
              reason: editReason || null,
            }
          : a
      )
    )
    setEditingId(null)

    startTransition(async () => {
      try {
        await assignItemToStore(assignment.ingredient_keyword, editStoreId, editReason || undefined)
      } catch (err) {
        setAssignments(previous)
        setError(err instanceof Error ? err.message : 'Failed to update assignment')
      }
    })
  }

  function toggleBulkSelection(id: string) {
    setBulkSelections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function selectAll() {
    setBulkSelections(new Set(filtered.map((a) => a.id)))
  }

  function selectNone() {
    setBulkSelections(new Set())
  }

  function handleBulkAssign() {
    if (!bulkTargetStore || bulkSelections.size === 0) return

    const previous = assignments
    const targetStore = allStores.find((s) => s.id === bulkTargetStore)
    if (!targetStore) return

    // Build bulk payload
    const selectedAssignments = assignments.filter((a) => bulkSelections.has(a.id))
    const payload = selectedAssignments.map((a) => ({
      keyword: a.ingredient_keyword,
      storeId: bulkTargetStore,
    }))

    // Optimistic update
    setAssignments((prev) =>
      prev.map((a) =>
        bulkSelections.has(a.id) ? { ...a, store_id: bulkTargetStore, store: targetStore } : a
      )
    )
    setBulkSelections(new Set())
    setBulkMode(false)

    startTransition(async () => {
      try {
        await bulkAssignItems(payload)
      } catch (err) {
        setAssignments(previous)
        setError(err instanceof Error ? err.message : 'Failed to bulk assign items')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Item Store Assignments</h3>
        <button
          onClick={() => {
            setBulkMode(!bulkMode)
            setBulkSelections(new Set())
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
        >
          {bulkMode ? 'Exit Bulk Mode' : 'Bulk Assign'}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search ingredients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select
          value={filterStoreId}
          onChange={(e) => setFilterStoreId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All stores</option>
          {allStores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.store_name}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk actions */}
      {bulkMode && (
        <div className="flex items-center gap-3 rounded-md bg-orange-50 p-3">
          <span className="text-sm text-orange-700">{bulkSelections.size} selected</span>
          <button onClick={selectAll} className="text-xs text-orange-600 hover:underline">
            Select all
          </button>
          <button onClick={selectNone} className="text-xs text-orange-600 hover:underline">
            Clear
          </button>
          <select
            value={bulkTargetStore}
            onChange={(e) => setBulkTargetStore(e.target.value)}
            className="ml-auto rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">Move to store...</option>
            {allStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.store_name}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={!bulkTargetStore || bulkSelections.size === 0 || isPending}
            className="rounded-md bg-orange-600 px-3 py-1 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}

      {/* Assignments list */}
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {filtered.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            {assignments.length === 0
              ? 'No item assignments yet. Assign items to stores from the shopping list view.'
              : 'No items match your search.'}
          </div>
        )}

        {filtered.map((assignment) => (
          <div key={assignment.id} className="flex items-center gap-3 px-4 py-2">
            {/* Bulk checkbox */}
            {bulkMode && (
              <input
                type="checkbox"
                checked={bulkSelections.has(assignment.id)}
                onChange={() => toggleBulkSelection(assignment.id)}
                className="rounded border-gray-300"
              />
            )}

            {editingId === assignment.id ? (
              /* Edit mode */
              <div className="flex flex-1 items-center gap-2">
                <span className="text-sm font-medium min-w-0 truncate">
                  {assignment.ingredient_keyword}
                </span>
                <select
                  value={editStoreId}
                  onChange={(e) => setEditStoreId(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  {allStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.store_name}
                    </option>
                  ))}
                </select>
                <select
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value as AssignmentReason | '')}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="">No reason</option>
                  {Object.entries(REASON_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => saveEdit(assignment)}
                  disabled={isPending}
                  className="rounded px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              /* View mode */
              <>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{assignment.ingredient_keyword}</span>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {assignment.store.store_name}
                </span>
                {assignment.reason && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600">
                    {REASON_LABELS[assignment.reason as AssignmentReason] ?? assignment.reason}
                  </span>
                )}
                <button
                  onClick={() => startEdit(assignment)}
                  disabled={isPending}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(assignment.id)}
                  disabled={isPending}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        {filtered.length} of {assignments.length} assignments shown
      </p>
    </div>
  )
}
