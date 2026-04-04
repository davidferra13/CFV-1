import type { Metadata } from 'next'
import Link from 'next/link'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'About ChefFlow',
  description:
    'ChefFlow connects consumers with private chefs and gives food operators the tools to run their entire business. Free forever, zero commission.',
  openGraph: {
    title: 'About ChefFlow',
    description:
      'ChefFlow connects consumers with private chefs and gives food operators the tools to run their entire business.',
    url: `${BASE_URL}/about`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/about`,
  },
}

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto w-full max-w-4xl px-4 pt-20 pb-8 text-center sm:px-6 md:pt-28 md:pb-12 lg:px-8">
        <h1 className="text-4xl font-display tracking-tight text-white md:text-5xl">
          Ops for <span className="text-gradient">Artists.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-300">
          ChefFlow is a platform built by a working chef for working chefs. It connects consumers
          with private chefs and gives food operators a single workspace to manage clients, events,
          menus, finances, and staff.
        </p>
      </section>

      {/* What we believe */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6 md:pb-20 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-6">
            <h2 className="text-lg font-semibold text-stone-100">For consumers</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              Search vetted chefs by location, cuisine, or service type. Send an inquiry directly.
              No middleman, no commission, no hidden fees. You deal with the chef, always.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-6">
            <h2 className="text-lg font-semibold text-stone-100">For operators</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              Run your entire business from one place. Client memory, event lifecycle, menu costing,
              financial tracking, document generation, and an AI assistant that respects your data
              privacy. Free forever.
            </p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <h2 className="text-center font-display text-2xl font-bold text-stone-100 md:text-3xl tracking-tight">
            What we stand for
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: 'Free', label: 'forever', detail: 'Every feature, every user. No paywalls.' },
              {
                stat: 'Zero',
                label: 'commission',
                detail: 'Chefs keep 100% of what they earn.',
              },
              {
                stat: '100%',
                label: 'private',
                detail: 'Your data stays yours. AI runs locally.',
              },
              {
                stat: 'Self',
                label: 'hosted',
                detail: 'You own the infrastructure. No vendor lock-in.',
              },
            ].map((p) => (
              <div
                key={p.label}
                className="flex flex-col items-center rounded-2xl border border-stone-700/60 bg-stone-900/50 p-6 text-center"
              >
                <span className="text-3xl font-display font-bold text-brand-400">{p.stat}</span>
                <span className="mt-1 text-sm font-medium uppercase tracking-wider text-stone-300">
                  {p.label}
                </span>
                <span className="mt-3 text-xs text-stone-500">{p.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Origin */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-stone-100 md:text-3xl tracking-tight">
            Built by a chef, for chefs
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-stone-400 leading-relaxed">
            ChefFlow started because a working private chef needed software that actually fit the
            job. Not restaurant POS software, not generic CRM, not spreadsheets. Something that
            understood the workflow from inquiry to cleanup.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base text-stone-400 leading-relaxed">
            That is what this is. One platform, purpose-built for the way food operators actually
            work.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 md:py-20 lg:px-8">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/chefs"
              className="inline-flex h-12 items-center justify-center rounded-xl gradient-accent px-6 text-sm font-semibold text-white glow-hover shadow-lg"
            >
              Browse Chefs
            </Link>
            <Link
              href="/for-operators"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/60 px-6 text-sm font-medium text-stone-300 transition-all hover:bg-stone-800 hover:border-stone-600 hover:text-stone-100"
            >
              For Operators
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
