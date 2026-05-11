'use client'

// Prep Status Indicators - Compact horizontal milestone strip
// Shows 5 dots connected by lines, filled/colored based on service day progress.
// Embeddable on event detail page for confirmed/in_progress events.

import { CheckCircle, ShoppingCart, Clock, Truck, UtensilsCrossed } from '@/components/ui/icons'
import type { ServiceMilestone } from '@/lib/events/service-day-live-actions'

const MILESTONE_ICONS: Record<ServiceMilestone['key'], typeof CheckCircle> = {
  confirmed: CheckCircle,
  shopping: ShoppingCart,
  prepping: Clock,
  en_route: Truck,
  serving: UtensilsCrossed,
}

export function PrepStatusIndicators({ milestones }: { milestones: ServiceMilestone[] }) {
  if (!milestones || milestones.length === 0) return null

  return (
    <div className="flex items-center w-full gap-0">
      {milestones.map((milestone, i) => {
        const Icon = MILESTONE_ICONS[milestone.key]
        const reached = Boolean(milestone.reachedAt)
        const active = milestone.isActive

        return (
          <div key={milestone.key} className="flex items-center flex-1 last:flex-none">
            {/* Dot/icon */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all
                  ${active ? 'border-brand-500 bg-brand-500/20' : reached ? 'border-brand-500 bg-brand-500/10' : 'border-stone-700 bg-stone-900'}
                `}
              >
                <Icon
                  className={`w-4 h-4 ${active ? 'text-brand-400' : reached ? 'text-brand-500' : 'text-stone-600'}`}
                />
                {active && (
                  <span className="absolute inset-0 rounded-full border-2 border-brand-500 animate-pulse opacity-50" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 text-center whitespace-nowrap ${active ? 'text-brand-400 font-medium' : reached ? 'text-stone-300' : 'text-stone-600'}`}
              >
                {milestone.label}
              </span>
            </div>

            {/* Connector line */}
            {i < milestones.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 ${reached && milestones[i + 1]?.reachedAt ? 'bg-brand-500' : reached ? 'bg-brand-500/40' : 'bg-stone-700'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
