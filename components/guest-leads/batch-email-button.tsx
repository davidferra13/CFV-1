'use client'

import { useState } from 'react'
import { batchEmailEventLeads } from '@/lib/guests/lead-actions'
import { useRouter } from 'next/navigation'

type Props = {
  eventId: string
  eventName: string
  newLeadCount: number
}

export function BatchEmailButton({ eventId, eventName, newLeadCount }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number } | null>(null)
  const router = useRouter()

  if (newLeadCount === 0) return null

  async function handleSend() {
    setSending(true)
    try {
      const res = await batchEmailEventLeads(eventId)
      setResult(res)
      setConfirming(false)
      router.refresh()
    } catch (err) {
      console.error('[BatchEmailButton]', err)
    } finally {
      setSending(false)
    }
  }

  if (result) {
    return (
      <span className="text-sm text-emerald-400">
        Sent {result.sent} {result.sent === 1 ? 'email' : 'emails'}
      </span>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-stone-300">
          Email {newLeadCount} {newLeadCount === 1 ? 'lead' : 'leads'} from {eventName}?
        </span>
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-3 py-1 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1 text-sm rounded bg-stone-700 text-stone-300 hover:bg-stone-600"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 text-sm rounded-lg bg-stone-700 text-stone-200 hover:bg-stone-600 transition-colors"
    >
      Email {newLeadCount} new {newLeadCount === 1 ? 'lead' : 'leads'}
    </button>
  )
}
