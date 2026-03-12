'use client'

import Link from 'next/link'
import { ListSearch } from '@/components/ui/list-search'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

const ENTRY_TYPE_STYLES: Record<string, string> = {
  payment: 'bg-green-900 text-green-200',
  deposit: 'bg-emerald-900 text-emerald-200',
  installment: 'bg-teal-900 text-teal-200',
  final_payment: 'bg-green-900 text-green-200',
  add_on: 'bg-blue-900 text-blue-200',
  credit: 'bg-sky-900 text-sky-200',
  tip: 'bg-amber-900 text-amber-200',
  refund: 'bg-red-900 text-red-200',
}

interface TransactionEntry {
  id: string
  created_at: string
  entry_type: string
  description: string | null
  payment_method: string | null
  amount_cents: number
  is_refund: boolean
  event: { id: string; occasion: string | null } | null
}

export function TransactionTable({ entries }: { entries: TransactionEntry[] }) {
  return (
    <ListSearch
      items={entries}
      searchKeys={['entry_type', 'description', 'payment_method']}
      placeholder="Search transactions..."
      categoryKey="entry_type"
      categoryLabel="types"
    >
      {(filtered) => (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-stone-500 py-8">
                    No transactions match your search
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-stone-500 text-sm whitespace-nowrap">
                      {format(new Date(entry.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ENTRY_TYPE_STYLES[entry.entry_type] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {entry.entry_type.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {entry.event ? (
                        <Link
                          href={`/events/${entry.event.id}`}
                          className="text-brand-600 hover:underline capitalize"
                        >
                          {entry.event.occasion?.replace(/_/g, ' ') ?? 'Event'}
                        </Link>
                      ) : (
                        '\u2014'
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm max-w-xs truncate">
                      {entry.description}
                    </TableCell>
                    <TableCell className="text-stone-500 text-sm capitalize">
                      {entry.payment_method?.replace(/_/g, ' ') ?? '\u2014'}
                    </TableCell>
                    <TableCell
                      className={`text-sm font-semibold ${entry.is_refund ? 'text-red-600' : 'text-green-200'}`}
                    >
                      {entry.is_refund ? '\u2212' : '+'}
                      {formatCurrency(Math.abs(entry.amount_cents))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </ListSearch>
  )
}
