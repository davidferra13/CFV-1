import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingMetadata } from '@/lib/site/public-site'

const marketingMetadata = buildMarketingMetadata({
  title: 'Hire a Private Chef Near You | ChefFlow',
  description:
    'Find private chefs for dinner parties, meal prep, catering, weddings, and special events. Share your date, location, and guest count, compare chef responses, and choose the right fit.',
  path: '/',
  imagePath: '/social/cheflow-home.png',
  imageAlt: 'ChefFlow private chef marketplace',
})

export const metadata: Metadata = {
  ...marketingMetadata,
  keywords: [
    'hire a private chef',
    'private chef near me',
    'private chef for dinner party',
    'personal chef near me',
    'book a private chef',
    'private dining at home',
  ],
}

const requestField =
  'h-14 w-full border-0 bg-transparent px-4 text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none'

const howItWorks = [
  {
    step: '01',
    title: 'Tell us about your event',
    body: 'Share the date, location, guest count, service style, dietary needs, and the kind of experience you want.',
  },
  {
    step: '02',
    title: 'Compare chef responses',
    body: 'Review matched chefs, proposed menus, pricing, profiles, and availability. Ask questions and request changes.',
  },
  {
    step: '03',
    title: 'Choose your chef + enjoy',
    body: 'Confirm the chef that feels right, finalize the details, and enjoy the experience at your table.',
  },
] as const

const occasions = [
  {
    title: 'date night',
    body: 'A restaurant-style dinner without leaving home.',
    href: '/book?service_type=dinner_party&occasion=Date+night',
  },
  {
    title: 'birthdays',
    body: 'A menu built around the person you are celebrating.',
    href: '/book?service_type=dinner_party&occasion=Birthday',
  },
  {
    title: 'dinner parties',
    body: 'Host your people while the chef handles the kitchen.',
    href: '/book?service_type=dinner_party&occasion=Dinner+party',
  },
  {
    title: 'family gatherings',
    body: 'Flexible private dining for mixed ages and preferences.',
    href: '/book?service_type=dinner_party&occasion=Family+gathering',
  },
  {
    title: 'meal prep',
    body: 'Recurring meals prepared around your household.',
    href: '/book?service_type=meal_prep&occasion=Meal+prep',
  },
  {
    title: 'weddings + celebrations',
    body: 'Chef-led food for meaningful days and larger gatherings.',
    href: '/book?service_type=wedding&occasion=Celebration',
  },
] as const

