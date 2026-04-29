import type { Metadata } from 'next'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import {
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
  WebSiteJsonLd,
} from '@/components/seo/json-ld'
import { buildMarketingSourceHref } from '@/lib/marketing/source-links'
import { buildOperatorWalkthroughHref } from '@/lib/marketing/walkthrough-links'
import { buildMarketingMetadata } from '@/lib/site/public-site'
import { HomepageVisualStage } from './_components/homepage-visual-stage'
import { MobileBookingBar } from './_components/mobile-booking-bar'
import { OperatorProofStack } from './_components/operator-proof-stack'

export const revalidate = 60

const marketingMetadata = buildMarketingMetadata({
  title: 'ChefFlow | Find a Private Chef, Caterer, or Meal Prep Service Near You',
  description:
    'Search for private chefs, caterers, and meal prep professionals in your area. Browse profiles, compare services, and book directly. ChefFlow connects you with vetted food professionals.',
  path: '/',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'ChefFlow homepage preview',
})

export const metadata: Metadata = {
  ...marketingMetadata,
  keywords: [
    'hire private chef',
    'private chef near me',
    'book a private chef',
    'catering near me',
    'meal prep service',
    'personal chef for hire',
    'private chef software',
    'catering software',
  ],
}

export default function Home() {
  return (
    <main>
      <PublicPageView
        pageName="home"
        properties={{
          section: 'consumer_and_operator',
          entry_context: 'direct',
          primary_intent: 'consumer_search',
        }}
      />
      <OrganizationJsonLd />
      <SoftwareApplicationJsonLd />
      <WebSiteJsonLd />

      <HomepageVisualStage />

      <div className="py-6 sm:py-8">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-800/60 to-transparent" />
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Are you a chef-operator?
          </p>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-800/60 to-transparent" />
        </div>
      </div>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(237,168,107,0.06),_transparent_50%)]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-4 sm:px-6 sm:pb-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-center lg:gap-16 lg:px-8 lg:pb-24">
          <div className="animate-fade-slide-up">
            <span className="inline-flex rounded-full border border-brand-700/30 bg-brand-950/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300/80">
              ChefFlow for chef-led operators
            </span>
            <h2 className="mt-7 max-w-lg text-[2rem] font-display tracking-[-0.04em] leading-[1.12] text-white sm:text-4xl lg:text-[2.75rem]">
              Run private chef, catering, and meal prep work without spreadsheet patchwork.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 tracking-[-0.01em] text-stone-400">
              Inquiries, events, menus, payments, and finance in one operator workspace. Start with
              real product proof, then map it to your workflow.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <TrackedLink
                href={buildMarketingSourceHref({
                  pathname: '/for-operators',
                  sourcePage: 'home',
                  sourceCta: 'hero_operator_proof',
                })}
                analyticsName="home_hero_operator_proof"
                analyticsProps={{
                  section: 'operator',
                  destination: '/for-operators',
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-700/80 bg-stone-950/60 px-7 py-3 text-sm font-semibold tracking-[-0.01em] text-stone-200 transition-all duration-200 hover:border-stone-600 hover:bg-stone-900 hover:text-stone-100 active:scale-[0.98]"
              >
                See operator proof
              </TrackedLink>
              <TrackedLink
                href={buildOperatorWalkthroughHref({
                  sourcePage: 'home',
                  sourceCta: 'hero_operator_walkthrough',
                })}
                analyticsName="home_hero_operator_walkthrough"
                analyticsProps={{ section: 'operator' }}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-700/80 bg-stone-950/60 px-7 py-3 text-sm font-medium tracking-[-0.01em] text-stone-300 transition-all duration-200 hover:border-stone-600 hover:bg-stone-900 hover:text-stone-100"
              >
                Request walkthrough
              </TrackedLink>
            </div>
          </div>

          <OperatorProofStack />
        </div>
      </section>

      <MobileBookingBar />
    </main>
  )
}
