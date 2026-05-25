'use client'

import { useState, useTransition } from 'react'
import {
  Wrench,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Phone,
  DollarSign,
} from '@/components/ui/icons'
import { ExternalLink } from '@/components/ui/external-link'
import type {
  Equipment,
  CreateEquipmentInput,
  EquipmentCategory,
  EquipmentCondition,
  EquipmentValueSummary,
} from '@/lib/business-ops/equipment-actions'
import { createEquipment, retireEquipment } from '@/lib/business-ops/equipment-actions'

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  cooking: 'Cooking',
  prep: 'Prep',
  transport: 'Transport',
  service: 'Service',
  storage: 'Storage',
  other: 'Other',
}

const CONDITION_LABELS: Record<EquipmentCondition, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  needs_service: 'Needs Service',
  retired: 'Retired',
}

function formatCents(cents: number | null): string {
  if (!cents) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function getWarrantyStatus(
  warrantyExpiry: string | null
): 'expired' | 'warning' | 'current' | 'none' {
  if (!warrantyExpiry) return 'none'
  const now = new Date()
  const expiry = new Date(warrantyExpiry)
  if (expiry < now) return 'expired'
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (expiry <= thirtyDays) return 'warning'
  return 'current'
}

function WarrantyBadge({ status }: { status: ReturnType<typeof getWarrantyStatus> }) {
  if (status === 'expired')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-900/50 text-red-300">
        <AlertTriangle className="w-3 h-3" />
        Warranty Expired
      </span>
    )
  if (status === 'warning')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-900/50 text-amber-300">
        <AlertTriangle className="w-3 h-3" />
        Warranty Expiring
      </span>
    )
  if (status === 'current')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-900/50 text-green-300">
        <CheckCircle className="w-3 h-3" />
        Under Warranty
      </span>
    )
  return null
}

