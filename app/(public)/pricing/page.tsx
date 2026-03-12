import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MinusCircle,
  ShieldCheck,
  XCircle,
} from '@/components/ui/icons'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF } from '@/lib/marketing/launch-mode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PRICING_COMPARISON_SECTIONS,
  PRICING_FAQS,
  PRICING_PLANS,
  type ComparisonCell,
  type ComparisonCellState,
  type PricingPlanId,
} from '@/lib/billing/pricing-catalog'

const PLAN_COLUMNS: PricingPlanId[] = ['free', 'pro', 'scale']

function getCellTone(state: ComparisonCellState) {
  if (state === 'included') return 'text-green-600 dark:text-green-400'
  if (state === 'limited') return 'text-amber-600 dark:text-amber-300'
  if (state === 'pilot') return 'text-brand-600 dark:text-brand-300'
  return 'text-stone-400 dark:text-[var(--text-muted-soft)]'
}

function ComparisonPill({ cell }: { cell: ComparisonCell }) {
  const iconClass = `h-4 w-4 shrink-0 ${getCellTone(cell.state)}`

  const Icon =
    cell.state === 'included'
      ? CheckCircle2
      : cell.state === 'limited'
        ? MinusCircle
        : cell.state === 'pilot'
          ? Clock
          : XCircle

  return (
    <span className="inline-flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
      <Icon className={iconClass} />
      {cell.note}
    </span>
  )
}

export default function PricingPage() {
  const isBeta = LAUNCH_MODE === 'beta'
  const primaryActionLabel = isBeta ? 'Request access' : 'Get started'

  return (
    <div>
      <section className="relative overflow-hidden border-b border-stone-200 dark:border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[780px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px] hidden dark:block" />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="fluid-display-xl font-display tracking-tight text-stone-900 dark:text-stone-100">
              Plans that grow with your practice.
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-stone-600 dark:text-stone-300 md:text-lg">
              Start with the essential workflow. Upgrade when you want deeper automation, drafting,
              and support for a busier calendar.
            </p>
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
                  ? 'border-brand-500 bg-gradient-to-b from-brand-50/60 to-white dark:from-brand-950/60 dark:to-stone-900'
                  : 'border-stone-200 dark:border-stone-700'
              }`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <CardHeader className="border-b border-stone-200 dark:border-stone-700/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500 dark:text-[var(--text-muted-soft)]">
                      {plan.tag}
                    </p>
                    <CardTitle className="mt-1 text-2xl">{plan.name}</CardTitle>
                  </div>
                  {plan.badge && (
                    <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-600/70 dark:bg-brand-950 dark:text-brand-200">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="mt-5 flex items-end gap-2">
                  <span className="text-4xl font-semibold text-stone-900 dark:text-stone-100">
                    {plan.price}
                  </span>
                  <span className="pb-1 text-sm text-stone-500 dark:text-[var(--text-muted-soft)]">
                    {plan.cadence}
                  </span>
                </p>
                <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">{plan.summary}</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <ul className="space-y-2.5">
                  {plan.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                      {point}
                    </li>
                  ))}
                </ul>
                <TrackedLink
                  href={isBeta ? '/beta' : plan.ctaHref}
                  analyticsName={`pricing_plan_${plan.id}_cta`}
                  analyticsProps={{ section: 'pricing_plans' }}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'border border-stone-300 bg-white text-stone-900 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800'
                  }`}
                >
                  {isBeta ? 'Request beta access' : plan.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </TrackedLink>
                {plan.finePrint && (
                  <p className="text-xs text-stone-500 dark:text-[var(--text-muted-soft)]">
                    {plan.finePrint}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-stone-500 dark:text-[var(--text-muted-soft)]">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-300" />
          Start lean. Move up only when the workflow earns its keep.
        </p>
      </section>

      <section className="container mx-auto hidden px-4 pb-14 md:block md:pb-20">
        <h2 className="text-center text-2xl font-display text-stone-900 dark:text-stone-100 md:text-3xl">
          Full feature comparison
        </h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white/70 dark:border-stone-700 dark:bg-stone-900/70">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900">
                <th className="px-5 py-4 text-left text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Capability
                </th>
                {PLAN_COLUMNS.map((planId) => {
                  const plan = PRICING_PLANS.find((item) => item.id === planId)
                  return (
                    <th
                      key={planId}
                      className="px-5 py-4 text-left text-sm font-semibold text-stone-900 dark:text-stone-100"
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
                    <tr
                      key={row.capability}
                      className="border-b border-stone-100 align-top dark:border-stone-800"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                          {row.capability}
                        </p>
                        <p className="mt-1 text-xs text-stone-500 dark:text-[var(--text-muted-soft)]">
                          {row.detail}
                        </p>
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

      <section className="border-t border-stone-200 bg-stone-50/40 dark:border-stone-700/50 dark:bg-stone-900/40">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-display text-stone-900 dark:text-stone-100 md:text-3xl">
              Common questions
            </h2>
            <div className="mt-6 space-y-3">
              {PRICING_FAQS.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-xl border border-stone-200 bg-white/70 p-4 dark:border-stone-700 dark:bg-stone-900/70"
                >
                  <summary className="cursor-pointer list-none pr-4 text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {faq.question}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>

          <div className="mt-14 text-center">
            <h2 className="text-2xl font-display tracking-tight text-stone-900 dark:text-stone-100 md:text-3xl">
              {isBeta
                ? 'Choose the level of support you want from day one.'
                : 'Choose the plan that matches how you work right now.'}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              Talk directly with David if you want help deciding where to begin, what to migrate
              first, and when an upgrade actually makes sense.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <TrackedLink
                href={PRIMARY_SIGNUP_HREF}
                analyticsName="pricing_bottom_start_free"
                analyticsProps={{ section: 'pricing_bottom_cta' }}
                className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                {primaryActionLabel}
              </TrackedLink>
              <TrackedLink
                href="/contact"
                analyticsName="pricing_bottom_talk_to_sales"
                analyticsProps={{ section: 'pricing_bottom_cta' }}
                className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                Talk to David
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function FragmentRows({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="border-y border-stone-200 bg-stone-50/80 dark:border-stone-700 dark:bg-stone-950/80">
        <th
          colSpan={4}
          className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-brand-700 dark:text-brand-300"
        >
          {label}
        </th>
      </tr>
      {children}
    </>
  )
}
