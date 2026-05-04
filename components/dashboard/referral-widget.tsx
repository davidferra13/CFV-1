// Referral Widget - dashboard summary of this month's referral activity

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'

interface ReferralWidgetData {
  thisMonthCount: number
  thisMonthConverted: number
  topReferrerName: string | null
  topReferrerCount: number
  totalRevenueFromReferralsCents: number
}

interface Props {
  data: ReferralWidgetData
}

export function ReferralWidget({ data }: Props) {
  if (data.thisMonthCount === 0 && !data.topReferrerName) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Referrals</CardTitle>
          <Link
            href="/analytics/referral-sources"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            Referral analytics <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-stone-100">{data.thisMonthCount}</span>
          <span className="text-sm text-stone-500">
            referral{data.thisMonthCount !== 1 ? 's' : ''} this month
          </span>
        </div>

        {data.thisMonthConverted > 0 && (
          <p className="text-xs text-emerald-400">
            {data.thisMonthConverted} converted ·{' '}
            {formatCurrency(data.totalRevenueFromReferralsCents)} total revenue
          </p>
        )}

        {data.topReferrerName && (
          <div className="pt-2 border-t border-stone-800">
            <p className="text-xs text-stone-500">Top referrer</p>
            <p className="text-sm text-stone-200 font-medium">
              {data.topReferrerName}{' '}
              <span className="text-stone-500 font-normal">
                ({data.topReferrerCount} referral{data.topReferrerCount !== 1 ? 's' : ''})
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
