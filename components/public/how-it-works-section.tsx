// Why ChefFlow — Selling section
// Confident, outward-facing. No tech internals. Closes the deal.

import { Flame, Clock, TrendingUp, Heart } from '@/components/ui/icons'

const REASONS = [
  {
    icon: Flame,
    title: 'Built for marketplace chefs',
    description:
      'ChefFlow is shaped around the way private chefs actually book, prep, travel, serve, follow up, and rebook clients after a marketplace dinner.',
  },
  {
    icon: Clock,
    title: 'Keep your booking channels and stop losing everything else',
    description:
      'Your booking channels can keep bringing the lead. ChefFlow keeps the client record, service notes, reminders, and back-office work from scattering after that.',
  },
  {
    icon: TrendingUp,
    title: 'See net money, not just payouts',
    description:
      'Track gross booking value, platform fees, expenses, and profit without rebuilding the picture in spreadsheets after every dinner.',
  },
  {
    icon: Heart,
    title: 'Turn one booking into a repeat client',
    description:
      'Follow-ups, review asks, direct booking links, and repeat-client memory help each marketplace dinner become a stronger long-term relationship.',
  },
]

export function HowItWorksSection() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
          Why marketplace-driven private chefs choose ChefFlow.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-400">
          Keep the lead source that already works. Build the owned business layer around it.
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
