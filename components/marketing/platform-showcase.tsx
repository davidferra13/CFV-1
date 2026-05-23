import {
  BookOpen,
  CalendarDays,
  CookingPot,
  DollarSign,
  Users,
  Wallet,
} from '@/components/ui/icons'

const CAPABILITIES = [
  {
    icon: CalendarDays,
    title: 'Event Management',
    description:
      'From inquiry to service day: scheduling, prep lists, staffing, and day-of coordination.',
  },
  {
    icon: BookOpen,
    title: 'Recipe Library',
    description:
      'Store recipes with costs, yield factors, dietary tags, and seasonal availability built in.',
  },
  {
    icon: Users,
    title: 'Client Portal',
    description:
      'Clients confirm menus, share dietary needs, review proposals, and approve deposits online.',
  },
  {
    icon: Wallet,
    title: 'Financial Tracking',
    description:
      'Track deposits, payouts, grocery costs, and margins per event. See what actually compounds.',
  },
  {
    icon: CookingPot,
    title: 'Menu Builder',
    description:
      'Build menus from your recipe library with automatic per-head costing and dietary flagging.',
  },
  {
    icon: DollarSign,
    title: 'Pricing Intelligence',
    description:
      'Regional ingredient pricing, seasonal adjustments, and cost benchmarks to protect margins.',
  },
] as const

export function PlatformShowcase() {
  return (
    <section className="bg-[#0a0a0a]">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            Platform capabilities
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-100 md:text-4xl">
            Everything a chef operator needs, nothing you don&apos;t
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-400">
            Each feature was built because a real workflow demanded it. No
            bloat, no features for features&apos; sake.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon
            return (
              <article
                key={cap.title}
                className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-6 transition-colors hover:border-stone-700/80"
              >
                <div className="inline-flex rounded-xl bg-brand-950/80 p-2.5 text-brand-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-stone-100">
                  {cap.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">
                  {cap.description}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
