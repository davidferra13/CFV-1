'use client'

import { useState } from 'react'
import { Star, Copy, Loader2, Sparkles } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { draftReviewRequest, type ReviewRequestDraft } from '@/lib/ai/review-request'
import { toast } from 'sonner'

export function ReviewRequestPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<ReviewRequestDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'email' | 'sms'>('email')

  async function run() {
    setLoading(true)
    try {
      const data = await draftReviewRequest(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review request drafting failed')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-stone-300">Review Request</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Drafting...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Draft Request
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Personalized review request referencing specific dishes and moments from this event.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-stone-300">Review Request Draft</span>
          <Badge variant="warning">Draft</Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('email')}
            className={`text-xs px-2 py-1 rounded ${view === 'email' ? 'bg-stone-800 font-medium' : 'text-stone-500'}`}
          >
            Email
          </button>
          <button
            onClick={() => setView('sms')}
            className={`text-xs px-2 py-1 rounded ${view === 'sms' ? 'bg-stone-800 font-medium' : 'text-stone-500'}`}
          >
            SMS/DM
          </button>
          <Button variant="ghost" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Regenerate'}
          </Button>
        </div>
      </div>

      {view === 'email' && (
        <div className="space-y-2">
          <div className="bg-stone-800 rounded p-2">
            <div className="text-[11px] text-stone-400 mb-0.5">Subject</div>
            <div className="text-sm text-stone-300">{result.subject}</div>
          </div>
          <div className="bg-stone-800 rounded p-2">
            <div className="text-[11px] text-stone-400 mb-0.5">Body</div>
            <div className="text-sm text-stone-300 whitespace-pre-wrap">{result.body}</div>
          </div>
          <Button
            variant="secondary"
            onClick={() => copyToClipboard(`Subject: ${result.subject}\n\n${result.body}`)}
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy Email
          </Button>
        </div>
      )}

      {view === 'sms' && (
        <div className="space-y-2">
          <div className="bg-stone-800 rounded p-2">
            <div className="text-sm text-stone-300">{result.shortVersion}</div>
            <div className="text-[11px] text-stone-400 mt-1">
              {result.shortVersion.length} characters
            </div>
          </div>
          <Button variant="secondary" onClick={() => copyToClipboard(result.shortVersion)}>
            <Copy className="w-3 h-3 mr-1" />
            Copy Message
          </Button>
        </div>
      )}

      <div className="text-xs text-stone-500">
        Best platform: <span className="font-medium">{result.reviewPlatformSuggestion}</span>
      </div>
      <p className="text-[11px] text-stone-400">
        Auto draft · Review before sending - personalize if needed
      </p>
    </div>
  )
}
