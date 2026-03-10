'use client'

import { CheckCircle, Calendar, Bell } from 'lucide-react'

type ProposalConfirmationProps = {
  clientName: string
  eventDate: string | null
  effectiveTotal: number
  depositAmount: number | null
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ProposalConfirmation({
  clientName,
  eventDate,
  effectiveTotal,
  depositAmount,
}: ProposalConfirmationProps) {
  const paidAmount = depositAmount ?? effectiveTotal
  const isDeposit = depositAmount !== null && depositAmount < effectiveTotal

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const firstName = clientName.split(' ')[0] || clientName

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-white">
      <div className="text-center max-w-md w-full">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        {/* Thank you message */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Thank you, {firstName}!
        </h1>
        <p className="text-gray-500 mb-8">
          Your booking is confirmed and your chef has been notified.
        </p>

        {/* Summary card */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-left space-y-4 mb-8">
          {formattedDate && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Event Date</p>
                <p className="text-sm font-medium text-gray-900">{formattedDate}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="h-5 w-5 flex items-center justify-center">
              <span className="text-gray-400 text-sm font-bold">$</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {isDeposit ? 'Deposit Paid' : 'Amount Paid'}
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatCents(paidAmount)}
                {isDeposit && (
                  <span className="text-gray-400 font-normal">
                    {' '}
                    of {formatCents(effectiveTotal)} total
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 text-left">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">What happens next</p>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>Your chef will reach out to finalize details.</li>
                <li>You will receive a confirmation email shortly.</li>
                {isDeposit && <li>The remaining balance will be due before the event.</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 mt-8">Powered by ChefFlow</p>
      </div>
    </div>
  )
}
