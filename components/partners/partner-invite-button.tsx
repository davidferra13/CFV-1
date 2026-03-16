'use client'

// Partner Invite Button - shown on the chef's partner detail page.
// Calls generatePartnerInvite() server action to create a one-time link,
// then shows it for the chef to copy and send to their partner.

import { useState } from 'react'
import { generatePartnerInvite } from '@/lib/partners/invite-actions'
import { Button } from '@/components/ui/button'
import { Send, Copy, Check, AlertCircle } from '@/components/ui/icons'

type Props = {
  partnerId: string
  isClaimed: boolean
  partnerName: string
}

export function PartnerInviteButton({ partnerId, isClaimed, partnerName }: Props) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (isClaimed) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-950 border border-green-200 rounded-lg px-3 py-2">
        <Check size={14} />
        <span>{partnerName} has claimed their partner account</span>
      </div>
    )
  }

  async function handleGenerate() {
    setError(null)
    setLoading(true)
    try {
      const result = await generatePartnerInvite(partnerId)
      setInviteUrl(result.inviteUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invite')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (inviteUrl) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-stone-500">
          Copy this link and send it to {partnerName}:
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-xs font-mono text-stone-300 select-all"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          </Button>
        </div>
        <p className="text-xs text-stone-400">
          The link is single-use. Generate a new one if it expires or is lost.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-950 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
      <Button variant="secondary" onClick={handleGenerate} disabled={loading}>
        <Send size={14} className="mr-2" />
        {loading ? 'Generating…' : 'Invite Partner to Portal'}
      </Button>
    </div>
  )
}
