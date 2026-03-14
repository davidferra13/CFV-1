// Invoice View Component
// Screen-only invoice display — not a PDF.
// Shared between chef portal (/events/[id]/invoice) and client portal (/my-events/[id]/invoice).
// Renders the 6 invoice sections: header, chef info, client info, line item, payment history, balance.

import type { InvoiceData } from '@/lib/events/invoice-actions'
import { formatTaxRate } from '@/lib/tax/api-ninjas'

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  payment: 'Payment',
  deposit: 'Deposit',
  installment: 'Installment',
  final_payment: 'Final Payment',
  tip: 'Tip / Gratuity',
  refund: 'Refund',
  adjustment: 'Adjustment',
  add_on: 'Add-On',
  credit: 'Credit',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  venmo: 'Venmo',
  paypal: 'PayPal',
  zelle: 'Zelle',
  card: 'Card',
  check: 'Check',
  other: 'Other',
}

export function InvoiceView({ invoice }: { invoice: InvoiceData }) {
  const {
    invoiceNumber,
    invoiceIssuedAt,
    chef,
    client,
    event,
    quotedPriceCents,
    serviceSubtotalCents,
    loyaltyDiscountCents,
    loyaltyAdjustments,
    depositAmountCents,
    paymentStatus,
    paymentEntries,
    totalPaidCents,
    totalRefundedCents,
    tipAmountCents,
    balanceDueCents,
    isPaidInFull,
    salesTax,
    loyalty,
    betaDiscount,
  } = invoice

  const locationStr = [event.locationCity, event.locationState].filter(Boolean).join(', ')
  const pricingLabel =
    event.pricingModel === 'per_person' && invoice.pricePerPersonCents
      ? `${formatCents(invoice.pricePerPersonCents)} per person × ${event.guestCount}`
      : 'Flat rate'

  return (
    <div className="max-w-2xl mx-auto bg-stone-900 border border-stone-700 rounded-lg overflow-hidden print:shadow-none print:border-0">
      {/* ── Section 1: INVOICE Header ── */}
      <div className="px-8 py-6 bg-stone-800 border-b border-stone-700">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-100">INVOICE</h1>
            {invoiceNumber && (
              <p className="text-stone-500 mt-1 font-mono text-sm">{invoiceNumber}</p>
            )}
          </div>
          <div className="text-right text-sm text-stone-400">
            <p className="font-semibold text-stone-100">{chef.businessName}</p>
            <p>{chef.email}</p>
            {chef.phone && <p>{chef.phone}</p>}
            {invoiceIssuedAt && (
              <p className="mt-2 text-xs text-stone-400">
                Issued{' '}
                {new Date(invoiceIssuedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* ── Section 2: Client + Event Info ── */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Bill To
            </h2>
            <p className="font-semibold text-stone-100">{client.displayName}</p>
            <p className="text-stone-400 text-sm">{client.email}</p>
            {loyalty && (
              <div className="mt-2 rounded-md border border-stone-700 bg-stone-800 px-3 py-2">
                <p className="text-xs text-stone-400 uppercase tracking-wide">Loyalty</p>
                <p className="text-sm font-medium text-stone-100 capitalize">
                  {loyalty.tier} member
                </p>
                <p className="text-xs text-stone-300">
                  {loyalty.pointsBalance.toLocaleString()} points available
                  {loyalty.nextTierName && loyalty.pointsToNextTier > 0
                    ? ` - ${loyalty.pointsToNextTier.toLocaleString()} to ${loyalty.nextTierName}`
                    : ''}
                </p>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Event
            </h2>
            <p className="font-semibold text-stone-100">{event.occasion || 'Private Dinner'}</p>
            <p className="text-stone-400 text-sm">{event.formattedDate}</p>
            {locationStr && <p className="text-stone-500 text-sm">{locationStr}</p>}
            <p className="text-stone-500 text-sm">{event.guestCount} guests</p>
          </div>
        </div>

        {/* ── Section 3: Line Item ── */}
        <div>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
            Service
          </h2>
          <div className="border border-stone-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-800 border-b border-stone-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-stone-400">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-stone-800">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-100">
                      Private dinner service{event.occasion ? ` — ${event.occasion}` : ''}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">{pricingLabel}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-100">
                    {quotedPriceCents ? formatCents(quotedPriceCents) : '—'}
                  </td>
                </tr>
                {loyaltyAdjustments?.appliedRedemptions.map((adjustment) => (
                  <tr key={adjustment.redemptionId} className="border-b border-stone-800">
                    <td className="px-4 py-3">
                      <p className="text-sm text-stone-300">
                        Loyalty redemption - {adjustment.rewardName}
                      </p>
                      <p className="text-xs text-stone-500">
                        {adjustment.pointsSpent} points redeemed
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 text-sm">
                      -{formatCents(adjustment.discountCents)}
                    </td>
                  </tr>
                ))}
                {betaDiscount?.applied && (
                  <tr className="border-b border-stone-700">
                    <td className="px-4 py-3">
                      <p className="text-stone-400 text-sm">
                        Beta tester discount ({betaDiscount.discountPercent}%)
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 text-sm">
                      -{formatCents(betaDiscount.discountCents)}
                    </td>
                  </tr>
                )}
                {(loyaltyDiscountCents > 0 || betaDiscount?.applied) && (
                  <tr className="bg-stone-800 border-b border-stone-700">
                    <td className="px-4 py-3 text-stone-400 text-sm">Adjusted service subtotal</td>
                    <td className="px-4 py-3 text-right text-stone-200 text-sm">
                      {formatCents(serviceSubtotalCents)}
                    </td>
                  </tr>
                )}
                {depositAmountCents && (
                  <tr className="bg-stone-800">
                    <td className="px-4 py-3 text-stone-500 text-sm">Deposit required</td>
                    <td className="px-4 py-3 text-right text-stone-400 text-sm">
                      {formatCents(depositAmountCents)}
                    </td>
                  </tr>
                )}
                {salesTax && salesTax.taxAmountCents > 0 && (
                  <tr className="border-b border-stone-800">
                    <td className="px-4 py-3">
                      <p className="text-stone-400 text-sm">
                        Sales Tax ({formatTaxRate(salesTax.taxRate)})
                      </p>
                      {salesTax.zipCode && (
                        <p className="text-xs text-stone-500 mt-0.5">
                          Based on ZIP {salesTax.zipCode}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-400 text-sm">
                      {formatCents(salesTax.taxAmountCents)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 4: Payment History ── */}
        {paymentEntries.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Payment History
            </h2>
            <div className="border border-stone-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-800 border-b border-stone-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-stone-400">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-stone-400">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-stone-400">Method</th>
                    <th className="text-right px-4 py-3 font-medium text-stone-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {paymentEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={entry.isRefund ? 'bg-red-950' : entry.isTip ? 'bg-purple-950' : ''}
                    >
                      <td className="px-4 py-3 text-stone-400">{entry.date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-medium ${
                            entry.isRefund
                              ? 'text-red-700'
                              : entry.isTip
                                ? 'text-purple-700'
                                : 'text-stone-100'
                          }`}
                        >
                          {ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType}
                        </span>
                        {entry.transactionReference && (
                          <span className="text-xs text-stone-400 ml-2">
                            ref: {entry.transactionReference}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-400">
                        {PAYMENT_METHOD_LABELS[entry.paymentMethod] ?? entry.paymentMethod}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          entry.isRefund
                            ? 'text-red-700'
                            : entry.isTip
                              ? 'text-purple-700'
                              : 'text-stone-100'
                        }`}
                      >
                        {entry.isRefund ? '−' : ''}
                        {formatCents(Math.abs(entry.amountCents))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Section 5: Balance Summary ── */}
        <div className="border border-stone-700 rounded-lg p-5">
          <div className="space-y-2">
            {quotedPriceCents !== null && (
              <div className="flex justify-between text-sm text-stone-400">
                <span>Service total</span>
                <span>{formatCents(quotedPriceCents)}</span>
              </div>
            )}
            {loyaltyDiscountCents > 0 && (
              <div className="flex justify-between text-sm text-stone-400">
                <span>Loyalty discount</span>
                <span className="text-green-700">-{formatCents(loyaltyDiscountCents)}</span>
              </div>
            )}
            {betaDiscount?.applied && (
              <div className="flex justify-between text-sm text-stone-400">
                <span>Beta tester discount ({betaDiscount.discountPercent}%)</span>
                <span className="text-green-700">-{formatCents(betaDiscount.discountCents)}</span>
              </div>
            )}
            {(loyaltyDiscountCents > 0 || betaDiscount?.applied) && (
              <div className="flex justify-between text-sm text-stone-400">
                <span>Adjusted service subtotal</span>
                <span>{formatCents(serviceSubtotalCents)}</span>
              </div>
            )}
            {salesTax && salesTax.taxAmountCents > 0 && (
              <div className="flex justify-between text-sm text-stone-400">
                <span>Sales tax ({formatTaxRate(salesTax.taxRate)})</span>
                <span>{formatCents(salesTax.taxAmountCents)}</span>
              </div>
            )}
            {totalPaidCents > 0 && (
              <div className="flex justify-between text-sm text-stone-400">
                <span>Total paid</span>
                <span className="text-green-700">{formatCents(totalPaidCents)}</span>
              </div>
            )}
            {totalRefundedCents > 0 && (
              <div className="flex justify-between text-sm text-stone-400">
                <span>Refunded</span>
                <span className="text-red-700">−{formatCents(totalRefundedCents)}</span>
              </div>
            )}
            {tipAmountCents > 0 && (
              <div className="flex justify-between text-sm text-stone-500">
                <span>Gratuity (not included in total)</span>
                <span className="text-purple-700">{formatCents(tipAmountCents)}</span>
              </div>
            )}
            <div className="border-t border-stone-700 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-stone-100">
                  {isPaidInFull ? 'Balance' : 'Balance due'}
                </span>
                <span
                  className={`text-lg font-bold ${isPaidInFull ? 'text-green-700' : 'text-stone-100'}`}
                >
                  {isPaidInFull ? 'PAID IN FULL' : formatCents(balanceDueCents)}
                </span>
              </div>
              {isPaidInFull && tipAmountCents > 0 && (
                <p className="text-xs text-stone-500 text-right mt-1">
                  + {formatCents(tipAmountCents)} gratuity
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 6: Footer ── */}
        <p className="text-center text-xs text-stone-400">
          Thank you for choosing {chef.businessName}. It was a pleasure cooking for you.
        </p>
      </div>
    </div>
  )
}
