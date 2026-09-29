import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingMetadata } from '@/lib/site/public-site'

const marketingMetadata = buildMarketingMetadata({
  title: 'ChefFlow: Find and Hire a Private Chef',
  description:
    'Find private chefs for dinners, celebrations, meal prep, and more. Tell ChefFlow where and when, compare a short list, and book with confidence.',
  path: '/',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'Find and hire a private chef with ChefFlow',
})

export const metadata: Metadata = {
  ...marketingMetadata,
  keywords: ['private chef', 'hire a chef', 'private chef near me', 'chef marketplace'],
}

const heroField =
  'h-14 w-full border-0 bg-transparent px-4 text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#120b08] text-white">
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
          ChefFlow
        </p>
        <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Find your chef.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-stone-400">
          Private dinners, celebrations, weekly meal prep, and the people behind exceptional food.
        </p>

        <form
          action="/matches"
          method="get"
          className="mx-auto mt-10 grid max-w-4xl overflow-hidden rounded-2xl bg-white text-left shadow-2xl sm:grid-cols-[1.4fr_1fr_0.7fr_auto]"
        >
          <label className="border-b border-stone-200 sm:border-b-0 sm:border-r">
            <span className="sr-only">Location</span>
            <input name="location" required placeholder="Where?" className={heroField} />
          </label>
          <label className="border-b border-stone-200 sm:border-b-0 sm:border-r">
            <span className="sr-only">Date</span>
            <input name="date" type="date" required className={heroField} />
          </label>
          <label className="border-b border-stone-200 sm:border-b-0 sm:border-r">
            <span className="sr-only">Guests</span>
            <input
              name="guests"
              type="number"
              min={1}
              max={500}
              defaultValue={2}
              required
              aria-label="Guests"
              className={heroField}
            />
          </label>
          <button
            type="submit"
            className="bg-orange-600 px-7 py-4 text-sm font-semibold text-white transition hover:bg-orange-500 sm:py-0"
          >
            Find chefs
          </button>
        </form>

        <Link
          href="/find"
          className="mt-4 inline-flex text-sm font-medium text-stone-400 hover:text-white"
        >
          Tell us what you are craving →
        </Link>
      </section>
      <section className="border-y border-stone-800 bg-stone-950/50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold">
            Dinner to booked, without the search spiral.
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              [
                '1',
                'Tell us the dinner',
                'Where, when, guests, budget, dietary needs, and what sounds good.',
              ],
              [
                '2',
                'Compare a few chefs',
                'ChefFlow narrows the market instead of making you sort through dozens of profiles.',
              ],
              [
                '3',
                'Request and book',
                'Review the chef, receive a menu and price, ask questions, then confirm the dinner.',
              ],
            ].map(([step, title, body]) => (
              <div key={step}>
                <span className="text-sm font-bold text-orange-400">{step}</span>
                <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-stone-800 bg-stone-900 p-7 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-10">
          <div>
            <p className="text-sm font-semibold text-orange-400">For chefs</p>
            <h2 className="mt-2 text-2xl font-bold">Your business belongs here too.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-400">
              Run inquiries, clients, menus, proposals, events, payments, and your public chef
              presence from the same ChefFlow account.
            </p>
          </div>
          <Link
            href="/for-operators"
            className="mt-6 inline-flex shrink-0 rounded-xl border border-stone-700 px-5 py-3 text-sm font-semibold text-white transition hover:border-stone-500 sm:mt-0"
          >
            Chef tools
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-800 py-8 text-center text-xs text-stone-500">
        <div className="flex items-center justify-center gap-6">
          <Link href="/chefs" className="hover:text-stone-300">
            Chefs
          </Link>
          <Link href="/trust" className="hover:text-stone-300">
            Trust
          </Link>
          <Link href="/terms" className="hover:text-stone-300">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-stone-300">
            Privacy
          </Link>
        </div>
      </footer>
    </main>
  )
}
