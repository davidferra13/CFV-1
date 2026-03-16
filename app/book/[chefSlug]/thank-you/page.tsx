// Thank-You Page - shown after a successful booking request or instant-book payment.
// No authentication required.
// Detects ?mode=instant for instant-book confirmation messaging.

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
      </div>
    </div>
  )
}
