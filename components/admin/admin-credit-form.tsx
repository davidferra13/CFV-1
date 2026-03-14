'use client'

// Admin Credit Form — issue a ledger adjustment (credit or debit) for a chef
// Appends an immutable 'adjustment' entry to ledger_entries.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { issueAdminCredit } from '@/lib/admin/chef-admin-actions'
import { useRouter } from 'next/navigation'
import { PlusCircle } from 'lucide-react'

type Props = {
  chefId: string
  eventOptions: { id: string; occasion: string | null }[]
}

export function AdminCreditForm({ chefId, eventOptions }: Props) {
  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('')
  const [eventId, setEventId] = useState('')
  const [isDebit, setIsDebit] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit() {
    const dollars = parseFloat(amountStr)
    if (isNaN(dollars) || dollars <= 0) {
      setFeedback({ ok: false, msg: 'Enter a valid positive dollar amount.' })
      return
    }
    if (!description.trim()) {
      setFeedback({ ok: false, msg: 'Description is required.' })
      return
    }
    const amountCents = Math.round(dollars * 100) * (isDebit ? -1 : 1)
    setFeedback(null)

    startTransition(async () => {
      try {
        const result = await issueAdminCredit({
          chefId,
          eventId: eventId || undefined,
          amountCents,
          description,
        })
        if (result.success) {
          setFeedback({
            ok: true,
            msg: `Adjustment of ${isDebit ? '-' : '+'}$${dollars.toFixed(2)} issued.`,
          })
          setAmountStr('')
          setDescription('')
          setEventId('')
          setIsDebit(false)
          router.refresh()
        } else {
          setFeedback({ ok: false, msg: result.error ?? 'Failed.' })
        }
      } catch (err) {
        toast.error('Failed to issue ledger adjustment')
      }
    })
  }

  return (
    <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <PlusCircle size={14} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Issue Ledger Adjustment</h2>
        <span className="text-xs text-slate-400 ml-1">(creates an immutable entry)</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-3 items-end">
          {/* Credit / Debit toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setIsDebit(false)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  !isDebit
                    ? 'bg-green-500 text-white'
                    : 'bg-stone-900 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Credit (+)
              </button>
              <button
                onClick={() => setIsDebit(true)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  isDebit
                    ? 'bg-red-500 text-white'
                    : 'bg-stone-900 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Debit (–)
              </button>
            </div>
          </div>
          {/* Amount */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Amount ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                $
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Reason / Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Courtesy credit for missed booking"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
            disabled={isPending}
          />
        </div>

        {/* Optional event link */}
        {eventOptions.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Link to Event (optional)
            </label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 bg-stone-900"
              disabled={isPending}
            >
              <option value="">No event</option>
              {eventOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.occasion ?? 'Unnamed Event'} ({e.id.slice(0, 8)})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={isPending || !amountStr || !description}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Saving…' : 'Issue Adjustment'}
          </button>
          {feedback && (
            <span className={`text-xs ${feedback.ok ? 'text-green-600' : 'text-red-600'}`}>
              {feedback.msg}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
