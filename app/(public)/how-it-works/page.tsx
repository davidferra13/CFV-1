import type { Metadata } from 'next'
import Link from 'next/link'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'How It Works - Book a Chef in 3 Steps',
  description:
    'Search vetted chefs by location, cuisine, or service type. Connect directly with no middleman. Enjoy a chef-led experience.',
  openGraph: {
    title: 'How It Works - Book a Chef in 3 Steps',
    description:
      'Search vetted chefs by location, cuisine, or service type. Connect directly with no middleman. Enjoy a chef-led experience.',
    url: `${BASE_URL}/how-it-works`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/how-it-works`,
  },
}

const STEPS = [
  {
    step: '01',
    title: 'Search',
    description: 'Browse chefs by location, cuisine, or service type. Every chef is vetted.',
    detail:
      'Use filters to narrow results by availability, pricing, dietary specialties, and more. View profiles, read reviews, and compare options before reaching out.',
  },
  {
    step: '02',
    title: 'Connect',
    description: 'Send an inquiry directly. No middleman, no commission, no hidden fees.',
    detail:
      'Describe your event, guest count, dietary needs, and budget. The chef receives your inquiry instantly and responds on their schedule. You communicate directly, always.',
  },
  {
    step: '03',
    title: 'Enjoy',
    description: 'Your chef handles the details. You enjoy the experience.',
    detail:
      'Menu planning, ingredient sourcing, on-site cooking, and cleanup. Your chef manages everything so you can focus on your guests.',
  },
]

const TRUST_POINTS = [
  {
    label: 'Free to browse',
    description: 'No account required to search and view chef profiles.',
  },
  {
    label: 'No middleman',
    description: 'You deal directly with the chef. We do not sit between you.',
  },
  {
    label: 'Zero commission',
    description: 'Chefs keep 100% of what they earn. No platform fees on either side.',
  },
  {
    label: 'Every chef is vetted',
    description: 'Profiles are verified before going live. You see real credentials.',
  },
]

export default function HowItWorksPage() {
  return (
    <main>
      <section className="mx-auto w-full max-w-5xl px-4 pt-20 pb-8 text-center sm:px-6 md:pt-28 md:pb-12 lg:px-8">
        <h1 className="text-4xl font-display tracking-tight text-white md:text-5xl">
          How it <span className="text-gradient">works.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-300">
          Three steps between you and a chef-led experience. No accounts, no fees, no complications.
        </p>
      </section>

      {/* Steps */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6 md:pb-24 lg:px-8">
        <div className="space-y-12">
          {STEPS.map((item, i) => (
            <div
              key={item.step}
              className="flex flex-col items-start gap-6 sm:flex-row sm:items-start"
            >
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-600/15 border border-brand-600/30">
                <span className="text-xl font-display font-bold text-brand-400">{item.step}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-stone-100">{item.title}</h2>
                <p className="mt-2 text-base text-stone-300">{item.description}</p>
                <p className="mt-3 text-sm leading-relaxed text-stone-500">{item.detail}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:block absolute left-8 h-12 w-px bg-stone-800" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <h2 className="text-center font-display text-2xl font-bold text-stone-100 md:text-3xl tracking-tight">
            Why people trust ChefFlow
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {TRUST_POINTS.map((point) => (
              <div key={point.label} className="flex items-start gap-4">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-stone-100">{point.label}</h3>
                  <p className="mt-1 text-sm text-stone-400">{point.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-stone-100 md:text-3xl tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 max-w-xl text-base text-stone-400 leading-relaxed">
            Find a chef in your area and send an inquiry today.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/book"
              className="inline-flex h-12 items-center justify-center rounded-xl gradient-accent px-6 text-sm font-semibold text-white glow-hover shadow-lg"
            >
              Book a Private Chef
            </Link>
            <Link
              href="/chefs"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/60 px-6 text-sm font-medium text-stone-300 transition-all hover:bg-stone-800 hover:border-stone-600 hover:text-stone-100"
            >
              Browse Chefs
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
