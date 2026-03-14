// Average Hourly Rate Widget - shows effective hourly rate for the month

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

interface Props {
  rateCents: number | null
}

export function AvgHourlyRateWidget({ rateCents }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avg Hourly Rate</CardTitle>
        <p className="text-xs text-stone-500 mt-0.5">
          This month, based on completed events with tracked time
        </p>
      </CardHeader>
      <CardContent>
        {rateCents != null ? (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-brand-400">{formatCurrency(rateCents)}</span>
            <span className="text-sm text-stone-500">/ hour</span>
          </div>
        ) : (
          <p className="text-sm text-stone-500">No completed events with tracked time this month</p>
        )}
      </CardContent>
    </Card>
  )
}
