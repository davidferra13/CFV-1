'use client'

import { useState, useTransition } from 'react'
import {
  getPreferredStores,
  addPreferredStore,
  updatePreferredStore,
  deletePreferredStore,
  type PreferredStore,
  type StoreType,
} from '@/lib/grocery/store-shopping-actions'

const STORE_TYPES: { value: StoreType; label: string }[] = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'costco_wholesale', label: 'Costco / Wholesale' },
  { value: 'farmers_market', label: 'Farmers Market' },
  { value: 'specialty', label: 'Specialty Store' },
  { value: 'butcher', label: 'Butcher' },
  { value: 'fishmonger', label: 'Fishmonger' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'international', label: 'International Market' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
]

function storeTypeLabel(type: StoreType): string {
  return STORE_TYPES.find((t) => t.value === type)?.label ?? type
}

type StoreFormData = {
  store_name: string
  store_type: StoreType
  address: string
  notes: string
  is_default: boolean
}

const EMPTY_FORM: StoreFormData = {
  store_name: '',
  store_type: 'supermarket',
  address: '',
  notes: '',
  is_default: false,
}

export function StoreManager({
  initialStores,
}: {
  initialStores: PreferredStore[]
}) {
  const [stores, setStores] = useState<PreferredStore[]>(initialStores)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<StoreFormData>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError(null)
  }

  function openEdit(store: PreferredStore) {
    setEditingId(store.id)
    setForm({
      store_name: store.store_name,
      store_type: store.store_type,
      address: store.address ?? '',
      notes: store.notes ?? '',
      is_default: store.is_default,
    })
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  function handleSave() {
    if (!form.store_name.trim()) {
      setError('Store name is required')
      return
    }

    const previousStores = stores
    setError(null)

    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updatePreferredStore(editingId, {
            store_name: form.store_name,
            store_type: form.store_type,
            address: form.address || null,
            notes: form.notes || null,
            is_default: form.is_default,
          })
          setStores((prev) =>
            prev.map((s) => (s.id === editingId ? updated : s))
          )
        } else {
          const created = await addPreferredStore({
            store_name: form.store_name,
            store_type: form.store_type,
            address: form.address || undefined,
            notes: form.notes || undefined,
            is_default: form.is_default,
          })
          setStores((prev) => [...prev, created])
        }
        closeForm()
      } catch (err) {
        setStores(previousStores)
        setError(err instanceof Error ? err.message : 'Failed to save store')
      }
    })
  }

  function handleDelete(id: string) {
    const previousStores = stores
    setStores((prev) => prev.filter((s) => s.id !== id))

    startTransition(async () => {
      try {
        await deletePreferredStore(id)
      } catch (err) {
        setStores(previousStores)
        setError(err instanceof Error ? err.message : 'Failed to delete store')
      }
    })
  }

  function handleSetDefault(id: string) {
    const previousStores = stores
    setStores((prev) =>
      prev.map((s) => ({ ...s, is_default: s.id === id }))
    )

    startTransition(async () => {
      try {
        await updatePreferredStore(id, { is_default: true })
      } catch (err) {
        setStores(previousStores)
        setError(err instanceof Error ? err.message : 'Failed to set default')
      }
    })
  }

  function handleReorder(id: string, direction: 'up' | 'down') {
    const idx = stores.findIndex((s) => s.id === id)
    if (idx === -1) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === stores.length - 1) return

    const previousStores = stores
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const reordered = [...stores]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]

    // Update sort_order
    const updated = reordered.map((s, i) => ({ ...s, sort_order: i }))
    setStores(updated)

    startTransition(async () => {
      try {
        await Promise.all(
          updated.map((s, i) => updatePreferredStore(s.id, { sort_order: i }))
        )
      } catch (err) {
        setStores(previousStores)
        setError(err instanceof Error ? err.message : 'Failed to reorder')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Preferred Stores</h3>
        <button
          onClick={openAdd}
          className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
        >
          + Add Store
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Store List */}
      <div className="space-y-2">
        {stores.length === 0 && !showForm && (
          <p className="text-sm text-gray-500">
            No stores added yet. Add your preferred stores to organize shopping
            lists.
          </p>
        )}

        {stores.map((store, idx) => (
          <div
            key={store.id}
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
          >
            {/* Reorder buttons */}
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => handleReorder(store.id, 'up')}
                disabled={idx === 0 || isPending}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                aria-label="Move up"
              >
                &#9650;
              </button>
              <button
                onClick={() => handleReorder(store.id, 'down')}
                disabled={idx === stores.length - 1 || isPending}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                aria-label="Move down"
              >
                &#9660;
              </button>
            </div>

            {/* Store info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{store.store_name}</span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {storeTypeLabel(store.store_type)}
                </span>
                {store.is_default && (
                  <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                    Default
                  </span>
                )}
              </div>
              {store.address && (
                <p className="mt-0.5 text-xs text-gray-500 truncate">
                  {store.address}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {!store.is_default && (
                <button
                  onClick={() => handleSetDefault(store.id)}
                  disabled={isPending}
                  className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                  title="Set as default store"
                >
                  Set default
                </button>
              )}
              <button
                onClick={() => openEdit(store)}
                disabled={isPending}
                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(store.id)}
                disabled={isPending}
                className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h4 className="font-medium text-sm">
            {editingId ? 'Edit Store' : 'Add New Store'}
          </h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Store Name *
              </label>
              <input
                type="text"
                value={form.store_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, store_name: e.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                placeholder="e.g., Costco, Whole Foods"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Store Type
              </label>
              <select
                value={form.store_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    store_type: e.target.value as StoreType,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                {STORE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                placeholder="Optional"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_default: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
            Set as default store (unassigned items go here)
          </label>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : editingId ? 'Update' : 'Add Store'}
            </button>
            <button
              onClick={closeForm}
              disabled={isPending}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
