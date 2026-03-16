'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import type { ConcentrationRisk } from '@/lib/finance/concentration-risk'

interface ConcentrationWarningCardProps {
  risk: ConcentrationRisk | null
}

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

  const { riskLevel, topClientName, topClientRevenuePct } = risk

  const cardConfig = {
    safe: {
      bg: 'bg-emerald-950 border-emerald-200',
      title: 'Revenue Well Diversified',
      titleColor: 'text-emerald-800',
      body: `Your largest client accounts for ${topClientRevenuePct}% of revenue - healthy diversification.`,
      bodyColor: 'text-emerald-700',
    },
    moderate: {
      bg: 'bg-amber-950 border-amber-200',
      title: 'Revenue Concentration Moderate',
      titleColor: 'text-amber-800',
      body: `${topClientName} accounts for ${topClientRevenuePct}% of revenue. Consider diversifying your client base.`,
      bodyColor: 'text-amber-700',
    },
    high: {
      bg: 'bg-red-950 border-red-200',
      title: 'High Revenue Concentration',
      titleColor: 'text-red-800',
      body: `${topClientName} accounts for ${topClientRevenuePct}% of revenue. Losing this client would significantly impact income. Consider diversifying.`,
      bodyColor: 'text-red-700',
    },
  }

  const config = cardConfig[riskLevel]

  return (
    <div className={`rounded-xl border p-4 ${config.bg}`}>
      <h4 className={`text-sm font-semibold ${config.titleColor}`}>{config.title}</h4>
      <p className={`text-sm mt-1 ${config.bodyColor}`}>{config.body}</p>
      <Link
        href="/finance"
        className="text-xs font-medium text-stone-600 hover:text-stone-800 underline underline-offset-2 mt-3 inline-block"
      >
        View finances
      </Link>
    </div>
  )
}
