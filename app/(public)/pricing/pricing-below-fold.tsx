'use client'

import { CheckCircle2, MinusCircle, Sparkles, XCircle } from '@/components/ui/icons'
import {
  PRICING_COMPARISON_SECTIONS,
  PRICING_PLANS,
  PRO_FEATURE_AREAS,
  PRICING_FAQS,
  type ComparisonCell,
  type ComparisonCellState,
  type PricingPlanId,
} from '@/lib/billing/pricing-catalog'

const PLAN_COLUMNS: PricingPlanId[] = ['free', 'pro', 'scale']

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

export function PricingComparisonTable() {
  return (
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
  )
}

export function ProFeatureMap() {
  return (
    <section className="container mx-auto px-4 pb-14 md:pb-20">
      <div className="rounded-2xl border border-stone-700 bg-stone-900/70 p-6 md:p-8">
        <h2 className="text-2xl font-display text-stone-100 md:text-3xl">
          Pro function map by domain
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-300 md:text-base">
          This is the current catalog of Pro domains, grouped so teams can quickly decide where new
          features should live.
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
  )
}

export function PricingFAQ() {
  return (
    <section className="container mx-auto px-4 pb-14 md:pb-20">
      <h2 className="text-center fluid-title-md font-display text-stone-100">
        Frequently asked questions
      </h2>
      <div className="mx-auto mt-8 max-w-3xl space-y-4">
        {PRICING_FAQS.map((faq) => (
          <details
            key={faq.question}
            className="rounded-xl border border-stone-700 bg-stone-900/80 p-4"
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-stone-100">
              {faq.question}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-stone-300">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
