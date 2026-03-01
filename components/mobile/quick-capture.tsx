'use client'

// QuickCapture — Floating Action Button for mobile quick capture.
// Only visible on small screens (sm:hidden). Provides fast access to:
//   1. Camera receipt capture (triggers native camera)
//   2. Quick expense entry (amount + description modal)
//
// Uses createExpense from lib/expenses/actions with sensible defaults.
// Payment method defaults to 'card', category defaults to 'other',
// date defaults to today. These can be edited from the full Expenses page.

import { useState, useRef, useTransition } from 'react'
import { Plus, Camera, DollarSign, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createExpense } from '@/lib/expenses/actions'

export function QuickCapture() {
  const [open, setOpen] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleReceiptCapture() {
    setOpen(false)
    fileInputRef.current?.click()
  }

  function handleOpenExpense() {
    setOpen(false)
    setShowExpenseForm(true)
  }

  function handleExpenseSubmit() {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return toast.error('Enter a valid amount')
    const amountCents = Math.round(parsed * 100)
    if (!description.trim()) return toast.error('Enter a description')

    const today = new Date().toISOString().split('T')[0]

    startTransition(async () => {
      try {
        await createExpense({
          amount_cents: amountCents,
          description: description.trim(),
          category: 'other',
          payment_method: 'card',
          expense_date: today,
          is_business: true,
          is_reimbursable: false,
        })
        toast.success('Expense recorded!')
        setShowExpenseForm(false)
        setAmount('')
        setDescription('')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save expense'
        toast.error(msg)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleExpenseSubmit()
  }

  return (
    <>
      {/* Hidden file input for camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={() => {
          toast.info('Receipt captured! Open Expenses to upload and log it.')
        }}
      />

      {/* FAB — only shown on mobile */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-4 z-40 w-14 h-14 bg-stone-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-stone-700 transition-all active:scale-95 sm:hidden"
        aria-label="Quick capture"
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>

      {/* Action radial menu */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-3 sm:hidden">
            <div className="flex items-center gap-2 justify-end">
              <span className="bg-stone-900 text-stone-300 text-sm font-medium px-3 py-1 rounded-full shadow-md">
                Capture Receipt
              </span>
              <button
                onClick={handleReceiptCapture}
                className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-md flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
                aria-label="Capture receipt with camera"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <span className="bg-stone-900 text-stone-300 text-sm font-medium px-3 py-1 rounded-full shadow-md">
                Quick Expense
              </span>
              <button
                onClick={handleOpenExpense}
                className="w-12 h-12 bg-green-600 text-white rounded-full shadow-md flex items-center justify-center hover:bg-green-700 active:scale-95 transition-all"
                aria-label="Log a quick expense"
              >
                <DollarSign className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Quick expense modal */}
      {showExpenseForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExpenseForm(false)
          }}
        >
          <div className="bg-stone-900 w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-stone-100">Quick Expense</h3>
            <p className="text-xs text-stone-500 -mt-2">
              Logged as today, category: Other, payment: Card. Edit from Expenses to adjust.
            </p>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Amount ($)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0.00"
                className="w-full border border-stone-600 rounded-xl px-4 py-3 text-xl focus:ring-2 focus:ring-stone-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">What was it?</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., Groceries at Whole Foods"
                className="w-full border border-stone-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-stone-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowExpenseForm(false)}
                className="flex-1 py-3 rounded-xl border border-stone-600 text-stone-300 font-medium hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExpenseSubmit}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-stone-700 transition-colors"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
