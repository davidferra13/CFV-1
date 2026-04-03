'use client'

// Dietary Trust Strip
// Calm, reusable trust chip display for chef cards, profiles, and inquiry pages.
// Shows dietary specialties and capability signals without alarm styling.

import type { PublicDietaryTrustSummary, TrustChip } from '@/lib/dietary/public-trust'

type Props = {
  summary: PublicDietaryTrustSummary
  /** Maximum number of chips to show before collapsing */
  maxChips?: number
  /** Show the plain-English summary text below chips */
  showSummary?: boolean
  /** Compact mode for cards (smaller text, tighter spacing) */
  compact?: boolean
}

function ChipBadge({ chip, compact }: { chip: TrustChip; compact: boolean }) {
  const base = compact
    ? 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium'
    : 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium'

  const tone =
    chip.tone === 'highlight'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800'
      : 'bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-200 dark:bg-stone-800/60 dark:text-stone-400 dark:ring-stone-700'

  return <span className={`${base} ${tone}`}>{chip.label}</span>
}

export function DietaryTrustStrip({
  summary,
  maxChips = 4,
  showSummary = false,
  compact = false,
}: Props) {
  const { trustChips, plainEnglishSummary } = summary

  if (trustChips.length === 0) return null

  const visible = trustChips.slice(0, maxChips)
  const overflow = trustChips.length - maxChips

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((chip) => (
          <ChipBadge key={chip.id} chip={chip} compact={compact} />
        ))}
        {overflow > 0 && (
          <span
            className={`${compact ? 'text-[11px]' : 'text-xs'} text-stone-400 dark:text-stone-500 self-center`}
          >
            +{overflow} more
          </span>
        )}
      </div>
      {showSummary && plainEnglishSummary && (
        <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
          {plainEnglishSummary}
        </p>
      )}
    </div>
  )
}
