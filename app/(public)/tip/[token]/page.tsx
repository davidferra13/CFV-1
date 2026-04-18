// Public Tip Page - no auth required.
// Client receives this link after a completed event (Uber-style tip prompt).

import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { getTipRequestByToken } from '@/lib/finance/tip-actions'
import { TokenExpiredPage } from '@/components/ui/token-expired-page'
import { TipForm } from './tip-form'

export const metadata = { title: 'Leave a Tip' }

export default async function TipPage({ params }: { params: { token: string } }) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`tip:${ip}`, 30, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const data = await getTipRequestByToken(params.token)

  if (!data) return <TokenExpiredPage reason="expired" noun="tip" />

  const { request, chefName, eventDate, eventOccasion, eventTotalCents } = data

  // Already completed
  if (request.status === 'completed') {
    return (
      <div className="min-h-screen bg-stone-800 flex items-center justify-center p-4">
        <div className="bg-stone-900 rounded-2xl shadow-sm border border-stone-700 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🙏</div>
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Thank you!</h1>
          <p className="text-stone-400">
            Your tip has been received. {chefName} appreciates your generosity!
          </p>
        </div>
      </div>
    )
  }

  // Declined
  if (request.status === 'declined') {
    return (
      <div className="min-h-screen bg-stone-800 flex items-center justify-center p-4">
        <div className="bg-stone-900 rounded-2xl shadow-sm border border-stone-700 p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-stone-100 mb-2">No worries!</h1>
          <p className="text-stone-400">
            Thank you for your time. We hope you enjoyed the experience!
          </p>
        </div>
      </div>
    )
  }

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-stone-800 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-100">Leave a Tip</h1>
          <p className="text-stone-300 mt-2">
            for <span className="font-semibold text-brand-400">{chefName}</span>
          </p>
          {(eventOccasion || formattedDate) && (
            <p className="text-stone-500 text-sm mt-1">
              {eventOccasion}
              {eventOccasion && formattedDate ? ' · ' : ''}
              {formattedDate}
            </p>
          )}
        </div>

        <TipForm
          requestId={request.id}
          suggestedAmountsCents={request.suggestedAmountsCents}
          suggestedPercentages={request.suggestedPercentages}
          eventTotalCents={eventTotalCents}
          chefName={chefName}
        />

        <p className="text-center text-xs text-stone-600 mt-8">Powered by ChefFlow</p>
      </div>
    </div>
  )
}
