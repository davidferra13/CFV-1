import type { Metadata } from 'next'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'

export const metadata: Metadata = {
  title: 'About ChefFlow | Built by a Chef, for Chefs',
  description:
    'ChefFlow was built by a working private chef who needed a better way to track clients, events, and money. This is the story behind it.',
}

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200 dark:border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[60px] hidden dark:block" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
          <h1 className="fluid-display-xl font-display tracking-tight text-stone-900 dark:text-stone-100">
            Built by a chef. For chefs.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[1.0625rem] leading-8 text-stone-600 dark:text-stone-300 md:text-lg">
            ChefFlow exists because no tool did what I needed. So I built one.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="space-y-6 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          <p>
            I spent 10 years in professional kitchens. Fine dining, private events, catering for
            clients who expected perfection. The cooking was never the hard part.
          </p>
          <p>
            The hard part was everything else: tracking who owed me what, remembering which client's
            kid had a tree nut allergy, following up after an event without it feeling forced,
            figuring out if I actually made money after groceries and gas. I used spreadsheets, text
            threads, notes apps, and a lot of memory. It worked until it didn't.
          </p>
          <p>
            I looked for software that handled this. What I found was restaurant POS systems (not
            what I do), generic CRMs (not built for food), and marketplace platforms that wanted to
            own my clients. Nothing was built for the way private and personal chefs actually work.
          </p>
          <p>
            So I built ChefFlow. It tracks your clients, your events, your money, and your
            follow-ups. It works alongside whatever booking channels you already use. It does not
            try to replace your marketplace or become another middleman. It is your back office.
          </p>
          <p className="text-stone-900 dark:text-stone-200 font-medium">
            Right now, 4 working private chefs use ChefFlow every day. It is in active development,
            shaped by their feedback and mine. If you are a private chef looking for something
            better than spreadsheets and memory, I would love to hear from you.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <TrackedLink
            href={PRIMARY_SIGNUP_HREF}
            analyticsName="about_signup"
            analyticsProps={{ section: 'about_story' }}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            {PRIMARY_SIGNUP_LABEL}
          </TrackedLink>
          <TrackedLink
            href="/contact"
            analyticsName="about_contact"
            analyticsProps={{ section: 'about_story' }}
            className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Talk to me
          </TrackedLink>
        </div>
      </section>

      {/* What ChefFlow is / isn't */}
      <section className="border-t border-stone-200 dark:border-stone-700/50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <h2 className="text-2xl font-display tracking-tight text-stone-900 dark:text-stone-100 md:text-3xl">
            What ChefFlow is (and is not)
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                ChefFlow is
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-stone-600 dark:text-stone-300">
                <li>Your back office for clients, events, and money</li>
                <li>A tool that works with your existing booking channels</li>
                <li>Built by someone who does this work</li>
                <li>Free to start, no card required</li>
              </ul>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                ChefFlow is not
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-stone-500 dark:text-stone-400">
                <li>A marketplace that takes a cut of your bookings</li>
                <li>A restaurant POS system</li>
                <li>A generic CRM with a food skin on it</li>
                <li>Built by people who have never worked in a kitchen</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
