'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lightbulb, ArrowRight, X } from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { SmartSuggestion } from '@/lib/onboarding/smart-suggestions'

export function SmartSuggestionsCard({ suggestions }: { suggestions: SmartSuggestion[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = suggestions.filter((s) => !dismissed.has(s.id))
  if (visible.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm font-medium text-stone-300">Most chefs like you also set up...</h2>
      </div>
      <div className="space-y-2">
        {visible.map((suggestion) => (
          <Card key={suggestion.id} className="bg-stone-900 border-stone-700">
            <CardContent className="flex items-center justify-between gap-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stone-100">{suggestion.title}</p>
                  {suggestion.relevance === 'high' && (
                    <span className="text-xs bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{suggestion.reason}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Link href={suggestion.href}>
                  <Button variant="ghost" className="text-sm whitespace-nowrap">
                    Set up
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
                <button
                  onClick={() => setDismissed((prev) => new Set([...prev, suggestion.id]))}
                  className="p-1 text-stone-500 hover:text-stone-300 transition-colors"
                  aria-label={`Dismiss ${suggestion.title}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
