import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInquiries } from '@/lib/inquiries/actions'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Converted Leads - ChefFlow' }

export default async function ConvertedLeadsPage() {
  await requireChef()
  const inquiries = await getInquiries({
    channel: 'website',
    status: 'confirmed' as any,
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-stone-500 hover:text-stone-300">
          ← Leads
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Converted</h1>
          <span className="bg-green-900 text-green-700 text-sm px-2 py-0.5 rounded-full">
            {inquiries.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Website leads that became paying clients - confirmed events
        </p>
      </div>

      {inquiries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No converted leads yet</p>
          <p className="text-stone-400 text-sm">
            Leads move here once they confirm and an event is created
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-700">{inquiries.length}</p>
            <p className="text-sm text-stone-500 mt-1">Website leads converted to events</p>
          </Card>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Inquiry Date</TableHead>
                  <TableHead>Occasion</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inquiry: any) => (
                  <TableRow key={inquiry.id}>
                    <TableCell className="font-medium">
                      <p>{inquiry.client?.full_name ?? '-'}</p>
                      {inquiry.client?.email && (
                        <p className="text-xs text-stone-400 mt-0.5">{inquiry.client.email}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {format(new Date(inquiry.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm capitalize">
                      {inquiry.confirmed_occasion?.replace(/_/g, ' ') ?? '-'}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {inquiry.confirmed_guest_count ?? '-'}
                    </TableCell>
                    <TableCell className="text-stone-500 text-sm">
                      {inquiry.confirmed_date
                        ? format(new Date(inquiry.confirmed_date), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/inquiries/${inquiry.id}`}>
                        <span className="text-xs text-brand-600 hover:underline cursor-pointer">
                          View
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  )
}
