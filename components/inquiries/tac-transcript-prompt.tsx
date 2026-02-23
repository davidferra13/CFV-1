// TakeAChef Transcript Prompt
// Persistent amber banner encouraging chefs to paste their TakeAChef conversation.
// TakeAChef locks transcripts after the inquiry closes — this is the only way to keep them.
'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TacTranscriptPaste } from './tac-transcript-paste'

interface TacTranscriptPromptProps {
  inquiryId: string
  clientName: string | null
  tacMessageCount: number // count of messages with channel='take_a_chef' in the thread
}

export function TacTranscriptPrompt({
  inquiryId,
  clientName,
  tacMessageCount,
}: TacTranscriptPromptProps) {
  const [dismissed, setDismissed] = useState(false)
  const [showPaste, setShowPaste] = useState(false)

  // Check localStorage for per-inquiry dismissal
  useEffect(() => {
    const key = `tac-transcript-dismissed-${inquiryId}`
    if (typeof window !== 'undefined' && localStorage.getItem(key) === '1') {
      setDismissed(true)
    }
  }, [inquiryId])

  // Don't show if already pasted enough or dismissed
  if (dismissed || tacMessageCount >= 3) return null

  const displayName = clientName || 'your client'

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tac-transcript-dismissed-${inquiryId}`, '1')
    }
    setDismissed(true)
  }

  return (
    <>
      <div className="rounded-lg border border-amber-400/40 bg-amber-50/60 p-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Badge variant="warning" className="shrink-0 mt-0.5">
              Transcript
            </Badge>
            <div>
              <p className="text-sm font-medium text-stone-800">
                Save your TakeAChef conversation with {displayName}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                TakeAChef locks transcripts after the inquiry closes. Copy-paste the conversation
                here so you never lose it.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-stone-400 hover:text-stone-600 text-lg leading-none shrink-0"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowPaste(true)}>
          Paste Transcript
        </Button>
      </div>

      {showPaste && (
        <TacTranscriptPaste
          inquiryId={inquiryId}
          clientName={clientName}
          onClose={() => setShowPaste(false)}
        />
      )}
    </>
  )
}
