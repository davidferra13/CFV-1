// Leads List - Client component for viewing and claiming contact form submissions
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { claimContactSubmission, dismissContactSubmission } from '@/lib/contact/claim'
import { formatDistanceToNow } from 'date-fns'
import { Globe, Mail, ArrowRight, X } from '@/components/ui/icons'

type Submission = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  created_at: string
}

export function LeadsList({ submissions }: { submissions: Submission[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = submissions.filter((s) => !dismissed.has(s.id))

  if (visible.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Globe className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-stone-300">No unclaimed leads</h2>
        <p className="text-stone-500 mt-1">
          When someone submits the contact form on your website, it will appear here.
        </p>
        <Link href="/inquiries/new" className="inline-block mt-4">
          <Button variant="secondary">Log Manual Lead</Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500">
        {visible.length} unclaimed {visible.length === 1 ? 'lead' : 'leads'}
      </p>
      {visible.map((submission) => (
        <LeadCard
          key={submission.id}
          submission={submission}
          onDismissed={() => setDismissed((prev) => new Set(prev).add(submission.id))}
        />
      ))}
    </div>
  )
}

function LeadCard({
  submission,
  onDismissed,
}: {
  submission: Submission
  onDismissed: () => void
}) {
  const router = useRouter()
  const [claiming, startClaim] = useTransition()
  const [dismissing, startDismiss] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClaim = () => {
    setError(null)
    startClaim(async () => {
      try {
        const result = await claimContactSubmission(submission.id)
        router.push(`/inquiries/${result.inquiryId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to claim lead')
      }
    })
  }

  const handleDismiss = () => {
    setError(null)
    startDismiss(async () => {
      try {
        await dismissContactSubmission(submission.id)
        onDismissed()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to dismiss')
      }
    })
  }

  const timeAgo = formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })
  const truncatedMessage =
    submission.message.length > 200 ? submission.message.slice(0, 200) + '...' : submission.message

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <h3 className="font-semibold text-stone-100 truncate">{submission.name}</h3>
            <span className="text-xs text-stone-400 flex-shrink-0">{timeAgo}</span>
          </div>

          {/* Email */}
          <div className="flex items-center gap-1.5 text-sm text-stone-500 mb-2">
            <Mail className="w-3.5 h-3.5" />
            <span>{submission.email}</span>
          </div>

          {/* Subject */}
          {submission.subject && (
            <p className="text-sm font-medium text-stone-300 mb-1">{submission.subject}</p>
          )}

          {/* Message */}
          <p className="text-sm text-stone-400 leading-relaxed">{truncatedMessage}</p>

          {/* Error */}
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <Button size="sm" onClick={handleClaim} loading={claiming} disabled={dismissing}>
            Claim
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            loading={dismissing}
            disabled={claiming}
          >
            <X className="w-3.5 h-3.5" />
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  )
}
