import type { Metadata } from 'next'
import Image from 'next/image'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { SectionViewTracker } from '@/components/analytics/section-view-tracker'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { PUBLIC_MARKET_POSITIONING_COPY } from '@/lib/public/public-market-copy'
import {
  PUBLIC_MARKET_SCOPE,
  buildMarketingMetadata,
  getFounderProfile,
} from '@/lib/site/public-site'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'About ChefFlow',
  description:
    'ChefFlow was built by David Ferragamo, a working private-chef operator who needed software that actually fit the job.',
  path: '/about',
  imagePath: '/social/chefflow-operators.png',
  imageAlt: 'ChefFlow founder and operator workflow preview',
})

const TRUST_STANDARDS = [
  {
    title: 'Founder-built from live operator work',
    detail:
      'ChefFlow was shaped inside real private-chef workflows instead of being reverse-engineered from a generic marketplace template.',
  },
  {
    title: 'National brand, honest availability',
    detail: PUBLIC_MARKET_POSITIONING_COPY,
  },
  {
    title: 'Direct support path',
    detail:
      'The support lane is explicit and founder-visible, with a public contact address and one-business-day response expectation.',
  },
  {
    title: 'Platform standards stated publicly',
    detail:
      'Booking expectations, trust posture, and operator proof are surfaced on public pages instead of hidden behind a sales call.',
  },
]

export default async function AboutPage() {
  const founder = await getFounderProfile()

  return (
    <main>
      <PublicPageView
        pageName="about"
        properties={{ section: 'public_growth', market_scope: PUBLIC_MARKET_SCOPE }}
      />

      <section className="mx-auto w-full max-w-6xl px-4 pt-20 pb-10 sm:px-6 md:pt-28 md:pb-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              About ChefFlow
            </p>
            <h1 className="mt-4 text-3xl font-display tracking-tight text-white md:text-5xl">
              Built by a working operator who needed the software himself.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-stone-300 md:text-lg">
              {founder.fullName} built ChefFlow after years of running private-chef work with
              recipes in his head, receipts in piles, client dietary notes across text threads, and
              no clean way to connect pricing, deposits, prep, service, and finance.
            </p>
            <p className="mt-4 text-base leading-relaxed text-stone-300 md:text-lg">
              Restaurant POS software was built for dining rooms. Generic CRMs had no idea what a
              menu revision, food cost, or deposit-backed proposal was. Spreadsheets worked until
              the operator workload got real.
            </p>
            <p className="mt-4 text-base leading-relaxed text-stone-300 md:text-lg">
              ChefFlow exists because the job required a system that could handle inquiry intake,
              costing, proposals, payments, and post-event follow-through without forcing the work
              into six separate tools.
            </p>
            <p className="mt-4 text-base leading-relaxed text-stone-300 md:text-lg">
              Core operator workflows are free today. The pricing page also explains the current
              voluntary supporter contribution and the larger future paid surface still classified
              in code on the{' '}
              <TrackedLink
                href="/pricing"
                analyticsName="about_pricing_source"
                analyticsProps={{ section: 'intro' }}
                className="font-medium text-brand-400 transition-colors hover:text-brand-300"
              >
                pricing page
              </TrackedLink>{' '}
              so the public pricing story stays explicit.
            </p>
          </div>

          <aside className="rounded-[1.75rem] border border-stone-800/60 bg-stone-900/50 p-6">
            <div className="flex items-center gap-4">
              {founder.headshotUrl ? (
                <Image
                  src={founder.headshotUrl}
                  alt={founder.fullName}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-2xl object-cover ring-1 ring-stone-700"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-stone-800 text-2xl font-semibold text-stone-300">
                  {founder.fullName.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-stone-100">{founder.fullName}</p>
                <p className="mt-1 text-sm text-brand-300">{founder.role}</p>
                <p className="mt-2 text-sm text-stone-400">{founder.location}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4 border-t border-stone-800 pt-6 text-sm text-stone-300">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Founder background</p>
                <p className="mt-2 leading-relaxed text-stone-300">{founder.bio}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Support</p>
                <a
                  href={`mailto:${founder.supportEmail}`}
                  className="mt-2 inline-flex text-sm font-medium text-brand-400 transition-colors hover:text-brand-300"
                >
                  {founder.supportEmail}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <p className="text-xs uppercase tracking-wide text-stone-500">Founder</p>
              <p className="mt-2 text-base font-semibold text-stone-100">{founder.fullName}</p>
              <p className="mt-1 text-sm text-stone-400">{founder.role}</p>
            </div>
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <p className="text-xs uppercase tracking-wide text-stone-500">Company location</p>
              <p className="mt-2 text-base font-semibold text-stone-100">{founder.location}</p>
              <p className="mt-1 text-sm text-stone-400">
                Founder location does not limit ChefFlow&apos;s U.S. coverage.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <p className="text-xs uppercase tracking-wide text-stone-500">Support email</p>
              <a
                href={`mailto:${founder.supportEmail}`}
                className="mt-2 inline-flex text-base font-semibold text-brand-400 transition-colors hover:text-brand-300"
              >
                {founder.supportEmail}
              </a>
              <p className="mt-1 text-sm text-stone-400">Typical response target is one business day.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/40 bg-stone-950/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <SectionViewTracker moduleName="why_trust_chefflow" pageName="about" />
          <h2 className="text-xl font-semibold text-stone-100 md:text-2xl">Why trust ChefFlow</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-400">
            The product credibility comes from founder background plus clear operating standards, not
            from vague promises about future scale.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {TRUST_STANDARDS.map((standard) => (
              <article
                key={standard.title}
                className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-6"
              >
                <h3 className="text-base font-semibold text-stone-100">{standard.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{standard.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-14 text-center sm:px-6 md:py-18 lg:px-8">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <TrackedLink
              href="/chefs"
              analyticsName="about_browse_chefs"
              analyticsProps={{ section: 'final_cta' }}
              className="inline-flex h-12 items-center justify-center rounded-xl gradient-accent px-6 text-sm font-semibold text-white glow-hover shadow-lg"
            >
              Browse Chefs
            </TrackedLink>
            <TrackedLink
              href="/for-operators"
              analyticsName="about_operator_link"
              analyticsProps={{ section: 'final_cta' }}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/60 px-6 text-sm font-medium text-stone-300 transition-all hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
            >
              For Operators
            </TrackedLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-6 lg:px-8">
        <PublicSecondaryEntryCluster links={PUBLIC_SECONDARY_ENTRY_CONFIG.about} theme="dark" />
      </section>
    </main>
  )
}
