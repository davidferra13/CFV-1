'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Archive, Plus } from '@/components/ui/icons'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import type { GoalView } from '@/lib/goals/types'
import { formatGoalValue, formatGapLabel, formatPeriod, isRevenueGoal } from '@/lib/goals/engine'
import { archiveGoal } from '@/lib/goals/actions'
import { GoalTypeBadge } from './goal-type-badge'
import { GoalProgressBar } from './goal-progress-bar'
import { PricingScenariosTable } from './pricing-scenarios-table'
import { ClientSuggestionsList } from './client-suggestions-list'

interface GoalCardProps {
  view: GoalView
  /** Called when the chef taps "Log Progress" on a manual_count goal */
  onCheckIn?: (goal: GoalView['goal'], currentValue: number) => void
}

function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function GoalCard({ view, onCheckIn }: GoalCardProps) {
  const { goal, progress, enrichment, pricingScenarios, clientSuggestions, recentCheckIns } = view
  const [expanded, setExpanded] = useState(true)
  const [archivePending, startArchive] = useTransition()
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  const revenue = isRevenueGoal(goal.goalType)
  const manual = goal.trackingMethod === 'manual_count'
  const onTrack = progress.progressPercent >= 100

  function handleArchive() {
    setShowArchiveConfirm(true)
  }

  function handleConfirmArchive() {
    setShowArchiveConfirm(false)
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
              <span className="text-xs text-stone-400">
                {formatPeriod(goal.periodStart, goal.periodEnd)}
              </span>
              {manual && (
                <span className="text-[10px] text-stone-400 border border-stone-200 rounded px-1.5 py-0.5">
                  manual
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-stone-900 mt-1 truncate">{goal.label}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {manual && onCheckIn && (
              <button
                type="button"
                onClick={() => onCheckIn(goal, progress.currentValue)}
                className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
                title="Log progress"
              >
                <Plus className="h-3 w-3" />
                Log
              </button>
            )}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <p
              className={`text-sm font-semibold ${onTrack ? 'text-emerald-600' : 'text-amber-600'}`}
            >
              {onTrack ? 'On track ✓' : formatGapLabel(progress.gapValue, goal.goalType)}
            </p>
          </div>
          {revenue && enrichment && (
            <div className="sm:col-span-3">
              <p className="text-xs text-stone-500">Events needed</p>
              <p className="text-sm font-semibold text-stone-900">{enrichment.eventsNeeded}</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <GoalProgressBar progressPercent={progress.progressPercent} />
          <p className="text-xs text-stone-500">{progress.progressPercent}% toward target</p>
        </div>

        {/* Manual goal — recent check-ins */}
        {expanded && manual && recentCheckIns && recentCheckIns.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-stone-100">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              Recent entries
            </p>
            <div className="space-y-1">
              {recentCheckIns.map((ci) => (
                <div
                  key={ci.id}
                  className="flex items-center justify-between text-xs text-stone-600"
                >
                  <span className="truncate max-w-[200px]">
                    +{ci.loggedValue}
                    {ci.notes ? ` — ${ci.notes}` : ''}
                  </span>
                  <span className="text-stone-400 flex-shrink-0 ml-2">
                    {formatDate(ci.loggedAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue enrichment details */}
        {expanded && revenue && enrichment && (
          <div className="space-y-4 pt-2 border-t border-stone-100">
            {/* Realized vs projected */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-stone-500">Realized</p>
                <p className="text-sm font-medium text-stone-900">
                  {dollars(enrichment.realizedCents)}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Projected (incl. pipeline)</p>
                <p className="text-sm font-medium text-stone-900">
                  {dollars(enrichment.projectedCents)}
                </p>
              </div>
            </div>

            {/* Events needed narrative */}
            {!onTrack && enrichment.eventsNeeded > 0 && (
              <div className="rounded-md bg-amber-950 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                You need{' '}
                <strong>
                  {enrichment.eventsNeeded} more event{enrichment.eventsNeeded === 1 ? '' : 's'}
                </strong>{' '}
                at your {dollars(enrichment.avgBookingValueCents)} average to close the{' '}
                {dollars(progress.gapValue)} gap.
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
                  {enrichment.openDatesThisMonth.length > 6 &&
                    ` +${enrichment.openDatesThisMonth.length - 6} more`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* History link + Build Your Path */}
        <div className="pt-1 flex items-center justify-between gap-3">
          <Link
            href={`/goals/${goal.id}/history`}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            View history →
          </Link>
          {revenue && !onTrack && progress.gapValue > 0 && (
            <Link
              href="/goals/revenue-path"
              className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              Build Your Path →
            </Link>
          )}
        </div>
      </CardContent>

      <ConfirmModal
        open={showArchiveConfirm}
        title={`Archive "${goal.label}"?`}
        description="This will remove it from your dashboard."
        confirmLabel="Archive"
        variant="primary"
        loading={archivePending}
        onConfirm={handleConfirmArchive}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </Card>
  )
}
