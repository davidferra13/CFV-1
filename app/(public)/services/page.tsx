import type { Metadata } from 'next'
import Link from 'next/link'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Services - Find the Right Chef Experience',
  description:
    'Private dinners, catering, meal prep, weddings, corporate dining, cooking classes. Browse chefs by the service you need.',
  openGraph: {
    title: 'Services - Find the Right Chef Experience',
    description:
      'Private dinners, catering, meal prep, weddings, corporate dining, cooking classes. Browse chefs by the service you need.',
    url: `${BASE_URL}/services`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/services`,
  },
}

const SERVICE_CATEGORIES = [
  {
    label: 'Private Dinners',
    value: 'private_dinner',
    description: 'Intimate meals crafted in your home by a professional chef.',
    detail:
      'From date nights to dinner parties. Your chef plans the menu, shops for ingredients, cooks on-site, and handles cleanup.',
    icon: '🍽',
  },
  {
    label: 'Catering',
    value: 'catering',
    description: 'Events of any size, handled start to finish.',
    detail:
      'Weddings, corporate events, celebrations. Full-service catering with menu planning, staffing coordination, and on-site execution.',
    icon: '🎉',
  },
  {
    label: 'Meal Prep',
    value: 'meal_prep',
    description: 'Weekly meals tailored to your household.',
    detail:
      'Custom meal plans built around your dietary needs, preferences, and schedule. Delivered fresh or portioned for the week.',
    icon: '🥗',
  },
  {
    label: 'Weddings',
    value: 'wedding',
    description: 'Your day, your menu, your chef.',
    detail:
      'Tasting menus, rehearsal dinners, reception service. A dedicated chef who works with your vision from planning through the last plate.',
    icon: '💒',
  },
  {
    label: 'Corporate Dining',
    value: 'corporate',
    description: 'Team lunches, retreats, and client events.',
    detail:
      'Elevate workplace meals and corporate hospitality. From recurring office lunches to executive dining and team-building experiences.',
    icon: '🏢',
  },
  {
    label: 'Cooking Classes',
    value: 'cooking_class',
    description: 'Hands-on sessions with a professional.',
    detail:
      'Private or group classes in your kitchen or a rented space. Learn techniques, cuisines, and recipes from working chefs.',
    icon: '👨‍🍳',
  },
]

export default function ServicesPage() {
  return (
    <main>
      <section className="mx-auto w-full max-w-5xl px-4 pt-20 pb-8 text-center sm:px-6 md:pt-28 md:pb-12 lg:px-8">
        <h1 className="text-4xl font-display tracking-tight text-white md:text-5xl">
          Chef services for <span className="text-gradient">every occasion.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-300">
          Whether you need a private dinner for two or catering for two hundred, find a vetted chef
          who specializes in exactly what you are looking for.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 md:pb-24 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/chefs?serviceType=${cat.value}`}
              className="group flex flex-col rounded-2xl border border-stone-700/60 bg-stone-900/50 p-6 transition-all hover:border-brand-600/50 hover:bg-stone-800/60 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="text-4xl" role="img" aria-label={cat.label}>
                {cat.icon}
              </span>
              <h2 className="mt-4 text-lg font-semibold text-stone-100 group-hover:text-white">
                {cat.label}
              </h2>
              <p className="mt-1 text-sm text-stone-400">{cat.description}</p>
              <p className="mt-3 text-xs leading-relaxed text-stone-500">{cat.detail}</p>
              <span className="mt-auto pt-4 text-sm font-medium text-brand-400 group-hover:text-brand-300">
                Browse chefs &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-stone-100 md:text-3xl tracking-tight">
            Not sure what you need?
          </h2>
          <p className="mt-4 max-w-xl text-base text-stone-400 leading-relaxed">
            Tell us about your event and we will match you with the right chef.
          </p>
          <Link
            href="/book"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl gradient-accent px-6 text-sm font-semibold text-white glow-hover shadow-lg"
          >
            Book a Private Chef
          </Link>
        </div>
      </section>
    </main>
  )
}
