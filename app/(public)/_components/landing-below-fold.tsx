import Link from 'next/link'
import { MapPin, Utensils, ArrowRight, Globe, ShieldCheck, Zap } from 'lucide-react'

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
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {VALUE_PROPS.map((prop, i) => {
            const Icon = prop.icon
            return (
              <article
                key={prop.title}
                className="rounded-xl border border-stone-800 bg-stone-900/40 p-6 card-lift"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="mb-4 inline-flex rounded-lg bg-brand-950/60 p-2.5 text-brand-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-stone-100">{prop.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{prop.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-stone-800/50">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20 lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-stone-100 md:text-4xl">
              From search to table.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-400">
              Whether you want a private dinner, catering for an event, or weekly meal prep, find
              the right provider in minutes.
            </p>
          </div>
          <div className="space-y-5 rounded-xl border border-stone-800 bg-stone-900/40 p-6 glass-subtle">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-700/40 bg-brand-950/50 text-sm font-semibold text-brand-300">
                  {i + 1}
                </span>
                <p className="pt-1 text-sm leading-relaxed text-stone-300">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For operators (subtle, secondary) */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          For Food Providers
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-stone-200 md:text-3xl">
          List your business for free.
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-500">
          Private chefs, caterers, restaurants, food trucks, bakeries. Get discovered by hungry
          consumers searching for exactly what you offer.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PROVIDER_BENEFITS.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div key={benefit.title} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-stone-800/50 p-2 text-stone-400">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-300">{benefit.title}</h3>
                  <p className="mt-1 text-sm text-stone-500">{benefit.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8">
          <Link
            href="/marketplace-chefs"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-300 transition-all duration-200 hover:bg-stone-800 hover:text-stone-100 hover:-translate-y-0.5"
          >
            Learn more
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-stone-800/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-gradient">
            Discover what to eat next.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-400">
            Browse providers near you, explore real menus, and connect directly.
          </p>
          <Link
            href="/chefs"
            className="mt-8 inline-flex items-center justify-center rounded-lg gradient-accent px-7 py-3 text-sm font-semibold text-white glow-hover"
          >
            Start exploring
          </Link>
        </div>
      </section>
    </div>
  )
}
