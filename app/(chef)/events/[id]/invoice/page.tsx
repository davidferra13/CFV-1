// Chef Invoice Page
// Displays the computed invoice for an event.
// Invoice is NOT a separate table - it's derived from event + ledger_entries + chefs.
// Screen-only view (not a PDF). Chef can share the URL or use as a reference.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInvoiceData } from '@/lib/events/invoice-actions'
import { getInvoiceSendHistory } from '@/lib/invoices/delivery-actions'
import { InvoiceView } from '@/components/events/invoice-view'
import { InvoiceSendPanel } from '@/components/events/invoice-send-panel'
import { Button } from '@/components/ui/button'
import { PrintButton } from '@/components/events/print-button'

export async function generateMetadata() {
  return { title: 'Event Invoice | ChefFlow' }
}

export default async function ChefInvoicePage({ params }: { params: { id: string } }) {
  await requireChef()

  const [invoice, sendHistory] = await Promise.all([
    getInvoiceData(params.id),
    getInvoiceSendHistory(params.id),
  ])
  if (!invoice) notFound()

  return (
    <div className="max-w-2xl mx-auto pb-16 space-y-4">
      {/* Nav */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href={`/events/${params.id}`}>
            <Button variant="ghost" size="sm">
              &larr; Back to Event
            </Button>
          </Link>
          <Link
            href={`/events/${params.id}/billing`}
            className="text-xs text-brand-600 hover:underline"
          >
            Billing
          </Link>
          <Link
            href={`/finance/ledger/transaction-log?eventId=${params.id}`}
            className="text-xs text-brand-600 hover:underline"
          >
            View in ledger
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/documents/invoice-pdf/${params.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-stone-600 px-3 py-1.5 text-sm font-medium text-stone-300 hover:bg-stone-800"
          >
            Download PDF
          </a>
          <PrintButton />
        </div>
      </div>

      <InvoiceView invoice={invoice} />

      {/* Send/Resend Panel */}
      <div className="rounded-xl border border-stone-700 bg-stone-950/60 p-5">
        <InvoiceSendPanel
          eventId={params.id}
          clientEmail={invoice.client.email}
          sendHistory={sendHistory}
        />
      </div>
    </div>
  )
}
