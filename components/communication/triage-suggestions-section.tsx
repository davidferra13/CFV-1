'use client'

// Client wrapper for TriageSuggestionList on the inbox page.
// Fetches suggestions via server action on mount and handles apply/dismiss.

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { TriageSuggestionList } from './triage-suggestion-card'
import { getTriageSuggestions } from '@/lib/communication/triage-suggestions'
import type { TriageSuggestion } from '@/lib/communication/triage-suggestions'

export function TriageSuggestionsSection() {
  const [suggestions, setSuggestions] = useState<TriageSuggestion[]>([])
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const data = await getTriageSuggestions()
        if (!cancelled) setSuggestions(data)
      } catch {
        // Non-blocking: triage suggestions are a nice-to-have, not critical
        console.error('[triage-suggestions] Failed to load suggestions')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleApply = (suggestion: TriageSuggestion) => {
    // Remove from local list (dismiss only, no persistence yet)
    setSuggestions((s) => s.filter((item) => item.id !== suggestion.id))
    toast('Suggestion noted')
  }

  const handleDismiss = (suggestionId: string) => {
    setSuggestions((s) => s.filter((item) => item.id !== suggestionId))
    toast('Suggestion dismissed')
  }

  if (suggestions.length === 0) return null

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider">
        Triage Suggestions
      </h2>
      <TriageSuggestionList
        suggestions={suggestions}
        onApply={handleApply}
        onDismiss={handleDismiss}
      />
    </div>
  )
}
