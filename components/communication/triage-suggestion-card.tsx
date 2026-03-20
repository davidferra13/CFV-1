// Triage Suggestion Card
// Displays a single suggested triage rule with reasoning, impact badge,
// and action buttons to apply or dismiss the suggestion.
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { TriageSuggestion } from '@/lib/communication/triage-suggestions'

interface TriageSuggestionCardProps {
  suggestion: TriageSuggestion
  onApply: (suggestion: TriageSuggestion) => void
  onDismiss: (suggestionId: string) => void
}

const IMPACT_BADGE: Record<string, 'success' | 'warning' | 'default'> = {
  high: 'success',
  medium: 'warning',
  low: 'default',
}

const IMPACT_LABEL: Record<string, string> = {
  high: 'High impact',
  medium: 'Medium impact',
  low: 'Low impact',
}

const ACTION_LABEL: Record<string, string> = {
  prioritize: 'Auto-prioritize',
  auto_snooze: 'Auto-snooze',
  auto_label: 'Auto-label',
  auto_assign: 'Auto-assign',
}

export function TriageSuggestionCard({
  suggestion,
  onApply,
  onDismiss,
}: TriageSuggestionCardProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-gray-900">
              {suggestion.suggestion}
            </h4>
            <p className="text-sm text-gray-600">{suggestion.reasoning}</p>
          </div>
          <Badge variant={IMPACT_BADGE[suggestion.impact] ?? 'default'}>
            {IMPACT_LABEL[suggestion.impact] ?? suggestion.impact}
          </Badge>
        </div>

        {/* Rule preview */}
        <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <span className="font-medium">Rule:</span> When{' '}
          <span className="font-mono text-gray-700">{suggestion.ruleConfig.field}</span>{' '}
          {suggestion.ruleConfig.op}{' '}
          <span className="font-mono text-gray-700">{String(suggestion.ruleConfig.value)}</span>
          {' then '}
          <span className="font-medium text-gray-700">
            {ACTION_LABEL[suggestion.ruleConfig.action] ?? suggestion.ruleConfig.action}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => onApply(suggestion)}
            className="text-sm"
          >
            Apply Rule
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setDismissed(true)
              onDismiss(suggestion.id)
            }}
            className="text-sm"
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── List wrapper ───────────────────────────────────────────────────────────

interface TriageSuggestionListProps {
  suggestions: TriageSuggestion[]
  onApply: (suggestion: TriageSuggestion) => void
  onDismiss: (suggestionId: string) => void
}

export function TriageSuggestionList({
  suggestions,
  onApply,
  onDismiss,
}: TriageSuggestionListProps) {
  if (suggestions.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-500">
        Not enough data to generate triage suggestions yet. Keep processing inquiries and check back later.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {suggestions.map((s) => (
        <TriageSuggestionCard
          key={s.id}
          suggestion={s}
          onApply={onApply}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}
