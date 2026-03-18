// TakeAChef Address Lead Prompt
// For NEW TakeAChef inquiries - chef must acknowledge each lead, clearing the "untouched" state.
// Different from TacStatusPrompt which handles awaiting_chef status.
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { transitionInquiry } from '@/lib/inquiries/actions'

interface TacAddressLeadProps {
  inquiryId: string
  clientName: string | null
  eventDate: string | null
  tacLink: string | null
  createdAt: string
}

export function TacAddressLead({
  inquiryId,
  clientName,
  eventDate,
  tacLink,
  createdAt,
}: TacAddressLeadProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayName = clientName || 'New lead'
  const ageHours = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000)
  const isStale = ageHours > 24
  const isUrgent = ageHours > 12

  const ageLabel =
    ageHours < 1
      ? 'just now'
      : ageHours < 24
        ? `${ageHours}h ago`
        : `${Math.floor(ageHours / 24)}d ago`

  const handleSendMenu = async () => {
    setLoading(true)
    setError(null)
    try {
      // new -> awaiting_client (chef initiated contact)
      await transitionInquiry(inquiryId, 'awaiting_client')
      router.refresh()
    } catch (err) {
      console.error('[TacAddressLead] Transition failed:', err)
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    setLoading(true)
    setError(null)
    try {
      // new -> declined
      await transitionInquiry(inquiryId, 'declined')
      router.refresh()
    } catch (err) {
      console.error('[TacAddressLead] Decline failed:', err)
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        isStale
          ? 'border-red-400/40 bg-red-950/50'
          : isUrgent
            ? 'border-orange-400/40 bg-orange-950/50'
            : 'border-amber-400/40 bg-amber-950/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant={isStale ? 'error' : 'warning'}>{isStale ? 'Stale' : 'Untouched'}</Badge>
          <p className="text-sm font-medium text-stone-800 truncate">
            {displayName} - new TakeAChef lead
          </p>
          <span
            className={`text-xs shrink-0 ${
              isStale ? 'text-red-600 font-medium' : 'text-stone-500'
            }`}
          >
            {ageLabel}
          </span>
        </div>

        {tacLink && (
          <Button
            variant="primary"
            size="sm"
            href={tacLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            Open in TakeAChef
          </Button>
        )}
      </div>

      {/* Urgency context */}
      <p className="text-xs text-stone-600">
        {isStale
          ? 'This lead is going cold. Address it now or decline it - waiting longer means losing the booking.'
          : isUrgent
            ? "This lead has been waiting over 12 hours. Respond today or they'll move on to another chef."
            : 'New lead - respond within 12 hours to stay competitive on TakeAChef.'}
      </p>

      {/* Quick actions */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            disabled={loading}
            loading={loading}
            onClick={handleSendMenu}
          >
            I'll Send a Menu
          </Button>
          <Button variant="ghost" size="sm" disabled={loading} onClick={handleDecline}>
            Not Interested
          </Button>
        </div>
        <p className="text-xs-tight text-stone-400">
          "Send a Menu" marks this lead as addressed - then open TakeAChef to send your initial
          menu. "Not Interested" declines the lead.
        </p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
