// Why ChefFlow — Selling section
// Confident, outward-facing. No tech internals. Closes the deal.

import { Flame, Clock, TrendingUp, Heart } from 'lucide-react'

const REASONS = [
  {
    icon: Flame,
    title: 'Built by a Chef',
    description:
      '15 years of private dinners, catering, and grazing tables. Every feature exists because a working chef needed it.',
  },
  {
    icon: Clock,
    title: 'Less Admin, More Cooking',
    description:
      'Inquiries, quotes, invoices, and follow-ups — handled. Spend your time on the craft, not the paperwork.',
  },
  {
    icon: TrendingUp,
    title: 'Know Your Numbers',
    description:
      'See what every event costs, what it earns, and where your business is headed — without a spreadsheet in sight.',
  },
  {
    icon: Heart,
    title: 'Clients Notice the Difference',
    description:
      'Professional proposals, easy approvals, and seamless payments. Your clients get a polished experience from first inquiry to final bite.',
  },
]

export function HowItWorksSection() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
          Why chefs switch to ChefFlow.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-400">
          You didn&apos;t start cooking to chase invoices. Get back to what you&apos;re great at.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {REASONS.map((reason) => {
          const Icon = reason.icon
          return (
            <div
              key={reason.title}
              className="rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
            >
              <div className="mb-4 inline-flex rounded-lg bg-brand-950 p-2.5 text-brand-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-stone-100">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">{reason.description}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
