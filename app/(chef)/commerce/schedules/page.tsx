// Payment Schedules Page - installment plan management
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getOverdueInstallments } from '@/lib/commerce/schedule-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PaymentScheduleClient } from '@/components/commerce/payment-schedule-client'

export const metadata: Metadata = { title: 'Payment Schedules' }

export default async function PaymentSchedulesPage() {
  await requireChef()
  await requirePro('commerce')

  const overdueInstallments = await getOverdueInstallments()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-stone-100">Payment Schedules</h1>
          {overdueInstallments.length > 0 && (
            <Badge variant="error">{overdueInstallments.length} overdue</Badge>
          )}
        </div>
      </div>

      <p className="text-stone-400 text-sm">
        Manage installment payment plans for events and large orders. Mark payments as received or
        waive installments.
      </p>

      {/* Overdue installments */}
      {overdueInstallments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-400">Overdue Installments</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentScheduleClient installments={overdueInstallments} />
          </CardContent>
        </Card>
      )}

      {overdueInstallments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-stone-500">
            No overdue installments. Payment schedules can be created from individual sale or event
            pages.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
