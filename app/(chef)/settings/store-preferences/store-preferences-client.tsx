'use client'

import { useState, useTransition } from 'react'
import {
  ArrowDown,
  ArrowUp,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Store,
  Trash2,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  addPreferredStore,
  deletePreferredStore,
  type PreferredStore,
  type StoreType,
  updatePreferredStore,
} from '@/lib/grocery/store-shopping-actions'
import {
  cleanStoreDisplayName,
  normalizeStoreNameForMatch,
  type TrackedStoreSuggestion,
} from '@/lib/openclaw/store-name-utils'

const STORE_TYPES: { value: StoreType; label: string }[] = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'costco_wholesale', label: 'Wholesale club' },
  { value: 'farmers_market', label: "Farmer's market" },
  { value: 'specialty', label: 'Specialty shop' },
  { value: 'butcher', label: 'Butcher' },
  { value: 'fishmonger', label: 'Fishmonger' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'international', label: 'International market' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
]

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

function storeTypeLabel(type: StoreType): string {
  return STORE_TYPES.find((storeType) => storeType.value === type)?.label ?? type
}

function initialsForStore(name: string): string {
  const words = cleanStoreDisplayName(name).split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'S'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

export function StorePreferencesClient({
  suggestions,
  initialStores,
}: {
  suggestions: TrackedStoreSuggestion[]
  initialStores: PreferredStore[]
}) {
  const [stores, setStores] = useState(initialStores)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showComposer, setShowComposer] = useState(initialStores.length === 0)
  const [form, setForm] = useState<StoreFormData>(
    initialStores.length === 0 ? { ...EMPTY_FORM, is_default: true } : EMPTY_FORM
  )
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const defaultStore = stores.find((store) => store.is_default) ?? null
  const normalizedSavedStores = new Set(
    stores.map((store) => normalizeStoreNameForMatch(store.store_name))
  )
  const visibleSuggestions = suggestions.filter(
    (suggestion) => !normalizedSavedStores.has(normalizeStoreNameForMatch(suggestion.label))
  )
  const displayedSuggestions = showAllSuggestions
    ? visibleSuggestions
    : visibleSuggestions.slice(0, 12)

  function openComposer() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, is_default: stores.length === 0 })
    setShowComposer(true)
    setError(null)
  }

  function openEdit(store: PreferredStore) {
    setEditingId(store.id)
    setForm({
      store_name: cleanStoreDisplayName(store.store_name),
      store_type: store.store_type,
      address: store.address ?? '',
      notes: store.notes ?? '',
      is_default: store.is_default,
    })
    setShowComposer(true)
    setError(null)
  }

  function closeComposer() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowComposer(false)
    setError(null)
  }

  function handleQuickAdd(suggestion: TrackedStoreSuggestion) {
    const nextSortOrder = stores.length

    startTransition(async () => {
      try {
        const created = await addPreferredStore({
          store_name: suggestion.rawName,
          store_type: 'supermarket',
          is_default: stores.length === 0,
          sort_order: nextSortOrder,
        })
        setStores((prev) => [
          ...prev.map((store) => (created.is_default ? { ...store, is_default: false } : store)),
          created,
        ])
        if (stores.length === 0) setShowComposer(false)
        setError(null)
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : 'Failed to add the suggested store.'
        )
      }
    })
  }

  function handleSave() {
    const trimmedName = form.store_name.trim()
    if (!trimmedName) {
      setError('Store name is required.')
      return
    }

    const normalizedName = normalizeStoreNameForMatch(trimmedName)
    const duplicate = stores.some(
      (store) =>
        store.id !== editingId && normalizeStoreNameForMatch(store.store_name) === normalizedName
    )

    if (duplicate) {
      setError('That store is already in your list.')
      return
    }

    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updatePreferredStore(editingId, {
            store_name: trimmedName,
            store_type: form.store_type,
            address: form.address || null,
            notes: form.notes || null,
            is_default: form.is_default,
          })

          setStores((prev) =>
            prev.map((store) => {
              if (store.id === editingId) return updated
              if (updated.is_default) return { ...store, is_default: false }
              return store
            })
          )
        } else {
          const created = await addPreferredStore({
            store_name: trimmedName,
            store_type: form.store_type,
            address: form.address || undefined,
            notes: form.notes || undefined,
            is_default: form.is_default,
            sort_order: stores.length,
          })

          setStores((prev) => [
            ...prev.map((store) => (created.is_default ? { ...store, is_default: false } : store)),
            created,
          ])
        }

        closeComposer()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Failed to save store.')
      }
    })
  }

  function handleDelete(id: string) {
    const previousStores = stores
    setStores((prev) => prev.filter((store) => store.id !== id))

    startTransition(async () => {
      try {
        await deletePreferredStore(id)
        setError(null)
      } catch (actionError) {
        setStores(previousStores)
        setError(actionError instanceof Error ? actionError.message : 'Failed to delete store.')
      }
    })
  }

  function handleSetDefault(id: string) {
    const previousStores = stores
    setStores((prev) => prev.map((store) => ({ ...store, is_default: store.id === id })))

    startTransition(async () => {
      try {
        await updatePreferredStore(id, { is_default: true })
        setError(null)
      } catch (actionError) {
        setStores(previousStores)
        setError(
          actionError instanceof Error ? actionError.message : 'Failed to set the default store.'
        )
      }
    })
  }

  function handleReorder(id: string, direction: 'up' | 'down') {
    const currentIndex = stores.findIndex((store) => store.id === id)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= stores.length) return

    const previousStores = stores
    const reordered = [...stores]
    ;[reordered[currentIndex], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[currentIndex],
    ]

    const withUpdatedSortOrder = reordered.map((store, index) => ({
      ...store,
      sort_order: index,
    }))

    setStores(withUpdatedSortOrder)

    startTransition(async () => {
      try {
        await Promise.all(
          withUpdatedSortOrder.map((store, index) =>
            updatePreferredStore(store.id, { sort_order: index })
          )
        )
        setError(null)
      } catch (actionError) {
        setStores(previousStores)
        setError(actionError instanceof Error ? actionError.message : 'Failed to reorder stores.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Saved stores
            </p>
            <p className="text-3xl font-semibold text-stone-100">{stores.length}</p>
            <p className="text-sm text-stone-400">
              Add the places you actually check before buying.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Default store
            </p>
            <p className="text-xl font-semibold text-stone-100">
              {defaultStore ? cleanStoreDisplayName(defaultStore.store_name) : 'Not set'}
            </p>
            <p className="text-sm text-stone-400">
              The default store gets priority when more than one price exists.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              Ready to add
            </p>
            <p className="text-3xl font-semibold text-stone-100">{visibleSuggestions.length}</p>
            <p className="text-sm text-stone-400">
              Suggested stores already have tracked price coverage.
            </p>
          </CardContent>
        </Card>
      </div>

      {!defaultStore && stores.length > 0 && (
        <Card className="border-amber-900/60 bg-amber-950/30">
          <CardContent className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-100">Choose a default store</p>
              <p className="text-sm text-amber-200/80">
                Prices can still load without one, but the app has no preferred tie-breaker yet.
              </p>
            </div>
            <Button variant="secondary" onClick={openComposer} disabled={isPending}>
              Update stores
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-900/60 bg-red-950/30">
          <CardContent className="px-5 py-4 text-sm text-red-200">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
        <Card>
          <CardHeader className="flex flex-col gap-4 border-b border-stone-800 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Your stores</CardTitle>
              <CardDescription>
                Keep this list short and intentional. One default plus a couple of backups is
                usually enough.
              </CardDescription>
            </div>
            <Button onClick={openComposer} disabled={isPending}>
              <Plus className="h-4 w-4" />
              Add store
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showComposer && (
              <div className="rounded-2xl border border-stone-700 bg-stone-900/70 p-4">
                <div className="mb-4 space-y-1">
                  <p className="text-sm font-semibold text-stone-100">
                    {editingId ? 'Edit store' : 'Add store'}
                  </p>
                  <p className="text-sm text-stone-400">
                    Enter the store name you want ChefFlow to prioritize for pricing.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
                      Store name
                    </span>
                    <input
                      type="text"
                      value={form.store_name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, store_name: event.target.value }))
                      }
                      placeholder="Whole Foods, Restaurant Depot, local butcher..."
                      className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-brand-500"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
                      Store type
                    </span>
                    <select
                      value={form.store_type}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          store_type: event.target.value as StoreType,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-brand-500"
                    >
                      {STORE_TYPES.map((storeType) => (
                        <option key={storeType.value} value={storeType.value}>
                          {storeType.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
                      Address
                    </span>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, address: event.target.value }))
                      }
                      placeholder="Optional"
                      className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-brand-500"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
                      Notes
                    </span>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      placeholder="Optional"
                      className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-brand-500"
                    />
                  </label>
                </div>

                <label className="mt-4 flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-3 text-sm text-stone-300">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, is_default: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-stone-600 bg-stone-900 text-brand-600"
                  />
                  Make this my default store
                </label>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={handleSave} loading={isPending}>
                    {editingId ? 'Save changes' : 'Save store'}
                  </Button>
                  <Button variant="secondary" onClick={closeComposer} disabled={isPending}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {stores.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-950/50 px-5 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-700 bg-stone-900">
                  <Store className="h-5 w-5 text-stone-400" />
                </div>
                <p className="mt-4 text-base font-semibold text-stone-100">
                  Start with your main store
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-400">
                  Add the grocery store you check most often, then set one backup or specialty stop
                  if you need it.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stores.map((store, index) => {
                  const displayName = cleanStoreDisplayName(store.store_name)

                  return (
                    <div
                      key={store.id}
                      className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-stone-700 bg-stone-950 text-sm font-semibold text-stone-200">
                            {initialsForStore(displayName)}
                          </div>
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-base font-semibold text-stone-100">
                                {displayName}
                              </p>
                              <span className="rounded-full border border-stone-700 px-2.5 py-1 text-xs font-medium text-stone-400">
                                {storeTypeLabel(store.store_type)}
                              </span>
                              {store.is_default && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-700/50 bg-amber-950/40 px-2.5 py-1 text-xs font-medium text-amber-200">
                                  <Star className="h-3 w-3" />
                                  Default
                                </span>
                              )}
                            </div>
                            {store.address && (
                              <p className="flex items-center gap-1.5 text-sm text-stone-400">
                                <MapPin className="h-3.5 w-3.5" />
                                {store.address}
                              </p>
                            )}
                            {store.notes && <p className="text-sm text-stone-500">{store.notes}</p>}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReorder(store.id, 'up')}
                            disabled={index === 0 || isPending}
                            aria-label={`Move ${displayName} up`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 text-stone-300 transition hover:border-stone-500 hover:text-stone-100 disabled:opacity-40"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(store.id, 'down')}
                            disabled={index === stores.length - 1 || isPending}
                            aria-label={`Move ${displayName} down`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 text-stone-300 transition hover:border-stone-500 hover:text-stone-100 disabled:opacity-40"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          {!store.is_default && (
                            <Button
                              variant="secondary"
                              onClick={() => handleSetDefault(store.id)}
                              disabled={isPending}
                            >
                              Set default
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(store)}
                            disabled={isPending}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 text-stone-300 transition hover:border-stone-500 hover:text-stone-100 disabled:opacity-40"
                            aria-label={`Edit ${displayName}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(store.id)}
                            disabled={isPending}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-900/50 bg-red-950/30 text-red-300 transition hover:border-red-700/60 hover:text-red-100 disabled:opacity-40"
                            aria-label={`Delete ${displayName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-300" />
                <CardTitle className="text-base">Suggested stores</CardTitle>
              </div>
              <CardDescription>
                These stores already have tracked price coverage, so they are the fastest way to
                make the feature useful.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {visibleSuggestions.length === 0 ? (
                <p className="text-sm text-stone-400">
                  Your current list already covers the tracked store suggestions.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {displayedSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.label}
                        type="button"
                        onClick={() => handleQuickAdd(suggestion)}
                        disabled={isPending}
                        className="rounded-full border border-stone-700 bg-stone-950 px-3 py-2 text-sm font-medium text-stone-200 transition hover:border-brand-500 hover:text-brand-200 disabled:opacity-50"
                      >
                        + {suggestion.label}
                      </button>
                    ))}
                  </div>
                  {visibleSuggestions.length > displayedSuggestions.length && (
                    <button
                      type="button"
                      onClick={() => setShowAllSuggestions((current) => !current)}
                      className="text-sm font-medium text-brand-300 transition hover:text-brand-200"
                    >
                      {showAllSuggestions
                        ? 'Show fewer suggestions'
                        : `Show ${visibleSuggestions.length - displayedSuggestions.length} more`}
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What good looks like</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-stone-400">
              <p>One default grocery store.</p>
              <p>One or two backups for price checks or availability gaps.</p>
              <p>Specialty stores only when you regularly source from them.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
