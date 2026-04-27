import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicChefProfile } from '@/lib/profile/actions'
import { PublicPartnerSignupForm } from '@/components/partners/public-partner-signup-form'
import { Button } from '@/components/ui/button'
import { buildMarketingMetadata } from '@/lib/site/public-site'

export const metadata: Metadata = {
  ...buildMarketingMetadata({
    title: 'Partner Signup - Shared Chef Partner Intake',
    description:
      'Public partner intake for venues, hosts, suppliers, concierges, and referral partners invited by a chef on ChefFlow.',
    path: '/partner-signup',
    imagePath: '/social/chefflow-operators.png',
    imageAlt: 'ChefFlow partner signup preview',
    openGraphTitle: 'ChefFlow Partner Signup',
  }),
  robots: 'noindex, nofollow',
}

type Props = {
  searchParams?: {
    chef?: string
  }
}

const ENTRY_STEPS = [
  {
    title: '1. Get the chef reference',
    body: 'This page works best when a chef shares their partner link directly or tells you their public profile name.',
  },
  {
    title: '2. Open the chef-specific form',
    body: 'Enter the chef slug below to load the correct partner intake. If the chef sent you a full link, it should already do this for you.',
  },
  {
    title: '3. Submit partner details',
    body: 'Share your business, venue, supplier, or referral details so the chef can review them inside ChefFlow.',
  },
] as const

const PARTNER_TYPES = [
  'Venue',
  'Airbnb host',
  'Hotel or concierge',
  'Supplier',
  'Referral partner',
] as const

export default async function PartnerSignupPage({ searchParams }: Props) {
  const chefSlug = (searchParams?.chef || '').trim().toLowerCase()
  const data = chefSlug ? await getPublicChefProfile(chefSlug) : null

  if (!chefSlug || !data) {
    return (
      <main className="min-h-screen bg-stone-950">
        <section className="relative overflow-hidden border-b border-stone-800/60">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-gradient-to-b from-brand-700/15 via-brand-700/5 to-transparent" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[90px]" />
          <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-20 text-center sm:px-6 md:pb-18 md:pt-24 lg:px-8">
            <p className="inline-flex rounded-full border border-brand-700/60 bg-stone-900/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Partner Intake
            </p>
            <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-display tracking-[-0.04em] text-stone-100 md:text-5xl">
              Register as a partner for a chef you already work with.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-stone-300 md:text-lg">
              This page is for venues, hosts, suppliers, concierges, and referral partners who are
              joining a specific chef&apos;s network on ChefFlow. It is not a general marketplace
              application or operator signup page.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {ENTRY_STEPS.map((step) => (
              <article
                key={step.title}
                className="rounded-2xl border border-stone-800/70 bg-stone-900/70 p-5 shadow-[var(--shadow-card)]"
              >
                <h2 className="text-base font-semibold text-stone-100">{step.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-stone-400">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-3xl border border-stone-800/70 bg-stone-900/70 p-6 shadow-[var(--shadow-card)] md:p-8">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-display tracking-[-0.04em] text-stone-100">
                  Enter the chef&apos;s profile name
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-stone-400">
                  Use the slug from the chef&apos;s public link, for example{' '}
                  <span className="font-medium text-stone-300">chef-name</span>.
                </p>
              </div>

              <form action="/partner-signup" method="get" className="mt-6 space-y-3">
                <label className="block">
                  <span className="text-xs text-stone-400">Chef profile name</span>
                  <input
                    type="text"
                    name="chef"
                    required
                    placeholder="chef-name"
                    className="mt-1 block w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <Button type="submit" className="w-full sm:w-auto">
                  Open chef partner form
                </Button>
              </form>

              {chefSlug && !data && (
                <div className="mt-5 rounded-2xl border border-red-900/40 bg-red-950/30 p-4">
                  <p className="text-sm leading-relaxed text-red-200">
                    No chef was found for &ldquo;{chefSlug}&rdquo;. Double-check the link your chef
                    shared with you.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <article className="rounded-2xl border border-stone-800/70 bg-stone-900/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                  This Page Is For
                </p>
                <ul className="mt-4 space-y-2 text-sm text-stone-300">
                  {PARTNER_TYPES.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-2xl border border-stone-800/70 bg-stone-900/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                  Looking For Something Else?
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <Link
                    href="/for-operators"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
                  >
                    Chef or operator signup
                  </Link>
                  <Link
                    href="/chefs"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
                  >
                    Browse chefs
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const primaryColor = data.chef.portal_primary_color || '#1c1917'
  const backgroundColor = data.chef.portal_background_color || '#fafaf9'
  const backgroundImageUrl = data.chef.portal_background_image_url
  const pageBackgroundStyle = backgroundImageUrl
    ? {
        backgroundColor,
        backgroundImage: `linear-gradient(to bottom, rgba(12,10,9,0.72), rgba(12,10,9,0.88)), url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed' as const,
      }
    : { backgroundColor: '#0c0a09' }

  return (
    <div className="min-h-screen" style={pageBackgroundStyle}>
      <div className="min-h-screen bg-stone-950/60">
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="rounded-[2rem] border border-stone-700/70 bg-stone-950/80 p-6 shadow-[var(--shadow-card)] md:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
              <div>
                <p className="inline-flex rounded-full border border-brand-700/60 bg-brand-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                  Partner Intake For {data.chef.display_name}
                </p>
                <h1 className="mt-5 text-3xl font-display tracking-[-0.04em] text-stone-100 md:text-4xl">
                  Submit your partner details to work with {data.chef.display_name}.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-300 md:text-base">
                  Use this form if you are a venue, host, supplier, concierge, or referral partner
                  connected to this chef. Your submission goes to {data.chef.display_name} inside
                  ChefFlow for review and follow-up.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/chef/${chefSlug}`}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/70 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
                  >
                    View chef profile
                  </Link>
                  <Link
                    href="/partner-signup"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/70 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
                  >
                    Change chef
                  </Link>
                </div>
              </div>

              <aside className="rounded-2xl border border-stone-700/70 bg-stone-900/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                  Before You Submit
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-stone-300">
                  <li>This does not create a ChefFlow login.</li>
                  <li>Your details are shared with {data.chef.display_name} for review.</li>
                  <li>Use the notes field for details the chef should know before outreach.</li>
                </ul>
              </aside>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <PublicPartnerSignupForm
              chefSlug={chefSlug}
              chefName={data.chef.display_name}
              primaryColor={primaryColor}
            />

            <aside className="space-y-4">
              <article className="rounded-2xl border border-stone-700/70 bg-stone-950/80 p-5 shadow-[var(--shadow-card)]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                  Good Fit
                </p>
                <p className="mt-3 text-sm leading-relaxed text-stone-300">
                  Use this if you already know {data.chef.display_name} and want to be listed or
                  tracked as a venue, host, supplier, or referral source.
                </p>
              </article>

              <article className="rounded-2xl border border-stone-700/70 bg-stone-950/80 p-5 shadow-[var(--shadow-card)]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                  Not Sure Yet
                </p>
                <p className="mt-3 text-sm leading-relaxed text-stone-300">
                  If you reached this page by accident, start on the chef profile first and confirm
                  that this is the chef you meant to contact.
                </p>
                <Link
                  href={`/chef/${chefSlug}`}
                  className="mt-4 inline-flex text-sm font-medium text-brand-300 transition-colors hover:text-brand-200"
                >
                  Back to {data.chef.display_name}
                </Link>
              </article>
            </aside>
          </div>
        </section>
      </div>
    </div>
  )
}