export default function Home() {
  return (
    <div className="min-h-screen bg-[#120b08] text-white">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(234,88,12,0.18),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.12),transparent_28%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
              private chefs for your table
            </p>
            <h1 className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Find the right chef for your next meal.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-stone-300 sm:text-xl">
              Tell ChefFlow where, when, and how many people you are feeding. Start one free
              request, hear from matched chefs, compare menus and pricing, and choose the experience
              that fits.
            </p>
          </div>

          <form
            action="/book"
            method="get"
            className="mx-auto mt-10 grid max-w-5xl overflow-hidden rounded-2xl bg-white text-left shadow-2xl ring-1 ring-white/10 md:grid-cols-[1.25fr_1fr_0.75fr_1fr_auto]"
          >
            <label className="border-b border-stone-200 md:border-b-0 md:border-r">
              <span className="block px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                location
              </span>
              <input
                name="location"
                required
                placeholder="City, state or ZIP"
                className={requestField}
              />
            </label>
            <label className="border-b border-stone-200 md:border-b-0 md:border-r">
              <span className="block px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                date
              </span>
              <input name="event_date" type="date" required className={requestField} />
            </label>
            <label className="border-b border-stone-200 md:border-b-0 md:border-r">
              <span className="block px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                guests
              </span>
              <input
                name="guest_count"
                type="number"
                min={1}
                max={500}
                defaultValue={2}
                required
                className={requestField}
              />
            </label>
            <label className="border-b border-stone-200 md:border-b-0 md:border-r">
              <span className="block px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                service
              </span>
              <select name="service_type" defaultValue="dinner_party" className={requestField}>
                <option value="dinner_party">Private dinner</option>
                <option value="meal_prep">Meal prep</option>
                <option value="catering">Catering</option>
                <option value="wedding">Wedding / celebration</option>
              </select>
            </label>
            <button
              type="submit"
              className="bg-orange-600 px-7 py-5 text-sm font-semibold text-white transition hover:bg-orange-500 md:py-0"
            >
              Start request
            </button>
          </form>

          <div className="mx-auto mt-5 flex max-w-4xl flex-col items-center justify-center gap-3 text-sm text-stone-400 sm:flex-row">
            <span>Free to submit</span>
            <span className="hidden text-stone-700 sm:inline">•</span>
            <span>No obligation</span>
            <span className="hidden text-stone-700 sm:inline">•</span>
            <Link
              href="/chefs"
              className="font-semibold text-white transition hover:text-orange-300"
            >
              Prefer to browse chefs first? View profiles →
            </Link>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-3 sm:grid-cols-3">
            {[
              ['custom menus', 'See menus and pricing shaped around your event.'],
              ['direct conversation', 'Ask questions and customize details with the chef.'],
              ['you stay in control', 'Compare the fit before you decide who to hire.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-stone-800 bg-stone-950/55 p-5">
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-stone-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="border-y border-stone-800 bg-stone-950/55">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">
              how it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              One request. A chef experience built around you.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {howItWorks.map((item) => (
              <article
                key={item.step}
                className="rounded-3xl border border-stone-800 bg-[#17100d] p-7"
              >
                <span className="text-sm font-bold text-orange-400">{item.step}</span>
                <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-400">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/book"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Start my chef request
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-orange-500/30 bg-orange-950/25 p-7 sm:p-9">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-orange-400">
              want chefs to come to you?
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Send one request.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-300">
              Give chefs the event details once. Matched chefs can respond with the menu, price, and
              availability they would offer for your specific occasion.
            </p>
            <Link
              href="/book"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Get matched with chefs
            </Link>
          </article>

          <article className="rounded-3xl border border-stone-800 bg-stone-900/55 p-7 sm:p-9">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-400">
              want to look around first?
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Browse chef profiles.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-300">
              Search ChefFlow by location, cuisine, service type, dietary needs, pricing, and
              availability. Open a profile when someone looks right.
            </p>
            <Link
              href="/chefs"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-600 px-6 py-3 text-sm font-semibold text-white transition hover:border-stone-400 hover:bg-stone-900"
            >
              Browse private chefs
            </Link>
          </article>
        </div>
      </section>
      <section className="border-y border-stone-800 bg-stone-950/55">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">
              made for real occasions
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Your meal does not have to fit a preset package.
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-400">
              Start with the occasion and let the chef shape the menu, service style, and details
              around your group.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {occasions.map((occasion) => (
              <Link
                key={occasion.title}
                href={occasion.href}
                className="group rounded-2xl border border-stone-800 bg-[#17100d] p-6 transition hover:-translate-y-0.5 hover:border-orange-500/50"
              >
                <h3 className="text-lg font-semibold text-white group-hover:text-orange-300">
                  {occasion.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-400">{occasion.body}</p>
                <span className="mt-5 inline-flex text-sm font-semibold text-orange-400">
                  Start request →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 rounded-3xl border border-stone-800 bg-stone-900/60 p-7 lg:grid-cols-[1fr_0.9fr] lg:items-center sm:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">
              more than someone cooking
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Build the experience with your chef.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">
              Private-chef service can cover the pieces you agree on together—from menu planning and
              grocery sourcing to cooking, service, and kitchen cleanup. ChefFlow keeps the request
              and chef conversation connected so you know what is included before you book.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              'menu planning',
              'grocery sourcing',
              'in-home cooking',
              'table service',
              'dietary needs',
              'cleanup',
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-stone-700 bg-stone-950/60 px-4 py-4 font-medium text-stone-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="border-t border-stone-800 bg-stone-950/60">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tell us what you want to eat. We&apos;ll help you find who can cook it.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-400">
            Start with your date, location, and guest count. You can refine the menu and details
            with the chef before you commit.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/book"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Start request
            </Link>
            <Link
              href="/chefs"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-700 px-7 py-3 text-sm font-semibold text-white transition hover:border-stone-500"
            >
              Browse chefs
            </Link>
          </div>
          <p className="mt-10 text-sm text-stone-500">
            Are you a chef?{' '}
            <Link href="/for-operators" className="font-semibold text-stone-300 hover:text-white">
              Run your business on ChefFlow →
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
