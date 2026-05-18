'use client'

import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import type { UnifiedTier } from '@/lib/discovery/rail-tier-assigner'
import { RailItemRow } from './rail-item-row'
import { useAutoScroll } from './use-auto-scroll'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Visual config per tier
// ---------------------------------------------------------------------------

const TIER_VISUAL: Record<
  UnifiedTier,
  {
    label: string
    borderColor: string
    dotColor: string
    bgAccent: string
    glowGradient: string
    badgeBg: string
    badgeText: string
    orbShadow: string
  }
> = {
  critical: {
    label: 'Critical',
    borderColor: 'border-red-500/30',
    dotColor: 'bg-red-500',
    bgAccent: 'bg-red-950/20',
    glowGradient: 'from-red-500/12 via-red-500/4 to-transparent',
    badgeBg: 'bg-red-950/60 border-red-500/30',
    badgeText: 'text-red-300',
    orbShadow: '0 0 8px 2px rgb(239 68 68 / 0.5)',
  },
  action: {
    label: 'Action',
    borderColor: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
    bgAccent: 'bg-amber-950/10',
    glowGradient: 'from-amber-500/10 via-amber-500/3 to-transparent',
    badgeBg: 'bg-amber-950/50 border-amber-500/25',
    badgeText: 'text-amber-300',
    orbShadow: '0 0 6px 2px rgb(245 158 11 / 0.4)',
  },
  awareness: {
    label: 'Awareness',
    borderColor: 'border-stone-600/30',
    dotColor: 'bg-stone-500',
    bgAccent: '',
    glowGradient: 'from-stone-500/8 via-stone-500/2 to-transparent',
    badgeBg: 'bg-stone-800/60 border-stone-600/25',
    badgeText: 'text-stone-300',
    orbShadow: '0 0 5px 1px rgb(120 113 108 / 0.3)',
  },
  opportunity: {
    label: 'Opportunity',
    borderColor: 'border-green-600/30',
    dotColor: 'bg-green-500',
    bgAccent: 'bg-green-950/10',
    glowGradient: 'from-green-500/10 via-green-500/3 to-transparent',
    badgeBg: 'bg-green-950/50 border-green-500/25',
    badgeText: 'text-green-300',
    orbShadow: '0 0 6px 2px rgb(34 197 94 / 0.4)',
  },
}

export function TierRow({
  tier,
  items,
  className,
}: {
  tier: UnifiedTier
  items: GodModeResolvedItem[]
  className?: string
}) {
  const visual = TIER_VISUAL[tier]
  const { scrollRef } = useAutoScroll({ tier, itemCount: items.length })

  if (items.length === 0) return null

  return (
    <div
      className={cn(
        // Glass card container
        'relative rounded-xl border backdrop-blur-sm overflow-hidden',
        'bg-[var(--glass-bg)] shadow-[var(--shadow-card)]',
        visual.borderColor,
        tier === 'critical' &&
          'sticky top-0 z-40 animate-[rail-glow-critical_2s_ease-in-out_infinite]',
        tier === 'action' && 'animate-[rail-glow-action_3s_ease-in-out_infinite]',
        className
      )}
    >
      {/* Tier-specific gradient glow at top */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-16 bg-gradient-to-b pointer-events-none',
          visual.glowGradient
        )}
      />

      {/* Tier header */}
      <div className="relative flex items-center gap-2.5 px-4 py-2.5">
        {/* Glowing orb */}
        <span
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            visual.dotColor,
            tier === 'critical' && 'animate-pulse'
          )}
          style={{ boxShadow: visual.orbShadow }}
        />
        {/* Badge-style label with count */}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider',
            visual.badgeBg,
            visual.badgeText
          )}
        >
          {visual.label}
          <span className="opacity-70">{items.length}</span>
        </span>
      </div>

      {/* Items container: horizontal scroll on mobile, flex-wrap on desktop */}
      <div
        ref={scrollRef}
        className={cn(
          // Mobile: horizontal scroll
          'flex gap-2 overflow-x-auto pb-3 px-3',
          'scrollbar-hide snap-x snap-mandatory',
          '[mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]',
          // Desktop: flex-wrap grid
          'sm:flex-wrap sm:overflow-x-visible sm:[mask-image:none]'
        )}
      >
        {items.map((item, index) => (
          <div
            key={`${item.definitionId}-${item.destination}`}
            className={cn(
              'snap-start flex-shrink-0 min-w-[260px] max-w-[340px]',
              'sm:flex-shrink sm:min-w-[260px] sm:max-w-[380px]',
              // CSS stagger animation
              'opacity-0 animate-[rail-item-enter_200ms_ease-out_forwards]'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <RailItemRow item={item} tier={tier} />
          </div>
        ))}
      </div>
    </div>
  )
}
