'use client'

// Payment Plan Panel - shows installments for an event with add/mark-paid controls.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  addInstallment,
  markInstallmentPaid,
  deleteInstallment,
} from '@/lib/finance/payment-plan-actions'
import type { PaymentPlanInstallment } from '@/lib/finance/payment-plan-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { CheckCircle, Trash2, Plus } from '@/components/ui/icons'

interface Props {
  eventId: string
  initialInstallments: PaymentPlanInstallment[]
  quotedPriceCents?: number | null
}

export function PaymentPlanPanel({ eventId, initialInstallments, quotedPriceCents }: Props) {
  const router = useRouter()
  const [installments, setInstallments] = useState(initialInstallments)
  const [isAdding, setIsAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const totalPlanned = installments.reduce((s, i) => s + i.amountCents, 0)
  const totalPaid = installments.filter((i) => i.paidAt).reduce((s, i) => s + i.amountCents, 0)
  const remaining = totalPlanned - totalPaid

  async function handleMarkPaid(installment: PaymentPlanInstallment) {
    try {
      await markInstallmentPaid(installment.id, eventId)
      setInstallments((prev) =>
        prev.map((i) => (i.id === installment.id ? { ...i, paidAt: new Date().toISOString() } : i))
      )
    } catch (err) {
      console.error('[payment-plan] Failed to mark installment paid', err)
      toast.error('Failed to mark installment as paid')
    }
  }

  async function handleDelete(id: string) {
    const prevInstallments = installments
    try {
      await deleteInstallment(id, eventId)
      setInstallments((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      console.error('[payment-plan] Failed to delete installment', err)
      setInstallments(prevInstallments)
      toast.error('Failed to delete installment')
    }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      fd.set('eventId', eventId)
      const label = fd.get('label') as string
      const amountDollars = parseFloat(fd.get('amountDollars') as string)
      const dueDate = fd.get('dueDate') as string
      const notes = (fd.get('notes') as string) || null
      const result = await addInstallment(fd)
      if (result.success) {
        const optimisticInstallment: PaymentPlanInstallment = {
          id: crypto.randomUUID(),
          eventId,
          label,
          amountCents: Math.round(amountDollars * 100),
          dueDate,
          paidAt: null,
          notes,
          installmentNumber: installments.length + 1,
        }
        setInstallments((prev) => [...prev, optimisticInstallment])
        setIsAdding(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to add installment')
      }
    } catch (err) {
      console.error('[payment-plan] Failed to add installment', err)
      toast.error('Failed to add installment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {installments.length > 0 && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md bg-stone-800 p-2">
            <p className="text-xs text-stone-500">Total Planned</p>
            <p className="font-semibold text-stone-100 text-sm">{formatCurrency(totalPlanned)}</p>
          </div>
          <div className="rounded-md bg-emerald-950 p-2">
            <p className="text-xs text-emerald-700">Paid</p>
            <p className="font-semibold text-emerald-800 text-sm">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-md bg-amber-950 p-2">
            <p className="text-xs text-amber-700">Remaining</p>
            <p className="font-semibold text-amber-800 text-sm">{formatCurrency(remaining)}</p>
          </div>
        </div>
      )}

      {/* Installment list */}
      {installments.length === 0 && !isAdding && (
        <p className="text-sm text-stone-400 text-center py-4">
          No installments yet. Add one to create a payment schedule.
        </p>
      )}

      <div className="space-y-2">
        {installments.map((inst) => (
          <div
            key={inst.id}
            className={`flex items-center justify-between rounded-md border px-3 py-2 ${
              inst.paidAt ? 'border-emerald-200 bg-emerald-950/50' : 'border-stone-700'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-100">{inst.label}</p>
              <p className="text-xs text-stone-500">
                Due {format(new Date(inst.dueDate), 'MMM d, yyyy')}
                {inst.paidAt && ` · Paid ${format(new Date(inst.paidAt), 'MMM d')}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-sm font-semibold text-stone-100">
                {formatCurrency(inst.amountCents)}
              </span>
              {!inst.paidAt && (
                <button
                  onClick={() => handleMarkPaid(inst)}
                  className="text-emerald-600 hover:text-emerald-700 transition-colors"
                  title="Mark as paid"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              )}
              {inst.paidAt && <span className="text-emerald-600 text-xs font-medium">✓</span>}
              <button
                onClick={() => handleDelete(inst.id)}
                className="text-stone-300 hover:text-red-500 transition-colors"
                title="Delete installment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add installment form */}
      {isAdding ? (
        <form onSubmit={handleAdd} className="border border-stone-700 rounded-md p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-stone-400">Label</label>
              <input
                name="label"
                required
                placeholder="e.g. Deposit"
                className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400">Amount ($)</label>
              <input
                name="amountDollars"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 mt-0.5"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-400">Due Date</label>
            <input
              name="dueDate"
              type="date"
              required
              className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 mt-0.5"
            />
          </div>
          <div>
            <label className="text-xs text-stone-400">Notes (optional)</label>
            <input
              name="notes"
              placeholder="Any notes…"
              className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 mt-0.5"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="text-xs font-medium px-3 py-1.5 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add Installment'}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-stone-500 hover:text-stone-300 px-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-400 font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add installment
        </button>
      )}
    </div>
  )
}
