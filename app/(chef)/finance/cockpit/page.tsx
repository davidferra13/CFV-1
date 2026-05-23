import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPrivateChefFinancialCockpit } from '@/lib/finance/private-chef-financial-cockpit-actions'
import {
  buildClientSafeQuoteFinancialSummary,
  type FinancialCockpitRiskState,
} from '@/lib/finance/private-chef-financial-cockpit-contract'
import { formatCurrency } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Financial Cockpit',
}

const STATE_STYLES: Record<FinancialCockpitRiskState, string> = {
  healthy: 'border-emerald-700 bg-emerald-950 text-emerald-200',
  watch: 'border-sky-700 bg-sky-950 text-sky-200',
  warning: 'border-amber-700 bg-amber-950 text-amber-200',
  critical: 'border-red-700 bg-red-950 text-red-200',
  blocked: 'border-red-700 bg-red-950 text-red-200',
  unknown: 'border-stone-700 bg-stone-900 text-stone-200',
}

function StateBadge({ state }: { state: FinancialCockpitRiskState }) {
  return (
    <span
      className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${STATE_STYLES[state]}`}
    >
      {state.replace('_', ' ')}
    </span>
  )
}

function MetricCard({
  label,
  value,
  state,
  detail,
}: {
  label: string
  value: string
  state: FinancialCockpitRiskState
  detail: string
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-stone-300">{label}</p>
          <StateBadge state={state} />
        </div>
        <p className="break-words text-2xl font-semibold text-stone-50">{value}</p>
        <p className="text-sm leading-5 text-stone-400">{detail}</p>
      </CardContent>
    </Card>
  )
}

function formatPercent(value: number | null): string {
  return value === null ? 'Unknown' : `${value.toFixed(1)}%`
}

export default async function FinancialCockpitPage() {
  const cockpit = await getPrivateChefFinancialCockpit()
  const primaryMargin = cockpit.marginRisks[0] ?? null
  const primaryQuote = cockpit.quoteImplications[0] ?? null
  const safeQuoteSummary = primaryQuote ? buildClientSafeQuoteFinancialSummary(primaryQuote) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
            Finance
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-stone-100">Financial Cockpit</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">
            Private runway, receivables, tax, concentration, margin, and quote decision pressure.
          </p>
        </div>
        <StateBadge state={cockpit.overallState} />
      </div>

      {cockpit.missingInputs.length > 0 && (
        <div className="rounded-xl border border-amber-800 bg-amber-950 px-4 py-3">
          <p className="text-sm font-medium text-amber-200">
            Missing inputs are affecting confidence.
          </p>
          <p className="mt-1 text-sm text-amber-100">
            {cockpit.missingInputs.map((item) => item.replace(/_/g, ' ')).join(', ')}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Cash runway"
          value={
            cockpit.runway.runwayDays === null ? 'Unknown' : `${cockpit.runway.runwayDays} days`
          }
          state={cockpit.runway.state}
          detail={`Receivables ${formatCurrency(cockpit.runway.expectedReceivablesCents)} minus next expenses ${formatCurrency(cockpit.runway.expectedExpensesCents)}.`}
        />
        <MetricCard
          label="Receivables risk"
          value={formatCurrency(cockpit.receivables.outstandingCents)}
          state={cockpit.receivables.state}
          detail={`${formatCurrency(cockpit.receivables.overdueCents)} overdue across ${cockpit.receivables.overdueInvoiceCount} overdue items.`}
        />
        <MetricCard
          label="Tax set-aside"
          value={
            cockpit.taxSetAside.recommendedSetAsideCents === null
              ? 'Unknown'
              : formatCurrency(
                  Math.max(
                    0,
                    cockpit.taxSetAside.recommendedSetAsideCents -
                      cockpit.taxSetAside.amountAlreadyPaidCents
                  )
                )
          }
          state={cockpit.taxSetAside.state}
          detail="Estimate only. Review with a tax professional before relying on it."
        />
        <MetricCard
          label="Client concentration"
          value={formatPercent(cockpit.clientConcentration.topClientRevenuePercent)}
          state={cockpit.clientConcentration.state}
          detail={
            cockpit.clientConcentration.topClientId
              ? `${formatCurrency(cockpit.clientConcentration.concentratedRevenueCents)} tied to the top client.`
              : 'No client revenue history available yet.'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Decision Pressure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-stone-800 p-4">
                <p className="text-sm font-medium text-stone-300">Margin signal</p>
                <p className="mt-2 text-2xl font-semibold text-stone-50">
                  {primaryMargin?.marginPercent === null || !primaryMargin
                    ? 'Unknown'
                    : `${primaryMargin.marginPercent.toFixed(1)}%`}
                </p>
                <p className="mt-1 text-sm text-stone-400">
                  Target margin is {primaryMargin?.targetMarginPercent ?? 35}%.
                </p>
              </div>
              <div className="rounded-lg border border-stone-800 p-4">
                <p className="text-sm font-medium text-stone-300">Quote recommendation</p>
                <p className="mt-2 text-2xl font-semibold capitalize text-stone-50">
                  {primaryQuote ? primaryQuote.recommendation.replace(/_/g, ' ') : 'No open quote'}
                </p>
                <p className="mt-1 text-sm text-stone-400">
                  {primaryQuote
                    ? `${formatCurrency(primaryQuote.quotedRevenueCents)} quote under private review.`
                    : 'Draft or sent quotes will appear here.'}
                </p>
              </div>
            </div>

            {primaryQuote && (
              <div className="rounded-lg border border-stone-800 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-200">
                      Private quote implications
                    </p>
                    <p className="mt-1 text-sm text-stone-400">
                      Client-facing language is reduced to safe payment and scope terms.
                    </p>
                  </div>
                  <Link
                    href={`/quotes/${primaryQuote.quoteId}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-700 px-3 text-sm font-medium text-stone-200 hover:bg-stone-800"
                  >
                    Open quote
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-stone-500">
                      Private reasons
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-stone-300">
                      {(primaryQuote.privatePressureReasons.length > 0
                        ? primaryQuote.privatePressureReasons
                        : ['No private pressure reason has enough confidence yet.']
                      ).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-stone-500">
                      Client-safe terms
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-stone-300">
                      {(safeQuoteSummary?.allowedTerms ?? ['Standard payment terms apply']).map(
                        (term) => (
                          <li key={term}>{term}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/finance/invoices/overdue"
              className="block min-h-11 rounded-lg border border-stone-800 px-4 py-3 text-sm text-stone-200 hover:bg-stone-800"
            >
              Follow up overdue receivables
            </Link>
            <Link
              href="/finance/tax/quarterly"
              className="block min-h-11 rounded-lg border border-stone-800 px-4 py-3 text-sm text-stone-200 hover:bg-stone-800"
            >
              Review quarterly tax estimate
            </Link>
            <Link
              href="/finance/reporting/revenue-by-client"
              className="block min-h-11 rounded-lg border border-stone-800 px-4 py-3 text-sm text-stone-200 hover:bg-stone-800"
            >
              Check client concentration
            </Link>
            <Link
              href="/quotes"
              className="block min-h-11 rounded-lg border border-stone-800 px-4 py-3 text-sm text-stone-200 hover:bg-stone-800"
            >
              Review quote pricing and deposit terms
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
