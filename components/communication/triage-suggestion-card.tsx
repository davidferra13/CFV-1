// Triage Suggestion Card - Shows AI-suggested triage actions for inbox items
// Displays as a dismissible card at the top of the inbox with quick-action buttons.
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

type TriageSuggestion = {
  id: string
  threadId: string
  subject: string
  suggestedAction: 'link_to_inquiry' | 'link_to_event' | 'snooze' | 'resolve' | 'needs_attention'
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

interface TriageSuggestionListProps {
  suggestions: TriageSuggestion[]
  onDismiss?: (id: string) => void
  onDismissAll?: () => void
}

const ACTION_LABELS: Record<string, string> = {
  link_to_inquiry: 'Link to inquiry',
  link_to_event: 'Link to event',
  snooze: 'Snooze',
  resolve: 'Mark resolved',
  needs_attention: 'Needs attention',
}

const CONFIDENCE_VARIANTS: Record<string, 'success' | 'warning' | 'info'> = {
  high: 'success',
  medium: 'warning',
  low: 'info',
}

export function TriageSuggestionList({
  suggestions,
  onDismiss,
  onDismissAll,
}: TriageSuggestionListProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [allDismissed, setAllDismissed] = useState(false)

  if (allDismissed) return null

  const visible = suggestions.filter((s) => !dismissedIds.has(s.id))
  if (visible.length === 0) return null

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]))
    onDismiss?.(id)
  }

  const handleDismissAll = () => {
    setAllDismissed(true)
    onDismissAll?.()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Triage Suggestions</CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">
              {visible.length} message{visible.length !== 1 ? 's' : ''} could use your attention.
              These are suggested actions based on thread context.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismissAll}>
            Dismiss All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Link
                  href={`/inbox/triage/${s.threadId}`}
                  className="text-sm font-medium text-stone-200 hover:text-amber-400 truncate"
                >
                  {s.subject}
                </Link>
                <Badge variant={CONFIDENCE_VARIANTS[s.confidence] ?? 'info'}>
                  {s.confidence}
                </Badge>
              </div>
              <p className="text-xs text-stone-500">
                <span className="text-stone-400">{ACTION_LABELS[s.suggestedAction] ?? s.suggestedAction}</span>
                {' - '}
                {s.reason}
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Link href={`/inbox/triage/${s.threadId}`}>
                <Button variant="secondary" size="sm">
                  Review
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => handleDismiss(s.id)}>
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
