'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createPurchaseOrder } from '@/lib/inventory/purchase-order-actions'

export function CreatePOClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [poNumber, setPONumber] = useState('')
  const [orderDate, setOrderDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        const result = await createPurchaseOrder({
          poNumber: poNumber.trim() || undefined,
          orderDate: orderDate || undefined,
          expectedDelivery: expectedDelivery || undefined,
          notes: notes.trim() || undefined,
        })
        if (result && typeof result === 'object' && 'id' in result) {
          router.push(`/inventory/purchase-orders/${(result as any).id}`)
        } else {
          router.push('/inventory/purchase-orders')
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to create purchase order')
      }
    })
  }

  return (
    <Card className="p-6 max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            PO Number (optional)
          </label>
          <input
            type="text"
            value={poNumber}
            onChange={(e) => setPONumber(e.target.value)}
            placeholder="Auto-generated if blank"
            className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Order Date</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Expected Delivery
            </label>
            <input
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this order..."
            rows={3}
            className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={isPending}>
            Create Purchase Order
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
