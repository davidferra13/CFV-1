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

export const metadata: Metadata = { title: 'Contacted Leads - ChefFlow' }

const STATUS_LABELS: Record<string, string> = {
  new: 'Awaiting Response',
  awaiting_client: 'Awaiting Client',
  awaiting_chef: 'Client Replied',
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-amber-900 text-amber-200',
  awaiting_client: 'bg-sky-900 text-sky-200',
  awaiting_chef: 'bg-green-900 text-green-200',
}

export default async function ContactedLeadsPage() {
  await requireChef()
  const inquiries = await getInquiries({
    channel: 'website',
    status: ['new', 'awaiting_client', 'awaiting_chef'] as any,
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-stone-500 hover:text-stone-300">
          ← Leads
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Contacted</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {inquiries.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Website leads in active communication — claimed and being nurtured
        </p>
      </div>

      {inquiries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No contacted leads</p>
          <p className="text-stone-400 text-sm">
            Claim leads from the main leads page to move them into this stage
          </p>
          <Link href="/leads" className="text-sm text-brand-600 hover:underline mt-2 block">
            View incoming leads
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inquiry: any) => (
                <TableRow key={inquiry.id}>
                  <TableCell className="font-medium">
                    <p>{inquiry.contact_name || inquiry.client?.full_name || '—'}</p>
                    {(inquiry.contact_email || inquiry.client?.email) && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        {inquiry.contact_email || inquiry.client?.email}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {format(new Date(inquiry.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm capitalize">
                    {inquiry.confirmed_occasion?.replace(/_/g, ' ') ?? '—'}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {inquiry.confirmed_guest_count ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[inquiry.status] ?? 'bg-stone-800 text-stone-400'}`}
                    >
                      {STATUS_LABELS[inquiry.status] ?? inquiry.status}
                    </span>
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
