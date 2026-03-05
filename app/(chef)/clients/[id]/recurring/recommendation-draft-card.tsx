'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { format, parseISO } from 'date-fns'

interface RecommendationDraftCardProps {
  draft: string
  sendDate: string | null
}

export function RecommendationDraftCard({ draft, sendDate }: RecommendationDraftCardProps) {
  const [copied, setCopied] = useState(false)
  const sendDateLabel = useMemo(() => {
    if (!sendDate) return null
    return format(parseISO(sendDate), 'EEE, MMM d')
  }, [sendDate])

  async function handleCopy() {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-500">
          {sendDateLabel ? `Target send date: ${sendDateLabel}` : 'Target send date not available'}
        </p>
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy Draft'}
        </Button>
      </div>
      <Textarea value={draft} readOnly rows={14} />
    </div>
  )
}

