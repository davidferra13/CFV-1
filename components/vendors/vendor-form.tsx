'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createVendor, updateVendor } from '@/lib/vendors/actions'
import type { CreateVendorInput } from '@/lib/vendors/actions'

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
] as const

interface VendorFormProps {
  vendor?: {
    id: string
    name: string
    contact_name?: string | null
    phone?: string | null
    email?: string | null
    account_number?: string | null
    delivery_days?: string[] | null
    payment_terms?: string | null
    notes?: string | null
  }
  onSuccess?: () => void
}

export function VendorForm({ vendor, onSuccess }: VendorFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(vendor?.name ?? '')
  const [contactName, setContactName] = useState(vendor?.contact_name ?? '')
  const [phone, setPhone] = useState(vendor?.phone ?? '')
  const [email, setEmail] = useState(vendor?.email ?? '')
  const [accountNumber, setAccountNumber] = useState(vendor?.account_number ?? '')
  const [deliveryDays, setDeliveryDays] = useState<string[]>(vendor?.delivery_days ?? [])
  const [paymentTerms, setPaymentTerms] = useState(vendor?.payment_terms ?? '')
  const [notes, setNotes] = useState(vendor?.notes ?? '')

  const toggleDay = (day: string) => {
    setDeliveryDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const input: CreateVendorInput = {
        name,
        contact_name: contactName || undefined,
        phone: phone || undefined,
        email: email || undefined,
        account_number: accountNumber || undefined,
        delivery_days: deliveryDays as any,
        payment_terms: paymentTerms || undefined,
        notes: notes || undefined,
      }

      if (vendor) {
        await updateVendor(vendor.id, input)
      } else {
        await createVendor(input)
      }

      router.refresh()
      onSuccess?.()

      if (!vendor) {
        setName('')
        setContactName('')
        setPhone('')
        setEmail('')
        setAccountNumber('')
        setDeliveryDays([])
        setPaymentTerms('')
        setNotes('')
      }
    } catch (err: any) {
      console.error('[VendorForm] error:', err)
      setError(err.message || 'Failed to save vendor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Vendor Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Sysco, US Foods"
        />
        <Input
          label="Contact Name"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Sales rep name"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="rep@vendor.com"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Account Number"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="Your account #"
        />
        <Input
          label="Payment Terms"
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          placeholder="e.g. Net 30, COD"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">Delivery Days</label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                deliveryDays.includes(day.value)
                  ? 'bg-brand-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Minimum order, special instructions..."
        rows={3}
      />

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          {vendor ? 'Update Vendor' : 'Add Vendor'}
        </Button>
        {onSuccess && (
          <Button type="button" variant="ghost" onClick={onSuccess}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
