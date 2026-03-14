'use client'

import { useState } from 'react'
import { Brain, Loader2, Sparkles, User } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  buildClientPreferenceProfile,
  type ClientPreferenceProfile,
} from '@/lib/ai/client-preference-profile'
import { toast } from 'sonner'

export function ClientPreferencePanel({ clientId }: { clientId: string }) {
  const [result, setResult] = useState<ClientPreferenceProfile | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await buildClientPreferenceProfile(clientId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Profile generation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Client Preference Profile</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Building...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Build Profile
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Synthesizes all event history and messages into a structured profile of what makes this
          client tick.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">Client Preference Profile</span>
          <Badge variant="info">Confidence: {result.confidence}</Badge>
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <div className="bg-brand-950 border border-brand-700 rounded p-3">
        <div className="text-[11px] text-brand-600 font-medium mb-0.5">Top Tip</div>
        <div className="text-sm text-stone-200">{result.topTip}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wide mb-1">
            Communication
          </div>
          <div className="text-stone-300">{result.communicationStyle}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wide mb-1">
            Budget Pattern
          </div>
          <div className="text-stone-300">{result.budgetPattern}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wide mb-1">
            Booking Pattern
          </div>
          <div className="text-stone-300">{result.bookingPattern}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wide mb-1">
            Relationship
          </div>
          <div className="text-stone-300">{result.relationshipNotes}</div>
        </div>
      </div>

      {result.cuisinePreferences.length > 0 && (
        <div className="text-xs">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wide mb-1">
            Cuisine Preferences
          </div>
          <div className="flex flex-wrap gap-1">
            {result.cuisinePreferences.map((p, i) => (
              <span key={i} className="bg-stone-800 rounded px-1.5 py-0.5 text-stone-300">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.avoidances.length > 0 && (
        <div className="text-xs">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wide mb-1">
            Avoidances
          </div>
          <div className="flex flex-wrap gap-1">
            {result.avoidances.map((p, i) => (
              <span key={i} className="bg-red-950 text-red-700 rounded px-1.5 py-0.5">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-stone-400">Auto insight · Not saved to client record</p>
    </div>
  )
}
