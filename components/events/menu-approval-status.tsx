'use client'

// Menu Approval Status Panel
// Shown on the chef event detail page.
// Displays current approval state and lets chef send/resend the menu for approval.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { sendMenuForApproval } from '@/lib/events/menu-approval-actions'

type ApprovalStatus = 'not_sent' | 'sent' | 'approved' | 'revision_requested'

type Props = {
  eventId: string
  status: ApprovalStatus
  sentAt: string | null
  approvedAt: string | null
  revisionNotes: string | null
}

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  not_sent:           { label: 'Not Sent',         variant: 'default' },
  sent:               { label: 'Awaiting Approval', variant: 'warning' },
  approved:           { label: 'Approved',          variant: 'success' },
  revision_requested: { label: 'Revision Requested', variant: 'error' },
}

export function MenuApprovalStatus({ eventId, status, sentAt, approvedAt, revisionNotes }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = STATUS_CONFIG[status]

  async function handleSend() {
    setLoading(true)
    setError(null)
    try {
      await sendMenuForApproval(eventId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send menu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-stone-700">Menu Approval</span>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>

      {status === 'not_sent' && (
        <div className="space-y-1">
          <p className="text-xs text-stone-500">
            Send the menu to the client for formal approval before the event.
          </p>
          <Button size="sm" onClick={handleSend} disabled={loading}>
            {loading ? 'Sending…' : 'Send Menu for Approval'}
          </Button>
        </div>
      )}

      {status === 'sent' && (
        <div className="space-y-1">
          <p className="text-xs text-stone-500">
            Sent {sentAt ? new Date(sentAt).toLocaleDateString() : ''}. Awaiting client response.
          </p>
          <Button size="sm" variant="secondary" onClick={handleSend} disabled={loading}>
            {loading ? 'Resending…' : 'Resend'}
          </Button>
        </div>
      )}

      {status === 'approved' && (
        <p className="text-xs text-green-700">
          Approved {approvedAt ? new Date(approvedAt).toLocaleDateString() : ''}.
        </p>
      )}

      {status === 'revision_requested' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-800">Client requested revisions:</p>
          <p className="text-xs text-amber-700">{revisionNotes}</p>
          <Button size="sm" onClick={handleSend} disabled={loading}>
            {loading ? 'Sending…' : 'Send Updated Menu'}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
