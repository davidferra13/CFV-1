'use client'

import { useState, useTransition } from 'react'
import { logReceipt } from '@/lib/mobile/grocery-run-actions'

interface ReceiptLoggerProps {
  eventId: string
  onClose: () => void
  onSuccess: () => void
}

export function ReceiptLogger({ eventId, onClose, onSuccess }: ReceiptLoggerProps) {
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (!vendor.trim()) {
      setError('Enter the store name')
      return
    }

    const amountCents = Math.round(amountNum * 100)

    startTransition(async () => {
      try {
        const result = await logReceipt({
          eventId,
          amountCents,
          vendorName: vendor.trim(),
          notes: notes.trim() || undefined,
        })
        if (result.success) {
          onSuccess()
        } else {
          setError('Failed to log receipt')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log receipt')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-stone-900 rounded-t-2xl border-t border-stone-700 p-6 pb-8 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-stone-100">Log Receipt</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-800 text-stone-400 active:bg-stone-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-lg">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 text-lg bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Store</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Whole Foods, Market Basket"
              className="w-full px-4 py-3 text-base bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Notes (optional) */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Quick note about this receipt"
              className="w-full px-4 py-3 text-base bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 text-base font-semibold rounded-lg bg-amber-500 text-stone-950 active:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Saving...' : 'Log Receipt'}
          </button>
        </form>
      </div>
    </div>
  )
}
