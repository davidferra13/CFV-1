'use client'

// SendIncentiveForm — Chef sends an existing voucher/gift card code to a recipient by email
// Wraps the existing sendVoucherOrGiftCardToAnyone() server action.

import { useState } from 'react'
import { sendVoucherOrGiftCardToAnyone } from '@/lib/loyalty/voucher-actions'

type Props = {
  incentiveId: string
  incentiveCode: string
  incentiveTitle: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function SendIncentiveForm({
  incentiveId,
  incentiveCode,
  incentiveTitle,
  onSuccess,
  onCancel,
}: Props) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [message, setMessage] = useState('')
  const [deliveryChannel, setDeliveryChannel] = useState<'email' | 'manual'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await sendVoucherOrGiftCardToAnyone({
        incentive_id: incentiveId,
        recipient_email: recipientEmail.trim(),
        recipient_name: recipientName.trim() || undefined,
        message: message.trim() || undefined,
        delivery_channel: deliveryChannel,
      })
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Failed to send. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-stone-800 rounded-lg px-4 py-3 border border-stone-700">
        <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Sending code</p>
        <p className="font-mono font-semibold text-stone-100 mt-0.5">{incentiveCode}</p>
        <p className="text-sm text-stone-400">{incentiveTitle}</p>
      </div>

      {/* Delivery channel */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">Delivery Method</label>
        <div className="flex gap-3">
          {(['email', 'manual'] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setDeliveryChannel(ch)}
              className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                deliveryChannel === ch
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-stone-900 text-stone-300 border-stone-600 hover:border-brand-400'
              }`}
            >
              {ch === 'email' ? 'Send Email' : 'Manual (log only)'}
            </button>
          ))}
        </div>
        {deliveryChannel === 'manual' && (
          <p className="text-xs text-stone-500 mt-1.5">
            The code will be logged as delivered but no email will be sent.
          </p>
        )}
      </div>

      {/* Recipient email */}
      <div>
        <label htmlFor="recipientEmail" className="block text-sm font-medium text-stone-300 mb-1">
          Recipient Email <span className="text-red-500">*</span>
        </label>
        <input
          id="recipientEmail"
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="client@example.com"
          className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          required
        />
      </div>

      {/* Recipient name */}
      <div>
        <label htmlFor="recipientName" className="block text-sm font-medium text-stone-300 mb-1">
          Recipient Name <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <input
          id="recipientName"
          type="text"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Sarah"
          className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Personal message */}
      {deliveryChannel === 'email' && (
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-stone-300 mb-1">
            Personal Message <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Enjoy this gift card for your next event!"
            className="w-full px-3 py-2 border border-stone-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
      )}

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
          {loading ? 'Sending…' : deliveryChannel === 'email' ? 'Send Email' : 'Log as Sent'}
        </button>
      </div>
    </form>
  )
}
