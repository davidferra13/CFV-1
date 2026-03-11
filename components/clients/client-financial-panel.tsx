// Client Financial Panel
// Comprehensive per-client financial breakdown:
// summary totals, per-event table, and full ledger history.

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

type EventBreakdown = {
  eventId: string
  occasion: string
  eventDate: string
  status: string
  guestCount: number
  quotedPriceCents: number
  depositAmountCents: number
  paymentStatus: string
  totalPaidCents: number
  totalRefundedCents: number
  outstandingBalanceCents: number
  tipAmountCents: number
}

type LedgerEntry = {
  id: string
  entry_type: string
  amount_cents: number
  is_refund: boolean
  description: string
  payment_method: string
  created_at: string
  received_at: string | null
  event_id: string | null
  events: { id: string; occasion: string | null; event_date: string } | null
}

type Summary = {
  totalQuotedCents: number
  totalPaidCents: number
  totalOutstandingCents: number
  totalRefundedCents: number
  totalTipsCents: number
  collectionRatePercent: number
}

type Props = {
  eventBreakdown: EventBreakdown[]
  ledgerEntries: LedgerEntry[]
  summary: Summary
}

const PAYMENT_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  paid: { label: 'Paid in Full', className: 'bg-green-900 text-green-200' },
  deposit_paid: { label: 'Deposit Paid', className: 'bg-blue-900 text-blue-200' },
  partial: { label: 'Partial', className: 'bg-amber-900 text-amber-200' },
  unpaid: { label: 'Unpaid', className: 'bg-red-900 text-red-200' },
  refunded: { label: 'Refunded', className: 'bg-stone-800 text-stone-400' },
}

const EVENT_STATUS_STYLES: Record<string, string> = {
  completed: 'text-green-200',
  confirmed: 'text-blue-200',
  paid: 'text-blue-200',
  accepted: 'text-brand-400',
  proposed: 'text-amber-200',
  draft: 'text-stone-500',
  in_progress: 'text-purple-200',
  cancelled: 'text-stone-400 line-through',
}

const ENTRY_TYPE_STYLES: Record<string, { label: string; className: string }> = {
  payment: { label: 'Payment', className: 'bg-green-900 text-green-200' },
  deposit: { label: 'Deposit', className: 'bg-brand-900 text-brand-300' },
  installment: { label: 'Installment', className: 'bg-blue-900 text-blue-200' },
  final_payment: { label: 'Final Payment', className: 'bg-green-900 text-green-200' },
  tip: { label: 'Tip', className: 'bg-purple-900 text-purple-200' },
  refund: { label: 'Refund', className: 'bg-red-900 text-red-200' },
  adjustment: { label: 'Adjustment', className: 'bg-stone-800 text-stone-300' },
  add_on: { label: 'Add-On', className: 'bg-orange-900 text-orange-200' },
  credit: { label: 'Credit', className: 'bg-teal-900 text-teal-200' },
}

