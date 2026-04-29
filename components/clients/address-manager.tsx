'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { AddressHandoff } from '@/components/ui/handoff-actions'
import { updateClientPersonalInfo } from '@/lib/clients/milestones'
import { toast } from 'sonner'

type AdditionalAddress = {
  label: string
  address: string
  city: string
  state: string
  zip: string
  access_instructions: string
  kitchen_notes: string
  equipment_available: string[]
}

export function AddressManager({
  clientId,
  initialAddresses,
}: {
  clientId: string
  initialAddresses: AdditionalAddress[]
}) {
  const [addresses, setAddresses] = useState<AdditionalAddress[]>(initialAddresses)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AdditionalAddress>({
    label: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    access_instructions: '',
    kitchen_notes: '',
    equipment_available: [],
  })

  async function handleSave(updated: AdditionalAddress[]) {
    setSaving(true)
    try {
      await updateClientPersonalInfo(clientId, { additional_addresses: updated })
      setAddresses(updated)
      return true
    } catch (e) {
      console.error(e)
      toast.error('Failed to save address')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd() {
    if (!form.label || !form.address) return
    const updated = [...addresses, form]
    const saved = await handleSave(updated)
    if (saved) {
      setIsAdding(false)
      setForm({
        label: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        access_instructions: '',
        kitchen_notes: '',
        equipment_available: [],
      })
    }
  }

  async function handleRemove(index: number) {
    const updated = addresses.filter((_, i) => i !== index)
    await handleSave(updated)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Additional Addresses</CardTitle>
          {!isAdding && (
            <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
              Add Address
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {addresses.length === 0 && !isAdding && (
          <p className="text-sm text-stone-500">
            No additional addresses. Add locations like parents&apos; house, vacation home, or other
            venues.
          </p>
        )}

        {addresses.length > 0 && (
          <div className="space-y-3 mb-4">
            {addresses.map((addr, i) => (
              <div
                key={i}
                className="flex items-start justify-between py-3 border-b border-stone-800 last:border-0"
              >
                <div>
                  <span className="text-sm font-medium text-stone-100">{addr.label}</span>
                  <div className="mt-1 text-xs">
                    <AddressHandoff
                      address={[addr.address, addr.city, addr.state, addr.zip]
                        .filter(Boolean)
                        .join(', ')}
                    />
                  </div>
                  {addr.access_instructions && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      Access: {addr.access_instructions}
                    </p>
                  )}
                  {addr.kitchen_notes && (
                    <p className="text-xs text-stone-500 mt-0.5">Kitchen: {addr.kitchen_notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(i)}
                  disabled={saving}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {isAdding && (
          <div className="space-y-3 border rounded-lg p-4 bg-stone-800">
            <div>
              <label className="text-xs font-medium text-stone-400">Label</label>
              <Input
                placeholder="e.g., Parents' house, Vacation home"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-400">Address</label>
              <AddressAutocomplete
                placeholder="Street address"
                value={form.address}
                onChange={(val) => setForm({ ...form, address: val })}
                onPlaceSelect={(data) =>
                  setForm({
                    ...form,
                    address: data.address,
                    city: data.city,
                    state: data.state,
                    zip: data.zip,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-400">City</label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400">State</label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-400">ZIP</label>
                <Input
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-400">Access Instructions</label>
              <Textarea
                placeholder="Gate code, parking, entry notes..."
                value={form.access_instructions}
                onChange={(e) => setForm({ ...form, access_instructions: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-400">Kitchen Notes</label>
              <Textarea
                placeholder="Kitchen size, constraints, what's available..."
                value={form.kitchen_notes}
                onChange={(e) => setForm({ ...form, kitchen_notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={saving || !form.label || !form.address}
              >
                {saving ? 'Saving...' : 'Add Address'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
