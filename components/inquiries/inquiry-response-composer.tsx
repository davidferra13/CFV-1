// Inquiry Response Composer
// AI-powered draft generation plus chef review and Gmail send.

'use client'

import Link from 'next/link'
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
  const [savingDraft, setSavingDraft] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [draftState, setDraftState] = useState<DraftState | null>(null)
  const [editedBody, setEditedBody] = useState('')
  const [editedSubject, setEditedSubject] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [savedMessageId, setSavedMessageId] = useState<string | null>(null)

  const handleGenerateDraft = async () => {
    setGenerating(true)
    setError(null)
    setSuccess(null)
    setDraftState(null)
    setSavedMessageId(null)

    try {
      const result = await draftResponseForInquiry(inquiryId)

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

  const upsertDraftMessage = async () => {
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
      return messageId
    }

    await updateDraftMessage(messageId, {
      subject: editedSubject,
      body: editedBody,
    })

    return messageId
  }

  const handleSaveDraft = async () => {
    if (!clientId || !clientEmail) {
      setError('Cannot save draft: client has no email address')
      return
    }

    setSavingDraft(true)
    setError(null)
    setSuccess(null)

    try {
      await upsertDraftMessage()
      setSuccess('Draft saved to approval queue')
      router.refresh()
    } catch (err) {
      const e = err as Error
      setError(e.message)
    } finally {
      setSavingDraft(false)
    }
  }

  const handleSend = async () => {
    if (!clientId || !clientEmail) {
      setError('Cannot send: client has no email address')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      const messageId = await upsertDraftMessage()
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

  const handleDiscard = () => {
    setDraftState(null)
    setEditedBody('')
    setEditedSubject('')
    setSavedMessageId(null)
    setError(null)
    setSuccess(null)
  }

  if (!gmailConnected) {
    return (
      <Card className="p-6">
        <h2 className="mb-3 text-xl font-semibold">Response Draft</h2>
        <p className="text-sm text-stone-500">
          Connect your Gmail account in Settings to enable response drafting and sending.
        </p>
      </Card>
    )
  }

  if (!clientId || !clientEmail) {
    return (
      <Card className="p-6">
        <h2 className="mb-3 text-xl font-semibold">Response Draft</h2>
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
          <div className="mt-4 rounded-lg bg-stone-800 p-4">
            <p className="mb-2 text-xs text-stone-500">
              Preview only: cannot send without client email
            </p>
            <p className="whitespace-pre-wrap text-sm">{draftState.draft}</p>
          </div>
        )}
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
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

          {draftState.flags.length > 0 && (
            <Alert variant="warning">
              <div className="text-sm">
                <p className="font-medium">Review flags:</p>
                <ul className="mt-1 list-inside list-disc">
                  {draftState.flags.map((flag, index) => (
                    <li key={index}>{flag}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}

          {draftState.missingBlocking.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-950 p-3">
              <p className="text-xs font-medium text-amber-200">Missing blocking data:</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {draftState.missingBlocking.map((field) => (
                  <Badge key={field} variant="warning">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Subject</label>
            {isEditing ? (
              <input
                type="text"
                value={editedSubject}
                onChange={(event) => setEditedSubject(event.target.value)}
                aria-label="Email subject"
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <p className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100">
                {editedSubject || '(no subject)'}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              Message to {clientEmail}
            </label>
            {isEditing ? (
              <textarea
                value={editedBody}
                onChange={(event) => setEditedBody(event.target.value)}
                rows={12}
                aria-label="Email body"
                className="w-full resize-y rounded-lg border border-stone-600 px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <div className="whitespace-pre-wrap rounded-lg bg-stone-800 p-4 text-sm">
                {editedBody}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
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
              variant="secondary"
              size="sm"
              onClick={handleSaveDraft}
              loading={savingDraft}
              disabled={!editedBody.trim()}
            >
              {savingDraft ? 'Saving...' : 'Save Draft'}
            </Button>
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
            <Link
              href="/messages/approval-queue"
              className="inline-flex items-center text-sm text-brand-400 hover:text-brand-300"
            >
              Open Approval Queue
            </Link>
          </div>
        </div>
      )}

      {!draftState && !generating && !success && (
        <p className="text-sm text-stone-500">
          Generate a contextual response draft based on lifecycle state, client history, and brand
          voice.
        </p>
      )}
    </Card>
  )
}
