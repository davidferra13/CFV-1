'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  createVendor,
  deleteVendor,
  setVendorPreferred,
  type VendorInput,
} from '@/lib/vendors/actions'
import { VENDOR_TYPE_LABELS } from '@/lib/vendors/constants'
import { toast } from 'sonner'

type Vendor = {
  id: string
  name: string
  vendor_type: string
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  notes: string | null
  is_preferred: boolean
  status: string
}

const VENDOR_TYPES = Object.entries(VENDOR_TYPE_LABELS)

export function VendorDirectoryClient({ initialVendors }: { initialVendors: Vendor[] }) {
  const router = useRouter()
  const [vendors, setVendors] = useState(initialVendors)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [form, setForm] = useState<{
    name: string
    vendor_type: string
    phone: string
    email: string
    address: string
    website: string
    notes: string
    is_preferred: boolean
  }>({
    name: '',
    vendor_type: 'grocery',
    phone: '',
    email: '',
    address: '',
    website: '',
    notes: '',
    is_preferred: false,
  })

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createVendor(form as VendorInput)
      setForm({
        name: '',
        vendor_type: 'grocery',
        phone: '',
        email: '',
        address: '',
        website: '',
        notes: '',
        is_preferred: false,
      })
      setShowForm(false)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(id: string) {
    setDeleteTargetId(id)
    setShowDeleteConfirm(true)
  }

  async function handleConfirmedDelete() {
    if (!deleteTargetId) return
    setShowDeleteConfirm(false)
    try {
      await deleteVendor(deleteTargetId)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete vendor')
    }
  }

  async function handleTogglePreferred(id: string, current: boolean) {
    try {
      await setVendorPreferred(id, !current)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update vendor')
    }
  }

  const preferred = vendors.filter((v) => v.is_preferred)
  const rest = vendors.filter((v) => !v.is_preferred)

  return (
    <div className="space-y-6">
      {/* Preferred */}
      {preferred.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">
            Preferred Vendors
          </h2>
          {preferred.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              onDelete={handleDelete}
              onTogglePreferred={handleTogglePreferred}
            />
          ))}
        </div>
      )}

      {/* All others */}
      {rest.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">
            All Vendors
          </h2>
          {rest.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              onDelete={handleDelete}
              onTogglePreferred={handleTogglePreferred}
            />
          ))}
        </div>
      )}

      {vendors.length === 0 && !showForm && (
        <p className="text-sm text-stone-500">No vendors added yet.</p>
      )}

      {/* Add form toggle */}
      {!showForm ? (
        <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
          + Add Vendor
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-base font-semibold text-stone-100 mb-3">Add Vendor</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-stone-400 mb-1">Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Whole Foods, Joe's Butcher…"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Type</label>
                  <select
                    className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                    value={form.vendor_type}
                    onChange={(e) => update('vendor_type', e.target.value)}
                  >
                    {VENDOR_TYPES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Phone</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">Website</label>
                  <Input
                    type="url"
                    value={form.website}
                    onChange={(e) => update('website', e.target.value)}
                    placeholder="https://…"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-stone-400 mb-1">Address</label>
                  <Input
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-stone-400 mb-1">Notes</label>
                  <Input
                    value={form.notes}
                    onChange={(e) => update('notes', e.target.value)}
                    placeholder="Best for seasonal produce…"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_preferred}
                  onChange={(e) => update('is_preferred', e.target.checked)}
                  className="rounded border-stone-600"
                />
                Mark as preferred vendor
              </label>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Add Vendor'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this vendor?"
        description="This vendor will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

function VendorCard({
  vendor,
  onDelete,
  onTogglePreferred,
}: {
  vendor: Vendor
  onDelete: (id: string) => void
  onTogglePreferred: (id: string, current: boolean) => void
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-stone-100">{vendor.name}</span>
              <Badge variant="default">
                {VENDOR_TYPE_LABELS[vendor.vendor_type] ?? vendor.vendor_type}
              </Badge>
              {vendor.is_preferred && <Badge variant="success">Preferred</Badge>}
            </div>
            {vendor.address && <p className="mt-0.5 text-xs text-stone-400">{vendor.address}</p>}
            <div className="flex gap-3 mt-0.5 text-xs text-stone-400 flex-wrap">
              {vendor.phone && <span>{vendor.phone}</span>}
              {vendor.email && <span>{vendor.email}</span>}
              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-200 underline"
                >
                  Website
                </a>
              )}
            </div>
            {vendor.notes && <p className="mt-0.5 text-xs text-stone-400">{vendor.notes}</p>}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-stone-400"
              onClick={() => onTogglePreferred(vendor.id, vendor.is_preferred)}
            >
              {vendor.is_preferred ? 'Unstar' : 'Star'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-stone-400 hover:text-red-600"
              onClick={() => onDelete(vendor.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
