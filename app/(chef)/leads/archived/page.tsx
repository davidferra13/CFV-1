import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInquiries } from '@/lib/inquiries/actions'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Archived Leads - ChefFlow' }

const STATUS_STYLES: Record<string, string> = {
  declined: 'bg-red-100 text-red-600',
  expired: 'bg-stone-200 text-stone-500',
}

export default async function ArchivedLeadsPage() {
  await requireChef()
  const inquiries = await getInquiries({
    channel: 'website',
    status: ['declined', 'expired'] as any,
  })

  const declined = inquiries.filter(i => i.status === 'declined')
  const expired = inquiries.filter(i => i.status === 'expired')

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-stone-500 hover:text-stone-700">
          ← Leads
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Archived</h1>
          <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">
            {inquiries.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Declined and expired website leads</p>
      </div>

      {inquiries.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-red-600">{declined.length}</p>
            <p className="text-sm text-stone-500 mt-1">Declined</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-400">{expired.length}</p>
            <p className="text-sm text-stone-500 mt-1">Expired (no response)</p>
          </Card>
        </div>
      )}

      {inquiries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium mb-1">No archived leads</p>
          <p className="text-stone-400 text-sm">Declined and expired website inquiries will appear here</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map(inquiry => (
                <TableRow key={inquiry.id}>
                  <TableCell className="font-medium">
                    <p>{inquiry.client?.full_name ?? '—'}</p>
                    {inquiry.client?.email && (
                      <p className="text-xs text-stone-400 mt-0.5">{inquiry.client.email}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {format(new Date(inquiry.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm capitalize">
                    {inquiry.confirmed_occasion?.replace(/_/g, ' ') ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[inquiry.status] ?? 'bg-stone-100 text-stone-600'}`}>
                      {inquiry.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/inquiries/${inquiry.id}`}>
                      <span className="text-xs text-brand-600 hover:underline cursor-pointer">View</span>
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
