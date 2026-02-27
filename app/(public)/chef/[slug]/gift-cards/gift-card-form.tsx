'use client'

// GiftCardPurchaseForm — client-side form for purchasing a gift card.
// Props include tenantId + chefSlug (resolved by server page).
// Calls initiateGiftCardPurchase() server action → redirects to Stripe Checkout.

import { useState } from 'react'
import { initiateGiftCardPurchase } from '@/lib/loyalty/gift-card-purchase-actions'
import { formatCurrency } from '@/lib/utils/currency'

const PRESET_AMOUNTS = [2500, 5000, 10000, 20000] // $25, $50, $100, $200

type Props = {
  tenantId: string
  chefSlug: string
  chefName: string
}

export function GiftCardPurchaseForm({ tenantId, chefSlug, chefName }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(5000)
  const [customAmount, setCustomAmount] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finalAmountCents = customAmount
    ? Math.round(parseFloat(customAmount) * 100)
    : (selectedPreset ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!finalAmountCents || finalAmountCents < 500) {
      setError('Minimum gift card amount is $5.')
      return
    }
    if (finalAmountCents > 200000) {
      setError('Maximum gift card amount is $2,000.')
      return
    }
    if (!recipientEmail.trim()) {
      setError('Recipient email is required.')
      return
    }
    if (!buyerEmail.trim()) {
      setError('Your email is required so we can send you a confirmation.')
      return
    }

    setLoading(true)
    try {
      const result = await initiateGiftCardPurchase({
        tenantId,
        amountCents: finalAmountCents,
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim() || undefined,
        personalMessage: message.trim() || undefined,
        buyerEmail: buyerEmail.trim(),
        chefSlug,
      })
      window.location.href = result.checkoutUrl
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-stone-900 rounded-xl border border-stone-700 p-6 space-y-6"
    >
      {/* Amount picker */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-3">Gift card amount</label>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {PRESET_AMOUNTS.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => {
                setSelectedPreset(cents)
                setCustomAmount('')
              }}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                selectedPreset === cents && !customAmount
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-stone-900 text-stone-300 border-stone-600 hover:border-stone-500'
              }`}
            >
              {formatCurrency(cents)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-stone-500 text-sm shrink-0">Custom:</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">
              $
            </span>
            <input
              type="number"
              min="5"
              max="2000"
              step="0.01"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setSelectedPreset(null)
              }}
              placeholder="Enter amount"
              className="w-full pl-7 pr-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Recipient */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-stone-300">Send to</label>
        <input
          type="email"
          required
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="Recipient's email address"
          className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="text"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Recipient's name (optional)"
          className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Personal message */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">
          Personal message (optional)
        </label>
        <textarea
          rows={3}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a personal note to your gift..."
          className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <p className="text-xs text-stone-300 mt-1">{message.length}/500</p>
      </div>

      {/* Buyer email */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Your email</label>
        <input
          type="email"
          required
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-xs text-stone-500 mt-1">
          We&apos;ll send a purchase confirmation to this address.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-950 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !finalAmountCents}
        className="w-full py-3 bg-stone-900 text-white font-semibold rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
      >
        {loading
          ? 'Redirecting to checkout…'
          : `Buy ${finalAmountCents ? formatCurrency(finalAmountCents) : ''} Gift Card`}
      </button>

      <p className="text-xs text-stone-500 text-center">
        Secure checkout powered by Stripe. {chefName}&apos;s gift cards are delivered by email
        immediately after payment.
      </p>
    </form>
  )
}
