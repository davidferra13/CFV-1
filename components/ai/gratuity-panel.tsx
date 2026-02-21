'use client'

import { useState } from 'react'
import { DollarSign, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { draftGratuityFraming, type GratuityFramingDraft } from '@/lib/ai/gratuity-framing'
import { toast } from 'sonner'

const APPROACH_LABELS: Record<string, string> = {
  mention_in_invoice: 'Add to invoice',
  verbal_mention: 'Mention verbally',
  note_in_message: 'Include in message',
  no_ask_needed: 'No ask needed',
}

export function GratuityPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<GratuityFramingDraft | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await draftGratuityFraming(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gratuity framing failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-stone-700">Gratuity Approach</span>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Advising...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Get Guidance
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Personalized approach for presenting gratuity based on this client relationship.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-stone-700">Gratuity Approach</span>
          <Badge variant="info">{APPROACH_LABELS[result.approach]}</Badge>
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <div className="text-xs text-stone-600">{result.approachRationale}</div>

      {result.suggestedGratuityRangePercent && (
        <div className="bg-green-50 rounded p-2 text-xs text-green-800">
          Suggested range: {result.suggestedGratuityRangePercent.min}%–
          {result.suggestedGratuityRangePercent.max}%
        </div>
      )}

      {result.verbalScript && (
        <div className="bg-stone-50 rounded p-2">
          <div className="text-[11px] text-stone-400 mb-0.5">Verbal script</div>
          <div className="text-sm text-stone-700 italic">"{result.verbalScript}"</div>
        </div>
      )}

      {result.messageDraft && (
        <div className="bg-stone-50 rounded p-2">
          <div className="text-[11px] text-stone-400 mb-0.5">Message line to include</div>
          <div className="text-sm text-stone-700">{result.messageDraft}</div>
        </div>
      )}

      <div className="text-xs text-stone-500">Timing: {result.timing}</div>
      <p className="text-[11px] text-stone-400">
        Auto guidance · Adjust based on your read of the client relationship
      </p>
    </div>
  )
}
