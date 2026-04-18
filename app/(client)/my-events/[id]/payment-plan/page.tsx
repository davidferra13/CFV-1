// Payment Plan - Client-facing installment schedule calculator
// Shows the event total, payment milestones, and allows plan selection

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { PaymentPlanCalculator } from '@/components/clients/payment-plan-calculator'
import { createServerClient } from '@/lib/db/server'

export const metadata: Metadata = { title: 'Payment Plan' }

export default async function PaymentPlanPage({ params }: { params: { id: string } }) {
  const user = await requireClient()
  const db: any = createServerClient()

  let eventResult: {
    id: string
    quoted_price_cents: number | null
    event_date: string
    occasion: string | null
  } | null = null
  try {
    const { data } = await db
      .from('events')
      .select('id, quoted_price_cents, event_date, occasion')
      .eq('id', params.id)
      .eq('client_id', user.entityId)
      .single()
    eventResult = data
  } catch {
    eventResult = null
  }

  const eventTotalCents = eventResult?.quoted_price_cents ?? 0
  const eventDate =
    eventResult?.event_date ??
    ((_ppd) =>
      `${_ppd.getFullYear()}-${String(_ppd.getMonth() + 1).padStart(2, '0')}-${String(_ppd.getDate()).padStart(2, '0')}`)(
      new Date()
    )
  const eventOccasion = eventResult?.occasion ?? 'Your Event'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <Link
          href={`/my-events/${params.id}`}
          className="text-brand-500 hover:text-brand-400 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Event
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Payment Plan</h1>
        <p className="text-stone-400 mt-1">
          View installment options for &ldquo;{eventOccasion}&rdquo;.
        </p>
      </div>

      <PaymentPlanCalculator
        totalCents={eventTotalCents}
        eventDate={eventDate}
        eventName={eventOccasion}
      />
    </div>
  )
}
