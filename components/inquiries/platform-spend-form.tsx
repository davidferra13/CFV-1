'use client'

import { useState, useTransition } from 'react'
import { recordPlatformSpend } from '@/lib/inquiries/platform-cpl'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

const CHANNEL_OPTIONS = [
  { value: 'thumbtack', label: 'Thumbtack' },
  { value: 'bark', label: 'Bark' },
  { value: 'theknot', label: 'The Knot' },
  { value: 'cozymeal', label: 'Cozymeal' },
  { value: 'gigsalad', label: 'GigSalad' },
  { value: 'instagram_ads', label: 'Instagram Ads' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'other', label: 'Other' },
]

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function PlatformSpendForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [channel, setChannel] = useState('thumbtack')
  const [amount, setAmount] = useState('')
  const [spendDate, setSpendDate] = useState(todayString())
  const [notes, setNotes] = useState('')

  function resetForm() {
    setChannel('thumbtack')
    setAmount('')
    setSpendDate(todayString())
    setNotes('')
    setError(null)
  }

  function handleCancel() {
    resetForm()
    setOpen(false)
  }

  function handleSubmit() {
    setError(null)
    const dollars = parseFloat(amount)
    if (!dollars || dollars <= 0) {
      setError('Amount must be greater than $0')
      return
    }

    const amountCents = Math.round(dollars * 100)

    startTransition(async () => {
      try {
        const result = await recordPlatformSpend({
          channel,
          amountCents,
          spendDate,
          notes: notes.trim() || undefined,
        })

        if (!result.success) {
          setError(result.error ?? 'Failed to save')
          return
        }

        resetForm()
        setOpen(false)
        router.refresh()
      } catch (err) {
        setError('Failed to record spend')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
      >
        + Log Spend
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded bg-stone-800 border border-stone-700 text-stone-200 text-xs px-2 py-1.5"
        >
          {CHANNEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-500 text-xs">$</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded bg-stone-800 border border-stone-700 text-stone-200 text-xs px-2 py-1.5 pl-5 w-24"
          />
        </div>

        <input
          type="date"
          value={spendDate}
          onChange={(e) => setSpendDate(e.target.value)}
          className="rounded bg-stone-800 border border-stone-700 text-stone-200 text-xs px-2 py-1.5"
        />

        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded bg-stone-800 border border-stone-700 text-stone-200 text-xs px-2 py-1.5 flex-1 min-w-[100px]"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={handleSubmit} loading={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
          Cancel
        </Button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  )
}
