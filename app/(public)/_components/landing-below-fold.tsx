import Link from 'next/link'
import { MapPin, Utensils, ArrowRight, Globe, ShieldCheck, Zap } from '@/components/ui/icons'

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Search by location',
    description:
      'Enter your city or ZIP. Filter by cuisine, occasion, or service type. Every chef is vetted and verified.',
    icon: MapPin,
    accent: 'from-[#8b4513]/20 to-[#5c2d0e]/10',
    border: 'border-[#8b4513]/30',
  },
  {
    step: '02',
    title: 'See real menus, real prices',
    description:
      'No stock photos. No fake listings. Browse actual dishes and pricing directly from the chef.',
    icon: Utensils,
    accent: 'from-[#7a3b10]/20 to-[#4a2408]/10',
    border: 'border-[#7a3b10]/30',
  },
  {
    step: '03',
    title: 'Book directly with the chef',
    description:
      'No middleman fees on your inquiry. Message the chef, get a custom quote, and book on your terms.',
    icon: ArrowRight,
    accent: 'from-[#6b3010]/20 to-[#3a1c08]/10',
    border: 'border-[#6b3010]/30',
  },
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
      {/* ── How it works ── */}
      <section className="bg-[#111111]">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#e8a96b]">
              How it works
            </p>
            <h2 className="font-display-serif mx-auto max-w-2xl text-4xl font-bold tracking-tight text-stone-100 sm:text-5xl">
              From search to table.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-400">
              Find the right chef in minutes. Whether you want a private dinner, catering for a
              wedding, or weekly meal prep.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className={`group relative overflow-hidden rounded-3xl border ${item.border} bg-gradient-to-br ${item.accent} p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]`}
                >
                  <span className="mb-5 block font-mono text-5xl font-black leading-none tracking-tighter text-[#e8a96b]/20 transition-colors duration-300 group-hover:text-[#e8a96b]/35">
                    {item.step}
                  </span>
                  <div className="mb-4 inline-flex rounded-xl bg-[#2a1610]/80 p-3 text-[#e8a96b]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-stone-100">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-400">{item.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <div className="h-20 bg-gradient-to-b from-[#111111] to-[#0c0a09]" aria-hidden="true" />

      {/* ── For operators ── */}
      <section className="bg-[#0c0a09]">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-[#5c3520]/30 bg-gradient-to-br from-[#1e0f08]/80 via-[#160b04]/80 to-[#0c0804]/80 p-10 sm:p-14">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#e8a96b]">
              For food providers
            </p>
            <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-stone-100 md:text-4xl">
              Get discovered by hungry clients.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-400">
              Private chefs, caterers, food trucks, bakeries. Consumers searching for food near them
              find you organically. Free listing, no commissions.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {PROVIDER_BENEFITS.map((benefit) => {
                const Icon = benefit.icon
                return (
                  <div key={benefit.title} className="flex items-start gap-4">
                    <div className="mt-0.5 rounded-xl bg-[#3a2218]/80 p-3 text-[#e8a96b]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-stone-200">{benefit.title}</h3>
                      <p className="mt-1 text-sm text-stone-500">{benefit.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/marketplace-chefs"
                className="inline-flex items-center gap-2 rounded-2xl gradient-accent px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                Join as a chef
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/for-operators"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#5c3520]/60 bg-[#1e0f08]/60 px-6 py-3 text-sm font-medium text-stone-300 transition-all hover:border-[#8b5e3c]/60 hover:text-stone-100"
              >
                Learn about ChefFlow
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="h-16 bg-gradient-to-b from-[#0c0a09] to-[#0a0a0a]" aria-hidden="true" />

      {/* ── Final CTA ── */}
      <section className="bg-[#0a0a0a] border-t border-[#3a1e0c]/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6 md:py-28 lg:px-8">
          <h2 className="font-display-serif mx-auto max-w-xl text-4xl font-bold tracking-tight text-stone-100 sm:text-5xl">
            Discover what to eat next.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-stone-400">
            Browse profiles, explore real menus, and connect directly with a chef near you.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/chefs"
              className="inline-flex items-center justify-center rounded-2xl gradient-accent px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#8b4513]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#8b4513]/35"
            >
              Start exploring
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
