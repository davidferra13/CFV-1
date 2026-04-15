// Thank-You Page - shown after a successful booking request or instant-book payment.
// No authentication required.
// Detects ?mode=instant for instant-book confirmation messaging.

import Link from 'next/link'

export default function BookingThankYouPage({
  params,
  searchParams,
}: {
  params: { chefSlug: string }
  searchParams: { mode?: string }
}) {
  const isInstantBook = searchParams.mode === 'instant'

  return (
    <div className="min-h-screen bg-stone-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-stone-900 rounded-xl border border-stone-700 p-8 text-center space-y-4 shadow-sm">
        <div className="text-5xl">{isInstantBook ? '✅' : '🎉'}</div>
        <h1 className="text-2xl font-bold text-stone-100">
          {isInstantBook ? 'Booking Confirmed!' : 'Request Received!'}
        </h1>
        <p className="text-stone-400">
          {isInstantBook
            ? 'Your deposit has been processed and your event is booked. Your chef will be in touch with next steps.'
            : 'Your booking request has been submitted. Expect a response within 24 hours.'}
        </p>
        <p className="text-sm text-stone-400">
          {isInstantBook
            ? 'A receipt and booking confirmation have been sent to your email.'
            : 'A confirmation has been sent to your email address.'}
        </p>

        {/* Navigation links to prevent dead end */}
        <div className="pt-4 space-y-2">
          <Link
            href={`/chef/${params.chefSlug}`}
            className="block w-full rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-100 py-2.5 px-4 text-sm font-medium transition-colors text-center"
          >
            Back to Chef Profile
          </Link>
          <div className="flex gap-2">
            <Link
              href="/my-bookings"
              className="flex-1 rounded-lg border border-stone-600 hover:bg-stone-800 text-stone-300 py-2 px-3 text-sm transition-colors text-center"
            >
              Check Inquiry Status
            </Link>
            <Link
              href="/chefs"
              className="flex-1 rounded-lg border border-stone-600 hover:bg-stone-800 text-stone-300 py-2 px-3 text-sm transition-colors text-center"
            >
              Browse More Chefs
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
