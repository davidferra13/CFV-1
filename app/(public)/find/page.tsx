import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingMetadata } from '@/lib/site/public-site'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Find a Private Chef',
  description:
    'Tell ChefFlow where, when, and what you want. We will show a short list of private chefs who fit the request.',
  path: '/find',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'Find a private chef with ChefFlow',
})

const fieldClass =
  'h-12 w-full rounded-xl border border-stone-700 bg-stone-950 px-4 text-sm text-stone-100 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'
const labelClass = 'mb-2 block text-sm font-medium text-stone-200'

export default function FindChefPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        <div className="mb-10 text-center">
          <Link href="/" className="text-sm font-semibold text-brand-600">
            ChefFlow
          </Link>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">Find your chef.</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-stone-400">
            Give us the essentials. ChefFlow will narrow the market to a small set of chefs who
            actually fit the dinner.
          </p>
        </div>

        <form
          action="/matches"
          method="get"
          className="rounded-3xl border border-stone-800 bg-stone-900/70 p-5 shadow-sm sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="find-location" className={labelClass}>
                Where is the dinner?
              </label>
              <input
                id="find-location"
                name="location"
                required
                placeholder="City, state or ZIP"
                autoComplete="postal-code"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="find-date" className={labelClass}>
                When?
              </label>
              <input id="find-date" name="date" type="date" required className={fieldClass} />
            </div>

            <div>
              <label htmlFor="find-guests" className={labelClass}>
                Guests
              </label>
              <input
                id="find-guests"
                name="guests"
                type="number"
                min={1}
                max={500}
                defaultValue={2}
                required
                className={fieldClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="find-craving" className={labelClass}>
                What sounds good?
              </label>
              <input
                id="find-craving"
                name="craving"
                placeholder="Italian, tasting menu, steak, seasonal New England..."
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="find-dietary" className={labelClass}>
                Dietary needs
              </label>
              <input
                id="find-dietary"
                name="dietary"
                placeholder="None, gluten-free, vegan..."
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="find-budget" className={labelClass}>
                Experience level
              </label>
              <select id="find-budget" name="budget" defaultValue="not-sure" className={fieldClass}>
                <option value="not-sure">Help me figure it out</option>
                <option value="casual">Casual home cooking</option>
                <option value="elevated">Elevated dining</option>
                <option value="fine-dining">Fine dining</option>
                <option value="luxury">Luxury / fully custom</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="mt-7 w-full rounded-xl bg-[var(--action-bg)] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[var(--action-hover)] active:scale-[0.99]"
          >
            Show my best chef matches
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-stone-500">
            No obligation. You decide whether to contact or book a chef.
          </p>
        </form>

        <div className="mt-8 flex items-center justify-center gap-5 text-sm text-stone-500">
          <Link href="/chefs" className="transition hover:text-stone-300">
            Browse all chefs
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/for-operators" className="transition hover:text-stone-300">
            I am a chef
          </Link>
        </div>
      </section>
    </main>
  )
}
