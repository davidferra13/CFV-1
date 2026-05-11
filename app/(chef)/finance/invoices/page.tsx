import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAllInvoices } from '@/lib/shared/cross-cutting-queries'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

function paymentBadge(status: string) {
  const map: Record<
    string,
    { variant: 'default' | 'warning' | 'success' | 'error'; label: string }
  > = {
    unpaid: { variant: 'default', label: 'Unpaid' },
    deposit_paid: { variant: 'warning', label: 'Deposit Paid' },
    partially_paid: { variant: 'warning', label: 'Partial' },
    paid: { variant: 'success', label: 'Paid' },
    overpaid: { variant: 'success', label: 'Overpaid' },
    refunded: { variant: 'error', label: 'Refunded' },
  }
  const entry = map[status] ?? { variant: 'default' as const, label: status }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function InvoicesPage() {
  await requireChef()
  const invoices = await getAllInvoices()

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const counts = {
    draft: invoices.filter((inv) => ['draft', 'proposed'].includes(inv.status)).length,
    sent: invoices.filter((inv) => inv.status === 'accepted').length,
    paid: invoices.filter((inv) =>
      ['paid', 'confirmed', 'in_progress', 'completed'].includes(inv.status)
    ).length,
    overdue: invoices.filter(
      (inv) =>
        !['completed', 'cancelled'].includes(inv.status) &&
        inv.eventDate < todayStr &&
        inv.balanceDueCents > 0
    ).length,
    refunded: invoices.filter((inv) => inv.paymentStatus === 'refunded').length,
    cancelled: 0, // cancelled are filtered out by getAllInvoices
  }

  const totalRevenue = invoices
    .filter((inv) => ['paid', 'confirmed', 'in_progress', 'completed'].includes(inv.status))
    .reduce((s, inv) => s + inv.quotedPriceCents, 0)

  const totalOutstanding = invoices
    .filter((inv) => inv.balanceDueCents > 0)
    .reduce((s, inv) => s + inv.balanceDueCents, 0)

  // Show invoices with outstanding balances first, then by date descending
  const sortedInvoices = [...invoices].sort((a, b) => {
    // Outstanding first
    if (a.balanceDueCents > 0 && b.balanceDueCents === 0) return -1
    if (a.balanceDueCents === 0 && b.balanceDueCents > 0) return 1
    // Then by date descending
    return b.eventDate.localeCompare(a.eventDate)
  })

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
          All invoices across every event, with payment status at a glance
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{invoices.length}</p>
          <p className="text-sm text-stone-500 mt-1">Total invoices</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">Paid invoice value</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalOutstanding)}</p>
          <p className="text-sm text-stone-500 mt-1">Outstanding balance</p>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
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

      {/* Aggregate invoice table across all events */}
      <div>
        <h2 className="text-lg font-semibold text-stone-200 mb-3">All Invoices</h2>
        {sortedInvoices.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-stone-400">
              No invoices yet. Create an event to generate an invoice.
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 bg-stone-900/60">
                  <th className="text-left px-4 py-3 font-medium text-stone-400">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-400">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-400">Client</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-400">Quoted</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-400">Paid</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-400">Balance</th>
                  <th className="text-center px-4 py-3 font-medium text-stone-400">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {sortedInvoices.map((inv) => (
                  <tr key={inv.eventId} className="hover:bg-stone-800/40 transition-colors">
                    <td className="px-4 py-3 text-stone-300 whitespace-nowrap">
                      {formatDate(inv.eventDate)}
                    </td>
                    <td className="px-4 py-3 text-stone-200 font-medium">
                      <Link
                        href={`/events/${inv.eventId}`}
                        className="hover:text-brand-400 transition-colors"
                      >
                        {inv.occasion || 'Untitled Event'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-400">{inv.clientName || 'No client'}</td>
                    <td className="px-4 py-3 text-right text-stone-300 tabular-nums">
                      {formatCurrency(inv.quotedPriceCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300 tabular-nums">
                      {formatCurrency(inv.totalPaidCents)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-medium ${
                        inv.balanceDueCents > 0 ? 'text-amber-500' : 'text-stone-500'
                      }`}
                    >
                      {inv.balanceDueCents > 0 ? formatCurrency(inv.balanceDueCents) : '--'}
                    </td>
                    <td className="px-4 py-3 text-center">{paymentBadge(inv.paymentStatus)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/events/${inv.eventId}/invoice`}
                        className="text-xs text-brand-600 hover:text-brand-400"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
