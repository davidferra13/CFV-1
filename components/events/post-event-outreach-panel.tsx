'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { draftPostEventEmail, draftTestimonialRequest } from '@/lib/guest-comms/actions'
import { copyToClipboard } from '@/lib/handoffs/client-actions'

type EmailDraft = {
  subject: string
  body: string
  recipientCount: number
  recipients: { name: string; email: string }[]
  chefName: string
}

export function PostEventOutreachPanel({ eventId }: { eventId: string }) {
  const [draft, setDraft] = useState<EmailDraft | null>(null)
  const [draftType, setDraftType] = useState<'followup' | 'guest_testimonial' | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedTarget, setCopiedTarget] = useState<'email' | 'recipients' | null>(null)
  const [error, setError] = useState('')

  async function handleDraft(type: 'followup' | 'guest_testimonial') {
    setLoading(true)
    setError('')
    setDraftType(type)

    try {
      const result =
        type === 'followup'
          ? await draftPostEventEmail(eventId)
          : await draftTestimonialRequest(eventId)

      setDraft(result)
    } catch (err: any) {
      setError(err.message || 'Failed to generate draft')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!draft) return
    const text = `Subject: ${draft.subject}\n\n${draft.body}`
    const result = await copyToClipboard(text, 'Email draft')
    if (result.success) {
      setCopiedTarget('email')
      setError('')
      setTimeout(() => setCopiedTarget(null), 2000)
    } else {
      setError(result.error)
    }
  }

  async function handleCopyRecipients() {
    if (!draft) return
    const emails = draft.recipients.map((r) => `${r.name} <${r.email}>`).join(', ')
    const result = await copyToClipboard(emails, 'Recipients')
    if (result.success) {
      setCopiedTarget('recipients')
      setError('')
      setTimeout(() => setCopiedTarget(null), 2000)
    } else {
      setError(result.error)
    }
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-stone-100 mb-2">Guest Outreach</h3>
      <p className="text-xs text-stone-500 mb-3">
        Draft emails for your event guests. Client post-event surveys live in the canonical survey
        flow; this panel is only for guest follow-up.
      </p>

      {!draft ? (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            className="text-sm"
            disabled={loading}
            onClick={() => handleDraft('followup')}
          >
            {loading && draftType === 'followup' ? 'Drafting...' : 'Thank You Email'}
          </Button>
          <Button
            variant="secondary"
            className="text-sm"
            disabled={loading}
            onClick={() => handleDraft('guest_testimonial')}
          >
            {loading && draftType === 'guest_testimonial'
              ? 'Drafting...'
              : 'Guest Testimonial Request'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="info">
              {draftType === 'followup' ? 'Thank You' : 'Guest Testimonial'}
            </Badge>
            <Badge variant="default">{draft.recipientCount} recipients</Badge>
          </div>

          <div className="bg-stone-800 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-stone-300">Subject: {draft.subject}</p>
            <pre className="text-sm text-stone-400 whitespace-pre-wrap font-sans leading-relaxed">
              {draft.body}
            </pre>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="primary" className="text-sm" onClick={handleCopy}>
              {copiedTarget === 'email' ? 'Copied!' : 'Copy Email'}
            </Button>
            <Button variant="secondary" className="text-sm" onClick={handleCopyRecipients}>
              {copiedTarget === 'recipients' ? 'Recipients copied!' : 'Copy Recipients'}
            </Button>
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => {
                setDraft(null)
                setDraftType(null)
              }}
            >
              Back
            </Button>
          </div>

          {draft.recipientCount > 0 && (
            <details className="text-xs text-stone-500">
              <summary className="cursor-pointer hover:text-stone-300">
                Show {draft.recipientCount} recipients
              </summary>
              <div className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                {draft.recipients.map((r, i) => (
                  <p key={i}>
                    {r.name} - {r.email}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </Card>
  )
}
