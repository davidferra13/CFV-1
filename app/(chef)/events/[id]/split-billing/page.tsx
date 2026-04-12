// Split Billing - Divide event cost across multiple payers
// Fetches split billing configuration and client list for the payer selector

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getSplitBilling } from '@/lib/operations/split-billing-actions'
import { SplitBillingForm } from '@/components/operations/split-billing-form'

export const metadata: Metadata = { title: 'Split Billing' }

export default async function SplitBillingPage({ params }: { params: { id: string } }) {
  const user = await requireChef()
  const db: any = createServerClient()

  let splitData: Awaited<ReturnType<typeof getSplitBilling>> | null = null
  try {
    splitData = await getSplitBilling(params.id)
  } catch {
    splitData = null
  }

  let eventResult: {
    id: string
    quoted_price_cents: number | null
    occasion: string | null
  } | null = null
  try {
    const { data } = await db
      .from('events')
      .select('id, quoted_price_cents, occasion')
      .eq('id', params.id)
      .eq('tenant_id', user.tenantId!)
      .single()
    eventResult = data
  } catch {
    eventResult = null
  }

  let rawClients: { id: string; full_name: string; email: string }[] = []
  try {
    const { data } = await db
      .from('clients')
      .select('id, full_name, email')
      .eq('tenant_id', user.tenantId!)
      .order('full_name')
    rawClients = data ?? []
  } catch {
    rawClients = []
  }

  const eventTotalCents = eventResult?.quoted_price_cents ?? 0
  const eventOccasion = eventResult?.occasion ?? 'Event'

  // Map full_name -> name to match SplitBillingForm's Client interface
  const clients = rawClients.map((c) => ({ id: c.id, name: c.full_name }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link
            href={`/events/${params.id}`}
            className="text-sm text-stone-500 hover:text-stone-300"
          >
            &larr; Back to Event
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Split Billing</h1>
          <p className="text-stone-400 mt-1">
            Divide the cost of &ldquo;{eventOccasion}&rdquo; across multiple payers.
          </p>
        </div>
      </div>

      <SplitBillingForm
        eventId={params.id}
        totalCents={eventTotalCents}
        currentSplits={splitData?.splits}
        clients={clients}
      />
    </div>
  )
}
