import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Ledger Adjustments - ChefFlow' }

export default async function LedgerAdjustmentsPage() {
  await requireChef()
  const [credits, addOns] = await Promise.all([
    getLedgerEntries({ entryType: 'credit' }),
    getLedgerEntries({ entryType: 'add_on' }),
  ])
  const allAdjustments = [...credits, ...addOns].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const totalCredits = credits.reduce((s, e) => s + e.amount_cents, 0)
  const totalAddOns = addOns.reduce((s, e) => s + e.amount_cents, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/ledger" className="text-sm text-stone-500 hover:text-stone-700">← Ledger</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Adjustments</h1>
          <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">{allAdjustments.length}</span>
        </div>
        <p className="text-stone-500 mt-1">Credits, add-ons, and manual adjustments to event totals</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-sky-700">{formatCurrency(totalCredits)}</p>
          <p className="text-sm text-stone-500 mt-1">Credits issued ({credits.length})</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalAddOns)}</p>
          <p className="text-sm text-stone-500 mt-1">Add-ons charged ({addOns.length})</p>
        </Card>
      </div>

      {allAdjustments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium">No adjustments recorded</p>
          <p className="text-stone-400 text-sm mt-1">Credits and add-ons applied to events will appear here</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allAdjustments.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="text-stone-500 text-sm">{format(new Date(entry.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${entry.entry_type === 'credit' ? 'bg-sky-100 text-sky-700' : 'bg-blue-100 text-blue-700'}`}>
                      {entry.entry_type.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {entry.event ? (
                      <Link href={`/events/${entry.event.id}`} className="text-brand-600 hover:underline capitalize">
                        {entry.event.occasion?.replace(/_/g, ' ') ?? 'Event'}
                      </Link>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">{entry.description}</TableCell>
                  <TableCell className="text-sm font-semibold text-stone-900">
                    {formatCurrency(entry.amount_cents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
