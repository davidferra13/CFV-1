import type { Metadata } from 'next'
import Link from 'next/link'
import { PRIMARY_SIGNUP_HREF } from '@/lib/marketing/launch-mode'
import { buildMarketingMetadata } from '@/lib/site/public-site'

const marketingMetadata = buildMarketingMetadata({
  title: 'Private Chef Software | ChefFlow',
  description:
    'ChefFlow is the operating system for private chefs. Run inquiries, clients, menus, proposals, events, payments, costs, and your public chef presence from one place.',
  path: '/',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'ChefFlow private chef business software',
})

export const metadata: Metadata = {
  ...marketingMetadata,
  keywords: [
    'private chef software',
    'chef CRM',
    'private chef CRM',
    'chef business software',
    'private chef booking software',
    'chef management software',
  ],
}

const heroField =
  'h-14 w-full border-0 bg-transparent px-4 text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none'

const chefCapabilities = [
  {
    title: 'capture every inquiry',
    body: 'Bring new leads, request details, reply status, and next actions into one pipeline instead of losing them across inboxes and DMs.',
  },
  {
    title: 'know every client',
    body: 'Keep preferences, dietary needs, history, notes, documents, and repeat-service context attached to the relationship.',
  },
  {
    title: 'build menus + proposals',
    body: 'Move from request to menu, quote, proposal, and confirmation without rebuilding the same information in separate tools.',
  },
  {
    title: 'run every event',
    body: 'Keep planning, recipes, prep, service details, documents, and event status connected from booking through follow-up.',
  },
  {
    title: 'see the money',
    body: 'Track invoices, deposits, expenses, payouts, event-level costs, and profit from the same workspace that runs the job.',
  },
  {
    title: 'grow your public presence',
    body: 'Use your ChefFlow profile, inquiry paths, and marketplace presence to turn discovery into an owned client relationship.',
  },
] as const

const workflowSteps = [
  ['01', 'inquiry', 'A client request becomes a real record with the details you need.'],
  ['02', 'proposal', 'Menu, pricing, documents, and next actions stay connected.'],
  ['03', 'service', 'Plan and execute the event from one operating record.'],
  ['04', 'paid + retained', 'Close out the money, follow up, and keep the relationship.'],
] as const

export default function Home() {
  return (
    <main className="min-h-screen bg-[#120b08] text-white">
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
            private chef business software
          </p>
          <h1 className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Run your private chef business from one place.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-stone-300 sm:text-xl">
            ChefFlow is the operating system for private chefs. Inquiries, clients, menus,
            proposals, events, payments, costs, and your public presence stay connected instead of
            living across spreadsheets, inboxes, and disconnected apps.
          </p>

          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href={PRIMARY_SIGNUP_HREF}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Start free as a chef
            </Link>
            <Link
              href="/for-operators"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-950/40 px-7 py-3 text-sm font-semibold text-stone-100 transition hover:border-stone-500 hover:bg-stone-900"
            >
              See the chef workspace
            </Link>
          </div>

          <Link
            href="/find"
            className="mt-5 inline-flex text-sm font-medium text-stone-400 transition hover:text-white"
          >
            Looking to hire a chef? Find one on ChefFlow →
          </Link>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 text-left sm:grid-cols-4">
          {['private chefs', 'caterers', 'meal prep chefs', 'small culinary teams'].map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-stone-800 bg-stone-950/50 px-4 py-4 text-sm font-medium text-stone-300"
            >
              {label}
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-800 bg-stone-950/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">
              your business, connected
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything between “new inquiry” and “paid client.”
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-400">
              ChefFlow is built around the actual private-chef workflow, so daily work stays in one
              system instead of being copied between generic tools.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chefCapabilities.map((capability) => (
              <article
                key={capability.title}
                className="rounded-2xl border border-stone-800 bg-[#17100d] p-6"
              >
                <h3 className="text-lg font-semibold text-white">{capability.title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-400">{capability.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="rounded-3xl border border-stone-800 bg-stone-900/60 p-7 sm:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">
              one operating flow
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Lead to paid, without the handoffs.</h2>
          </div>

          <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map(([step, title, body]) => (
              <div key={step}>
                <span className="text-sm font-bold text-orange-400">{step}</span>
                <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-400">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href={PRIMARY_SIGNUP_HREF}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Start running your business in ChefFlow
            </Link>
            <Link
              href="/for-operators"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-stone-500"
            >
              Explore the full chef workflow
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-stone-800 bg-stone-950/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">
                marketplace attached
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Need a chef instead?</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-stone-400">
                ChefFlow also helps guests discover and request private chefs. The marketplace brings
                work into the same system chefs use to run the business.
              </p>
              <Link
                href="/find"
                className="mt-5 inline-flex text-sm font-semibold text-white transition hover:text-orange-300"
              >
                Browse chefs →
              </Link>
            </div>

            <form
              action="/matches"
              method="get"
              className="grid overflow-hidden rounded-2xl bg-white text-left shadow-2xl sm:grid-cols-[1.4fr_1fr_0.7fr_auto]"
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
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">
          built for the person doing the work
        </p>
        <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          Your chef business should not live in your inbox.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-400">
          Put the client relationship, the event, and the money in one place. Start with one live
          workflow and keep the tools you no longer need out of the way.
        </p>
        <Link
          href={PRIMARY_SIGNUP_HREF}
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
        >
          Start free as a chef
        </Link>
      </section>

      <footer className="border-t border-stone-800 py-8 text-center text-xs text-stone-500">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Link href="/for-operators" className="hover:text-stone-300">
            For chefs
          </Link>
          <Link href="/chefs" className="hover:text-stone-300">
            Find a chef
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
