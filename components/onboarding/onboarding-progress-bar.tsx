'use client'

import { useMemo } from 'react'
import type { OnboardingProgress } from '@/lib/onboarding/progress-actions'
import type { ArchetypeId } from '@/lib/archetypes/presets'

export function OnboardingProgressBar({
  progress,
}: {
  progress: OnboardingProgress
  archetype?: ArchetypeId | null
}) {
  const { completed, total, pct } = useMemo(() => {
    // Count first-week activation steps
    const activationDone = progress.steps.filter((s) => s.done).length
    const activationTotal = progress.steps.length

    // Count secondary setup items
    const secondary = progress.secondarySetup
    let secDone = 0
    let secTotal = 4 // clients, recipes, loyalty, staff
    if (secondary.clientsImported) secDone++
    if (secondary.recipesAdded) secDone++
    if (secondary.loyaltyConfigured) secDone++
    if (secondary.staffAdded) secDone++

    const totalCount = activationTotal + secTotal
    const completedCount = activationDone + secDone
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return { completed: completedCount, total: totalCount, pct: percentage }
  }, [progress])

  const barColor = pct >= 80 ? 'bg-green-500' : 'bg-brand-500'

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-sm text-stone-300">
          You have set up {completed} of {total} things
        </p>
        <span className="text-sm font-medium text-stone-200">{pct}%</span>
      </div>
      <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
