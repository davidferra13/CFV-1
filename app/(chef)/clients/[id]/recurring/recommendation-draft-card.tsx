'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { format, parseISO } from 'date-fns'
import { sendRecurringRecommendationToClient } from '@/lib/recurring/actions'

interface RecommendationDraftCardProps {
  clientId: string
  draft: string
  sendDate: string | null
  targetWeekStart?: string | null
}

export function RecommendationDraftCard({
  clientId,
  draft,
  sendDate,
  targetWeekStart,
}: RecommendationDraftCardProps) {
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sendDateLabel = useMemo(() => {
    if (!sendDate) return null
    return format(parseISO(sendDate), 'EEE, MMM d')
  }, [sendDate])

  async function handleCopy() {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  function handleSendToClient() {
    setError(null)
    startTransition(async () => {
      try {
        await sendRecurringRecommendationToClient({
          client_id: clientId,
          draft,
          target_week_start: targetWeekStart ?? undefined,
        })
        setSent(true)
        setTimeout(() => setSent(false), 2400)
      } catch (err: any) {
        setError(err?.message || 'Failed to send recommendation')
      }
    })
  }

  return (
    <div className="space-y-3">
      {sent && <Alert variant="success">Recommendation sent to client portal.</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-500">
          {sendDateLabel ? `Target send date: ${sendDateLabel}` : 'Target send date not available'}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy Draft'}
          </Button>
          <Button variant="primary" size="sm" loading={isPending} onClick={handleSendToClient}>
            {isPending ? 'Sending...' : sent ? 'Sent' : 'Send to Client'}
          </Button>
        </div>
      </div>
      <Textarea value={draft} readOnly rows={14} />
    </div>
  )
}
