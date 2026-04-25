// Getting Started section for brand-new chefs with zero/minimal data.
// Shows actionable next steps instead of empty widgets.

import Link from 'next/link'
import type { ComponentType } from 'react'
import { CalendarDays, Users, UtensilsCrossed, Funnel, Plus } from '@/components/ui/icons'
import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'

type Step = {
  label: string
  description: string
  href: string
  icon: ComponentType<{ className?: string }>
  done: boolean
}

export function GettingStartedSection({ presence }: { presence: TenantDataPresence }) {
  const steps: Step[] = [
    {
      label: 'Add your first client',
      description: 'Start building your client book',
      href: '/clients/new',
      icon: Users,
      done: presence.hasClients,
    },
    {
      label: 'Create a recipe',
      description: 'Get your signature dishes on record',
      href: '/recipes/new',
      icon: UtensilsCrossed,
      done: presence.hasRecipes,
    },
    {
      label: 'Create an event',
      description: 'Plan your next service',
      href: '/events/new',
      icon: CalendarDays,
      done: presence.hasEvents,
    },
    {
      label: 'Start an inquiry',
      description: 'Turn inquiries into bookings',
      href: '/inquiries/new',
      icon: Funnel,
      done: presence.hasQuotes || presence.hasInquiries,
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length

  if (allDone) return null

  return (
    <section className="rounded-2xl border border-stone-800 bg-stone-900/40 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Get Started</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {completedCount} of {steps.length} steps complete
          </p>
        </div>
        <div className="flex items-center gap-1">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                step.done ? 'bg-brand-500' : 'bg-stone-700'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {steps
          .filter((s) => !s.done)
          .map((step) => {
            const Icon = step.icon
            return (
              <Link
                key={step.href}
                href={step.href}
                className="group flex items-center gap-3.5 rounded-xl border border-stone-800 bg-stone-950/50 px-4 py-3.5 hover:border-brand-700/40 hover:bg-stone-900/60 transition-all"
              >
                <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-brand-950/60 text-brand-400 group-hover:bg-brand-950 transition-colors">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-200 group-hover:text-stone-100 transition-colors">
                    {step.label}
                  </p>
                  <p className="text-xs text-stone-500">{step.description}</p>
                </div>
                <Plus className="ml-auto w-4 h-4 text-stone-600 group-hover:text-brand-400 transition-colors flex-shrink-0" />
              </Link>
            )
          })}
      </div>
    </section>
  )
}
