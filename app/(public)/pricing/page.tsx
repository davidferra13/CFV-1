import {
  ArrowRight,
  CheckCircle2,
  MinusCircle,
  ShieldCheck,
  Sparkles,
  XCircle,
} from '@/components/ui/icons'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE } from '@/lib/marketing/launch-mode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FUNCTION_BUCKETS,
  PRICING_COMPARISON_SECTIONS,
  PRICING_FAQS,
  PRICING_PLANS,
  PRO_FEATURE_AREAS,
  type ComparisonCell,
  type ComparisonCellState,
  type PricingPlanId,
} from '@/lib/billing/pricing-catalog'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'

const PLAN_COLUMNS: PricingPlanId[] = ['free', 'pro', 'scale']

const MARKETPLACE_FIT_POINTS = [
  {
    title: 'Keep the booking channel that already works',
    description:
      'ChefFlow is designed for chefs who still use marketplaces, referrals, and direct leads at the same time.',
  },
  {
    title: 'Pay for the layer the marketplace does not own',
    description:
      'Client memory, service ops, prep documents, follow-up, repeat-booking systems, and true margin visibility live in ChefFlow.',
  },
  {
    title: 'Grow beyond one booked dinner at a time',
    description:
      'Use ChefFlow to turn platform demand into an owned client base with better records, better follow-up, and better profit discipline.',
  },
]

function getCellTone(state: ComparisonCellState) {
  if (state === 'included') return 'text-green-400'
  if (state === 'limited') return 'text-amber-300'
  if (state === 'pilot') return 'text-brand-300'
  return 'text-muted-soft'
}

function ComparisonPill({ cell }: { cell: ComparisonCell }) {
  const iconClass = `h-4 w-4 shrink-0 ${getCellTone(cell.state)}`

  if (cell.state === 'included') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-stone-200">
        <CheckCircle2 className={iconClass} />
        {cell.note}
      </span>
    )
  }

  if (cell.state === 'limited') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-stone-200">
        <MinusCircle className={iconClass} />
        {cell.note}
      </span>
    )
  }

  if (cell.state === 'pilot') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-stone-200">
        <Sparkles className={iconClass} />
        {cell.note}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm text-stone-200">
      <XCircle className={iconClass} />
      {cell.note}
    </span>
  )
}

