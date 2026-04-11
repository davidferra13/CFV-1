import type { Metadata } from 'next'
import Link from 'next/link'
import {
  PUBLIC_OPERATOR_ENTRY,
  PUBLIC_PRIMARY_CONSUMER_CTA,
} from '@/lib/public/public-surface-config'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'How ChefFlow Works - For Clients and Chefs',
  description:
    'How to find and book a private chef on ChefFlow. Browse profiles, send an inquiry, and connect directly. No platform fee, no middleman.',
  openGraph: {
    title: 'How ChefFlow Works',
    description: 'Browse chef profiles, send an inquiry, connect directly. No fees on either side.',
    url: `${BASE_URL}/how-it-works`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/how-it-works`,
  },
}

export default function HowItWorksPage() {
  return (
    <main>
      <section className="mx-auto w-full max-w-3xl px-4 pt-20 pb-8 sm:px-6 md:pt-28 md:pb-12 lg:px-8">
        <h1 className="text-3xl font-display tracking-tight text-white md:text-4xl lg:text-5xl">
          How it works
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-300">
          ChefFlow connects you directly with food professionals. No algorithm matching, no call
          center, no platform fee. Here is exactly what happens.
        </p>
      </section>

      {/* For clients */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-14 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-stone-100">If you are looking for a chef</h2>
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
            <h3 className="text-sm font-semibold text-stone-200">
              1. Browse or describe what you need
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              You can browse the{' '}
              <Link href="/chefs" className="text-brand-400 hover:underline">
                chef directory
              </Link>{' '}
              and filter by location, cuisine, service type, and dietary specialties. Or skip
              straight to the{' '}
              <Link href="/book" className="text-brand-400 hover:underline">
                booking form
              </Link>{' '}
              and describe your event (date, guest count, budget, dietary needs). No account
              required for either.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
            <h3 className="text-sm font-semibold text-stone-200">
              2. The chef gets your inquiry directly
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              Your message goes straight to the chef. They see your event details and respond on
              their own schedule, usually within 24-48 hours. You communicate directly with the
              person who will be cooking. There is no middleman translating your request.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
            <h3 className="text-sm font-semibold text-stone-200">
              3. You agree on terms and they handle the rest
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              The chef sends you a proposal with menu, pricing, and what is included. Once you
              agree, they handle menu planning, ingredient sourcing, cooking, plating, and cleanup.
              Payment goes to the chef directly through Stripe. ChefFlow takes nothing.
            </p>
          </div>
        </div>
      </section>

      {/* For chefs */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-stone-100">If you are a chef</h2>
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <h3 className="text-sm font-semibold text-stone-200">Create your profile</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                Sign up, fill in your services, cuisine types, coverage area, and pricing. Your
                profile goes through a brief review before appearing in the public directory. This
                is not a background check. We verify that your profile is complete, describes real
                services, and has accurate contact information.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <h3 className="text-sm font-semibold text-stone-200">
                Run your business from one place
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                Inquiries land in your inbox. Accept them, build a proposal, manage the event
                lifecycle, track food costs, invoice the client, and follow up afterward. Everything
                in one platform instead of scattered across email, spreadsheets, Venmo, and text
                threads.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <h3 className="text-sm font-semibold text-stone-200">
                You keep 100% of what you earn
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                No commission, no listing fee, no transaction percentage. Standard Stripe processing
                fees apply (2.9% + 30c), which is the same rate you would pay with any other payment
                processor. ChefFlow does not add anything on top.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-14 text-center sm:px-6 md:py-18 lg:px-8">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
              className="inline-flex h-12 items-center justify-center rounded-xl gradient-accent px-6 text-sm font-semibold text-white glow-hover shadow-lg"
            >
              {PUBLIC_PRIMARY_CONSUMER_CTA.label}
            </Link>
            <Link
              href={PUBLIC_OPERATOR_ENTRY.href}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/60 px-6 text-sm font-medium text-stone-300 transition-all hover:bg-stone-800 hover:border-stone-600 hover:text-stone-100"
            >
              {PUBLIC_OPERATOR_ENTRY.label}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
