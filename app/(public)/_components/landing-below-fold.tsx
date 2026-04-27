import Link from 'next/link'
import { MapPin, Utensils, ArrowRight, Globe, ShieldCheck, Zap } from '@/components/ui/icons'

const VALUE_PROPS = [
  {
    icon: MapPin,
    title: 'Discover Nearby',
    description: 'Find private chefs, caterers, food trucks, and bakeries in your area.',
  },
  {
    icon: Utensils,
    title: 'Real Menus',
    description: 'Browse actual menus from providers, not stock photos or generic listings.',
  },
  {
    icon: ArrowRight,
    title: 'Connect Directly',
    description: 'Reach out to providers without a middleman. No commissions, no fees.',
  },
] as const

const HOW_IT_WORKS = [
  'Search by cuisine, occasion, or provider type.',
  'Browse profiles with real menus and reviews.',
  'Connect directly with the provider you choose.',
] as const

const PROVIDER_BENEFITS = [
  {
    icon: Globe,
    title: 'Get Discovered',
    description: 'Consumers searching for food find you organically.',
  },
  {
    icon: ShieldCheck,
    title: 'Keep Control',
    description: 'Your platform, your pricing, your client relationships.',
  },
  {
    icon: Zap,
    title: 'Optional Tools',
    description: 'Free listing. Upgrade to manage events, menus, and payments.',
  },
] as const

export default function LandingBelowFold() {
  return (
    <div>
      {/* Value propositions */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="space-y-5">
          {VALUE_PROPS.map((prop) => {
            const Icon = prop.icon
            return (
              <div
                key={prop.title}
                className="flex items-start gap-4 border-b border-stone-800/30 pb-5 last:border-0 last:pb-0"
              >
                <div className="mt-0.5 shrink-0 rounded-lg bg-stone-800/40 p-2.5 text-stone-500">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-medium tracking-[-0.02em] text-stone-200">
                    {prop.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-stone-500">{prop.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-stone-800/30">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24 lg:gap-16 lg:px-8">
          <div>
            <h2 className="text-3xl font-display tracking-[-0.04em] text-stone-100 md:text-4xl">
              From search to table.
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 tracking-[-0.01em] text-stone-400">
              Private dinner, catering, or weekly meal prep. Find the right provider in minutes.
            </p>
          </div>
          <div className="space-y-5 rounded-2xl border border-stone-800/30 bg-stone-900/30 p-6 backdrop-blur-sm">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-800/30 bg-brand-950/30 text-sm font-semibold text-brand-300/80">
                  {i + 1}
                </span>
                <p className="pt-1 text-sm leading-relaxed tracking-[-0.01em] text-stone-300">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For operators (subtle, secondary) */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          For Food Providers
        </p>
        <h2 className="text-2xl font-display tracking-[-0.035em] text-stone-200 md:text-3xl">
          List your business for free.
        </h2>
        <p className="mt-3 max-w-lg text-base leading-7 tracking-[-0.01em] text-stone-500">
          Private chefs, caterers, restaurants, food trucks, bakeries. Get discovered by consumers
          searching for exactly what you offer.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {PROVIDER_BENEFITS.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div key={benefit.title} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-stone-800/30 p-2.5 text-stone-500">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-[-0.01em] text-stone-300">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-stone-500">{benefit.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-10">
          <Link
            href="/marketplace-chefs"
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-700/80 bg-stone-900/50 px-6 py-3 text-sm font-medium tracking-[-0.01em] text-stone-300 transition-all duration-200 hover:bg-stone-800 hover:text-stone-100 hover:-translate-y-0.5"
          >
            Learn more
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-stone-800/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6 md:py-28 lg:px-8">
          <h2 className="text-mask-hero mx-auto max-w-md text-3xl font-display tracking-[-0.04em] md:text-4xl">
            Discover what to eat next.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 tracking-[-0.01em] text-stone-400">
            Browse providers near you, explore real menus, and connect directly.
          </p>
          <Link
            href="/chefs"
            className="mt-10 inline-flex items-center justify-center rounded-2xl gradient-accent px-8 py-3.5 text-sm font-semibold tracking-[-0.01em] text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Start exploring
          </Link>
        </div>
      </section>
    </div>
  )
}