export function ClientFinancialPanel({ eventBreakdown, ledgerEntries, summary }: Props) {
  const hasEvents = eventBreakdown.length > 0
  const hasLedger = ledgerEntries.length > 0

  return (
    <div className="space-y-6">
      {/* Summary Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-lg bg-stone-800 border border-stone-800">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Total Quoted
              </p>
              <p className="text-xl font-bold text-stone-100 mt-1">
                {formatCurrency(summary.totalQuotedCents)}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-green-950 border border-green-100">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                Total Paid
              </p>
              <p className="text-xl font-bold text-green-900 mt-1">
                {formatCurrency(summary.totalPaidCents)}
              </p>
            </div>

            <div
              className={`p-4 rounded-lg border ${summary.totalOutstandingCents > 0 ? 'bg-red-950 border-red-100' : 'bg-stone-800 border-stone-800'}`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wide ${summary.totalOutstandingCents > 0 ? 'text-red-600' : 'text-stone-500'}`}
              >
                Outstanding
              </p>
              <p
                className={`text-xl font-bold mt-1 ${summary.totalOutstandingCents > 0 ? 'text-red-900' : 'text-stone-400'}`}
              >
                {formatCurrency(summary.totalOutstandingCents)}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-purple-950 border border-purple-100">
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Tips</p>
              <p className="text-xl font-bold text-purple-900 mt-1">
                {formatCurrency(summary.totalTipsCents)}
              </p>
            </div>

            {summary.totalRefundedCents > 0 && (
              <div className="p-4 rounded-lg bg-stone-800 border border-stone-800">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Refunded
                </p>
                <p className="text-xl font-bold text-stone-300 mt-1">
                  {formatCurrency(summary.totalRefundedCents)}
                </p>
              </div>
            )}

            <div className="p-4 rounded-lg bg-blue-950 border border-blue-100">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                Collection Rate
              </p>
              <p className="text-xl font-bold text-blue-900 mt-1">
                {summary.collectionRatePercent}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Event Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Event Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasEvents ? (
            <p className="text-sm text-stone-500 py-6 text-center">
              No events yet for this client.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="border-b border-stone-700">
                    <th className="text-left py-2 pr-4 font-medium text-stone-500">Event</th>
                    <th className="text-left py-2 pr-4 font-medium text-stone-500">Date</th>
                    <th className="text-left py-2 pr-4 font-medium text-stone-500">Status</th>
                    <th className="text-right py-2 pr-4 font-medium text-stone-500">Quoted</th>
                    <th className="text-right py-2 pr-4 font-medium text-stone-500">
                      Deposit Req.
                    </th>
                    <th className="text-right py-2 pr-4 font-medium text-stone-500">Paid</th>
                    <th className="text-right py-2 pr-4 font-medium text-stone-500">Outstanding</th>
                    <th className="text-right py-2 font-medium text-stone-500">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {eventBreakdown.map((event) => {
                    const paymentStyle =
                      PAYMENT_STATUS_STYLES[event.paymentStatus] ?? PAYMENT_STATUS_STYLES.unpaid
                    const statusClass = EVENT_STATUS_STYLES[event.status] ?? 'text-stone-300'
                    const isCancelled = event.status === 'cancelled'

                    return (
                      <tr
                        key={event.eventId}
                        className={`group ${isCancelled ? 'opacity-60' : ''}`}
                      >
                        <td className="py-3 pr-4">
                          <Link
                            href={`/events/${event.eventId}`}
                            className="font-medium text-stone-100 hover:text-brand-600 transition-colors"
                          >
                            {event.occasion}
                          </Link>
                          {event.guestCount > 0 && (
                            <p className="text-xs text-stone-400">{event.guestCount} guests</p>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-stone-400 whitespace-nowrap">
                          {event.eventDate ? format(new Date(event.eventDate), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`capitalize text-xs font-medium ${statusClass}`}>
                            {event.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-stone-300">
                          {event.quotedPriceCents > 0
                            ? formatCurrency(event.quotedPriceCents)
                            : '—'}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-stone-400">
                          {event.depositAmountCents > 0
                            ? formatCurrency(event.depositAmountCents)
                            : '—'}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-green-200">
                          {event.totalPaidCents > 0 ? formatCurrency(event.totalPaidCents) : '—'}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono">
                          {isCancelled ? (
                            <span className="text-stone-400">—</span>
                          ) : event.outstandingBalanceCents > 0 ? (
                            <span className="text-red-200 font-semibold">
                              {formatCurrency(event.outstandingBalanceCents)}
                            </span>
                          ) : (
                            <span className="text-emerald-600">$0</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {isCancelled ? (
                            <span className="text-xs text-stone-400">Cancelled</span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${paymentStyle.className}`}
                            >
                              {paymentStyle.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Totals row */}
                {eventBreakdown.length > 1 && (
                  <tfoot>
                    <tr className="border-t-2 border-stone-600 font-semibold">
                      <td className="pt-3 pr-4 text-stone-300" colSpan={3}>
                        Totals (active events)
                      </td>
                      <td className="pt-3 pr-4 text-right font-mono text-stone-100">
                        {formatCurrency(summary.totalQuotedCents)}
                      </td>
                      <td className="pt-3 pr-4" />
                      <td className="pt-3 pr-4 text-right font-mono text-green-200">
                        {formatCurrency(summary.totalPaidCents)}
                      </td>
                      <td className="pt-3 pr-4 text-right font-mono">
                        {summary.totalOutstandingCents > 0 ? (
                          <span className="text-red-200">
                            {formatCurrency(summary.totalOutstandingCents)}
                          </span>
                        ) : (
                          <span className="text-emerald-600">$0</span>
                        )}
                      </td>
                      <td className="pt-3 text-right">
                        <span className="text-xs font-medium text-stone-500">
                          {summary.collectionRatePercent}% collected
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasLedger ? (
            <p className="text-sm text-stone-500 py-6 text-center">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-stone-700">
                    <th className="text-left py-2 pr-4 font-medium text-stone-500">Date</th>
                    <th className="text-left py-2 pr-4 font-medium text-stone-500">Event</th>
                    <th className="text-left py-2 pr-4 font-medium text-stone-500">Type</th>
                    <th className="text-right py-2 pr-4 font-medium text-stone-500">Amount</th>
                    <th className="text-left py-2 font-medium text-stone-500">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {ledgerEntries.map((entry) => {
                    const typeStyle = ENTRY_TYPE_STYLES[entry.entry_type] ?? {
                      label: entry.entry_type,
                      className: 'bg-stone-800 text-stone-300',
                    }
                    const isNegative = entry.is_refund || entry.amount_cents < 0
                    // Supabase returns the FK join as object (many-to-one), but guard for array edge case
                    const rawEvent = (entry as any).events
                    const eventData: {
                      id: string
                      occasion: string | null
                      event_date: string
                    } | null = Array.isArray(rawEvent) ? (rawEvent[0] ?? null) : (rawEvent ?? null)

                    return (
                      <tr key={entry.id}>
                        <td className="py-3 pr-4 text-stone-400 whitespace-nowrap">
                          {format(new Date(entry.received_at ?? entry.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 pr-4">
                          {eventData ? (
                            <Link
                              href={`/events/${eventData.id}`}
                              className="text-stone-300 hover:text-brand-600 transition-colors truncate max-w-[140px] block"
                            >
                              {eventData.occasion || 'Event'}
                            </Link>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeStyle.className}`}
                          >
                            {typeStyle.label}
                          </span>
                        </td>
                        <td
                          className={`py-3 pr-4 text-right font-mono font-semibold ${isNegative ? 'text-red-200' : 'text-green-200'}`}
                        >
                          {isNegative ? '−' : '+'}
                          {formatCurrency(Math.abs(entry.amount_cents))}
                        </td>
                        <td className="py-3 text-stone-400 max-w-[200px] truncate">
                          {entry.description || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
