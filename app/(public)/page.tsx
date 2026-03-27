import type { Metadata } from 'next'
import Link from 'next/link'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'ChefFlow | Ops for Artists',
  description:
    'The operating system for private chefs. Manage clients, events, menus, finances, and your entire business from one place.',
  openGraph: {
    title: 'ChefFlow | Ops for Artists',
    description:
      'The operating system for private chefs. Manage clients, events, menus, finances, and your entire business from one place.',
    url: BASE_URL,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow | Ops for Artists',
    description:
      'The operating system for private chefs. Manage clients, events, menus, finances, and your entire business from one place.',
  },
}

const CAPABILITIES = [
  {
    title: 'Clients',
    detail: 'Dietary needs, allergies, preferences, communication history',
  },
  {
    title: 'Events',
    detail: 'Inquiry to post-service: timelines, prep, packing, coordination',
  },
  {
    title: 'Menus',
    detail: 'Build menus, track food costs, generate client proposals',
  },
  {
    title: 'Finances',
    detail: 'Invoicing, payments, expenses, mileage, tax prep',
  },
  {
    title: 'Recipes',
    detail: 'Your recipe book digitized. Scale portions, cost per serving',
  },
  {
    title: 'Private AI',
    detail: 'Remy runs locally. Your data never leaves your computer',
  },
]

const PRINCIPLES = [
  { stat: 'Free', label: 'forever' },
  { stat: 'Self', label: 'hosted' },
  { stat: 'Zero', label: 'commission' },
  { stat: '100%', label: 'private' },
]

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden hero-glow">
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-12 pt-24 text-center sm:px-6 md:pb-20 md:pt-32 lg:px-8">
          <p className="mb-6 rounded-full border border-brand-700/30 bg-brand-950/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
            Ops for Artists
          </p>
          <h1 className="max-w-4xl fluid-display-xl font-display tracking-tight text-gradient">
            The operating system for private chefs.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-stone-300 md:text-xl">
            Clients, events, menus, recipes, finances, and staff.
            <br className="hidden sm:inline" />
            One platform that respects your craft and your privacy.
          </p>

          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex h-14 items-center justify-center rounded-2xl gradient-accent px-10 text-base font-semibold text-white glow-hover shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex h-14 items-center justify-center rounded-2xl border border-stone-700 bg-stone-900/60 px-8 text-base font-medium text-stone-300 transition-all hover:bg-stone-800 hover:border-stone-600 hover:text-stone-100"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Principles - metric-style stats instead of plain text */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 sm:grid-cols-4 gap-8 px-4 py-10">
          {PRINCIPLES.map((p) => (
            <div key={p.stat} className="text-center">
              <div className="text-2xl font-display font-bold text-stone-100">{p.stat}</div>
              <div className="text-xs text-stone-500 mt-1 uppercase tracking-wider font-medium">
                {p.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities - clean two-column list, no cards */}
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <h2 className="text-center font-display text-3xl font-bold text-stone-100 md:text-4xl tracking-tight">
          Everything you need.
          <br />
          <span className="text-stone-500">Nothing you don't.</span>
        </h2>
        <div className="mt-14 grid gap-px sm:grid-cols-2 rounded-2xl overflow-hidden border border-stone-800/60">
          {CAPABILITIES.map((cap, i) => (
            <div
              key={cap.title}
              className="px-6 py-6 sm:py-8 bg-stone-900/40 hover:bg-stone-900/70 transition-colors"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-brand-500 font-display text-lg font-bold">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-stone-100">{cap.title}</h3>
                  <p className="text-sm leading-relaxed text-stone-400 mt-1">{cap.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 md:py-28 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-stone-100 md:text-4xl tracking-tight">
            Your craft deserves better tools.
          </h2>
          <p className="mt-5 max-w-xl text-lg text-stone-400 leading-relaxed">
            Stop juggling spreadsheets, texts, and sticky notes. ChefFlow brings your entire
            operation into one place so you can focus on cooking.
          </p>
          <Link
            href="/auth/signup"
            className="mt-10 inline-flex h-14 items-center justify-center rounded-2xl gradient-accent px-10 text-base font-semibold text-white glow-hover shadow-lg"
          >
            Start for Free
          </Link>
        </div>
      </section>
    </main>
  )
}
