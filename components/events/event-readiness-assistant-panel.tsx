'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Settings,
  X,
} from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  dismissEventReadinessSuggestion,
  resetEventReadinessDismissals,
  updateEventReadinessAssistantSettings,
} from '@/lib/events/event-readiness-assistant-actions'
import type {
  EventReadinessAssistantResult,
  EventReadinessCheck,
  EventReadinessMode,
  EventReadinessSuggestion,
} from '@/lib/events/event-readiness-assistant'

type Props = {
  eventId: string
  readiness: EventReadinessAssistantResult | null
}

const statusLabel: Record<string, string> = {
  ready: 'Ready',
  review: 'Review',
  at_risk: 'Review',
  unknown: 'Unknown',
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'ready') return 'success'
  if (status === 'at_risk') return 'error'
  if (status === 'review') return 'warning'
  return 'default'
}

function checkIcon(check: EventReadinessCheck) {
  if (check.status === 'pass') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
  }
  if (check.status === 'fail') {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
  }
  return <AlertTriangle className="h-4 w-4 shrink-0 text-stone-400" />
}

function CheckRow({ check }: { check: EventReadinessCheck }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-stone-800 bg-stone-950/40 p-3">
      {checkIcon(check)}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-stone-100">{check.label}</p>
          <Badge
            variant={
              check.status === 'pass' ? 'success' : check.status === 'fail' ? 'warning' : 'default'
            }
          >
            {check.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-stone-400">{check.message}</p>
      </div>
    </div>
  )
}

function SuggestionRow({
  suggestion,
  onDismiss,
}: {
  suggestion: EventReadinessSuggestion
  onDismiss: (id: string) => void
}) {
  return (
    <div className="rounded-md border border-stone-800 bg-stone-950/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-100">{suggestion.title}</p>
          <p className="mt-1 text-sm text-stone-400">{suggestion.message}</p>
          <p className="mt-1 text-xs text-stone-500">{suggestion.impactLabel}</p>
        </div>
        {suggestion.canDismiss ? (
          <button
            type="button"
            onClick={() => onDismiss(suggestion.id)}
            className="rounded p-1 text-stone-500 hover:bg-stone-800 hover:text-stone-200"
            aria-label="Dismiss suggestion"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="mt-3">
        <Button href={suggestion.actionHref} size="sm" variant="secondary">
          {suggestion.actionLabel}
        </Button>
      </div>
    </div>
  )
}

export function EventReadinessAssistantPanel({ eventId, readiness }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  const visibleSuggestions = useMemo(() => {
    const candidates =
      readiness?.mode === 'quiet'
        ? (readiness.hiddenSuggestions ?? [])
        : (readiness?.suggestions ?? [])
    return candidates.filter((suggestion) => !dismissedIds.includes(suggestion.id))
  }, [dismissedIds, readiness])

  if (!readiness?.enabled) return null

  const availableHiddenSuggestionCount =
    readiness.mode === 'quiet' ? visibleSuggestions.length : readiness.hiddenSuggestionCount

  function updateSettings(input: { enabled?: boolean; mode?: EventReadinessMode }) {
    startTransition(async () => {
      try {
        await updateEventReadinessAssistantSettings(eventId, input)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update assistant settings')
      }
    })
  }

  function dismissSuggestion(suggestionId: string) {
    setDismissedIds((current) =>
      current.includes(suggestionId) ? current : [...current, suggestionId]
    )

    startTransition(async () => {
      try {
        await dismissEventReadinessSuggestion(eventId, suggestionId)
        router.refresh()
      } catch (err) {
        setDismissedIds((current) => current.filter((id) => id !== suggestionId))
        toast.error(err instanceof Error ? err.message : 'Failed to dismiss suggestion')
      }
    })
  }

  function resetDismissals() {
    const previousDismissedIds = dismissedIds
    setDismissedIds([])

    startTransition(async () => {
      try {
        await resetEventReadinessDismissals(eventId)
        router.refresh()
      } catch (err) {
        setDismissedIds(previousDismissedIds)
        toast.error(err instanceof Error ? err.message : 'Failed to reset dismissed suggestions')
      }
    })
  }

  const compactOnly = readiness.mode === 'quiet' && !expanded

  return (
    <Card className="p-4 border-stone-700 bg-stone-900/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-stone-100">Event Readiness Assistant</h2>
            <Badge variant={statusVariant(readiness.status)}>
              Readiness: {statusLabel[readiness.status] ?? readiness.status}
            </Badge>
            <Badge variant="default">{readiness.mode}</Badge>
          </div>
          <p className="mt-1 text-sm text-stone-400">{readiness.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {readiness.mode === 'quiet' && availableHiddenSuggestionCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setExpanded((value) => !value)}
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              {expanded ? 'Hide suggestions' : 'View suggestions'}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setExpanded((value) => !value)}
            >
              <ChevronDown className={`mr-1 h-3.5 w-3.5 ${expanded ? 'rotate-180' : ''}`} />
              Details
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowSettings((value) => !value)}
            aria-label="Assistant settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showSettings ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-stone-800 bg-stone-950/40 p-3">
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              checked
              disabled={isPending}
              onChange={(e) => updateSettings({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
            />
            Enabled for this event
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-300">
            Mode
            <select
              value={readiness.mode}
              disabled={isPending}
              onChange={(e) => updateSettings({ mode: e.target.value as EventReadinessMode })}
              className="rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-stone-100"
            >
              <option value="quiet">Quiet</option>
              <option value="normal">Normal</option>
              <option value="off">Off</option>
            </select>
          </label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => updateSettings({ enabled: false, mode: 'off' })}
          >
            <EyeOff className="mr-1 h-3.5 w-3.5" />
            Turn off
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={resetDismissals}
          >
            Reset dismissed
          </Button>
        </div>
      ) : null}

      {readiness.mode === 'normal' || expanded ? (
        <div className="mt-4 space-y-3">
          {!compactOnly && readiness.checks.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {readiness.checks
                .slice(0, readiness.mode === 'normal' && !expanded ? 3 : 8)
                .map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
            </div>
          ) : null}

          {visibleSuggestions.length > 0 ? (
            <div className="space-y-2">
              {visibleSuggestions.slice(0, expanded ? 8 : 3).map((suggestion) => (
                <SuggestionRow
                  key={suggestion.id}
                  suggestion={suggestion}
                  onDismiss={dismissSuggestion}
                />
              ))}
            </div>
          ) : readiness.mode === 'normal' ? (
            <p className="text-sm text-stone-500">No suggestions from the available data.</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
