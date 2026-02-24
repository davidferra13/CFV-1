'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { uploadVendorInvoice } from '@/lib/inventory/vendor-invoice-actions'

type LineItem = {
  itemName: string
  quantity: number
  unitPriceCents: number
  totalCents: number
}

export function UploadVendorInvoiceForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    totalCents: '',
  })

  const [items, setItems] = useState<LineItem[]>([
    { itemName: '', quantity: 1, unitPriceCents: 0, totalCents: 0 },
  ])

  function updateItem(idx: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => {
      const copy = [...prev]
      const item = { ...copy[idx], [field]: value }
      if (field === 'quantity' || field === 'unitPriceCents') {
        item.totalCents = Math.round(item.quantity * item.unitPriceCents)
      }
      copy[idx] = item
      return copy
    })
  }

  function addItem() {
    setItems((prev) => [...prev, { itemName: '', quantity: 1, unitPriceCents: 0, totalCents: 0 }])
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit() {
    if (!form.invoiceNumber.trim() || !form.invoiceDate) return
    const validItems = items.filter((i) => i.itemName.trim())
    if (validItems.length === 0) return
    setError('')

    startTransition(async () => {
      try {
        await uploadVendorInvoice({
          invoiceNumber: form.invoiceNumber.trim(),
          invoiceDate: form.invoiceDate,
          totalCents: form.totalCents
            ? Math.round(parseFloat(form.totalCents) * 100)
            : validItems.reduce((s, i) => s + i.totalCents, 0),
          items: validItems,
        })
        setForm({
          invoiceNumber: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          totalCents: '',
        })
        setItems([{ itemName: '', quantity: 1, unitPriceCents: 0, totalCents: 0 }])
        setOpen(false)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Failed to upload invoice')
      }
    })
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + Upload Invoice
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Upload Vendor Invoice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-stone-300">Invoice # *</label>
            <input
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.invoiceNumber}
              onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
              placeholder="INV-001"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-300">Date *</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.invoiceDate}
              onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-300">Total ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.totalCents}
              onChange={(e) => setForm({ ...form, totalCents: e.target.value })}
              placeholder="Auto-calculated"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-stone-300">Line Items *</label>
            <button
              type="button"
              onClick={addItem}
              className="text-xs text-brand-600 hover:text-brand-400 font-medium"
            >
              + Add Line
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-end">
                <div>
                  {idx === 0 && <span className="text-xs text-stone-500">Item</span>}
                  <input
                    className="w-full rounded-md border border-stone-600 px-2 py-1.5 text-sm"
                    value={item.itemName}
                    onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                    placeholder="Item name"
                  />
                </div>
                <div>
                  {idx === 0 && <span className="text-xs text-stone-500">Qty</span>}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-stone-600 px-2 py-1.5 text-sm"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  {idx === 0 && <span className="text-xs text-stone-500">Unit Price (¢)</span>}
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-md border border-stone-600 px-2 py-1.5 text-sm"
                    value={item.unitPriceCents}
                    onChange={(e) =>
                      updateItem(idx, 'unitPriceCents', parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  {idx === 0 && <span className="text-xs text-stone-500">&nbsp;</span>}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-stone-400 hover:text-red-500 text-sm px-1 py-1.5"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSubmit}
            loading={isPending}
            disabled={!form.invoiceNumber.trim() || !items.some((i) => i.itemName.trim())}
          >
            Upload
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
