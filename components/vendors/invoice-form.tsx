'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createInvoice } from '@/lib/vendors/invoice-actions'
import type { InvoiceLineItemInput } from '@/lib/vendors/invoice-actions'

interface Vendor {
  id: string
  name: string
}

interface InvoiceFormProps {
  vendors: Vendor[]
  defaultVendorId?: string
  onSuccess?: () => void
}

function emptyLineItem(): InvoiceLineItemInput & { key: number } {
  return {
    key: Date.now() + Math.random(),
    description: '',
    quantity: 1,
    unit_price_cents: 0,
    total_cents: 0,
  }
}

export function InvoiceForm({ vendors, defaultVendorId, onSuccess }: InvoiceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [vendorId, setVendorId] = useState(defaultVendorId ?? '')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(
    ((_inf) =>
      `${_inf.getFullYear()}-${String(_inf.getMonth() + 1).padStart(2, '0')}-${String(_inf.getDate()).padStart(2, '0')}`)(
      new Date()
    )
  )
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<(InvoiceLineItemInput & { key: number })[]>([
    emptyLineItem(),
  ])

  const updateLineItem = (
    index: number,
    field: keyof InvoiceLineItemInput,
    value: string | number
  ) => {
    setLineItems((prev) => {
      const updated = [...prev]
      const item = { ...updated[index] }

      if (field === 'description') {
        item.description = value as string
      } else if (field === 'quantity') {
        item.quantity = Number(value) || 0
        item.total_cents = Math.round(item.quantity * item.unit_price_cents)
      } else if (field === 'unit_price_cents') {
        // Input is in dollars, convert to cents
        item.unit_price_cents = Math.round((Number(value) || 0) * 100)
        item.total_cents = Math.round(item.quantity * item.unit_price_cents)
      } else if (field === 'total_cents') {
        item.total_cents = Math.round((Number(value) || 0) * 100)
      }

      updated[index] = item
      return updated
    })
  }

  const addLineItem = () => {
    setLineItems((prev) => [...prev, emptyLineItem()])
  }

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const grandTotalCents = lineItems.reduce((sum, li) => sum + li.total_cents, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorId) {
      setError('Please select a vendor')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const validLineItems = lineItems
        .filter((li) => li.description.trim())
        .map(({ description, quantity, unit_price_cents, total_cents }) => ({
          description,
          quantity,
          unit_price_cents,
          total_cents,
        }))

      await createInvoice({
        vendor_id: vendorId,
        invoice_number: invoiceNumber || undefined,
        invoice_date: invoiceDate,
        total_cents: grandTotalCents,
        notes: notes || undefined,
        line_items: validLineItems,
      })

      router.refresh()
      onSuccess?.()

      // Reset form
      setInvoiceNumber('')
      setNotes('')
      setLineItems([emptyLineItem()])
    } catch (err: any) {
      console.error('[InvoiceForm] error:', err)
      setError(err.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Vendor"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              required
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
            />
            <Input
              label="Invoice #"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Optional"
            />
            <Input
              label="Invoice Date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-stone-300">Line Items</label>
              <Button type="button" variant="ghost" size="sm" onClick={addLineItem}>
                + Add Line
              </Button>
            </div>

            {lineItems.map((li, index) => (
              <div key={li.key} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Input
                    placeholder="Description"
                    value={li.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Qty"
                    value={li.quantity || ''}
                    onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Unit $"
                    value={li.unit_price_cents ? (li.unit_price_cents / 100).toFixed(2) : ''}
                    onChange={(e) => updateLineItem(index, 'unit_price_cents', e.target.value)}
                  />
                </div>
                <div className="col-span-2 text-right text-sm text-stone-300 py-2">
                  ${(li.total_cents / 100).toFixed(2)}
                </div>
                <div className="col-span-1">
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-400"
                      onClick={() => removeLineItem(index)}
                    >
                      X
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2 border-t border-stone-700">
              <span className="text-sm font-semibold text-stone-200">
                Total: ${(grandTotalCents / 100).toFixed(2)}
              </span>
            </div>
          </div>

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
          />

          <Button type="submit" loading={loading}>
            Save Invoice
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
