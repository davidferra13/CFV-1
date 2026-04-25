import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBookingStatus } from '@/lib/booking/status-actions'

export const metadata: Metadata = {
  title: 'Booking Status | ChefFlow',
  description: 'Track the status of your chef booking request.',
  robots: { index: false },
}

type Props = {
  params: Promise<{ bookingToken: string }>
}

const STATUS_STEPS = [
  {
    key: 'sent',
    label: 'Sent to chefs',
    description: 'Your request has been shared with matched chefs in your area.',
  },
  {
    key: 'chef_reviewing',
    label: 'Chef reviewing',
    description: 'At least one chef is reviewing your request.',
  },
  {
    key: 'chef_responded',
    label: 'Chef responded',
    description: 'A chef has sent you a proposal or message.',
  },
]

function getStepIndex(status: string): number {
  if (status === 'chef_responded') return 2
  if (status === 'chef_reviewing') return 1
  if (status === 'no_response' || status === 'no_match') return 0
  return 0
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function timeSince(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function BookingStatusPage({ params }: Props) {
  const { bookingToken } = await params
  const booking = await getBookingStatus(bookingToken)

  if (!booking) notFound()

  const currentStep = getStepIndex(booking.status)
  const isExpired = booking.status === 'expired'
  const isNoMatch = booking.status === 'no_match'
  const hoursSinceSubmission = (Date.now() - new Date(booking.createdAt).getTime()) / 3_600_000
  const showNoResponseWarning =
    !isExpired &&
    !isNoMatch &&
    (booking.status === 'no_response' || (booking.status === 'sent' && hoursSinceSubmission > 48))

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const circleUrl = booking.firstCircleToken ? `${appUrl}/hub/g/${booking.firstCircleToken}` : null

  const guestDisplay = booking.guestCountRangeLabel
    ? `${booking.guestCount} (from ${booking.guestCountRangeLabel.split(' (')[0]} range)`
    : `${booking.guestCount}`

  const respondedChefs = booking.inquiries.filter(
    (i) =>
      i.chefRespondedAt ||
      i.status === 'awaiting_client' ||
      i.status === 'quoted' ||
      i.status === 'confirmed'
  )
  const firstRespondedCircleToken =
    respondedChefs.find((chef) => chef.circleGroupToken)?.circleGroupToken ?? null
  const activeCircleUrl = firstRespondedCircleToken
    ? `${appUrl}/hub/g/${firstRespondedCircleToken}`
    : circleUrl
  const hasProposal = respondedChefs.some((chef) => chef.proposalUrl)
  const hasDietaryDetails =
    booking.dietaryRestrictions.length > 0 || Boolean(booking.additionalNotes?.trim())
  const requestReadiness = [
    {
      label: 'Event details',
      status: booking.eventDate ? 'Date provided' : 'Flexible date',
      detail: booking.eventDate
        ? 'Chefs can check availability against your requested date.'
        : 'Chefs may ask for date options before proposing.',
    },
    {
      label: 'Dietary needs',
      status: hasDietaryDetails ? 'Shared' : 'Not shared yet',
      detail: hasDietaryDetails
        ? 'Your notes are attached to the booking request.'
        : 'A chef may ask before building a menu.',
    },
    {
      label: 'Proposal',
      status: hasProposal ? 'Available' : 'Not available yet',
      detail: hasProposal
        ? 'Open the proposal link from the chef response section.'
        : 'No proposal exists until a chef responds.',
    },
    {
      label: 'Payment',
      status: hasProposal ? 'Next after approval' : 'Nothing due now',
      detail: hasProposal
        ? 'Payment details appear only inside a chef proposal or booking portal.'
        : 'Submitting this request does not create a payment obligation.',
    },
  ]

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">
            Booking request
          </p>
          <h1 className="mt-2 text-2xl font-display tracking-tight text-white">
            {booking.occasion}
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            {isNoMatch
              ? `Submitted ${timeSince(booking.createdAt)} near ${
                  booking.resolvedLocation || booking.location
                }`
              : `Submitted ${timeSince(booking.createdAt)} to ${booking.matchedChefCount} chef${
                  booking.matchedChefCount !== 1 ? 's' : ''
                } near ${booking.resolvedLocation || booking.location}`}
          </p>
        </div>

        {/* Status Steps */}
        {!isExpired && !isNoMatch && (
          <div className="mb-8 rounded-2xl border border-stone-700 bg-stone-900/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-4">
              Status
            </p>
            <ol className="space-y-4">
              {STATUS_STEPS.map((step, i) => {
                const isDone = i <= currentStep
                const isCurrent = i === currentStep
                return (
                  <li key={step.key} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isDone
                          ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50'
                          : 'bg-stone-800 text-stone-500 border border-stone-700'
                      }`}
                    >
                      {isDone ? 'OK' : i + 1}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          isCurrent
                            ? 'text-emerald-300'
                            : isDone
                              ? 'text-stone-300'
                              : 'text-stone-500'
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-stone-500 mt-0.5">{step.description}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {/* No-response warning */}
        {showNoResponseWarning && (
          <div className="mb-8 rounded-2xl border border-amber-800/50 bg-amber-950/30 p-6">
            <p className="text-sm font-medium text-amber-300">No chef has responded yet</p>
            <p className="mt-1 text-sm text-stone-400">
              This can happen when chefs in your area have full schedules. You can:
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/nearby"
                className="inline-flex items-center rounded-xl border border-stone-700 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-200 hover:border-stone-600 hover:bg-stone-800 transition-colors"
              >
                Expand search
              </Link>
              <Link
                href="/chefs"
                className="inline-flex items-center rounded-xl border border-stone-700 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-200 hover:border-stone-600 hover:bg-stone-800 transition-colors"
              >
                Try a specific chef
              </Link>
            </div>
          </div>
        )}

        {/* No match state */}
        {isNoMatch && (
          <div className="mb-8 rounded-2xl border border-stone-700 bg-stone-900/60 p-6">
            <p className="text-sm font-medium text-stone-300">
              No chef is available in this area yet
            </p>
            <p className="mt-1 text-sm text-stone-400">
              Your request is saved. You can browse nearby food experiences or try a specific chef
              profile while coverage expands.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/nearby"
                className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
              >
                Expand search
              </Link>
              <Link
                href="/chefs"
                className="inline-flex items-center rounded-xl border border-stone-700 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-200 hover:border-stone-600 hover:bg-stone-800 transition-colors"
              >
                Try a specific chef
              </Link>
            </div>
          </div>
        )}

        {/* Expired state */}
        {isExpired && (
          <div className="mb-8 rounded-2xl border border-stone-700 bg-stone-900/60 p-6">
            <p className="text-sm font-medium text-stone-300">
              No chef was available for this request
            </p>
            <p className="mt-1 text-sm text-stone-400">
              Chefs in your area were booked for this date. You can try a different date, browse
              individual chef profiles, or submit a new request.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/chefs"
                className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
              >
                Browse chef profiles
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center rounded-xl border border-stone-700 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-200 hover:border-stone-600 hover:bg-stone-800 transition-colors"
              >
                New request
              </Link>
            </div>
          </div>
        )}

        {/* Booking readiness */}
        <div className="mb-8 rounded-2xl border border-stone-700 bg-stone-900/60 p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Booking readiness
            </p>
            <p className="mt-1 text-sm text-stone-400">
              This is what chefs can see from your request right now.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {requestReadiness.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-stone-800 bg-stone-950/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-stone-200">{item.label}</p>
                  <span className="rounded-full border border-stone-700 px-2 py-0.5 text-xs font-medium text-stone-300">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-stone-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chef responses */}
        {respondedChefs.length > 0 && (
          <div className="mb-8 rounded-2xl border border-stone-700 bg-stone-900/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
              Chef responses
            </p>
            <ul className="space-y-3">
              {respondedChefs.map((chef, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900/40 text-emerald-400 text-sm">
                    OK
                  </span>
                  <div>
                    <p className="text-sm font-medium text-stone-200">
                      {chef.chefName || 'A chef'} responded
                    </p>
                    {chef.chefRespondedAt && (
                      <p className="text-xs text-stone-500">{timeSince(chef.chefRespondedAt)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {respondedChefs.some((chef) => chef.proposalUrl) && (
              <div className="mt-4 flex flex-wrap gap-3">
                {respondedChefs
                  .filter((chef) => chef.proposalUrl)
                  .map((chef) => (
                    <Link
                      key={chef.inquiryId}
                      href={chef.proposalUrl!}
                      className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
                    >
                      View proposal
                    </Link>
                  ))}
              </div>
            )}
            {activeCircleUrl && (
              <Link
                href={activeCircleUrl}
                className="mt-4 inline-flex items-center rounded-xl border border-stone-700 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-200 hover:border-stone-600 hover:bg-stone-800 transition-colors"
              >
                Open your planning space
              </Link>
            )}
          </div>
        )}

        {/* Event details */}
        <div className="rounded-2xl border border-stone-700 bg-stone-900/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
            Your request
          </p>
          <table className="w-full">
            <tbody>
              <tr>
                <td className="text-sm text-stone-500 py-2 pr-4 align-top w-28">Occasion</td>
                <td className="text-sm text-stone-200 py-2 font-medium">{booking.occasion}</td>
              </tr>
              {booking.eventDate && (
                <tr>
                  <td className="text-sm text-stone-500 py-2 pr-4 align-top">Date</td>
                  <td className="text-sm text-stone-200 py-2 font-medium">
                    {formatDate(booking.eventDate)}
                  </td>
                </tr>
              )}
              {booking.serveTime && (
                <tr>
                  <td className="text-sm text-stone-500 py-2 pr-4 align-top">Time</td>
                  <td className="text-sm text-stone-200 py-2 font-medium">{booking.serveTime}</td>
                </tr>
              )}
              <tr>
                <td className="text-sm text-stone-500 py-2 pr-4 align-top">Guests</td>
                <td className="text-sm text-stone-200 py-2 font-medium">{guestDisplay}</td>
              </tr>
              <tr>
                <td className="text-sm text-stone-500 py-2 pr-4 align-top">Location</td>
                <td className="text-sm text-stone-200 py-2 font-medium">
                  {booking.resolvedLocation || booking.location}
                </td>
              </tr>
              {booking.budgetRange && (
                <tr>
                  <td className="text-sm text-stone-500 py-2 pr-4 align-top">Budget</td>
                  <td className="text-sm text-stone-200 py-2 font-medium capitalize">
                    {booking.budgetRange}
                  </td>
                </tr>
              )}
              {booking.serviceType && (
                <tr>
                  <td className="text-sm text-stone-500 py-2 pr-4 align-top">Service</td>
                  <td className="text-sm text-stone-200 py-2 font-medium capitalize">
                    {booking.serviceType.replace(/_/g, ' ')}
                  </td>
                </tr>
              )}
              {booking.dietaryRestrictions.length > 0 && (
                <tr>
                  <td className="text-sm text-stone-500 py-2 pr-4 align-top">Dietary</td>
                  <td className="text-sm text-stone-200 py-2 font-medium">
                    {booking.dietaryRestrictions.join(', ')}
                  </td>
                </tr>
              )}
              {booking.additionalNotes?.trim() && (
                <tr>
                  <td className="text-sm text-stone-500 py-2 pr-4 align-top">Notes</td>
                  <td className="text-sm text-stone-200 py-2 font-medium">
                    {booking.additionalNotes.trim()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Planning space link */}
        {activeCircleUrl && !respondedChefs.length && (
          <div className="mt-6 text-center">
            <Link
              href={activeCircleUrl}
              className="text-sm text-brand-400 hover:text-brand-300 underline"
            >
              Open your planning space
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
