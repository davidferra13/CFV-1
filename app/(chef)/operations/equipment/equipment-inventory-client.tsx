'use client'

import { useMemo, useState } from 'react'
import { addDays, format, isBefore } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  createEquipmentItem,
  deleteRental,
  logMaintenance,
  logRental,
  retireEquipmentItem,
  type CreateEquipmentInput,
  type RentalInput,
  updateEquipmentItem,
} from '@/lib/equipment/actions'
import {
  EQUIPMENT_ASSET_STATE_LABELS,
  EQUIPMENT_ASSET_STATES,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_SOURCE_KIND_LABELS,
  EQUIPMENT_SOURCE_KINDS,
  type EquipmentAssetState,
  type EquipmentCategory,
  type EquipmentSourceKind,
} from '@/lib/equipment/constants'
import { formatCurrency } from '@/lib/utils/currency'

type EquipmentItem = {
  id: string
  name: string
  category: string
  purchase_date: string | null
  purchase_price_cents: number | null
  current_value_cents: number | null
  serial_number: string | null
  maintenance_interval_days: number | null
  last_maintained_at: string | null
  notes: string | null
  canonical_name?: string | null
  brand?: string | null
  model?: string | null
  asset_state?: string | null
  quantity_owned?: number | null
  storage_location?: string | null
  source_name?: string | null
  source_kind?: string | null
  source_url?: string | null
  source_sku?: string | null
  source_price_cents?: number | null
  source_last_verified_at?: string | null
}

type Rental = {
  id: string
  equipment_name: string
  vendor_name: string | null
  rental_date: string
  cost_cents: number
  event_id: string | null
  notes: string | null
}

type Summary = {
  totalActive: number
  ownedCount: number
  wishlistCount: number
  referenceCount: number
  sourcedCount: number
  maintenanceDueCount: number
}

type Props = {
  inventory: EquipmentItem[]
  overdueItems: EquipmentItem[]
  recentRentals: Rental[]
  summary: Summary
}

type AssetDraft = {
  name: string
  category: EquipmentCategory
  asset_state: EquipmentAssetState
  canonical_name: string
  brand: string
  model: string
  purchase_date: string
  purchase_price_dollars: string
  current_value_dollars: string
  serial_number: string
  maintenance_interval_days: string
  quantity_owned: string
  storage_location: string
  source_name: string
  source_kind: '' | EquipmentSourceKind
  source_url: string
  source_sku: string
  source_price_dollars: string
  notes: string
}

type RentalDraft = {
  equipment_name: string
  vendor_name: string
  rental_date: string
  return_date: string
  cost_dollars: string
  notes: string
}

type TabKey = EquipmentAssetState | 'rentals'

const TAB_ORDER: TabKey[] = ['owned', 'wishlist', 'reference', 'rentals']

