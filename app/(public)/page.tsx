import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingMetadata } from '@/lib/site/public-site'

const marketingMetadata = buildMarketingMetadata({
  title: 'ChefFlow: Run Your Private Chef Business From One Place',
  description:
    'Replace spreadsheets, text threads, and paper invoices. ChefFlow is the operating system for private chefs.',
  path: '/',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'ChefFlow private chef software',
})

export const metadata: Metadata = {
  ...marketingMetadata,
  keywords: [
    'private chef software',
    'chef business management',
    'chef invoicing',
    'catering software',
    'private chef tools',
  ],
}

export default function Home() {
  return (
    <main className="bg-[#1a0e08]">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Run your private chef business from one place.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-400">
          Events, clients, menus, invoices, prep lists, and payments. Everything you juggle
          between spreadsheets, texts, and paper, in one tool built by a chef.
        </p>
        <div className="mt-8">
          <Link
            href="/auth/signup"
            className="inline-flex items-center rounded-xl bg-orange-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-orange-500"
          >
            Start Free
          </Link>
        </div>
      </section>

      {/* Value Props */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
            <h3 className="text-lg font-bold text-white">Events and Clients</h3>
            <p className="mt-2 text-sm text-stone-400">
              Manage events, track clients, handle inquiries from one dashboard.
              No more searching through email threads.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
            <h3 className="text-lg font-bold text-white">Invoicing and Payments</h3>
            <p className="mt-2 text-sm text-stone-400">
              Send invoices, collect payments through Stripe Connect, track what
              you are owed. Get paid without chasing.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
            <h3 className="text-lg font-bold text-white">AI Assistant</h3>
            <p className="mt-2 text-sm text-stone-400">
              Remy helps with prep lists, client communication, and day-of
              logistics. Like a sous chef for your business.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Summary */}
      <section className="border-t border-stone-800 py-16 text-center">
        <h2 className="text-2xl font-bold text-white">
          Free to start. $1 worth of value from day one.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-stone-400">
          Free tier covers unlimited events, clients, menus, and recipes. Pro adds
          AI and storage for $10/mo. Business unlocks everything for $25/mo.
        </p>
        <Link
          href="/pricing"
          className="mt-6 inline-flex items-center rounded-lg border border-stone-700 px-5 py-2 text-sm font-medium text-stone-300 hover:border-stone-500 hover:text-white"
        >
          See pricing details
        </Link>
      </section>

      {/* Built by a Chef */}
      <section className="border-t border-stone-800 py-16 text-center">
        <h2 className="text-xl font-bold text-white">
          Built by a private chef with 10+ years in the industry.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-stone-400">
          ChefFlow exists because the tools out there were built by people who
          never prepped a 12-course dinner. This one was.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-8 text-center">
        <div className="flex items-center justify-center gap-6 text-xs text-stone-500">
          <Link href="/pricing" className="hover:text-stone-300">Pricing</Link>
          <Link href="/terms" className="hover:text-stone-300">Terms</Link>
          <Link href="/privacy" className="hover:text-stone-300">Privacy</Link>
        </div>
      </footer>
    </main>
  )
}
