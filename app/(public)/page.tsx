import type { Metadata } from 'next'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chefflow.app'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'ChefFlow | Discover Private Chefs, Caterers & Food Near You',
  description:
    'Discover private chefs, caterers, restaurants, food trucks, and bakeries near you. Browse real menus, compare options, and connect directly with food providers.',
  openGraph: {
    title: 'ChefFlow | Discover Private Chefs, Caterers & Food Near You',
    description:
      'Discover private chefs, caterers, restaurants, food trucks, and bakeries near you. Browse real menus, compare options, and connect directly with food providers.',
    url: BASE_URL,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow | Discover Private Chefs, Caterers & Food Near You',
    description:
      'Discover private chefs, caterers, restaurants, food trucks, and bakeries near you. Browse real menus, compare options, and connect directly with food providers.',
  },
}

const LandingBelowFold = dynamic(() => import('./_components/landing-below-fold'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
            <div className="h-10 w-10 rounded-lg loading-bone loading-bone-muted mb-4" />
            <div className="h-6 w-40 loading-bone loading-bone-muted mb-2" />
            <div className="h-4 w-full bg-stone-800/50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  ),
})

const CATEGORIES = [
  { label: 'Private Chefs', href: '/chefs', emoji: '👨‍🍳' },
  { label: 'Caterers', href: '/discover?type=caterer', emoji: '🍽️' },
  { label: 'Meal Prep', href: '/discover?type=meal_prep', emoji: '🥗' },
  { label: 'Restaurants', href: '/discover?type=restaurant', emoji: '🏪' },
  { label: 'Food Trucks', href: '/discover?type=food_truck', emoji: '🚚' },
  { label: 'Bakeries', href: '/discover?type=bakery', emoji: '🧁' },
]

export default function Home() {
  return (
    <main>
      {/* Hero: search-first, consumer-focused */}
      <section className="relative overflow-hidden hero-glow">
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-10 pt-20 text-center sm:px-6 md:pb-16 md:pt-28 lg:px-8">
          <p className="mb-5 rounded-full border border-brand-700/40 bg-brand-950/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300 animate-float">
            Food Directory
          </p>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl text-gradient">
            Find exactly what you want to eat.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-400 md:text-lg">
            Browse private chefs, restaurants, caterers, food trucks, and bakeries near you. Explore
            menus and connect directly.
          </p>

          {/* Search bar */}
          <div className="mt-10 w-full max-w-2xl">
            <form action="/discover" method="get" className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  name="q"
                  placeholder="What are you looking for?"
                  className="h-14 w-full rounded-xl border border-stone-700 bg-stone-900/80 px-4 text-base text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 glass-subtle"
                />
              </div>
              <button
                type="submit"
                className="h-14 rounded-xl gradient-accent px-8 text-sm font-semibold text-white glow-hover"
              >
                Search
              </button>
            </form>
          </div>

          {/* Category pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="inline-flex items-center gap-2 rounded-full border border-stone-700/60 bg-stone-900/60 px-4 py-2 text-sm text-stone-300 transition-all duration-200 hover:border-brand-600/50 hover:bg-stone-800 hover:text-stone-100 hover:-translate-y-0.5"
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-t border-stone-800/50">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 text-sm text-stone-500">
          <span>Free to browse</span>
          <span className="hidden sm:inline text-stone-700 divider-brand w-px h-4" />
          <span>No middleman</span>
          <span className="hidden sm:inline text-stone-700 divider-brand w-px h-4" />
          <span>Connect directly</span>
          <span className="hidden sm:inline text-stone-700 divider-brand w-px h-4" />
          <span>Real menus</span>
          <span className="hidden sm:inline text-stone-700 divider-brand w-px h-4" />
          <span>No commission</span>
        </div>
      </section>

      <Suspense>
        <LandingBelowFold />
      </Suspense>
    </main>
  )
}
