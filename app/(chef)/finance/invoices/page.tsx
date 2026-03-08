import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Invoices - ChefFlow' }

const STAGES = [
  {
    href: '/finance/invoices/draft',
    label: 'Draft',
    description: 'Events not yet sent to client',
    style: 'bg-stone-800 text-stone-400',
  },
  {
    href: '/finance/invoices/sent',
    label: 'Sent',
    description: 'Awaiting client acceptance',
    style: 'bg-amber-900 text-amber-700',
  },
  {
    href: '/finance/invoices/paid',
    label: 'Paid',
    description: 'Accepted and payment underway',
    style: 'bg-green-900 text-green-700',
  },
  {
    href: '/finance/invoices/overdue',
    label: 'Overdue',
    description: 'Past event date, unresolved',
    style: 'bg-red-900 text-red-600',
  },
  {
    href: '/finance/invoices/refunded',
    label: 'Refunded',
    description: 'Events with refund entries',
    style: 'bg-purple-900 text-purple-700',
  },
  {
    href: '/finance/invoices/cancelled',
    label: 'Cancelled',
    description: 'Cancelled events',
    style: 'bg-stone-700 text-stone-500',
  },
]

export default async function InvoicesPage() {
  await requireChef()
  const [events, refundEntries] = await Promise.all([
    getEvents(),
    getLedgerEntries({ entryType: 'refund' }),
  ])

  const now = new Date()
  const refundedEventIds = new Set(
    refundEntries.map((entry: any) => entry.event_id).filter(Boolean)
  )

  const counts = {
    draft: events.filter((event: any) => ['draft', 'proposed'].includes(event.status)).length,
    sent: events.filter((event: any) => event.status === 'accepted').length,
    paid: events.filter((event: any) =>
      ['paid', 'confirmed', 'in_progress', 'completed'].includes(event.status)
    ).length,
    overdue: events.filter(
      (event: any) =>
        !['completed', 'cancelled'].includes(event.status) && new Date(event.event_date) < now
    ).length,
    refunded: events.filter((event: any) => refundedEventIds.has(event.id)).length,
    cancelled: events.filter((event: any) => event.status === 'cancelled').length,
  }

  const totalRevenue = events
    .filter((event: any) =>
      ['paid', 'confirmed', 'in_progress', 'completed'].includes(event.status)
    )
    .reduce((sum: number, event: any) => sum + Number(event.quoted_price_cents ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Finance
        </Link>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-stone-100">Invoices</h1>
          <Link href="/events/new">
            <Button size="md" className="min-h-[44px]">
              + Create Event / Invoice
            </Button>
          </Link>
        </div>
        <p className="mt-1 text-stone-500">
          Event invoices organized by status - invoices are per-event in ChefFlow
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{events.length}</p>
          <p className="mt-1 text-sm text-stone-500">Total events / invoices</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          <p className="mt-1 text-sm text-stone-500">Paid invoice value</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-700">{counts.sent + counts.draft}</p>
          <p className="mt-1 text-sm text-stone-500">Awaiting payment</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STAGES.map((stage) => {
          const count = counts[stage.label.toLowerCase() as keyof typeof counts] ?? 0
          return (
            <Link key={stage.href} href={stage.href}>
              <Card className="cursor-pointer p-4 transition-shadow hover:shadow-md">
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="font-semibold text-stone-100">{stage.label}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${stage.style}`}>
                    {count}
                  </span>
                </div>
                <p className="text-sm text-stone-500">{stage.description}</p>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
