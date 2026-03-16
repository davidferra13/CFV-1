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

export const metadata: Metadata = { title: 'Qualified Leads - ChefFlow' }

export default async function QualifiedLeadsPage() {
  await requireChef()
  const inquiries = await getInquiries({
    channel: 'website',
    status: 'quoted' as any,
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-stone-500 hover:text-stone-300">
          ← Leads
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Qualified</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {inquiries.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Leads who have received a quote - confirmed as viable prospects
        </p>
      </div>

      {inquiries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No qualified leads</p>
          <p className="text-stone-400 text-sm">Leads move here once you send them a quote</p>
          <Link
            href="/leads/contacted"
            className="text-sm text-brand-600 hover:underline mt-2 block"
          >
            View contacted leads
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
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
      )}
    </div>
  )
}
