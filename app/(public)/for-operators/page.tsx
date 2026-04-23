import type { Metadata } from 'next'
import Image from 'next/image'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { SectionViewTracker } from '@/components/analytics/section-view-tracker'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { TrackedVideo } from '@/components/analytics/tracked-video'
import { ClipboardList, LayoutDashboard, Repeat, ShieldCheck, Users } from '@/components/ui/icons'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { getFreeFeatures } from '@/lib/billing/feature-classification'
import { PRO_PRICE_MONTHLY } from '@/lib/billing/constants'
import { LAUNCH_MODE } from '@/lib/marketing/launch-mode'
import { buildMarketingSourceHref, readMarketingSourceFromSearchParams } from '@/lib/marketing/source-links'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'
import { buildOperatorWalkthroughHref } from '@/lib/marketing/walkthrough-links'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { PUBLIC_MARKET_POSITIONING_COPY } from '@/lib/public/public-market-copy'
import { PUBLIC_MARKET_SCOPE, buildMarketingMetadata } from '@/lib/site/public-site'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'For Operators - ChefFlow for Private Chefs, Caterers, and Meal Prep',
  description:
    'ChefFlow is the operator workspace for private chefs, caterers, and meal prep businesses. Run inquiries, events, menus, payments, and finance in one system, then review real screens and a real demo.',
  path: '/for-operators',
  imagePath: '/social/chefflow-operators.png',
  imageAlt: 'ChefFlow operator workflow preview',
})

const FREE_OPERATOR_FEATURE_COUNT = getFreeFeatures().length

const HERO_PROOF_ITEMS = [
  {
    title: '64-second demo',
    detail: 'Watch the operator workflow before you commit.',
  },
  {
    title: 'Real workspace screens',
    detail: 'Dashboard, inquiry, event, and finance screens are shown on this page.',
  },
  {
    title: 'Founder-reviewed walkthrough',
    detail: 'Qualified operators can request a live review against their current workflow.',
  },
] as const

const OPERATOR_FIT_CARDS = [
  {
    icon: Users,
    title: 'Private chefs',
    detail:
      'Run direct inquiries, repeat households, quotes, and client memory from one operator workspace.',
  },
  {
    icon: ClipboardList,
    title: 'Caterers and small teams',
    detail:
      'Keep events, menus, prep, documents, staffing, and service details attached to the same record.',
  },
  {
    icon: Repeat,
    title: 'Meal prep and recurring service',
    detail:
      'Track repeat clients, weekly menu context, payments, and follow-through without rebuilding the workflow every week.',
  },
] as const

const OPERATOR_SCREEN_CARDS = [
  {
    src: '/proof/operator-dashboard.png',
    title: 'Operator dashboard',
    detail:
      'The workspace home shows open inquiries, events, finance, and command-center surfaces from one starting point.',
    width: 1280,
    height: 800,
  },
  {
    src: '/proof/operator-inquiries.png',
    title: 'Inquiry pipeline',
    detail:
      'Track new leads, reply status, and next follow-up without pushing the work back into inbox threads.',
    width: 1440,
    height: 900,
  },
  {
    src: '/proof/operator-events.png',
    title: 'Event operations',
    detail:
      'Move from planning and quotes into proposals, feedback, and post-event review in the same system.',
    width: 1440,
    height: 900,
  },
  {
    src: '/proof/operator-financials.png',
    title: 'Finance hub',
    detail:
      'Invoices, expenses, monthly profit, and event-level breakdown live inside the operator workflow.',
    width: 1440,
    height: 2246,
  },
] as const

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Capture the request',
    detail:
      'Use the public form, website widget, or direct intake to collect date, guest count, location, and budget early.',
  },
  {
    step: '02',
    title: 'Convert it into an event',
    detail:
      'Keep client details, quote context, lifecycle stage, and next actions on the same operator record.',
  },
  {
    step: '03',
    title: 'Run the work with context',
    detail:
      'Menus, recipes, prep details, documents, and service notes stay attached instead of scattering across tools.',
  },
  {
    step: '04',
    title: 'Close out with money attached',
    detail:
      'Record payments, expenses, and event-level finance in the same system you used to deliver the service.',
  },
] as const

