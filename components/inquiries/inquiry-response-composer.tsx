// Inquiry Response Composer
// AI-powered draft generation + chef review + Gmail send
// This component handles the full correspondence workflow for an inquiry.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { draftResponseForInquiry } from '@/lib/ai/correspondence'
import { createDraftMessage, approveAndSendMessage, updateDraftMessage } from '@/lib/gmail/actions'

interface InquiryResponseComposerProps {
  inquiryId: string
  clientId: string | null
  clientEmail: string | null
  gmailConnected: boolean
}

interface DraftState {
  draft: string
  subject: string
  flags: string[]
  lifecycleState: string
  emailStage: string
  missingBlocking: string[]
  pricingAllowed: boolean
  confidence: string
  conversationDepth: number
}

export function InquiryResponseComposer({
  inquiryId,
  clientId,
  clientEmail,
  gmailConnected,
}: InquiryResponseComposerProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [draftState, setDraftState] = useState<DraftState | null>(null)
  const [editedBody, setEditedBody] = useState('')
  const [editedSubject, setEditedSubject] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [savedMessageId, setSavedMessageId] = useState<string | null>(null)

  // ── Generate AI Draft ──────────────────────────────────────────────────────

  const handleGenerateDraft = async () => {
    setGenerating(true)
    setError(null)
    setSuccess(null)
    setDraftState(null)
    setSavedMessageId(null)

    try {
      const result = await draftResponseForInquiry(inquiryId)

      // Parse subject from draft (format: "Subject: ...\n\n...")
      let subject = ''
      let body = result.draft
      const subjectMatch = result.draft.match(/^Subject:\s*(.+?)(?:\n\n|\r\n\r\n)/)
      if (subjectMatch) {
        subject = subjectMatch[1].trim()
        body = result.draft.slice(subjectMatch[0].length).trim()
      }

      setDraftState({
        draft: body,
        subject,
        flags: result.flags,
        lifecycleState: result.lifecycleState,
        emailStage: result.emailStage,
        missingBlocking: result.missingBlocking,
        pricingAllowed: result.pricingAllowed,
        confidence: result.confidence,
        conversationDepth: result.conversationDepth,
      })
      setEditedBody(body)
      setEditedSubject(subject)
    } catch (err) {
      const e = err as Error
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  // ── Approve and Send ───────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!clientId || !clientEmail) {
      setError('Cannot send: client has no email address')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      // Create the message record as a draft first
      let messageId = savedMessageId
      if (!messageId) {
        const created = await createDraftMessage({
          inquiryId,
          clientId,
          subject: editedSubject || 'Your dinner inquiry',
          body: editedBody,
        })
        messageId = created.messageId
        setSavedMessageId(messageId)
      } else {
        // Update existing draft with any edits
        await updateDraftMessage(messageId, {
          subject: editedSubject,
          body: editedBody,
        })
      }

      // Approve and send via Gmail
      const result = await approveAndSendMessage(messageId)

      if (result.success) {
        setSuccess('Message sent successfully via Gmail')
        setDraftState(null)
        setSavedMessageId(null)
        router.refresh()
      }
    } catch (err) {
      const e = err as Error
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  // ── Discard Draft ──────────────────────────────────────────────────────────

  const handleDiscard = () => {
    setDraftState(null)
    setEditedBody('')
    setEditedSubject('')
    setSavedMessageId(null)
    setError(null)
    setSuccess(null)
  }

  // ── No Gmail / No Client Guards ────────────────────────────────────────────

  if (!gmailConnected) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Response Draft</h2>
        <p className="text-sm text-stone-500">
          Connect your Gmail account in Settings to enable response drafting and sending.
        </p>
      </Card>
    )
  }

  if (!clientId || !clientEmail) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Response Draft</h2>
        <p className="text-sm text-stone-500">
          This inquiry needs a linked client with an email address before you can send responses.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={handleGenerateDraft}
          loading={generating}
        >
          Generate Draft (preview only)
        </Button>
        {draftState && (
          <div className="mt-4 bg-stone-800 rounded-lg p-4">
            <p className="text-xs text-stone-500 mb-2">
              Preview only - cannot send without client email
            </p>
            <p className="text-sm whitespace-pre-wrap">{draftState.draft}</p>
          </div>
        )}
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Response Draft</h2>
        {!draftState && (
          <Button variant="primary" size="sm" onClick={handleGenerateDraft} loading={generating}>
            {generating ? 'Generating...' : 'Generate Draft'}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}

      {draftState && (
        <div className="space-y-4">
          {/* Lifecycle Context */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{draftState.lifecycleState.replace(/_/g, ' ')}</Badge>
            <Badge variant="default">{draftState.emailStage} stage</Badge>
            <Badge
              variant={
                draftState.confidence === 'high'
                  ? 'success'
                  : draftState.confidence === 'medium'
                    ? 'warning'
                    : 'error'
              }
            >
              {draftState.confidence} confidence
            </Badge>
            {draftState.pricingAllowed && <Badge variant="success">pricing allowed</Badge>}
          </div>

          {/* Flags */}
          {draftState.flags.length > 0 && (
            <Alert variant="warning">
              <div className="text-sm">
                <p className="font-medium">Review flags:</p>
                <ul className="list-disc list-inside mt-1">
                  {draftState.flags.map((flag, i) => (
                    <li key={i}>{flag}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}

          {/* Missing Data */}
          {draftState.missingBlocking.length > 0 && (
            <div className="bg-amber-950 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-800">Missing blocking data:</p>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {draftState.missingBlocking.map((field) => (
                  <Badge key={field} variant="warning">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Subject Line */}
          <div>
            <label className="text-xs font-medium text-stone-500 block mb-1">Subject</label>
            {isEditing ? (
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                aria-label="Email subject"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            ) : (
              <p className="text-sm text-stone-100 bg-stone-800 rounded-lg px-3 py-2">
                {editedSubject || '(no subject)'}
              </p>
            )}
          </div>

          {/* Draft Body */}
          <div>
            <label className="text-xs font-medium text-stone-500 block mb-1">
              Message to {clientEmail}
            </label>
            {isEditing ? (
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={12}
                aria-label="Email body"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y"
              />
            ) : (
              <div className="bg-stone-800 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {editedBody}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {isEditing ? (
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                Done Editing
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              loading={sending}
              disabled={!editedBody.trim()}
            >
              {sending ? 'Sending...' : 'Approve & Send'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateDraft}
              loading={generating}
            >
              Regenerate
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDiscard}>
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!draftState && !generating && !success && (
        <p className="text-sm text-stone-500">
          Generate a contextual response draft based on lifecycle state, client history, and brand
          voice.
        </p>
      )}
    </Card>
  )
}
