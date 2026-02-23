// TakeAChef Status Prompt
// Compact card prompting the chef to sync status for TakeAChef inquiries.
// Parent component decides when to render this (only for TAC inquiries in awaiting_chef status).
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { transitionInquiry } from '@/lib/inquiries/actions'
import { addInquiryNote } from '@/lib/inquiries/note-actions'

interface TacStatusPromptProps {
  inquiryId: string
  clientName: string | null
  eventDate: string | null
  tacLink: string | null
}

type QuickStatus = 'still_discussing' | 'sent_proposal' | 'want_to_book' | 'changed_mind'

export function TacStatusPrompt({
  inquiryId,
  clientName,
  eventDate,
  tacLink,
}: TacStatusPromptProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (dismissed) return null

  const displayName = clientName || 'A client'
  const dateLabel = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null

  const handleQuickStatus = async (status: QuickStatus) => {
    setLoading(true)
    setError(null)

    try {
      // Save note first if present
      if (noteText.trim()) {
        await addInquiryNote({
          inquiry_id: inquiryId,
          note_text: noteText.trim(),
          category: 'general',
        })
      }

      switch (status) {
        case 'still_discussing':
          // No status change -- just dismiss the prompt
          setDismissed(true)
          break

        case 'sent_proposal':
          // awaiting_chef -> quoted
          await transitionInquiry(inquiryId, 'quoted')
          router.refresh()
          break

        case 'want_to_book':
          // FSM requires awaiting_chef -> quoted -> confirmed (two steps)
          await transitionInquiry(inquiryId, 'quoted')
          await transitionInquiry(inquiryId, 'confirmed')
          router.refresh()
          break

        case 'changed_mind':
          // awaiting_chef -> declined
          await transitionInquiry(inquiryId, 'declined')
          router.refresh()
          break
      }
    } catch (err) {
      console.error('[TacStatusPrompt] Action failed:', err)
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-50/50 p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="warning">TakeAChef</Badge>
          <p className="text-sm font-medium text-stone-800 truncate">
            {displayName} messaged you on TakeAChef
          </p>
          {dateLabel && <span className="text-xs text-stone-500 shrink-0">{dateLabel}</span>}
        </div>

        {tacLink && (
          <a href={tacLink} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <Button variant="primary" size="sm" type="button">
              Open in TakeAChef
            </Button>
          </a>
        )}
      </div>

      {/* Quick status buttons */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => handleQuickStatus('still_discussing')}
        >
          Still Discussing
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={loading}
          loading={loading}
          onClick={() => handleQuickStatus('sent_proposal')}
        >
          Sent Proposal
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={loading}
          onClick={() => handleQuickStatus('want_to_book')}
        >
          They Want to Book
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={loading}
          onClick={() => handleQuickStatus('changed_mind')}
        >
          Changed Their Mind
        </Button>
      </div>

      {/* Optional note toggle + textarea */}
      {!showNote ? (
        <button
          type="button"
          className="text-xs text-stone-500 hover:text-stone-700 underline underline-offset-2"
          onClick={() => setShowNote(true)}
        >
          Add a Note
        </button>
      ) : (
        <div className="space-y-1.5">
          <textarea
            className="w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
            rows={2}
            placeholder="Quick note about this conversation..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-stone-400">
            Note will be saved with whichever status you pick above.
          </p>
        </div>
      )}

      {/* Error display */}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