function formatDate(date: string | null | undefined) {
  if (!date) return null
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return null
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function centsToInput(value: number | null | undefined) {
  if (value == null) return ''
  return (value / 100).toFixed(2)
}

function dollarsToCents(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return undefined
  return Math.round(parsed * 100)
}

function getAssetState(item: EquipmentItem): EquipmentAssetState {
  return (item.asset_state as EquipmentAssetState | null) ?? 'owned'
}

function getQuantity(item: EquipmentItem) {
  return item.quantity_owned ?? 1
}

function getMaintenanceStatus(item: EquipmentItem): 'overdue' | 'due_soon' | 'ok' | 'none' {
  if (getAssetState(item) !== 'owned' || !item.maintenance_interval_days) return 'none'
  if (!item.last_maintained_at) return 'overdue'
  const nextDue = addDays(new Date(item.last_maintained_at), item.maintenance_interval_days)
  const today = new Date()
  if (isBefore(nextDue, today)) return 'overdue'
  if (isBefore(nextDue, addDays(today, 30))) return 'due_soon'
  return 'ok'
}

function buildEmptyAssetDraft(assetState: EquipmentAssetState): AssetDraft {
  return {
    name: '',
    category: 'other',
    asset_state: assetState,
    canonical_name: '',
    brand: '',
    model: '',
    purchase_date: '',
    purchase_price_dollars: '',
    current_value_dollars: '',
    serial_number: '',
    maintenance_interval_days: '',
    quantity_owned: '1',
    storage_location: '',
    source_name: '',
    source_kind: '',
    source_url: '',
    source_sku: '',
    source_price_dollars: '',
    notes: '',
  }
}

function buildDraftFromItem(item: EquipmentItem): AssetDraft {
  return {
    name: item.name ?? '',
    category: (item.category as EquipmentCategory) ?? 'other',
    asset_state: getAssetState(item),
    canonical_name: item.canonical_name ?? '',
    brand: item.brand ?? '',
    model: item.model ?? '',
    purchase_date: item.purchase_date ?? '',
    purchase_price_dollars: centsToInput(item.purchase_price_cents),
    current_value_dollars: centsToInput(item.current_value_cents),
    serial_number: item.serial_number ?? '',
    maintenance_interval_days: item.maintenance_interval_days?.toString() ?? '',
    quantity_owned: getQuantity(item).toString(),
    storage_location: item.storage_location ?? '',
    source_name: item.source_name ?? '',
    source_kind: (item.source_kind as EquipmentSourceKind | null) ?? '',
    source_url: item.source_url ?? '',
    source_sku: item.source_sku ?? '',
    source_price_dollars: centsToInput(item.source_price_cents),
    notes: item.notes ?? '',
  }
}

function buildEmptyRentalDraft(): RentalDraft {
  return {
    equipment_name: '',
    vendor_name: '',
    rental_date: format(new Date(), 'yyyy-MM-dd'),
    return_date: '',
    cost_dollars: '',
    notes: '',
  }
}

function getStateBadgeVariant(assetState: EquipmentAssetState) {
  if (assetState === 'wishlist') return 'warning'
  if (assetState === 'reference') return 'info'
  return 'success'
}

function getAssetFormActionLabel(assetState: EquipmentAssetState) {
  if (assetState === 'wishlist') return 'Wishlist item'
  if (assetState === 'reference') return 'Reference asset'
  return 'Asset'
}

export function EquipmentInventoryClient({
  inventory,
  overdueItems,
  recentRentals,
  summary,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('owned')
  const [assetDraft, setAssetDraft] = useState<AssetDraft>(buildEmptyAssetDraft('owned'))
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [assetSaving, setAssetSaving] = useState(false)
  const [assetError, setAssetError] = useState<string | null>(null)
  const [assetNotice, setAssetNotice] = useState<string | null>(null)
  const [rentalDraft, setRentalDraft] = useState<RentalDraft>(buildEmptyRentalDraft())
  const [showRentalForm, setShowRentalForm] = useState(false)
  const [rentalSaving, setRentalSaving] = useState(false)
  const [rentalError, setRentalError] = useState<string | null>(null)

  const assetsByState = useMemo(
    () => ({
      owned: inventory.filter((item) => getAssetState(item) === 'owned'),
      wishlist: inventory.filter((item) => getAssetState(item) === 'wishlist'),
      reference: inventory.filter((item) => getAssetState(item) === 'reference'),
    }),
    [inventory]
  )

  const visibleAssets =
    activeTab === 'rentals' ? [] : assetsByState[activeTab as EquipmentAssetState]

  async function refreshPage() {
    router.refresh()
  }

  function openNewAssetForm(assetState: EquipmentAssetState) {
    setEditingAssetId(null)
    setAssetDraft(buildEmptyAssetDraft(assetState))
    setAssetError(null)
    setAssetNotice(null)
    setShowAssetForm(true)
  }

  function openEditAssetForm(item: EquipmentItem) {
    setEditingAssetId(item.id)
    setAssetDraft(buildDraftFromItem(item))
    setAssetError(null)
    setAssetNotice(null)
    setShowAssetForm(true)
  }

  function closeAssetForm() {
    setShowAssetForm(false)
    setEditingAssetId(null)
    setAssetDraft(buildEmptyAssetDraft(activeTab === 'rentals' ? 'owned' : activeTab))
    setAssetError(null)
  }

  async function handleAssetSubmit(event: React.FormEvent) {
    event.preventDefault()
    setAssetSaving(true)
    setAssetError(null)
    setAssetNotice(null)

    const payload: CreateEquipmentInput = {
      name: assetDraft.name.trim(),
      category: assetDraft.category,
      asset_state: assetDraft.asset_state,
      canonical_name: assetDraft.canonical_name.trim() || undefined,
      brand: assetDraft.brand.trim() || undefined,
      model: assetDraft.model.trim() || undefined,
      purchase_date: assetDraft.purchase_date || undefined,
      purchase_price_cents: dollarsToCents(assetDraft.purchase_price_dollars),
      current_value_cents: dollarsToCents(assetDraft.current_value_dollars),
      serial_number: assetDraft.serial_number.trim() || undefined,
      maintenance_interval_days: assetDraft.maintenance_interval_days
        ? Number.parseInt(assetDraft.maintenance_interval_days, 10)
        : undefined,
      quantity_owned: assetDraft.quantity_owned
        ? Number.parseInt(assetDraft.quantity_owned, 10)
        : 1,
      storage_location: assetDraft.storage_location.trim() || undefined,
      source_name: assetDraft.source_name.trim() || undefined,
      source_kind: assetDraft.source_kind || undefined,
      source_url: assetDraft.source_url.trim() || undefined,
      source_sku: assetDraft.source_sku.trim() || undefined,
      source_price_cents: dollarsToCents(assetDraft.source_price_dollars),
      notes: assetDraft.notes.trim() || undefined,
    }

    try {
      if (editingAssetId) {
        await updateEquipmentItem(editingAssetId, payload)
        closeAssetForm()
        setAssetNotice('Asset updated.')
      } else {
        await createEquipmentItem(payload)
        closeAssetForm()
        setAssetNotice('Asset added.')
      }
      await refreshPage()
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : 'Failed to save asset')
    } finally {
      setAssetSaving(false)
    }
  }

  async function handleLogMaintenance(assetId: string) {
    setAssetError(null)
    setAssetNotice(null)

    try {
      await logMaintenance(assetId)
      setAssetNotice('Maintenance logged.')
      await refreshPage()
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : 'Failed to log maintenance')
    }
  }

  async function handleRetireAsset(assetId: string) {
    if (!window.confirm('Retire this asset from the active library?')) return

    setAssetError(null)
    setAssetNotice(null)

    try {
      await retireEquipmentItem(assetId)
      setAssetNotice('Asset retired.')
      await refreshPage()
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : 'Failed to retire asset')
    }
  }

  async function handleRentalSubmit(event: React.FormEvent) {
    event.preventDefault()
    setRentalSaving(true)
    setRentalError(null)

    const payload: RentalInput = {
      equipment_name: rentalDraft.equipment_name.trim(),
      vendor_name: rentalDraft.vendor_name.trim() || undefined,
      rental_date: rentalDraft.rental_date,
      return_date: rentalDraft.return_date || undefined,
      cost_cents: Math.round(Number.parseFloat(rentalDraft.cost_dollars || '0') * 100),
      notes: rentalDraft.notes.trim() || undefined,
    }

    try {
      await logRental(payload)
      setRentalDraft(buildEmptyRentalDraft())
      setShowRentalForm(false)
      await refreshPage()
    } catch (error) {
      setRentalError(error instanceof Error ? error.message : 'Failed to log rental')
    } finally {
      setRentalSaving(false)
    }
  }

  async function handleDeleteRental(rentalId: string) {
    if (!window.confirm('Delete this rental entry?')) return

    setRentalError(null)

    try {
      await deleteRental(rentalId)
      await refreshPage()
    } catch (error) {
      setRentalError(error instanceof Error ? error.message : 'Failed to delete rental')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="pb-4 pt-4">
            <p className="text-2xl font-bold text-stone-100">{summary.ownedCount}</p>
            <p className="mt-0.5 text-sm text-stone-500">Owned assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4">
            <p className="text-2xl font-bold text-stone-100">{summary.wishlistCount}</p>
            <p className="mt-0.5 text-sm text-stone-500">Wishlist items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4">
            <p className="text-2xl font-bold text-stone-100">{summary.referenceCount}</p>
            <p className="mt-0.5 text-sm text-stone-500">Reference products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4">
            <p className="text-2xl font-bold text-stone-100">{summary.sourcedCount}</p>
            <p className="mt-0.5 text-sm text-stone-500">Assets with buy links</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4">
            <p className="text-2xl font-bold text-amber-200">{summary.maintenanceDueCount}</p>
            <p className="mt-0.5 text-sm text-stone-500">Maintenance due</p>
          </CardContent>
        </Card>
      </div>

      {overdueItems.length > 0 && (
        <div className="rounded-xl border border-amber-800 bg-amber-950/70 p-4">
          <p className="text-sm font-medium text-amber-200">
            {overdueItems.length} item{overdueItems.length !== 1 ? 's are' : ' is'} due for
            maintenance.
          </p>
          <p className="mt-1 text-sm text-amber-100">
            {overdueItems.map((item) => item.name).join(', ')}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4 text-sm text-stone-400">
        Canonical source links, brand metadata, and wishlist or reference states require the latest
        equipment asset migration. If saving those fields fails, apply the new migration first.
      </div>

      {(assetError || assetNotice || rentalError) && (
        <div className="space-y-2">
          {assetError && (
            <div className="rounded-xl border border-red-900 bg-red-950/70 p-3 text-sm text-red-300">
              {assetError}
            </div>
          )}
          {assetNotice && (
            <div className="rounded-xl border border-emerald-900 bg-emerald-950/70 p-3 text-sm text-emerald-300">
              {assetNotice}
            </div>
          )}
          {rentalError && (
            <div className="rounded-xl border border-red-900 bg-red-950/70 p-3 text-sm text-red-300">
              {rentalError}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
        <div className="flex flex-wrap gap-2">
          {TAB_ORDER.map((tab) => {
            const count =
              tab === 'owned'
                ? summary.ownedCount
                : tab === 'wishlist'
                  ? summary.wishlistCount
                  : tab === 'reference'
                    ? summary.referenceCount
                    : recentRentals.length

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                }`}
                type="button"
              >
                {tab === 'rentals'
                  ? `Rentals (${count})`
                  : `${EQUIPMENT_ASSET_STATE_LABELS[tab]} (${count})`}
              </button>
            )
          })}
        </div>

        {activeTab === 'rentals' ? (
          <Button variant="secondary" size="sm" onClick={() => setShowRentalForm((open) => !open)}>
            {showRentalForm ? 'Close Rental Form' : 'Log Rental'}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openNewAssetForm(activeTab as EquipmentAssetState)}
          >
            Add {getAssetFormActionLabel(activeTab as EquipmentAssetState)}
          </Button>
        )}
      </div>

      {activeTab !== 'rentals' && showAssetForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingAssetId
                ? 'Edit asset'
                : `Add ${getAssetFormActionLabel(assetDraft.asset_state)}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssetSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Input
                  label="Asset name"
                  value={assetDraft.name}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, name: event.target.value }))
                  }
                  placeholder="JBL party speaker"
                  required
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-300">
                    Asset state
                  </label>
                  <select
                    className="block h-10 w-full rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm text-stone-100"
                    value={assetDraft.asset_state}
                    onChange={(event) =>
                      setAssetDraft((draft) => ({
                        ...draft,
                        asset_state: event.target.value as EquipmentAssetState,
                      }))
                    }
                  >
                    {EQUIPMENT_ASSET_STATES.map((state) => (
                      <option key={state} value={state}>
                        {EQUIPMENT_ASSET_STATE_LABELS[state]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-300">
                    Category
                  </label>
                  <select
                    className="block h-10 w-full rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm text-stone-100"
                    value={assetDraft.category}
                    onChange={(event) =>
                      setAssetDraft((draft) => ({
                        ...draft,
                        category: event.target.value as EquipmentCategory,
                      }))
                    }
                  >
                    {EQUIPMENT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {EQUIPMENT_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Canonical product name"
                  value={assetDraft.canonical_name}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, canonical_name: event.target.value }))
                  }
                  placeholder="JBL PartyBox 310"
                />
                <Input
                  label="Brand"
                  value={assetDraft.brand}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, brand: event.target.value }))
                  }
                  placeholder="JBL"
                />
                <Input
                  label="Model"
                  value={assetDraft.model}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, model: event.target.value }))
                  }
                  placeholder="PartyBox 310"
                />
                <Input
                  label="Quantity"
                  type="number"
                  min="1"
                  value={assetDraft.quantity_owned}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, quantity_owned: event.target.value }))
                  }
                />
                <Input
                  label="Purchase or target date"
                  type="date"
                  value={assetDraft.purchase_date}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, purchase_date: event.target.value }))
                  }
                />
                <Input
                  label="Storage location"
                  value={assetDraft.storage_location}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, storage_location: event.target.value }))
                  }
                  placeholder="Garage rack A"
                />
                <Input
                  label="Paid or target price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={assetDraft.purchase_price_dollars}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({
                      ...draft,
                      purchase_price_dollars: event.target.value,
                    }))
                  }
                  placeholder="499.99"
                />
                <Input
                  label="Current value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={assetDraft.current_value_dollars}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({
                      ...draft,
                      current_value_dollars: event.target.value,
                    }))
                  }
                  placeholder="420.00"
                />
                <Input
                  label="Serial number"
                  value={assetDraft.serial_number}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, serial_number: event.target.value }))
                  }
                  placeholder="Optional"
                />
                <Input
                  label="Source label"
                  value={assetDraft.source_name}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, source_name: event.target.value }))
                  }
                  placeholder="Amazon"
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-300">
                    Source type
                  </label>
                  <select
                    className="block h-10 w-full rounded-lg border border-stone-600 bg-stone-900 px-3 text-sm text-stone-100"
                    value={assetDraft.source_kind}
                    onChange={(event) =>
                      setAssetDraft((draft) => ({
                        ...draft,
                        source_kind: event.target.value as '' | EquipmentSourceKind,
                      }))
                    }
                  >
                    <option value="">Select source type</option>
                    {EQUIPMENT_SOURCE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {EQUIPMENT_SOURCE_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Source URL"
                  type="url"
                  value={assetDraft.source_url}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, source_url: event.target.value }))
                  }
                  placeholder="https://..."
                />
                <Input
                  label="Source SKU"
                  value={assetDraft.source_sku}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, source_sku: event.target.value }))
                  }
                  placeholder="Optional"
                />
                <Input
                  label="Source price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={assetDraft.source_price_dollars}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({
                      ...draft,
                      source_price_dollars: event.target.value,
                    }))
                  }
                  placeholder="479.99"
                />
                <Input
                  label="Maintenance interval (days)"
                  type="number"
                  min="1"
                  value={assetDraft.maintenance_interval_days}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({
                      ...draft,
                      maintenance_interval_days: event.target.value,
                    }))
                  }
                  placeholder="365"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-300">Notes</label>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400"
                  value={assetDraft.notes}
                  onChange={(event) =>
                    setAssetDraft((draft) => ({ ...draft, notes: event.target.value }))
                  }
                  placeholder="Use case, condition, setup notes, or why this is your canonical pick"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" disabled={assetSaving}>
                  {assetSaving ? 'Saving...' : editingAssetId ? 'Save Asset' : 'Add Asset'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={closeAssetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'rentals' ? (
        <div className="space-y-4">
          {showRentalForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Log equipment rental</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRentalSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Input
                      label="Item rented"
                      value={rentalDraft.equipment_name}
                      onChange={(event) =>
                        setRentalDraft((draft) => ({
                          ...draft,
                          equipment_name: event.target.value,
                        }))
                      }
                      placeholder="Portable induction burner"
                      required
                    />
                    <Input
                      label="Vendor"
                      value={rentalDraft.vendor_name}
                      onChange={(event) =>
                        setRentalDraft((draft) => ({ ...draft, vendor_name: event.target.value }))
                      }
                      placeholder="Party rental company"
                    />
                    <Input
                      label="Rental date"
                      type="date"
                      value={rentalDraft.rental_date}
                      onChange={(event) =>
                        setRentalDraft((draft) => ({ ...draft, rental_date: event.target.value }))
                      }
                      required
                    />
                    <Input
                      label="Return date"
                      type="date"
                      value={rentalDraft.return_date}
                      onChange={(event) =>
                        setRentalDraft((draft) => ({ ...draft, return_date: event.target.value }))
                      }
                    />
                    <Input
                      label="Cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={rentalDraft.cost_dollars}
                      onChange={(event) =>
                        setRentalDraft((draft) => ({ ...draft, cost_dollars: event.target.value }))
                      }
                      placeholder="125.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-300">Notes</label>
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400"
                      value={rentalDraft.notes}
                      onChange={(event) =>
                        setRentalDraft((draft) => ({ ...draft, notes: event.target.value }))
                      }
                      placeholder="Event, vendor terms, pickup details"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" disabled={rentalSaving}>
                      {rentalSaving ? 'Saving...' : 'Log Rental'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowRentalForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          {recentRentals.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-stone-500">
                No equipment rentals logged yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentRentals.map((rental) => (
                <Card key={rental.id}>
                  <CardContent className="pb-4 pt-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-stone-100">{rental.equipment_name}</p>
                          {rental.vendor_name && <Badge variant="info">{rental.vendor_name}</Badge>}
                        </div>
                        <p className="text-sm text-stone-400">
                          {formatDate(rental.rental_date)}
                          {rental.notes ? ` | ${rental.notes}` : ''}
                        </p>
                        <p className="text-sm text-stone-300">
                          {formatCurrency(rental.cost_cents)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRental(rental.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAssets.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-stone-500">
                No {EQUIPMENT_ASSET_STATE_LABELS[activeTab as EquipmentAssetState].toLowerCase()}{' '}
                assets yet.
              </CardContent>
            </Card>
          ) : (
            visibleAssets.map((item) => {
              const assetState = getAssetState(item)
              const maintenanceStatus = getMaintenanceStatus(item)
              const nextMaintenanceDate =
                item.last_maintained_at && item.maintenance_interval_days
                  ? formatDate(
                      format(
                        addDays(new Date(item.last_maintained_at), item.maintenance_interval_days),
                        'yyyy-MM-dd'
                      )
                    )
                  : null

              return (
                <Card key={item.id}>
                  <CardContent className="pb-4 pt-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-stone-100">{item.name}</p>
                          <Badge variant={getStateBadgeVariant(assetState)}>
                            {EQUIPMENT_ASSET_STATE_LABELS[assetState]}
                          </Badge>
                          <Badge variant="default">
                            {
                              EQUIPMENT_CATEGORY_LABELS[
                                (item.category as EquipmentCategory) ?? 'other'
                              ]
                            }
                          </Badge>
                          {maintenanceStatus === 'overdue' && (
                            <Badge variant="error">Maintenance overdue</Badge>
                          )}
                          {maintenanceStatus === 'due_soon' && (
                            <Badge variant="warning">Maintenance due soon</Badge>
                          )}
                        </div>

                        {(item.canonical_name || item.brand || item.model) && (
                          <p className="text-sm text-stone-300">
                            {[item.canonical_name, item.brand, item.model]
                              .filter(Boolean)
                              .join(' | ')}
                          </p>
                        )}

                        <div className="grid gap-2 text-sm text-stone-400 md:grid-cols-2 xl:grid-cols-3">
                          <div>
                            <span className="text-stone-500">Quantity:</span> {getQuantity(item)}
                          </div>
                          {item.purchase_price_cents != null && (
                            <div>
                              <span className="text-stone-500">Paid:</span>{' '}
                              {formatCurrency(item.purchase_price_cents)}
                            </div>
                          )}
                          {item.current_value_cents != null && (
                            <div>
                              <span className="text-stone-500">Current value:</span>{' '}
                              {formatCurrency(item.current_value_cents)}
                            </div>
                          )}
                          {item.purchase_date && (
                            <div>
                              <span className="text-stone-500">Date:</span>{' '}
                              {formatDate(item.purchase_date)}
                            </div>
                          )}
                          {item.storage_location && (
                            <div>
                              <span className="text-stone-500">Storage:</span>{' '}
                              {item.storage_location}
                            </div>
                          )}
                          {item.serial_number && (
                            <div>
                              <span className="text-stone-500">Serial:</span> {item.serial_number}
                            </div>
                          )}
                          {item.source_name && (
                            <div>
                              <span className="text-stone-500">Source:</span> {item.source_name}
                            </div>
                          )}
                          {item.source_kind && (
                            <div>
                              <span className="text-stone-500">Source type:</span>{' '}
                              {EQUIPMENT_SOURCE_KIND_LABELS[
                                item.source_kind as EquipmentSourceKind
                              ] ?? item.source_kind}
                            </div>
                          )}
                          {item.source_price_cents != null && (
                            <div>
                              <span className="text-stone-500">Source price:</span>{' '}
                              {formatCurrency(item.source_price_cents)}
                            </div>
                          )}
                          {item.source_last_verified_at && (
                            <div>
                              <span className="text-stone-500">Verified:</span>{' '}
                              {formatDateTime(item.source_last_verified_at)}
                            </div>
                          )}
                          {nextMaintenanceDate && (
                            <div>
                              <span className="text-stone-500">Next maintenance:</span>{' '}
                              {nextMaintenanceDate}
                            </div>
                          )}
                        </div>

                        {item.notes && <p className="text-sm text-stone-300">{item.notes}</p>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.source_url && (
                          <Button
                            href={item.source_url}
                            target="_blank"
                            rel="noreferrer"
                            size="sm"
                            variant="secondary"
                          >
                            Open source link
                          </Button>
                        )}
                        {assetState === 'owned' && item.maintenance_interval_days && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleLogMaintenance(item.id)}
                          >
                            Log maintenance
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditAssetForm(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRetireAsset(item.id)}
                        >
                          Retire
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
