import type { Metadata } from 'next'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chefflow.app'

export const revalidate = 3600 // ISR: revalidate every hour

export const metadata: Metadata = {
  title: 'ChefFlow | Private Chef Business OS',
  description: 'Run events, menus, clients, and payments from one calm workspace.',
  openGraph: {
    title: 'ChefFlow | Private Chef Business OS',
    description: 'Run events, menus, clients, and payments from one calm workspace.',
    url: BASE_URL,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow | Private Chef Business OS',
    description: 'Run events, menus, clients, and payments from one calm workspace.',
  },
}

// Below-fold sections lazy-loaded to reduce initial JS bundle
const LandingBelowFold = dynamic(() => import('./_components/landing-below-fold'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-6">
            <div className="h-10 w-10 bg-stone-100 rounded-lg animate-pulse mb-4" />
            <div className="h-6 w-40 bg-stone-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-full bg-stone-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  ),
})

export default function Home() {
  return (
    <main>
      {/* Hero - server rendered, above the fold */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-brand-100/50 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 md:pb-20 md:pt-24 lg:px-8">
          <p className="mb-5 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
            Private Chef Operating System
          </p>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-stone-900 md:text-6xl">
            Clean operations for chefs who are done juggling tools.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-600 md:text-lg">
            ChefFlow centralizes events, client communication, and payments so you can spend less
            time in admin and more time creating standout experiences.
          </p>
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Sign up
            </Link>
            <Link
              href="/pricing"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features, steps, CTA - lazy loaded below the fold */}
      <Suspense>
        <LandingBelowFold />
      </Suspense>
    </main>
  )
}