const ENTRY_PROOF_CARDS = [
  {
    src: '/proof/public-booking.png',
    title: 'Public request form',
    detail:
      'The live intake flow collects service type, occasion, date, serve time, location, guest count, and budget before preference details.',
    width: 1440,
    height: 900,
  },
  {
    src: '/proof/operator-website-widget.png',
    title: 'Website widget',
    detail:
      'Operators can embed ChefFlow on Wix, Squarespace, WordPress, or custom sites and route submissions into the workspace.',
    width: 1440,
    height: 900,
  },
  {
    src: '/proof/operator-costing-flow.png',
    title: 'Inquiry record with next actions',
    detail:
      'One inquiry view can show missing details, quote readiness, and the next action to move the booking forward.',
    width: 1280,
    height: 720,
  },
] as const

const EVENT_RECORD_PROOF = [
  'Lifecycle is visible from Inquiry through Retention on the same event.',
  'Client details, guest count, location, notes, payment state, and food-cost budget all sit on the record itself.',
  'Quoted amount, deposit target, amount paid, and balance due stay visible without a separate spreadsheet.',
] as const

const FINANCE_PROOF = [
  'The finance hub exposes invoices, deposits, expenses, payouts, P&L, ledger, and cash flow in one surface.',
  'Monthly overview and per-event breakdown stay inside the same operator workflow.',
  'Ledger filters and CSV export are visible without turning finance into an export-only report.',
] as const

const TRUTH_BASED_CARDS = [
  {
    title: 'Current pricing state',
    detail: `${FREE_OPERATOR_FEATURE_COUNT} features are currently classified as free. The public $${PRO_PRICE_MONTHLY}/month charge is currently a voluntary supporter contribution, while larger automation, intelligence, and scale workflows remain the future paid surface.`,
    href: '/pricing',
    cta: 'View pricing',
    analyticsName: 'operators_pricing_source',
  },
  {
    title: 'Proof standard',
    detail:
      'This page uses real screens, a real demo, and current product language. ChefFlow does not publish invented testimonials, fake metrics, or unsupported outcome claims.',
    href: '/customers',
    cta: 'View customer story status',
    analyticsName: 'operators_customer_stories_waitlist',
  },
  {
    title: 'Rollout and trust posture',
    detail: `ChefFlow remains founder-led and operator-first. ${PUBLIC_MARKET_POSITIONING_COPY}`,
    href: '/trust',
    cta: 'Review trust center',
    analyticsName: 'operators_trust_source',
  },
] as const

const NEXT_STEP_CARDS = [
  {
    eyebrow: 'Recommended',
    title: 'Request operator walkthrough',
    detail:
      'Use the walkthrough when you want intake, event, staffing, or finance habits pressure-tested against the proof above.',
    hrefBuilder: () =>
      buildOperatorWalkthroughHref({
        sourcePage: 'for_operators',
        sourceCta: 'final_walkthrough',
      }),
    cta: 'Request operator walkthrough',
    analyticsName: 'operators_walkthrough',
    featured: true,
  },
  {
    eyebrow: 'Pricing',
    title: 'Check the current product state',
    detail:
      'Review what is free today, what is paid today, and which larger paid surfaces are still only classified or planned.',
    hrefBuilder: () => '/pricing',
    cta: 'See pricing',
    analyticsName: 'operators_final_pricing',
    featured: false,
  },
  {
    eyebrow: 'Self-serve',
    title: 'Start free when the fit is already clear',
    detail:
      'If the proof already answers the question, go straight into ChefFlow and pilot one live workflow.',
    hrefBuilder: () =>
      buildMarketingSignupHref({
        sourcePage: 'for_operators',
        sourceCta: 'final_operator_signup',
      }),
    cta: LAUNCH_MODE === 'beta' ? 'Request operator access' : 'Start free in ChefFlow',
    analyticsName: 'operators_final_signup',
    featured: false,
  },
] as const

