import type { Metadata } from 'next'
import Link from 'next/link'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'About ChefFlow',
  description:
    'ChefFlow was built by a private chef with 10+ years of experience who needed software that actually fit the job. Free, private, no commission.',
  openGraph: {
    title: 'About ChefFlow',
    description:
      'Built by a working chef. One platform for clients, events, menus, food costing, finances, and staff.',
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
      <section className="mx-auto w-full max-w-3xl px-4 pt-20 pb-8 sm:px-6 md:pt-28 md:pb-12 lg:px-8">
        <h1 className="text-3xl font-display tracking-tight text-white md:text-4xl lg:text-5xl">
          I built this because I needed it.
        </h1>
        <p className="mt-6 text-base leading-relaxed text-stone-300 md:text-lg">
          After 10+ years as a private chef, I had recipes in my head, receipts in shoeboxes, client
          dietary notes scattered across text threads, and no clear picture of whether I was
          actually making money on any given event.
        </p>
        <p className="mt-4 text-base leading-relaxed text-stone-300 md:text-lg">
          I tried restaurant POS software (built for 40-seat dining rooms, not a solo operator in
          someone&apos;s kitchen). I tried generic CRM tools (no concept of menus, food cost, or
          event lifecycle). I tried spreadsheets (they worked until they didn&apos;t, which was
          around client #8).
        </p>
        <p className="mt-4 text-base leading-relaxed text-stone-300 md:text-lg">
          So I built ChefFlow. It does what I actually needed: track clients and their preferences,
          manage the full event lifecycle from inquiry to post-event follow-up, cost recipes with
          real yield factors, generate quotes and invoices, and show me whether I&apos;m profitable
          or fooling myself.
        </p>
      </section>

      {/* What it actually does */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
          <h2 className="text-xl font-semibold text-stone-100 md:text-2xl">
            Two sides of the same platform
          </h2>
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <h3 className="text-sm font-semibold text-stone-200">
                If you are looking for a chef
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                Browse profiles, filter by location and service type, and send an inquiry directly.
                There is no platform fee and no middleman. You pay the chef, and that is the only
                transaction.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <h3 className="text-sm font-semibold text-stone-200">
                If you are a chef or food operator
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                ChefFlow is your back office. Clients, events, menus, food costing with yield
                factors, finances (immutable ledger, not a spreadsheet), recipes, inventory, staff,
                and an AI assistant for the admin work you hate. Everything in one place, free, and
                your data stays private.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why it is free */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
          <h2 className="text-xl font-semibold text-stone-100 md:text-2xl">Why it is free</h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-400">
            Most platforms take 15-20% of every transaction. That means a chef earning $5,000 on an
            event loses $750-$1,000 to the platform before paying for groceries, staff, or gas. I am
            not doing that. ChefFlow is free because food operators already have tight margins. The
            software should help with that, not make it worse.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-stone-400">
            No paywalls, no feature tiers, no locked capabilities. If you want to support the
            project, there is an optional contribution in settings. That is it.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-14 text-center sm:px-6 md:py-18 lg:px-8">
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
              I Am a Chef
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
