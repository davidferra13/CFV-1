// Vendor Coordination Section
// Manage external vendors for an event (florist, photographer, DJ, etc.).
// Inline add/edit forms, confirm button with timestamp, delete with confirmation.

'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  addEventVendor,
  updateEventVendor,
  removeEventVendor,
  confirmVendor,
} from '@/lib/events/discovery-actions'
import type { EventVendor, VendorInput, VendorType } from '@/lib/events/discovery-types'

const VENDOR_TYPES: { value: VendorType; label: string }[] = [
  { value: 'florist', label: 'Florist' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'dj', label: 'DJ' },
  { value: 'rental', label: 'Rental' },
  { value: 'linen', label: 'Linen' },
  { value: 'av', label: 'A/V' },
  { value: 'decor', label: 'Decor' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Other' },
]

type Props = {
  eventId: string
  initialVendors: EventVendor[]
}

const emptyVendor: VendorInput = {
  vendor_type: 'florist',
  vendor_name: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  arrival_time: '',
  departure_time: '',
  cost_cents: null,
  notes: '',
}

export function VendorCoordinationSection({ eventId, initialVendors }: Props) {
  const [isOpen, setIsOpen] = useState(initialVendors.length > 0)
  const [vendors, setVendors] = useState<EventVendor[]>(initialVendors)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<VendorInput>(emptyVendor)
  const [isPending, startTransition] = useTransition()

  function resetForm() {
    setFormData(emptyVendor)
    setShowAddForm(false)
    setEditingId(null)
  }

  function startEdit(vendor: EventVendor) {
    setEditingId(vendor.id)
    setShowAddForm(false)
    setFormData({
      vendor_type: vendor.vendor_type,
      vendor_name: vendor.vendor_name,
      contact_name: vendor.contact_name,
      contact_phone: vendor.contact_phone,
      contact_email: vendor.contact_email,
      arrival_time: vendor.arrival_time,
      departure_time: vendor.departure_time,
      cost_cents: vendor.cost_cents,
      notes: vendor.notes,
    })
  }

  function handleAdd() {
    if (!formData.vendor_name.trim()) {
      toast.error('Vendor name is required')
      return
    }
    startTransition(async () => {
      try {
        const result = await addEventVendor(eventId, formData)
        if (!result.success) {
          toast.error(result.error ?? 'Failed to add vendor')
          return
        }
        if (result.vendor) {
          setVendors((prev) => [...prev, result.vendor!])
        }
        toast.success('Vendor added')
        resetForm()
      } catch {
        toast.error('Failed to add vendor')
      }
    })
  }

  function handleUpdate(vendorId: string) {
    startTransition(async () => {
      try {
        const result = await updateEventVendor(vendorId, formData)
        if (!result.success) {
          toast.error(result.error ?? 'Failed to update vendor')
          return
        }
        setVendors((prev) =>
          prev.map((v) =>
            v.id === vendorId ? { ...v, ...formData, updated_at: new Date().toISOString() } : v
          )
        )
        toast.success('Vendor updated')
        resetForm()
      } catch {
        toast.error('Failed to update vendor')
      }
    })
  }

  function handleRemove(vendorId: string) {
    startTransition(async () => {
      try {
        const result = await removeEventVendor(vendorId)
        if (!result.success) {
          toast.error(result.error ?? 'Failed to remove vendor')
          return
        }
        setVendors((prev) => prev.filter((v) => v.id !== vendorId))
        toast.success('Vendor removed')
      } catch {
        toast.error('Failed to remove vendor')
      }
    })
  }

  function handleConfirm(vendorId: string) {
    startTransition(async () => {
      try {
        const result = await confirmVendor(vendorId)
        if (!result.success) {
          toast.error(result.error ?? 'Failed to confirm vendor')
          return
        }
        setVendors((prev) =>
          prev.map((v) =>
            v.id === vendorId
              ? { ...v, confirmed: true, confirmed_at: new Date().toISOString() }
              : v
          )
        )
        toast.success('Vendor confirmed')
      } catch {
        toast.error('Failed to confirm vendor')
      }
    })
  }

  if (!isOpen) {
    return (
      <Card className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">Vendor Coordination</span>
            {vendors.length > 0 ? (
              <span className="text-xs text-stone-500">
                {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs text-stone-600">none</span>
            )}
          </div>
          <span className="text-stone-500 text-sm">+</span>
        </button>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setIsOpen(false)} className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Vendor Coordination</h2>
          <span className="text-stone-500 text-sm">&minus;</span>
        </button>
        {!showAddForm && !editingId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowAddForm(true)
              setFormData(emptyVendor)
            }}
          >
            Add Vendor
          </Button>
        )}
      </div>

      {/* Vendor list */}
      {vendors.length > 0 && (
        <div className="space-y-3 mb-4">
          {vendors.map((vendor) => (
            <div key={vendor.id}>
              {editingId === vendor.id ? (
                <VendorForm
                  formData={formData}
                  setFormData={setFormData}
                  onSave={() => handleUpdate(vendor.id)}
                  onCancel={resetForm}
                  isPending={isPending}
                  submitLabel="Update"
                />
              ) : (
                <VendorCard
                  vendor={vendor}
                  onEdit={() => startEdit(vendor)}
                  onRemove={() => handleRemove(vendor.id)}
                  onConfirm={() => handleConfirm(vendor.id)}
                  isPending={isPending}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <VendorForm
          formData={formData}
          setFormData={setFormData}
          onSave={handleAdd}
          onCancel={resetForm}
          isPending={isPending}
          submitLabel="Add Vendor"
        />
      )}

      {vendors.length === 0 && !showAddForm && (
        <p className="text-sm text-stone-600 italic">
          No vendors coordinated yet. Click &quot;Add Vendor&quot; to track florists, photographers,
          DJs, and more.
        </p>
      )}
    </Card>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function VendorCard({
  vendor,
  onEdit,
  onRemove,
  onConfirm,
  isPending,
}: {
  vendor: EventVendor
  onEdit: () => void
  onRemove: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  const typeLabel =
    VENDOR_TYPES.find((t) => t.value === vendor.vendor_type)?.label ?? vendor.vendor_type

  return (
    <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs bg-stone-700 text-stone-300">
            {typeLabel}
          </span>
          <span className="font-medium text-stone-200">{vendor.vendor_name}</span>
          {vendor.confirmed && (
            <span className="px-2 py-0.5 rounded text-xs bg-green-900/50 text-green-400 border border-green-800">
              Confirmed
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="text-xs text-stone-500 hover:text-stone-300"
            disabled={isPending}
          >
            Edit
          </button>
          <button
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-400"
            disabled={isPending}
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-stone-400">
        {vendor.contact_name && <span>Contact: {vendor.contact_name}</span>}
        {vendor.contact_phone && <span>Phone: {vendor.contact_phone}</span>}
        {vendor.contact_email && <span>Email: {vendor.contact_email}</span>}
        {vendor.arrival_time && <span>Arrives: {vendor.arrival_time}</span>}
        {vendor.departure_time && <span>Departs: {vendor.departure_time}</span>}
        {vendor.cost_cents != null && <span>Cost: ${(vendor.cost_cents / 100).toFixed(2)}</span>}
      </div>

      {vendor.notes && <p className="mt-2 text-xs text-stone-500">{vendor.notes}</p>}

      {!vendor.confirmed && (
        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={onConfirm} disabled={isPending}>
            Mark Confirmed
          </Button>
        </div>
      )}

      {vendor.confirmed && vendor.confirmed_at && (
        <p className="mt-2 text-xs text-stone-600">
          Confirmed {new Date(vendor.confirmed_at).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

function VendorForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  isPending,
  submitLabel,
}: {
  formData: VendorInput
  setFormData: (d: VendorInput) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  submitLabel: string
}) {
  const inputClass =
    'w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600'

  return (
    <div className="bg-stone-800/30 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-stone-400 mb-1 block">Type</label>
          <select
            value={formData.vendor_type}
            onChange={(e) =>
              setFormData({ ...formData, vendor_type: e.target.value as VendorType })
            }
            className={inputClass}
          >
            {VENDOR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-stone-400 mb-1 block">Vendor Name *</label>
          <input
            type="text"
            value={formData.vendor_name}
            onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
            placeholder="Company or person name"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-stone-400 mb-1 block">Contact Name</label>
          <input
            type="text"
            value={formData.contact_name ?? ''}
            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 mb-1 block">Phone</label>
          <input
            type="tel"
            value={formData.contact_phone ?? ''}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 mb-1 block">Email</label>
          <input
            type="email"
            value={formData.contact_email ?? ''}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-stone-400 mb-1 block">Arrival Time</label>
          <input
            type="time"
            value={formData.arrival_time ?? ''}
            onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 mb-1 block">Departure Time</label>
          <input
            type="time"
            value={formData.departure_time ?? ''}
            onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-stone-400 mb-1 block">Cost ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.cost_cents != null ? (formData.cost_cents / 100).toFixed(2) : ''}
            onChange={(e) => {
              const val = e.target.value
              setFormData({
                ...formData,
                cost_cents: val ? Math.round(parseFloat(val) * 100) : null,
              })
            }}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-stone-400 mb-1 block">Notes</label>
        <textarea
          value={formData.notes ?? ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Setup requirements, special instructions..."
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={onSave} loading={isPending}>
          {isPending ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </div>
  )
}
