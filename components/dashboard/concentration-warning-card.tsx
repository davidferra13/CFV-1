'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import type { ConcentrationRisk } from '@/lib/finance/concentration-risk'

interface ConcentrationWarningCardProps {
  risk: ConcentrationRisk | null
}

const BAR_COLORS = ['bg-brand-600', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-purple-500']

export function ConcentrationWarningCard({ risk }: ConcentrationWarningCardProps) {
  if (!risk) {
    return (
      <Card className="border-stone-200">
        <CardContent className="pt-4">
          <p className="text-sm text-stone-400">No revenue data yet.</p>
          <Link
            href="/finance"
            className="text-xs text-brand-600 hover:text-brand-700 underline underline-offset-2 mt-2 inline-block"
          >
            View finances
          </Link>
        </CardContent>
      </Card>
    )
  }

  const {
    riskLevel,
    topClientName,
    topClientRevenuePct,
    top3RevenuePct,
    top3RiskLevel,
    distribution,
  } = risk

  const cardConfig = {
    safe: {
      bg: 'bg-emerald-950 border-emerald-200',
      title: 'Revenue Well Diversified',
      titleColor: 'text-emerald-400',
      body: `Your largest client accounts for ${topClientRevenuePct}% of revenue.`,
      bodyColor: 'text-emerald-300',
    },
    moderate: {
      bg: 'bg-amber-950 border-amber-200',
      title: 'Revenue Concentration Moderate',
      titleColor: 'text-amber-400',
      body: `${topClientName} accounts for ${topClientRevenuePct}% of revenue. Consider diversifying your client base.`,
      bodyColor: 'text-amber-300',
    },
    high: {
      bg: 'bg-red-950 border-red-200',
      title: 'High Revenue Concentration',
      titleColor: 'text-red-400',
      body: `${topClientName} accounts for ${topClientRevenuePct}% of revenue. Losing this client would significantly impact income.`,
      bodyColor: 'text-red-300',
    },
  }

  const config = cardConfig[riskLevel]

  // Show top 5 in the distribution bar
  const top5 = distribution.slice(0, 5)
  const otherPct = distribution.slice(5).reduce((sum, d) => sum + d.revenuePct, 0)

  return (
    <div className={`rounded-xl border p-4 ${config.bg}`}>
      <h4 className={`text-sm font-semibold ${config.titleColor}`}>{config.title}</h4>
      <p className={`text-sm mt-1 ${config.bodyColor}`}>{config.body}</p>

      {/* Top-3 concentration warning */}
      {top3RiskLevel === 'concentrated' && (
        <p className="text-xs text-amber-400 mt-2">
          Your top 3 clients represent {top3RevenuePct}% of revenue (threshold: 70%).
        </p>
      )}

      {/* Distribution bar */}
      {top5.length > 1 && (
        <div className="mt-3">
          <div className="flex rounded-full overflow-hidden h-3">
            {top5.map((client, i) => (
              <div
                key={client.clientId}
                className={`${BAR_COLORS[i % BAR_COLORS.length]} transition-all`}
                style={{ width: `${client.revenuePct}%` }}
                title={`${client.name}: ${client.revenuePct}%`}
              />
            ))}
            {otherPct > 0 && (
              <div
                className="bg-stone-600 transition-all"
                style={{ width: `${otherPct}%` }}
                title={`Others: ${Math.round(otherPct)}%`}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {top5.map((client, i) => (
              <span
                key={client.clientId}
                className="text-xs text-stone-400 flex items-center gap-1"
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                />
                {client.name} ({client.revenuePct}%)
              </span>
            ))}
            {otherPct > 0 && (
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-stone-600" />
                Others ({Math.round(otherPct)}%)
              </span>
            )}
          </div>
        </div>
      )}

      <Link
        href="/finance/reporting/revenue-by-client"
        className="text-xs font-medium text-stone-400 hover:text-stone-200 underline underline-offset-2 mt-3 inline-block"
      >
        View revenue by client
      </Link>
    </div>
  )
}
