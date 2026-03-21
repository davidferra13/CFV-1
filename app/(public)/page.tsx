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

const FEATURES = [
  {
    title: 'Client Management',
    description:
      'Track dietary needs, allergies, preferences, and communication history. Build lasting relationships with every guest.',
    icon: '👥',
  },
  {
    title: 'Event Operations',
    description:
      'From inquiry to post-service review. Manage timelines, prep schedules, packing lists, and on-site coordination.',
    icon: '📋',
  },
  {
    title: 'Menu Engineering',
    description:
      'Build menus, track food costs, analyze dish performance, and generate beautiful proposals for clients.',
    icon: '🍽️',
  },
  {
    title: 'Financial Control',
    description:
      'Invoicing, payments, expense tracking, mileage logs, and tax preparation. Every dollar accounted for.',
    icon: '💰',
  },
  {
    title: 'Recipe Management',
    description:
      'Your entire recipe book, digitized. Scale portions, track costs per serving, and manage ingredient inventory.',
    icon: '📖',
  },
  {
    title: 'Private AI Assistant',
    description:
      'Remy, your AI concierge, runs locally on your machine. Your data never leaves your computer.',
    icon: '🤖',
  },
]

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden hero-glow">
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-10 pt-20 text-center sm:px-6 md:pb-16 md:pt-28 lg:px-8">
          <p className="mb-5 rounded-full border border-brand-700/40 bg-brand-950/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Ops for Artists
          </p>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl text-gradient">
            Run your private chef business from one place.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-400 md:text-lg">
            ChefFlow is the operating system built for private chefs. Manage clients, events, menus,
            recipes, finances, and staff, all in one platform that respects your craft and your
            privacy.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex h-14 items-center justify-center rounded-xl gradient-accent px-8 text-base font-semibold text-white glow-hover"
            >
              Get Started Free
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex h-14 items-center justify-center rounded-xl border border-stone-600 bg-stone-900/80 px-8 text-base font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-t border-stone-800/50">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 text-sm text-stone-500">
          <span>Free forever</span>
          <span className="hidden sm:inline text-stone-700 divider-brand w-px h-4" />
          <span>Self-hosted</span>
          <span className="hidden sm:inline text-stone-700 divider-brand w-px h-4" />
          <span>Your data stays yours</span>
          <span className="hidden sm:inline text-stone-700 divider-brand w-px h-4" />
          <span>No commission</span>
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <h2 className="mb-12 text-center text-2xl font-bold text-stone-100 md:text-3xl">
          Everything you need to run your business
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 transition-colors hover:border-stone-700"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-stone-800 text-2xl">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-stone-100">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-stone-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800/50">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
          <h2 className="text-2xl font-bold text-stone-100 md:text-3xl">
            Your craft deserves better tools.
          </h2>
          <p className="mt-4 max-w-xl text-base text-stone-400">
            Stop juggling spreadsheets, texts, and sticky notes. ChefFlow brings your entire
            operation into one place, so you can focus on what you do best: cooking.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-flex h-14 items-center justify-center rounded-xl gradient-accent px-8 text-base font-semibold text-white glow-hover"
          >
            Start for Free
          </Link>
        </div>
      </section>
    </main>
  )
}
