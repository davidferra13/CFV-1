import type { Metadata } from 'next'
import Link from 'next/link'
import { PUBLIC_PRIMARY_CONSUMER_CTA } from '@/lib/public/public-surface-config'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Chef Services - Private Dinners, Catering, Meal Prep & More',
  description:
    'Private dinners, catering, meal prep, weddings, corporate dining, cooking classes. Browse chefs by the service you need.',
  openGraph: {
    title: 'Chef Services - ChefFlow',
    description:
      'Private dinners, catering, meal prep, weddings, corporate dining, cooking classes.',
    url: `${BASE_URL}/services`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/services`,
  },
}

const SERVICES = [
  {
    label: 'Private Dinners',
    value: 'private_dinner',
    price: '$50 - $150+ per person',
    description:
      'A chef comes to your home, plans the menu, shops for ingredients, cooks everything on-site, and cleans up. You host, they handle the rest. Works for date nights, dinner parties, birthdays, or any gathering of 2 to 20.',
  },
  {
    label: 'Catering',
    value: 'catering',
    price: 'Varies by headcount',
    description:
      'Full-service for weddings, corporate events, and celebrations. The chef coordinates menu planning, staffing, setup, and execution. Most caterers handle events from 20 to 200+ guests.',
  },
  {
    label: 'Meal Prep',
    value: 'meal_prep',
    price: '$200 - $800+ per week',
    description:
      'Weekly or biweekly cooking sessions tailored to your household. The chef builds a menu around your dietary needs, shops, cooks, portions, and labels everything for the week. Common for families, athletes, and busy professionals.',
  },
  {
    label: 'Cooking Classes',
    value: 'cooking_class',
    price: '$75 - $200+ per person',
    description:
      'Private or group sessions in your kitchen or a rented space. Learn specific techniques, cuisines, or recipes from a working chef. Popular for team-building, date nights, and birthday celebrations.',
  },
  {
    label: 'Weddings',
    value: 'wedding',
    price: 'Custom quotes',
    description:
      'Rehearsal dinners, reception service, tasting menus. A dedicated chef who works with your vision from planning through the last plate. Book 3 to 6 months in advance for best availability.',
  },
  {
    label: 'Corporate Dining',
    value: 'corporate',
    price: 'Custom quotes',
    description:
      'Team lunches, executive dining, retreats, and client hospitality. Elevate workplace meals beyond delivery trays. Recurring or one-time arrangements.',
  },
]

export default function ServicesPage() {
  return (
    <main>
      <section className="mx-auto w-full max-w-4xl px-4 pt-20 pb-8 sm:px-6 md:pt-28 md:pb-12 lg:px-8">
        <h1 className="text-3xl font-display tracking-tight text-white md:text-4xl lg:text-5xl">
          What you can hire a chef for
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-300">
          Every chef on ChefFlow sets their own services, pricing, and availability. Here is what
          most offer.
        </p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6 md:pb-24 lg:px-8">
        <div className="space-y-4">
          {SERVICES.map((svc) => (
            <Link
              key={svc.value}
              href={`/chefs?serviceType=${svc.value}`}
              className="group flex flex-col rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5 transition-all hover:border-brand-600/40 hover:bg-stone-900/70 sm:flex-row sm:items-start sm:gap-6"
            >
              <div className="flex-1">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-base font-semibold text-stone-100 group-hover:text-white">
                    {svc.label}
                  </h2>
                  <span className="text-xs text-stone-500">{svc.price}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{svc.description}</p>
              </div>
              <span className="mt-3 shrink-0 text-sm font-medium text-brand-400 group-hover:text-brand-300 sm:mt-0">
                Find chefs &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-14 text-center sm:px-6 md:py-18 lg:px-8">
          <p className="text-base text-stone-300">
            Not sure what you need? Book a Chef and let matched chefs come to you.
          </p>
          <Link
            href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl gradient-accent px-6 text-sm font-semibold text-white glow-hover shadow-lg"
          >
            {PUBLIC_PRIMARY_CONSUMER_CTA.label}
          </Link>
        </div>
      </section>
    </main>
  )
}
