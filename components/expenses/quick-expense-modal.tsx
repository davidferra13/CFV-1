'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createExpense, type CreateExpenseInput } from '@/lib/expenses/actions'
import { EXPENSE_CATEGORY_OPTIONS, type ExpenseCategory } from '@/lib/constants/expense-categories'

interface QuickExpenseModalProps {
  open: boolean
  onClose: () => void
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Minimal expense entry modal — amount, category, vendor, date, description.
 * Stays open after save for rapid entry. "Done" closes it.
 */
export function QuickExpenseModal({ open, onClose }: QuickExpenseModalProps) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('groceries')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'venmo' | 'other'>('card')
  const [vendor, setVendor] = useState('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(todayISO)
  const [isPending, startTransition] = useTransition()
  const amountRef = useRef<HTMLInputElement>(null)

  // Focus amount on open
  useEffect(() => {
    if (open) {
      setTimeout(() => amountRef.current?.focus(), 100)
    }
  }, [open])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const resetForm = () => {
    setAmount('')
    setCategory('groceries')
    setPaymentMethod('card')
    setVendor('')
    setDescription('')
    setExpenseDate(todayISO())
  }

  const handleSave = () => {
    const cents = Math.round(parseFloat(amount) * 100)
    if (!amount || Number.isNaN(cents) || cents <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!description.trim()) {
      toast.error('Enter a description')
      return
    }

    const input: CreateExpenseInput = {
      amount_cents: cents,
      category,
      payment_method: paymentMethod,
      description: description.trim(),
      expense_date: expenseDate,
      vendor_name: vendor.trim() || null,
      is_business: true,
    }

    startTransition(async () => {
      try {
        await createExpense(input)
        toast.success(`Expense saved: $${(cents / 100).toFixed(2)}`)
        resetForm()
        setTimeout(() => amountRef.current?.focus(), 50)
      } catch (err: any) {
        toast.error(err?.message || 'Failed to save expense')
      }
    })
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[15%] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] bg-stone-900 border border-stone-700 rounded-xl shadow-2xl z-50 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-100">Quick Expense</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-stone-700 text-stone-400 hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          {/* Amount */}
          <div>
            <label className="text-xs text-stone-400 block mb-1">Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
              <input
                ref={amountRef}
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                }}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          {/* Category + Payment Method row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:border-brand-500 outline-none"
              >
                {EXPENSE_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Payment</label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as 'cash' | 'card' | 'venmo' | 'other')
                }
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:border-brand-500 outline-none"
              >
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="venmo">Venmo</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-stone-400 block mb-1">Description *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
              placeholder="What was this for?"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            />
          </div>

          {/* Vendor + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Vendor</label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Store name"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-sm focus:border-brand-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Done
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </div>
    </>
  )
}
