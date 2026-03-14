'use client'

// Tip Log Panel — records tips received per event (cash, Venmo, Zelle, etc.)

import { useState } from 'react'
import { format } from 'date-fns'
import { addTip, deleteTip } from '@/lib/finance/tip-actions'
import type { TipEntry } from '@/lib/finance/tip-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Trash2, Plus, DollarSign } from 'lucide-react'

const TIP_METHODS = ['cash', 'venmo', 'zelle', 'paypal', 'other']

interface Props {
  eventId: string
  initialTips: TipEntry[]
}

export function TipLogPanel({ eventId, initialTips }: Props) {
  const [tips, setTips] = useState(initialTips)
  const [isAdding, setIsAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const totalCents = tips.reduce((s, t) => s + t.amountCents, 0)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    fd.set('eventId', eventId)
    await addTip(fd)
    setSubmitting(false)
    setIsAdding(false)
    window.location.reload()
  }

  async function handleDelete(id: string) {
    await deleteTip(id, eventId)
    setTips((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="text-sm text-stone-400">
          Total tips received:{' '}
          <span className="font-semibold text-emerald-700">{formatCurrency(totalCents)}</span>
        </span>
      </div>

      {tips.length === 0 && !isAdding && (
        <p className="text-sm text-stone-400 py-3 text-center">No tips recorded yet.</p>
      )}

      <div className="space-y-1.5">
        {tips.map((tip) => (
          <div
            key={tip.id}
            className="flex items-center justify-between text-sm border border-stone-800 rounded-md px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium text-stone-100 capitalize">{tip.method}</p>
              <p className="text-xs text-stone-400">
                {format(new Date(tip.receivedAt), 'MMM d, yyyy')}
                {tip.notes ? ` · ${tip.notes}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <span className="font-semibold text-emerald-700">
                {formatCurrency(tip.amountCents)}
              </span>
              <button
                onClick={() => handleDelete(tip.id)}
                className="text-stone-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAdding ? (
        <form onSubmit={handleAdd} className="border border-stone-700 rounded-md p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
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
            <div>
              <label className="text-xs text-stone-400">Method</label>
              <select
                name="method"
                className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 mt-0.5 capitalize"
              >
                {TIP_METHODS.map((m) => (
                  <option key={m} value={m} className="capitalize">
                    {m}
                  </option>
                ))}
              </select>
            </div>
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
              className="text-xs font-medium px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Record Tip'}
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
          className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-400 font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Record tip
        </button>
      )}
    </div>
  )
}
