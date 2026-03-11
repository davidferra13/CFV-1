// Expense Detail Page
// Shows full expense details, receipt dual view, edit/delete actions

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getExpenseById } from '@/lib/expenses/actions'
import { getReceiptUrl } from '@/lib/expenses/receipt-upload'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { getCategoryLabel } from '@/lib/constants/expense-categories'
import { format } from 'date-fns'
import { ExpenseActions } from '@/components/expenses/expense-actions'

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Card',
  cash: 'Cash',
  venmo: 'Venmo',
  paypal: 'PayPal',
  zelle: 'Zelle',
  check: 'Check',
  other: 'Other',
}

export default async function ExpenseDetailPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [expense, receiptUrl] = await Promise.all([
    getExpenseById(params.id),
    getReceiptUrl(params.id).catch(() => null),
  ])

  if (!expense) {
    notFound()
  }

  const event = (expense as any).event

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">{expense.description}</h1>
          <p className="text-stone-400 mt-1">
            {format(new Date(expense.expense_date), 'EEEE, MMMM d, yyyy')}
            {expense.vendor_name && ` - ${expense.vendor_name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/expenses">
            <Button variant="ghost">Back to Expenses</Button>
          </Link>
        </div>
      </div>

      {/* Main Details */}
      <Card className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <dt className="text-sm font-medium text-stone-500">Amount</dt>
            <dd className="text-2xl font-bold text-stone-100 mt-1">
              {formatCurrency(expense.amount_cents)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Category</dt>
            <dd className="text-sm font-medium text-stone-100 mt-1">
              {getCategoryLabel(expense.category)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Payment</dt>
            <dd className="text-sm font-medium text-stone-100 mt-1">
              {PAYMENT_LABELS[expense.payment_method] || expense.payment_method}
              {expense.payment_card_used && (
                <span className="text-stone-500 ml-1">({expense.payment_card_used})</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Type</dt>
            <dd className="mt-1">
              {expense.is_business ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-900 text-brand-300">
                  Business
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-900 text-amber-200">
                  Personal
                </span>
              )}
            </dd>
          </div>
        </div>

        {/* Event Link */}
        {event && (
          <div className="mt-4 pt-4 border-t border-stone-800">
            <dt className="text-sm font-medium text-stone-500">Event</dt>
            <dd className="text-sm mt-1">
              <Link href={`/events/${expense.event_id}`} className="text-brand-600 hover:underline">
                {event.occasion || 'Untitled'} - {format(new Date(event.event_date), 'MMM d, yyyy')}
              </Link>
              {event.client && (
                <span className="text-stone-500 ml-1">({event.client.full_name})</span>
              )}
            </dd>
          </div>
        )}

        {/* Notes */}
        {expense.notes && (
          <div className="mt-4 pt-4 border-t border-stone-800">
            <dt className="text-sm font-medium text-stone-500">Notes</dt>
            <dd className="text-sm text-stone-100 mt-1 whitespace-pre-wrap">{expense.notes}</dd>
          </div>
        )}

        {/* Mileage */}
        {expense.mileage_miles && (
          <div className="mt-4 pt-4 border-t border-stone-800">
            <dt className="text-sm font-medium text-stone-500">Mileage</dt>
            <dd className="text-sm text-stone-100 mt-1">
              {expense.mileage_miles} miles
              {expense.mileage_rate_per_mile_cents && (
                <span className="text-stone-500 ml-1">
                  @ {formatCurrency(expense.mileage_rate_per_mile_cents)}/mile
                </span>
              )}
            </dd>
          </div>
        )}
      </Card>

      {/* Receipt Dual View */}
      {receiptUrl && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Receipt</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-stone-500 mb-2">Original Photo</h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptUrl}
                alt="Receipt"
                className="w-full rounded border border-stone-700"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-500 mb-2">Details</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-stone-500">Store</dt>
                  <dd className="font-medium">{expense.vendor_name || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Date</dt>
                  <dd className="font-medium">
                    {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Total</dt>
                  <dd className="font-medium">{formatCurrency(expense.amount_cents)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <ExpenseActions expenseId={expense.id} />
    </div>
  )
}
