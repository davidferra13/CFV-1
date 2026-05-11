// Single Event Receipt/Invoice View - Printable format

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireClient } from '@/lib/auth/get-user'
import { getEventReceiptDetail } from '@/lib/receipts/client-receipt-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Event Receipt' }

export default async function EventReceiptPage({ params }: { params: { eventId: string } }) {
  await requireClient()

  const receipt = await getEventReceiptDetail(params.eventId)

  if (!receipt) {
    redirect('/my-receipts')
  }

  const balanceDue = receipt.quoted_price_cents - receipt.total_paid_cents
  const isPaidInFull = balanceDue <= 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Screen-only navigation */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/my-receipts"
          className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          &larr; Back to receipts
        </Link>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm font-medium hover:bg-stone-700 transition-colors"
          data-action="print"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Receipt header */}
      <Card className="p-6 print:border-gray-300 print:shadow-none">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-stone-100 print:text-black">
              {receipt.occasion || 'Private Chef Service'}
            </h1>
            {receipt.event_date && (
              <p className="text-stone-400 print:text-gray-600 mt-1">
                {format(new Date(receipt.event_date), 'EEEE, MMMM d, yyyy')}
              </p>
            )}
            {receipt.guest_count && (
              <p className="text-sm text-stone-500 print:text-gray-500 mt-1">
                {receipt.guest_count} guests
              </p>
            )}
          </div>
          <div className="text-right">
            {isPaidInFull ? (
              <Badge variant="success">Paid in Full</Badge>
            ) : (
              <Badge variant="warning">Balance Due</Badge>
            )}
            <p className="text-xs text-stone-500 print:text-gray-500 mt-2">
              Event #{params.eventId.slice(0, 8)}
            </p>
          </div>
        </div>
      </Card>

      {/* Chef info (print only context) */}
      {receipt.chef_name && (
        <div className="hidden print:block border-b border-gray-300 pb-3 mb-3">
          <p className="text-sm text-gray-600">Chef: {receipt.chef_name}</p>
        </div>
      )}

      {/* Line items / services */}
      <Card className="p-6 print:border-gray-300 print:shadow-none">
        <h2 className="text-sm font-medium text-stone-500 print:text-gray-500 uppercase tracking-wide mb-4">
          Services
        </h2>
        <div className="space-y-3">
          {receipt.line_items.length > 0 ? (
            receipt.line_items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-stone-200 print:text-black">{item.label}</span>
                <span className="text-stone-100 print:text-black font-medium">
                  {formatCurrency(item.amount_cents)}
                </span>
              </div>
            ))
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-stone-200 print:text-black">
                Private chef service{receipt.occasion ? ` (${receipt.occasion})` : ''}
              </span>
              <span className="text-stone-100 print:text-black font-medium">
                {formatCurrency(receipt.quoted_price_cents)}
              </span>
            </div>
          )}
        </div>

        {/* Subtotal / Total */}
        <div className="border-t border-stone-800 print:border-gray-300 mt-4 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-stone-400 print:text-gray-600">Quoted Total</span>
            <span className="text-stone-100 print:text-black">
              {formatCurrency(receipt.quoted_price_cents)}
            </span>
          </div>
        </div>
      </Card>

      {/* Payments */}
      <Card className="p-6 print:border-gray-300 print:shadow-none">
        <h2 className="text-sm font-medium text-stone-500 print:text-gray-500 uppercase tracking-wide mb-4">
          Payments
        </h2>
        {receipt.payments.length > 0 ? (
          <div className="space-y-3">
            {receipt.payments.map((payment, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div>
                  <span className="text-stone-200 print:text-black">
                    {payment.description || 'Payment'}
                  </span>
                  {payment.paid_at && (
                    <p className="text-xs text-stone-500 print:text-gray-500">
                      {format(new Date(payment.paid_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <span className="text-green-400 print:text-green-700 font-medium">
                  -{formatCurrency(payment.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500 print:text-gray-500">No payments recorded yet.</p>
        )}

        {/* Balance */}
        <div className="border-t border-stone-800 print:border-gray-300 mt-4 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-stone-300 print:text-gray-700">
              Total Paid
            </span>
            <span className="text-stone-100 print:text-black font-medium">
              {formatCurrency(receipt.total_paid_cents)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm font-medium text-stone-300 print:text-gray-700">
              {isPaidInFull ? 'Balance' : 'Balance Due'}
            </span>
            <span
              className={`text-lg font-bold ${
                isPaidInFull
                  ? 'text-green-400 print:text-green-700'
                  : 'text-amber-400 print:text-amber-700'
              }`}
            >
              {isPaidInFull ? '$0.00' : formatCurrency(balanceDue)}
            </span>
          </div>
        </div>
      </Card>

      {/* Print script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.querySelector('[data-action="print"]')?.addEventListener('click', function() {
              window.print();
            });
          `,
        }}
      />

      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { background: white !important; color: black !important; }
              .print\\:hidden { display: none !important; }
              .print\\:block { display: block !important; }
              .print\\:border-gray-300 { border-color: #d1d5db !important; }
              .print\\:shadow-none { box-shadow: none !important; }
              .print\\:text-black { color: black !important; }
              .print\\:text-gray-500 { color: #6b7280 !important; }
              .print\\:text-gray-600 { color: #4b5563 !important; }
              .print\\:text-gray-700 { color: #374151 !important; }
              .print\\:text-green-700 { color: #15803d !important; }
              .print\\:text-amber-700 { color: #b45309 !important; }
            }
          `,
        }}
      />
    </div>
  )
}