export function EquipmentInventory({
  initialData,
  valueSummary,
}: {
  initialData: Equipment[]
  valueSummary: EquipmentValueSummary
}) {
  const [equipment, setEquipment] = useState(initialData)
  const [isOpen, setIsOpen] = useState(false) // default collapsed per spec
  const [showForm, setShowForm] = useState(false)
  const [showRetired, setShowRetired] = useState(false)
  const [isPending, startTransition] = useTransition()

  const active = equipment.filter((e) => !e.retired_date)
  const retired = equipment.filter((e) => e.retired_date)
  const displayed = showRetired ? equipment : active

  // Group by category
  const grouped = displayed.reduce<Record<string, Equipment[]>>((acc, item) => {
    const cat = item.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  function handleCreate(formData: FormData) {
    const priceStr = formData.get('purchase_price_dollars') as string
    const input: CreateEquipmentInput = {
      item_name: formData.get('item_name') as string,
      category: formData.get('category') as EquipmentCategory,
      brand: (formData.get('brand') as string) || null,
      model: (formData.get('model') as string) || null,
      serial_number: (formData.get('serial_number') as string) || null,
      purchase_date: (formData.get('purchase_date') as string) || null,
      purchase_price_cents: priceStr ? Math.round(parseFloat(priceStr) * 100) : null,
      purchase_source: (formData.get('purchase_source') as string) || null,
      condition: (formData.get('condition') as EquipmentCondition) || null,
      warranty_expiry: (formData.get('warranty_expiry') as string) || null,
      service_contact_name: (formData.get('service_contact_name') as string) || null,
      service_contact_phone: (formData.get('service_contact_phone') as string) || null,
      service_contact_url: (formData.get('service_contact_url') as string) || null,
      notes: (formData.get('notes') as string) || null,
    }
    startTransition(async () => {
      try {
        const result = await createEquipment(input)
        setEquipment((prev) => [...prev, result.item])
        setShowForm(false)
      } catch (e) {
        console.error('Failed to create equipment:', e)
      }
    })
  }

  function handleRetire(id: string) {
    startTransition(async () => {
      try {
        await retireEquipment(id)
        setEquipment((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, retired_date: new Date().toISOString().slice(0, 10), condition: 'retired' }
              : e
          )
        )
      } catch (e) {
        console.error('Failed to retire equipment:', e)
      }
    })
  }

  return (
    <div className="bg-stone-800 rounded-lg border border-stone-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-750"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-stone-100">Equipment</h2>
          <span className="text-sm text-stone-400">({active.length})</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-stone-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {/* Value Summary Card */}
          <div className="p-3 bg-stone-900 rounded-md border border-stone-700 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wide">Total Value</p>
              <p className="text-lg font-semibold text-stone-100 flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                {formatCents(valueSummary.totalValueCents) || '$0'}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wide">Active Items</p>
              <p className="text-lg font-semibold text-stone-100">{valueSummary.itemCount}</p>
            </div>
            {valueSummary.warrantyExpiringCount > 0 && (
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wide">
                  Warranties Expiring
                </p>
                <p className="text-lg font-semibold text-amber-300">
                  {valueSummary.warrantyExpiringCount}
                </p>
              </div>
            )}
          </div>

          {retired.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-stone-500">
              <input
                type="checkbox"
                checked={showRetired}
                onChange={(e) => setShowRetired(e.target.checked)}
                className="rounded bg-stone-800 border-stone-600"
              />
              Show retired items ({retired.length})
            </label>
          )}

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[category as EquipmentCategory] ?? category}
              </p>
              <div className="space-y-2">
                {items.map((item) => {
                  const warrantyStatus = getWarrantyStatus(item.warranty_expiry)
                  const isRetired = !!item.retired_date
                  return (
                    <div
                      key={item.id}
                      className={`p-3 bg-stone-900 rounded-md border ${isRetired ? 'border-stone-800 opacity-50' : 'border-stone-700'} space-y-1`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-stone-100">{item.item_name}</span>
                            {item.condition && !isRetired && (
                              <span className="text-xs text-stone-500 bg-stone-800 px-1.5 py-0.5 rounded">
                                {CONDITION_LABELS[item.condition]}
                              </span>
                            )}
                            {isRetired && (
                              <span className="text-xs text-stone-600 bg-stone-800 px-1.5 py-0.5 rounded">
                                Retired
                              </span>
                            )}
                            <WarrantyBadge status={warrantyStatus} />
                          </div>
                          {(item.brand || item.model) && (
                            <p className="text-sm text-stone-400">
                              {[item.brand, item.model].filter(Boolean).join(' ')}
                            </p>
                          )}
                        </div>
                        {!isRetired && (
                          <button
                            onClick={() => handleRetire(item.id)}
                            disabled={isPending}
                            title="Retire equipment"
                            className="p-1 text-stone-500 hover:text-red-400 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                        {item.serial_number && <span>S/N: {item.serial_number}</span>}
                        {item.purchase_price_cents != null && (
                          <span>Paid: {formatCents(item.purchase_price_cents)}</span>
                        )}
                        {item.purchase_source && <span>From: {item.purchase_source}</span>}
                        {item.purchase_date && (
                          <span>
                            Purchased: {new Date(item.purchase_date).toLocaleDateString()}
                          </span>
                        )}
                        {item.warranty_expiry && (
                          <span>
                            Warranty: {new Date(item.warranty_expiry).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {(item.service_contact_name ||
                        item.service_contact_phone ||
                        item.service_contact_url) && (
                        <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                          {item.service_contact_name && (
                            <span>Service: {item.service_contact_name}</span>
                          )}
                          {item.service_contact_phone && (
                            <a
                              href={`tel:${item.service_contact_phone}`}
                              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                            >
                              <Phone className="w-3 h-3" />
                              {item.service_contact_phone}
                            </a>
                          )}
                          {item.service_contact_url && (
                            <ExternalLink
                              href={item.service_contact_url}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Support
                            </ExternalLink>
                          )}
                        </div>
                      )}
                      {item.notes && <p className="text-xs text-stone-500">{item.notes}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {displayed.length === 0 && !showForm && (
            <p className="text-stone-500 text-sm py-2">No equipment tracked yet.</p>
          )}

          {showForm ? (
            <form
              action={handleCreate}
              className="p-3 bg-stone-900 rounded-md border border-stone-700 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="item_name"
                  placeholder="Item name"
                  required
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <select
                  name="category"
                  required
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  name="condition"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                >
                  <option value="">Condition</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="needs_service">Needs Service</option>
                </select>
                <input
                  name="brand"
                  placeholder="Brand"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="model"
                  placeholder="Model"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="serial_number"
                  placeholder="Serial number"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="purchase_price_dollars"
                  type="number"
                  step="0.01"
                  placeholder="Purchase price ($)"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="purchase_source"
                  placeholder="Purchase source"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <div>
                  <label className="text-xs text-stone-500 block mb-1">Purchase Date</label>
                  <input
                    name="purchase_date"
                    type="date"
                    className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500 block mb-1">Warranty Expiry</label>
                  <input
                    name="warranty_expiry"
                    type="date"
                    className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                  />
                </div>
                <input
                  name="service_contact_name"
                  placeholder="Service contact name"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="service_contact_phone"
                  placeholder="Service phone"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="service_contact_url"
                  placeholder="Service URL"
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <textarea
                  name="notes"
                  placeholder="Notes"
                  rows={2}
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300"
            >
              <Plus className="w-4 h-4" /> Add Equipment
            </button>
          )}
        </div>
      )}
    </div>
  )
}
