'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Archive } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { GoalView } from '@/lib/goals/types'
import { formatGoalValue, formatGapLabel, formatPeriod, isRevenueGoal } from '@/lib/goals/engine'
import { archiveGoal } from '@/lib/goals/actions'
import { GoalTypeBadge } from './goal-type-badge'
import { GoalProgressBar } from './goal-progress-bar'
import { PricingScenariosTable } from './pricing-scenarios-table'
import { ClientSuggestionsList } from './client-suggestions-list'

interface GoalCardProps {
  view: GoalView
}

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

export function GoalCard({ view }: GoalCardProps) {
  const { goal, progress, enrichment, pricingScenarios, clientSuggestions } = view
  const [expanded, setExpanded] = useState(true)
  const [archivePending, startArchive] = useTransition()

  const revenue = isRevenueGoal(goal.goalType)
  const onTrack = progress.progressPercent >= 100

  function handleArchive() {
    if (!confirm(`Archive "${goal.label}"? This will remove it from your dashboard.`)) return
    startArchive(async () => {
      await archiveGoal(goal.id)
    })
  }

  return (
    <Card className={archivePending ? 'opacity-50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <GoalTypeBadge goalType={goal.goalType} />
              <span className="text-xs text-stone-400">{formatPeriod(goal.periodStart, goal.periodEnd)}</span>
            </div>
            <h3 className="text-base font-semibold text-stone-900 mt-1 truncate">{goal.label}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              onClick={handleArchive}
              disabled={archivePending}
              className="rounded p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition-colors"
              aria-label="Archive goal"
              title="Archive this goal"
            >
              <Archive className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-stone-500">Target</p>
            <p className="text-sm font-semibold text-stone-900">
              {formatGoalValue(progress.targetValue, goal.goalType)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Current</p>
            <p className="text-sm font-semibold text-stone-900">
              {formatGoalValue(progress.currentValue, goal.goalType)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Gap</p>
            <p className={`text-sm font-semibold ${onTrack ? 'text-emerald-600' : 'text-amber-600'}`}>
              {onTrack ? 'On track ✓' : formatGapLabel(progress.gapValue, goal.goalType)}
            </p>
          </div>
          {revenue && enrichment && (
            <div>
              <p className="text-xs text-stone-500">Events needed</p>
              <p className="text-sm font-semibold text-stone-900">
                {enrichment.eventsNeeded}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <GoalProgressBar progressPercent={progress.progressPercent} />
          <p className="text-xs text-stone-500">{progress.progressPercent}% toward target</p>
        </div>

        {/* Revenue enrichment details */}
        {expanded && revenue && enrichment && (
          <div className="space-y-4 pt-2 border-t border-stone-100">
            {/* Realized vs projected */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-stone-500">Realized</p>
                <p className="text-sm font-medium text-stone-900">{dollars(enrichment.realizedCents)}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Projected (incl. pipeline)</p>
                <p className="text-sm font-medium text-stone-900">{dollars(enrichment.projectedCents)}</p>
              </div>
            </div>

            {/* Events needed narrative */}
            {!onTrack && enrichment.eventsNeeded > 0 && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                You need <strong>{enrichment.eventsNeeded} more event{enrichment.eventsNeeded === 1 ? '' : 's'}</strong> at your {dollars(enrichment.avgBookingValueCents)} average to close the {dollars(progress.gapValue)} gap.
              </div>
            )}

            {/* Pricing scenarios */}
            {pricingScenarios.length > 0 && (
              <PricingScenariosTable
                scenarios={pricingScenarios}
                currentAvgCents={enrichment.avgBookingValueCents}
              />
            )}

            {/* Client suggestions */}
            {clientSuggestions.length > 0 && (
              <ClientSuggestionsList
                suggestions={clientSuggestions}
                eventsNeeded={enrichment.eventsNeeded}
              />
            )}

            {/* Open dates */}
            {enrichment.openDatesThisMonth.length > 0 && !onTrack && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Open dates this month
                </p>
                <p className="text-xs text-stone-600">
                  {enrichment.openDatesThisMonth.slice(0, 6).join(', ')}
                  {enrichment.openDatesThisMonth.length > 6 && ` +${enrichment.openDatesThisMonth.length - 6} more`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* History link */}
        <div className="pt-1">
          <Link
            href={`/goals/${goal.id}/history`}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            View history →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
