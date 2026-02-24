'use client'

import { useState } from 'react'
import { Quote, Loader2, Sparkles, Copy, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  selectTestimonialHighlights,
  type TestimonialSelectionResult,
} from '@/lib/ai/testimonial-selection'
import { toast } from 'sonner'

export function TestimonialPanel() {
  const [result, setResult] = useState<TestimonialSelectionResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await selectTestimonialHighlights()
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Testimonial analysis failed')
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(`"${text}"`)
    toast.success('Testimonial copied')
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Quote className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Testimonial Highlights</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Find Best Quotes
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Finds the strongest client quotes from your AARs and surveys for portfolio use.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Quote className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">Testimonial Highlights</span>
          <Badge variant="success">{result.portfolioReady.length} ready</Badge>
          {result.needsEditing.length > 0 && (
            <Badge variant="warning">{result.needsEditing.length} need editing</Badge>
          )}
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <p className="text-xs text-stone-400">{result.summary}</p>

      {result.portfolioReady.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            Portfolio Ready
          </div>
          {result.portfolioReady.map((t, i) => (
            <div key={i} className="border border-green-200 bg-green-950 rounded p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <blockquote className="text-sm text-stone-200 italic leading-relaxed">
                  "{t.quote}"
                </blockquote>
                <Button variant="ghost" onClick={() => copy(t.quote)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <span>
                  {t.clientNameInitial} · {t.eventType}
                </span>
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-500" />
                  {t.score}
                </span>
                <span>{t.bestPlatform}</span>
              </div>
              <div className="text-[11px] text-green-700">{t.why}</div>
            </div>
          ))}
        </div>
      )}

      {result.needsEditing.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            Needs Minor Editing
          </div>
          {result.needsEditing.map((t, i) => (
            <div key={i} className="border border-stone-700 bg-stone-800 rounded p-3 space-y-1">
              <blockquote className="text-sm text-stone-300 italic">"{t.quote}"</blockquote>
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <span>
                  {t.clientNameInitial} · {t.eventType}
                </span>
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-500" />
                  {t.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-stone-400">
        Auto draft · Get client permission before publishing testimonials publicly
      </p>
    </div>
  )
}
