'use client'

// IssueIncentiveForm - Chef creates a new voucher or gift card
// Wraps the existing createVoucherOrGiftCard() server action.

import { useState } from 'react'
import { createVoucherOrGiftCard } from '@/lib/loyalty/voucher-actions'
import type { CreateVoucherOrGiftCardInput } from '@/lib/loyalty/voucher-actions'

type Props = {
  clients?: { id: string; full_name: string | null }[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function IssueIncentiveForm({ clients = [], onSuccess, onCancel }: Props) {
  const [type, setType] = useState<'gift_card' | 'voucher'>('gift_card')
  const [title, setTitle] = useState('')
  const [amountDollars, setAmountDollars] = useState('')
  const [discountPercent, setDiscountPercent] = useState('')
  const [usePercent, setUsePercent] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState('1')
  const [targetClientId, setTargetClientId] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const input: CreateVoucherOrGiftCardInput = {
        type,
        title: title.trim(),
        note: note.trim() || undefined,
        code: customCode.trim() || undefined,
        expires_at: expiresAt || undefined,
        max_redemptions: parseInt(maxRedemptions, 10) || 1,
        target_client_id: targetClientId || null,
      }

      if (type === 'gift_card') {
        const cents = Math.round(parseFloat(amountDollars) * 100)
        if (!cents || isNaN(cents) || cents <= 0) {
          setError('Please enter a valid dollar amount for the gift card.')
          setLoading(false)
          return
        }
        input.amount_cents = cents
      } else {
        if (usePercent) {
          const pct = parseInt(discountPercent, 10)
          if (!pct || pct < 1 || pct > 100) {
            setError('Discount percent must be between 1 and 100.')
            setLoading(false)
            return
          }
          input.discount_percent = pct
        } else {
          const cents = Math.round(parseFloat(amountDollars) * 100)
          if (!cents || isNaN(cents) || cents <= 0) {
            setError('Please enter a valid dollar amount for the voucher.')
            setLoading(false)
            return
          }
          input.amount_cents = cents
        }
      }

      await createVoucherOrGiftCard(input)
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Failed to create. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type selector */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">Type</label>
        <div className="flex gap-3">
          {(['gift_card', 'voucher'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t)
                setUsePercent(false)
              }}
              className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                type === t
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-stone-900 text-stone-300 border-stone-600 hover:border-brand-400'
              }`}
            >
              {t === 'gift_card' ? 'Gift Card' : 'Voucher'}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-stone-300 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === 'gift_card' ? 'Summer Gift Card' : 'Welcome Voucher'}
          className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          required
        />
      </div>

      {/* Value */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">
          Value <span className="text-red-500">*</span>
        </label>
        {type === 'voucher' && (
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setUsePercent(false)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                !usePercent
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-stone-900 text-stone-400 border-stone-600 hover:border-stone-500'
              }`}
            >
              $ Fixed
            </button>
            <button
              type="button"
              onClick={() => setUsePercent(true)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                usePercent
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-stone-900 text-stone-400 border-stone-600 hover:border-stone-500'
              }`}
            >
              % Percent
            </button>
          </div>
        )}
        {usePercent && type === 'voucher' ? (
          <div className="relative">
            <input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="15"
              min={1}
              max={100}
              className="w-full pl-3 pr-8 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">
              %
            </span>
          </div>
        ) : (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">
              $
            </span>
            <input
              type="number"
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              placeholder="50.00"
              min={0.01}
              step={0.01}
              className="w-full pl-7 pr-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
        )}
      </div>

      {/* Target client (optional) */}
      {clients.length > 0 && (
        <div>
          <label htmlFor="targetClient" className="block text-sm font-medium text-stone-300 mb-1">
            For Client <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <select
            id="targetClient"
            value={targetClientId}
            onChange={(e) => setTargetClientId(e.target.value)}
            className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Anyone</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || 'Unnamed client'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Expiry */}
      <div>
        <label htmlFor="expiresAt" className="block text-sm font-medium text-stone-300 mb-1">
          Expires On <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <input
          id="expiresAt"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Max redemptions */}
      <div>
        <label htmlFor="maxRedemptions" className="block text-sm font-medium text-stone-300 mb-1">
          Max Redemptions
        </label>
        <input
          id="maxRedemptions"
          type="number"
          value={maxRedemptions}
          onChange={(e) => setMaxRedemptions(e.target.value)}
          min={1}
          max={1000}
          className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-xs text-stone-500 mt-1">
          {type === 'gift_card'
            ? 'Gift cards can be used multiple times until balance runs out.'
            : 'How many times this voucher code can be used.'}
        </p>
      </div>

      {/* Custom code */}
      <div>
        <label htmlFor="customCode" className="block text-sm font-medium text-stone-300 mb-1">
          Custom Code{' '}
          <span className="text-stone-400 font-normal">(optional - auto-generated if blank)</span>
        </label>
        <input
          id="customCode"
          type="text"
          value={customCode}
          onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
          placeholder={type === 'gift_card' ? 'GFT-SUMMER24' : 'VCH-WELCOME'}
          className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Internal note */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium text-stone-300 mb-1">
          Internal Note <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Context for your records..."
          className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-950 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-4 rounded-lg border border-stone-600 text-sm font-medium text-stone-300 hover:bg-stone-800"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : `Issue ${type === 'gift_card' ? 'Gift Card' : 'Voucher'}`}
        </button>
      </div>
    </form>
  )
}
