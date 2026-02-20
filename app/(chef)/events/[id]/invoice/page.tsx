// Chef Invoice Page
// Displays the computed invoice for an event.
// Invoice is NOT a separate table — it's derived from event + ledger_entries + chefs.
// Screen-only view (not a PDF). Chef can share the URL or use as a reference.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInvoiceData } from '@/lib/events/invoice-actions'
import { InvoiceView } from '@/components/events/invoice-view'
import { Button } from '@/components/ui/button'
import { PrintButton } from '@/components/events/print-button'

export default async function ChefInvoicePage({
  params,
}: {
  params: { id: string }
}) {
  await requireChef()

  const invoice = await getInvoiceData(params.id)
  if (!invoice) notFound()

  return (
    <div className="max-w-2xl mx-auto pb-16 space-y-4">
      {/* Nav */}
      <div className="flex justify-between items-center">
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost" size="sm">&larr; Back to Event</Button>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={`/api/documents/invoice/${params.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Download PDF
          </a>
          <PrintButton />
        </div>
      </div>

      <InvoiceView invoice={invoice} />
    </div>
  )
}
