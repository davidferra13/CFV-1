// Client Invoice Page
// Client-facing view of their invoice for a specific event.
// Scoped to the client's own entity — no cross-client access.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getInvoiceDataForClient } from '@/lib/events/invoice-actions'
import { InvoiceView } from '@/components/events/invoice-view'
import { Button } from '@/components/ui/button'

export default async function ClientInvoicePage({
  params,
}: {
  params: { id: string }
}) {
  await requireClient()

  const invoice = await getInvoiceDataForClient(params.id)
  if (!invoice) notFound()

  return (
    <div className="max-w-2xl mx-auto pb-16 space-y-4">
      {/* Nav */}
      <div className="flex justify-between items-center">
        <Link href={`/my-events/${params.id}`}>
          <Button variant="ghost" size="sm">&larr; Back to Event</Button>
        </Link>
        <a
          href={`/api/documents/invoice/${params.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Download PDF
        </a>
      </div>

      <InvoiceView invoice={invoice} />
    </div>
  )
}
