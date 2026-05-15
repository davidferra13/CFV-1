import type { GodModeRailResult } from '@/lib/discovery/god-mode-types'
import { TIER_ORDER } from '@/lib/discovery/god-mode-types'
import { RailTierGroup } from './rail-tier-group'
import { cn } from '@/lib/utils'

export function RailFull({ result, className }: { result: GodModeRailResult; className?: string }) {
  const nonEmptyTiers = TIER_ORDER.filter((tier) => result.tiers[tier].length > 0)

  if (nonEmptyTiers.length === 0) {
    return (
      <div className={cn('px-4 py-8 text-center', className)}>
        <p className="text-sm text-stone-400">All clear. Nothing needs attention.</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {nonEmptyTiers.map((tier) => (
        <RailTierGroup key={tier} tier={tier} items={result.tiers[tier]} />
      ))}
    </div>
  )
}

export function RailFullSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-10 rounded-r-lg loading-bone loading-bone-muted border-l-2 border-l-red-500/30" />
      <div className="h-24 rounded-r-lg loading-bone loading-bone-muted border-l-2 border-l-amber-500/30" />
      <div className="h-16 rounded-r-lg loading-bone loading-bone-muted border-l-2 border-l-blue-500/30" />
    </div>
  )
}
