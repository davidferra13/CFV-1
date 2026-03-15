'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { unenrollBetaTester, type BetaClientSummary } from '@/lib/beta/onboarding-actions'

const STEP_LABELS = [
  { key: 'tasteProfileCompletedAt', label: 'Taste Profile' },
  { key: 'circleCreatedAt', label: 'Circle Created' },
  { key: 'circleMembersInvitedAt', label: 'Members Invited' },
  { key: 'firstEventBookedAt', label: 'First Booking' },
  { key: 'postEventReviewAt', label: 'Post-Event Review' },
] as const

export function BetaOnboardingAdmin({ testers }: { testers: BetaClientSummary[] }) {
  const [list, setList] = useState(testers)
  const [isPending, startTransition] = useTransition()

  function handleUnenroll(clientId: string) {
    const previous = list
    setList(list.filter((t) => t.clientId !== clientId))
    startTransition(async () => {
      try {
        await unenrollBetaTester(clientId)
      } catch (err) {
        setList(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to unenroll tester')
      }
    })
  }

  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-8 text-center">
        <p className="text-sm text-stone-400">
          No beta testers enrolled yet. Go to a client&apos;s profile and flag them as a beta
          tester.
        </p>
      </div>
    )
  }

  // Summary stats
  const totalTesters = list.length
  const completed = list.filter((t) => t.stepsCompleted === t.totalSteps).length
  const inProgress = list.filter(
    (t) => t.stepsCompleted > 0 && t.stepsCompleted < t.totalSteps
  ).length
  const notStarted = list.filter((t) => t.stepsCompleted === 0).length

  // Step drop-off: how many people completed each step
  const stepCounts = STEP_LABELS.map(({ key, label }) => ({
    label,
    count: list.filter((t) => {
      const checklist = t.checklist
      if (!checklist) return false
      return !!(checklist as Record<string, unknown>)[key]
    }).length,
  }))

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
          <p className="text-2xl font-bold text-stone-100">{totalTesters}</p>
          <p className="text-xs text-stone-500">Total Testers</p>
        </div>
        <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4">
          <p className="text-2xl font-bold text-emerald-400">{completed}</p>
          <p className="text-xs text-stone-500">Completed All Steps</p>
        </div>
        <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-4">
          <p className="text-2xl font-bold text-amber-400">{inProgress}</p>
          <p className="text-xs text-stone-500">In Progress</p>
        </div>
        <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
          <p className="text-2xl font-bold text-stone-400">{notStarted}</p>
          <p className="text-xs text-stone-500">Not Started</p>
        </div>
      </div>

      {/* Step funnel (drop-off analysis) */}
      <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
        <h3 className="mb-3 text-sm font-medium text-stone-300">Step Completion Funnel</h3>
        <div className="space-y-2">
          {stepCounts.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-32 text-xs text-stone-400">{step.label}</span>
              <div className="flex-1">
                <div className="h-4 w-full overflow-hidden rounded-full bg-stone-800">
                  <div
                    className="h-full rounded-full bg-amber-500/70 transition-all"
                    style={{
                      width: `${totalTesters > 0 ? (step.count / totalTesters) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <span className="w-12 text-right text-xs text-stone-400">
                {step.count}/{totalTesters}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tester list */}
      <div className="overflow-x-auto rounded-lg border border-stone-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 bg-stone-800/80">
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-400">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-400">Email</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-stone-400">Progress</th>
              {STEP_LABELS.map(({ label }) => (
                <th
                  key={label}
                  className="px-2 py-3 text-center text-xs font-medium text-stone-500"
                >
                  {label}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-stone-400">Discount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-stone-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.clientId} className="border-b border-stone-800 hover:bg-stone-800/40">
                <td className="px-4 py-3 text-stone-200">{t.clientName}</td>
                <td className="px-4 py-3 text-stone-400 text-xs">{t.clientEmail}</td>
                <td className="px-4 py-3 text-center">
                  {t.stepsCompleted === t.totalSteps ? (
                    <Badge variant="success">Complete</Badge>
                  ) : t.stepsCompleted > 0 ? (
                    <Badge variant="warning">
                      {t.stepsCompleted}/{t.totalSteps}
                    </Badge>
                  ) : (
                    <Badge variant="default">Not Started</Badge>
                  )}
                </td>
                {STEP_LABELS.map(({ key }) => {
                  const done = t.checklist ? !!(t.checklist as Record<string, unknown>)[key] : false
                  return (
                    <td key={key} className="px-2 py-3 text-center">
                      {done ? (
                        <span className="text-emerald-400">&#10003;</span>
                      ) : (
                        <span className="text-stone-600">&#8212;</span>
                      )}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-center text-xs text-stone-300">
                  {t.betaDiscountPercent}%
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-stone-500 hover:text-red-400"
                    onClick={() => handleUnenroll(t.clientId)}
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
