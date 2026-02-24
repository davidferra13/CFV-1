'use client'

// Decline with Reason Modal
// Intercepts the "Decline" action and prompts for a reason before saving.
// Reason is stored in inquiries.decline_reason for lost-deal analytics.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { declineInquiry } from '@/lib/inquiries/actions'
import { COMMON_DECLINE_REASONS } from '@/lib/inquiries/constants'
import { Button } from '@/components/ui/button'

interface Props {
  inquiryId: string
  onCancel: () => void
}

export function DeclineWithReasonModal({ inquiryId, onCancel }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string>('')
  const [customReason, setCustomReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveReason = selected === 'Other' ? customReason.trim() || 'Other' : selected

  async function handleDecline() {
    setError(null)
    setLoading(true)
    try {
      await declineInquiry(inquiryId, effectiveReason || undefined)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-stone-900 rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-stone-100">Decline Inquiry</h2>
          <p className="text-sm text-stone-500 mt-1">
            Select a reason (optional but helps you track patterns).
          </p>
        </div>

        <div className="space-y-1.5">
          {COMMON_DECLINE_REASONS.map((reason) => (
            <label
              key={reason}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                selected === reason
                  ? 'border-brand-400 bg-brand-950'
                  : 'border-stone-700 hover:border-stone-600'
              }`}
            >
              <input
                type="radio"
                name="decline_reason"
                value={reason}
                checked={selected === reason}
                onChange={() => setSelected(reason)}
                className="sr-only"
              />
              <span className="text-sm text-stone-300">{reason}</span>
            </label>
          ))}
        </div>

        {selected === 'Other' && (
          <input
            type="text"
            placeholder="Describe the reason…"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="w-full text-sm border border-stone-700 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button variant="danger" onClick={handleDecline} disabled={loading} className="flex-1">
            {loading ? 'Declining…' : 'Decline Inquiry'}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
