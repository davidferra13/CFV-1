'use client'

// Send Staff Portal Button
// Inline component for the event detail staff panel.
// Generates a token-gated portal link for a specific staff member on a specific event.
// Shows a copyable URL after generation.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { generateStaffEventToken } from '@/lib/staff/staff-event-portal-actions'

type Props = {
  eventId: string
  staffMemberId: string
  staffName: string
  existingToken?: string | null
}

export function SendStaffPortalButton({ eventId, staffMemberId, staffName, existingToken }: Props) {
  const [token, setToken] = useState<string | null>(existingToken ?? null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const portalUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/staff-portal/${token}`
    : null

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await generateStaffEventToken(eventId, staffMemberId)
        if (result.success && result.token) {
          setToken(result.token)
        } else {
          setError(result.error ?? 'Failed to generate link')
        }
      } catch {
        setError('Failed to generate link')
      }
    })
  }

  async function handleCopy() {
    if (!portalUrl) return
    try {
      await navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text
      const input = document.querySelector<HTMLInputElement>(`#portal-url-${staffMemberId}`)
      if (input) {
        input.select()
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  if (portalUrl) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <input
          id={`portal-url-${staffMemberId}`}
          type="text"
          readOnly
          value={portalUrl}
          className="flex-1 text-xs rounded border border-stone-700 bg-stone-900 px-2 py-1 text-stone-400 truncate focus:outline-none"
          onFocus={(e) => e.target.select()}
        />
        <Button variant="ghost" onClick={handleCopy} className="text-xs px-2 py-1 h-auto shrink-0">
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    )
  }

  return (
    <div>
      <Button
        variant="ghost"
        onClick={handleGenerate}
        disabled={isPending}
        className="text-xs px-2 py-1 h-auto"
      >
        {isPending ? 'Generating...' : `Send Portal Link`}
      </Button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