export default function PricingPage() {
  const isBeta = LAUNCH_MODE === 'beta'

  return (
    <div>
      <PublicPageView pageName="pricing" properties={{ section: 'public_growth' }} />
      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[780px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
        <div className="pointer-events-none absolute -right-16 top-8 h-[260px] w-[260px] rounded-full bg-brand-800/25 blur-[70px]" />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-700/80 bg-stone-900/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Built for Marketplace-Driven Private Chefs
            </p>
            <h1 className="mt-5 fluid-display-xl font-display tracking-tight text-stone-100">
              Pricing for chefs who want to own more than the marketplace does.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-300 md:text-lg">
              Start free to centralize the business layer around your existing booking channels.
              Upgrade when you want stronger automation, better follow-up, and deeper visibility
              into repeat business and margins.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-stone-400">
              ChefFlow is an independent platform built to complement your current booking channels.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/70 p-6 md:p-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-display text-stone-100 md:text-3xl">
              Why chefs pay for ChefFlow and still keep the marketplace
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-300 md:text-base">
              The marketplace can keep doing lead flow and booking mechanics. ChefFlow is where you
              keep the client, the process, and the economics of the business.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {MARKETPLACE_FIT_POINTS.map((point) => (
              <div
                key={point.title}
                className="rounded-xl border border-stone-700 bg-stone-900/80 p-5"
              >
                <h3 className="text-lg font-semibold text-stone-100">{point.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-5 lg:grid-cols-3">
          {PRICING_PLANS.map((plan, index) => (
            <Card
              key={plan.id}
              className={`animate-fade-slide-up overflow-hidden border ${
                plan.highlighted
                  ? 'border-brand-500 bg-gradient-to-b from-brand-950/60 to-stone-900'
                  : 'border-stone-700'
              }`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <CardHeader className="border-b border-stone-700/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-soft">
                      {plan.tag}
                    </p>
                    <CardTitle className="mt-1 text-2xl">{plan.name}</CardTitle>
                  </div>
                  {plan.badge && (
                    <span className="rounded-full border border-brand-600/70 bg-brand-950 px-2.5 py-1 text-xs font-semibold text-brand-200">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="mt-5 flex items-end gap-2">
                  <span className="text-4xl font-semibold text-stone-100">{plan.price}</span>
                  <span className="pb-1 text-sm text-muted-soft">{plan.cadence}</span>
                </p>
                <p className="mt-3 text-sm text-stone-300">{plan.summary}</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <ul className="space-y-2.5">
                  {plan.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-stone-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                      {point}
                    </li>
                  ))}
                </ul>
                <TrackedLink
                  href={
                    isBeta || plan.ctaHref === '/auth/signup'
                      ? buildMarketingSignupHref({
                          sourcePage: 'pricing',
                          sourceCta: `${plan.id}_plan`,
                        })
                      : plan.ctaHref
                  }
                  analyticsName={`pricing_plan_${plan.id}_cta`}
                  analyticsProps={{ section: 'pricing_plans' }}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'border border-stone-600 bg-stone-900 text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  {isBeta ? 'Join beta waitlist' : plan.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </TrackedLink>
                {plan.finePrint && <p className="text-xs text-muted-soft">{plan.finePrint}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-soft">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-300" />
          Trial and paid users both use the same product - no hidden feature branch.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-14 md:pb-20">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/70 p-6 md:p-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-display text-stone-100 md:text-3xl">
              How we organize platform functions
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-300 md:text-base">
              This model keeps tiering clear: Free for the core business layer every working chef
              needs, Pro for leverage and automation, Scale for rollout support when complexity
              grows past one operator.
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {FUNCTION_BUCKETS.map((bucket, index) => (
              <div
                key={bucket.id}
                className="animate-fade-slide-up rounded-xl border border-stone-700 bg-stone-900/80 p-5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <h3 className="text-lg font-semibold text-stone-100">{bucket.label}</h3>
                <p className="mt-2 text-xs uppercase tracking-[0.08em] text-brand-300">
                  Placement rule
                </p>
                <p className="mt-1.5 text-sm text-stone-300">{bucket.rule}</p>
                <ul className="mt-4 space-y-2">
                  {bucket.items.map((item) => (
                    <li key={item} className="text-sm text-stone-300">
                      - {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14 md:pb-20">
        <h2 className="text-center fluid-title-md font-display text-stone-100">
          Full feature comparison
        </h2>
        <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-relaxed text-stone-300 md:text-base">
          The matrix below is the source-of-truth view for what belongs in each tier today.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-700 bg-stone-900/70">
          <table className="min-w-[920px] w-full border-collapse">
            <thead>
              <tr className="border-b border-stone-700 bg-stone-900">
                <th className="px-5 py-4 text-left text-sm font-semibold text-stone-100">
                  Capability
                </th>
                {PLAN_COLUMNS.map((planId) => {
                  const plan = PRICING_PLANS.find((item) => item.id === planId)
                  return (
                    <th
                      key={planId}
                      className="px-5 py-4 text-left text-sm font-semibold text-stone-100"
                    >
                      {plan?.name}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {PRICING_COMPARISON_SECTIONS.map((section) => (
                <FragmentRows key={section.label} label={section.label}>
                  {section.rows.map((row) => (
                    <tr key={row.capability} className="border-b border-stone-800 align-top">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-stone-100">{row.capability}</p>
                        <p className="mt-1 text-xs text-muted-soft">{row.detail}</p>
                      </td>
                      {PLAN_COLUMNS.map((planId) => (
                        <td key={`${row.capability}-${planId}`} className="px-5 py-4">
                          <ComparisonPill cell={row.values[planId]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </FragmentRows>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14 md:pb-20">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/70 p-6 md:p-8">
          <h2 className="text-2xl font-display text-stone-100 md:text-3xl">
            Pro function map by domain
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-300 md:text-base">
            This is the current catalog of Pro domains, grouped so teams can quickly decide where
            new features should live.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {PRO_FEATURE_AREAS.map((area) => (
              <div
                key={area.label}
                className="rounded-xl border border-stone-700 bg-stone-900/80 p-4"
              >
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-300">
                  {area.label}
                </h3>
                <ul className="mt-3 space-y-2">
                  {area.features.map((feature) => (
                    <li key={feature} className="text-sm text-stone-300">
                      - {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14 md:pb-20">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/70 p-6 md:p-8">
          <h2 className="text-2xl font-display text-stone-100 md:text-3xl">Need verification?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-300 md:text-base">
            Review our trust materials and platform comparisons to see how ChefFlow fits beside
            marketplace-led booking workflows. We only publish verified customer testimonials.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <TrackedLink
              href="/trust"
              analyticsName="pricing_proof_trust"
              analyticsProps={{ section: 'pricing_proof' }}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Review trust center
            </TrackedLink>
            <TrackedLink
              href="/compare"
              analyticsName="pricing_proof_compare"
              analyticsProps={{ section: 'pricing_proof' }}
              className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              Compare alternatives
            </TrackedLink>
            <TrackedLink
              href="/contact"
              analyticsName="pricing_proof_contact"
              analyticsProps={{ section: 'pricing_proof' }}
              className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              Talk to us
            </TrackedLink>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14 md:pb-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-display text-stone-100 md:text-3xl">
            Common questions
          </h2>
          <div className="mt-6 space-y-3">
            {PRICING_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-stone-700 bg-stone-900/70 p-4"
              >
                <summary className="cursor-pointer list-none pr-4 text-sm font-semibold text-stone-100">
                  {faq.question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-stone-300">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="container mx-auto px-4 py-14 text-center md:py-20">
          <h2 className="fluid-display-lg font-display tracking-tight text-stone-100">
            Start by owning the business layer around the booking.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-300">
            Launch on Free, move to Pro when follow-up and automation become the bottleneck, and use
            Scale when your chef operation needs guided rollout support.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href={buildMarketingSignupHref({
                sourcePage: 'pricing',
                sourceCta: 'bottom_primary',
              })}
              analyticsName="pricing_bottom_start_free"
              analyticsProps={{ section: 'pricing_bottom_cta' }}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {isBeta ? 'Join beta waitlist' : 'Start Free'}
            </TrackedLink>
            <TrackedLink
              href="/contact"
              analyticsName="pricing_bottom_talk_to_sales"
              analyticsProps={{ section: 'pricing_bottom_cta' }}
              className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              Talk to Sales
            </TrackedLink>
          </div>
        </div>
      </section>
    </div>
  )
}

function FragmentRows({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="border-y border-stone-700 bg-stone-950/80">
        <th
          colSpan={4}
          className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-brand-300"
        >
          {label}
        </th>
      </tr>
      {children}
    </>
  )
}
