// Payout Summary Widget - Stripe payout overview

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'

interface ChefPayoutSummary {
  totalTransferredCents: number
  totalPlatformFeesCents: number
  totalNetReceivedCents: number
  transferCount: number
  pendingCount: number
  lastTransferDate: string | null
  stripeAccountId: string | null
  onboardingComplete: boolean
}

interface Props {
  summary: ChefPayoutSummary
}

export function PayoutSummaryWidget({ summary }: Props) {
  if (!summary.onboardingComplete && summary.transferCount === 0) {
    return (
      <Card className="border-stone-700">
        <CardHeader>
          <CardTitle>Payout Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">
            Connect your Stripe account to start receiving payouts.
          </p>
          <Link
            href="/settings/payments"
            className="text-sm text-brand-500 hover:text-brand-400 font-medium mt-2 inline-block"
          >
            Set up payments
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Payout Summary</CardTitle>
          <Link
            href="/finance/payouts"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-stone-500">Net Received</p>
            <p className="text-lg font-bold text-green-400">
              {formatCurrency(summary.totalNetReceivedCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Platform Fees</p>
            <p className="text-lg font-bold text-stone-300">
              {formatCurrency(summary.totalPlatformFeesCents)}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm border-t border-stone-800 pt-2">
          <span className="text-stone-500">Transfers</span>
          <span className="text-stone-200">{summary.transferCount} completed</span>
        </div>
        {summary.pendingCount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-500">Pending</span>
            <span className="text-amber-400">{summary.pendingCount} pending</span>
          </div>
        )}
        {summary.lastTransferDate && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-500">Last Transfer</span>
            <span className="text-stone-300">
              {new Date(summary.lastTransferDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
