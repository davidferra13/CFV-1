// Feature suggestion card for dashboard.
// Shows one "Did you know?" suggestion for an unused feature.
// Dismissable, links to the feature.

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  dismissSuggestion,
  type FeatureSuggestion,
} from '@/lib/progressive-disclosure/disclosure-actions'
import { Lightbulb, X, ArrowRight } from '@/components/ui/icons'

export function FeatureSuggestionCard({ suggestion }: { suggestion: FeatureSuggestion }) {
  const [isPending, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  function handleDismiss() {
    setDismissed(true)
    startTransition(async () => {
      try {
        await dismissSuggestion(suggestion.id)
      } catch {
        // Best effort; card already hidden
      }
    })
  }

  return (
    <div className="relative rounded-xl border border-brand-800/30 bg-brand-950/20 p-4">
      <button
        type="button"
        onClick={handleDismiss}
        disabled={isPending}
        className="absolute top-3 right-3 p-1 rounded-md text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
        aria-label="Dismiss suggestion"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-lg bg-brand-950/60 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-brand-400" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-brand-400 mb-0.5">Try this: {suggestion.name}</p>
          <p className="text-sm text-stone-300 leading-relaxed">{suggestion.description}</p>
          <Link
            href={suggestion.href}
            className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            Try it
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Server-rendered wrapper: loads suggestions and shows max 1 */
export function FeatureSuggestionSlot({ suggestions }: { suggestions: FeatureSuggestion[] }) {
  if (!suggestions.length) return null

  // Show only the first suggestion (not overwhelming)
  return <FeatureSuggestionCard suggestion={suggestions[0]} />
}
