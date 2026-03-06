// Upcoming Payments Due Widget
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { PaymentDueItem } from '@/lib/dashboard/widget-actions'

interface Props {
  payments: PaymentDueItem[]
}

export function PaymentsDueWidget({ payments }: Props) {
  if (payments.length === 0) return null

  const totalOutstanding = payments.reduce((sum, p) => sum + p.outstandingCents, 0)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Payments Due</h3>
          <p className="text-xs text-stone-500">{payments.length} outstanding</p>
        </div>
        <span className="text-sm font-bold text-amber-400">{formatCurrency(totalOutstanding)}</span>
      </div>
      <div className="space-y-2">
        {payments.map((p) => (
          <Link
            key={p.eventId}
            href={`/events/${p.eventId}`}
            className="flex items-center justify-between hover:bg-stone-800 rounded-md px-1 py-1.5 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-100 truncate">{p.occasion}</p>
              <p className="text-xs text-stone-500">{p.clientName}</p>
            </div>
            <span className="text-xs font-semibold text-amber-500 shrink-0 ml-3">
              {formatCurrency(p.outstandingCents)}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  )
}