const OPERATOR_ENTRY_PATHS = [
  {
    eyebrow: 'Marketplace-led',
    title: 'Already booking through marketplaces or referrals?',
    detail:
      'Start with the marketplace-chef path when discovery already happens elsewhere and you need the owned system behind the booking.',
    hrefBuilder: () =>
      buildMarketingSourceHref({
        pathname: '/marketplace-chefs',
        sourcePage: 'for_operators',
        sourceCta: 'segment_marketplace',
      }),
    cta: 'Marketplace chef path',
    analyticsName: 'operators_segment_marketplace',
  },
  {
    eyebrow: 'Switch decision',
    title: 'Replacing spreadsheets or a general CRM stack?',
    detail:
      'Use the compare hub when the real work is judging migration friction, workflow fit, and which stack you are moving away from.',
    hrefBuilder: () =>
      buildMarketingSourceHref({
        pathname: '/compare',
        sourcePage: 'for_operators',
        sourceCta: 'segment_compare',
      }),
    cta: 'Compare your stack',
    analyticsName: 'operators_segment_compare',
  },
  {
    eyebrow: 'High intent',
    title: 'Need a founder review before you switch?',
    detail:
      'Use the walkthrough lane when you want the product mapped against your current handoffs, staffing, finance habits, and operational pressure.',
    hrefBuilder: () =>
      buildOperatorWalkthroughHref({
        sourcePage: 'for_operators',
        sourceCta: 'segment_walkthrough',
      }),
    cta: 'Request operator walkthrough',
    analyticsName: 'operators_segment_walkthrough',
  },
] as const

type ForOperatorsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ForOperatorsPage({ searchParams }: ForOperatorsPageProps) {
  const selfServeLabel =
    LAUNCH_MODE === 'beta' ? 'Request operator access' : 'Start free in ChefFlow'
  const marketingSource = readMarketingSourceFromSearchParams((await searchParams) ?? undefined)

  return (
    <main>
      <PublicPageView
        pageName="for_operators"
        properties={{
          section: 'public_growth',
          market_scope: PUBLIC_MARKET_SCOPE,
          ...(marketingSource.sourcePage ? { source_page: marketingSource.sourcePage } : {}),
          ...(marketingSource.sourceCta ? { source_cta: marketingSource.sourceCta } : {}),
        }}
      />

      <section className="relative overflow-hidden hero-glow">
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 md:pb-20 md:pt-24 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:items-start">
            <div>
              <p className="inline-flex rounded-full border border-brand-700/40 bg-brand-950/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                For chef-led operators
              </p>
              <h1 className="mt-6 max-w-4xl fluid-display-xl font-display tracking-tight text-stone-100">
                The operator workspace for private chefs, caterers, and meal prep businesses.
              </h1>
              <p className="mt-6 max-w-3xl text-[1.05rem] leading-8 text-stone-300 md:text-lg">
                ChefFlow keeps inquiries, events, menus, payments, and finance in one system so the
                business does not fall back to spreadsheet patchwork. It is built for independent
                and small culinary operators who need the work to stay attached after the lead
                arrives.
              </p>

              <ul className="mt-6 space-y-3 text-sm leading-7 text-stone-300 sm:text-base">
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-brand-300" />
                  <span>Chef-first operating system centered on the authenticated workspace.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-brand-300" />
                  <span>
                    Best for private chefs, caterers, meal prep operators, and similar small
                    culinary businesses.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-brand-300" />
                  <span>Real screens and a real demo, not concept mockups or invented proof.</span>
                </li>
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TrackedLink
                  href={buildOperatorWalkthroughHref({
                    sourcePage: 'for_operators',
                    sourceCta: 'hero_walkthrough_primary',
                  })}
                  analyticsName="operators_hero_walkthrough_primary"
                  analyticsProps={{ section: 'hero', market_scope: PUBLIC_MARKET_SCOPE }}
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl gradient-accent px-6 text-base font-semibold text-white glow-hover shadow-lg transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  Request operator walkthrough
                </TrackedLink>
                <TrackedLink
                  href="#operator-demo"
                  analyticsName="operators_hero_demo"
                  analyticsProps={{ section: 'hero' }}
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-stone-700 bg-stone-900/60 px-6 text-base font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
                >
                  Watch the 64-second demo
                </TrackedLink>
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400">
                Prefer to self-serve?{' '}
                <TrackedLink
                  href={buildMarketingSignupHref({
                    sourcePage: 'for_operators',
                    sourceCta: 'hero_operator_signup_inline',
                  })}
                  analyticsName="operators_hero_signup_inline"
                  analyticsProps={{ section: 'hero' }}
                  className="font-medium text-brand-400 transition-colors hover:text-brand-300"
                >
                  {selfServeLabel}
                </TrackedLink>
                . Already using ChefFlow?{' '}
                <TrackedLink
                  href="/auth/signin"
                  analyticsName="operators_signin"
                  analyticsProps={{ section: 'hero' }}
                  className="font-medium text-stone-300 transition-colors hover:text-stone-100"
                >
                  Sign in
                </TrackedLink>
                .
              </p>
            </div>

            <aside className="rounded-[2rem] border border-stone-800/60 bg-stone-900/50 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                    Real Product Proof
                  </p>
                  <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100">
                    Live operator workspace
                  </h2>
                </div>
                <span className="rounded-full border border-stone-700 bg-stone-950/70 px-3 py-1 text-xs font-medium text-stone-300">
                  Dashboard screen
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-stone-300">
                ChefFlow is centered on the authenticated operator workspace. The screen below is a
                current dashboard view, not a concept render.
              </p>

              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-stone-800/60 bg-stone-950/70">
                <Image
                  src="/proof/operator-dashboard.png"
                  alt="ChefFlow operator dashboard with inquiries, events, finance, and command center modules"
                  width={1280}
                  height={800}
                  className="h-auto w-full"
                  priority
                />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {HERO_PROOF_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-stone-800/60 bg-stone-950/60 p-4"
                  >
                    <p className="text-sm font-semibold text-stone-100">{item.title}</p>
                    <p className="mt-2 text-xs leading-6 text-stone-400">{item.detail}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
          <SectionViewTracker moduleName="operator_entry_paths" pageName="for_operators" />
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Specific Operator Frames
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-stone-100 md:text-4xl">
              Need a more specific frame than the default proof-to-walkthrough path?
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
              Most qualified operators should review the proof above, then use the walkthrough. The
              routes below stay useful when discovery already starts on marketplaces or the real
              question is stack comparison.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {OPERATOR_ENTRY_PATHS.map((path) => (
              <article
                key={path.analyticsName}
                className="rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40 p-6 shadow-[var(--shadow-card)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                  {path.eyebrow}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-stone-100">{path.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{path.detail}</p>
                <TrackedLink
                  href={path.hrefBuilder()}
                  analyticsName={path.analyticsName}
                  analyticsProps={{ section: 'operator_entry_paths' }}
                  className="mt-5 inline-flex items-center rounded-lg border border-stone-700 bg-stone-950/70 px-4 py-2.5 text-sm font-semibold text-stone-100 transition-colors hover:border-stone-600 hover:bg-stone-900"
                >
                  {path.cta}
                </TrackedLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-stone-800/40 bg-stone-950/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                Best Fit
              </p>
              <h2 className="mt-3 font-display text-3xl tracking-tight text-stone-100 md:text-4xl">
                Built for chef-led businesses that need the work to stay attached.
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
                ChefFlow is strongest when one business has to manage intake, client context, event
                execution, and money without rebuilding the record every time.
              </p>
            </div>
            <div className="rounded-2xl border border-brand-700/30 bg-brand-950/20 px-4 py-3 text-sm text-stone-300">
              Not a commission marketplace. Not a generic restaurant suite.
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {OPERATOR_FIT_CARDS.map((item) => {
              const Icon = item.icon

              return (
                <article
                  key={item.title}
                  className="rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40 p-6 shadow-[var(--shadow-card)]"
                >
                  <div className="inline-flex rounded-2xl bg-brand-950/60 p-3 text-brand-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-stone-100">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-300">{item.detail}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section
        id="operator-demo"
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8"
      >
        <SectionViewTracker moduleName="operator_proof_overview" pageName="for_operators" />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Product Proof
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-stone-100 md:text-4xl">
              See the operator system before you sign up.
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
              The proof starts with the core workspace, then moves into inquiry, event, and finance
              screens. Everything below is from the current product state.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-700 bg-stone-900/50 px-4 py-3 text-sm text-stone-300">
            Demo plus 4 live workspace screens
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40 p-4 sm:p-6">
          <TrackedVideo
            analyticsName="operator_product_demo"
            analyticsProps={{ page: 'for_operators' }}
            controls
            preload="metadata"
            playsInline
            poster="/social/chefflow-operators.png"
            className="w-full rounded-[1.25rem] border border-stone-800 bg-black"
          >
            <source src="/demo/operator-demo.mp4" type="video/mp4" />
          </TrackedVideo>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {OPERATOR_SCREEN_CARDS.map((card, index) => (
            <article
              key={card.src}
              className="overflow-hidden rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40"
            >
              <div className="relative">
                <Image
                  src={card.src}
                  alt={card.title}
                  width={card.width}
                  height={card.height}
                  className="h-auto w-full object-cover object-top"
                  priority={index === 0}
                />
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-black/20 bg-black/55 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-stone-100 backdrop-blur-sm">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Live screen
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <h3 className="text-base font-semibold text-stone-100">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{card.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-800/40 bg-stone-950/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <SectionViewTracker moduleName="operator_workflow_map" pageName="for_operators" />
          <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                Workflow Map
              </p>
              <h2 className="mt-3 font-display text-3xl tracking-tight text-stone-100 md:text-4xl">
                How a request becomes repeatable business.
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
                ChefFlow is not only for what the client sees. It is for what happens after the
                request lands and the operator has to quote, execute, and close out the work.
              </p>

              <ol className="mt-6 space-y-4">
                {WORKFLOW_STEPS.map((step) => (
                  <li
                    key={step.step}
                    className="rounded-[1.5rem] border border-stone-800/60 bg-stone-900/40 p-5"
                  >
                    <p className="text-sm font-semibold tracking-[0.12em] text-brand-300">
                      {step.step}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-stone-100">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-stone-300">{step.detail}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {ENTRY_PROOF_CARDS.map((card) => (
                <article
                  key={card.src}
                  className="overflow-hidden rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40"
                >
                  <Image
                    src={card.src}
                    alt={card.title}
                    width={card.width}
                    height={card.height}
                    className="h-auto w-full object-cover object-top"
                  />
                  <div className="p-5 sm:p-6">
                    <h3 className="text-base font-semibold text-stone-100">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-400">{card.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <SectionViewTracker moduleName="operator_deep_proof" pageName="for_operators" />
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Deeper Proof
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-stone-100 md:text-4xl">
              One record, not a patchwork.
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
              The event record and the finance hub are where the promise becomes real: the work
              stays attached from intake through reconciliation.
            </p>
          </div>

          <div className="mt-10 space-y-10">
            <article className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              <div className="overflow-hidden rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40">
                <div className="max-h-[900px] overflow-hidden">
                  <Image
                    src="/proof/operator-payment.png"
                    alt="Event record with lifecycle, client context, payment summary, and food cost budget"
                    width={1440}
                    height={8988}
                    className="h-auto w-full"
                  />
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40 p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                  Event Record Proof
                </p>
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-stone-100">
                  The event is already more than a calendar entry.
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-stone-400">
                  One real event record shows lifecycle, client context, payment state, and food
                  cost on the same object instead of scattering them across docs, inboxes, and
                  spreadsheets.
                </p>
                <ul className="mt-6 space-y-3 text-sm leading-relaxed text-stone-300">
                  {EVENT_RECORD_PROOF.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
              <div className="rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40 p-6 sm:p-8 lg:order-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                  Finance Proof
                </p>
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-stone-100">
                  Finance stays inside the operator workflow.
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-stone-400">
                  The finance screen shows the operator-side closeout path without sending the
                  business back into disconnected bookkeeping habits.
                </p>
                <ul className="mt-6 space-y-3 text-sm leading-relaxed text-stone-300">
                  {FINANCE_PROOF.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="overflow-hidden rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40 lg:order-2">
                <Image
                  src="/proof/operator-financials.png"
                  alt="Finance dashboard with monthly overview, per-event breakdown, and ledger controls"
                  width={1440}
                  height={2246}
                  className="h-auto w-full"
                />
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/40 bg-stone-950/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Truth-Based Evaluation
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-stone-100 md:text-4xl">
              Review the current product state without inflated claims.
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
              Pricing, proof standards, and trust posture stay visible so qualified operators can
              make the next decision with less guesswork.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {TRUTH_BASED_CARDS.map((card) => (
              <article
                key={card.title}
                className="rounded-[1.75rem] border border-stone-800/60 bg-stone-900/40 p-6 sm:p-8"
              >
                <h3 className="text-xl font-semibold text-stone-100">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-stone-400">{card.detail}</p>
                <TrackedLink
                  href={card.href}
                  analyticsName={card.analyticsName}
                  analyticsProps={{ section: 'truth_based_evaluation' }}
                  className="mt-5 inline-flex items-center rounded-lg border border-stone-700 bg-stone-950/70 px-4 py-2.5 text-sm font-semibold text-stone-100 transition-colors hover:border-stone-600 hover:bg-stone-900"
                >
                  {card.cta}
                </TrackedLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Next Step
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-stone-100 md:text-4xl">
              The default next step is the walkthrough once the proof is close.
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
              Most qualified operators should use the walkthrough after reviewing the demo, screens,
              pricing, and trust posture above. Pricing and self-serve signup stay here if the fit
              is already obvious.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {NEXT_STEP_CARDS.map((card) => (
              <article
                key={card.title}
                className={`rounded-[1.75rem] border p-6 ${
                  card.featured
                    ? 'border-brand-700/35 bg-brand-950/15 shadow-[var(--shadow-card)]'
                    : 'border-stone-800/60 bg-stone-900/40'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                  {card.eyebrow}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-stone-100">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{card.detail}</p>
                <TrackedLink
                  href={card.hrefBuilder()}
                  analyticsName={card.analyticsName}
                  analyticsProps={{ section: 'final_cta', market_scope: PUBLIC_MARKET_SCOPE }}
                  className={`mt-5 inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                    card.featured
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'border border-stone-700 bg-stone-950/70 text-stone-100 hover:border-stone-600 hover:bg-stone-900'
                  }`}
                >
                  {card.cta}
                </TrackedLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-6 lg:px-8">
        <PublicSecondaryEntryCluster
          links={PUBLIC_SECONDARY_ENTRY_CONFIG.for_operators}
          heading="Need a more specific operator route?"
          theme="dark"
        />
      </section>
    </main>
  )
}
