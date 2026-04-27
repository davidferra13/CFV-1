import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Invoices' }

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
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const refundedEventIds = new Set(refundEntries.map((e: any) => e.event_id).filter(Boolean))

  const counts = {
    draft: events.filter((e: any) => ['draft', 'proposed'].includes(e.status)).length,
    sent: events.filter((e: any) => e.status === 'accepted').length,
    paid: events.filter((e: any) =>
      ['paid', 'confirmed', 'in_progress', 'completed'].includes(e.status)
    ).length,
    overdue: events.filter(
      (e: any) => !['completed', 'cancelled'].includes(e.status) && (e.event_date ?? '') < todayStr
    ).length,
    refunded: events.filter((e: any) => refundedEventIds.has(e.id)).length,
    cancelled: events.filter((e: any) => e.status === 'cancelled').length,
  }

  const totalRevenue = events
    .filter((e: any) => ['paid', 'confirmed', 'in_progress', 'completed'].includes(e.status))
    .reduce((s: any, e: any) => s + (e.quoted_price_cents ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          ← Finance
        </Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Invoices</h1>
          <Link href="/events/new">
            <Button size="sm">+ Create Event / Invoice</Button>
          </Link>
        </div>
        <p className="text-stone-500 mt-1">
          Event invoices organized by status - invoices are per-event in ChefFlow
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{events.length}</p>
          <p className="text-sm text-stone-500 mt-1">Total events / invoices</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">Paid invoice value</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-700">{counts.sent + counts.draft}</p>
          <p className="text-sm text-stone-500 mt-1">Awaiting payment</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STAGES.map((stage) => {
          const count = counts[stage.label.toLowerCase() as keyof typeof counts] ?? 0
          return (
            <Link key={stage.href} href={stage.href}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-semibold text-stone-100">{stage.label}</h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.style}`}>
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
