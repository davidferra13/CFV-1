import type { Metadata } from 'next'
import Link from 'next/link'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Dinner Circles | ChefFlow',
  description:
    'Dinner Circles are the shared guest pages for a dinner event. Guests can join from an invite link, chat, coordinate, and keep event details in one place.',
  alternates: {
    canonical: `${BASE_URL}/hub`,
  },
  openGraph: {
    title: 'Dinner Circles | ChefFlow',
    description:
      'Shared dinner pages for guest coordination, updates, and event details before the meal.',
    url: `${BASE_URL}/hub`,
    type: 'website',
  },
}

const FEATURES = [
  {
    title: 'One shared place for the dinner',
    body: 'Guests can see updates, event notes, photos, and coordination details without digging through scattered texts.',
  },
  {
    title: 'Simple guest access',
    body: 'Dinner Circles open from the invite link or event share page. No chef account is required.',
  },
  {
    title: 'Built for real coordination',
    body: 'Use it for RSVP follow-up, timing updates, dietary notes, scheduling, and group communication before the table is set.',
  },
] as const

const ACCESS_PATHS = [
  'Open the Dinner Circle link a host, chef, or guest shares with you.',
  'Join from the event share page after you RSVP.',
  'Return later from the same invite link whenever you need the event details again.',
] as const

export default function DinnerCirclesLandingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-stone-800/70 bg-stone-900/60 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.25)] backdrop-blur sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
          Public Guest Access
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-display tracking-tight text-stone-100 md:text-5xl">
          Dinner Circles keep everyone on the same page before dinner.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
          ChefFlow Dinner Circles are the guest-facing pages for an event. They give guests a shared
          place to follow updates, coordinate, and stay connected without needing the chef portal.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/book"
            className="inline-flex items-center justify-center rounded-xl gradient-accent px-5 py-3 text-sm font-semibold text-white"
          >
            Book a Chef
          </Link>
          <Link
            href="/how-it-works"
            className="inline-flex items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-5 py-3 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
          >
            How It Works
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-stone-800/70 bg-stone-900/40 p-6"
          >
            <h2 className="text-lg font-semibold text-stone-100">{feature.title}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-400">{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-2xl border border-stone-800/70 bg-stone-900/40 p-6">
          <h2 className="text-xl font-semibold text-stone-100">How guests get in</h2>
          <div className="mt-4 space-y-3">
            {ACCESS_PATHS.map((item, index) => (
              <div key={item} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-950/60 text-xs font-semibold text-brand-300">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm leading-6 text-stone-300">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-brand-700/20 bg-brand-950/10 p-6">
          <h2 className="text-xl font-semibold text-stone-100">Need a link?</h2>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            Dinner Circles are event-specific. If you do not have an invite yet, ask your host or
            chef to share the event page or Dinner Circle link with you.
          </p>
          <p className="mt-4 text-sm leading-6 text-stone-400">
            Planning your own dinner? Start with ChefFlow and your chef can use Dinner Circles for
            guest coordination once the event is underway.
          </p>
          <Link
            href="/chefs"
            className="mt-6 inline-flex items-center justify-center rounded-xl border border-stone-700 px-4 py-2.5 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
          >
            Browse chefs
          </Link>
        </div>
      </section>
    </div>
  )
}
