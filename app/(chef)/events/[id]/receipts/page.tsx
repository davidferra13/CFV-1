// Receipt Summary Page — per-event receipt digitization review
// Upload → OCR → review line items → approve → copies to expenses

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getReceiptSummaryForEvent } from '@/lib/receipts/actions'
import { getEventById } from '@/lib/events/actions'
import { ReceiptSummaryClient } from '@/components/events/receipt-summary-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'

export default async function ReceiptsPage({
  params,
}: {
  params: { id: string }
}) {
  await requireChef()

  const [event, receipts] = await Promise.all([
    getEventById(params.id),
    getReceiptSummaryForEvent(params.id),
  ])

  if (!event) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Receipt Summary</h1>
          <p className="text-stone-500 text-sm mt-1">
            {event.occasion || 'Untitled Event'} · {format(new Date(event.event_date), 'MMM d, yyyy')}
          </p>
        </div>
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost" size="sm">← Back to Event</Button>
        </Link>
      </div>

      {/* Instructions */}
      <Card className="p-4 bg-stone-50 border-stone-200">
        <p className="text-sm text-stone-600">
          Upload receipt photos from your event purchases. Use <strong>Extract with AI</strong> to automatically read
          line items, then review and tag each item as <em>business</em> or <em>personal</em>.
          Approving a receipt adds all business items to your event expenses.
        </p>
      </Card>

      {/* Receipt list */}
      <ReceiptSummaryClient receipts={receipts} eventId={params.id} />
    </div>
  )
}
