'use client'

// Draft Review Card
// Shown in Step 4 (Review Drafts) of the Push Dinner builder
// and on the campaign detail "Pending Drafts" tab.
// Each card shows one recipient's AI-generated draft with approve/edit/skip actions.

import { useState } from 'react'
import { Check, Pencil, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { approveDraft, updateDraft, skipRecipient } from '@/lib/campaigns/push-dinner-actions'
import type { PushDinnerRecipient } from '@/lib/campaigns/push-dinner-actions'

type Props = {
  recipient: PushDinnerRecipient & { client_full_name?: string | null }
  onApproved?: () => void
  onSkipped?: () => void
}

export function DraftReviewCard({ recipient, onApproved, onSkipped }: Props) {
  const [editing, setEditing] = useState(false)
  const [editSubject, setEditSubject] = useState(recipient.draft_subject ?? '')
  const [editBody, setEditBody] = useState(recipient.draft_body ?? '')
  const [loading, setLoading] = useState(false)
  const [approved, setApproved] = useState(recipient.chef_approved)
  const [skipped, setSkipped] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (skipped) return null

  const displayName = recipient.client_full_name || recipient.email
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  async function handleApprove() {
    setLoading(true)
    try {
      if (editing) {
        await updateDraft(recipient.id, editSubject, editBody)
        setEditing(false)
      }
      await approveDraft(recipient.id)
      setApproved(true)
      onApproved?.()
    } catch (err) {
      console.error('Approve failed', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveEdit() {
    setLoading(true)
    try {
      await updateDraft(recipient.id, editSubject, editBody)
      setEditing(false)
    } catch (err) {
      console.error('Save edit failed', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSkip() {
    setLoading(true)
    try {
      await skipRecipient(recipient.id)
      setSkipped(true)
      onSkipped?.()
    } catch (err) {
      console.error('Skip failed', err)
    } finally {
      setLoading(false)
    }
  }

  const hasDraft = !!(recipient.draft_subject && recipient.draft_body)

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        approved ? 'border-green-200 bg-green-50' : 'border-stone-200 bg-white'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
          {initials || '?'}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-stone-800 truncate">{displayName}</span>
            {approved && <Badge variant="success">Approved</Badge>}
            {!hasDraft && !approved && <Badge variant="warning">No draft yet</Badge>}
          </div>
          {hasDraft && !editing && !approved && (
            <p className="text-xs text-stone-500 mt-0.5 truncate">{recipient.draft_subject}</p>
          )}
        </div>

        {/* Expand toggle */}
        {hasDraft && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-stone-400 hover:text-stone-600 shrink-0"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Draft content */}
      {hasDraft && (expanded || editing) && (
        <div className="mt-3 space-y-2">
          {editing ? (
            <>
              <div>
                <label className="text-[11px] text-stone-400 font-medium uppercase tracking-wide">
                  Subject
                </label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="mt-0.5 w-full text-sm border border-stone-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-400 font-medium uppercase tracking-wide">
                  Message
                </label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={6}
                  className="mt-0.5 w-full text-sm border border-stone-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-y"
                />
              </div>
            </>
          ) : (
            <>
              <div className="bg-stone-50 rounded p-2.5">
                <div className="text-[11px] text-stone-400 font-medium uppercase tracking-wide mb-1">
                  Subject
                </div>
                <div className="text-sm text-stone-700">{recipient.draft_subject}</div>
              </div>
              <div className="bg-stone-50 rounded p-2.5">
                <div className="text-[11px] text-stone-400 font-medium uppercase tracking-wide mb-1">
                  Message
                </div>
                <div className="text-sm text-stone-700 whitespace-pre-wrap">
                  {recipient.draft_body}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      {!approved && (
        <div className="flex items-center gap-2 mt-3">
          {editing ? (
            <>
              <Button
                variant="primary"
                onClick={handleSaveEdit}
                disabled={loading}
                className="text-xs h-7 px-3"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save edits'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(false)
                  setEditSubject(recipient.draft_subject ?? '')
                  setEditBody(recipient.draft_body ?? '')
                }}
                className="text-xs h-7 px-3"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {hasDraft && (
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  disabled={loading}
                  className="text-xs h-7 px-3 gap-1"
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  Approve
                </Button>
              )}
              {hasDraft && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(true)
                    setExpanded(true)
                  }}
                  disabled={loading}
                  className="text-xs h-7 px-3 gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={loading}
                className="text-xs h-7 px-3 gap-1 text-stone-400 hover:text-red-500"
              >
                <X className="w-3 h-3" />
                Skip
              </Button>
            </>
          )}
        </div>
      )}

      {/* Approved state confirmation */}
      {approved && (
        <div className="flex items-center gap-2 mt-3">
          <Check className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs text-green-700">Will be sent when you launch</span>
        </div>
      )}
    </div>
  )
}
