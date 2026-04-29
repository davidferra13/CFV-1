import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getMenuItemsForSalesEntry } from '@/lib/menu-performance/actions'
import { SalesEntryForm } from '@/components/stations/sales-entry-form'

export const metadata: Metadata = { title: 'Log Sales' }

export default async function SalesEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireChef()
  const { id } = await params
  const db: any = createServerClient()

  const { data: serviceDay, error } = await db
    .from('service_days')
    .select('id, service_date, shift_label')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (error) {
    console.error('[service-log-sales] service day lookup failed', error)
    throw new Error('Unable to load service day for sales log')
  }

  if (!serviceDay) notFound()

  if (!serviceDay.service_date || !serviceDay.shift_label) {
    throw new Error('Service day sales log is missing required display data')
  }

  const items = await getMenuItemsForSalesEntry(id)

  const serviceDate = new Date(serviceDay.service_date)

  if (Number.isNaN(serviceDate.getTime())) {
    throw new Error('Service day sales log has an invalid service date')
  }

  const dateLabel = serviceDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href={`/stations/service-log/${id}`}
          className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
        >
          &larr; Back to Service Day
        </Link>
        <h1 className="text-2xl font-bold text-stone-100 mt-2">Sales Log for {dateLabel}</h1>
        <p className="mt-1 text-sm text-stone-500">{serviceDay.shift_label}</p>
      </div>

      <SalesEntryForm serviceDayId={id} items={items} />
    </div>
  )
}
