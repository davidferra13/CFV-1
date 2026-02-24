'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { scrubProspects } from '@/lib/prospecting/scrub-actions'
import { SCRUB_PRESETS } from '@/lib/prospecting/constants'
import { Loader2, Search, Zap } from 'lucide-react'

export function ScrubForm() {
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    success: boolean
    totalGenerated?: number
    duplicatesSkipped?: number
    enriched?: number
    error?: string
  } | null>(null)

  function handleScrub() {
    if (!query.trim() || isPending) return
    setResult(null)
    startTransition(async () => {
      try {
        const res = await scrubProspects(query)
        setResult({
          success: true,
          totalGenerated: res.totalGenerated,
          duplicatesSkipped: res.duplicatesSkipped,
          enriched: res.enriched,
        })
      } catch (err) {
        setResult({
          success: false,
          error: err instanceof Error ? err.message : 'Scrub failed',
        })
      }
    })
  }

  function applyPreset(presetQuery: string) {
    const region = query.match(/in\s+(.+)/i)?.[1] ?? ''
    if (region) {
      setQuery(`${presetQuery} in ${region}`)
    } else {
      setQuery(presetQuery)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-brand-500" />
          AI Lead Scrub
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            What prospects are you looking for?
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Type anything, e.g.:\n• "Top 50 wealthiest business owners in Massachusetts"\n• "All yacht clubs on Cape Cod"\n• "Top 100 car dealerships in Maine"\n• "Luxury wedding planners in the Hamptons"`}
            className="w-full h-32 rounded-lg border border-stone-600 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
            disabled={isPending}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-stone-500 self-center mr-1">Quick presets:</span>
          {SCRUB_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset.query)}
              className="px-3 py-1 text-xs rounded-full border border-stone-700 text-stone-400 hover:bg-stone-800 hover:border-stone-600 transition-colors"
              disabled={isPending}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleScrub}
            disabled={!query.trim() || isPending}
            className="flex items-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scrubbing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Scrub Prospects
              </>
            )}
          </Button>
          {isPending && (
            <span className="text-sm text-stone-500">
              This may take 1-2 minutes — AI is researching and enriching each prospect...
            </span>
          )}
        </div>

        {result && (
          <div
            className={`p-4 rounded-lg text-sm ${
              result.success
                ? 'bg-green-950 border border-green-200 text-green-800'
                : 'bg-red-950 border border-red-200 text-red-800'
            }`}
          >
            {result.success ? (
              <div>
                <p className="font-medium">Scrub complete!</p>
                <p className="mt-1">
                  {result.totalGenerated} new prospects generated
                  {(result.duplicatesSkipped ?? 0) > 0 &&
                    ` (${result.duplicatesSkipped} duplicates skipped)`}
                  {(result.enriched ?? 0) > 0 && `, ${result.enriched} enriched with web data`}
                </p>
              </div>
            ) : (
              <p>{result.error}</p>
            )}
          </div>
        )}

        {/* How It Works — always visible */}
        <div className="rounded-lg bg-stone-800 border border-stone-700 p-4 space-y-3">
          <h4 className="text-sm font-medium text-stone-300">How AI Scrub Works</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-stone-400">
            <div className="space-y-1">
              <p className="font-medium text-stone-200">Phase 1: Generate</p>
              <p>
                Ollama (local AI) generates a list of real businesses or individuals matching your
                query. Up to 10 prospects per scrub.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-stone-200">Phase 2: Enrich</p>
              <p>
                For the top 5, the system searches the public web for their actual website, phone
                number, email, and social profiles.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-stone-200">Phase 3: Strategize</p>
              <p>
                AI writes personalized talking points and an approach strategy for each prospect so
                you sound prepared when you call.
              </p>
            </div>
          </div>
          <p className="text-xs text-stone-500">
            Duplicates are automatically skipped. All data comes from public sources. Ollama must be
            running.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
