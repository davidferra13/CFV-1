// Dietary Summary Badge - compact allergen count badge for lists/cards
// Shows red dot for FDA Big 9 allergens, amber for common only.
// Uses native title attribute for tooltip (no tooltip component dependency).

import { ShieldAlert } from '@/components/ui/icons'
import { FDA_BIG_9 } from '@/lib/constants/allergens'

const big9Set = new Set(FDA_BIG_9 as readonly string[])

type Props = {
  allergies: string[]
  dietaryRestrictions?: string[]
  compact?: boolean
}

export function DietarySummaryBadge({
  allergies,
  dietaryRestrictions = [],
  compact = false,
}: Props) {
  if (allergies.length === 0 && dietaryRestrictions.length === 0) return null

  const hasBig9 = allergies.some((a) => big9Set.has(a))
  const count = allergies.length

  const tooltipLines: string[] = []
  if (allergies.length > 0) {
    tooltipLines.push(`Allergies: ${allergies.join(', ')}`)
  }
  if (dietaryRestrictions.length > 0) {
    tooltipLines.push(`Restrictions: ${dietaryRestrictions.join(', ')}`)
  }
  const tooltipText = tooltipLines.join('\n')

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${hasBig9 ? 'text-red-500' : 'text-amber-500'}`}
        title={tooltipText}
      >
        <ShieldAlert size={14} weight="fill" />
        <span className="text-xs font-medium">{count}</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
        hasBig9
          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      }`}
      title={tooltipText}
    >
      <ShieldAlert size={14} weight="fill" />
      {count} allergen{count !== 1 ? 's' : ''}
      {hasBig9 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />}
    </span>
  )
}
