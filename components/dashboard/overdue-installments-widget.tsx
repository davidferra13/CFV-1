// Overdue Installments Widget - shows past-due payment installments

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

interface OverdueInstallment {
  id: string
  sale_id: string | null
  event_id: string | null
  installment_number: number
  due_date: string
  amount_cents: number
  status: string
}

interface Props {
  installments: OverdueInstallment[]
}

export function OverdueInstallmentsWidget({ installments }: Props) {
  if (installments.length === 0) return null

  const totalOverdueCents = installments.reduce((sum, i) => sum + i.amount_cents, 0)

  return (
    <Card className="border-red-800/40">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Overdue Installments</CardTitle>
          <Link
            href="/commerce/reconciliation"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            Reconciliation <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-red-400/70 mt-0.5">
          {installments.length} overdue, totaling {formatCurrency(totalOverdueCents)}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {installments.slice(0, 5).map((item) => {
            const daysOverdue = Math.floor(
              (Date.now() - new Date(item.due_date + 'T00:00:00').getTime()) / 86400000
            )

            return (
              <li key={item.id}>
                <Link
                  href={
                    item.event_id
                      ? `/events/${item.event_id}/financial`
                      : '/commerce/reconciliation'
                  }
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-stone-800 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-stone-200">Installment #{item.installment_number}</p>
                    <p className="text-xs text-stone-500">
                      Due {format(new Date(item.due_date + 'T12:00:00'), 'MMM d')} · {daysOverdue}d
                      overdue
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-400 shrink-0 ml-2">
                    {formatCurrency(item.amount_cents)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
